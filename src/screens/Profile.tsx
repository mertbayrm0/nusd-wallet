import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

const SettingsItem = ({ icon, iconBg, label, sublabel, onClick, badge, toggle, toggleValue }: any) => {
    const { isDark } = useTheme();
    return (
        <button
            onClick={onClick}
            className={`w-full p-4 flex items-center gap-4 transition-colors text-left ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'}`}
        >
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{label}</p>
                    {badge && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                            {badge.text}
                        </span>
                    )}
                </div>
                {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
            </div>
            {toggle ? (
                <div className={`w-12 h-7 rounded-full p-1 transition-colors ${toggleValue ? 'bg-emerald-500' : 'bg-gray-400'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white transition-transform ${toggleValue ? 'translate-x-5' : ''}`}></div>
                </div>
            ) : (
                <span className={`material-symbols-outlined ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>chevron_right</span>
            )}
        </button>
    );
};

const Profile = () => {
    const { user, logout } = useApp();
    const navigate = useNavigate();
    const { language, setLanguage, t } = useI18n();
    const { isDark, toggleTheme } = useTheme();
    const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
    const [showLangModal, setShowLangModal] = useState(false);

    useEffect(() => {
        checkProfileCompletion();
    }, []);

    const checkProfileCompletion = async () => {
        try {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (!authUser) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, birth_date, profile_completed')
                .eq('id', authUser.id)
                .single();

            const isComplete = profile?.profile_completed ||
                (profile?.first_name && profile?.last_name && profile?.birth_date);
            setIsProfileComplete(!!isComplete);
        } catch (error) {
            console.error('Check profile error:', error);
            setIsProfileComplete(false);
        }
    };

    return (
        <div className={`h-screen flex flex-col font-display overflow-hidden ${isDark ? 'bg-[#111111]' : 'bg-gray-50'}`}>
            {/* Language Selection Modal */}
            {showLangModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center p-4">
                    <div className={`rounded-2xl p-5 w-full max-w-sm border ${isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-white border-gray-200 shadow-xl'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('profile.language')}</h3>
                            <button onClick={() => setShowLangModal(false)} className={`${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="space-y-2">
                            <button
                                onClick={() => { setLanguage('tr'); setShowLangModal(false); }}
                                className={`w-full p-4 rounded-xl flex items-center justify-between ${language === 'tr' ? 'bg-emerald-500/20 border border-emerald-500' : isDark ? 'bg-[#2a2a2a] border border-transparent' : 'bg-gray-100 border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🇹🇷</span>
                                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Türkçe</span>
                                </div>
                                {language === 'tr' && <span className="material-symbols-outlined text-emerald-500">check_circle</span>}
                            </button>
                            <button
                                onClick={() => { setLanguage('en'); setShowLangModal(false); }}
                                className={`w-full p-4 rounded-xl flex items-center justify-between ${language === 'en' ? 'bg-emerald-500/20 border border-emerald-500' : isDark ? 'bg-[#2a2a2a] border border-transparent' : 'bg-gray-100 border border-transparent'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">🇬🇧</span>
                                    <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>English</span>
                                </div>
                                {language === 'en' && <span className="material-symbols-outlined text-emerald-500">check_circle</span>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className={`px-4 py-4 flex items-center border-b shrink-0 z-10 ${isDark ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-gray-200'}`}>
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`p-2 -ml-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                >
                    <span className={`material-symbols-outlined ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>arrow_back</span>
                </button>
                <h1 className={`flex-1 text-center font-bold text-lg pr-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ayarlar</h1>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Profile Card */}
                <div className={`rounded-3xl p-6 flex flex-col items-center text-center border ${isDark ? 'bg-[#1a1a1a] border-white/5' : 'bg-white border-gray-200 shadow-sm'}`}>
                    <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <span className="text-white text-2xl font-bold">{user?.name?.charAt(0) || 'U'}</span>
                        </div>
                        <button className={`absolute -bottom-1 -right-1 w-8 h-8 border-2 rounded-full flex items-center justify-center ${isDark ? 'bg-[#2a2a2a] border-[#111111]' : 'bg-white border-gray-200 shadow'}`}>
                            <span className="material-symbols-outlined text-emerald-500 text-sm">edit</span>
                        </button>
                    </div>
                    <h2 className={`text-lg font-extrabold mt-3 mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>{user?.name || 'User'}</h2>
                    <p className="text-gray-500 font-medium text-sm mb-3">{user?.email}</p>

                    <div className="flex gap-2">
                        <span className="bg-emerald-500/20 text-emerald-500 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{user?.role || 'User'}</span>
                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Aktif</span>
                    </div>
                </div>

                {/* Hesap Doğrulama */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Hesap Doğrulama</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="verified_user"
                            iconBg="bg-amber-500/20 text-amber-400"
                            label="Kimlik Doğrulama (KYC)"
                            sublabel="Limitleri artırmak için doğrulayın"
                            badge={{ text: "Bekliyor", color: "bg-amber-500/20 text-amber-400" }}
                            onClick={() => navigate('/kyc')}
                        />
                        <SettingsItem
                            icon="phone_android"
                            iconBg="bg-green-500/20 text-green-400"
                            label="Telefon Doğrulama"
                            sublabel="+90 *** *** 45 67"
                            badge={{ text: "Doğrulandı", color: "bg-green-500/20 text-green-400" }}
                            onClick={() => { }}
                        />
                        <SettingsItem
                            icon="mail"
                            iconBg="bg-blue-500/20 text-blue-400"
                            label="E-posta Doğrulama"
                            sublabel={user?.email}
                            badge={{ text: "Doğrulandı", color: "bg-green-500/20 text-green-400" }}
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Hesap Bilgileri */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Hesap Bilgileri</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="person"
                            iconBg="bg-emerald-500/20 text-emerald-500"
                            label="Profil Bilgileri"
                            sublabel={isProfileComplete === null ? 'Kontrol ediliyor...' : isProfileComplete ? 'Tamamlandı' : 'Eksik - Tamamlayın'}
                            badge={isProfileComplete ? { text: "Tamam", color: "bg-green-500/20 text-green-400" } : isProfileComplete === false ? { text: "Eksik", color: "bg-red-500/20 text-red-400" } : undefined}
                            onClick={() => navigate('/profile/edit')}
                        />

                    </div>
                </div>

                {/* Finans */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Finans</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="account_balance"
                            iconBg="bg-blue-500/20 text-blue-400"
                            label="Banka Hesapları"
                            sublabel="Bağlı hesapları yönet"
                            onClick={() => navigate('/bank-accounts')}
                        />

                        <SettingsItem
                            icon="speed"
                            iconBg="bg-orange-500/20 text-orange-400"
                            label="İşlem Limitleri"
                            sublabel="Limitleri görüntüle ve artır"
                            onClick={() => navigate('/limits')}
                        />
                    </div>
                </div>

                {/* Güvenlik */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Güvenlik</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="lock"
                            iconBg="bg-red-500/20 text-red-400"
                            label="Şifre Değiştir"
                            sublabel="Hesap güvenliği için şifrenizi değiştirin"
                            onClick={() => navigate('/change-password')}
                        />
                    </div>
                </div>

                {/* Bildirimler */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Bildirimler</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="notifications"
                            iconBg="bg-yellow-500/20 text-yellow-400"
                            label="Push Bildirimleri"
                            sublabel="İşlem ve güvenlik uyarıları"
                            toggle={true}
                            toggleValue={true}
                            onClick={() => { }}
                        />
                        <SettingsItem
                            icon="email"
                            iconBg="bg-sky-500/20 text-sky-400"
                            label="E-posta Bildirimleri"
                            sublabel="Haftalık özet ve kampanyalar"
                            toggle={true}
                            toggleValue={false}
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Tercihler */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Tercihler</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="language"
                            iconBg="bg-violet-500/20 text-violet-400"
                            label={t('profile.language')}
                            sublabel={language === 'tr' ? 'Türkçe' : 'English'}
                            onClick={() => setShowLangModal(true)}
                        />
                        <SettingsItem
                            icon="currency_exchange"
                            iconBg="bg-emerald-500/20 text-emerald-500"
                            label="Para Birimi Gösterimi"
                            sublabel="TRY (₺)"
                            onClick={() => { }}
                        />
                        <SettingsItem
                            icon="dark_mode"
                            iconBg="bg-slate-500/20 text-slate-400"
                            label={isDark ? 'Karanlık Mod' : 'Light Mode'}
                            sublabel={isDark ? 'Aktif' : 'Active'}
                            toggle={true}
                            toggleValue={isDark}
                            onClick={toggleTheme}
                        />
                    </div>
                </div>

                {/* Yardım & Destek */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Yardım & Destek</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="help"
                            iconBg="bg-blue-500/20 text-blue-400"
                            label="SSS"
                            sublabel="Sıkça sorulan sorular"
                            onClick={() => { }}
                        />
                        <SettingsItem
                            icon="support_agent"
                            iconBg="bg-green-500/20 text-green-400"
                            label="Canlı Destek"
                            sublabel="7/24 müşteri hizmetleri"
                            onClick={() => { }}
                        />
                        <SettingsItem
                            icon="bug_report"
                            iconBg="bg-red-500/20 text-red-400"
                            label="Hata Bildir"
                            sublabel="Uygulama sorunlarını raporla"
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Yasal */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Yasal</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="description"
                            iconBg="bg-gray-500/20 text-gray-400"
                            label="Kullanım Koşulları"
                            onClick={() => navigate('/terms')}
                        />
                        <SettingsItem
                            icon="privacy_tip"
                            iconBg="bg-gray-500/20 text-gray-400"
                            label="Gizlilik Politikası"
                            onClick={() => navigate('/privacy')}
                        />
                        <SettingsItem
                            icon="cookie"
                            iconBg="bg-gray-500/20 text-gray-400"
                            label="Çerez Tercihleri"
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Hakkında */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Uygulama</p>
                    <div className={`rounded-2xl overflow-hidden border divide-y ${isDark ? 'bg-[#1a1a1a] border-white/5 divide-white/5' : 'bg-white border-gray-200 divide-gray-100 shadow-sm'}`}>
                        <SettingsItem
                            icon="info"
                            iconBg="bg-gray-500/20 text-gray-400"
                            label="Uygulama Hakkında"
                            sublabel="NUSD Wallet v1.0.0"
                            onClick={() => { }}
                        />
                        <SettingsItem
                            icon="star"
                            iconBg="bg-yellow-500/20 text-yellow-400"
                            label="Uygulamayı Değerlendir"
                            sublabel="App Store'da puan ver"
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Çıkış Butonu */}
                <button
                    onClick={() => { logout(); navigate('/'); }}
                    className="w-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98] transition-all py-4 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">logout</span>
                    Çıkış Yap
                </button>

                {/* Hesabı Sil */}
                <button className="w-full text-gray-500 hover:text-red-400 py-3 text-sm font-medium transition-colors">
                    Hesabımı Sil
                </button>

                {/* Large spacer for bottom nav */}
                <div className="h-40 w-full shrink-0"></div>
            </div>
        </div>
    );
};
export default Profile;