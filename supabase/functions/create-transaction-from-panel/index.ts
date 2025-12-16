// Supabase Edge Function: create-transaction-from-panel
// İç sistem transfer: Üye bakiyesi → Vault bakiyesi (otomatik tamamlama)
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

        // Service Role client for DB operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Get logged-in User
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Giriş yapmanız gerekiyor')

        // 2. Parse Body
        const { slug, amount } = await req.json()
        if (!slug || !amount || amount <= 0) throw new Error('Geçersiz tutar')

        // 3. Get User Profile (for balance check)
        const { data: userProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, balance')
            .eq('id', user.id)
            .single()

        if (profileError || !userProfile) throw new Error('Kullanıcı profili bulunamadı')

        // 4. Check sufficient balance
        if ((userProfile.balance || 0) < amount) {
            throw new Error(`Yetersiz bakiye. Mevcut: $${userProfile.balance || 0}, İstenen: $${amount}`)
        }

        // 5. Get Panel
        const { data: panel, error: panelError } = await supabaseAdmin
            .from('payment_panels')
            .select('*')
            .eq('public_slug', slug)
            .single()

        if (panelError || !panel) throw new Error('Panel bulunamadı')
        if (!panel.is_active) throw new Error('Panel aktif değil')

        // 6. Get Primary Vault for department
        const { data: vault, error: vaultError } = await supabaseAdmin
            .from('vaults')
            .select('*')
            .eq('department_id', panel.department_id)
            .eq('is_primary', true)
            .single()

        if (vaultError || !vault) throw new Error('Vault bulunamadı')

        // 7. Calculate Commission
        let commission = 0;
        if (panel.commission_type === 'percentage') {
            commission = amount * (panel.commission_value / 100);
        } else {
            commission = panel.commission_value || 0;
        }
        const netAmount = amount - commission;

        // 8. Deduct from User Balance
        const newUserBalance = (userProfile.balance || 0) - amount;
        await supabaseAdmin
            .from('profiles')
            .update({ balance: newUserBalance })
            .eq('id', user.id)

        // 9. Add to Vault Balance
        const newVaultBalance = (vault.balance || 0) + netAmount;
        await supabaseAdmin
            .from('vaults')
            .update({ balance: newVaultBalance })
            .eq('id', vault.id)

        // 10. Create Transaction (COMPLETED - auto)
        const { data: tx, error: txError } = await supabaseAdmin
            .from('transactions')
            .insert({
                user_id: user.id,
                type: 'DEPOSIT',
                amount: amount,
                status: 'COMPLETED', // Otomatik tamamlandı
                currency: panel.asset || 'USD',
                metadata: {
                    source: 'payment_panel',
                    transfer_type: 'internal',
                    panel_id: panel.id,
                    panel_name: panel.name,
                    department_id: panel.department_id,
                    vault_id: vault.id,
                    public_slug: slug,
                    commission: commission,
                    net_amount: netAmount
                }
            })
            .select()
            .single()

        if (txError) throw txError

        // 11. Create Vault Ledger Entry
        await supabaseAdmin.from('vault_ledger').insert({
            vault_id: vault.id,
            transaction_id: tx.id,
            type: 'DEPOSIT',
            amount: netAmount,
            user_id: user.id,
            network: 'INTERNAL'
        })

        // 12. Audit Log
        await supabaseAdmin.from('transaction_audit_logs').insert({
            transaction_id: tx.id,
            action: 'AUTO_COMPLETE',
            actor_role: 'system',
            actor_id: user.id,
            metadata: {
                source: 'payment_panel_internal',
                panel_id: panel.id,
                vault_id: vault.id,
                amount: amount,
                net_amount: netAmount,
                previous_user_balance: userProfile.balance,
                new_user_balance: newUserBalance
            }
        })

        return new Response(
            JSON.stringify({
                success: true,
                message: `$${amount} başarıyla transfer edildi`,
                transaction: tx,
                newBalance: newUserBalance
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e) {
        return new Response(
            JSON.stringify({ error: e.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})

