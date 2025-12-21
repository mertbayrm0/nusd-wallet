import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Bot tokens for verification
const KYC_BOT_TOKEN = Deno.env.get('TELEGRAM_KYC_BOT_TOKEN') || '7950409595:AAHXZX4CXPNKQaQnQd0IycC39SiRBuOBYFw'
const DEKONT_BOT_TOKEN = Deno.env.get('TELEGRAM_DEKONT_BOT_TOKEN') || '8408954209:AAGJjLtAaSEPBDaDMG-hxQt4zJNNawoZrUQ'

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const update = await req.json()
        console.log('Telegram webhook received:', JSON.stringify(update))

        // Handle callback queries (button clicks)
        if (update.callback_query) {
            const callbackQuery = update.callback_query
            const callbackData = callbackQuery.data
            const chatId = callbackQuery.message?.chat?.id
            const messageId = callbackQuery.message?.message_id
            const adminUser = callbackQuery.from?.username || callbackQuery.from?.first_name || 'Admin'

            // Parse callback data: approve_<submission_id> or reject_<submission_id>
            const [action, submissionId] = callbackData.split('_')

            if (!submissionId) {
                console.error('Invalid callback data:', callbackData)
                return new Response('OK')
            }

            // Get submission details
            const { data: submission, error: fetchError } = await supabase
                .from('verification_submissions')
                .select('*')
                .eq('id', submissionId)
                .single()

            if (fetchError || !submission) {
                console.error('Submission not found:', submissionId)
                await answerCallbackQuery(callbackQuery.id, '❌ Başvuru bulunamadı!', KYC_BOT_TOKEN)
                return new Response('OK')
            }

            // Check if already processed
            if (submission.status !== 'pending') {
                await answerCallbackQuery(callbackQuery.id, `⚠️ Bu başvuru zaten işlenmiş: ${submission.status}`, KYC_BOT_TOKEN)
                return new Response('OK')
            }

            // Determine which bot to use
            const botToken = submission.submission_type === 'kyc' ? KYC_BOT_TOKEN : DEKONT_BOT_TOKEN

            if (action === 'approve') {
                // Approve the submission
                const { error: updateError } = await supabase
                    .from('verification_submissions')
                    .update({
                        status: 'approved',
                        reviewed_by: adminUser,
                        reviewed_at: new Date().toISOString()
                    })
                    .eq('id', submissionId)

                if (updateError) {
                    console.error('Update error:', updateError)
                    await answerCallbackQuery(callbackQuery.id, '❌ Hata oluştu!', botToken)
                    return new Response('OK')
                }

                // Update message to show approved
                await editMessage(
                    chatId,
                    messageId,
                    `✅ *ONAYLANDI*\n\n` +
                    `👤 ${submission.user_name || submission.user_email}\n` +
                    `${submission.submission_type === 'deposit' ? `💵 Tutar: $${submission.amount}` : '🆔 KYC Onaylandı'}\n\n` +
                    `✅ Onaylayan: @${adminUser}\n` +
                    `📅 ${new Date().toLocaleString('tr-TR')}`,
                    botToken
                )

                await answerCallbackQuery(callbackQuery.id, '✅ Başarıyla onaylandı!', botToken)

                // Create notification for user
                await supabase.from('notifications').insert({
                    user_id: submission.user_id,
                    type: submission.submission_type === 'kyc' ? 'kyc_approved' : 'deposit_approved',
                    title: submission.submission_type === 'kyc' ? 'KYC Onaylandı!' : 'Para Yatırma Onaylandı!',
                    message: submission.submission_type === 'kyc'
                        ? 'Kimlik doğrulamanız başarıyla onaylandı.'
                        : `$${submission.amount} tutarındaki para yatırma işleminiz onaylandı.`,
                    data: { submission_id: submissionId }
                })

            } else if (action === 'reject') {
                // Reject the submission
                const { error: updateError } = await supabase
                    .from('verification_submissions')
                    .update({
                        status: 'rejected',
                        reviewed_by: adminUser,
                        reviewed_at: new Date().toISOString(),
                        rejection_reason: 'Admin tarafından reddedildi'
                    })
                    .eq('id', submissionId)

                if (updateError) {
                    console.error('Update error:', updateError)
                    await answerCallbackQuery(callbackQuery.id, '❌ Hata oluştu!', botToken)
                    return new Response('OK')
                }

                // Update message to show rejected
                await editMessage(
                    chatId,
                    messageId,
                    `❌ *REDDEDİLDİ*\n\n` +
                    `👤 ${submission.user_name || submission.user_email}\n` +
                    `${submission.submission_type === 'deposit' ? `💵 Tutar: $${submission.amount}` : '🆔 KYC Reddedildi'}\n\n` +
                    `❌ Reddeden: @${adminUser}\n` +
                    `📅 ${new Date().toLocaleString('tr-TR')}`,
                    botToken
                )

                await answerCallbackQuery(callbackQuery.id, '❌ Başvuru reddedildi!', botToken)

                // Create notification for user
                await supabase.from('notifications').insert({
                    user_id: submission.user_id,
                    type: submission.submission_type === 'kyc' ? 'kyc_rejected' : 'deposit_rejected',
                    title: submission.submission_type === 'kyc' ? 'KYC Reddedildi' : 'Para Yatırma Reddedildi',
                    message: submission.submission_type === 'kyc'
                        ? 'Kimlik doğrulamanız reddedildi. Lütfen geçerli belgeler ile tekrar deneyin.'
                        : `$${submission.amount} tutarındaki para yatırma işleminiz reddedildi.`,
                    data: { submission_id: submissionId }
                })
            }
        }

        return new Response('OK')

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response('OK') // Always return OK to Telegram
    }
})

// Helper: Answer callback query (removes loading state from button)
async function answerCallbackQuery(callbackQueryId: string, text: string, botToken: string) {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text,
            show_alert: true
        })
    })
}

// Helper: Edit message text and remove buttons
async function editMessage(chatId: number, messageId: number, text: string, botToken: string) {
    await fetch(`https://api.telegram.org/bot${botToken}/editMessageCaption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            caption: text,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [] } // Remove buttons
        })
    })
}
