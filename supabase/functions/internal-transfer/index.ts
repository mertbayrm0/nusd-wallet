// Supabase Edge Function: internal-transfer
// Platform içi anında transfer - ATOMIC VERSION
// PostgreSQL RPC ile race condition önleme

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

    // Get sender from JWT
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
        return new Response(
            JSON.stringify({ error: 'Unauthorized' }),
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
    // Bu fonksiyon SELECT FOR UPDATE ile row locking yapar
    // Race condition / double-spend imkansız
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
})
