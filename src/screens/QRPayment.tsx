import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';

const QRScanner: React.FC = () => {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [manualAddress, setManualAddress] = useState('');
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Start QR scanning
    const startScanning = async () => {
        try {
            const html5QrCode = new Html5Qrcode("qr-reader");
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                },
                (decodedText) => {
                    stopScanning();
                    handleScannedData(decodedText);
                },
                () => {
                    // Ignore scan errors
                }
            );
            setScanning(true);
        } catch (err) {
            console.error('Camera error:', err);
            alert('Kamera erişimi sağlanamadı. Lütfen kamera izni verin.');
        }
    };

    // Stop scanning
    const stopScanning = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current = null;
            } catch (err) {
                console.error('Stop error:', err);
            }
        }
        setScanning(false);
    };

    // Handle scanned data - navigate to withdraw with address
    const handleScannedData = (data: string) => {
        let address = data;

        // Parse nubit:// URL if present
        if (data.startsWith('nubit://pay?')) {
            try {
                const url = new URL(data);
                address = url.searchParams.get('to') || data;
            } catch {
                address = data;
            }
        }

        // Navigate to withdraw page with the address
        navigate(`/withdraw?address=${encodeURIComponent(address)}`);
    };

    // Handle manual input
    const handleManualSubmit = () => {
        if (manualAddress.trim()) {
            handleScannedData(manualAddress.trim());
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-800 to-emerald-900">
            {/* Header */}
            <div className="px-5 py-4 flex items-center gap-3">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-white/70 hover:text-white p-2 rounded-full transition-colors"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="font-bold text-xl text-white">QR Kod Tara</h1>
            </div>

            {/* Content */}
            <div className="px-5 pb-32">
                {/* Scanner Area */}
                <div className="bg-white rounded-3xl p-6 shadow-xl">
                    <div
                        id="qr-reader"
                        className={`rounded-2xl overflow-hidden ${scanning ? 'block' : 'hidden'}`}
                        style={{ minHeight: 300 }}
                    />

                    {!scanning && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-48 h-48 border-4 border-dashed border-emerald-300 rounded-3xl flex items-center justify-center mb-6 bg-emerald-50">
                                <span className="material-symbols-outlined text-7xl text-emerald-400">
                                    qr_code_scanner
                                </span>
                            </div>
                            <p className="text-gray-600 text-center mb-6">
                                NUSD adresi içeren QR kodu tarayın
                            </p>
                            <button
                                onClick={startScanning}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl transition-all flex items-center gap-2 shadow-lg"
                            >
                                <span className="material-symbols-outlined">photo_camera</span>
                                Kamerayı Başlat
                            </button>
                        </div>
                    )}

                    {scanning && (
                        <div className="mt-4 text-center">
                            <p className="text-gray-500 text-sm mb-3">QR kodu çerçeveye hizalayın</p>
                            <button
                                onClick={stopScanning}
                                className="text-red-500 font-semibold hover:text-red-600"
                            >
                                Taramayı Durdur
                            </button>
                        </div>
                    )}
                </div>

                {/* Manual Input */}
                <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                    <p className="text-white/70 text-sm text-center mb-3">veya manuel girin</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            placeholder="NUSD-XXXXXX"
                            className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/50 outline-none font-mono"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleManualSubmit();
                            }}
                        />
                        <button
                            onClick={handleManualSubmit}
                            className="bg-white text-emerald-800 px-4 rounded-xl font-bold hover:bg-emerald-50 transition-colors"
                        >
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="mt-6 text-center">
                    <p className="text-white/50 text-xs">
                        Taranan adres otomatik olarak gönderim sayfasına aktarılır
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
