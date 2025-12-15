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
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Clear Transaction History (Order matters due to Foreign Keys)

        // A. Delete Audit Logs
        const { error: errorLogs } = await supabase
            .from('transaction_audit_logs')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all not matching a dummy ID (effectively all)

        if (errorLogs) console.error('Error clearing logs:', errorLogs)

        // B. Delete Transactions
        const { error: errorTxs } = await supabase
            .from('transactions')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (errorTxs) throw new Error('Failed to clear transactions: ' + errorTxs.message)

        // 2. Reset User Balances to 10,000
        // We fetching all profiles first to be safe, or just update all.
        // Update without where clause is blocked by some configs, but with Service Role usually allowed.
        // Safest way: .neq('id', '0000...')

        const { error: errorProfiles } = await supabase
            .from('profiles')
            .update({ balance: 10000 })
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (errorProfiles) throw new Error('Failed to reset balances: ' + errorProfiles.message)

        return new Response(
            JSON.stringify({ success: true, message: 'System reset complete. Balances set to $10,000.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
