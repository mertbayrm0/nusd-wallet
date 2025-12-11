import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Merchant {
    id: string;
    slug: string;
    name: string;
    logo: string | null;
    primaryColor: string;
    departmentName: string;
    vaultAddress: string | null;
    vaultId: string | null;
}

const MerchantPayment = () => {
    const { slug } = useParams<{ slug: string }>();

    const [merchant, setMerchant] = useState<Merchant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [amount, setAmount] = useState('');
    const [email, setEmail] = useState('');
    const [network, setNetwork] = useState('TRC20');
    const [copied, setCopied] = useState(false);
    const [step, setStep] = useState(1); // 1: Enter amount, 2: Payment details, 3: Success
    const [confirming, setConfirming] = useState(false);

    const API_URL = 'https://nusd-wallet-production.up.railway.app/api';

    useEffect(() => {
        fetchMerchant();
    }, [slug]);

    const fetchMerchant = async () => {
        try {
            const res = await fetch(`${API_URL}/merchant/${slug}`);
            if (!res.ok) {
                setError('Merchant not found');
                setLoading(false);
                return;
            }
            const data = await res.json();
            setMerchant(data);
        } catch {
            setError('Connection error');
        }
        setLoading(false);
    };

    const copyAddress = () => {
        if (merchant?.vaultAddress) {
            navigator.clipboard.writeText(merchant.vaultAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const confirmPayment = async () => {
        if (!amount || !merchant) return;
        setConfirming(true);

        try {
            const res = await fetch(`${API_URL}/merchant/${slug}/payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    email: email || 'anonymous',
                    network
                })
            });

            if (res.ok) {
                setStep(3);
            } else {
                const err = await res.json();
                alert(err.error || 'Payment confirmation failed');
            }
        } catch {
            alert('Connection error');
        }
        setConfirming(false);
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-lime-500/30 border-t-lime-500 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-400">Yükleniyor...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !merchant) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center text-white px-6">
                <div className="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-red-500">error</span>
                </div>
                <h1 className="text-2xl font-bold mb-3">Merchant Bulunamadı</h1>
                <p className="text-gray-400 text-center max-w-sm">Bu ödeme portalı mevcut değil veya devre dışı bırakılmış.</p>
            </div>
        );
    }

    // Success state
    if (step === 3) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center text-white px-6">
                <div
                    className="w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-pulse"
                    style={{ backgroundColor: `${merchant.primaryColor}20` }}
                >
                    <span className="material-symbols-outlined text-5xl" style={{ color: merchant.primaryColor }}>check_circle</span>
                </div>
                <h1 className="text-2xl font-bold mb-3">Ödeme Bildirildi!</h1>
                <p className="text-gray-400 text-center mb-8 max-w-sm">
                    <span className="font-bold text-white">{merchant.name}</span>'a <span className="text-lime-400 font-bold">${amount} USDT</span> ödemeniz onay için gönderildi.
                </p>
                <div className="bg-white/5 rounded-2xl p-6 w-full max-w-sm border border-white/10 backdrop-blur-xl">
                    <div className="flex items-center gap-3 text-sm">
                        <span className="material-symbols-outlined text-amber-400">schedule</span>
                        <span className="text-gray-300">Onay süresi: ~5-15 dakika</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
            {/* Animated gradient header */}
            <div
                className="h-1.5"
                style={{ background: `linear-gradient(90deg, ${merchant.primaryColor}, ${merchant.primaryColor}60, ${merchant.primaryColor})` }}
            />

            <div className="max-w-md mx-auto px-6 py-10">
                {/* Merchant Branding */}
                <div className="text-center mb-10">
                    <div
                        className="w-20 h-20 rounded-3xl mx-auto mb-5 flex items-center justify-center text-3xl font-black shadow-2xl"
                        style={{
                            background: `linear-gradient(135deg, ${merchant.primaryColor}40, ${merchant.primaryColor}10)`,
                            border: `2px solid ${merchant.primaryColor}40`,
                            color: merchant.primaryColor
                        }}
                    >
                        {merchant.logo ? (
                            <img src={merchant.logo} alt={merchant.name} className="w-full h-full object-cover rounded-3xl" />
                        ) : (
                            merchant.name.charAt(0)
                        )}
                    </div>
                    <h1 className="text-3xl font-black tracking-tight">{merchant.name}</h1>
                    <p className="text-gray-500 text-sm font-medium mt-1">USDT Ödeme Portalı</p>
                </div>

                {/* Step 1: Amount Entry */}
                {step === 1 && (
                    <div className="space-y-5">
                        {/* Amount Card */}
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10 backdrop-blur-xl">
                            <label className="block text-xs text-gray-500 mb-3 font-bold uppercase tracking-widest">
                                Ödeme Tutarı
                            </label>
                            <div className="flex items-baseline gap-3">
                                <span className="text-2xl font-black" style={{ color: merchant.primaryColor }}>$</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="flex-1 bg-transparent text-5xl font-black outline-none placeholder:text-gray-700 w-full"
                                    style={{ fontVariantNumeric: 'tabular-nums' }}
                                />
                            </div>
                            <div className="text-right text-gray-500 text-sm mt-2">USDT</div>
                        </div>

                        {/* Email (Optional) */}
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                            <label className="block text-xs text-gray-500 mb-2 font-bold uppercase tracking-widest">
                                E-posta <span className="text-gray-600">(isteğe bağlı)</span>
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="ornek@email.com"
                                className="w-full bg-transparent outline-none text-white text-lg"
                            />
                        </div>

                        {/* Network Selection */}
                        <div className="bg-white/5 rounded-2xl p-5 border border-white/10">
                            <label className="block text-xs text-gray-500 mb-4 font-bold uppercase tracking-widest">
                                Ağ Seçimi
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'TRC20', label: 'TRC20', sub: 'Tron' },
                                    { id: 'ERC20', label: 'ERC20', sub: 'Ethereum' },
                                    { id: 'BEP20', label: 'BEP20', sub: 'BSC' }
                                ].map(net => (
                                    <button
                                        key={net.id}
                                        onClick={() => setNetwork(net.id)}
                                        className={`py-4 px-2 rounded-xl font-bold text-sm transition-all flex flex-col items-center gap-1 ${network === net.id
                                                ? 'text-black shadow-lg'
                                                : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                                            }`}
                                        style={network === net.id ? { backgroundColor: merchant.primaryColor } : {}}
                                    >
                                        <span className="font-black">{net.label}</span>
                                        <span className={`text-[10px] ${network === net.id ? 'text-black/60' : 'text-gray-600'}`}>{net.sub}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Continue Button */}
                        <button
                            onClick={() => setStep(2)}
                            disabled={!amount || parseFloat(amount) <= 0}
                            className="w-full py-5 rounded-2xl font-black text-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                                backgroundColor: merchant.primaryColor,
                                color: '#000'
                            }}
                        >
                            Devam Et
                        </button>
                    </div>
                )}

                {/* Step 2: Payment Details */}
                {step === 2 && (
                    <div className="space-y-5">
                        {/* Summary */}
                        <div
                            className="rounded-3xl p-6 border"
                            style={{
                                background: `linear-gradient(135deg, ${merchant.primaryColor}15, transparent)`,
                                borderColor: `${merchant.primaryColor}30`
                            }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-gray-400 text-sm">Ödeme Tutarı</span>
                                <span className="text-3xl font-black" style={{ color: merchant.primaryColor }}>${amount}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-sm">Ağ</span>
                                <span className="font-bold bg-white/10 px-3 py-1 rounded-lg text-sm">{network}</span>
                            </div>
                        </div>

                        {/* Vault Address */}
                        <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                            <label className="block text-xs text-gray-500 mb-3 font-bold uppercase tracking-widest">
                                USDT Gönderilecek Adres
                            </label>
                            <div className="bg-black/50 rounded-2xl p-4 font-mono text-sm break-all text-center border border-white/5">
                                {merchant.vaultAddress || 'Vault adresi bulunamadı'}
                            </div>
                            <button
                                onClick={copyAddress}
                                className="w-full mt-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/5"
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {copied ? 'check' : 'content_copy'}
                                </span>
                                {copied ? 'Kopyalandı!' : 'Adresi Kopyala'}
                            </button>
                        </div>

                        {/* Warning */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex gap-4">
                            <span className="material-symbols-outlined text-amber-400 text-2xl shrink-0">warning</span>
                            <div>
                                <p className="text-amber-300 font-bold text-sm mb-1">Dikkat!</p>
                                <p className="text-amber-200/70 text-xs leading-relaxed">
                                    Lütfen tam olarak <span className="font-bold text-amber-300">${amount} USDT</span> gönderin.
                                    <span className="font-bold text-amber-300"> {network}</span> ağını kullandığınızdan emin olun.
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setStep(1)}
                                className="flex-1 py-4 rounded-2xl font-bold bg-white/5 text-gray-400 hover:bg-white/10 transition-all border border-white/5"
                            >
                                ← Geri
                            </button>
                            <button
                                onClick={confirmPayment}
                                disabled={confirming}
                                className="flex-1 py-4 rounded-2xl font-black transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
                                style={{
                                    backgroundColor: merchant.primaryColor,
                                    color: '#000'
                                }}
                            >
                                {confirming ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                                        Gönderiliyor
                                    </>
                                ) : (
                                    'Ödemeyi Onayla ✓'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-gray-600 mt-12 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm text-lime-500">verified</span>
                    <span>Powered by <span className="text-lime-500 font-bold">NUSD Wallet</span></span>
                </div>
            </div>
        </div>
    );
};

export default MerchantPayment;
