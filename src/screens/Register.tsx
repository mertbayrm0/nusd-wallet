import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../App';

type AccountType = 'personal' | 'business';

const Register = () => {
    const navigate = useNavigate();
    const { login } = useApp();
    const [accountType, setAccountType] = useState<AccountType>('personal');
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) return alert("Lütfen tüm alanları doldurun");
        if (password.length < 6) return alert("Şifre en az 6 karakter olmalıdır");
        if (password !== confirmPassword) return alert("Şifreler eşleşmiyor");
        if (accountType === 'business' && !businessName) return alert("Ticari hesaplar için firma adı gereklidir");

        setLoading(true);
        const result = await api.register(name, email, password, accountType, businessName);
        if (result && result.user?.email) {
            await login(result.user.email, password);
            navigate('/dashboard');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display relative overflow-hidden">

            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
                <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
                <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl" />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">

                {/* Logo Section */}
                <div className="text-center mb-6">
                    <div className="w-36 h-36 bg-white rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-xl shadow-emerald-900/50 p-4">
                        <img src="/logo.png" alt="Nubit Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-white mb-1">Hesap Oluştur</h1>
                    <p className="text-emerald-300/80 text-sm">Nubit Wallet'a katılın</p>
                </div>

                {/* Register Card */}
                <div className="w-full max-w-sm">
                    <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-emerald-950/50">

                        {/* Account Type Selection */}
                        <div className="mb-5">
                            <label className="block text-sm font-bold text-gray-700 mb-3">Hesap Türü</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setAccountType('personal')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${accountType === 'personal'
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-2xl mb-1 ${accountType === 'personal' ? 'text-emerald-600' : 'text-gray-400'
                                        }`}>person</span>
                                    <span className={`text-sm font-bold ${accountType === 'personal' ? 'text-emerald-700' : 'text-gray-500'
                                        }`}>Kişisel</span>
                                    <span className="text-xs text-gray-400 mt-0.5">Bireysel kullanım</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setAccountType('business')}
                                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${accountType === 'business'
                                        ? 'border-emerald-500 bg-emerald-50'
                                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-2xl mb-1 ${accountType === 'business' ? 'text-emerald-600' : 'text-gray-400'
                                        }`}>store</span>
                                    <span className={`text-sm font-bold ${accountType === 'business' ? 'text-emerald-700' : 'text-gray-500'
                                        }`}>Ticari</span>
                                    <span className="text-xs text-gray-400 mt-0.5">Firma hesabı</span>
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Business Name - Only for business accounts */}
                            {accountType === 'business' && (
                                <div className="animate-fadeIn">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">
                                        Firma Adı <span className="text-emerald-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">business</span>
                                        <input
                                            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-gray-900 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none placeholder:text-gray-400"
                                            placeholder="Şirket / İşletme Adı"
                                            value={businessName}
                                            onChange={e => setBusinessName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Full Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    {accountType === 'business' ? 'Yetkili Kişi Adı' : 'Ad Soyad'}
                                </label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">badge</span>
                                    <input
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none placeholder:text-gray-400"
                                        placeholder={accountType === 'business' ? "Yetkili kişinin adı" : "Adınız Soyadınız"}
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">E-posta</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">mail</span>
                                    <input
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none placeholder:text-gray-400"
                                        placeholder="ornek@email.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Şifre</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock</span>
                                    <input
                                        className="w-full pl-12 pr-12 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none placeholder:text-gray-400 placeholder:font-normal"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Şifre oluşturun"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-xl">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-1.5 ml-1">En az 6 karakter</p>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Şifre Tekrar</label>
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock_reset</span>
                                    <input
                                        className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none placeholder:text-gray-400 placeholder:font-normal"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Şifreyi tekrar girin"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleRegister}
                                disabled={loading}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Hesap oluşturuluyor...
                                    </>
                                ) : (
                                    <>
                                        {accountType === 'business' ? 'Ticari Hesap Oluştur' : 'Kayıt Ol'}
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Login Link */}
                    <div className="mt-5 text-center">
                        <p className="text-emerald-200/80 text-sm mb-2">Zaten hesabınız var mı?</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 hover:border-white/30 py-3.5 rounded-xl font-bold text-white transition-all"
                        >
                            Giriş Yap
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Register;
