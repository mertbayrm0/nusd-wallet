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
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) throw new Error('No auth header')

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Verify User is Admin
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

        // 2. Handle Actions
        const { action, vault_id, department_id } = await req.json()

        if (!vault_id) throw new Error('Vault ID required')

        let result;

        if (action === 'assign') {
            if (!department_id) throw new Error('Department ID required for assignment')

            const { data, error } = await supabase
                .from('vaults')
                .update({ department_id, is_primary: false }) // Reset primary on new assignment just in case
                .eq('id', vault_id)
                .select()
                .single()

            if (error) throw error
            result = data
        }
        else if (action === 'unassign') {
            const { data, error } = await supabase
                .from('vaults')
                .update({ department_id: null, is_primary: false })
                .eq('id', vault_id)
                .select()
                .single()

            if (error) throw error
            result = data
        }
        else if (action === 'set_primary') {
            if (!department_id) throw new Error('Department ID required')

            // First, reset others
            await supabase
                .from('vaults')
                .update({ is_primary: false })
                .eq('department_id', department_id)

            // Then set this one
            const { data, error } = await supabase
                .from('vaults')
                .update({ is_primary: true })
                .eq('id', vault_id)
                .select()
                .single()

            if (error) throw error
            result = data
        }
        else {
            throw new Error('Invalid action')
        }

        return new Response(
            JSON.stringify({ success: true, data: result }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e) {
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
