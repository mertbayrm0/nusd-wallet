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

        const txType = type || 'WITHDRAW'
        const isP2P = txType.startsWith('P2P')
        const isBuy = txType === 'P2P_BUY'

        // 3. User & Balance Logic
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, balance, email, full_name, iban, bank_name')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) throw new Error('Profile not found')

        // Only deduct balance if we are SELLING or WITHDRAWING (money leaving wallet)
        if (!isBuy) {
            if (profile.balance < amount) {
                throw new Error('Insufficient balance')
            }

            // Step A: Deduct
            const { data: updatedProfile, error: deductError } = await supabase
                .from('profiles')
                .update({ balance: profile.balance - amount })
                .eq('id', user.id)
                .eq('balance', profile.balance)
                .select()
                .single()

            if (deductError || !updatedProfile) {
                throw new Error('Balance update failed. Please try again.')
            }
        }

        // 4. Create Transaction
        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .insert({
                user_id: user.id,
                type: txType,
                amount: isBuy ? amount : -amount, // Buy = +, Sell/Withdraw = -
                status: 'PENDING',
                network: network || (isP2P ? 'P2P' : 'TRON'),
                to_address: address, // Optional usually
                memo_code: memo_code, // Bank info for Sellers
                created_at: new Date().toISOString()
            })
            .select()
            .single()

        if (txError) {
            // Refund if we deducted
            if (!isBuy) {
                await supabase.from('profiles').update({ balance: profile.balance + amount }).eq('id', user.id)
            }
            throw new Error('Transaction creation failed.')
        }

        // 5. MATCHING ENGINE (Simple)
        let matchFound = null
        if (isP2P) {
            const targetType = isBuy ? 'P2P_SELL' : 'P2P_BUY'

            // Find OLDEST pending counter-order with exact amount
            const { data: matches } = await supabase
                .from('transactions')
                .select('id, user_id, amount, memo_code, created_at') // simple select first
                .eq('type', targetType)
                .eq('status', 'PENDING')
                .eq('amount', isBuy ? -amount : amount) // Match opposite sign (e.g. +1000 vs -1000)
                .neq('user_id', user.id) // Don't match self
                .order('created_at', { ascending: true })
                .limit(1)

            if (matches && matches.length > 0) {
                const matchTx = matches[0]

                // Fetch full profile for counterparty details
                const { data: counterProfile } = await supabase
                    .from('profiles')
                    .select('email, full_name, iban, bank_name')
                    .eq('id', matchTx.user_id)
                    .single()

                // Execute Match
                // Update THIS transaction
                await supabase.from('transactions').update({
                    status: 'MATCHED',
                    description: `Matched with ${matchTx.id}`
                }).eq('id', tx.id)

                // Update COUNTER transaction
                await supabase.from('transactions').update({
                    status: 'MATCHED',
                    description: `Matched with ${tx.id}`
                }).eq('id', matchTx.id)

                matchFound = {
                    tradeId: matchTx.id,
                    counterparty: {
                        email: counterProfile?.email,
                        name: counterProfile?.full_name,
                        iban: counterProfile?.iban || matchTx.memo_code,
                        bank: counterProfile?.bank_name
                    },
                    amount: amount,
                    fiatAmount: amount * 32 // Mock rate
                }

                // Return match immediately to the caller
                return new Response(
                    JSON.stringify({ ...tx, match: matchFound }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }
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
