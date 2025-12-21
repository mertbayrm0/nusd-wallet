import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Bot configurations
const BOTS = {
    kyc: {
        token: Deno.env.get('TELEGRAM_KYC_BOT_TOKEN') || '7950409595:AAHXZX4CXPNKQaQnQd0IycC39SiRBuOBYFw',
        chatId: Deno.env.get('TELEGRAM_KYC_CHAT_ID') || '-5027449068',
    },
    deposit: {
        token: Deno.env.get('TELEGRAM_DEKONT_BOT_TOKEN') || '8408954209:AAGJjLtAaSEPBDaDMG-hxQt4zJNNawoZrUQ',
        chatId: Deno.env.get('TELEGRAM_DEKONT_CHAT_ID') || '-4990769879',
    }
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const {
            submission_id,
            submission_type, // 'kyc' or 'deposit'
            user_email,
            user_name,
            document_url,
            document_url_2,
            amount
        } = await req.json()

        // Select bot based on type
        const bot = submission_type === 'kyc' ? BOTS.kyc : BOTS.deposit

        // Build message text
        let messageText = ''
        if (submission_type === 'kyc') {
            messageText = `🆔 *YENİ KYC BAŞVURUSU*\n\n` +
                `👤 *Kullanıcı:* ${user_name || 'Bilinmiyor'}\n` +
                `📧 *Email:* ${user_email}\n` +
                `🆔 *ID:* \`${submission_id}\`\n` +
                `📅 *Tarih:* ${new Date().toLocaleString('tr-TR')}\n\n` +
                `_Belgeleri inceleyip onaylayın veya reddedin._`
        } else {
            messageText = `💰 *YENİ DEKONT*\n\n` +
                `👤 *Kullanıcı:* ${user_name || 'Bilinmiyor'}\n` +
                `📧 *Email:* ${user_email}\n` +
                `💵 *Tutar:* $${amount?.toLocaleString() || '0'}\n` +
                `🆔 *ID:* \`${submission_id}\`\n` +
                `📅 *Tarih:* ${new Date().toLocaleString('tr-TR')}\n\n` +
                `_Dekontu inceleyip onaylayın veya reddedin._`
        }

        // Inline keyboard with approve/reject buttons
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Onayla', callback_data: `approve_${submission_id}` },
                    { text: '❌ Reddet', callback_data: `reject_${submission_id}` }
                ]
            ]
        }

        // Send first document
        let messageId = null

        // If we have document URLs, send them as photos
        if (document_url) {
            // Get signed URL for the document
            const { data: signedData1 } = await supabase.storage
                .from('verification-docs')
                .createSignedUrl(document_url, 3600) // 1 hour expiry

            const docUrl1 = signedData1?.signedUrl || document_url

            // Send photo with caption
            const photoResponse = await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: bot.chatId,
                    photo: docUrl1,
                    caption: messageText,
                    parse_mode: 'Markdown',
                    reply_markup: document_url_2 ? undefined : inlineKeyboard // Add buttons if single doc
                })
            })

            const photoResult = await photoResponse.json()
            console.log('Photo 1 response:', photoResult)

            if (photoResult.ok) {
                messageId = photoResult.result.message_id
            }

            // Send second document if exists
            if (document_url_2) {
                const { data: signedData2 } = await supabase.storage
                    .from('verification-docs')
                    .createSignedUrl(document_url_2, 3600)

                const docUrl2 = signedData2?.signedUrl || document_url_2

                const photo2Response = await fetch(`https://api.telegram.org/bot${bot.token}/sendPhoto`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: bot.chatId,
                        photo: docUrl2,
                        caption: '📎 İkinci Belge',
                        reply_markup: inlineKeyboard // Add buttons on second image
                    })
                })

                const photo2Result = await photo2Response.json()
                console.log('Photo 2 response:', photo2Result)

                if (photo2Result.ok) {
                    messageId = photo2Result.result.message_id
                }
            }
        } else {
            // No document, just send text message
            const textResponse = await fetch(`https://api.telegram.org/bot${bot.token}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: bot.chatId,
                    text: messageText,
                    parse_mode: 'Markdown',
                    reply_markup: inlineKeyboard
                })
            })

            const textResult = await textResponse.json()
            console.log('Text response:', textResult)

            if (textResult.ok) {
                messageId = textResult.result.message_id
            }
        }

        // Update submission with telegram message ID
        if (messageId) {
            await supabase
                .from('verification_submissions')
                .update({
                    telegram_message_id: messageId,
                    telegram_chat_id: parseInt(bot.chatId)
                })
                .eq('id', submission_id)
        }

        return new Response(
            JSON.stringify({
                success: true,
                message_id: messageId,
                chat_id: bot.chatId
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
