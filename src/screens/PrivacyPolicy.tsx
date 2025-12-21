import React from 'react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display overflow-hidden">
            {/* Header */}
            <div className="px-4 py-4 flex items-center shrink-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Gizlilik Politikası</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <span className="material-symbols-outlined text-purple-500 text-3xl">privacy_tip</span>
                    </div>
                    <p className="text-emerald-300 text-sm">Son güncelleme: 9 Aralık 2025</p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    <h2 className="text-purple-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">info</span>
                        1. Giriş
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        NUSD Wallet olarak gizliliğinize önem veriyoruz. Bu politika, kripto para
                        alıcı ve satıcılarını buluşturan P2P platformumuzda bilgilerinizin nasıl
                        toplandığını, kullanıldığını ve korunduğunu açıklar.
                    </p>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    <h2 className="text-blue-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">folder_open</span>
                        2. Toplanan Bilgiler
                    </h2>
                    <div className="space-y-3">
                        <div className="bg-emerald-50 rounded-xl p-3">
                            <p className="text-emerald-700 font-bold text-sm mb-1">Hesap Bilgileri</p>
                            <p className="text-gray-500 text-xs">Ad, e-posta adresi, telefon numarası</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3">
                            <p className="text-emerald-700 font-bold text-sm mb-1">İşlem Verileri</p>
                            <p className="text-gray-500 text-xs">İşlem geçmişi, tutar bilgileri, tarih/saat kayıtları</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3">
                            <p className="text-emerald-700 font-bold text-sm mb-1">Cihaz Bilgileri</p>
                            <p className="text-gray-500 text-xs">IP adresi, tarayıcı türü, işletim sistemi</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg border-2 border-amber-200 space-y-4">
                    <h2 className="text-amber-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">account_balance</span>
                        3. Banka Hesap Bilgileri Hakkında
                    </h2>
                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                        <p className="text-amber-700 text-sm leading-relaxed font-medium">
                            ⚠️ ÖNEMLİ UYARI
                        </p>
                    </div>
                    <ul className="text-gray-600 text-sm space-y-2 list-disc list-inside">
                        <li>Platformda paylaşılan banka hesap bilgileri (IBAN, hesap numarası vb.)
                            <span className="text-amber-600 font-bold"> kullanıcılar arasında doğrudan paylaşılır</span>.</li>
                        <li>NUSD Wallet, bu bilgileri sadece işlem eşleştirmesi için geçici olarak saklar.</li>
                        <li>Banka hesaplarının doğruluğunu veya güvenliğini garanti etmiyoruz.</li>
                        <li>Kullanıcılar, banka bilgilerini paylaşmadan önce karşı tarafı doğrulamalıdır.</li>
                        <li>Banka transferlerinden doğan sorunlar kullanıcıların sorumluluğundadır.</li>
                    </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    <h2 className="text-green-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">check_circle</span>
                        4. Bilgilerin Kullanımı
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Toplanan bilgiler aşağıdaki amaçlarla kullanılır:
                    </p>
                    <ul className="text-gray-600 text-sm space-y-2 list-disc list-inside">
                        <li>P2P eşleştirme hizmetinin sağlanması</li>
                        <li>Hesap güvenliğinin korunması</li>
                        <li>Dolandırıcılık önleme</li>
                        <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                        <li>Müşteri desteği sağlanması</li>
                    </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    <h2 className="text-red-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">share</span>
                        5. Bilgi Paylaşımı
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Bilgileriniz aşağıdaki durumlar dışında üçüncü taraflarla
                        <span className="text-emerald-600 font-bold"> PAYLAŞILMAZ</span>:
                    </p>
                    <ul className="text-gray-600 text-sm space-y-2 list-disc list-inside">
                        <li>Yasal zorunluluk durumunda (mahkeme kararı, resmi talep)</li>
                        <li>P2P işlem tarafları arasında (sadece gerekli bilgiler)</li>
                        <li>Güvenlik tehdidi tespit edildiğinde</li>
                    </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    <h2 className="text-cyan-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">lock</span>
                        6. Veri Güvenliği
                    </h2>
                    <ul className="text-gray-600 text-sm space-y-2 list-disc list-inside">
                        <li>256-bit SSL şifreleme ile veri iletimi</li>
                        <li>Şifreli veritabanı depolama</li>
                        <li>İki faktörlü kimlik doğrulama seçeneği</li>
                        <li>Düzenli güvenlik denetimleri</li>
                    </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    <h2 className="text-orange-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">timer</span>
                        7. Veri Saklama Süresi
                    </h2>
                    <ul className="text-gray-600 text-sm space-y-2 list-disc list-inside">
                        <li>Aktif hesap bilgileri: Hesap aktif olduğu sürece</li>
                        <li>İşlem kayıtları: 5 yıl (yasal zorunluluk)</li>
                        <li>Kapatılan hesaplar: 1 yıl sonra tamamen silinir</li>
                    </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    <h2 className="text-emerald-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">person_raised_hand</span>
                        8. Kullanıcı Hakları
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        KVKK ve GDPR kapsamında aşağıdaki haklara sahipsiniz:
                    </p>
                    <ul className="text-gray-600 text-sm space-y-2 list-disc list-inside">
                        <li>Verilerinize erişim talep etme</li>
                        <li>Verilerin düzeltilmesini isteme</li>
                        <li>Verilerin silinmesini talep etme</li>
                        <li>Veri işlemeye itiraz etme</li>
                        <li>Veri taşınabilirliği</li>
                    </ul>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    <h2 className="text-gray-600 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">contact_support</span>
                        9. İletişim
                    </h2>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Gizlilik ile ilgili sorularınız için:
                    </p>
                    <p className="text-emerald-600 font-bold">privacy@nusd.com</p>
                </div>

                <div className="text-center pt-4 pb-10">
                    <p className="text-emerald-300/70 text-xs">
                        NUSD Wallet'ı kullanarak bu gizlilik politikasını kabul etmiş sayılırsınız.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
