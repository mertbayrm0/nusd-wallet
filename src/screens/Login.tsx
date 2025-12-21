import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { useTheme } from '../theme';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const { isDark } = useTheme();
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
        setError("Giriş başarısız. Lütfen bilgileri kontrol edin. (Supabase Auth Hatası)");
      }
    } catch (err: any) {
      console.error('Login exception:', err);
      setError(`Hata: ${err.message || 'Sunucu bağlantı hatası'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-screen p-6 font-display ${isDark ? 'bg-[#111111]' : 'bg-gray-50'}`}>

      {/* Logo and Version Tag */}
      <div className="text-center mb-8">
        <h1 className={`text-3xl font-bold bg-clip-text text-transparent mb-2 ${isDark ? 'bg-gradient-to-r from-white to-gray-400' : 'bg-gradient-to-r from-gray-900 to-gray-600'}`}>
          Nubit Wallet
        </h1>
        <p className="text-gray-500 text-sm">Secure Crypto Management</p>
        <p className="text-[10px] text-gray-400 mt-1">v2.0-web</p>
      </div>

      <h1 className={`text-3xl font-extrabold mb-2 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome Back</h1>
      <p className="text-gray-500 text-sm font-medium mb-8">Securely access your wallet</p>

      <form onSubmit={handleLogin} className="w-full space-y-5">
        {/* Email Input */}
        <div>
          <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email</label>
          <input
            type="email"
            required
            className={`w-full px-4 py-4 rounded-xl border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-medium ${isDark ? 'bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* Password Input */}
        <div>
          <label className={`block text-sm font-bold mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              className={`w-full pl-4 pr-12 py-4 rounded-xl border focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none font-bold placeholder:font-normal ${isDark ? 'bg-[#1a1a1a] border-white/10 text-white placeholder:text-gray-600' : 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400'}`}
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-xs font-mono">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking...' : 'Login'}
        </button>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className={`w-full border-t ${isDark ? 'border-white/10' : 'border-gray-300'}`}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className={`px-4 text-gray-500 font-medium uppercase tracking-wider text-xs ${isDark ? 'bg-[#111111]' : 'bg-gray-50'}`}>or</span>
          </div>
        </div>

        {/* Register Button */}
        <button
          type="button"
          onClick={() => navigate('/register')}
          className={`w-full border py-4 rounded-xl font-bold text-lg transition-all ${isDark ? 'bg-[#1a1a1a] border-white/10 hover:border-white/20 hover:bg-[#222] text-white' : 'bg-white border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-900'}`}
        >
          Create Account
        </button>
      </form>


    </div>
  );
};

export default Login;