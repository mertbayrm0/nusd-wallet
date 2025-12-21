// =============================================
// P2P-MARK-PAID Edge Function
// =============================================
// Seller "Ödedim" butonuna bastığında çağrılır
// Status: MATCHED → PAID
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
        const { orderId } = await req.json()

        if (!orderId) {
            return new Response(
                JSON.stringify({ error: 'orderId required' }),
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

        // 4️⃣ Yetki: Sadece BUYER mark-paid yapabilir (para gönderen taraf)
        if (order.buyer_id !== user.id) {
            return new Response(
                JSON.stringify({ error: 'Only buyer can mark as paid' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5️⃣ Status kontrolü: Sadece MATCHED → PAID
        if (order.status !== 'MATCHED') {
            return new Response(
                JSON.stringify({ error: 'Order must be MATCHED to mark as paid', currentStatus: order.status }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 6️⃣ Update
        const { data: updated, error: updateError } = await supabase
            .from('p2p_orders')
            .update({
                status: 'PAID',
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId)
            .eq('status', 'MATCHED')  // Race condition guard
            .select()
            .single()

        if (updateError || !updated) {
            return new Response(
                JSON.stringify({ error: 'Update failed - status may have changed' }),
                { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 🔄 ÖNEMLİ: Eşleşen order'ı da PAID yap
        // Bu sayede seller kendi order'ında PAID görüp onay popup'ı görecek
        if (order.matched_order_id) {
            console.log('[P2P-MARK-PAID] Updating matched order to PAID:', order.matched_order_id)

            const { error: matchedError } = await supabase
                .from('p2p_orders')
                .update({
                    status: 'PAID',
                    updated_at: new Date().toISOString()
                })
                .eq('id', order.matched_order_id)

            if (matchedError) {
                console.error('[P2P-MARK-PAID] Failed to update matched order:', matchedError)
            } else {
                console.log('[P2P-MARK-PAID] Matched order updated to PAID successfully')
            }
        }

        // 7️⃣ Event log
        await supabase.from('p2p_events').insert({
            order_id: orderId,
            actor_id: user.id,
            actor_role: 'buyer',
            event_type: 'MARK_PAID',
            metadata: { marked_at: new Date().toISOString() }
        })

        // 8️⃣ Başarılı
        return new Response(
            JSON.stringify({
                success: true,
                message: 'Order marked as paid',
                order: {
                    id: updated.id,
                    status: updated.status,
                    amount_usd: updated.amount_usd
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Mark paid error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
