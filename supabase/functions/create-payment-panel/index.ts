// Supabase Edge Function: create-payment-panel
import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No auth header')

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Verify Admin
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: userError } = await supabase.auth.getUser(token)

        if (userError || !user) throw new Error('Unauthorized')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Admin only' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // 2. Parse Body
        const { department_id, name, commission_mode, commission_value, asset, settlement_type, is_active } = await req.json()

        if (!department_id || !name || !asset) throw new Error('Missing required fields')

        // Generate Slug
        const slugBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        const randomSuffix = Math.random().toString(36).substring(2, 6)
        const public_slug = `${slugBase}-${randomSuffix}`

        // 3. Insert Panel
        const { data, error } = await supabase
            .from('payment_panels')
            .insert({
                department_id,
                name,
                commission_type: commission_mode, // UI sends commission_mode, DB uses commission_type
                commission_value: commission_value || 0,
                asset,
                settlement_type: settlement_type || 'external',
                public_slug,
                is_active: is_active ?? true
            })
            .select()
            .single()

        if (error) throw error

        // 4. Audit Log
        await supabase.from('transaction_audit_logs').insert({
            transaction_id: '00000000-0000-0000-0000-000000000000',
            action: 'CREATE_PAYMENT_PANEL',
            actor_role: 'admin',
            actor_id: user.id,
            metadata: { panel_id: data.id, department_id, slug: public_slug }
        })

        return new Response(
            JSON.stringify({ success: true, panel: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e) {
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
