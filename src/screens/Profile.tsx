import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const SettingsItem = ({ icon, iconBg, label, sublabel, onClick, badge, toggle, toggleValue }: any) => (
    <button
        onClick={onClick}
        className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
    >
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
            <span className="material-symbols-outlined">{icon}</span>
        </div>
        <div className="flex-1">
            <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-white">{label}</p>
                {badge && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.color}`}>
                        {badge.text}
                    </span>
                )}
            </div>
            {sublabel && <p className="text-xs text-gray-500">{sublabel}</p>}
        </div>
        {toggle ? (
            <div className={`w-12 h-7 rounded-full p-1 transition-colors ${toggleValue ? 'bg-lime-500' : 'bg-gray-600'}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${toggleValue ? 'translate-x-5' : ''}`}></div>
            </div>
        ) : (
            <span className="material-symbols-outlined text-gray-600">chevron_right</span>
        )}
    </button>
);

const Profile = () => {
    const { user, logout } = useApp();
    const navigate = useNavigate();
    const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);

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
        <div className="h-screen bg-[#111111] flex flex-col font-display overflow-hidden">
            {/* Header */}
            <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 shrink-0 z-10">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Ayarlar</h1>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Profile Card */}
                <div className="bg-[#1a1a1a] rounded-3xl p-6 flex flex-col items-center text-center border border-white/5">
                    <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-lime-400 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-lime-500/20">
                            <span className="text-black text-2xl font-bold">{user?.name?.charAt(0) || 'U'}</span>
                        </div>
                        <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-[#2a2a2a] border-2 border-[#111111] rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-lime-400 text-sm">edit</span>
                        </button>
                    </div>
                    <h2 className="text-lg font-extrabold text-white mt-3 mb-0.5">{user?.name || 'User'}</h2>
                    <p className="text-gray-500 font-medium text-sm mb-3">{user?.email}</p>

                    <div className="flex gap-2">
                        <span className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">{user?.role || 'User'}</span>
                        <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Aktif</span>
                    </div>
                </div>

                {/* Hesap Doğrulama */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Hesap Doğrulama</p>
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
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
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
                        <SettingsItem
                            icon="person"
                            iconBg="bg-lime-500/20 text-lime-400"
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
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
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
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
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
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
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
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
                        <SettingsItem
                            icon="language"
                            iconBg="bg-violet-500/20 text-violet-400"
                            label="Dil"
                            sublabel="Türkçe"
                            onClick={() => { }}
                        />
                        <SettingsItem
                            icon="currency_exchange"
                            iconBg="bg-lime-500/20 text-lime-400"
                            label="Para Birimi Gösterimi"
                            sublabel="TRY (₺)"
                            onClick={() => { }}
                        />
                        <SettingsItem
                            icon="dark_mode"
                            iconBg="bg-slate-500/20 text-slate-400"
                            label="Karanlık Mod"
                            sublabel="Her zaman açık"
                            toggle={true}
                            toggleValue={true}
                            onClick={() => { }}
                        />
                    </div>
                </div>

                {/* Yardım & Destek */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Yardım & Destek</p>
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
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
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
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
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
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