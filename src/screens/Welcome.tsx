import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            icon: 'account_balance_wallet',
            iconBg: 'from-emerald-400 to-teal-500',
            title: 'Güvenli Kripto Cüzdanı',
            description: 'USDT varlıklarınızı güvenle saklayın ve yönetin. Gelişmiş güvenlik altyapısıyla korunun.'
        },
        {
            icon: 'swap_horiz',
            iconBg: 'from-blue-400 to-indigo-500',
            title: 'Hızlı P2P Transferler',
            description: 'Anında dahili transferler yapın. NUSD-XXXX kodunuzla saniyeler içinde para gönderin ve alın.'
        },
        {
            icon: 'verified_user',
            iconBg: 'from-purple-400 to-pink-500',
            title: 'Çoklu Ağ Desteği',
            description: 'TRC20, ERC20 ve BEP20 ağlarında USDT yatırın ve çekin. Tek cüzdan, tüm ağlar.'
        }
    ];

    const handleStart = () => {
        localStorage.setItem('welcomeShown', 'true');
        navigate('/');
    };

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            handleStart();
        }
    };

    const handleSkip = () => {
        handleStart();
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display relative overflow-hidden">

            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-600/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-teal-500/20 rounded-full blur-3xl" />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-emerald-400/10 rounded-full blur-2xl" />
            </div>

            {/* Skip Button */}
            <div className="relative z-10 p-6 flex justify-end">
                <button
                    onClick={handleSkip}
                    className="text-white/60 hover:text-white text-sm font-medium transition-colors"
                >
                    Atla
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-8 pb-8">

                {/* Logo at top */}
                <div className="mb-8">
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-900/50 p-2">
                        <img src="/logo.png" alt="Nubit Logo" className="w-full h-full object-contain" />
                    </div>
                </div>

                {/* Slide Content */}
                <div className="text-center max-w-sm">
                    {/* Animated Icon */}
                    <div className="mb-8">
                        <div className={`w-20 h-20 mx-auto bg-gradient-to-br ${slides[currentSlide].iconBg} rounded-full flex items-center justify-center shadow-xl transform transition-all duration-500`}>
                            <span className="material-symbols-outlined text-4xl text-white">
                                {slides[currentSlide].icon}
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-white mb-4 transition-all duration-300">
                        {slides[currentSlide].title}
                    </h1>

                    {/* Description */}
                    <p className="text-emerald-200/80 text-base leading-relaxed mb-8 transition-all duration-300">
                        {slides[currentSlide].description}
                    </p>
                </div>

                {/* Slide Indicators */}
                <div className="flex gap-2 mb-10">
                    {slides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentSlide(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${index === currentSlide
                                    ? 'w-8 bg-white'
                                    : 'w-2 bg-white/30 hover:bg-white/50'
                                }`}
                        />
                    ))}
                </div>

                {/* CTA Buttons */}
                <div className="w-full max-w-sm space-y-3">
                    <button
                        onClick={handleNext}
                        className="w-full bg-white text-emerald-900 font-bold py-4 px-8 rounded-2xl text-lg shadow-xl transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {currentSlide === slides.length - 1 ? 'Başlayalım' : 'Devam'}
                    </button>

                    {currentSlide === slides.length - 1 && (
                        <div className="text-center pt-2">
                            <p className="text-emerald-300/60 text-xs">
                                Devam ederek{' '}
                                <button onClick={() => navigate('/terms')} className="text-white/80 underline">
                                    Kullanım Koşulları
                                </button>
                                {' '}ve{' '}
                                <button onClick={() => navigate('/privacy')} className="text-white/80 underline">
                                    Gizlilik Politikası
                                </button>
                                'nı kabul etmiş olursunuz
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Trust indicators at bottom */}
            <div className="relative z-10 px-8 pb-8">
                <div className="flex items-center justify-center gap-6 text-white/40">
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">lock</span>
                        <span className="text-xs">256-bit SSL</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span className="text-xs">Güvenli</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">speed</span>
                        <span className="text-xs">Hızlı</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
