import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const ChangePassword = () => {
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const validatePassword = (password: string): string | null => {
        if (password.length < 6) {
            return 'Şifre en az 6 karakter olmalıdır';
        }
        return null;
    };

    const handleSubmit = async () => {
        setError(null);

        // Validate fields
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError('Tüm alanları doldurun');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Yeni şifreler eşleşmiyor');
            return;
        }

        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            setError(passwordError);
            return;
        }

        if (currentPassword === newPassword) {
            setError('Yeni şifre mevcut şifreden farklı olmalıdır');
            return;
        }

        setIsLoading(true);

        try {
            // First verify current password by re-authenticating
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                setError('Kullanıcı bulunamadı');
                return;
            }

            // Try to sign in with current password to verify it
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: currentPassword
            });

            if (signInError) {
                setError('Mevcut şifre yanlış');
                setIsLoading(false);
                return;
            }

            // Update password
            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (updateError) {
                setError(updateError.message);
                setIsLoading(false);
                return;
            }

            // Success
            setShowSuccess(true);

            // Navigate back after delay
            setTimeout(() => {
                navigate('/profile');
            }, 2000);

        } catch (error) {
            console.error('Password change error:', error);
            setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setIsLoading(false);
        }
    };

    const isFormValid = currentPassword && newPassword && confirmPassword && newPassword === confirmPassword;

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
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Şifre Değiştir</h1>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] rounded-2xl p-6 text-center max-w-xs w-full border border-lime-500/30">
                        <div className="w-16 h-16 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-lime-400 text-3xl">check_circle</span>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Şifre Değiştirildi!</h3>
                        <p className="text-gray-400 text-sm">Şifreniz başarıyla güncellendi.</p>
                    </div>
                </div>
            )}

            <div className="flex-1 p-5 space-y-6">
                {/* Security Info */}
                <div className="bg-amber-500/10 rounded-2xl p-4 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-amber-400">shield</span>
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">Güvenlik İpucu</p>
                            <p className="text-gray-400 text-xs mt-1">
                                Güçlü bir şifre en az 6 karakter içermeli ve başka hiçbir yerde kullanılmamalıdır.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-400">error</span>
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* Form */}
                <div className="space-y-4">
                    {/* Current Password */}
                    <div className="space-y-2">
                        <label className="text-gray-400 text-sm font-medium pl-1">Mevcut Şifre</label>
                        <div className="relative">
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Mevcut şifrenizi girin"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-gray-500 focus:border-lime-500/50 focus:outline-none transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 p-1"
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {showCurrentPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-white/5 my-6"></div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <label className="text-gray-400 text-sm font-medium pl-1">Yeni Şifre</label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Yeni şifrenizi girin"
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder-gray-500 focus:border-lime-500/50 focus:outline-none transition-colors"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 p-1"
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {showNewPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-2">
                        <label className="text-gray-400 text-sm font-medium pl-1">Yeni Şifre Tekrar</label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Yeni şifrenizi tekrar girin"
                                className={`w-full bg-[#1a1a1a] border rounded-xl px-4 py-3.5 pr-12 text-white placeholder-gray-500 focus:outline-none transition-colors ${confirmPassword && newPassword !== confirmPassword
                                        ? 'border-red-500/50 focus:border-red-500'
                                        : confirmPassword && newPassword === confirmPassword
                                            ? 'border-lime-500/50 focus:border-lime-500'
                                            : 'border-white/10 focus:border-lime-500/50'
                                    }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 p-1"
                            >
                                <span className="material-symbols-outlined text-xl">
                                    {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                </span>
                            </button>
                        </div>
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-red-400 text-xs pl-1">Şifreler eşleşmiyor</p>
                        )}
                        {confirmPassword && newPassword === confirmPassword && (
                            <p className="text-lime-400 text-xs pl-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">check</span>
                                Şifreler eşleşiyor
                            </p>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleSubmit}
                    disabled={!isFormValid || isLoading}
                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 ${isFormValid && !isLoading
                            ? 'bg-lime-500 text-black hover:bg-lime-400 active:scale-[0.98]'
                            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        }`}
                >
                    {isLoading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            Güncelleniyor...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">lock_reset</span>
                            Şifreyi Güncelle
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ChangePassword;
