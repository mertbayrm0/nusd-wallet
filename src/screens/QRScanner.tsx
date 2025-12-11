import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const QRScanner: React.FC = () => {
    const navigate = useNavigate();
    const [scannedData, setScannedData] = useState('');

    const handleManualInput = () => {
        if (scannedData.trim()) {
            // Navigate to appropriate screen based on scanned data
            // For now, just show alert
            alert(`QR verisi: ${scannedData}`);
        }
    };

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col">
            {/* Header */}
            <div className="bg-[#1a1a1a] px-5 py-4 flex items-center gap-3 shadow-lg border-b border-white/5">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-400 hover:text-lime-400 hover:bg-lime-400/10 p-2 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="font-extrabold text-lg text-white">QR Kod Tara</h1>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8">
                {/* QR Scanner Frame */}
                <div className="relative w-full max-w-sm aspect-square mb-8">
                    <div className="absolute inset-0 border-4 border-lime-500 rounded-3xl bg-lime-500/5 flex items-center justify-center">
                        <div className="text-center">
                            <span className="material-symbols-outlined text-8xl text-lime-500 mb-4 animate-pulse">
                                qr_code_scanner
                            </span>
                            <p className="text-gray-400 text-sm">
                                QR Kodu Kameranın Önüne Tutun
                            </p>
                        </div>
                    </div>

                    {/* Corner Decorations */}
                    <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-lime-500 rounded-tl-3xl"></div>
                    <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-lime-500 rounded-tr-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-lime-500 rounded-bl-3xl"></div>
                    <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-lime-500 rounded-br-3xl"></div>
                </div>

                {/* Manual Input */}
                <div className="w-full max-w-sm">
                    <p className="text-gray-500 text-sm text-center mb-4">veya manuel girin:</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={scannedData}
                            onChange={(e) => setScannedData(e.target.value)}
                            placeholder="Cüzdan adresi veya ödeme kodu"
                            className="flex-1 px-4 py-3 rounded-xl border border-white/10 bg-[#1a1a1a] text-white placeholder-gray-600 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none"
                        />
                        <button
                            onClick={handleManualInput}
                            className="bg-lime-500 hover:bg-lime-400 text-black p-3 rounded-xl transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-8 text-center">
                    <p className="text-gray-600 text-xs">
                        Güvenli ödeme yapmak için QR kod tarayın
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
