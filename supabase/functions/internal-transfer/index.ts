// Supabase Edge Function: internal-transfer
// Platform içi anında transfer - DIRECT QUERY VERSION (no RPC)
// RPC yerine doğrudan Supabase query ile çalışır

import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
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

        // 5. Update balances
        const senderNewBalance = sender.balance - amount
        const recipientNewBalance = recipient.balance + amount

        // Update sender
        const { error: updateSenderError } = await supabase
            .from('profiles')
            .update({ balance: senderNewBalance })
            .eq('id', sender.id)

        if (updateSenderError) {
            console.error('Update sender error:', updateSenderError)
            return new Response(
                JSON.stringify({ error: 'Failed to update sender balance' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Update recipient
        const { error: updateRecipientError } = await supabase
            .from('profiles')
            .update({ balance: recipientNewBalance })
            .eq('id', recipient.id)

        if (updateRecipientError) {
            // Rollback sender
            await supabase.from('profiles').update({ balance: sender.balance }).eq('id', sender.id)
            console.error('Update recipient error:', updateRecipientError)
            return new Response(
                JSON.stringify({ error: 'Failed to update recipient balance' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

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

        console.log('Transfer completed:', { sender: sender.id, recipient: recipient.id, amount })

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
    } catch (e) {
        console.error('Function error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error', details: e.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
