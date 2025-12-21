import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';

const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useI18n();
    const { isDark } = useTheme();

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50">
            {/* Floating Island Container */}
            <div className="max-w-md mx-auto bg-white rounded-full shadow-2xl shadow-black/20 px-6 py-2 flex items-center justify-around relative">
                {/* Home */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`flex flex-col items-center p-2 rounded-2xl transition-all ${isActive('/dashboard') ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <span className="material-symbols-outlined text-2xl">home</span>
                </button>

                {/* QR Scanner - Center, Elevated */}
                <button
                    onClick={() => navigate('/qr-scan')}
                    className="absolute left-1/2 -translate-x-1/2 -top-4"
                >
                    <div className="w-14 h-14 bg-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:bg-emerald-500 transition-all active:scale-95 border-4 border-white">
                        <span className="material-symbols-outlined text-2xl text-white">qr_code_scanner</span>
                    </div>
                </button>

                {/* Spacer for center button */}
                <div className="w-14"></div>

                {/* Settings/Profile */}
                <button
                    onClick={() => navigate('/profile')}
                    className={`flex flex-col items-center p-2 rounded-2xl transition-all ${isActive('/profile') ? 'bg-emerald-100 text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <span className="material-symbols-outlined text-2xl">settings</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNav;
