// Supabase Edge Function: cancel-withdrawal
// Kullanıcı kendi PENDING çekim talebini iptal eder
// Balance geri yüklenir, status CANCELLED olur

import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Get user from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
        return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
            { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Parse body
    const { transactionId } = await req.json()

    if (!transactionId) {
        return new Response(
            JSON.stringify({ error: 'Transaction ID required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 1️⃣ Get transaction and verify ownership
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', user.id) // SECURITY: Only own transactions
        .eq('type', 'WITHDRAW')
        .eq('status', 'PENDING')
        .single()

    if (txError || !transaction) {
        return new Response(
            JSON.stringify({ error: 'İşlem bulunamadı veya iptal edilemez durumda' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 2️⃣ Get current balance
    const { data: profile } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single()

    if (!profile) {
        return new Response(
            JSON.stringify({ error: 'Profile not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 3️⃣ Refund balance
    const newBalance = profile.balance + transaction.amount
    const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id)

    if (balanceError) {
        return new Response(
            JSON.stringify({ error: 'Failed to refund balance' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 4️⃣ Mark transaction as CANCELLED
    const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'CANCELLED' })
        .eq('id', transactionId)

    if (updateError) {
        // Rollback balance
        await supabase
            .from('profiles')
            .update({ balance: profile.balance })
            .eq('id', user.id)

        return new Response(
            JSON.stringify({ error: 'Failed to cancel transaction' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // AUDIT LOG
    await supabase.from('transaction_audit_logs').insert({
        transaction_id: transaction.id,
        action: 'USER_CANCEL',
        actor_role: 'user',
        actor_id: user.id,
        metadata: {
            type: 'withdrawal-cancelled-by-user',
            amount: transaction.amount,
            previous_balance: profile.balance,
            new_balance: newBalance
        }
    })

    return new Response(
        JSON.stringify({
            success: true,
            message: 'Çekim talebi iptal edildi. Bakiyeniz iade edildi.',
            newBalance
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
})
