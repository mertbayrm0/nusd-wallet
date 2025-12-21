import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../App';
import SuccessModal from '../components/SuccessModal';
import AlertModal from '../components/AlertModal';
import { supabase } from '../services/supabase';

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
    const [showTimeoutAlert, setShowTimeoutAlert] = useState(false);

    const totalTime = 1200; // 20 minutes in seconds

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    // ⏰ Timer doldu - otomatik iptal
                    handleTimeoutCancel();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Timer dolduğunda işlemi iptal et
    const handleTimeoutCancel = async () => {
        const orderId = state?.orderId || state?.matchId;
        if (orderId) {
            console.log('[TIMEOUT] Order expired, cancelling:', orderId);
            await api.cancelP2POrder(orderId);
            setShowTimeoutAlert(true); // Custom modal göster
        } else {
            navigate('/dashboard');
        }
    };

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
        const orderId = state?.orderId || state?.matchId;

        // If receipt file is provided, upload and send to Telegram
        if (receiptFile && orderId) {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    // Upload to storage
                    const fileName = `${authUser.id}/dekont_${orderId}_${Date.now()}.${receiptFile.name.split('.').pop()}`;
                    const { error: uploadError } = await supabase.storage
                        .from('verification-docs')
                        .upload(fileName, receiptFile);

                    if (!uploadError) {
                        // Create submission record and send to Telegram
                        const { data: submission } = await supabase
                            .from('verification_submissions')
                            .insert({
                                user_id: authUser.id,
                                user_email: user?.email,
                                user_name: user?.name,
                                submission_type: 'deposit',
                                document_url: fileName,
                                amount: state?.amount || 0,
                                status: 'pending'
                            })
                            .select()
                            .single();

                        if (submission) {
                            // Send to Telegram Dekont group
                            await supabase.functions.invoke('send-telegram-verification', {
                                body: {
                                    submission_id: submission.id,
                                    submission_type: 'deposit',
                                    user_email: user?.email,
                                    user_name: user?.name,
                                    document_url: fileName,
                                    amount: state?.amount || 0
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Dekont upload error:', e);
                // Continue even if dekont upload fails
            }
        }

        // Call P2P API to mark order as PAID
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
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display">
            <SuccessModal
                isOpen={showSuccess}
                onClose={handleSuccessClose}
                title="Ödeme Bildiriminiz Alındı!"
                message="Ödeme bildiriminiz başarıyla iletildi. Satıcı onayladığında bakiyeniz hesabınıza geçecektir."
            />

            {/* Header */}
            <div className="px-4 py-4 flex items-center sticky top-0 z-10">
                <button
                    onClick={() => navigate('/deposit')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
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
                                    <stop offset="0%" stopColor="#10b981" />
                                    <stop offset="100%" stopColor="#059669" />
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
                <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
                    <p className="text-gray-500 font-medium text-sm mb-1">Yatırılacak Tutar</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-2xl font-extrabold text-gray-900">₺{amountTRY} TRY</h3>
                        <span className="text-gray-500 font-medium">(${amount.toLocaleString()} USD)</span>
                    </div>
                </div>

                {/* Details */}
                <h3 className="font-bold text-white mb-3 px-1">Banka Transfer Bilgileri</h3>
                {investorData.bankAccount ? (
                    <div className="bg-white rounded-2xl shadow-lg divide-y divide-gray-100 mb-6">
                        <div className="p-4">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Alıcı Adı Soyadı</p>
                            <p className="font-bold text-gray-900 text-lg">{investorData.name}</p>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Banka</p>
                            <p className="font-bold text-gray-900 text-base">{investorData.bankAccount.bankName}</p>
                        </div>
                        <div className="p-4">
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">IBAN</p>
                            <p className="font-bold text-emerald-600 text-base font-mono tracking-tight text-wrap break-all">
                                {investorData.bankAccount.iban.match(/.{1,4}/g)?.join(' ')}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 text-center">
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-200 mb-2"></div>
                            <p className="text-gray-500">Satıcı bilgileri yükleniyor...</p>
                        </div>
                    </div>
                )}

                {/* Warning + Upload */}
                <div className="mb-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
                        <p className="text-amber-700 text-xs flex items-start gap-2">
                            <span className="material-symbols-outlined text-sm shrink-0">info</span>
                            Olası şikayetlerde kanıt olarak kullanılmak üzere dekont yüklemenizi öneririz. Yüklemek zorunlu değildir.
                        </p>
                    </div>
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 flex flex-col items-center relative bg-white hover:border-emerald-400 transition-colors">
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            capture="environment"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 ${receiptFile ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                            <span className={`material-symbols-outlined text-2xl ${receiptFile ? 'text-emerald-500' : 'text-gray-400'}`}>
                                {receiptFile ? 'check_circle' : 'upload_file'}
                            </span>
                        </div>
                        <p className="text-gray-600 font-medium text-sm text-center">
                            {receiptFile ? `Seçildi: ${receiptFile.name}` : 'Dekont Yükle (İsteğe Bağlı)'}
                        </p>
                        {receiptFile && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setReceiptFile(null); }}
                                className="mt-2 text-xs text-red-500 hover:underline"
                            >
                                Kaldır
                            </button>
                        )}
                    </div>
                </div>

                {/* Button */}
                <button
                    onClick={confirm}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/30 transition-all"
                >
                    Ödemeyi Gönderdim
                </button>
            </div>

            {/* Timeout Alert Modal */}
            <AlertModal
                isOpen={showTimeoutAlert}
                type="warning"
                title="Süre Doldu!"
                message="İşlem süresi doldu ve iptal edildi. Lütfen yeni bir işlem başlatın."
                onClose={() => {
                    setShowTimeoutAlert(false);
                    navigate('/dashboard');
                }}
            />
        </div>
    );
};
export default DepositConfirmation;