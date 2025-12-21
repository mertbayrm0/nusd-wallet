import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('Attempting login with:', email);
      const success = await login(email, password);
      console.log('Login result:', success);
      if (success) {
        navigate('/dashboard');
      } else {
        setError("Giriş başarısız. Lütfen bilgileri kontrol edin.");
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(`Hata: ${err.message || 'Sunucu bağlantı hatası'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display relative overflow-hidden">

      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-teal-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-emerald-400/10 rounded-full blur-2xl" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">

        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-900/50">
            <span className="material-symbols-outlined text-emerald-600 text-4xl">account_balance_wallet</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight mb-1">
            Nubit Wallet
          </h1>
          <p className="text-emerald-300/80 text-sm font-medium">Secure Crypto Management</p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 shadow-2xl shadow-emerald-950/50">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Hoş Geldiniz</h2>
              <p className="text-gray-500 text-sm">Hesabınıza güvenle giriş yapın</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">E-posta</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">mail</span>
                  <input
                    type="email"
                    required
                    className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-medium focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none placeholder:text-gray-400"
                    placeholder="ornek@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Şifre</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">lock</span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    className="w-full pl-12 pr-12 py-4 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none placeholder:text-gray-400 placeholder:font-normal"
                    placeholder="Şifrenizi girin"
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
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-500 text-lg shrink-0">error</span>
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Giriş yapılıyor...
                  </>
                ) : (
                  <>
                    Giriş Yap
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-emerald-200/80 text-sm mb-3">Hesabınız yok mu?</p>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="w-full bg-white/10 backdrop-blur border border-white/20 hover:bg-white/20 hover:border-white/30 py-4 rounded-xl font-bold text-lg text-white transition-all"
            >
              Yeni Hesap Oluştur
            </button>
          </div>

          {/* Version Tag */}
          <p className="text-center text-emerald-400/50 text-xs mt-8">v2.0 • Web</p>
        </div>
      </div>
    </div>
  );
};

export default Login;