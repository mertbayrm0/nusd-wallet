// =============================================
// Notification Types & Templates
// =============================================

export type NotificationType =
    // P2P İşlemler
    | 'p2p_matched'
    | 'p2p_payment_sent'
    | 'p2p_completed'
    | 'p2p_cancelled'
    | 'p2p_expired'
    // Bakiye İşlemleri
    | 'balance_received'
    | 'balance_sent'
    | 'deposit_approved'
    | 'withdraw_approved'
    // Sistem
    | 'system_alert'
    | 'security_alert';

export interface NotificationTemplate {
    title: string;
    message: string;
    icon: string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
    // P2P İşlemler
    p2p_matched: {
        title: '🎉 Eşleşme Bulundu',
        message: '{amount} USDT tutarında işleminiz eşleşti.',
        icon: 'handshake'
    },
    p2p_payment_sent: {
        title: '💸 Ödeme Gönderildi',
        message: 'Alıcı ödemeyi gönderdi. Lütfen kontrol edin.',
        icon: 'payments'
    },
    p2p_completed: {
        title: '✅ İşlem Tamamlandı',
        message: '{amount} USDT tutarında işleminiz başarıyla tamamlandı.',
        icon: 'check_circle'
    },
    p2p_cancelled: {
        title: '❌ İşlem İptal Edildi',
        message: '{amount} USDT tutarında işleminiz iptal edildi.',
        icon: 'cancel'
    },
    p2p_expired: {
        title: '⏰ Süre Doldu',
        message: 'İşleminiz süre aşımı nedeniyle iptal edildi.',
        icon: 'timer_off'
    },

    // Bakiye İşlemleri
    balance_received: {
        title: '💰 Para Geldi',
        message: '{amount} USDT hesabınıza aktarıldı.',
        icon: 'add_circle'
    },
    balance_sent: {
        title: '📤 Para Gönderildi',
        message: '{amount} USDT gönderildi.',
        icon: 'send'
    },
    deposit_approved: {
        title: '✅ Yatırım Onaylandı',
        message: '{amount} USDT yatırımınız onaylandı.',
        icon: 'verified'
    },
    withdraw_approved: {
        title: '✅ Çekim Onaylandı',
        message: '{amount} TRY çekim talebiniz onaylandı.',
        icon: 'verified'
    },

    // Sistem
    system_alert: {
        title: '⚠️ Sistem Bildirimi',
        message: '{message}',
        icon: 'info'
    },
    security_alert: {
        title: '🔐 Güvenlik Uyarısı',
        message: 'Hesabınıza yeni bir cihazdan giriş yapıldı.',
        icon: 'security'
    }
};

// Mesaj template'ını doldur
export function formatNotificationMessage(
    type: NotificationType,
    data: Record<string, any> = {}
): { title: string; message: string } {
    const template = NOTIFICATION_TEMPLATES[type];
    let message = template.message;

    // {variable} formatındaki placeholder'ları değiştir
    Object.keys(data).forEach(key => {
        message = message.replace(`{${key}}`, String(data[key]));
    });

    return {
        title: template.title,
        message
    };
}
