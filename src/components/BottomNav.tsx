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
        <div className={`fixed bottom-0 left-0 right-0 border-t px-6 pb-safe z-50 ${isDark ? 'bg-[#1a1a1a] border-white/10' : 'bg-emerald-50 border-emerald-100 shadow-lg'}`}>
            <div className="max-w-md mx-auto flex items-end justify-around py-3">
                {/* Home/Dashboard */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/dashboard') ? 'text-emerald-500' : isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <div className={`p-3 rounded-2xl transition-all ${isActive('/dashboard') ? 'bg-emerald-500/20' : 'bg-transparent'
                        }`}>
                        <span className="material-symbols-outlined text-2xl">home</span>
                    </div>
                    <span className="text-xs font-medium">{t('nav.home')}</span>
                </button>

                {/* QR Scanner - Center, Elevated */}
                <button
                    onClick={() => navigate('/qr-scan')}
                    className="flex flex-col items-center -mt-6"
                >
                    <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/50 hover:bg-emerald-400 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-4xl text-white">qr_code_scanner</span>
                    </div>
                    <span className="text-xs font-medium text-emerald-500 mt-2">{t('nav.scan')}</span>
                </button>

                {/* Settings/Profile */}
                <button
                    onClick={() => navigate('/profile')}
                    className={`flex flex-col items-center gap-1 transition-all ${isActive('/profile') ? 'text-emerald-500' : isDark ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <div className={`p-3 rounded-2xl transition-all ${isActive('/profile') ? 'bg-emerald-500/20' : 'bg-transparent'
                        }`}>
                        <span className="material-symbols-outlined text-2xl">settings</span>
                    </div>
                    <span className="text-xs font-medium">{t('nav.settings')}</span>
                </button>
            </div>
        </div>
    );
};

export default BottomNav;
