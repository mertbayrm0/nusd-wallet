// =============================================
// P2P-CANCEL-ORDER Edge Function
// =============================================
// Kullanıcının kendi P2P order'ını iptal etmesini sağlar
// Sadece OPEN durumundaki orderlar iptal edilebilir
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1️⃣ Auth Kontrolü
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

        // 2️⃣ Body Parse
        const body = await req.json()
        const { orderId } = body

        if (!orderId) {
            return new Response(
                JSON.stringify({ success: false, error: 'Order ID required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3️⃣ Order'ı Bul ve Yetki Kontrolü
        const { data: order, error: orderError } = await supabase
            .from('p2p_orders')
            .select('*')
            .eq('id', orderId)
            .single()

        if (orderError || !order) {
            console.error('Order not found:', orderError)
            return new Response(
                JSON.stringify({ success: false, error: 'Order not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Sadece kendi order'ını iptal edebilir (buyer veya seller)
        const isOwner = order.buyer_id === user.id || order.seller_id === user.id
        if (!isOwner) {
            return new Response(
                JSON.stringify({ success: false, error: 'Permission denied' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // OPEN ve MATCHED durumundaki orderlar iptal edilebilir
        // PAID durumunda ödeme yapılmış olduğundan iptal edilemez
        const cancellableStatuses = ['OPEN', 'MATCHED']
        if (!cancellableStatuses.includes(order.status)) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Bu işlem iptal edilemez. Ödeme yapıldığı için devam etmelisiniz. Mevcut durum: ${order.status}`,
                    currentStatus: order.status
                }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4️⃣ Order'ı İptal Et
        const { data: updatedOrder, error: updateError } = await supabase
            .from('p2p_orders')
            .update({ status: 'CANCELLED' })
            .eq('id', orderId)
            .select()
            .single()

        if (updateError) {
            console.error('Cancel error:', updateError)
            return new Response(
                JSON.stringify({ success: false, error: 'Failed to cancel order' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 5️⃣ Event Log
        await supabase.from('p2p_events').insert({
            order_id: orderId,
            actor_id: user.id,
            actor_role: order.buyer_id === user.id ? 'buyer' : 'seller',
            event_type: 'CANCEL',
            metadata: { cancelled_at: new Date().toISOString() }
        })

        console.log('[P2P-CANCEL-ORDER] Order cancelled:', orderId)

        return new Response(
            JSON.stringify({
                success: true,
                message: 'İşlem başarıyla iptal edildi',
                order: updatedOrder
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Unexpected error:', e)
        return new Response(
            JSON.stringify({ success: false, error: 'Internal server error', details: e.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
