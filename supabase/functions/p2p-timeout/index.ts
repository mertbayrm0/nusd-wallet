// =============================================
// P2P-TIMEOUT Edge Function
// =============================================
// 20 dakikadan uzun süredir MATCHED durumunda kalan
// işlemleri otomatik iptal eder
// 
// Cron: Her dakika çalışır
// =============================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TIMEOUT_MINUTES = 20;

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const now = new Date();
        const timeoutThreshold = new Date(now.getTime() - TIMEOUT_MINUTES * 60 * 1000);

        console.log('[P2P-TIMEOUT] Checking for expired orders...');
        console.log('[P2P-TIMEOUT] Timeout threshold:', timeoutThreshold.toISOString());

        // 1️⃣ MATCHED durumunda 20 dk'yı aşmış order'ları bul
        const { data: expiredOrders, error: fetchError } = await supabase
            .from('p2p_orders')
            .select('id, buyer_id, seller_id, amount_usd, matched_order_id, status, updated_at')
            .in('status', ['MATCHED', 'PAID'])
            .lt('updated_at', timeoutThreshold.toISOString())

        if (fetchError) {
            console.error('[P2P-TIMEOUT] Fetch error:', fetchError);
            return new Response(
                JSON.stringify({ error: fetchError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!expiredOrders || expiredOrders.length === 0) {
            console.log('[P2P-TIMEOUT] No expired orders found');
            return new Response(
                JSON.stringify({ message: 'No expired orders', checked_at: now.toISOString() }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log(`[P2P-TIMEOUT] Found ${expiredOrders.length} expired orders`);

        // 2️⃣ Her expired order'ı iptal et
        const cancelledOrderIds: string[] = [];

        for (const order of expiredOrders) {
            console.log(`[P2P-TIMEOUT] Cancelling order ${order.id} (status: ${order.status})`);

            // Ana order'ı iptal et
            const { error: cancelError } = await supabase
                .from('p2p_orders')
                .update({
                    status: 'EXPIRED',
                    updated_at: now.toISOString()
                })
                .eq('id', order.id)

            if (cancelError) {
                console.error(`[P2P-TIMEOUT] Failed to cancel order ${order.id}:`, cancelError);
                continue;
            }

            cancelledOrderIds.push(order.id);

            // Eşleşen order'ı da iptal et
            if (order.matched_order_id) {
                const { error: matchCancelError } = await supabase
                    .from('p2p_orders')
                    .update({
                        status: 'EXPIRED',
                        updated_at: now.toISOString()
                    })
                    .eq('id', order.matched_order_id)

                if (matchCancelError) {
                    console.error(`[P2P-TIMEOUT] Failed to cancel matched order ${order.matched_order_id}:`, matchCancelError);
                } else {
                    cancelledOrderIds.push(order.matched_order_id);
                }
            }

            // Event log
            await supabase.from('p2p_events').insert({
                order_id: order.id,
                actor_id: null, // System action
                actor_role: 'system',
                event_type: 'TIMEOUT_EXPIRED',
                metadata: {
                    reason: `Order expired after ${TIMEOUT_MINUTES} minutes`,
                    original_status: order.status,
                    expired_at: now.toISOString()
                }
            })
        }

        console.log(`[P2P-TIMEOUT] Cancelled ${cancelledOrderIds.length} orders`);

        return new Response(
            JSON.stringify({
                success: true,
                message: `Cancelled ${cancelledOrderIds.length} expired orders`,
                cancelled_order_ids: cancelledOrderIds,
                checked_at: now.toISOString()
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('[P2P-TIMEOUT] Error:', e);
        return new Response(
            JSON.stringify({ error: 'Internal error', details: e.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
