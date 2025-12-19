// Edge Function: invite-business-member
// İşletme sahibi alt hesap davet eder

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
        const { email, role = 'staff' } = await req.json()

        if (!email) {
            return new Response(
                JSON.stringify({ error: 'Email is required' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if user is a business owner
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, account_type, business_role, business_name')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return new Response(
                JSON.stringify({ error: 'Profile not found' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        if (profile.account_type !== 'business' || profile.business_role !== 'owner') {
            return new Response(
                JSON.stringify({ error: 'Only business owners can invite members' }),
                { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if email is already invited (pending)
        const { data: existingInvite } = await supabase
            .from('business_invites')
            .select('id')
            .eq('business_id', user.id)
            .eq('email', email.toLowerCase())
            .eq('status', 'pending')
            .single()

        if (existingInvite) {
            return new Response(
                JSON.stringify({ error: 'Bu email zaten davet edilmiş' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Check if user is already a member
        const { data: existingMember } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email.toLowerCase())
            .eq('parent_business_id', user.id)
            .single()

        if (existingMember) {
            return new Response(
                JSON.stringify({ error: 'Bu kullanıcı zaten ekip üyesi' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Create invite
        const { data: invite, error: inviteError } = await supabase
            .from('business_invites')
            .insert({
                business_id: user.id,
                email: email.toLowerCase(),
                role: role
            })
            .select()
            .single()

        if (inviteError) {
            console.error('Invite error:', inviteError)
            return new Response(
                JSON.stringify({ error: 'Davet oluşturulamadı' }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        console.log('Invite created:', invite)

        return new Response(
            JSON.stringify({
                success: true,
                invite: {
                    id: invite.id,
                    email: invite.email,
                    role: invite.role,
                    invite_code: invite.invite_code,
                    expires_at: invite.expires_at
                },
                invite_link: `${req.headers.get('origin') || 'https://nusd-wallet.vercel.app'}/#/join/${invite.invite_code}`
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
