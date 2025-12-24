import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { useApp } from '../App';
import AlertModal from '../components/AlertModal';

interface BankAccount {
    id: string;
    bankName: string;
    iban: string;
    accountName: string;
}

interface AlertState {
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
}

// Withdraw page onboarding steps - targetId ile hangi alanın vurgulanacağını belirliyoruz
const withdrawOnboardingSteps = [
    {
        icon: 'account_balance',
        title: 'Banka Hesabı Seçin',
        message: 'Çekim tutarının yatırılacağı banka hesabınızı seçin. Paranız bu hesaba gönderilecek.',
        buttonText: 'Anladım',
        targetId: 'bank-section'
    },
    {
        icon: 'currency_exchange',
        title: 'Çekim Tutarı',
        message: 'Çekim yapmak istediğiniz tutarı girin. Eşleşme olduğunda ana sayfaya onay bildirimi gelecektir. İşlem süresi yoğunluğa göre değişiklik gösterebilir.',
        buttonText: 'Başlayalım!',
        targetId: 'amount-section'
    }
];

const Withdraw = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useApp();
    const [amount, setAmount] = useState('');
    const [instant, setInstant] = useState(false);
    const [step, setStep] = useState(1); // 1: amount, 2: waiting/success
    const [pending, setPending] = useState<string | null>(null);
    const [match, setMatch] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
    const [loadingBanks, setLoadingBanks] = useState(true);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [sellRate, setSellRate] = useState<number>(32); // Dynamic sell rate from database
    const [alertModal, setAlertModal] = useState<AlertState>({ isOpen: false, type: 'info', title: '', message: '' });

    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);

    // Check onboarding for withdraw page
    useEffect(() => {
        if (user?.id) {
            const withdrawOnboardingComplete = localStorage.getItem(`withdrawOnboardingComplete_${user.id}`);
            if (!withdrawOnboardingComplete) {
                const timer = setTimeout(() => setShowOnboarding(true), 500);
                return () => clearTimeout(timer);
            }
        }
    }, [user]);

    const handleOnboardingNext = () => {
        if (onboardingStep < withdrawOnboardingSteps.length - 1) {
            setOnboardingStep(onboardingStep + 1);
        } else {
            if (user?.id) {
                localStorage.setItem(`withdrawOnboardingComplete_${user.id}`, 'true');
            }
            setShowOnboarding(false);
        }
    };

    const handleSkipOnboarding = () => {
        if (user?.id) {
            localStorage.setItem(`withdrawOnboardingComplete_${user.id}`, 'true');
        }
        setShowOnboarding(false);
    };

    // Check for active P2P order on page load
    useEffect(() => {
        checkActiveOrder();
        loadExchangeRate();
    }, []);

    // Load bank accounts when user is available
    useEffect(() => {
        if (user?.email) {
            loadBankAccounts();
        }
    }, [user?.email]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [pollInterval]);

    const checkActiveOrder = async () => {
        const order = await api.getActiveP2POrder();
        if (order) {
            setActiveOrder(order);
        }
    };

    const loadExchangeRate = async () => {
        const rateData = await api.getExchangeRate();
        if (rateData?.sell_rate) {
            setSellRate(rateData.sell_rate);
        }
    };

    const handleCancelOrder = async () => {
        if (!activeOrder) return;
        setLoading(true);
        const result = await api.cancelP2POrder(activeOrder.id);
        if (result.success) {
            setActiveOrder(null);
            setAlertModal({ isOpen: true, type: 'success', title: 'İptal Edildi', message: 'İşlem iptal edildi' });
        } else {
            setAlertModal({ isOpen: true, type: 'error', title: 'Hata', message: 'İptal hatası: ' + result.error });
        }
        setLoading(false);
    };

    const loadBankAccounts = async () => {
        if (!user?.email) return;
        setLoadingBanks(true);
        try {
            const accounts = await api.getBankAccounts(user.email);
            setBankAccounts(accounts || []);
            if (accounts && accounts.length > 0 && !selectedBank) {
                setSelectedBank(accounts[0]);
            }
        } catch (e) {
            console.error('Failed to load bank accounts:', e);
        }
        setLoadingBanks(false);
    };

    const handleSubmit = () => {
        if (!amount || parseFloat(amount) < 10) {
            setAlertModal({ isOpen: true, type: 'warning', title: 'Minimum Tutar', message: 'Minimum 10 USDT' });
            return;
        }
        if (parseFloat(amount) > (user?.balance || 0)) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Yetersiz Bakiye', message: 'Yetersiz bakiye' });
            return;
        }
        if (instant) {
            submitInstantWithdraw();
        } else {
            if (!selectedBank) {
                setAlertModal({ isOpen: true, type: 'warning', title: 'Banka Seçin', message: 'Lütfen bir banka hesabı seçin' });
                return;
            }
            submitP2PSell();
        }
    };

    const submitInstantWithdraw = async () => {
        setLoading(true);
        try {
            if (!user) return;

            // Call Edge Function instead of direct DB write
            const { data, error } = await supabase.functions.invoke('withdraw-request', {
                body: {
                    amount: parseFloat(amount),
                    asset: 'TRY' // Fiat instant withdraw
                }
            });

            if (error) {
                setAlertModal({ isOpen: true, type: 'error', title: 'Hata', message: error.message || 'Hata oluştu' });
            } else if (data?.success) {
                setAlertModal({ isOpen: true, type: 'success', title: 'Başarılı', message: 'Çekim talebiniz oluşturuldu. Onay bekliyor.' });
                refreshUser();
                navigate('/dashboard');
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'Hata', message: data?.error || 'Hata oluştu' });
            }
        } catch (e: any) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Hata', message: e.message || 'Hata oluştu' });
        }
        setLoading(false);
    };

    const submitP2PSell = async () => {
        if (!selectedBank) return;

        setLoading(true);
        try {
            // NEW P2P API - calls p2p-create-order Edge Function
            const result = await api.createP2POrderNew(
                'SELL',
                parseFloat(amount),
                selectedBank.iban,
                selectedBank.bankName,
                selectedBank.accountName
            );

            if (result.success && result.order) {
                // Order created successfully
                const orderId = result.order.id;
                setPending(orderId);
                setStep(2);

                // Attempt to find a match immediately
                const matchResult = await api.matchP2POrder(orderId);

                if (matchResult.success && matchResult.match) {
                    // Anında eşleşti!
                    setMatch({
                        tradeId: matchResult.match.matchedOrderId,
                        buyer: matchResult.match.counterparty?.email,
                        amount: result.order.amount_usd,
                        fiatAmount: result.order.amount_usd * sellRate, // Dynamic sell rate from database
                        status: 'MATCHED'
                    });
                } else {
                    // Bekleme - polling başlat
                    startPolling(orderId);
                }
            } else {
                // Hata göster
                setAlertModal({ isOpen: true, type: 'error', title: 'Hata', message: 'Hata: ' + (result.error || 'İstek oluşturulamadı') });
            }
        } catch (e: any) {
            setAlertModal({ isOpen: true, type: 'error', title: 'Bağlantı Hatası', message: e.message || 'Bağlantı hatası' });
        }
        setLoading(false);
    };

    const startPolling = (orderId: string) => {
        // 🔥 REALTIME: Order değişikliklerini anında dinle
        const channel = supabase
            .channel(`withdraw-order-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'p2p_orders',
                    filter: `id=eq.${orderId}`
                },
                (payload: any) => {
                    console.log('[REALTIME] Withdraw order updated:', payload.new);
                    const order = payload.new;

                    if (order.status === 'MATCHED') {
                        setMatch({
                            tradeId: orderId,
                            buyer: 'Eşleşme bulundu',
                            amount: order.amount_usd,
                            fiatAmount: order.amount_usd * sellRate,
                            status: 'MATCHED'
                        });
                        supabase.removeChannel(channel);
                        setPollInterval(null);
                    } else if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
                        supabase.removeChannel(channel);
                        setPollInterval(null);
                        setAlertModal({ isOpen: true, type: 'warning', title: 'Süre Doldu', message: 'Sipariş süresi doldu veya iptal edildi' });
                        navigate('/dashboard');
                    }
                }
            )
            .subscribe();

        setPollInterval(channel as any);

        // Fallback polling (15 sn) - realtime bağlantı koparsa
        const fallbackInterval = setInterval(async () => {
            const order = await api.getP2POrderStatus(orderId);

            if (order && order.status === 'MATCHED') {
                setMatch({
                    tradeId: orderId,
                    buyer: 'Eşleşme bulundu',
                    amount: order.amount_usd,
                    fiatAmount: order.amount_usd * sellRate,
                    status: 'MATCHED'
                });
                clearInterval(fallbackInterval);
                supabase.removeChannel(channel);
                setPollInterval(null);
            } else if (order?.status === 'EXPIRED' || order?.status === 'CANCELLED') {
                clearInterval(fallbackInterval);
                supabase.removeChannel(channel);
                setPollInterval(null);
                alert('Sipariş süresi doldu veya iptal edildi');
                navigate('/dashboard');
            }
        }, 15000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display pb-20">
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
                        className={`fixed z-[102] max-w-xs w-[90%] transition-all duration-300 ${withdrawOnboardingSteps[onboardingStep]?.targetId === 'bank-section'
                            ? 'top-[180px] left-1/2 -translate-x-1/2' // Near bank section
                            : withdrawOnboardingSteps[onboardingStep]?.targetId === 'amount-section'
                                ? 'top-[380px] left-1/2 -translate-x-1/2' // Near amount section
                                : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' // Centered
                            }`}
                    >
                        <div className="bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-2xl p-5 border border-emerald-500/50 shadow-2xl">
                            {/* Arrow pointing down to target */}
                            {withdrawOnboardingSteps[onboardingStep]?.targetId && (
                                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-emerald-900 rotate-45 border-r border-b border-emerald-500/50" />
                            )}

                            {/* Progress dots */}
                            <div className="flex justify-center gap-1.5 mb-4">
                                {withdrawOnboardingSteps.map((_, idx) => (
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
                                        {withdrawOnboardingSteps[onboardingStep].icon}
                                    </span>
                                </div>
                                <h3 className="text-white text-base font-bold">
                                    {withdrawOnboardingSteps[onboardingStep].title}
                                </h3>
                            </div>

                            {/* Message */}
                            <p className="text-emerald-200/80 text-sm leading-relaxed mb-4 pl-[52px]">
                                {withdrawOnboardingSteps[onboardingStep].message}
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
                                    {withdrawOnboardingSteps[onboardingStep].buttonText}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Header */}
            <div className="px-4 py-4 flex items-center sticky top-0 z-10">
                <button
                    onClick={() => step > 1 ? setStep(1) : navigate('/dashboard')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">
                    {step === 1 ? 'Çekim' : 'İşlem Durumu'}
                </h1>
            </div>

            <div className="p-4 space-y-6">
                {/* 🔒 Aktif Order Varsa Tam Ekran Blok */}
                {activeOrder ? (
                    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
                        <div className="w-24 h-24 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
                            <span className="material-symbols-outlined text-5xl text-amber-400">pending</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Bekleyen İşleminiz Var</h2>
                        <p className="text-gray-400 mb-6 max-w-xs">
                            Aktif bir {activeOrder.type === 'SELL' ? 'satış' : 'alış'} emriniz bulunuyor.
                            Yeni işlem oluşturmak için önce mevcut işlemi tamamlamanız veya iptal etmeniz gerekiyor.
                        </p>

                        <div className="bg-[#1a1a1a] rounded-xl p-4 w-full max-w-xs mb-6">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-500">İşlem Tipi:</span>
                                <span className={`font-bold ${activeOrder.type === 'SELL' ? 'text-red-400' : 'text-green-400'}`}>
                                    {activeOrder.type === 'SELL' ? 'Çekim (Satış)' : 'Yatırım (Alış)'}
                                </span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-500">Miktar:</span>
                                <span className="text-white font-bold">${activeOrder.amount_usd} USDT</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Durum:</span>
                                <span className="text-amber-400 font-bold">{activeOrder.status}</span>
                            </div>
                        </div>

                        <div className="space-y-3 w-full max-w-xs">
                            <button
                                onClick={handleCancelOrder}
                                disabled={loading || activeOrder.status === 'PAID'}
                                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                {loading ? 'İptal Ediliyor...' : activeOrder.status === 'PAID' ? 'Ödeme Yapıldı - İptal Edilemez' : 'İşlemi İptal Et'}
                            </button>
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold transition-colors"
                            >
                                Dashboard'a Dön
                            </button>
                        </div>
                    </div>
                ) : step === 1 && (
                    <>
                        {/* Balance Card */}
                        <div className="bg-white p-6 rounded-2xl shadow-lg">
                            <p className="text-gray-500 font-medium text-sm mb-1">Mevcut Bakiye</p>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                {user?.balance.toFixed(2)} <span className="text-xl font-bold text-gray-400">NUSD</span>
                            </h2>
                        </div>

                        {/* Bank Account Selection */}
                        <div
                            id="bank-section"
                            className={`relative ${showOnboarding && withdrawOnboardingSteps[onboardingStep]?.targetId === 'bank-section' ? 'z-[101] ring-2 ring-lime-400 ring-offset-2 ring-offset-emerald-900 rounded-xl' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-emerald-300">Ödeme Alacağınız Hesap</label>
                                <button
                                    onClick={() => navigate('/bank-accounts')}
                                    className="text-xs text-lime-400 font-bold hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Yeni Ekle
                                </button>
                            </div>

                            {loadingBanks ? (
                                <div className="bg-white rounded-xl p-4 shadow animate-pulse">
                                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            ) : bankAccounts.length === 0 ? (
                                <button
                                    onClick={() => navigate('/bank-accounts')}
                                    className="w-full bg-white rounded-xl p-4 border-2 border-dashed border-gray-300 hover:border-emerald-500 transition-colors text-center shadow"
                                >
                                    <span className="material-symbols-outlined text-emerald-500 text-3xl mb-2">add_card</span>
                                    <p className="text-gray-900 font-bold">Banka Hesabı Ekle</p>
                                    <p className="text-gray-500 text-xs mt-1">Çekim yapmak için bir banka hesabı eklemelisiniz</p>
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    {bankAccounts.map((account) => (
                                        <button
                                            key={account.id}
                                            onClick={() => setSelectedBank(account)}
                                            className={`w-full p-4 rounded-xl transition-all text-left flex items-center gap-3 shadow ${selectedBank?.id === account.id
                                                ? 'bg-emerald-50 border-2 border-emerald-500'
                                                : 'bg-white border border-gray-200 hover:border-emerald-300'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedBank?.id === account.id
                                                ? 'bg-emerald-100 text-emerald-600'
                                                : 'bg-blue-100 text-blue-500'
                                                }`}>
                                                <span className="material-symbols-outlined">account_balance</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{account.bankName}</p>
                                                <p className="text-xs text-gray-500 font-mono">{account.iban}</p>
                                            </div>
                                            {selectedBank?.id === account.id && (
                                                <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Amount Input */}
                        <div
                            id="amount-section"
                            className={`relative ${showOnboarding && withdrawOnboardingSteps[onboardingStep]?.targetId === 'amount-section' ? 'z-[101] ring-2 ring-lime-400 ring-offset-2 ring-offset-emerald-900 rounded-xl p-2 -m-2' : ''}`}
                        >
                            <label className="block text-sm font-bold text-emerald-300 mb-2">Çekim Tutarı (USDT)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">$</span>
                                <input
                                    className="w-full pl-10 pr-4 py-4 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-white text-gray-900 font-bold text-lg placeholder:text-gray-400 shadow"
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-emerald-200 mt-2">Minimum: 10 USDT • Alacağınız: ≈{(parseFloat(amount || '0') * sellRate).toLocaleString()} TL</p>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="flex gap-2">
                            {[50, 100, 500, 1000].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setAmount(val.toString())}
                                    className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-sm"
                                >
                                    ${val}
                                </button>
                            ))}
                        </div>

                        {/* Method Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setInstant(false)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all shadow ${!instant ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-gray-200 hover:border-emerald-300'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-lg ${!instant ? 'text-emerald-600' : 'text-gray-900'}`}>Standart</h3>
                                    {!instant && <span className="material-symbols-outlined text-emerald-500">check_circle</span>}
                                </div>
                                <p className="text-xs text-gray-500 font-medium">P2P Eşleşme</p>
                                <p className="text-xs text-emerald-500 font-bold mt-1">%0 Komisyon</p>
                            </button>

                            <div
                                className="p-4 rounded-2xl border-2 text-left relative bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed"
                            >
                                {/* Çok Yakında Badge */}
                                <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    Çok Yakında
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-lg text-gray-400">Hızlı</h3>
                                </div>
                                <p className="text-xs text-gray-400 font-medium">Sistem Ödeme</p>
                                <p className="text-xs text-gray-400 font-bold mt-1">%2 Komisyon</p>
                            </div>
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={loading || (!instant && !selectedBank)}
                            className="w-full bg-lime-500 hover:bg-lime-400 disabled:opacity-50 active:scale-[0.98] transition-all text-black py-4 rounded-xl font-bold text-lg shadow-xl shadow-lime-500/20"
                        >
                            {loading ? 'İşleniyor...' : 'Çekim Yap'}
                        </button>
                    </>
                )}

                {step === 2 && (
                    <div className="text-center py-8">
                        {!match ? (
                            <>
                                {/* Waiting for match */}
                                <div className="w-20 h-20 border-4 border-lime-500/30 border-t-lime-500 rounded-full animate-spin mx-auto mb-6"></div>
                                <h2 className="text-xl font-bold text-white mb-2">Alıcı Bekleniyor</h2>
                                <p className="text-gray-400 text-sm mb-6">
                                    Sizin için uygun bir alıcı aranıyor...
                                </p>
                                <div className="bg-[#1a1a1a] rounded-xl p-4 text-left space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Satış Tutarı</span>
                                        <span className="font-bold text-white">{amount} USDT</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Hesap</span>
                                        <span className="text-xs text-gray-400">{selectedBank?.bankName}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Match found */}
                                <div className="w-20 h-20 rounded-full bg-lime-500/20 flex items-center justify-center mx-auto mb-6">
                                    <span className="material-symbols-outlined text-5xl text-lime-400">check_circle</span>
                                </div>
                                <h2 className="text-xl font-bold text-white mb-2">Eşleşme Bulundu!</h2>
                                <p className="text-gray-400 text-sm mb-6">
                                    Alıcı ödemeyi yaptığında bakiyenizden düşülecek.
                                </p>
                                <div className="bg-[#1a1a1a] rounded-xl p-4 text-left space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Satış Tutarı</span>
                                        <span className="font-bold text-lime-400">{match.amount} USDT</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Alacağınız</span>
                                        <span className="font-bold text-white">{match.fiatAmount?.toLocaleString()} TL</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Durum</span>
                                        <span className="text-amber-400 font-bold">{match.status || 'Ödeme Bekleniyor'}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/dashboard')}
                                    className="mt-6 w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-xl font-bold"
                                >
                                    Dashboard'a Dön
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Alert Modal */}
            <AlertModal
                isOpen={alertModal.isOpen}
                type={alertModal.type}
                title={alertModal.title}
                message={alertModal.message}
                onClose={() => setAlertModal({ ...alertModal, isOpen: false })}
            />
        </div>
    );
};
export default Withdraw;