// =============================================
// P2P-ADMIN-ACTION Edge Function
// =============================================
// Admin'in zorla işlem sonuçlandırma yetkisi
// SERVICE_ROLE kullanarak RLS bypass
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
        // SERVICE_ROLE_KEY ile supabase client - RLS bypass
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1️⃣ Auth - Admin kontrolü
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

        // 2️⃣ Admin kontrolü - profiles tablosundan role check
        console.log('[ADMIN] Checking admin role for user:', user.id, user.email)

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        console.log('[ADMIN] Profile result:', { profile, profileError })

        if (!profile || profile.role !== 'admin') {
            console.log('[ADMIN] Access denied - profile:', profile, 'expected role: admin')
            return new Response(
                JSON.stringify({ error: 'Admin access required', debug: { userId: user.id, profile, profileError } }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('[ADMIN] Access granted for:', user.email)

        // 3️⃣ Body parse
        const { action, orderId } = await req.json()

        if (!action || !orderId) {
            return new Response(
                JSON.stringify({ error: 'action and orderId required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4️⃣ Order getir
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

        // 5️⃣ Action işle
        if (action === 'forceComplete') {
            // Zorla tamamla
            const { error: updateError } = await supabase
                .from('p2p_orders')
                .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
                .eq('id', orderId)

            if (updateError) {
                console.error('[ADMIN] Force complete error:', updateError)
                return new Response(
                    JSON.stringify({ success: false, error: updateError.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Matched order da tamamla
            if (order.matched_order_id) {
                await supabase
                    .from('p2p_orders')
                    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
                    .eq('id', order.matched_order_id)
            }

            // Buyer bakiyesini güncelle (USDT ekle)
            if (order.buyer_id && order.amount_usd) {
                const { data: buyerProfile } = await supabase
                    .from('profiles')
                    .select('balance')
                    .eq('id', order.buyer_id)
                    .single()

                if (buyerProfile) {
                    await supabase
                        .from('profiles')
                        .update({ balance: (buyerProfile.balance || 0) + order.amount_usd })
                        .eq('id', order.buyer_id)
                }
            }

            // Event log
            await supabase.from('p2p_events').insert({
                order_id: orderId,
                actor_id: user.id,
                actor_role: 'admin',
                event_type: 'ADMIN_FORCE_COMPLETE',
                metadata: { admin_email: user.email }
            })

            console.log('[ADMIN] Force completed order:', orderId)
            return new Response(
                JSON.stringify({ success: true, message: 'Order force completed' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (action === 'forceCancel') {
            // Zorla iptal
            const { error: updateError } = await supabase
                .from('p2p_orders')
                .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                .eq('id', orderId)

            if (updateError) {
                console.error('[ADMIN] Force cancel error:', updateError)
                return new Response(
                    JSON.stringify({ success: false, error: updateError.message }),
                    { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                )
            }

            // Matched order da iptal
            if (order.matched_order_id) {
                await supabase
                    .from('p2p_orders')
                    .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
                    .eq('id', order.matched_order_id)
            }

            // Event log
            await supabase.from('p2p_events').insert({
                order_id: orderId,
                actor_id: user.id,
                actor_role: 'admin',
                event_type: 'ADMIN_FORCE_CANCEL',
                metadata: { admin_email: user.email }
            })

            console.log('[ADMIN] Force cancelled order:', orderId)
            return new Response(
                JSON.stringify({ success: true, message: 'Order force cancelled' }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ error: 'Invalid action. Use: forceComplete or forceCancel' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Admin action error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
