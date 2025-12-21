import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

interface LimitsData {
    daily_limit: number;
    daily_used: number;
    daily_remaining: number;
    monthly_limit: number;
    monthly_used: number;
    monthly_remaining: number;
}

interface VerificationStatus {
    profileComplete: boolean;
    kycVerified: boolean;
    phoneVerified: boolean;
    emailVerified: boolean;
}

const TransactionLimits = () => {
    const navigate = useNavigate();
    const [limits, setLimits] = useState<LimitsData | null>(null);
    const [verification, setVerification] = useState<VerificationStatus>({
        profileComplete: false,
        kycVerified: false,
        phoneVerified: false,
        emailVerified: false
    });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get user limits from database
            const { data: limitsData } = await supabase
                .rpc('get_user_limits', { p_user_id: user.id });

            if (limitsData && limitsData.length > 0) {
                setLimits(limitsData[0]);
            }

            // Get verification status
            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, birth_date, profile_completed, kyc_verified, phone_verified')
                .eq('id', user.id)
                .single();

            if (profile) {
                setVerification({
                    profileComplete: profile.profile_completed || (profile.first_name && profile.last_name && profile.birth_date),
                    kycVerified: profile.kyc_verified || false,
                    phoneVerified: profile.phone_verified || false,
                    emailVerified: true // Email verified via Supabase auth
                });
            }
        } catch (error) {
            console.error('Load limits error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const completedCount = Object.values(verification).filter(Boolean).length;
    const isFullyVerified = verification.kycVerified;

    const dailyPercent = limits ? (limits.daily_used / limits.daily_limit) * 100 : 0;
    const monthlyPercent = limits ? (limits.monthly_used / limits.monthly_limit) * 100 : 0;

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
            sublabel: 'Kimlik kartı doğrulaması',
            completed: verification.kycVerified,
            action: () => navigate('/kyc')
        },
        {
            key: 'phoneVerified',
            icon: 'phone_android',
            label: 'Telefon Doğrulama',
            sublabel: 'SMS ile doğrulama',
            completed: verification.phoneVerified,
            action: () => { }
        },
        {
            key: 'emailVerified',
            icon: 'mail',
            label: 'E-posta Doğrulama',
            sublabel: 'E-posta adresi onayı',
            completed: verification.emailVerified,
            action: () => { }
        }
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display">
            {/* Header */}
            <div className="px-4 py-4 flex items-center shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">İşlem Limitleri</h1>
            </div>

            <div className="flex-1 p-5 space-y-6 overflow-y-auto pb-20">
                {/* Current Limits Card */}
                <div className={`rounded-2xl p-5 shadow-lg ${isFullyVerified ? 'bg-white' : 'bg-white'}`}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isFullyVerified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                            <span className={`material-symbols-outlined text-2xl ${isFullyVerified ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {isFullyVerified ? 'verified_user' : 'pending'}
                            </span>
                        </div>
                        <div>
                            <p className={`font-bold ${isFullyVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {isFullyVerified ? 'Doğrulanmış Hesap' : 'Sınırlı Hesap'}
                            </p>
                            <p className="text-gray-500 text-sm">
                                {isFullyVerified ? 'Tüm limitler aktif' : 'KYC ile limitleri artırın'}
                            </p>
                        </div>
                    </div>

                    {/* Daily Limit Progress */}
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 text-sm font-medium">Günlük Limit</span>
                            <span className="text-gray-900 font-bold">
                                ${limits?.daily_used?.toLocaleString() || 0} / ${limits?.daily_limit?.toLocaleString() || 500}
                            </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${dailyPercent > 80 ? 'bg-red-500' : dailyPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(dailyPercent, 100)}%` }}
                            />
                        </div>
                        <p className="text-right text-xs text-gray-500 mt-1">
                            Kalan: ${limits?.daily_remaining?.toLocaleString() || limits?.daily_limit?.toLocaleString() || 500}
                        </p>
                    </div>

                    {/* Monthly Limit Progress */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-gray-600 text-sm font-medium">Aylık Limit</span>
                            <span className="text-gray-900 font-bold">
                                ${limits?.monthly_used?.toLocaleString() || 0} / ${limits?.monthly_limit?.toLocaleString() || 2000}
                            </span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${monthlyPercent > 80 ? 'bg-red-500' : monthlyPercent > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(monthlyPercent, 100)}%` }}
                            />
                        </div>
                        <p className="text-right text-xs text-gray-500 mt-1">
                            Kalan: ${limits?.monthly_remaining?.toLocaleString() || limits?.monthly_limit?.toLocaleString() || 2000}
                        </p>
                    </div>
                </div>

                {/* Upgrade Info */}
                {!isFullyVerified && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-emerald-400">trending_up</span>
                            </div>
                            <div>
                                <p className="text-white font-bold text-sm">Limitleri 20x Artırın!</p>
                                <p className="text-emerald-200 text-xs mt-1">
                                    KYC doğrulaması ile günlük $10,000, aylık $100,000 limite ulaşın.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Verification Checklist */}
                <div className="space-y-2">
                    <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider pl-2">Doğrulama Adımları</p>
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg divide-y divide-gray-100">
                        {verificationItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={item.action}
                                disabled={item.completed}
                                className={`w-full p-4 flex items-center gap-4 text-left transition-colors ${item.completed ? 'opacity-70' : 'hover:bg-gray-50'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.completed ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                                    <span className={`material-symbols-outlined ${item.completed ? 'text-emerald-500' : 'text-gray-400'}`}>
                                        {item.completed ? 'check_circle' : item.icon}
                                    </span>
                                </div>
                                <div className="flex-1">
                                    <p className={`text-sm font-bold ${item.completed ? 'text-gray-500' : 'text-gray-900'}`}>
                                        {item.label}
                                    </p>
                                    <p className="text-xs text-gray-500">{item.sublabel}</p>
                                </div>
                                {item.completed ? (
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                                        ✓ Tamam
                                    </span>
                                ) : (
                                    <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Limit Comparison */}
                <div className="space-y-2">
                    <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider pl-2">Limit Karşılaştırması</p>
                    <div className="bg-white rounded-2xl p-4 shadow-lg">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-500">
                                    <th className="text-left py-2"></th>
                                    <th className="text-center py-2">KYC Yok</th>
                                    <th className="text-center py-2">KYC Onaylı</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-900">
                                <tr className="border-t border-gray-100">
                                    <td className="py-3 text-gray-500">Günlük</td>
                                    <td className="text-center py-3">$500</td>
                                    <td className="text-center py-3 text-emerald-600 font-bold">$10,000</td>
                                </tr>
                                <tr className="border-t border-gray-100">
                                    <td className="py-3 text-gray-500">Aylık</td>
                                    <td className="text-center py-3">$2,000</td>
                                    <td className="text-center py-3 text-emerald-600 font-bold">$100,000</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* KYC Button */}
                {!verification.kycVerified && (
                    <button
                        onClick={() => navigate('/kyc')}
                        className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">verified_user</span>
                        KYC Doğrulaması Başlat
                    </button>
                )}
            </div>
        </div>
    );
};

export default TransactionLimits;
