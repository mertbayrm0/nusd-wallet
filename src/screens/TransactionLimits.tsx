import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface VerificationStatus {
    profileComplete: boolean;
    kycVerified: boolean;
    phoneVerified: boolean;
    emailVerified: boolean;
}

const TransactionLimits = () => {
    const navigate = useNavigate();
    const [verification, setVerification] = useState<VerificationStatus>({
        profileComplete: false,
        kycVerified: false,
        phoneVerified: false,
        emailVerified: false
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkVerificationStatus();
    }, []);

    const checkVerificationStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, birth_date, profile_completed, kyc_status, phone_verified, email_verified')
                .eq('id', user.id)
                .single();

            if (profile) {
                setVerification({
                    profileComplete: profile.profile_completed || (profile.first_name && profile.last_name && profile.birth_date),
                    kycVerified: profile.kyc_status === 'VERIFIED',
                    phoneVerified: profile.phone_verified || false,
                    emailVerified: profile.email_verified !== false // Default to true if email exists
                });
            }
        } catch (error) {
            console.error('Check verification error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const completedCount = Object.values(verification).filter(Boolean).length;
    const isFullyVerified = completedCount === 4;

    const limits = isFullyVerified
        ? { daily: 100000, monthly: 1000000 }
        : { daily: 20000, monthly: 500000 };

    const verificationItems = [
        {
            key: 'profileComplete',
            icon: 'person',
            label: 'Profil Bilgileri',
            sublabel: 'Ad, soyad, doğum tarihi',
            completed: verification.profileComplete,
            action: () => navigate('/profile/edit')
        },
        {
            key: 'kycVerified',
            icon: 'badge',
            label: 'Kimlik Belgesi',
            sublabel: 'Kimlik kartı ön yüz',
            completed: verification.kycVerified,
            action: () => navigate('/kyc')
        },
        {
            key: 'phoneVerified',
            icon: 'phone_android',
            label: 'Telefon Doğrulama',
            sublabel: 'SMS ile doğrulama',
            completed: verification.phoneVerified,
            action: () => { } // TODO: Phone verification
        },
        {
            key: 'emailVerified',
            icon: 'mail',
            label: 'E-posta Doğrulama',
            sublabel: 'E-posta adresi onayı',
            completed: verification.emailVerified,
            action: () => { } // Already verified via Supabase auth
        }
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#111111] flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-lime-500/30 border-t-lime-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col font-display">
            {/* Header */}
            <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">İşlem Limitleri</h1>
            </div>

            <div className="flex-1 p-5 space-y-6 overflow-y-auto pb-20">
                {/* Current Limits Card */}
                <div className={`rounded-2xl p-5 border ${isFullyVerified ? 'bg-gradient-to-br from-lime-500/10 to-green-500/5 border-lime-500/30' : 'bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isFullyVerified ? 'bg-lime-500/20' : 'bg-amber-500/20'}`}>
                            <span className={`material-symbols-outlined text-2xl ${isFullyVerified ? 'text-lime-400' : 'text-amber-400'}`}>
                                {isFullyVerified ? 'verified_user' : 'pending'}
                            </span>
                        </div>
                        <div>
                            <p className={`font-bold ${isFullyVerified ? 'text-lime-400' : 'text-amber-400'}`}>
                                {isFullyVerified ? 'Doğrulanmış Hesap' : 'Doğrulanmamış Hesap'}
                            </p>
                            <p className="text-gray-400 text-sm">
                                {isFullyVerified ? 'Tüm limitler aktif' : `${completedCount}/4 adım tamamlandı`}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-black/30 rounded-xl p-4">
                            <p className="text-gray-500 text-xs mb-1">Günlük Limit</p>
                            <p className="text-white font-bold text-xl">₺{limits.daily.toLocaleString()}</p>
                        </div>
                        <div className="bg-black/30 rounded-xl p-4">
                            <p className="text-gray-500 text-xs mb-1">Aylık Limit</p>
                            <p className="text-white font-bold text-xl">₺{limits.monthly.toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                {/* Upgrade Info */}
                {!isFullyVerified && (
                    <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-lime-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lime-400">trending_up</span>
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Limitleri Artırın</p>
                                <p className="text-gray-400 text-xs mt-1">
                                    Aşağıdaki adımları tamamlayarak günlük ₺100.000, aylık ₺1.000.000 limite ulaşın.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Verification Checklist */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Doğrulama Adımları</p>
                    <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
                        {verificationItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={item.action}
                                disabled={item.completed}
                                className={`w-full p-4 flex items-center gap-4 text-left transition-colors ${item.completed ? 'opacity-60' : 'hover:bg-white/5'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.completed ? 'bg-lime-500/20' : 'bg-gray-700'}`}>
                                    <span className={`material-symbols-outlined ${item.completed ? 'text-lime-400' : 'text-gray-400'}`}>
                                        {item.completed ? 'check_circle' : item.icon}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${item.completed ? 'text-gray-400' : 'text-white'}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs text-gray-500">{item.sublabel}</p>
                                </div>
                                {item.completed ? (
                                    <span className="text-xs font-bold text-lime-400 bg-lime-500/10 px-2 py-1 rounded-full">
                                        ✓ Tamam
                                    </span>
                                ) : (
                                    <span className="material-symbols-outlined text-gray-600">chevron_right</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Limit Comparison */}
                <div className="space-y-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2">Limit Karşılaştırması</p>
                    <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500">
                                    <th className="text-left py-2"></th>
                                    <th className="text-center py-2">Doğrulanmamış</th>
                                    <th className="text-center py-2">Doğrulanmış</th>
                                </tr>
                            </thead>
                            <tbody className="text-white">
                                <tr className="border-t border-white/5">
                                    <td className="py-3 text-gray-400">Günlük</td>
                                    <td className="text-center py-3">₺20.000</td>
                                    <td className="text-center py-3 text-lime-400 font-bold">₺100.000</td>
                                </tr>
                                <tr className="border-t border-white/5">
                                    <td className="py-3 text-gray-400">Aylık</td>
                                    <td className="text-center py-3">₺500.000</td>
                                    <td className="text-center py-3 text-lime-400 font-bold">₺1.000.000</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionLimits;
