// Supabase Edge Function - Send Email with Resend
// Deploy: supabase functions deploy send-email

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_SzLkYv4E_GcC266S4HJ4jXmjPxPA6wg1M';
const FROM_EMAIL = 'Nubit Wallet <noreply@nubit.tech>';

interface EmailRequest {
    to: string;
    template: 'deposit_success' | 'withdrawal_success' | 'kyc_approved' | 'kyc_rejected' | 'security_alert' | 'welcome' | 'p2p_completed';
    data?: Record<string, any>;
}

const templates: Record<string, (data: any) => { subject: string; html: string }> = {
    // Deposit Success
    deposit_success: (data) => ({
        subject: '✅ Para Yatırma İşlemi Onaylandı',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 32px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 32px; }
          .amount { font-size: 36px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }
          .detail { background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 16px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .label { color: #6b7280; }
          .value { font-weight: 600; color: #111; }
          .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
          .btn { display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Para Yatırma Onaylandı</h1>
          </div>
          <div class="content">
            <p>Merhaba <strong>${data.userName || 'Değerli Müşterimiz'}</strong>,</p>
            <p>Para yatırma işleminiz başarıyla onaylandı ve bakiyenize eklendi.</p>
            
            <div class="amount">$${data.amount?.toLocaleString() || '0.00'}</div>
            
            <div class="detail">
              <div class="detail-row">
                <span class="label">İşlem No:</span>
                <span class="value">#${data.transactionId?.slice(0, 8) || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Tarih:</span>
                <span class="value">${new Date().toLocaleString('tr-TR')}</span>
              </div>
              <div class="detail-row">
                <span class="label">Yeni Bakiye:</span>
                <span class="value">$${data.newBalance?.toLocaleString() || 'N/A'}</span>
              </div>
            </div>

            <center>
              <a href="https://nubit.tech/dashboard" class="btn">Hesabımı Görüntüle</a>
            </center>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Nubit Wallet. Tüm hakları saklıdır.
          </div>
        </div>
      </body>
      </html>
    `
    }),

    // Withdrawal Success
    withdrawal_success: (data) => ({
        subject: '✅ Para Çekme İşlemi Tamamlandı',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 32px; text-align: center; }
          .content { padding: 32px; }
          .amount { font-size: 36px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }
          .detail { background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 16px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .label { color: #6b7280; }
          .value { font-weight: 600; color: #111; }
          .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💸 Para Çekme Tamamlandı</h1>
          </div>
          <div class="content">
            <p>Merhaba <strong>${data.userName || 'Değerli Müşterimiz'}</strong>,</p>
            <p>Para çekme talebiniz başarıyla işlendi ve banka hesabınıza transfer edildi.</p>
            
            <div class="amount">$${data.amount?.toLocaleString() || '0.00'}</div>
            
            <div class="detail">
              <div class="detail-row">
                <span class="label">Banka:</span>
                <span class="value">${data.bankName || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">IBAN:</span>
                <span class="value">***${data.iban?.slice(-4) || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="label">Tarih:</span>
                <span class="value">${new Date().toLocaleString('tr-TR')}</span>
              </div>
            </div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Nubit Wallet. Tüm hakları saklıdır.
          </div>
        </div>
      </body>
      </html>
    `
    }),

    // KYC Approved
    kyc_approved: (data) => ({
        subject: '🎉 Kimlik Doğrulamanız Onaylandı!',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 32px; text-align: center; }
          .content { padding: 32px; }
          .benefit { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .benefit:last-child { border: none; }
          .check { width: 24px; height: 24px; background: #10b981; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 14px; }
          .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
          .btn { display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Tebrikler!</h1>
            <p style="margin: 8px 0 0;">Kimlik doğrulamanız onaylandı</p>
          </div>
          <div class="content">
            <p>Merhaba <strong>${data.userName || 'Değerli Müşterimiz'}</strong>,</p>
            <p>Hesabınız artık tamamen doğrulanmış! Şu avantajlara sahipsiniz:</p>
            
            <div class="benefit">
              <span class="check">✓</span>
              <span>Günlük limit: <strong>$10,000</strong></span>
            </div>
            <div class="benefit">
              <span class="check">✓</span>
              <span>Aylık limit: <strong>$100,000</strong></span>
            </div>
            <div class="benefit">
              <span class="check">✓</span>
              <span>Öncelikli destek</span>
            </div>

            <center style="margin-top: 24px;">
              <a href="https://nubit.tech/dashboard" class="btn">Şimdi Kullanmaya Başla</a>
            </center>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Nubit Wallet
          </div>
        </div>
      </body>
      </html>
    `
    }),

    // KYC Rejected
    kyc_rejected: (data) => ({
        subject: '⚠️ Kimlik Doğrulaması Reddedildi',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 32px; text-align: center; }
          .content { padding: 32px; }
          .reason { background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 12px; margin: 16px 0; color: #991b1b; }
          .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
          .btn { display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Doğrulama Başarısız</h1>
          </div>
          <div class="content">
            <p>Merhaba <strong>${data.userName || 'Değerli Müşterimiz'}</strong>,</p>
            <p>Üzgünüz, kimlik doğrulama başvurunuz onaylanamadı.</p>
            
            <div class="reason">
              <strong>Sebep:</strong> ${data.reason || 'Belgeler okunamıyor veya geçersiz.'}
            </div>

            <p>Lütfen aşağıdakileri kontrol ederek tekrar başvurun:</p>
            <ul>
              <li>Belgenin tamamı görünür olmalı</li>
              <li>Fotoğraf net ve okunaklı olmalı</li>
              <li>Belge süresi dolmamış olmalı</li>
            </ul>

            <center style="margin-top: 24px;">
              <a href="https://nubit.tech/kyc" class="btn">Tekrar Başvur</a>
            </center>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Nubit Wallet
          </div>
        </div>
      </body>
      </html>
    `
    }),

    // Security Alert
    security_alert: (data) => ({
        subject: '🔐 Güvenlik Uyarısı - Yeni Giriş Algılandı',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #f59e0b, #eab308); color: white; padding: 32px; text-align: center; }
          .content { padding: 32px; }
          .detail { background: #fefce8; border: 1px solid #fef08a; padding: 16px; border-radius: 12px; margin: 16px 0; }
          .detail-row { margin: 8px 0; }
          .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
          .btn-danger { display: inline-block; background: #ef4444; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Yeni Giriş Algılandı</h1>
          </div>
          <div class="content">
            <p>Merhaba,</p>
            <p>Hesabınıza yeni bir cihazdan giriş yapıldı:</p>
            
            <div class="detail">
              <div class="detail-row"><strong>Tarih:</strong> ${new Date().toLocaleString('tr-TR')}</div>
              <div class="detail-row"><strong>Cihaz:</strong> ${data.device || 'Bilinmiyor'}</div>
              <div class="detail-row"><strong>Konum:</strong> ${data.location || 'Bilinmiyor'}</div>
              <div class="detail-row"><strong>IP:</strong> ${data.ip || 'Bilinmiyor'}</div>
            </div>

            <p>Bu siz değilseniz, hemen şifrenizi değiştirin:</p>

            <center>
              <a href="https://nubit.tech/change-password" class="btn-danger">Şifremi Değiştir</a>
            </center>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Nubit Wallet
          </div>
        </div>
      </body>
      </html>
    `
    }),

    // Welcome Email
    welcome: (data) => ({
        subject: '🎉 Nubit Wallet\'a Hoş Geldiniz!',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 40px 32px; text-align: center; }
          .header h1 { margin: 0 0 8px; font-size: 28px; }
          .content { padding: 32px; }
          .step { display: flex; gap: 16px; padding: 16px 0; border-bottom: 1px solid #e5e7eb; }
          .step:last-child { border: none; }
          .step-num { width: 32px; height: 32px; background: #10b981; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; }
          .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
          .btn { display: inline-block; background: #10b981; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Hoş Geldiniz! 🎉</h1>
            <p style="margin: 0; opacity: 0.9;">Nubit Wallet ailesine katıldınız</p>
          </div>
          <div class="content">
            <p>Merhaba <strong>${data.userName || 'Değerli Müşterimiz'}</strong>,</p>
            <p>Hesabınız başarıyla oluşturuldu. Hemen kullanmaya başlamak için:</p>
            
            <div class="step">
              <span class="step-num">1</span>
              <div>
                <strong>Profil Tamamla</strong>
                <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Ad, soyad ve doğum tarihinizi girin</p>
              </div>
            </div>
            
            <div class="step">
              <span class="step-num">2</span>
              <div>
                <strong>KYC Doğrulama</strong>
                <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Yüksek limitler için kimlik doğrulayın</p>
              </div>
            </div>
            
            <div class="step">
              <span class="step-num">3</span>
              <div>
                <strong>Para Yatırın</strong>
                <p style="margin: 4px 0 0; color: #6b7280; font-size: 14px;">Banka transferi veya kripto ile yatırın</p>
              </div>
            </div>

            <center style="margin-top: 24px;">
              <a href="https://nubit.tech/dashboard" class="btn">Hemen Başla</a>
            </center>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Nubit Wallet. Tüm hakları saklıdır.
          </div>
        </div>
      </body>
      </html>
    `
    }),

    // P2P Completed
    p2p_completed: (data) => ({
        subject: '✅ P2P İşleminiz Tamamlandı',
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
          .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 32px; text-align: center; }
          .content { padding: 32px; }
          .amount { font-size: 36px; font-weight: bold; color: #059669; text-align: center; margin: 20px 0; }
          .detail { background: #f4f4f5; padding: 16px; border-radius: 12px; margin: 16px 0; }
          .footer { text-align: center; padding: 24px; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>P2P İşlem Tamamlandı</h1>
          </div>
          <div class="content">
            <p>Merhaba <strong>${data.userName}</strong>,</p>
            <p>P2P işleminiz başarıyla tamamlandı ve bakiyeniz güncellendi.</p>
            
            <div class="amount">$${data.amount?.toLocaleString() || '0'}</div>
            
            <div class="detail">
              <p style="margin: 0;"><strong>İşlem Türü:</strong> ${data.type === 'buy' ? 'Alış' : 'Satış'}</p>
            </div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} Nubit Wallet
          </div>
        </div>
      </body>
      </html>
    `
    })
};

serve(async (req) => {
    // CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    }

    try {
        const { to, template, data }: EmailRequest = await req.json();

        if (!to || !template) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: to, template' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const templateFn = templates[template];
        if (!templateFn) {
            return new Response(
                JSON.stringify({ error: `Unknown template: ${template}` }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            );
        }

        const { subject, html } = templateFn(data || {});

        // Send via Resend
        const resendResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                from: FROM_EMAIL,
                to: [to],
                subject,
                html
            })
        });

        const resendResult = await resendResponse.json();

        if (!resendResponse.ok) {
            console.error('Resend error:', resendResult);
            return new Response(
                JSON.stringify({ error: 'Email send failed', details: resendResult }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
        }

        console.log('Email sent:', { to, template, resendId: resendResult.id });

        return new Response(
            JSON.stringify({ success: true, id: resendResult.id }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            }
        );

    } catch (error) {
        console.error('Send email error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
    }
});
