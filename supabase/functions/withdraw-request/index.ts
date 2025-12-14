// Supabase Edge Function: withdraw-request
// User requests withdrawal, validates balance, creates PENDING transaction

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Get authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create Supabase clients
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
        const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
            global: { headers: { Authorization: authHeader } }
        });

        // Get current user
        const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Parse request body
        const { amount, network, address } = await req.json();

        if (!amount || amount <= 0) {
            return new Response(
                JSON.stringify({ error: 'Invalid amount' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Get user's current balance
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, balance')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return new Response(
                JSON.stringify({ error: 'User profile not found' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Check sufficient balance
        if (profile.balance < amount) {
            return new Response(
                JSON.stringify({ error: 'Insufficient balance', balance: profile.balance }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // ATOMIC: Deduct balance and create transaction
        // First, deduct balance
        const newBalance = profile.balance - amount;
        const { error: balanceError } = await supabaseAdmin
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', user.id);

        if (balanceError) {
            console.error('Balance update error:', balanceError);
            return new Response(
                JSON.stringify({ error: 'Failed to update balance' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // Create PENDING transaction
        const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: user.id,
                type: 'WITHDRAW',
                amount: amount,
                status: 'PENDING',
                network: network || null,
                to_address: address || null
            })
            .select()
            .single();

        if (txError) {
            // Rollback: restore balance
            await supabaseAdmin
                .from('profiles')
                .update({ balance: profile.balance })
                .eq('id', user.id);

            console.error('Transaction insert error:', txError);
            return new Response(
                JSON.stringify({ error: 'Failed to create withdrawal request' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Withdrawal request created',
                transaction: transaction,
                newBalance: newBalance
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        console.error('Edge function error:', error);
        return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
