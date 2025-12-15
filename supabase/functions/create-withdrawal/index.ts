import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Verify User
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('Missing Authorization header')

        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (userError || !user) throw new Error('Invalid user token')

        // 2. Parse Body
        const { amount, network, address, type, memo_code } = await req.json()

        if (!amount || amount <= 0) throw new Error('Invalid amount')
        // Network is optional for P2P, address is optional for P2P
        // if (!network) throw new Error('Network is required') 

        // 3. Check Balance
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) throw new Error('Profile not found')

        if (profile.balance < amount) {
            throw new Error('Insufficient balance')
        }

        // 4. ATOMIC OPERATION

        // Step A: Deduct
        const { data: updatedProfile, error: deductError } = await supabase
            .from('profiles')
            .update({ balance: profile.balance - amount })
            .eq('id', user.id) // check ID
            .eq('balance', profile.balance) // Optimistic Locking: only update if balance hasn't changed
            .select()
            .single()

        if (deductError || !updatedProfile) {
            throw new Error('Balance update failed. Please try again.')
        }

        // Step B: Create Transaction
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: user.id,
                type: type || 'WITHDRAW', // Default to WITHDRAW, allow P2P_SELL
                amount: amount, // Store as positive (logic handles absolute) or consistent with previous
                status: 'PENDING',
                network: network || 'P2P',
                to_address: address,
                memo_code: memo_code,
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (txError) {
            // CRITICAL: REFUND if tx failed
            await supabase.from('profiles').update({ balance: updatedProfile.balance + amount }).eq('id', user.id)
            throw new Error('Transaction creation failed. Balance refunded.')
        }

        return new Response(
            JSON.stringify(tx),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
