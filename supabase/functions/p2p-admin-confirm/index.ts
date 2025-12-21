// =============================================
// P2P-ADMIN-CONFIRM Edge Function
// =============================================
// Admin son onayı verir
// confirm: true → COMPLETED (eğer buyer da onaylamışsa)
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

        // 2️⃣ Admin kontrolü
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!profile || profile.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Admin access required' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 3️⃣ Body
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

        // 5️⃣ Status kontrolü
        if (!['PAID', 'MATCHED'].includes(order.status)) {
            return new Response(
                JSON.stringify({ error: 'Order must be PAID or MATCHED', currentStatus: order.status }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 6️⃣ Confirm veya Cancel
        const updateData: any = {
            updated_at: new Date().toISOString()
        }

        if (confirm) {
            updateData.admin_confirmed_at = new Date().toISOString()
            // Her iki taraf da onayladıysa COMPLETED
            if (order.buyer_confirmed_at) {
                updateData.status = 'COMPLETED'
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

        // 7️⃣ Event log
        await supabase.from('p2p_events').insert({
            order_id: orderId,
            actor_id: user.id,
            actor_role: 'admin',
            event_type: confirm ? 'ADMIN_CONFIRM' : 'CANCEL',
            metadata: { confirm, admin_email: user.email }
        })

        // 8️⃣ Başarılı
        return new Response(
            JSON.stringify({
                success: true,
                message: confirm ? 'Admin confirmed' : 'Order cancelled by admin',
                order: {
                    id: updated.id,
                    status: updated.status,
                    admin_confirmed_at: updated.admin_confirmed_at,
                    buyer_confirmed_at: updated.buyer_confirmed_at
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Admin confirm error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
