// =============================================
// GET-PENDING-WITHDRAWALS Edge Function
// =============================================
// Bekleyen çekim taleplerini listeler
// Yatırımcının tutarına en yakın 5 tutarı döner
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

        // 2️⃣ Body - Yatırımcının talep ettiği tutar
        const { targetAmount } = await req.json()

        if (!targetAmount || targetAmount <= 0) {
            return new Response(
                JSON.stringify({ error: 'targetAmount required and must be positive' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('[GET-PENDING-WITHDRAWALS] Target amount:', targetAmount)

        // 3️⃣ Bekleyen çekim taleplerini getir
        // OPEN status, seller_id dolu (satıcı oluşturdu), buyer_id boş (henüz eşleşmedi)
        const { data: pendingWithdrawals, error: queryError } = await supabase
            .from('p2p_orders')
            .select('id, amount_usd, created_at')
            .eq('status', 'OPEN')
            .not('seller_id', 'is', null)  // Satıcı tarafından oluşturulmuş
            .is('buyer_id', null)           // Henüz alıcı yok
            .order('created_at', { ascending: true })

        if (queryError) {
            console.error('[GET-PENDING-WITHDRAWALS] Query error:', queryError)
            return new Response(
                JSON.stringify({ error: 'Database error' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('[GET-PENDING-WITHDRAWALS] Found', pendingWithdrawals?.length || 0, 'pending withdrawals')

        if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
            return new Response(
                JSON.stringify({
                    success: true,
                    withdrawals: [],
                    message: 'No pending withdrawals available'
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 4️⃣ En yakın 5 tutarı hesapla (hem altında hem üstünde)
        const withdrawalsWithDistance = pendingWithdrawals.map(w => ({
            ...w,
            distance: Math.abs(w.amount_usd - targetAmount)
        }))

        // Uzaklığa göre sırala
        withdrawalsWithDistance.sort((a, b) => a.distance - b.distance)

        // İlk 5'i al (veya daha az varsa hepsini)
        const closestWithdrawals = withdrawalsWithDistance.slice(0, 5).map(w => ({
            id: w.id,
            amount_usd: w.amount_usd,
            created_at: w.created_at
        }))

        // Tutara göre sırala (küçükten büyüğe)
        closestWithdrawals.sort((a, b) => a.amount_usd - b.amount_usd)

        console.log('[GET-PENDING-WITHDRAWALS] Closest 5:', closestWithdrawals.map(w => w.amount_usd))

        // 5️⃣ Başarılı yanıt
        return new Response(
            JSON.stringify({
                success: true,
                targetAmount,
                withdrawals: closestWithdrawals,
                totalAvailable: pendingWithdrawals.length
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Get pending withdrawals error:', e)
        return new Response(
            JSON.stringify({ error: 'Internal error', details: e.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
