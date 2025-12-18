import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../App';
import SuccessModal from '../components/SuccessModal';

interface BankAccount {
    id: string;
    bankName: string;
    iban: string;
}

const DepositConfirmation = () => {
    const navigate = useNavigate();
    const { state } = useLocation();
    const { user } = useApp();
    const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
    const [investorData, setInvestorData] = useState<{ name: string; bankAccount: BankAccount | null }>({ name: '', bankAccount: null });
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [buyRate, setBuyRate] = useState<number>(32.5); // Dynamic buy rate from database

    const totalTime = 1200; // 20 minutes in seconds

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Load exchange rate from database
    useEffect(() => {
        const loadRate = async () => {
            const rateData = await api.getExchangeRate();
            if (rateData?.buy_rate) {
                setBuyRate(rateData.buy_rate);
            }
        };
        loadRate();
    }, []);

    useEffect(() => {
        const loadInvestor = async () => {
            if (state?.matchDetails) {
                // Use passed details directly
                setInvestorData({
                    name: state.matchDetails.sellerName,
                    bankAccount: {
                        id: 'temp_p2p',
                        bankName: state.matchDetails.sellerBank,
                        iban: state.matchDetails.sellerIBAN
                    }
                });
            } else if (state?.matchedInvestorEmail) {
                // Fallback for direct links (if any)
                const investorUser = await api.getUser(state.matchedInvestorEmail);
                const accounts = await api.getBankAccounts(state.matchedInvestorEmail);
                setInvestorData({
                    name: investorUser?.name || 'Unknown',
                    bankAccount: accounts[0] || null
                });
            }
        };
        loadInvestor();
    }, [state]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return { m: m.toString().padStart(2, '0'), s: s.toString().padStart(2, '0') };
    };

    const time = formatTime(timeLeft);
    const progress = (timeLeft / totalTime) * 100;
    const circumference = 2 * Math.PI * 54; // radius = 54
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const confirm = async () => {
        if (receiptFile) {
            console.log('Receipt file selected:', receiptFile.name);
        }

        // Call new P2P API to mark order as PAID
        const orderId = state?.orderId || state?.matchId;
        if (orderId) {
            const result = await api.markP2PPaid(orderId);
            if (result?.success) {
                setShowSuccess(true);
            } else {
                alert("Hata: " + (result?.error || "İşlem başarısız"));
            }
        } else {
            // Fallback for old flow
            await api.markPaymentSent(user?.email || '', state?.matchId, state?.amount, true);
            setShowSuccess(true);
        }
    }

    const handleSuccessClose = () => {
        setShowSuccess(false);
        navigate('/dashboard');
    };

    const amount = state?.amount || 1000;
    const amountTRY = (amount * buyRate).toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col font-display">
            <SuccessModal
                isOpen={showSuccess}
                onClose={handleSuccessClose}
                title="Ödeme Bildiriminiz Alındı!"
                message="Ödeme bildiriminiz başarıyla iletildi. Satıcı onayladığında bakiyeniz hesabınıza geçecektir."
            />

            {/* Header */}
            <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10">
                <button
                    onClick={() => navigate('/deposit')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Ödeme Onayı</h1>
            </div>

            <div className="p-4 pb-10">
                <div className="text-center mb-6 mt-2">
                    <h2 className="text-2xl font-extrabold text-white leading-tight">Yatırımınız<br />Rezerve Edildi!</h2>
                </div>

                {/* Apple-style Circular Timer */}
                <div className="flex justify-center mb-8">
                    <div className="relative w-36 h-36">
                        {/* Background circle */}
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                            <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="#1a1a1a"
                                strokeWidth="8"
                            />
                            {/* Progress circle */}
                            <circle
                                cx="60"
                                cy="60"
                                r="54"
                                fill="none"
                                stroke="url(#gradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-1000 ease-linear"
                            />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#84cc16" />
                                    <stop offset="100%" stopColor="#22c55e" />
                                </linearGradient>
                            </defs>
                        </svg>
                        {/* Timer text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-3xl font-bold text-white tracking-tight">{time.m}:{time.s}</span>
                            <span className="text-xs text-gray-500 font-medium mt-1">kaldı</span>
                        </div>
                    </div>
                </div>

                {/* Amount Card */}
                <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5 mb-6">
                    <p className="text-gray-500 font-medium text-sm mb-1">Yatırılacak Tutar</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-extrabold text-white">₺{amountTRY} TRY</h3>
                        <span className="text-gray-500 font-medium">(${amount.toLocaleString()} USD)</span>
                    </div>
                </div>

                {/* Details */}
                <h3 className="font-bold text-white mb-3 px-1">Banka Transfer Bilgileri</h3>
                {investorData.bankAccount ? (
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 divide-y divide-white/5 mb-6">
                        <div className="p-4">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Alıcı Adı Soyadı</p>
                            <p className="font-bold text-white text-lg">{investorData.name}</p>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Banka</p>
                            <p className="font-bold text-white text-base">{investorData.bankAccount.bankName}</p>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">IBAN</p>
                            <p className="font-bold text-lime-400 text-base font-mono tracking-tight text-wrap break-all">
                                {investorData.bankAccount.iban.match(/.{1,4}/g)?.join(' ')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/5 p-6 mb-6 text-center">
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-700 mb-2"></div>
                            <p className="text-gray-500">Satıcı bilgileri yükleniyor...</p>
                        </div>
                    </div>
                )}

                {/* Upload */}
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center mb-6 relative bg-[#1a1a1a]/50 hover:border-lime-500/30 transition-colors">
                    <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${receiptFile ? 'bg-lime-500/20' : 'bg-white/5'}`}>
                        <span className={`material-symbols-outlined text-2xl ${receiptFile ? 'text-lime-400' : 'text-gray-500'}`}>
                            {receiptFile ? 'check_circle' : 'upload_file'}
                        </span>
                    </div>
                    <p className="text-gray-400 font-medium text-sm text-center">
                        {receiptFile ? `Seçildi: ${receiptFile.name}` : 'Dekont Yükle (İsteğe Bağlı)'}
                    </p>
                    {receiptFile && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setReceiptFile(null); }}
                            className="mt-2 text-xs text-red-400 hover:underline"
                        >
                            Kaldır
                        </button>
                    )}
                </div>

                {/* Button */}
                <button
                    onClick={confirm}
                    className="w-full bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-black py-4 rounded-xl font-bold text-lg shadow-xl shadow-lime-500/20 transition-all"
                >
                    Ödemeyi Gönderdim
                </button>
            </div>
        </div>
    );
};
export default DepositConfirmation;