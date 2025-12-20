import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const TRONGRID_API_KEY = 'f8f57351-2bcf-428c-92d0-7d8652807847';
const TRONGRID_BASE_URL = 'https://api.trongrid.io';
const USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Son işlemleri al
async function getRecentTransactions(address: string): Promise<any[]> {
    try {
        const response = await fetch(
            `${TRONGRID_BASE_URL}/v1/accounts/${address}/transactions/trc20?limit=20&contract_address=${USDT_CONTRACT}`,
            {
                headers: { 'TRON-PRO-API-KEY': TRONGRID_API_KEY }
            }
        );
        const data = await response.json();
        return data.data || [];
    } catch (e) {
        console.error('TronGrid error:', e);
        return [];
    }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // 1. Tüm aktif vault'ları al
        const { data: vaults, error: vaultError } = await supabase
            .from('vaults')
            .select('id, address, name, balance, last_checked_tx')
            .eq('is_active', true);

        if (vaultError) throw vaultError;

        const results: any[] = [];

        // 2. Her vault için blockchain'i kontrol et
        for (const vault of vaults || []) {
            if (!vault.address || !vault.address.startsWith('T')) continue;

            const txs = await getRecentTransactions(vault.address);

            // Sadece gelen (deposit) işlemleri filtrele
            const deposits = txs.filter((tx: any) =>
                tx.to?.toLowerCase() === vault.address.toLowerCase()
            );

            for (const tx of deposits) {
                const txHash = tx.transaction_id;
                const amount = parseFloat(tx.value) / 1e6;

                // Bu TX zaten işlenmiş mi kontrol et
                const { data: existing } = await supabase
                    .from('transactions')
                    .select('id')
                    .eq('tx_hash', txHash)
                    .single();

                if (existing) continue; // Zaten var, atla

                // Yeni deposit! Kaydet
                const { error: insertError } = await supabase
                    .from('transactions')
                    .insert({
                        type: 'DEPOSIT',
                        status: 'PENDING',
                        amount: amount,
                        asset_type: 'USDT',
                        tx_hash: txHash,
                        metadata: {
                            source: 'auto_detect',
                            vault_id: vault.id,
                            vault_name: vault.name,
                            from_address: tx.from,
                            block_timestamp: tx.block_timestamp
                        }
                    });

                if (!insertError) {
                    results.push({
                        vault: vault.name,
                        amount,
                        txHash: txHash.slice(0, 16) + '...',
                        status: 'new_deposit_detected'
                    });
                }
            }

            // Son kontrol zamanını güncelle
            await supabase
                .from('vaults')
                .update({ last_checked_tx: new Date().toISOString() })
                .eq('id', vault.id);
        }

        return new Response(
            JSON.stringify({
                success: true,
                checked: vaults?.length || 0,
                newDeposits: results.length,
                deposits: results
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (e) {
        console.error('Check deposits error:', e);
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
