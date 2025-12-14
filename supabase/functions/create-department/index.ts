// Supabase Edge Function: create-department
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

        // 1. Get User & Verify Admin
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
        const { name, category, commission_mode, commission_value, is_active } = await req.json()

        if (!name) throw new Error('Name is required')

        // 3. Insert Department
        const { data, error } = await supabase
            .from('departments')
            .insert({
                name,
                category,
                commission_mode,
                commission_value: commission_value || 0,
                is_active: is_active ?? true
            })
            .select()
            .single()

        if (error) throw error

        // 4. Audit Log (Opsiyonel ama iyi olur)
        await supabase.from('transaction_audit_logs').insert({
            transaction_id: '00000000-0000-0000-0000-000000000000', // System Action
            action: 'CREATE_DEPARTMENT',
            actor_role: 'admin',
            actor_id: user.id,
            metadata: { department_id: data.id, name: data.name }
        })

        return new Response(
            JSON.stringify({ success: true, department: data }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e) {
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
