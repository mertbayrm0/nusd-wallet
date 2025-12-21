import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Welcome: React.FC = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            icon: 'account_balance_wallet',
            iconBg: 'bg-emerald-500',
            title: 'Güvenli Kripto Cüzdanı',
            description: 'USDT varlıklarınızı güvenle saklayın ve yönetin. Gelişmiş güvenlik altyapısıyla korunun.'
        },
        {
            icon: 'bolt',
            iconBg: 'bg-amber-500',
            title: 'En Hızlı USDT Alma Yöntemi',
            description: 'P2P sistem ile USDT\'nizi saniyeler içinde alın. Banka transferi ile anında TL\'ye çevirin, en hızlı ve güvenli yol.'
        },
        {
            icon: 'language',
            iconBg: 'bg-purple-500',
            title: 'Çoklu Ağ & Ücretsiz Transfer',
            description: 'TRC20, ERC20, BEP20 ağ desteği. NUSD kodu ile platform içi transferlerde sıfır komisyon, anında gönderim.'
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
        <div className="min-h-screen bg-white flex flex-col font-display relative overflow-hidden">

            {/* Decorative Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-100 rounded-full blur-3xl opacity-60" />
                <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-teal-100 rounded-full blur-3xl opacity-50" />
            </div>

            {/* Skip Button */}
            <div className="relative z-10 p-6 flex justify-end">
                <button
                    onClick={handleSkip}
                    className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
                >
                    Atla
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-8 pb-8">

                {/* Logo at top */}
                <div className="mb-10">
                    <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center shadow-xl shadow-gray-200/80 p-2 border border-gray-100">
                        <img src="/logo.png" alt="Nubit Logo" className="w-full h-full object-contain" />
                    </div>
                </div>

                {/* Slide Content */}
                <div className="text-center max-w-sm">
                    {/* Animated Icon */}
                    <div className="mb-8">
                        <div className={`w-20 h-20 mx-auto ${slides[currentSlide].iconBg} rounded-full flex items-center justify-center shadow-lg transform transition-all duration-500`}>
                            <span className="material-symbols-outlined text-4xl text-white">
                                {slides[currentSlide].icon}
                            </span>
                        </div>
                    </div>

                    {/* Title */}
                    <h1 className="text-3xl font-bold text-gray-900 mb-4 transition-all duration-300">
                        {slides[currentSlide].title}
                    </h1>

                    {/* Description */}
                    <p className="text-gray-500 text-base leading-relaxed mb-8 transition-all duration-300">
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
                                ? 'w-8 bg-emerald-500'
                                : 'w-2 bg-gray-200 hover:bg-gray-300'
                                }`}
                        />
                    ))}
                </div>

                {/* CTA Buttons */}
                <div className="w-full max-w-sm space-y-3">
                    <button
                        onClick={handleNext}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-4 px-8 rounded-2xl text-lg shadow-lg shadow-emerald-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {currentSlide === slides.length - 1 ? 'Başlayalım' : 'Devam'}
                    </button>

                    {currentSlide === slides.length - 1 && (
                        <div className="text-center pt-2">
                            <p className="text-gray-400 text-xs">
                                Devam ederek{' '}
                                <button onClick={() => navigate('/terms')} className="text-emerald-600 underline">
                                    Kullanım Koşulları
                                </button>
                                {' '}ve{' '}
                                <button onClick={() => navigate('/privacy')} className="text-emerald-600 underline">
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
                <div className="flex items-center justify-center gap-6 text-gray-400">
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-emerald-500">lock</span>
                        <span className="text-xs">256-bit SSL</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-emerald-500">verified</span>
                        <span className="text-xs">Güvenli</span>
                    </div>
                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                    <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-emerald-500">speed</span>
                        <span className="text-xs">Hızlı</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Welcome;
