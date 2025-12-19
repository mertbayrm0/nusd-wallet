import React from 'react';

interface AlertModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    onClose: () => void;
    confirmText?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
    isOpen,
    title,
    message,
    type = 'info',
    onClose,
    confirmText = 'Tamam'
}) => {
    if (!isOpen) return null;

    const getIcon = () => {
        switch (type) {
            case 'success':
                return { icon: 'check_circle', color: 'text-lime-400', bg: 'bg-lime-500/20' };
            case 'error':
                return { icon: 'error', color: 'text-red-400', bg: 'bg-red-500/20' };
            case 'warning':
                return { icon: 'warning', color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
            default:
                return { icon: 'info', color: 'text-blue-400', bg: 'bg-blue-500/20' };
        }
    };

    const { icon, color, bg } = getIcon();

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                {/* Icon */}
                <div className={`w-16 h-16 ${bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <span className={`material-symbols-outlined text-4xl ${color}`}>{icon}</span>
                </div>

                {/* Title */}
                <h2 className="text-white text-xl font-bold text-center mb-2">{title}</h2>

                {/* Message */}
                <p className="text-gray-400 text-center mb-6">{message}</p>

                {/* Button */}
                <button
                    onClick={onClose}
                    className={`w-full py-3 rounded-xl font-semibold text-black transition-all ${type === 'error'
                            ? 'bg-red-500 hover:bg-red-400'
                            : type === 'warning'
                                ? 'bg-yellow-500 hover:bg-yellow-400'
                                : 'bg-lime-400 hover:bg-lime-300'
                        }`}
                >
                    {confirmText}
                </button>
            </div>
        </div>
    );
};

export default AlertModal;
