// Supabase Edge Function: internal-transfer
// Platform içi anında transfer - ATOMIC VERSION
// PostgreSQL RPC ile race condition önleme

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

        // Service role client - her şeyi yapabilir
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

        // 🔒 ATOMIC TRANSFER via PostgreSQL RPC
        const { data, error } = await supabase.rpc('execute_internal_transfer', {
            sender_id: user.id,
            recipient_code: recipient_code,
            transfer_amount: amount
        })

        if (error) {
            console.error('RPC error:', error)
            return new Response(
                JSON.stringify({ error: 'Transfer failed', details: error.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // RPC returns JSON with success/error
        if (data?.success) {
            // AUDIT LOG: Internal transfer kaydı
            await supabase.from('transaction_audit_logs').insert({
                transaction_id: data.sender_transaction_id,
                action: 'INTERNAL_TRANSFER',
                actor_role: 'edge',
                actor_id: user.id,
                metadata: {
                    type: 'internal-transfer',
                    amount,
                    recipient_code,
                    recipient_id: data.recipient_id,
                    sender_new_balance: data.sender_new_balance,
                    recipient_new_balance: data.recipient_new_balance
                }
            })

            return new Response(
                JSON.stringify(data),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            return new Response(
                JSON.stringify({ error: data?.error || 'Transfer failed' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }
    } catch (e) {
        console.error('Function error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
