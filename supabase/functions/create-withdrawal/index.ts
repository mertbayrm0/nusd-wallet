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

    let debugStage = 'init'
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Verify User
        debugStage = 'verify_user_header'
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Missing Authorization header' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
            )
        }

        debugStage = 'get_user'
        const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid user token' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
        }

        // 2. Parse Body
        debugStage = 'parse_body'
        const { amount, network, address, type, memo_code } = await req.json()
        const parsedAmount = parseFloat(amount)

        if (!parsedAmount || parsedAmount <= 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid amount' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422 }
            )
        }

        debugStage = 'setup_vars'
        const txType = type || 'WITHDRAW'
        const isP2P = txType.startsWith('P2P')
        const isBuy = txType === 'P2P_BUY'

        // 3. User & Balance Logic
        debugStage = 'fetch_profile'
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, balance, email, full_name, iban, bank_name')
            .eq('id', user.id)
            .single()

        debugStage = 'check_profile_exists'
        if (profileError || !profile) {
            // Self-healing: Create profile if missing
            debugStage = 'healing_create_profile'
            console.log('Profile missing, creating new profile for:', user.id)
            const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                    id: user.id,
                    email: user.email,
                    balance: 0
                    // Removed potential non-existent columns (is_active, role) to be safe
                })
                .select('id, balance, email, full_name, iban, bank_name')
                .single()

            if (createError || !newProfile) {
                return new Response(
                    JSON.stringify({ error: 'Profile could not be created: ' + (createError?.message || 'Unknown'), stage: debugStage }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
                )
            }
            // Use the newly created profile
            // Note: We use 'var' or re-assign if 'profile' was let, but here we can just use newProfile
            // However, to keep downstream code simple, we need to ensure flow continues.
            // Since 'profile' is const in the previous scope (if we didn't change it), we might need to adjust variable declaration.
            // Actually, best to just restart the logic or assign to a new var that downstream uses.
            // Let's change the downstream code to use `userProfile` variable.
        }

        debugStage = 'set_uservariable'
        // Re-fetch or use new profile
        const userProfile = profile || (await supabase.from('profiles').select('id, balance, email, full_name, iban, bank_name').eq('id', user.id).single()).data

        if (!userProfile) {
            return new Response(
                JSON.stringify({ error: 'Profile not found after creation attempt', stage: debugStage }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
            )
        }

        // Only deduct balance if we are SELLING or WITHDRAWING (money leaving wallet)
        debugStage = 'balance_logic_start'
        if (!isBuy) {
            if (userProfile.balance < amount) {
                return new Response(
                    JSON.stringify({ error: 'Insufficient balance', stage: debugStage }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 } // Payment Required / Insufficient Funds
                )
            }

            // Step A: Deduct
            debugStage = 'deduct_balance'
            const { data: updatedProfile, error: deductError } = await supabase
                .from('profiles')
                .update({ balance: userProfile.balance - amount })
                .eq('id', user.id)
                .eq('balance', userProfile.balance)
                .select()
                .single()

            if (deductError || !updatedProfile) {
                return new Response(
                    JSON.stringify({ error: 'Balance mismatch. Please try again.', stage: debugStage }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 } // Conflict
                )
            }
        }

        // 4. Create Transaction
        debugStage = 'insert_transaction'
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
                debugStage = 'refund_balance'
                await supabase.from('profiles').update({ balance: userProfile.balance + amount }).eq('id', user.id)
            }
            return new Response(
                JSON.stringify({ error: 'Transaction creation failed: ' + txError.message, stage: debugStage }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
        }

        // 5. MATCHING ENGINE (Simple)
        debugStage = 'matching_engine'
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

                debugStage = 'fetch_counter_profile'
                // Fetch full profile for counterparty details
                const { data: counterProfile } = await supabase
                    .from('profiles')
                    .select('email, full_name, iban, bank_name')
                    .eq('id', matchTx.user_id)
                    .single()

                // Execute Match
                debugStage = 'execute_match_update_self'
                // Update THIS transaction
                await supabase.from('transactions').update({
                    status: 'MATCHED',
                    description: `Matched with ${matchTx.id}`
                }).eq('id', tx.id)

                debugStage = 'execute_match_update_counter'
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

                debugStage = 'match_complete'
                // Return match immediately to the caller
                return new Response(
                    JSON.stringify({ ...tx, match: matchFound }),
                    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
                )
            }
        }

        debugStage = 'complete'
        return new Response(
            JSON.stringify(tx),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message, stage: debugStage, stack: error.stack }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
