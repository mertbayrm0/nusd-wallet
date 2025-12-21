// Supabase Edge Function: internal-transfer
// Platform içi anında transfer - DIRECT QUERY VERSION (no RPC)
// RPC yerine doğrudan Supabase query ile çalışır

import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Dynamic CORS based on request origin
function getCorsHeaders(origin: string | null) {
    const ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://nusd-wallet-production.up.railway.app'
    ];
    const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}

serve(async (req) => {
    const origin = req.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin);

    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Auth header kontrolü
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Service role client
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            { auth: { persistSession: false } }
        )

        // JWT token'dan user'ı al
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            console.error('Auth error:', authError)
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse body
        const { amount, recipient_code } = await req.json()
        console.log('Transfer request:', { amount, recipient_code, sender: user.id })

        // Basic validation
        if (!amount || amount <= 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid amount' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!recipient_code || !recipient_code.startsWith('NUSD-')) {
            return new Response(
                JSON.stringify({ error: 'Invalid recipient code' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 1. Get sender balance
        const { data: sender, error: senderError } = await supabase
            .from('profiles')
            .select('id, balance, email')
            .eq('id', user.id)
            .single()

        if (senderError || !sender) {
            console.error('Sender not found:', senderError)
            return new Response(
                JSON.stringify({ error: 'Sender not found' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Check balance
        if (sender.balance < amount) {
            return new Response(
                JSON.stringify({ error: 'Insufficient balance', balance: sender.balance }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3. Find recipient by nusd_code
        const { data: recipient, error: recipientError } = await supabase
            .from('profiles')
            .select('id, balance, email, nusd_code')
            .eq('nusd_code', recipient_code)
            .single()

        if (recipientError || !recipient) {
            console.error('Recipient not found:', recipientError, 'Code:', recipient_code)

            // Try to find by email hash (fallback)
            const { data: allProfiles } = await supabase
                .from('profiles')
                .select('id, email, balance, nusd_code')

            console.log('All profiles nusd_codes:', allProfiles?.map(p => ({ email: p.email, nusd_code: p.nusd_code })))

            return new Response(
                JSON.stringify({
                    error: 'Recipient not found',
                    code: recipient_code,
                    hint: 'NUSD code may not be set in database'
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4. Prevent self-transfer
        if (sender.id === recipient.id) {
            return new Response(
                JSON.stringify({ error: 'Cannot transfer to yourself' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5. ATOMIC TRANSFER - prevents race condition
        const { data: transferResult, error: transferError } = await supabase
            .rpc('atomic_transfer', {
                p_sender_id: sender.id,
                p_recipient_id: recipient.id,
                p_amount: amount
            });

        if (transferError) {
            console.error('Atomic transfer error:', transferError);
            return new Response(
                JSON.stringify({ error: 'Transfer failed', details: transferError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        if (!transferResult?.success) {
            return new Response(
                JSON.stringify({
                    error: transferResult?.error || 'Transfer failed',
                    balance: transferResult?.balance
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const senderNewBalance = transferResult.sender_new_balance;
        const recipientNewBalance = transferResult.recipient_new_balance;

        // 6. Create transaction records
        const { data: senderTx } = await supabase
            .from('transactions')
            .insert({
                user_id: sender.id,
                type: 'TRANSFER',
                amount: -amount,
                status: 'COMPLETED',
                network: 'INTERNAL',
                description: `Transfer to ${recipient_code}`
            })
            .select()
            .single()

        await supabase
            .from('transactions')
            .insert({
                user_id: recipient.id,
                type: 'TRANSFER',
                amount: amount,
                status: 'COMPLETED',
                network: 'INTERNAL',
                description: `Transfer from internal`
            })

        // 7. Audit Log
        await supabase.rpc('log_audit', {
            p_actor_id: sender.id,
            p_actor_email: sender.email,
            p_actor_role: 'user',
            p_action: 'TRANSFER',
            p_resource_type: 'transaction',
            p_resource_id: senderTx?.id,
            p_details: {
                amount,
                recipient_code,
                recipient_id: recipient.id,
                sender_new_balance: senderNewBalance,
                recipient_new_balance: recipientNewBalance
            }
        });

        return new Response(
            JSON.stringify({
                success: true,
                sender_new_balance: senderNewBalance,
                recipient_new_balance: recipientNewBalance,
                recipient_id: recipient.id,
                sender_transaction_id: senderTx?.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    } catch (e: any) {
        // Log details server-side only
        console.error('Function error:', e.message);
        return new Response(
            JSON.stringify({ error: 'Transfer failed. Please try again.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
