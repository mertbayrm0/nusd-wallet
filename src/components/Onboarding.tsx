import React, { useState } from 'react';

interface OnboardingProps {
    onComplete: () => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            icon: '/onboarding/icon1.png',
            title: 'NUSD Wallet\'a Hoş Geldiniz',
            description: 'P2P kripto para cüzdanınız ile USDT yatırma ve çekme işlemlerinizi güvenle yapın.',
            features: [
                'TRC20, ERC20, BEP20 desteği',
                'Anlık bakiye güncellemeleri',
                'Kolay ve hızlı işlemler'
            ]
        },
        {
            icon: '/onboarding/icon2.png',
            title: 'Blockchain Güvenliği',
            description: 'Tüm işlemleriniz blockchain üzerinden doğrulanır ve güvenli şekilde saklanır.',
            features: [
                'TronGrid API doğrulama',
                'HTTPS şifreli bağlantı',
                'Private key\'ler asla paylaşılmaz'
            ]
        },
        {
            icon: '/onboarding/icon3.png',
            title: 'Hızlı Transferler',
            description: 'Banka transferleri ve kripto işlemlerinizi kolayca yönetin. Admin onayı ile hızlı çekimler.',
            features: [
                'P2P banka transferleri',
                'Gerçek zamanlı işlem takibi',
                'Detaylı işlem geçmişi'
            ]
        }
    ];

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            localStorage.setItem('onboardingCompleted', 'true');
            onComplete();
        }
    };

    const handleSkip = () => {
        localStorage.setItem('onboardingCompleted', 'true');
        onComplete();
    };

    const slide = slides[currentSlide];

    return (
        <div className="fixed inset-0 bg-[#111111] z-50 flex flex-col">
            {/* Skip Button */}
            {currentSlide < slides.length - 1 && (
                <button
                    onClick={handleSkip}
                    className="absolute top-6 right-6 text-gray-500 hover:text-lime-400 font-medium text-sm transition-colors"
                >
                    Atla
                </button>
            )}

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
                {/* Icon */}
                <div className="mb-8 animate-fade-in">
                    <img
                        src={slide.icon}
                        alt={slide.title}
                        className="w-48 h-48 object-contain"
                    />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-white text-center mb-4 animate-slide-up">
                    {slide.title}
                </h1>

                {/* Description */}
                <p className="text-gray-400 text-center max-w-md mb-8 text-lg leading-relaxed animate-slide-up animation-delay-100">
                    {slide.description}
                </p>

                {/* Features */}
                <div className="space-y-3 mb-12 w-full max-w-sm animate-slide-up animation-delay-200">
                    {slide.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-4 border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-lime-500 shrink-0"></div>
                            <span className="text-gray-300 text-sm">{feature}</span>
                        </div>
                    ))}
                </div>

                {/* Dots Indicator */}
                <div className="flex gap-2 mb-8">
                    {slides.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 rounded-full transition-all ${index === currentSlide
                                    ? 'w-8 bg-lime-500'
                                    : 'w-2 bg-gray-700'
                                }`}
                        />
                    ))}
                </div>

                {/* Next Button */}
                <button
                    onClick={handleNext}
                    className="bg-lime-500 hover:bg-lime-400 text-black font-bold py-4 px-12 rounded-xl text-lg shadow-xl shadow-lime-500/20 transition-all active:scale-95"
                >
                    {currentSlide === slides.length - 1 ? 'Başlayalım' : 'Devam'}
                </button>
            </div>

            <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out;
        }

        .animation-delay-100 {
          animation-delay: 0.1s;
          opacity: 0;
          animation-fill-mode: forwards;
        }

        .animation-delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
          animation-fill-mode: forwards;
        }
      `}</style>
        </div>
    );
};

export default Onboarding;
