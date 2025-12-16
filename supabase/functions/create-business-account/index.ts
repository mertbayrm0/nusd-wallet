// Supabase Edge Function: create-business-account
// Yeni işletme hesabı oluştur - otomatik department + payment_panel + NUSD adresi
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

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        // 1. Get logged-in User
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) throw new Error('Giriş yapmanız gerekiyor')

        // 2. Parse Body
        const { businessName } = await req.json()
        if (!businessName || businessName.trim().length < 2) {
            throw new Error('Firma adı en az 2 karakter olmalı')
        }

        // 3. Check if user already has a business
        const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('account_type, business_department_id')
            .eq('id', user.id)
            .single()

        if (existingProfile?.account_type === 'business') {
            throw new Error('Zaten bir işletme hesabınız var')
        }

        // 4. Generate unique NUSD address
        const nusdAddress = 'NUSD-' + Math.random().toString(36).substring(2, 8).toUpperCase()

        // 5. Generate slug from business name
        const slug = businessName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 30) + '-' + Math.random().toString(36).substring(2, 6)

        // 6. Create Department
        const { data: dept, error: deptError } = await supabaseAdmin
            .from('departments')
            .insert({
                name: businessName,
                nusd_address: nusdAddress,
                balance: 0,
                owner_id: user.id,
                color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')
            })
            .select()
            .single()

        if (deptError) throw new Error('Departman oluşturulamadı: ' + deptError.message)

        // 7. Create Payment Panel
        const { data: panel, error: panelError } = await supabaseAdmin
            .from('payment_panels')
            .insert({
                name: businessName + ' Portal',
                department_id: dept.id,
                public_slug: slug,
                is_active: true,
                asset: 'USD',
                commission_type: 'percentage',
                commission_value: 0
            })
            .select()
            .single()

        if (panelError) {
            // Rollback department
            await supabaseAdmin.from('departments').delete().eq('id', dept.id)
            throw new Error('Panel oluşturulamadı: ' + panelError.message)
        }

        // 8. Update Profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
                account_type: 'business',
                business_name: businessName,
                business_department_id: dept.id
            })
            .eq('id', user.id)

        if (profileError) {
            // Rollback
            await supabaseAdmin.from('payment_panels').delete().eq('id', panel.id)
            await supabaseAdmin.from('departments').delete().eq('id', dept.id)
            throw new Error('Profil güncellenemedi: ' + profileError.message)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: 'İşletme hesabı oluşturuldu!',
                business: {
                    name: businessName,
                    nusd_address: nusdAddress,
                    department_id: dept.id,
                    panel_slug: slug
                }
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
