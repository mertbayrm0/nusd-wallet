import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-white/10 px-6 pb-safe z-50">
            <div className="max-w-md mx-auto flex items-end justify-around py-3">
                {/* Home/Dashboard */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard') ? 'text-lime-500' : 'text-gray-500 hover:text-gray-400'
                        }`}
                >
                    <div className={`p-3 rounded-2xl transition-all ${isActive('/dashboard') ? 'bg-lime-500/20' : 'bg-transparent'
                        }`}>
                        <span className="material-symbols-outlined text-2xl">home</span>
                    </div>
                    <span className="text-xs font-medium">Ana Sayfa</span>
                </button>

                {/* QR Scanner - Center, Elevated */}
                <button
                    onClick={() => navigate('/qr-scan')}
                    className="flex flex-col items-center -mt-6"
                >
                    <div className="w-16 h-16 bg-lime-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-lime-500/50 hover:bg-lime-400 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-4xl text-black">qr_code_scanner</span>
                    </div>
                    <span className="text-xs font-medium text-lime-500 mt-2">Tara</span>
                </button>

                {/* Settings/Profile */}
                <button
                    onClick={() => navigate('/profile')}
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/profile') ? 'text-lime-500' : 'text-gray-500 hover:text-gray-400'
                        }`}
                >
                    <div className={`p-3 rounded-2xl transition-all ${isActive('/profile') ? 'bg-lime-500/20' : 'bg-transparent'
                        }`}>
                        <span className="material-symbols-outlined text-2xl">settings</span>
                    </div>
                    <span className="text-xs font-medium">Ayarlar</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNav;
