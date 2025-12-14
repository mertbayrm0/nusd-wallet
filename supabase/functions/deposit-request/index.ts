// Supabase Edge Function: deposit-request
// Kullanıcı para yatırma bildirimi yapar
// PENDING transaction oluşturur
// Balance ASLA değişmez

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
    const body = await req.json()
    const { amount, asset, tx_hash } = body

    // Validation
    if (!amount || amount <= 0) {
        return new Response(
            JSON.stringify({ error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    if (!asset) {
        return new Response(
            JSON.stringify({ error: 'Asset is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Create PENDING transaction (NO balance change)
    const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
            user_id: user.id,
            type: 'DEPOSIT',
            amount,
            network: asset, // Using network column for asset type
            status: 'PENDING',
            tx_hash: tx_hash ?? null
        })
        .select()
        .single()

    if (txError) {
        console.error('Transaction insert error:', txError)
        return new Response(
            JSON.stringify({ error: 'Failed to create deposit request' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    return new Response(
        JSON.stringify({ success: true, transaction }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
})
