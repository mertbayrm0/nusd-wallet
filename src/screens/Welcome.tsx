import React from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome: React.FC = () => {
    const navigate = useNavigate();

    const handleStart = () => {
        localStorage.setItem('welcomeShown', 'true');
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center p-8 relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-lime-500/5 via-transparent to-purple-500/5 animate-pulse"></div>

            {/* Content */}
            <div className="relative z-10 max-w-md text-center">
                {/* Logo/Icon */}
                <div className="mb-8">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-br from-lime-500 to-lime-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-lime-500/50 transform hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-5xl text-black">account_balance_wallet</span>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold text-white mb-4">
                    NUSD Wallet'a Hoş Geldiniz
                </h1>

                {/* Subtitle */}
                <p className="text-gray-400 text-lg mb-8">
                    Kripto paranızı güvenle yönetin. USDT yatırın, çekin ve işlemlerinizi takip edin.
                </p>

                {/* Features */}
                <div className="space-y-4 mb-12">
                    <div className="flex items-center gap-3 bg-[#1a1a1a]/50 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lime-400">currency_bitcoin</span>
                        </div>
                        <span className="text-gray-300 text-sm text-left">TRC20, ERC20, BEP20 Desteği</span>
                    </div>

                    <div className="flex items-center gap-3 bg-[#1a1a1a]/50 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lime-400">verified_user</span>
                        </div>
                        <span className="text-gray-300 text-sm text-left">Blockchain Doğrulama</span>
                    </div>

                    <div className="flex items-center gap-3 bg-[#1a1a1a]/50 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                        <div className="w-10 h-10 rounded-full bg-lime-500/20 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-lime-400">bolt</span>
                        </div>
                        <span className="text-gray-300 text-sm text-left">Hızlı P2P Transferler</span>
                    </div>
                </div>

                {/* CTA Button */}
                <button
                    onClick={handleStart}
                    className="w-full bg-lime-500 hover:bg-lime-400 text-black font-bold py-4 px-8 rounded-xl text-lg shadow-2xl shadow-lime-500/30 transition-all transform hover:scale-105 active:scale-95"
                >
                    Başlayalım
                </button>

                <p className="text-gray-600 text-xs mt-6">
                    Devam ederek Gizlilik Politikası'nı kabul etmiş olursunuz
                </p>
            </div>
        </div>
    );
};

export default Welcome;
