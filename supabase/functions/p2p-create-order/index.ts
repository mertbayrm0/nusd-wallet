// =============================================
// P2P-CREATE-ORDER Edge Function
// =============================================
// Yeni P2P emri oluşturur (BUY veya SELL)
// BUY = Alıcı (çekim yapmak istiyor)
// SELL = Satıcı (yatırım yapmak istiyor)
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
                JSON.stringify({ error: 'Unauthorized', code: 'NO_AUTH' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Invalid token', code: 'INVALID_TOKEN' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2️⃣ Body Parse
        const body = await req.json()
        const { amount_usd, side, iban, bank_name, account_name } = body

        // Validation
        if (!amount_usd || amount_usd <= 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid amount', code: 'INVALID_AMOUNT' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (!side || !['BUY', 'SELL'].includes(side)) {
            return new Response(
                JSON.stringify({ error: 'Side must be BUY or SELL', code: 'INVALID_SIDE' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // SELL için IBAN zorunlu
        if (side === 'SELL' && !iban) {
            return new Response(
                JSON.stringify({ error: 'IBAN required for SELL orders', code: 'IBAN_REQUIRED' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 🔒 SECURITY: SELL için mevcut aktif order kontrolü (tek SELL sınırı)
        if (side === 'SELL') {
            const { data: activeOrders } = await supabase
                .from('p2p_orders')
                .select('id, status, amount_usd, created_at')
                .eq('seller_id', user.id)
                .in('status', ['OPEN', 'MATCHED', 'PAID'])
                .limit(1)

            if (activeOrders && activeOrders.length > 0) {
                const existing = activeOrders[0]
                console.log('[P2P-CREATE-ORDER] Blocking - user already has active SELL order:', existing.id)
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Zaten aktif bir satış emriniz var. Yeni emir oluşturmak için mevcut emrin tamamlanmasını veya iptal edilmesini bekleyin.',
                        code: 'ACTIVE_ORDER_EXISTS',
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
        }

        // 🔒 SECURITY: BUY için mevcut aktif order kontrolü (tek BUY sınırı)
        if (side === 'BUY') {
            const { data: activeOrders } = await supabase
                .from('p2p_orders')
                .select('id, status, amount_usd, created_at')
                .eq('buyer_id', user.id)
                .in('status', ['OPEN', 'MATCHED', 'PAID'])
                .limit(1)

            if (activeOrders && activeOrders.length > 0) {
                const existing = activeOrders[0]
                console.log('[P2P-CREATE-ORDER] Blocking - user already has active BUY order:', existing.id)
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: 'Zaten aktif bir alış emriniz var. Yeni emir oluşturmak için mevcut emrin tamamlanmasını veya iptal edilmesini bekleyin.',
                        code: 'ACTIVE_ORDER_EXISTS',
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
        }

        // 3️⃣ Order Oluştur
        const orderData: any = {
            amount_usd: parseFloat(amount_usd),
            status: 'OPEN',
            match_tolerance_percent: 2.0 // Varsayılan ±%2
        }

        if (side === 'BUY') {
            orderData.buyer_id = user.id
            // Seller henüz yok
        } else {
            orderData.seller_id = user.id
            orderData.seller_iban = iban
            orderData.seller_bank_name = bank_name || null
            orderData.seller_account_name = account_name || null
        }

        const { data: order, error: orderError } = await supabase
            .from('p2p_orders')
            .insert(orderData)
            .select()
            .single()

        if (orderError) {
            console.error('Order creation error:', orderError)
            return new Response(
                JSON.stringify({ error: 'Failed to create order', code: 'DB_ERROR', details: orderError.message }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4️⃣ Event Log
        await supabase.from('p2p_events').insert({
            order_id: order.id,
            actor_id: user.id,
            actor_role: side === 'BUY' ? 'buyer' : 'seller',
            event_type: 'CREATE',
            metadata: { amount_usd, side }
        })

        // 5️⃣ SELL için Bank Snapshot
        if (side === 'SELL' && iban) {
            await supabase.from('p2p_bank_accounts_snapshot').insert({
                order_id: order.id,
                beneficiary_name: account_name || user.email?.split('@')[0] || 'Unknown',
                iban: iban,
                bank_name: bank_name || null
            })
        }

        // 6️⃣ Başarılı Yanıt
        return new Response(
            JSON.stringify({
                success: true,
                order: {
                    id: order.id,
                    status: order.status,
                    amount_usd: order.amount_usd,
                    side: side,
                    created_at: order.created_at
                }
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Unexpected error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR', details: e.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
