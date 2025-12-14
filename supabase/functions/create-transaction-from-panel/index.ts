// Supabase Edge Function: create-transaction-from-panel
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
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: authHeader } } }
        )

        // Service Role client for reading Panels (if policies restrict) and inserting Audit Log
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Get User
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        // 2. Parse Body
        const { slug, amount } = await req.json()
        if (!slug || !amount || amount <= 0) throw new Error('Invalid request')

        // 3. Get Panel
        // Public policy allows reading by slug, so we can use supabaseAdmin to be safe or supabase if policy works.
        // Prompt said "Public: Sadece public_slug ile read-only".
        const { data: panel, error: panelError } = await supabaseAdmin
            .from('payment_panels')
            .select('*')
            .eq('public_slug', slug)
            .single()

        if (panelError || !panel) throw new Error('Panel not found')
        if (!panel.is_active) throw new Error('Panel is inactive')

        // 4. Calculate Commission
        let commission = 0;
        if (panel.commission_type === 'percentage') {
            commission = amount * (panel.commission_value / 100);
        } else {
            commission = panel.commission_value;
        }

        const netAmount = amount - commission;
        if (netAmount < 0) throw new Error('Amount too low to cover commission')

        // 5. Create Transaction (PENDING)
        // Use insert on 'transactions'. 
        // Note: Using Service Role to insert because Prompt said "Frontend -> DB write YOK. users cannot insert."
        // RLS for transactions likely allows users to 'view' but not 'insert' in this strict mode.
        // So we use supabaseAdmin.

        const { data: tx, error: txError } = await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: user.id,
                type: 'DEPOSIT',
                amount: amount, // Gross amount stored in main column
                status: 'PENDING',
                asset_type: panel.asset || 'TRX',
                metadata: {
                    source: 'payment_panel',
                    panel_id: panel.id,
                    panel_name: panel.name,
                    department_id: panel.department_id,
                    public_slug: slug,
                    commission: commission,
                    net_amount: netAmount,
                    commission_type: panel.commission_type,
                    commission_val: panel.commission_value
                }
            })
            .select()
            .single()

        if (txError) throw txError

        // 6. Audit Log
        await supabaseAdmin.from('transaction_audit_logs').insert({
            transaction_id: tx.id,
            action: 'CREATE',
            actor_role: 'user', // Initiated by user via panel
            actor_id: user.id,
            metadata: {
                source: 'payment_panel',
                panel_id: panel.id,
                amount: amount,
                net_amount: netAmount
            }
        })

        return new Response(
            JSON.stringify({ success: true, transaction: tx }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e) {
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
