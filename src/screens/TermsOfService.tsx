import React from 'react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
    const navigate = useNavigate();

    return (
        <div className="h-screen bg-[#111111] flex flex-col font-display overflow-hidden">
            {/* Header */}
            <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 shrink-0 z-10">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Kullanım Koşulları</h1>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-lime-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-lime-400 text-3xl">description</span>
                    </div>
                    <p className="text-gray-500 text-sm">Son güncelleme: 9 Aralık 2025</p>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 space-y-4">
                    <h2 className="text-lime-400 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">gavel</span>
                        1. Hizmet Tanımı
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        NUSD Wallet, kripto para alım-satımı yapmak isteyen kullanıcıları birbirleriyle
                        buluşturan bir <span className="text-lime-400 font-bold">eşler arası (P2P) platform</span>dur.
                        Platform, kullanıcılar arasında doğrudan işlem yapılmasını kolaylaştırmak amacıyla
                        tasarlanmıştır.
                    </p>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        NUSD Wallet, bir kripto para borsası, aracı kurum veya finans kuruluşu
                        <span className="text-red-400 font-bold"> DEĞİLDİR</span>. Platform, yalnızca
                        kullanıcıların birbirini bulmasına ve iletişim kurmasına aracılık eder.
                    </p>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-amber-500/20 space-y-4">
                    <h2 className="text-amber-400 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">warning</span>
                        2. Sorumluluk Reddi - Banka Hesapları
                    </h2>
                    <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                        <p className="text-amber-300 text-sm leading-relaxed font-medium">
                            ⚠️ ÖNEMLİ: Kullanıcılar tarafından platformda paylaşılan banka hesap bilgileri,
                            IBAN numaraları ve diğer finansal bilgiler tamamen kullanıcıların kendi
                            sorumluluğundadır.
                        </p>
                    </div>
                    <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
                        <li>NUSD Wallet, kullanıcılar arasında gerçekleştirilen banka transferlerinden sorumlu tutulamaz.</li>
                        <li>Banka hesap bilgilerinin doğruluğu kullanıcı tarafından kontrol edilmelidir.</li>
                        <li>Hatalı hesap bilgisi nedeniyle oluşan kayıplardan platform sorumlu değildir.</li>
                        <li>Kullanıcılar, paylaştıkları bilgilerin güvenliğinden kendileri sorumludur.</li>
                    </ul>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 space-y-4">
                    <h2 className="text-blue-400 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">handshake</span>
                        3. P2P İşlem Koşulları
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Tüm işlemler, alıcı ve satıcı arasında doğrudan gerçekleştirilir. NUSD Wallet:
                    </p>
                    <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
                        <li>İşlemlerin tarafı değildir, yalnızca aracılık hizmeti sunar.</li>
                        <li>Kullanıcılar arasındaki anlaşmazlıklarda taraf olmaz.</li>
                        <li>Kripto para veya fiat para transferlerini doğrudan gerçekleştirmez.</li>
                        <li>İşlem süreçlerinde danışmanlık veya garanti sağlamaz.</li>
                    </ul>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 space-y-4">
                    <h2 className="text-purple-400 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">person</span>
                        4. Kullanıcı Sorumlulukları
                    </h2>
                    <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
                        <li>Doğru ve güncel bilgiler sağlamak</li>
                        <li>İşlem yapmadan önce karşı tarafı doğrulamak</li>
                        <li>Yerel yasalara ve düzenlemelere uymak</li>
                        <li>Hesap güvenliğini sağlamak</li>
                        <li>Şüpheli aktiviteleri bildirmek</li>
                    </ul>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 space-y-4">
                    <h2 className="text-red-400 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">block</span>
                        5. Yasaklanan Faaliyetler
                    </h2>
                    <ul className="text-gray-300 text-sm space-y-2 list-disc list-inside">
                        <li>Kara para aklama veya yasa dışı fon transferi</li>
                        <li>Dolandırıcılık veya sahte işlemler</li>
                        <li>Başkalarının kimlik bilgilerini kullanma</li>
                        <li>Platform güvenliğini tehlikeye atma</li>
                        <li>Spam veya zararlı içerik paylaşımı</li>
                    </ul>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 space-y-4">
                    <h2 className="text-cyan-400 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">verified_user</span>
                        6. Hesap Askıya Alma
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        NUSD Wallet, bu koşulları ihlal eden hesapları önceden bildirimde bulunmaksızın
                        askıya alma veya kalıcı olarak kapatma hakkını saklı tutar.
                    </p>
                </div>

                <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-white/5 space-y-4">
                    <h2 className="text-gray-400 font-bold text-lg flex items-center gap-2">
                        <span className="material-symbols-outlined">contact_support</span>
                        7. İletişim
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Sorularınız için: <span className="text-lime-400">support@nusd.com</span>
                    </p>
                </div>

                <div className="text-center pt-4 pb-10">
                    <p className="text-gray-600 text-xs">
                        Bu koşulları kabul ederek NUSD Wallet'ı kullanmaya devam edebilirsiniz.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermsOfService;
