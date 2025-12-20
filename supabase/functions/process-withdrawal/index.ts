import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// TronWeb için hex encoding utility
const toHex = (str: string) => Array.from(str).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');

const TRONGRID_API_KEY = 'f8f57351-2bcf-428c-92d0-7d8652807847';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// TRC20 Transfer endpoint (TronGrid API)
async function sendUSDT(fromPrivateKey: string, toAddress: string, amount: number): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
        // TronWeb import for Deno
        const TronWeb = (await import('https://esm.sh/tronweb@5.3.1')).default;

        const tronWeb = new TronWeb({
            fullHost: 'https://api.trongrid.io',
            headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY },
            privateKey: fromPrivateKey
        });

        // USDT amount in sun (6 decimals)
        const amountSun = Math.floor(amount * 1e6);

        // Get contract
        const contract = await tronWeb.contract().at(USDT_CONTRACT);

        // Send transfer
        const result = await contract.methods.transfer(toAddress, amountSun).send({
            feeLimit: 100000000, // 100 TRX max fee
            callValue: 0
        });

        return {
            success: true,
            txHash: result
        };
    } catch (e: any) {
        console.error('TronWeb sendUSDT error:', e);
        return {
            success: false,
            error: e.message || 'Transfer failed'
        };
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) throw new Error('No auth header');

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 1. Verify User is Admin
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) throw new Error('Unauthorized');

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profile?.role !== 'admin') {
            return new Response(
                JSON.stringify({ error: 'Admin only' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        // 2. Get request body
        const { withdrawal_id, vault_id } = await req.json();
        if (!withdrawal_id) throw new Error('Withdrawal ID required');

        // 3. Get withdrawal request details
        const { data: withdrawal, error: wError } = await supabase
            .from('transactions')
            .select('*, profile:owner_id(email, trx_address)')
            .eq('id', withdrawal_id)
            .eq('status', 'PENDING')
            .eq('type', 'WITHDRAW')
            .single();

        if (wError || !withdrawal) throw new Error('Withdrawal not found or not pending');

        // 4. Get vault with private key
        const { data: vault, error: vError } = await supabase
            .from('vaults')
            .select('id, name, address, private_key, balance')
            .eq('id', vault_id)
            .single();

        if (vError || !vault) throw new Error('Vault not found');
        if (!vault.private_key) throw new Error('Vault has no private key configured');

        const toAddress = withdrawal.profile?.trx_address || withdrawal.metadata?.withdrawal_address;
        if (!toAddress) throw new Error('No destination address');

        // 5. Check vault balance
        if ((vault.balance || 0) < withdrawal.amount) {
            throw new Error(`Insufficient vault balance. Need: $${withdrawal.amount}, Have: $${vault.balance}`);
        }

        // 6. Send the actual USDT transfer
        const txResult = await sendUSDT(vault.private_key, toAddress, withdrawal.amount);

        if (!txResult.success) {
            throw new Error(txResult.error || 'Transfer failed');
        }

        // 7. Update withdrawal status
        await supabase
            .from('transactions')
            .update({
                status: 'COMPLETED',
                tx_hash: txResult.txHash,
                metadata: {
                    ...withdrawal.metadata,
                    processed_at: new Date().toISOString(),
                    processed_by: user.id,
                    vault_used: vault.name
                }
            })
            .eq('id', withdrawal_id);

        // 8. Update vault balance
        await supabase
            .from('vaults')
            .update({ balance: (vault.balance || 0) - withdrawal.amount })
            .eq('id', vault.id);

        return new Response(
            JSON.stringify({
                success: true,
                txHash: txResult.txHash,
                amount: withdrawal.amount,
                to: toAddress
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (e: any) {
        console.error('Process withdrawal error:', e);
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
