// =============================================
// P2P-MATCH Edge Function
// =============================================
// OPEN order'lar arasında eşleşme bulur
// Atomic lock: Sadece 1 seller bağlanabilir
// Lock süresi: 15 dakika
// Tolerans: Dinamik (tutar bazlı)
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOCK_DURATION_MINUTES = 15

// =============================================
// DİNAMİK TOLERANS HESAPLAMA
// =============================================
// Düşük tutarlarda geniş tolerans, yüksek tutarlarda daha geniş
// Formül: tolerance = min(35%, 20% + (amount / 100) * 1.5%)
// 
// Örnek sonuçlar:
// 10 USD  → 20.15% tolerans → 8 - 12 USD aralığı
// 15 USD  → 20.23% tolerans → 12 - 18 USD aralığı
// 50 USD  → 20.75% tolerans → 40 - 60 USD aralığı
// 100 USD → 21.5% tolerans → 78 - 122 USD aralığı
// 300 USD → 24.5% tolerans → 227 - 374 USD aralığı
// 1000 USD → 35% tolerans → 650 - 1350 USD aralığı (max)
// =============================================
function calculateTolerance(amount: number): number {
    const baseTolerance = 20; // Base: %20 (artırıldı)
    const scaleFactor = 1.5;  // Her 100 USD için %1.5 eklenir
    const maxTolerance = 35;  // Maximum: %35 (artırıldı)

    const calculatedTolerance = baseTolerance + (amount / 100) * scaleFactor;
    return Math.min(calculatedTolerance, maxTolerance);
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

        // 2️⃣ Body - orderId (eşleştirmek istediğimiz order)
        const { orderId } = await req.json()

        if (!orderId) {
            return new Response(
                JSON.stringify({ error: 'orderId required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3️⃣ Mevcut order'ı getir
        const { data: myOrder, error: myOrderError } = await supabase
            .from('p2p_orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (myOrderError || !myOrder) {
            return new Response(
                JSON.stringify({ error: 'Order not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Yetki kontrolü: Sadece order sahibi eşleşme isteyebilir
        const isOwner = myOrder.buyer_id === user.id || myOrder.seller_id === user.id
        if (!isOwner) {
            return new Response(
                JSON.stringify({ error: 'Not authorized for this order' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Sadece OPEN order eşleşebilir
        if (myOrder.status !== 'OPEN') {
            return new Response(
                JSON.stringify({ error: 'Order is not OPEN', currentStatus: myOrder.status }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4️⃣ Karşı tarafı bul (BUY ise SELL ara, SELL ise BUY ara)
        const isBuyer = myOrder.buyer_id !== null
        const targetColumn = isBuyer ? 'seller_id' : 'buyer_id'
        const myColumn = isBuyer ? 'buyer_id' : 'seller_id'

        // 🎯 TAM EŞLEŞME - Tolerans kaldırıldı, birebir tutar eşleşmesi
        console.log('[P2P-MATCH] Looking for EXACT match:', {
            myOrderId: orderId,
            isBuyer,
            targetColumn,
            myColumn,
            exactAmount: myOrder.amount_usd
        })

        // Uygun OPEN order bul (karşı taraf dolu, benim tarafım boş, TAM TUTAR)
        const { data: matches, error: matchError } = await supabase
            .from('p2p_orders')
            .select('*')
            .eq('status', 'OPEN')
            .not(targetColumn, 'is', null)  // Karşı taraf dolu
            .is(myColumn, null)              // Benim tarafım boş
            .eq('amount_usd', myOrder.amount_usd)  // 🎯 TAM TUTAR EŞLEŞMESİ
            .neq('id', orderId)              // Kendim hariç
            .order('created_at', { ascending: true })
            .limit(1)

        console.log('[P2P-MATCH] Match query result:', {
            matchError,
            matchCount: matches?.length || 0,
            matches: matches?.map(m => ({ id: m.id, status: m.status, amount: m.amount_usd, seller_id: m.seller_id, buyer_id: m.buyer_id }))
        })

        if (matchError) {
            console.error('Match query error:', matchError)
            return new Response(
                JSON.stringify({ error: 'Match query failed' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!matches || matches.length === 0) {
            return new Response(
                JSON.stringify({
                    success: false,
                    message: 'No matching order found',
                    waiting: true
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const matchedOrder = matches[0]

        // 🔒 SECURITY: Self-matching kontrolü - kendi kendine eşleşme engelle
        const matchedUserId = isBuyer ? matchedOrder.seller_id : matchedOrder.buyer_id
        if (matchedUserId === user.id) {
            console.warn('[P2P-MATCH] Self-matching attempt blocked:', { userId: user.id, orderId, matchedOrderId: matchedOrder.id })
            return new Response(
                JSON.stringify({
                    success: false,
                    error: 'Kendi işleminizle eşleşemezsiniz',
                    code: 'SELF_MATCH_NOT_ALLOWED'
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5️⃣ ATOMIC MATCH - İki order'ı birleştir
        const lockExpiry = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000).toISOString()

        // My order'ı güncelle
        const myUpdateData: any = {
            status: 'MATCHED',
            lock_expires_at: lockExpiry,
            updated_at: new Date().toISOString(),
            matched_order_id: matchedOrder.id  // 🔗 Eşleşen order ID'sini kaydet
        }

        // Karşı tarafı ekle
        if (isBuyer) {
            myUpdateData.seller_id = matchedOrder.seller_id
            myUpdateData.seller_iban = matchedOrder.seller_iban
            myUpdateData.seller_bank_name = matchedOrder.seller_bank_name
            myUpdateData.seller_account_name = matchedOrder.seller_account_name
        } else {
            myUpdateData.buyer_id = matchedOrder.buyer_id
        }

        // Atomic update: Sadece OPEN ise güncelle
        console.log('[P2P-MATCH] Updating my order with:', {
            orderId,
            myUpdateData,
            currentStatus: myOrder.status
        })

        const { data: updatedMyOrder, error: updateMyError } = await supabase
            .from('p2p_orders')
            .update(myUpdateData)
            .eq('id', orderId)
            .eq('status', 'OPEN')  // Race condition guard
            .select()
            .single()

        console.log('[P2P-MATCH] My order update result:', {
            updateMyError,
            updatedMyOrder: updatedMyOrder ? { id: updatedMyOrder.id, status: updatedMyOrder.status } : null
        })

        if (updateMyError || !updatedMyOrder) {
            console.error('[P2P-MATCH] My order update failed:', { updateMyError, updatedMyOrder })
            return new Response(
                JSON.stringify({ error: 'Match failed - order state changed', details: updateMyError?.message }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Matched order'ı da güncelle
        const matchUpdateData: any = {
            status: 'MATCHED',
            lock_expires_at: lockExpiry,
            updated_at: new Date().toISOString(),
            matched_order_id: orderId  // 🔗 Karşı tarafın matched_order_id'si de set edilir
        }

        if (isBuyer) {
            matchUpdateData.buyer_id = user.id
        } else {
            matchUpdateData.seller_id = user.id
            matchUpdateData.seller_iban = myOrder.seller_iban
            matchUpdateData.seller_bank_name = myOrder.seller_bank_name
            matchUpdateData.seller_account_name = myOrder.seller_account_name
        }

        const { error: updateMatchError } = await supabase
            .from('p2p_orders')
            .update(matchUpdateData)
            .eq('id', matchedOrder.id)
            .eq('status', 'OPEN')

        if (updateMatchError) {
            // Rollback my order
            await supabase.from('p2p_orders').update({ status: 'OPEN' }).eq('id', orderId)
            return new Response(
                JSON.stringify({ error: 'Match failed - counter order changed' }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 6️⃣ Event Logs
        await supabase.from('p2p_events').insert([
            {
                order_id: orderId,
                actor_id: user.id,
                actor_role: isBuyer ? 'buyer' : 'seller',
                event_type: 'MATCH',
                metadata: { matched_order_id: matchedOrder.id }
            },
            {
                order_id: matchedOrder.id,
                actor_id: user.id,
                actor_role: 'system',
                event_type: 'MATCH',
                metadata: { matched_order_id: orderId }
            }
        ])

        // 7️⃣ Başarılı Yanıt
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Match successful',
                match: {
                    myOrderId: orderId,
                    matchedOrderId: matchedOrder.id,
                    amount_usd: myOrder.amount_usd,
                    matched_amount_usd: matchedOrder.amount_usd, // Satıcının tutarı (buyer için)
                    status: 'MATCHED',
                    lock_expires_at: lockExpiry,
                    counterparty: {
                        iban: isBuyer ? matchedOrder.seller_iban : myOrder.seller_iban,
                        bank_name: isBuyer ? matchedOrder.seller_bank_name : myOrder.seller_bank_name,
                        account_name: isBuyer ? matchedOrder.seller_account_name : myOrder.seller_account_name
                    }
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Match error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
