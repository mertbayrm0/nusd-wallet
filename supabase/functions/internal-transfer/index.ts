// Supabase Edge Function: internal-transfer
// Platform içi anında transfer
// NUSD-XXXX kodu ile kullanıcılar arası transfer

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

    // Validation
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

    // 1️⃣ Get sender profile
    const { data: sender, error: senderError } = await supabase
        .from('profiles')
        .select('id, email, balance, transfer_code')
        .eq('id', user.id)
        .single()

    if (senderError || !sender) {
        return new Response(
            JSON.stringify({ error: 'Sender not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Can't send to yourself
    if (sender.transfer_code === recipient_code) {
        return new Response(
            JSON.stringify({ error: 'Cannot transfer to yourself' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // Check balance
    if (sender.balance < amount) {
        return new Response(
            JSON.stringify({ error: 'Insufficient balance', balance: sender.balance }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 2️⃣ Get recipient by transfer_code
    const { data: recipient, error: recipientError } = await supabase
        .from('profiles')
        .select('id, email, balance, transfer_code')
        .eq('transfer_code', recipient_code)
        .single()

    if (recipientError || !recipient) {
        return new Response(
            JSON.stringify({ error: 'Recipient not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 3️⃣ ATOMIC: Deduct from sender
    const { error: senderUpdateError } = await supabase
        .from('profiles')
        .update({ balance: sender.balance - amount })
        .eq('id', sender.id)

    if (senderUpdateError) {
        return new Response(
            JSON.stringify({ error: 'Failed to deduct balance' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 4️⃣ Add to recipient
    const { error: recipientUpdateError } = await supabase
        .from('profiles')
        .update({ balance: recipient.balance + amount })
        .eq('id', recipient.id)

    if (recipientUpdateError) {
        // Rollback sender
        await supabase
            .from('profiles')
            .update({ balance: sender.balance })
            .eq('id', sender.id)

        return new Response(
            JSON.stringify({ error: 'Failed to credit recipient' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    // 5️⃣ Create COMPLETED transaction for sender (SEND)
    await supabase.from('transactions').insert({
        user_id: sender.id,
        type: 'TRANSFER_OUT',
        amount: amount,
        status: 'COMPLETED',
        network: 'INTERNAL',
        to_address: recipient_code
    })

    // 6️⃣ Create COMPLETED transaction for recipient (RECEIVE)
    await supabase.from('transactions').insert({
        user_id: recipient.id,
        type: 'TRANSFER_IN',
        amount: amount,
        status: 'COMPLETED',
        network: 'INTERNAL',
        tx_hash: sender.transfer_code // From code
    })

    return new Response(
        JSON.stringify({
            success: true,
            message: `${amount} USDT transferred to ${recipient_code}`,
            newBalance: sender.balance - amount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
})
