import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../services/supabase';

type Tab = 'receive' | 'pay';

const QRPayment: React.FC = () => {
    const navigate = useNavigate();
    const { user, session } = useApp();
    const [activeTab, setActiveTab] = useState<Tab>('receive');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [copied, setCopied] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [scannedData, setScannedData] = useState<string | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [nusdAddress, setNusdAddress] = useState('NUSD-LOADING');

    // Fetch real NUSD address from database
    useEffect(() => {
        const fetchNusdAddress = async () => {
            if (!session?.user?.id) return;

            const { data } = await supabase
                .from('profiles')
                .select('nusd_address')
                .eq('id', session.user.id)
                .single();

            if (data?.nusd_address) {
                setNusdAddress(data.nusd_address);
            } else {
                setNusdAddress('NUSD-000000');
            }
        };

        fetchNusdAddress();
    }, [session]);

    // Generate QR data
    const generateQRData = () => {
        let data = `nubit://pay?to=${nusdAddress}`;
        if (amount) data += `&amount=${amount}`;
        if (note) data += `&note=${encodeURIComponent(note)}`;
        return data;
    };

    // Copy address
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(nusdAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

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
                    setScannedData(decodedText);
                    stopScanning();
                    handleScannedData(decodedText);
                },
                (errorMessage) => {
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

    // Handle scanned data
    const handleScannedData = (data: string) => {
        // Parse nubit:// URL or plain address
        if (data.startsWith('nubit://pay?')) {
            const url = new URL(data);
            const to = url.searchParams.get('to');
            const amt = url.searchParams.get('amount');
            const nt = url.searchParams.get('note');

            if (to) {
                // Navigate to send screen with prefilled data
                navigate(`/send?to=${to}${amt ? `&amount=${amt}` : ''}${nt ? `&note=${nt}` : ''}`);
            }
        } else if (data.startsWith('NUSD-')) {
            // Direct NUSD address
            navigate(`/send?to=${data}`);
        } else {
            alert(`Tanınmayan QR kodu: ${data}`);
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
                <h1 className="font-bold text-xl text-white">QR Ödeme</h1>
            </div>

            {/* Tabs */}
            <div className="px-5 mb-6">
                <div className="flex bg-white/10 rounded-2xl p-1">
                    <button
                        onClick={() => { setActiveTab('receive'); stopScanning(); }}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'receive'
                            ? 'bg-white text-emerald-800'
                            : 'text-white/70 hover:text-white'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg align-middle mr-1">qr_code_2</span>
                        Para Al
                    </button>
                    <button
                        onClick={() => setActiveTab('pay')}
                        className={`flex-1 py-3 rounded-xl font-semibold transition-all ${activeTab === 'pay'
                            ? 'bg-white text-emerald-800'
                            : 'text-white/70 hover:text-white'
                            }`}
                    >
                        <span className="material-symbols-outlined text-lg align-middle mr-1">qr_code_scanner</span>
                        Ödeme Yap
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="px-5 pb-32">
                {activeTab === 'receive' ? (
                    /* RECEIVE TAB - QR Generate */
                    <div className="space-y-6">
                        {/* QR Code Card */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl">
                            <div className="flex justify-center mb-4">
                                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 rounded-2xl">
                                    <QRCodeSVG
                                        value={generateQRData()}
                                        size={200}
                                        bgColor="#ffffff"
                                        fgColor="#065f46"
                                        level="H"
                                        includeMargin={false}
                                    />
                                </div>
                            </div>

                            {/* NUSD Address */}
                            <div className="text-center mb-4">
                                <p className="text-gray-500 text-sm mb-1">NUSD Adresiniz</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="font-mono font-bold text-emerald-700 text-lg">
                                        {nusdAddress}
                                    </span>
                                    <button
                                        onClick={handleCopy}
                                        className="p-2 rounded-lg hover:bg-emerald-100 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-emerald-600">
                                            {copied ? 'check' : 'content_copy'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Amount Input */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-gray-600 text-sm mb-2">
                                        Tutar (Opsiyonel)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold">₺</span>
                                        <input
                                            type="number"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none text-lg font-semibold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-gray-600 text-sm mb-2">
                                        Not (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        value={note}
                                        onChange={(e) => setNote(e.target.value)}
                                        placeholder="Örn: Kahve ödemesi"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-emerald-500 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Share Button */}
                        <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg">
                            <span className="material-symbols-outlined">share</span>
                            QR Kodu Paylaş
                        </button>
                    </div>
                ) : (
                    /* PAY TAB - QR Scan */
                    <div className="space-y-6">
                        {/* Scanner Area */}
                        <div className="bg-white rounded-3xl p-6 shadow-xl">
                            <div id="qr-reader" className={`rounded-2xl overflow-hidden ${scanning ? 'block' : 'hidden'}`} style={{ minHeight: 300 }}></div>

                            {!scanning && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="w-48 h-48 border-4 border-dashed border-emerald-300 rounded-3xl flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-7xl text-emerald-400">
                                            qr_code_scanner
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-center mb-6">
                                        QR kodu taramak için kamerayı başlatın
                                    </p>
                                    <button
                                        onClick={startScanning}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-2xl transition-all flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">photo_camera</span>
                                        Kamerayı Başlat
                                    </button>
                                </div>
                            )}

                            {scanning && (
                                <div className="mt-4 text-center">
                                    <button
                                        onClick={stopScanning}
                                        className="text-red-500 font-semibold"
                                    >
                                        Taramayı Durdur
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Manual Input */}
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                            <p className="text-white/70 text-sm text-center mb-3">veya manuel girin</p>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="NUSD-XXXX veya ödeme kodu"
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/50 focus:border-white/50 outline-none"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const input = e.currentTarget.value;
                                            if (input.trim()) handleScannedData(input.trim());
                                        }
                                    }}
                                />
                                <button className="bg-white text-emerald-800 px-4 rounded-xl font-bold">
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </button>
                            </div>
                        </div>

                        {/* Recent Scans */}
                        <div className="space-y-2">
                            <h3 className="text-white/70 text-sm font-semibold">Son Ödemeler</h3>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center text-white/50">
                                Henüz QR ödeme kaydı yok
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default QRPayment;
