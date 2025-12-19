// =============================================
// P2P-BUYER-CONFIRM Edge Function
// =============================================
// Buyer ödemeyi aldığını onaylar
// confirm: true → buyer_confirmed_at set
// confirm: false → CANCELLED
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

        // 1️⃣ Auth
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2️⃣ Body
        const { orderId, confirm } = await req.json()

        if (!orderId) {
            return new Response(
                JSON.stringify({ error: 'orderId required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (typeof confirm !== 'boolean') {
            return new Response(
                JSON.stringify({ error: 'confirm must be true or false' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3️⃣ Order getir
        const { data: order, error: orderError } = await supabase
            .from('p2p_orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            return new Response(
                JSON.stringify({ error: 'Order not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4️⃣ Yetki: Sadece BUYER onaylayabilir
        if (order.buyer_id !== user.id) {
            return new Response(
                JSON.stringify({ error: 'Only buyer can confirm' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5️⃣ Status kontrolü: PAID veya MATCHED olmalı
        if (!['PAID', 'MATCHED'].includes(order.status)) {
            return new Response(
                JSON.stringify({ error: 'Order must be PAID or MATCHED to confirm', currentStatus: order.status }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 6️⃣ Confirm veya Cancel
        const updateData: any = {
            updated_at: new Date().toISOString()
        }

        if (confirm) {
            updateData.buyer_confirmed_at = new Date().toISOString()
            // Buyer onayı = işlem tamamlanır (admin onayı opsiyonel)
            updateData.status = 'COMPLETED'

            // 💰 BALANCE TRANSFER
            // Seller: bakiyesinden düş (P2P sell = çekim)
            // Buyer: bakiyesine ekle (P2P buy = yatırım)
            // ⚠️ ÖNEMLI: Satıcının tutarı referans alınır
            if (order.seller_id && order.buyer_id) {
                let transferAmount = order.amount_usd; // fallback

                console.log('[P2P-BUYER-CONFIRM] Order ID:', order.id);
                console.log('[P2P-BUYER-CONFIRM] Order amount_usd:', order.amount_usd);
                console.log('[P2P-BUYER-CONFIRM] Order matched_order_id:', order.matched_order_id);

                // Yöntem 1: matched_order_id varsa kullan
                if (order.matched_order_id) {
                    const { data: matchedOrder, error: matchErr } = await supabase
                        .from('p2p_orders')
                        .select('amount_usd')
                        .eq('id', order.matched_order_id)
                        .single();

                    console.log('[P2P-BUYER-CONFIRM] Matched order:', matchedOrder, 'Error:', matchErr);

                    if (matchedOrder?.amount_usd) {
                        transferAmount = matchedOrder.amount_usd;
                        console.log('[P2P-BUYER-CONFIRM] Using matched order amount:', transferAmount);
                    }
                }

                // Yöntem 2: matched_order_id yoksa, aynı eşleşmede satıcının order'ını bul
                if (transferAmount === order.amount_usd && order.id) {
                    // Bu buyer'ın order'ı olabilir, satıcının order'ını ara
                    const { data: sellerOrder, error: sellerErr } = await supabase
                        .from('p2p_orders')
                        .select('amount_usd')
                        .eq('matched_order_id', order.id)  // Satıcının order'ı bu order'a matched olmuş olabilir
                        .single();

                    console.log('[P2P-BUYER-CONFIRM] Seller order lookup:', sellerOrder, 'Error:', sellerErr);

                    if (sellerOrder?.amount_usd) {
                        transferAmount = sellerOrder.amount_usd;
                        console.log('[P2P-BUYER-CONFIRM] Using seller order amount:', transferAmount);
                    }
                }

                console.log('[P2P-BUYER-CONFIRM] FINAL Transfer amount:', transferAmount);

                // Decrease seller balance
                const { error: sellerError } = await supabase.rpc('decrease_balance', {
                    p_user_id: order.seller_id,
                    p_amount: transferAmount
                })

                if (sellerError) {
                    console.error('Seller balance decrease error:', sellerError)
                    // Try direct update as fallback
                    await supabase
                        .from('profiles')
                        .update({ balance: supabase.raw(`balance - ${transferAmount}`) })
                        .eq('id', order.seller_id)
                }

                // Increase buyer balance
                const { error: buyerError } = await supabase.rpc('increase_balance', {
                    p_user_id: order.buyer_id,
                    p_amount: transferAmount
                })

                if (buyerError) {
                    console.error('Buyer balance increase error:', buyerError)
                    // Try direct update as fallback
                    await supabase
                        .from('profiles')
                        .update({ balance: supabase.raw(`balance + ${transferAmount}`) })
                        .eq('id', order.buyer_id)
                }
            }
        } else {
            updateData.status = 'CANCELLED'
        }

        const { data: updated, error: updateError } = await supabase
            .from('p2p_orders')
            .update(updateData)
            .eq('id', orderId)
            .select()
            .single()

        if (updateError) {
            return new Response(
                JSON.stringify({ error: 'Update failed' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 🔄 ÖNEMLİ: Eşleşen order'ı da aynı duruma güncelle
        // Bu sayede hem BUY hem SELL order aynı status'a sahip olur
        if (order.matched_order_id) {
            console.log('[P2P-BUYER-CONFIRM] Updating matched order:', order.matched_order_id)

            const matchedUpdateData: any = {
                status: confirm ? 'COMPLETED' : 'CANCELLED',
                updated_at: new Date().toISOString()
            }

            if (confirm) {
                matchedUpdateData.buyer_confirmed_at = new Date().toISOString()
            }

            // İlk deneme
            const { error: matchedUpdateError, data: matchedUpdateResult } = await supabase
                .from('p2p_orders')
                .update(matchedUpdateData)
                .eq('id', order.matched_order_id)
                .select()

            if (matchedUpdateError) {
                console.error('[P2P-BUYER-CONFIRM] First update failed:', matchedUpdateError)

                // Retry without .select()
                const { error: retryError } = await supabase
                    .from('p2p_orders')
                    .update(matchedUpdateData)
                    .eq('id', order.matched_order_id)

                if (retryError) {
                    console.error('[P2P-BUYER-CONFIRM] Retry also failed:', retryError)
                } else {
                    console.log('[P2P-BUYER-CONFIRM] Retry succeeded for matched order:', order.matched_order_id)
                }
            } else {
                console.log('[P2P-BUYER-CONFIRM] Matched order updated successfully:', matchedUpdateResult)
            }

            // Verify the update actually happened
            const { data: verifyOrder } = await supabase
                .from('p2p_orders')
                .select('id, status')
                .eq('id', order.matched_order_id)
                .single()

            console.log('[P2P-BUYER-CONFIRM] Verification check:', verifyOrder)

            if (verifyOrder && verifyOrder.status !== matchedUpdateData.status) {
                console.error('[P2P-BUYER-CONFIRM] STATUS MISMATCH! Expected:', matchedUpdateData.status, 'Got:', verifyOrder.status)

                // Force update one more time
                await supabase
                    .from('p2p_orders')
                    .update({ status: matchedUpdateData.status, updated_at: new Date().toISOString() })
                    .eq('id', order.matched_order_id)

                console.log('[P2P-BUYER-CONFIRM] Force update attempted')
            }
        } else {
            console.warn('[P2P-BUYER-CONFIRM] No matched_order_id found on order:', orderId)
        }

        // 7️⃣ Event log
        await supabase.from('p2p_events').insert({
            order_id: orderId,
            actor_id: user.id,
            actor_role: 'buyer',
            event_type: confirm ? 'BUYER_CONFIRM' : 'CANCEL',
            metadata: { confirm, balanceTransferred: confirm }
        })

        // 8️⃣ Başarılı
        return new Response(
            JSON.stringify({
                success: true,
                message: confirm ? 'Buyer confirmed - Transaction completed!' : 'Order cancelled by buyer',
                order: {
                    id: updated.id,
                    status: updated.status,
                    buyer_confirmed_at: updated.buyer_confirmed_at
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Buyer confirm error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error', details: e.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
