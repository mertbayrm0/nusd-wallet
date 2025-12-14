// Supabase Edge Function: withdraw-request
// Kullanıcı çekim talebi oluşturur
// Balance düşer, PENDING transaction oluşur
// Atomic işlem

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
    const { amount, asset } = await req.json()

    // Validation
    if (!amount || amount <= 0) {
        return new Response(
            JSON.stringify({ error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 1️⃣ Balance oku
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', user.id)
        .single()

    if (profileError || !profile) {
        return new Response(
            JSON.stringify({ error: 'Profile not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Yetersiz bakiye kontrolü
    if (profile.balance < amount) {
        return new Response(
            JSON.stringify({ error: 'Insufficient balance', balance: profile.balance }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 2️⃣ Balance düş
    const newBalance = profile.balance - amount
    const { error: balanceError } = await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', user.id)

    if (balanceError) {
        console.error('Balance update error:', balanceError)
        return new Response(
            JSON.stringify({ error: 'Failed to update balance' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 3️⃣ Transaction oluştur
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            type: 'WITHDRAW',
            amount,
            network: asset ?? 'TRX',
            status: 'PENDING'
        })
        .select()
        .single()

    if (txError) {
        // Rollback: bakiyeyi geri yükle
        await supabase
            .from('profiles')
            .update({ balance: profile.balance })
            .eq('id', user.id)

        console.error('Transaction insert error:', txError)
        return new Response(
            JSON.stringify({ error: 'Failed to create withdrawal request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
        JSON.stringify({ success: true, transaction, newBalance }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
})
