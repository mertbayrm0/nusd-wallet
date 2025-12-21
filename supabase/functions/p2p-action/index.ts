// =============================================
// P2P-ACTION Edge Function
// =============================================
// Tek endpoint ile tüm P2P işlemleri
// Actions: create, markPaid, confirm
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // Auth
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ success: false, error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) {
            return new Response(
                JSON.stringify({ success: false, error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const body = await req.json()
        const { action, orderId, amount, iban, bankName, accountName, side } = body

        console.log('[P2P-ACTION] Called with:', { action, side, amount, userId: user.id })

        // =============================================
        // ACTION: CREATE
        // =============================================
        if (action === 'create') {
            if (!amount || amount <= 0) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Invalid amount' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // SELLER creates OPEN order
            if (side === 'SELL') {
                if (!iban) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'IBAN required for sell orders' }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                // 🔒 SECURITY: Check for existing active P2P order (OPEN, MATCHED, or PAID)
                const { data: activeOrders } = await supabase
                    .from('p2p_orders')
                    .select('id, status, amount_usd, created_at')
                    .eq('seller_id', user.id)
                    .in('status', ['OPEN', 'MATCHED', 'PAID'])
                    .limit(1)

                if (activeOrders && activeOrders.length > 0) {
                    const existing = activeOrders[0]
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: 'Zaten aktif bir satış emriniz var. Yeni emir oluşturmak için mevcut emrin tamamlanmasını veya iptal edilmesini bekleyin.',
                            hasActiveOrder: true,
                            activeOrder: {
                                id: existing.id,
                                status: existing.status,
                                amount: existing.amount_usd,
                                created_at: existing.created_at
                            }
                        }),
                        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                const { data: order, error: orderError } = await supabase
                    .from('p2p_orders')
                    .insert({
                        seller_id: user.id,
                        amount_usd: parseFloat(amount),
                        status: 'OPEN',
                        seller_iban: iban,
                        seller_bank_name: bankName || null,
                        seller_account_name: accountName || null
                    })
                    .select()
                    .single()

                if (orderError) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Failed to create order' }),
                        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                return new Response(
                    JSON.stringify({ success: true, order, message: 'Sell order created' }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // BUYER looks for matching OPEN order
            if (side === 'BUY') {
                // Find matching OPEN order (±%5 tolerance)
                const minAmount = parseFloat(amount) * 0.95
                const maxAmount = parseFloat(amount) * 1.05

                const { data: matches } = await supabase
                    .from('p2p_orders')
                    .select('*')
                    .eq('status', 'OPEN')
                    .is('buyer_id', null)
                    .neq('seller_id', user.id)
                    .gte('amount_usd', minAmount)
                    .lte('amount_usd', maxAmount)
                    .order('created_at', { ascending: true })
                    .limit(1)

                if (!matches || matches.length === 0) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'No matching order found', noMatch: true }),
                        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                const matchedOrder = matches[0]

                // Update order: set buyer, change status to MATCHED
                const { data: updated, error: updateError } = await supabase
                    .from('p2p_orders')
                    .update({
                        buyer_id: user.id,
                        status: 'MATCHED',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', matchedOrder.id)
                    .eq('status', 'OPEN')  // Race condition guard
                    .select()
                    .single()

                if (updateError || !updated) {
                    return new Response(
                        JSON.stringify({ success: false, error: 'Match failed - order may have been taken' }),
                        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    )
                }

                // Return order with seller IBAN
                return new Response(
                    JSON.stringify({
                        success: true,
                        matched: true,
                        order: updated,
                        sellerIban: updated.seller_iban,
                        sellerBank: updated.seller_bank_name,
                        sellerName: updated.seller_account_name
                    }),
                    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ success: false, error: 'side must be BUY or SELL' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // =============================================
        // ACTION: MARK PAID (Buyer says "Ödedim")
        // =============================================
        if (action === 'markPaid') {
            if (!orderId) {
                return new Response(
                    JSON.stringify({ success: false, error: 'orderId required' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Get order and verify buyer
            const { data: order } = await supabase
                .from('p2p_orders')
                .select('*')
                .eq('id', orderId)
                .single()

            if (!order) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Order not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            if (order.buyer_id !== user.id) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Only buyer can mark as paid' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            if (order.status !== 'MATCHED') {
                return new Response(
                    JSON.stringify({ success: false, error: 'Order must be MATCHED to mark paid' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Update to PAID
            const { data: updated, error: updateError } = await supabase
                .from('p2p_orders')
                .update({ status: 'PAID', updated_at: new Date().toISOString() })
                .eq('id', orderId)
                .eq('status', 'MATCHED')
                .select()
                .single()

            if (updateError || !updated) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Update failed' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            return new Response(
                JSON.stringify({ success: true, order: updated, message: 'Marked as paid' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // =============================================
        // ACTION: CONFIRM (Seller says "Onaylıyorum")
        // =============================================
        if (action === 'confirm') {
            if (!orderId) {
                return new Response(
                    JSON.stringify({ success: false, error: 'orderId required' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Get order and verify seller
            const { data: order } = await supabase
                .from('p2p_orders')
                .select('*')
                .eq('id', orderId)
                .single()

            if (!order) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Order not found' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            if (order.seller_id !== user.id) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Only seller can confirm' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            if (order.status !== 'PAID') {
                return new Response(
                    JSON.stringify({ success: false, error: 'Order must be PAID to confirm' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Update to COMPLETED
            const { error: updateError } = await supabase
                .from('p2p_orders')
                .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
                .eq('id', orderId)
                .eq('status', 'PAID')

            if (updateError) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Update failed' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // 🔄 ÖNEMLİ: Eşleşen order'ı da COMPLETED yap
            // Bu sayede admin panelinde her iki order da aynı status'ta olacak
            if (order.matched_order_id) {
                console.log('[P2P-ACTION] Updating matched order to COMPLETED:', order.matched_order_id)

                const { error: matchedError } = await supabase
                    .from('p2p_orders')
                    .update({
                        status: 'COMPLETED',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', order.matched_order_id)

                if (matchedError) {
                    console.error('[P2P-ACTION] Failed to update matched order:', matchedError)
                } else {
                    console.log('[P2P-ACTION] Matched order updated successfully')
                }
            }

            // Transfer balance: Seller loses, Buyer gains
            const transferAmount = order.amount_usd

            // Get seller's current balance
            const { data: sellerProfile } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', order.seller_id)
                .single()

            // Get buyer's current balance
            const { data: buyerProfile } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', order.buyer_id)
                .single()

            if (!sellerProfile || !buyerProfile) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Could not fetch user profiles' }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // 🔒 SECURITY: Balance check - seller must have enough balance
            if ((sellerProfile.balance || 0) < transferAmount) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Satıcı bakiyesi yetersiz. Önce bakiyenizi yükleyin.',
                        insufficientBalance: true
                    }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Calculate new balances
            const newSellerBalance = (sellerProfile.balance || 0) - transferAmount
            const newBuyerBalance = (buyerProfile.balance || 0) + transferAmount

            // Update seller balance
            await supabase
                .from('profiles')
                .update({ balance: newSellerBalance })
                .eq('id', order.seller_id)

            // Update buyer balance
            await supabase
                .from('profiles')
                .update({ balance: newBuyerBalance })
                .eq('id', order.buyer_id)

            return new Response(
                JSON.stringify({ success: true, message: 'Order completed, balance transferred' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // =============================================
        // ACTION: REJECT (Seller says "Reddet")
        // =============================================
        if (action === 'reject') {
            if (!orderId) {
                return new Response(
                    JSON.stringify({ success: false, error: 'orderId required' }),
                    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Get order and verify seller
            const { data: order } = await supabase
                .from('p2p_orders')
                .select('*')
                .eq('id', orderId)
                .single()

            if (!order || order.seller_id !== user.id) {
                return new Response(
                    JSON.stringify({ success: false, error: 'Not authorized' }),
                    { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Cancel the order, reset buyer
            await supabase
                .from('p2p_orders')
                .update({
                    status: 'OPEN',
                    buyer_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)

            return new Response(
                JSON.stringify({ success: true, message: 'Order rejected and reopened' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ success: false, error: 'Invalid action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('P2P Action error:', e)
        return new Response(
            JSON.stringify({ success: false, error: 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
