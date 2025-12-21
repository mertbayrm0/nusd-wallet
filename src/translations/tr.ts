// Türkçe çevirileri
export const tr = {
    common: {
        loading: 'Yükleniyor...',
        save: 'Kaydet',
        cancel: 'İptal',
        confirm: 'Onayla',
        delete: 'Sil',
        edit: 'Düzenle',
        back: 'Geri',
        next: 'İleri',
        close: 'Kapat',
        yes: 'Evet',
        no: 'Hayır',
        ok: 'Tamam',
        error: 'Hata',
        success: 'Başarılı',
        warning: 'Uyarı',
        info: 'Bilgi',
        search: 'Ara',
        filter: 'Filtrele',
        export: 'Dışa Aktar',
        refresh: 'Yenile',
        viewAll: 'Tümünü Gör',
        noData: 'Veri bulunamadı',
        amount: 'Tutar',
        status: 'Durum',
        date: 'Tarih',
        all: 'Tümü',
        active: 'Aktif',
        inactive: 'Pasif',
        pending: 'Beklemede',
        completed: 'Tamamlandı',
        cancelled: 'İptal Edildi'
    },

    auth: {
        login: 'Giriş Yap',
        logout: 'Çıkış Yap',
        register: 'Kayıt Ol',
        email: 'E-posta',
        password: 'Şifre',
        confirmPassword: 'Şifre Tekrar',
        forgotPassword: 'Şifremi Unuttum',
        welcomeBack: 'Tekrar Hoş Geldiniz',
        createAccount: 'Hesap Oluştur',
        emailPlaceholder: 'ornek@email.com',
        passwordPlaceholder: 'Şifrenizi girin',
        noAccount: 'Hesabınız yok mu?',
        haveAccount: 'Zaten hesabınız var mı?',
        signUp: 'Kayıt Ol',
        signIn: 'Giriş Yap'
    },

    dashboard: {
        title: 'Ana Sayfa',
        balance: 'Bakiyeniz',
        deposit: 'Para Yatır',
        withdraw: 'Para Çek',
        cryptoDeposit: 'Kripto Yatır',
        cryptoWithdraw: 'Kripto Çek',
        findAgent: 'Acente Bul',
        findAgentDesc: 'En yakın değişim noktalarını bulun',
        recentActivity: 'Son İşlemler',
        noTransactions: 'Henüz işlem yok',
        businessPanel: 'İşletme Paneli',
        adminPanel: 'Admin Paneli',
        pendingApprovals: 'Bekleyen Onaylar',
        paymentConfirm: 'Ödeme Onayı',
        paymentConfirmMsg: 'Hesabınıza para aktarılmıştır, ödemeyi onaylıyor musunuz?',
        approve: 'Onaylıyorum',
        reject: 'Reddet'
    },

    deposit: {
        title: 'Para Yatır',
        receiptOptional: 'Dekont Yükleme İsteğe Bağlı',
        receiptInfo: 'Dekont yüklerseniz işlem 20 dakika içinde otomatik onaylanır.',
        bankAccount: 'Banka Hesabınız',
        addNew: 'Yeni Ekle',
        addBankAccount: 'Banka Hesabı Ekle',
        addBankAccountDesc: 'Para yatırmak için bir banka hesabı eklemelisiniz',
        depositAmount: 'Yatırılacak Tutar (USDT)',
        minimum: 'Minimum: 10 USDT',
        youWillPay: 'Ödeyeceğiniz',
        findMatch: 'Eşleşme Bul',
        searchingMatch: 'En Uygun Eşleşme Aranıyor...',
        searchingMatchDesc: 'Size uygun satıcıyı arıyoruz',
        matchFound: 'Uygun Eşleşme Bulundu!',
        matchFoundDesc: 'Yatırım tutarınız için uygun bir satıcı bulundu.',
        confirmAndView: 'İşlemi Onayla & Bilgileri Gör',
        confirmNote: 'İşlemi onayladığınızda ödeme bilgileri gösterilecek ve 30 dakika süre başlayacaktır.',
        pendingOrder: 'Bekleyen İşleminiz Var',
        pendingOrderDesc: 'Aktif bir işleminiz var. Yeni işlem için önce bunu tamamlayın veya iptal edin.',
        cancelOrder: 'İşlemi İptal Et',
        noMatchTitle: 'Eşleşme Bulunamadı',
        noMatchDesc: 'Bu tutarda çekim talebi yok. En yakın tutarları seçebilirsiniz:',
        waitingMatch: 'Eşleşme Bekleniyor',
        waitingMatchDesc: 'Talebiniz havuza eklendi, çekim talebi geldiğinde eşleşeceksiniz.',
        transactionType: 'İşlem Tipi',
        buyOrder: 'Yatırım (Alış)',
        sellOrder: 'Çekim (Satış)',
        network: 'Ağ'
    },

    depositConfirm: {
        title: 'Ödeme Bilgileri',
        paymentInfo: 'Ödeme Bilgileri',
        iban: 'IBAN',
        recipient: 'Alıcı',
        bank: 'Banka',
        amount: 'Tutar',
        timeRemaining: 'Kalan Süre',
        markAsPaid: 'Ödedim',
        uploadReceipt: 'Dekont Yükle',
        paymentSent: 'Ödeme Bildiriminiz Alındı!',
        paymentSentDesc: 'Ödeme bildiriminiz başarıyla iletildi. Satıcı onayladığında bakiyeniz hesabınıza geçecektir.',
        timeExpired: 'Süre Doldu!',
        timeExpiredDesc: 'İşlem süresi doldu ve iptal edildi. Lütfen yeni bir işlem başlatın.'
    },

    withdraw: {
        title: 'Para Çek',
        withdrawAmount: 'Çekilecek Tutar (USDT)',
        youWillReceive: 'Alacağınız',
        selectBank: 'Banka Hesabı Seçin',
        createRequest: 'Çekim Talebi Oluştur',
        waitingMatch: 'Eşleşme Bekleniyor',
        instantWithdraw: 'Hızlı Çekim',
        p2pWithdraw: 'P2P Çekim',
        insufficientBalance: 'Yetersiz Bakiye'
    },

    crypto: {
        depositTitle: 'Kripto Yatırma',
        withdrawTitle: 'Kripto Çekme',
        selectNetwork: 'Ağ Seçin',
        depositAddress: 'Yatırma Adresi',
        clickToCopy: 'Kopyalamak için tıklayın',
        qrCode: 'QR Kod',
        minimumDeposit: 'Minimum: 10 USDT',
        selectAsset: 'Varlık Seçin',
        withdrawAmount: 'Çekim Tutarı',
        walletAddress: 'Cüzdan Adresi',
        networkFee: 'Ağ Ücreti',
        confirmWithdraw: 'Çekimi Onayla'
    },

    history: {
        title: 'İşlem Geçmişi',
        deposit: 'Yatırım',
        withdraw: 'Çekim',
        transfer: 'Transfer',
        p2pBuy: 'P2P Alış',
        p2pSell: 'P2P Satış',
        noHistory: 'Henüz işlem yok'
    },

    profile: {
        title: 'Profil',
        accountSettings: 'Hesap Ayarları',
        editProfile: 'Profili Düzenle',
        changePassword: 'Şifre Değiştir',
        bankAccounts: 'Banka Hesapları',
        transactionLimits: 'İşlem Limitleri',
        security: 'Güvenlik',
        language: 'Dil',
        privacyPolicy: 'Gizlilik Politikası',
        termsOfService: 'Kullanım Şartları',
        appVersion: 'Uygulama Sürümü'
    },

    profileEdit: {
        title: 'Profili Düzenle',
        firstName: 'Ad',
        lastName: 'Soyad',
        firstNamePlaceholder: 'Adınızı girin',
        lastNamePlaceholder: 'Soyadınızı girin',
        save: 'Kaydet'
    },

    changePassword: {
        title: 'Şifre Değiştir',
        currentPassword: 'Mevcut Şifre',
        newPassword: 'Yeni Şifre',
        confirmNewPassword: 'Yeni Şifre (Tekrar)',
        updatePassword: 'Şifreyi Güncelle',
        currentPasswordPlaceholder: 'Mevcut şifrenizi girin',
        newPasswordPlaceholder: 'Yeni şifrenizi girin',
        confirmPasswordPlaceholder: 'Yeni şifrenizi tekrar girin'
    },

    bankAccounts: {
        title: 'Banka Hesapları',
        addAccount: 'Banka Hesabı Ekle',
        bankName: 'Banka Adı',
        iban: 'IBAN',
        accountHolder: 'Hesap Sahibi',
        deleteConfirm: 'Bu hesabı silmek istediğinize emin misiniz?',
        noAccounts: 'Henüz banka hesabı eklenmemiş'
    },

    notifications: {
        title: 'Bildirimler',
        markAllRead: 'Tümünü Okundu İşaretle',
        new: 'Yeni',
        read: 'Okundu',
        noNotifications: 'Henüz bildirim yok',
        justNow: 'Az önce'
    },

    business: {
        title: 'İşletme Paneli',
        totalBalance: 'Toplam Bakiye',
        subAccounts: 'Alt Hesaplar',
        paymentPortals: 'Ödeme Portalları',
        transactionHistory: 'İşlem Geçmişi',
        invite: 'Davet Et',
        requestPortal: 'Portal Talep Et',
        portalName: 'Portal Adı'
    },

    findAgent: {
        title: 'Acente Bul',
        cashPoint: 'Ödeme Noktası',
        searchPlaceholder: 'Şehir veya bölge ara...',
        getDirections: 'Yol Tarifi Al',
        noAgents: 'Bu bölgede acente bulunamadı'
    },

    nav: {
        home: 'Ana Sayfa',
        scan: 'Tara',
        settings: 'Ayarlar'
    },

    alerts: {
        selectBank: 'Banka Seçin',
        selectBankMsg: 'Lütfen önce bir banka hesabı seçin veya ekleyin.',
        minimumAmount: 'Minimum Tutar',
        minimumAmountMsg: 'Minimum 10 USDT',
        serverError: 'Sunucu Hatası',
        connectionError: 'Bağlantı Hatası',
        unknownError: 'Bilinmeyen bir hata oluştu',
        tryAgain: 'Lütfen tekrar deneyin'
    },

    languages: {
        tr: 'Türkçe',
        en: 'English'
    }
};
