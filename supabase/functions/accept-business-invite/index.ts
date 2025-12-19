// Edge Function: accept-business-invite
// Kullanıcı işletme davetini kabul eder

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
        if (!authHeader) {
            return new Response(
                JSON.stringify({ error: 'No authorization header' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
            { auth: { persistSession: false } }
        )

        // Get current user
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return new Response(
                JSON.stringify({ error: 'Unauthorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Parse request
        const { invite_code } = await req.json()

        if (!invite_code) {
            return new Response(
                JSON.stringify({ error: 'Invite code is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Find the invite
        const { data: invite, error: inviteError } = await supabase
            .from('business_invites')
            .select('*, business:business_id(id, business_name, email)')
            .eq('invite_code', invite_code)
            .single()

        if (inviteError || !invite) {
            return new Response(
                JSON.stringify({ error: 'Davet bulunamadı' }),
                { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check invite status
        if (invite.status !== 'pending') {
            return new Response(
                JSON.stringify({ error: `Bu davet zaten ${invite.status === 'accepted' ? 'kabul edilmiş' : 'geçersiz'}` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if expired
        if (new Date(invite.expires_at) < new Date()) {
            await supabase
                .from('business_invites')
                .update({ status: 'expired' })
                .eq('id', invite.id)

            return new Response(
                JSON.stringify({ error: 'Davet süresi dolmuş' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if user email matches invite email
        if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
            return new Response(
                JSON.stringify({ error: 'Bu davet size ait değil' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Update user profile to link to business
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                parent_business_id: invite.business_id,
                business_role: invite.role,
                account_type: 'business' // Alt hesap da business olarak işaretlenir
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Update profile error:', updateError)
            return new Response(
                JSON.stringify({ error: 'Profil güncellenemedi' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Mark invite as accepted
        await supabase
            .from('business_invites')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString(),
                accepted_by: user.id
            })
            .eq('id', invite.id)

        console.log('Invite accepted:', { user_id: user.id, business_id: invite.business_id, role: invite.role })

        return new Response(
            JSON.stringify({
                success: true,
                business_name: invite.business?.business_name || 'İşletme',
                role: invite.role,
                message: `${invite.business?.business_name || 'İşletme'} ekibine katıldınız!`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (e: any) {
        console.error('Error:', e)
        return new Response(
            JSON.stringify({ error: e.message || 'Internal error' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
