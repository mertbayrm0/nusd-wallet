import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';

const Login = () => {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('demo@nusd.com');
  const [password, setPassword] = useState('1234');
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111] p-6 font-display">

      {/* Logo and Version Tag */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-2">
          NUSD Wallet
        </h1>
        <p className="text-gray-500 text-sm">Secure Crypto Management</p>
        <p className="text-[10px] text-gray-700 mt-1">v2.0-web-fix</p>
      </div>

      <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Welcome Back</h1>
      <p className="text-gray-500 text-sm font-medium mb-8">Securely access your wallet</p>

      <form onSubmit={handleLogin} className="w-full space-y-5">
        {/* Email Input */}
        <div>
          <label className="block text-sm font-bold text-gray-400 mb-2">Email</label>
          <input
            type="email"
            required
            className="w-full px-4 py-4 rounded-xl border border-white/10 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none bg-[#1a1a1a] text-white font-medium placeholder:text-gray-600"
            placeholder="name@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-sm font-bold text-gray-400 mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              className="w-full pl-4 pr-12 py-4 rounded-xl border border-white/10 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none bg-[#1a1a1a] text-white font-bold placeholder:font-normal placeholder:text-gray-600"
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
          className="w-full bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-black py-4 rounded-xl font-bold text-lg shadow-xl shadow-lime-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Checking...' : 'Login'}
        </button>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-[#111111] text-gray-500 font-medium uppercase tracking-wider text-xs">or</span>
          </div>
        </div>

        {/* Register Button */}
        <button
          type="button"
          onClick={() => navigate('/register')}
          className="w-full bg-[#1a1a1a] border border-white/10 hover:border-white/20 hover:bg-[#222] text-white py-4 rounded-xl font-bold text-lg transition-all"
        >
          Create Account
        </button>
      </form>

      <div className="mt-8 text-center space-y-1">
        <p className="text-gray-500 text-xs">Demo User: <span className="font-mono text-gray-400">demo@nusd.com</span></p>
        <p className="text-gray-500 text-xs">Admin: <span className="font-mono text-gray-400">admin@nusd.com</span></p>
      </div>
    </div>
  );
};

export default Login;