import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../services/api';

const KYCVerification = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useApp();
    const [step, setStep] = useState(1);
    const [idFile, setIdFile] = useState<File | null>(null);
    const [idPreview, setIdPreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [existingSubmission, setExistingSubmission] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check existing KYC status on load
    useEffect(() => {
        checkExistingStatus();
    }, []);

    const checkExistingStatus = async () => {
        setIsLoading(true);
        try {
            const status = await api.getVerificationStatus('kyc');
            if (status) {
                setExistingSubmission(status);
                if (status.status === 'approved') {
                    setStep(3); // Show success
                } else if (status.status === 'pending') {
                    setStep(4); // Show pending
                }
            }
        } catch (e) {
            console.error('Check KYC status error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIdFile(file);
            // Create preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setIdPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        if (!idFile) return;

        setIsUploading(true);

        try {
            const result = await api.submitVerification('kyc', idFile);

            if (result.success) {
                setStep(4); // Show pending status
                await refreshUser();
            } else {
                alert(result.error || 'Bir hata oluştu');
            }
        } catch (error) {
            console.error('KYC error:', error);
            alert('Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsUploading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-white/30 border-t-white rounded-full" />
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
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Kimlik Doğrulama</h1>
            </div>

            <div className="flex-1 p-5 space-y-6">
                {/* Progress Steps */}
                <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${step >= s
                                ? step === s ? 'bg-emerald-500 text-white' : 'bg-emerald-100 text-emerald-600'
                                : 'bg-white/20 text-white/50'
                                }`}>
                                {step > s ? <span className="material-symbols-outlined text-lg">check</span> : s}
                            </div>
                            {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-emerald-500' : 'bg-white/20'}`} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Information */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <span className="material-symbols-outlined text-amber-500 text-4xl">badge</span>
                            </div>
                            <h2 className="text-white font-bold text-xl mb-2">Kimlik Doğrulama</h2>
                            <p className="text-emerald-200 text-sm">
                                İşlem limitlerini artırmak ve hesabınızı güvence altına almak için kimlik belgenizi doğrulayın.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
                            <h3 className="text-gray-900 font-bold text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500">info</span>
                                Gerekli Belgeler
                            </h3>
                            <ul className="text-gray-600 text-sm space-y-2">
                                <li className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                    Kimlik kartınızın ön yüzü (net ve okunaklı)
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                    Fotoğraf üzerinde kesinti veya yansıma olmamalı
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                    Tüm köşeler görünür olmalı
                                </li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-blue-700 text-sm flex items-start gap-2">
                                <span className="material-symbols-outlined text-lg shrink-0">send</span>
                                Belgeleriniz Telegram üzerinden admin ekibimize iletilecek ve en kısa sürede incelenecektir.
                            </p>
                        </div>

                        <button
                            onClick={() => setStep(2)}
                            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                        >
                            Başla
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                )}

                {/* Step 2: Upload */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-white font-bold text-xl mb-2">Kimlik Belgesi Yükle</h2>
                            <p className="text-emerald-200 text-sm">
                                Kimlik kartınızın veya pasaportunuzun fotoğrafını yükleyin.
                            </p>
                        </div>

                        {/* Upload Area */}
                        <label className="block cursor-pointer">
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${idPreview
                                ? 'border-emerald-500 bg-emerald-50'
                                : 'border-gray-300 bg-white hover:border-emerald-400'
                                } shadow-lg`}>
                                {idPreview ? (
                                    <div className="space-y-3">
                                        <img
                                            src={idPreview}
                                            alt="ID Preview"
                                            className="max-h-48 mx-auto rounded-xl object-cover"
                                        />
                                        <p className="text-emerald-600 text-sm font-medium">
                                            ✓ Fotoğraf yüklendi - Değiştirmek için tıklayın
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                                            <span className="material-symbols-outlined text-gray-400 text-3xl">add_photo_alternate</span>
                                        </div>
                                        <div>
                                            <p className="text-gray-900 font-medium">Fotoğraf Çek veya Yükle</p>
                                            <p className="text-gray-500 text-sm">Kamera veya galeri kullanabilirsiniz</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </label>

                        {/* Tips */}
                        <div className="bg-white rounded-xl p-4 shadow-lg border-l-4 border-amber-500">
                            <p className="text-gray-600 text-sm flex items-start gap-2">
                                <span className="material-symbols-outlined text-lg shrink-0 text-amber-500">tips_and_updates</span>
                                İpucu: İyi aydınlatılmış bir ortamda, düz bir zemin üzerinde fotoğraf çekin.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 bg-white text-gray-700 py-4 rounded-2xl font-bold text-base hover:bg-gray-50 transition-colors shadow"
                            >
                                Geri
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!idFile || isUploading}
                                className={`flex-1 py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg ${idFile && !isUploading
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-emerald-500/20'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Gönderiliyor...
                                    </>
                                ) : (
                                    <>
                                        Gönder
                                        <span className="material-symbols-outlined">send</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Approved */}
                {step === 3 && (
                    <div className="space-y-6 text-center py-10">
                        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-lg">
                            <span className="material-symbols-outlined text-emerald-500 text-5xl">verified_user</span>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-2xl mb-2">Kimlik Doğrulandı!</h2>
                            <p className="text-emerald-200 text-sm">
                                Tebrikler! Hesabınız başarıyla doğrulandı. Artık tüm özelliklere erişebilirsiniz.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Durum</span>
                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-lg">check_circle</span>
                                    Doğrulanmış
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Günlük Limit</span>
                                <span className="text-gray-900 font-bold">$10,000</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Aylık Limit</span>
                                <span className="text-gray-900 font-bold">$100,000</span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/profile')}
                            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            Tamam
                        </button>
                    </div>
                )}

                {/* Step 4: Pending Review */}
                {step === 4 && (
                    <div className="space-y-6 text-center py-10">
                        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto shadow-lg">
                            <span className="material-symbols-outlined text-amber-500 text-5xl">schedule</span>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-2xl mb-2">İnceleme Bekliyor</h2>
                            <p className="text-emerald-200 text-sm">
                                Belgeleriniz Telegram üzerinden admin ekibimize iletildi. En kısa sürede incelenecektir.
                            </p>
                        </div>

                        <div className="bg-white rounded-2xl p-4 shadow-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Durum</span>
                                <span className="text-amber-600 font-bold flex items-center gap-1">
                                    <span className="material-symbols-outlined text-lg">pending</span>
                                    Beklemede
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-500 text-sm">Gönderim Tarihi</span>
                                <span className="text-gray-900 font-medium text-sm">
                                    {existingSubmission?.created_at
                                        ? new Date(existingSubmission.created_at).toLocaleString('tr-TR')
                                        : new Date().toLocaleString('tr-TR')
                                    }
                                </span>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-blue-700 text-sm flex items-start gap-2">
                                <span className="material-symbols-outlined text-lg shrink-0">notifications_active</span>
                                Onaylandığında size bildirim göndereceğiz.
                            </p>
                        </div>

                        <button
                            onClick={() => navigate('/profile')}
                            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            Tamam
                        </button>

                        <button
                            onClick={() => {
                                setStep(2);
                                setIdFile(null);
                                setIdPreview(null);
                            }}
                            className="w-full text-white/70 py-2 text-sm hover:text-white transition-colors"
                        >
                            Yeni Belge Gönder
                        </button>
                    </div>
                )}

                {/* Step 5: Rejected */}
                {existingSubmission?.status === 'rejected' && step !== 2 && (
                    <div className="space-y-6 text-center py-10">
                        <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto shadow-lg">
                            <span className="material-symbols-outlined text-red-500 text-5xl">cancel</span>
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-2xl mb-2">Doğrulama Reddedildi</h2>
                            <p className="text-emerald-200 text-sm">
                                {existingSubmission?.rejection_reason || 'Belgeleriniz uygun bulunmadı. Lütfen geçerli belgelerle tekrar deneyin.'}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setStep(2);
                                setIdFile(null);
                                setIdPreview(null);
                                setExistingSubmission(null);
                            }}
                            className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-base hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KYCVerification;
