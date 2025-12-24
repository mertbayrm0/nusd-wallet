import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { supabase } from '../services/supabase';
import { QRCodeSVG } from 'qrcode.react';

// Crypto Deposit onboarding steps - targetId ile hangi alanın vurgulanacağını belirliyoruz
const cryptoDepositOnboardingSteps = [
    {
        icon: 'wallet',
        title: 'NUSD Cüzdan Adresi',
        message: 'Cüzdanlar arası Nubit Wallet token\'dır. 1 NUSD = 1 USDT\'dir. İstediğiniz ağ üzerinden transfer gerçekleştirebilirsiniz.',
        buttonText: 'Anladım',
        targetId: 'nusd-address-section'
    },
    {
        icon: 'tag',
        title: 'Hash Kodu Onayı',
        message: 'Cüzdanınıza yaptığınız transferin hash kodunu yapıştırıp onaylamanız gerekmektedir. Bu sayede işleminiz hızlıca onaylanır.',
        buttonText: 'Başlayalım!',
        targetId: 'hash-section'
    }
];

const CryptoDeposit = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useApp();
    const [network, setNetwork] = useState('TRC20');
    const [copied, setCopied] = useState<'address' | 'memo' | null>(null);
    const [amount, setAmount] = useState('');
    const [txHash, setTxHash] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);

    const VAULT_ADDRESS = 'TAeaxxAUqqpdKJmvg9JPHajTNQLRfwdJ3F';

    // NUSD kodunu user.nusd_code'dan al, yoksa fallback üret
    const memoCode = user?.nusd_code || (() => {
        if (!user?.email) return 'NUSD-XXXX';
        const hash = user.email.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);
        const code = Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
        return `NUSD-${code}`;
    })();

    // Sayfa yüklendiğinde user'ı yenile (güncel nusd_code için)
    useEffect(() => {
        refreshUser?.();
    }, []);

    // Check onboarding for crypto deposit page
    useEffect(() => {
        if (user?.id) {
            const cryptoDepositOnboardingComplete = localStorage.getItem(`cryptoDepositOnboardingComplete_${user.id}`);
            if (!cryptoDepositOnboardingComplete) {
                const timer = setTimeout(() => setShowOnboarding(true), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [user]);

    const handleOnboardingNext = () => {
        if (onboardingStep < cryptoDepositOnboardingSteps.length - 1) {
            setOnboardingStep(onboardingStep + 1);
        } else {
            if (user?.id) {
                localStorage.setItem(`cryptoDepositOnboardingComplete_${user.id}`, 'true');
            }
            setShowOnboarding(false);
        }
    };

    const handleSkipOnboarding = () => {
        if (user?.id) {
            localStorage.setItem(`cryptoDepositOnboardingComplete_${user.id}`, 'true');
        }
        setShowOnboarding(false);
    };

    const copyToClipboard = (text: string, type: 'address' | 'memo') => {
        navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) < 10) {
            alert('Minimum deposit is 10 USDT');
            return;
        }
        setSubmitting(true);
        try {
            // Call Edge Function instead of direct DB write
            const { data, error } = await supabase.functions.invoke('deposit-request', {
                body: {
                    amount: parseFloat(amount),
                    asset: network, // TRC20, ERC20, BEP20
                    tx_hash: txHash || null
                }
            });

            if (error) {
                alert(error.message || 'Failed to submit deposit notification');
            } else if (data?.success) {
                setSuccess(true);
            } else {
                alert(data?.error || 'Failed to submit deposit notification');
            }
        } catch (err) {
            alert('Connection error');
        }
        setSubmitting(false);
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display">
                <div className="px-4 py-4 flex items-center sticky top-0 z-10">
                    <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <span className="material-symbols-outlined text-white">arrow_back</span>
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Deposit USDT</h1>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-sm">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Deposit Submitted!</h2>
                        <p className="text-gray-500 mb-6">Your deposit notification has been submitted. An admin will verify and approve it shortly.</p>
                        <button onClick={() => navigate('/dashboard')} className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-bold transition-colors">
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display">
            {/* Onboarding Spotlight Overlay */}
            {showOnboarding && (
                <>
                    {/* Semi-transparent overlay - click to skip */}
                    <div
                        className="fixed inset-0 bg-black/60 z-[99]"
                        onClick={handleSkipOnboarding}
                    />

                    {/* Tooltip Popup - positioned based on step */}
                    <div
                        className={`fixed z-[102] max-w-xs w-[90%] transition-all duration-300 ${cryptoDepositOnboardingSteps[onboardingStep]?.targetId === 'nusd-address-section'
                            ? 'top-[200px] left-1/2 -translate-x-1/2' // Near NUSD address
                            : cryptoDepositOnboardingSteps[onboardingStep]?.targetId === 'hash-section'
                                ? 'top-[420px] left-1/2 -translate-x-1/2' // Near hash section
                                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' // Centered
                            }`}
                    >
                        <div className="bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-2xl p-5 border border-emerald-500/50 shadow-2xl">
                            {/* Arrow pointing down to target */}
                            {cryptoDepositOnboardingSteps[onboardingStep]?.targetId && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-900 rotate-45 border-r border-b border-emerald-500/50" />
                            )}

                            {/* Progress dots */}
                            <div className="flex justify-center gap-1.5 mb-4">
                                {cryptoDepositOnboardingSteps.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all ${idx === onboardingStep ? 'bg-lime-400 w-4' : 'bg-emerald-600 w-1.5'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Icon + Title Row */}
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-xl bg-lime-400/20 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-lime-400 text-xl">
                                        {cryptoDepositOnboardingSteps[onboardingStep].icon}
                                    </span>
                                </div>
                                <h3 className="text-white text-base font-bold">
                                    {cryptoDepositOnboardingSteps[onboardingStep].title}
                                </h3>
                            </div>

                            {/* Message */}
                            <p className="text-emerald-200/80 text-sm leading-relaxed mb-4 pl-[52px]">
                                {cryptoDepositOnboardingSteps[onboardingStep].message}
                            </p>

                            {/* Buttons */}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSkipOnboarding}
                                    className="flex-1 py-2.5 rounded-xl text-emerald-300 text-xs font-medium hover:bg-emerald-700/50 transition-colors"
                                >
                                    Atla
                                </button>
                                <button
                                    onClick={handleOnboardingNext}
                                    className="flex-1 py-2.5 rounded-xl bg-lime-400 text-emerald-900 font-bold text-xs hover:bg-lime-300 transition-colors"
                                >
                                    {cryptoDepositOnboardingSteps[onboardingStep].buttonText}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className="px-4 py-4 flex items-center sticky top-0 z-10">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Deposit USDT</h1>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
                {/* Network Selection */}
                <div>
                    <h3 className="font-bold text-emerald-300 mb-2 text-sm">Select Network</h3>
                    <div className="grid grid-cols-3 gap-2 bg-white p-1 rounded-xl shadow">
                        {['TRC20', 'ERC20', 'BEP20'].map(net => (
                            <button
                                key={net}
                                onClick={() => setNetwork(net)}
                                className={`py-2 rounded-lg text-sm font-bold transition-all ${network === net ? 'bg-emerald-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                            >
                                {net}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Wallet Address */}
                <div className="bg-white rounded-2xl p-4 shadow-lg">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">Deposit Address ({network})</p>
                    <div
                        className="bg-gray-100 rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => copyToClipboard(VAULT_ADDRESS, 'address')}
                    >
                        <p className="font-mono text-gray-900 font-medium text-sm truncate mr-2">{VAULT_ADDRESS}</p>
                        <span className={`material-symbols-outlined transition-colors ${copied === 'address' ? 'text-emerald-500' : 'text-emerald-600'}`}>
                            {copied === 'address' ? 'check' : 'content_copy'}
                        </span>
                    </div>
                </div>

                {/* MEMO Code with QR */}
                <div
                    id="nusd-address-section"
                    className={`bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl p-4 border border-emerald-500/30 relative ${showOnboarding && cryptoDepositOnboardingSteps[onboardingStep]?.targetId === 'nusd-address-section' ? 'z-[101] ring-2 ring-lime-400 ring-offset-2 ring-offset-emerald-900' : ''}`}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-emerald-400 text-lg">tag</span>
                        <p className="text-xs text-emerald-300 font-bold uppercase tracking-wide">Your NUSD Address (Important!)</p>
                    </div>

                    {/* QR Code */}
                    <div className="flex justify-center mb-4">
                        <div className="bg-white p-3 rounded-xl shadow">
                            <QRCodeSVG
                                value={memoCode}
                                size={140}
                                bgColor="#ffffff"
                                fgColor="#065f46"
                                level="H"
                            />
                        </div>
                    </div>

                    {/* NUSD Code */}
                    <div
                        className="bg-white rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 border border-emerald-200 shadow"
                        onClick={() => copyToClipboard(memoCode, 'memo')}
                    >
                        <p className="font-mono text-gray-900 font-bold text-lg tracking-widest">{memoCode}</p>
                        <span className={`material-symbols-outlined transition-colors ${copied === 'memo' ? 'text-emerald-500' : 'text-emerald-600'}`}>
                            {copied === 'memo' ? 'check' : 'content_copy'}
                        </span>
                    </div>
                    <p className="text-xs text-emerald-300/80 mt-2 text-center">Bu QR'ı veya NUSD kodunu paylaşarak ödeme alabilirsiniz.</p>
                </div>

                {/* Deposit Notification Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 shadow-lg space-y-4">
                    <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg text-emerald-500">receipt_long</span>
                        Notify Deposit
                    </h3>

                    <div>
                        <label className="block text-xs text-gray-500 font-bold mb-1">Amount (USDT)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.00"
                            min="10"
                            step="0.01"
                            required
                            className="w-full border border-gray-200 bg-white rounded-xl p-3 text-lg text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400"
                        />
                    </div>

                    <div
                        id="hash-section"
                        className={`relative ${showOnboarding && cryptoDepositOnboardingSteps[onboardingStep]?.targetId === 'hash-section' ? 'z-[101] ring-2 ring-lime-400 ring-offset-2 ring-offset-white rounded-xl' : ''}`}
                    >
                        <label className="block text-xs text-gray-500 font-bold mb-1">Transaction Hash (Optional)</label>
                        <input
                            type="text"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            placeholder="Paste TX hash..."
                            className="w-full border border-gray-200 bg-white rounded-xl p-3 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-gray-400"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !amount}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-white py-3 rounded-xl font-bold disabled:opacity-50 transition-colors shadow-lg shadow-emerald-500/20"
                    >
                        {submitting ? 'Submitting...' : 'Submit Deposit Notification'}
                    </button>
                </form>

                {/* Warning */}
                <div className="bg-white rounded-xl p-4 flex gap-3 shadow-lg">
                    <span className="material-symbols-outlined text-amber-500 shrink-0">warning</span>
                    <div className="text-gray-600 text-sm">
                        <p className="font-bold mb-1 text-gray-900">Important:</p>
                        <ul className="list-disc list-inside space-y-1 text-gray-500">
                            <li>Send only <span className="font-bold text-gray-700">USDT ({network})</span></li>
                            <li>Include your <span className="font-bold text-gray-700">MEMO code</span></li>
                            <li>Minimum deposit: <span className="font-bold text-gray-700">10.00 USDT</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default CryptoDeposit;