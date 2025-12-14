// Supabase Edge Function: approve-transaction
// Admin tarafından transaction onaylama/reddetme
// PENDING → COMPLETED veya CANCELLED

import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // User client ile auth kontrol
        const supabaseUser = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )

        // Admin client ile DB işlemleri
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            { auth: { persistSession: false } }
        )

        // User bilgisi al
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Admin kontrolü
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Body parse
        const { transactionId, action } = await req.json()

        if (!transactionId || !['approve', 'reject'].includes(action)) {
            return new Response(
                JSON.stringify({ error: 'Invalid request. Required: transactionId, action (approve/reject)' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Transaction bilgisi al
        const { data: tx, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('id', transactionId)
            .single()

        if (txError || !tx) {
            return new Response(
                JSON.stringify({ error: 'Transaction not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (tx.status !== 'PENDING') {
            return new Response(
                JSON.stringify({ error: 'Transaction is not pending' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // User profile al
        const { data: userProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, balance')
            .eq('id', tx.user_id)
            .single()

        if (!userProfile) {
            return new Response(
                JSON.stringify({ error: 'User not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'approve') {
            // APPROVE: Transaction'ı COMPLETED yap
            await supabaseAdmin
                .from('transactions')
                .update({ status: 'COMPLETED' })
                .eq('id', transactionId)

            // DEPOSIT ise kullanıcı bakiyesine ekle
            if (tx.type === 'DEPOSIT') {
                await supabaseAdmin
                    .from('profiles')
                    .update({ balance: userProfile.balance + tx.amount })
                    .eq('id', tx.user_id)
            }

            // AUDIT LOG: Onay kaydı
            await supabaseAdmin.from('transaction_audit_logs').insert({
                transaction_id: tx.id,
                action: 'APPROVE',
                actor_role: 'admin',
                actor_id: user.id,
                metadata: {
                    previous_status: 'PENDING',
                    new_status: 'COMPLETED',
                    tx_type: tx.type,
                    amount: tx.amount
                }
            })

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Transaction approved. ${tx.type === 'DEPOSIT' ? `User balance increased by ${tx.amount}` : ''}`,
                    status: 'COMPLETED'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        } else {
            // REJECT: Transaction'ı CANCELLED yap
            await supabaseAdmin
                .from('transactions')
                .update({ status: 'CANCELLED' })
                .eq('id', transactionId)

            // WITHDRAW ise bakiyeyi geri iade et
            if (tx.type === 'WITHDRAW') {
                await supabaseAdmin
                    .from('profiles')
                    .update({ balance: userProfile.balance + tx.amount })
                    .eq('id', tx.user_id)
            }

            // AUDIT LOG: Red kaydı
            await supabaseAdmin.from('transaction_audit_logs').insert({
                transaction_id: tx.id,
                action: 'REJECT',
                actor_role: 'admin',
                actor_id: user.id,
                metadata: {
                    previous_status: 'PENDING',
                    new_status: 'CANCELLED',
                    tx_type: tx.type,
                    amount: tx.amount,
                    refunded: tx.type === 'WITHDRAW'
                }
            })

            return new Response(
                JSON.stringify({
                    success: true,
                    message: `Transaction rejected. ${tx.type === 'WITHDRAW' ? `User balance refunded ${tx.amount}` : ''}`,
                    status: 'CANCELLED'
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

    } catch (e) {
        console.error('Error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
