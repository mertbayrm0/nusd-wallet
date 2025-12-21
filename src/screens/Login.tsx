import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { usePWA } from '../hooks/usePWA';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const { isInstallable, isInstalled, isIOS, isAndroid, installApp, showIOSInstructions, setShowIOSInstructions } = usePWA();
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

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">iPhone'a Yükle</h3>
              <p className="text-gray-600 text-sm">Aşağıdaki adımları takip edin:</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">1</span>
                <p className="text-gray-700 text-sm">Safari'nin alt kısmındaki <strong>Paylaş</strong> butonuna (📤) tıklayın</p>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">2</span>
                <p className="text-gray-700 text-sm">Aşağı kaydırın ve <strong>"Ana Ekrana Ekle"</strong> seçeneğini bulun</p>
              </div>
              <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">3</span>
                <p className="text-gray-700 text-sm">Sağ üstteki <strong>"Ekle"</strong> butonuna tıklayın</p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSInstructions(false)}
              className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold hover:bg-emerald-400 transition-colors"
            >
              Anladım
            </button>
          </div>
        </div>
      )}

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
          <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-900/50 overflow-hidden p-2">
            <img src="/logo.png" alt="Nubit Logo" className="w-full h-full object-contain" />
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

          {/* Install App Buttons */}
          {!isInstalled && (
            <div className="mt-6">
              <p className="text-emerald-200/80 text-xs text-center mb-3">Uygulamayı Telefonuna Yükle</p>
              <div className="flex gap-3">
                {/* Android Button */}
                <button
                  onClick={installApp}
                  className="flex-1 bg-[#3DDC84]/20 border border-[#3DDC84]/40 hover:bg-[#3DDC84]/30 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#3DDC84">
                    <path d="M17.523 15.341l1.47-2.545a.31.31 0 00-.11-.42.305.305 0 00-.422.11l-1.488 2.575a9.587 9.587 0 00-3.968-.856 9.587 9.587 0 00-3.968.856L7.549 12.486a.306.306 0 00-.532.31l1.47 2.545C5.97 16.528 4.466 18.906 4.249 21.75h16.502c-.217-2.844-1.72-5.222-3.228-6.409zM8.457 18.57a.81.81 0 110-1.62.81.81 0 010 1.62zm7.086 0a.81.81 0 110-1.62.81.81 0 010 1.62z" />
                  </svg>
                  <span className="text-[#3DDC84] font-bold text-sm">Android</span>
                </button>

                {/* iOS Button */}
                <button
                  onClick={installApp}
                  className="flex-1 bg-white/10 border border-white/20 hover:bg-white/20 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <span className="text-white font-bold text-sm">iPhone</span>
                </button>
              </div>
            </div>
          )}

          {/* Already Installed Badge */}
          {isInstalled && (
            <div className="mt-6 flex items-center justify-center gap-2 text-emerald-400">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              <span className="text-sm font-medium">Uygulama yüklü</span>
            </div>
          )}

          {/* Version Tag */}
          <p className="text-center text-emerald-400/50 text-xs mt-8">v2.0 • {isInstalled ? 'App' : 'Web'}</p>
        </div>
      </div>
    </div>
  );
};

export default Login;