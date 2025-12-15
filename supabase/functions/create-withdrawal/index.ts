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
        const { amount, network, address } = await req.json()

        if (!amount || amount <= 0) throw new Error('Invalid amount')
        if (!network) throw new Error('Network is required')
        if (!address) throw new Error('Address is required')

        // 3. Check Balance (LOCK not typically needed for single user if we trust atomic update returns, but race condition is possible. 
        // Ideally we use a stored procedure or careful checks. For now, strict check + update.)

        // Fetch profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) throw new Error('Profile not found')

        if (profile.balance < amount) {
            throw new Error('Insufficient balance')
        }

        // 4. ATOMIC OPERATION: Create Transaction & Deduct Balance
        // Note: In a perfect world, we'd use a Postgres Function for true atomicity.
        // But here we do: Deduct first (safer for platform), then create Transaction. 
        // If Tx creation fails, we refund.

        // Step A: Deduct
        const { data: updatedProfile, error: deductError } = await supabase
            .from('profiles')
            .update({ balance: profile.balance - amount })
            .eq('id', user.id) // check ID
            .eq('balance', profile.balance) // Optimistic Locking: only update if balance hasn't changed
            .select()
            .single()

        if (deductError || !updatedProfile) {
            throw new Error('Balance update failed (potential race condition). Please try again.')
        }

        // Step B: Create Transaction
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: user.id,
                type: 'WITHDRAW',
                amount: amount,
                status: 'PENDING',
                network: network,
                to_address: address,
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
