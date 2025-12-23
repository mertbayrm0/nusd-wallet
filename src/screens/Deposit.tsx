import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import AlertModal from '../components/AlertModal';

interface BankAccount {
    id: string;
    bankName: string;
    iban: string;
    addedAt: string;
}

interface AlertState {
    isOpen: boolean;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
}

// Deposit page onboarding steps
const depositOnboardingSteps = [
    {
        icon: 'account_balance',
        title: 'Banka Hesabı Seçin',
        message: 'İlk olarak para göndereceğiniz banka hesabınızı seçin. Henüz hesap yoksa "Yeni Ekle" butonuyla ekleyebilirsiniz.',
        buttonText: 'Anladım'
    },
    {
        icon: 'currency_exchange',
        title: 'Tutar Girin',
        message: 'Yatırmak istediğiniz USDT tutarını girin. Sistem size en yakın bekleyen satıcıları bulacak ve size önerecek.',
        buttonText: 'Devam'
    },
    {
        icon: 'schedule',
        title: 'Eşleşme & Ödeme',
        message: 'Eşleşme bulunduğunda satıcının banka bilgileri gösterilir. Ödeme yaptıktan sonra "Ödedim" butonuna basın. İşlem 20 dakika içinde onaylanır.',
        buttonText: 'Başlayalım!'
    }
];

const Deposit = () => {
    const navigate = useNavigate();
    const { user } = useApp();
    const [amount, setAmount] = useState('');
    const [match, setMatch] = useState<any>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState<string | null>(null); // Order ID for polling
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [exchangeRate, setExchangeRate] = useState<number>(42.50); // Varsayılan fallback kur
    const [alertModal, setAlertModal] = useState<AlertState>({ isOpen: false, type: 'info', title: '', message: '' });

    // Havuz öneri popup state'leri
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [pendingWithdrawals, setPendingWithdrawals] = useState<{ id: string, amount_usd: number }[]>([]);

    // Onboarding state
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);

    // Check onboarding for deposit page
    useEffect(() => {
        const depositOnboardingComplete = localStorage.getItem('depositOnboardingComplete');
        if (!depositOnboardingComplete) {
            const timer = setTimeout(() => setShowOnboarding(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleOnboardingNext = () => {
        if (onboardingStep < depositOnboardingSteps.length - 1) {
            setOnboardingStep(onboardingStep + 1);
        } else {
            localStorage.setItem('depositOnboardingComplete', 'true');
            setShowOnboarding(false);
        }
    };

    const handleSkipOnboarding = () => {
        localStorage.setItem('depositOnboardingComplete', 'true');
        setShowOnboarding(false);
    };

    // Check for active P2P order and fetch exchange rate on page load
    useEffect(() => {
        checkActiveOrder();
        fetchExchangeRate();
    }, []);

    // Fetch current exchange rate from database
    const fetchExchangeRate = async () => {
        try {
            const rateData = await api.getExchangeRate();
            if (rateData?.buy_rate) {
                setExchangeRate(rateData.buy_rate);
                console.log('[Deposit] Exchange rate fetched:', rateData.buy_rate);
            }
        } catch (e) {
            console.error('[Deposit] Failed to fetch exchange rate:', e);
        }
    };

    // Fetch user's bank accounts on mount
    useEffect(() => {
        const fetchBankAccounts = async () => {
            if (user?.email) {
                const accounts = await api.getBankAccounts(user.email);
                setBankAccounts(accounts || []);
                if (accounts && accounts.length > 0) {
                    setSelectedBank(accounts[0]);
                }
            }
            setLoading(false);
        };
        fetchBankAccounts();
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

    const search = async () => {
        if (!selectedBank) {
            setAlertModal({ isOpen: true, type: 'warning', title: 'Banka Seçin', message: 'Lütfen önce bir banka hesabı seçin veya ekleyin.' });
            return;
        }

        setLoading(true);

        try {
            // NEW P2P API - calls p2p-create-order Edge Function
            const result = await api.createP2POrderNew('BUY', parseFloat(amount));

            if (!result) {
                setAlertModal({ isOpen: true, type: 'error', title: 'Sunucu Hatası', message: 'Sunucu hatası: Yanıt alınamadı' });
                setLoading(false);
                return;
            }

            if (result.success && result.order) {
                const orderId = result.order.id;
                setPending(orderId);

                // Attempt to find a match immediately
                const matchResult = await api.matchP2POrder(orderId);

                if (matchResult?.success && matchResult?.match) {
                    // Anında eşleşti - seller tutarını ve IBAN'ını göster
                    // matched_amount_usd = satıcının tutarı
                    console.log('[MATCH DEBUG] matchResult.match:', JSON.stringify(matchResult.match, null, 2));
                    console.log('[MATCH DEBUG] matched_amount_usd:', matchResult.match.matched_amount_usd);
                    console.log('[MATCH DEBUG] amount_usd:', matchResult.match.amount_usd);
                    console.log('[MATCH DEBUG] result.order.amount_usd:', result.order.amount_usd);

                    const sellerAmount = matchResult.match.matched_amount_usd || matchResult.match.amount_usd || result.order.amount_usd;
                    console.log('[MATCH DEBUG] Final sellerAmount:', sellerAmount);

                    setMatch({
                        id: matchResult.match.matchedOrderId,
                        amount: sellerAmount * exchangeRate, // Satıcının tutarı
                        amountUsd: sellerAmount, // Satıcının USD tutarı
                        sellerIBAN: matchResult.match.counterparty?.iban || 'N/A',
                        sellerName: matchResult.match.counterparty?.account_name || 'Satıcı',
                        sellerBank: matchResult.match.counterparty?.bank_name || 'Banka',
                        timeRemaining: matchResult.match.lock_expires_at
                    });
                    setPending(null);
                } else {
                    // ❌ Tam eşleşme yok - havuzdan önerileri getir
                    console.log('[DEPOSIT] No exact match, fetching suggestions...');

                    const suggestionsResult = await api.getPendingWithdrawals(parseFloat(amount));

                    if (suggestionsResult.success && suggestionsResult.withdrawals?.length > 0) {
                        // Öneriler var - popup göster
                        setPendingWithdrawals(suggestionsResult.withdrawals);
                        setShowSuggestions(true);

                        // Oluşturulan order'ı iptal et (kullanıcı farklı tutar seçecek)
                        await api.cancelP2POrder(orderId);
                        setPending(null);
                    } else {
                        // Hiç bekleyen çekim yok - bekleme moduna geç
                        setAlertModal({
                            isOpen: true,
                            type: 'info',
                            title: 'Eşleşme Bekleniyor',
                            message: 'Bu tutarda çekim talebi yok. Talebiniz havuza eklendi, çekim talebi geldiğinde eşleşeceksiniz.'
                        });
                        startPolling(orderId);
                    }
                }
            } else {
                // Hata göster
                setAlertModal({ isOpen: true, type: 'error', title: 'Hata', message: 'İstek oluşturulamadı: ' + (result?.error || 'Bilinmeyen hata') });
            }
        } catch (e: any) {
            console.error('Search error:', e);
            setAlertModal({ isOpen: true, type: 'error', title: 'Bağlantı Hatası', message: 'Hata: ' + (e.message || 'Bağlantı hatası') });
        }

        setLoading(false);
    };

    const startPolling = (orderId: string) => {
        // 🔥 REALTIME: Order değişikliklerini anında dinle
        const channel = supabase
            .channel(`order-${orderId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'p2p_orders',
                    filter: `id=eq.${orderId}`
                },
                (payload) => {
                    console.log('[REALTIME] Order updated:', payload.new);
                    const order = payload.new as any;

                    if (order.status === 'MATCHED') {
                        // Match bulundu! - async IIFE ile satıcı tutarını al
                        (async () => {
                            const matchedOrder = order.matched_order_id ? await api.getP2POrderStatus(order.matched_order_id) : null;
                            const sellerAmount = matchedOrder?.amount_usd || order.amount_usd;
                            setConfirmed(false);
                            setMatch({
                                id: orderId,
                                amount: sellerAmount * exchangeRate,
                                amountUsd: sellerAmount,
                                sellerIBAN: order.seller_iban || 'N/A',
                                sellerName: order.seller_account_name || 'Satıcı',
                                sellerBank: order.seller_bank_name || 'Banka'
                            });
                            setPending(null);
                            supabase.removeChannel(channel);
                            setPollInterval(null);
                        })();
                    } else if (order.status === 'EXPIRED' || order.status === 'CANCELLED') {
                        supabase.removeChannel(channel);
                        setPollInterval(null);
                        setAlertModal({ isOpen: true, type: 'warning', title: 'Süre Doldu', message: 'Sipariş süresi doldu veya iptal edildi' });
                    }
                }
            )
            .subscribe();

        setPollInterval(channel as any);

        // Fallback polling (daha uzun aralık) - realtime bağlantı koparsa
        const fallbackInterval = setInterval(async () => {
            const order = await api.getP2POrderStatus(orderId);

            if (order && order.status === 'MATCHED') {
                // Match bulundu! - matched_order_id'den satıcı tutarını al
                const matchedOrder = order.matched_order_id ? await api.getP2POrderStatus(order.matched_order_id) : null;
                const sellerAmount = matchedOrder?.amount_usd || order.amount_usd;
                setConfirmed(false);
                setMatch({
                    id: orderId,
                    amount: sellerAmount * exchangeRate,
                    amountUsd: sellerAmount,
                    sellerIBAN: order.seller_iban || 'N/A',
                    sellerName: order.seller_account_name || 'Satıcı',
                    sellerBank: order.seller_bank_name || 'Banka'
                });
                setPending(null);
                clearInterval(fallbackInterval);
                supabase.removeChannel(channel);
                setPollInterval(null);
            } else if (order?.status === 'EXPIRED' || order?.status === 'CANCELLED') {
                clearInterval(fallbackInterval);
                supabase.removeChannel(channel);
                setPollInterval(null);
                alert('Sipariş süresi doldu veya iptal edildi');
            }
        }, 15000); // 15 sn (eskiden 5 sn)

        // Stop after 10 minutes
        setTimeout(() => {
            clearInterval(fallbackInterval);
            supabase.removeChannel(channel);
            setPollInterval(null);
            if (pending) {
                setAlertModal({ isOpen: true, type: 'warning', title: 'Eşleşme Bulunamadı', message: 'Eşleşme bulunamadı. Lütfen daha sonra tekrar deneyin.' });
            }
        }, 10 * 60 * 1000);
    };

    // Kullanıcı öneri popup'ından tutar seçtiğinde
    const handleSuggestionSelect = async (selectedAmount: number) => {
        setShowSuggestions(false);
        setAmount(selectedAmount.toString());
        setLoading(true);

        console.log('[DEPOSIT] User selected suggestion:', selectedAmount);

        try {
            // Seçilen tutarla yeni order oluştur
            const result = await api.createP2POrderNew('BUY', selectedAmount);

            if (result.success && result.order) {
                const orderId = result.order.id;
                setPending(orderId);

                // Eşleşme ara (tam tutar olduğu için eşleşmeli)
                const matchResult = await api.matchP2POrder(orderId);

                if (matchResult?.success && matchResult?.match) {
                    // Eşleşti!
                    setMatch({
                        id: matchResult.match.matchedOrderId,
                        amount: selectedAmount * exchangeRate,
                        amountUsd: selectedAmount,
                        sellerIBAN: matchResult.match.counterparty?.iban || 'N/A',
                        sellerName: matchResult.match.counterparty?.account_name || 'Satıcı',
                        sellerBank: matchResult.match.counterparty?.bank_name || 'Banka',
                        timeRemaining: matchResult.match.lock_expires_at
                    });
                    setPending(null);
                } else {
                    // Bu olmamalı (tam tutar seçildi), ama olursa bekle
                    startPolling(orderId);
                }
            } else {
                setAlertModal({ isOpen: true, type: 'error', title: 'Hata', message: 'İstek oluşturulamadı' });
            }
        } catch (e: any) {
            console.error('Suggestion select error:', e);
            setAlertModal({ isOpen: true, type: 'error', title: 'Hata', message: e.message || 'Bağlantı hatası' });
        }

        setLoading(false);
    };

    const proceed = async () => {
        if (match) await api.lockMatch();
        // Satıcının tutarını kullan (match.amountUsd), buyer'ın girdiği tutarı değil
        navigate('/deposit/confirm', {
            state: {
                amount: match?.amountUsd || parseFloat(amount), // Satıcının tutarı
                matchId: match?.id,
                orderId: pending, // P2P order ID for markP2PPaid
                matchedInvestorEmail: match?.userId,
                bankAccount: selectedBank,
                matchDetails: match // Pass full match details including IBAN/Name
            }
        });
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display pb-20">
            {/* Onboarding Popup */}
            {showOnboarding && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-gradient-to-b from-emerald-800 to-emerald-900 rounded-3xl p-6 max-w-sm w-full border border-emerald-600/50 shadow-2xl">
                        {/* Progress dots */}
                        <div className="flex justify-center gap-2 mb-6">
                            {depositOnboardingSteps.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === onboardingStep ? 'bg-lime-400 w-6' : 'bg-emerald-600'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Icon */}
                        <div className="flex justify-center mb-4">
                            <div className="w-20 h-20 rounded-full bg-lime-400/20 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lime-400 text-4xl">
                                    {depositOnboardingSteps[onboardingStep].icon}
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <h2 className="text-white text-xl font-bold text-center mb-3">
                            {depositOnboardingSteps[onboardingStep].title}
                        </h2>
                        <p className="text-emerald-200/80 text-sm text-center mb-6 leading-relaxed">
                            {depositOnboardingSteps[onboardingStep].message}
                        </p>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={handleSkipOnboarding}
                                className="flex-1 py-3 rounded-xl text-emerald-300 text-sm font-medium hover:bg-emerald-700/50 transition-colors"
                            >
                                Atla
                            </button>
                            <button
                                onClick={handleOnboardingNext}
                                className="flex-1 py-3 rounded-xl bg-lime-400 text-emerald-900 font-bold text-sm hover:bg-lime-300 transition-colors"
                            >
                                {depositOnboardingSteps[onboardingStep].buttonText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="px-4 py-4 flex items-center sticky top-0 z-10">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Para Yatır</h1>
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

                        <div className="bg-white rounded-xl p-4 w-full max-w-xs mb-6 shadow-lg">
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-500">İşlem Tipi:</span>
                                <span className={`font-bold ${activeOrder.type === 'SELL' ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {activeOrder.type === 'SELL' ? 'Çekim (Satış)' : 'Yatırım (Alış)'}
                                </span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-gray-500">Miktar:</span>
                                <span className="text-gray-900 font-bold">${activeOrder.amount_usd} USDT</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Durum:</span>
                                <span className="text-amber-500 font-bold">{activeOrder.status}</span>
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
                ) : (
                    <>
                        {/* Info Alert */}
                        <div className="bg-white rounded-xl p-4 flex gap-3 shadow-lg">
                            <span className="material-symbols-outlined text-emerald-500 shrink-0">info</span>
                            <div>
                                <p className="text-sm text-gray-600">
                                    <span className="font-bold text-gray-900">Dekont Yükleme İsteğe Bağlı:</span> Dekont yüklerseniz işlem 20 dakika içinde otomatik onaylanır.
                                </p>
                            </div>
                        </div>

                        {/* Bank Account Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-emerald-300">Banka Hesabınız</label>
                                <button
                                    onClick={() => navigate('/bank-accounts')}
                                    className="text-xs text-lime-400 font-bold hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Yeni Ekle
                                </button>
                            </div>

                            {loading ? (
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
                                    <p className="text-gray-500 text-xs mt-1">Para yatırmak için bir banka hesabı eklemelisiniz</p>
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
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-900 font-bold truncate">{account.bankName}</p>
                                                <p className="text-gray-500 text-xs font-mono truncate">{account.iban}</p>
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
                        <div>
                            <label className="block text-sm font-bold text-emerald-300 mb-2">Yatırılacak Tutar (USDT)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-400">$</span>
                                <input
                                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none bg-white text-gray-900 font-bold text-xl placeholder:text-gray-400 shadow"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>
                            <p className="text-xs text-emerald-200 mt-2">Minimum: 10 USDT • Ödeyeceğiniz: ≈{(parseFloat(amount || '0') * exchangeRate).toLocaleString()} TL</p>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="flex gap-2">
                            {[100, 500, 1000, 5000].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setAmount(val.toString())}
                                    className="flex-1 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 font-bold text-sm hover:border-emerald-500 hover:text-emerald-600 transition-colors shadow-sm"
                                >
                                    ${val}
                                </button>
                            ))}
                        </div>

                        {/* Pending State - Waiting for Match */}
                        {pending && !match && (
                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 mt-4 text-center">
                                <div className="flex items-center justify-center mb-4">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">
                                    En Uygun Eşleşme Aranıyor...
                                </h3>
                                <p className="text-gray-400 text-sm">
                                    Size uygun satıcıyı arıyoruz
                                </p>
                            </div>
                        )}

                        {/* Match Logic */}
                        {!match ? (
                            !pending && (
                                <button
                                    onClick={search}
                                    disabled={!selectedBank || !amount || loading}
                                    className="w-full bg-lime-500 hover:bg-lime-400 active:scale-[0.98] transition-all text-black py-4 rounded-xl font-bold text-lg shadow-xl shadow-lime-500/20 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Yükleniyor...' : 'Eşleşme Bul'}
                                </button>
                            )
                        ) : (
                            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-lime-500/30 text-center animate-fade-in mt-4">
                                <div className="w-16 h-16 rounded-full bg-lime-500/20 flex items-center justify-center mx-auto mb-4 relative">
                                    <span className="material-symbols-outlined text-lime-400 text-3xl">task_alt</span>
                                    <div className="absolute inset-0 rounded-full border border-lime-500/30 animate-ping"></div>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Uygun Eşleşme Bulundu!</h3>
                                <p className="text-gray-400 text-sm mb-6">Yatırım tutarınız için uygun bir satıcı bulundu.</p>

                                <div className="bg-black/30 p-4 rounded-2xl mb-6 border border-white/5">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-500 text-xs">Ağ</span>
                                        <span className="text-white text-xs font-bold">P2P Secure</span>
                                    </div>
                                    <div className="border-t border-white/5 my-2"></div>
                                    <p className="text-xs text-gray-500 mb-1 mt-2">İşlem Tutarı</p>
                                    <p className="text-3xl font-bold text-white tracking-tight">₺{match.amount?.toLocaleString()}</p>
                                    <p className="text-xs text-lime-500 mt-1 font-mono">≈ {match.amountUsd?.toLocaleString() || parseFloat(amount).toLocaleString()} USDT</p>
                                </div>

                                <button
                                    onClick={proceed}
                                    className="w-full bg-lime-500 hover:bg-lime-400 text-black font-bold py-4 rounded-xl text-lg transition-all shadow-lg shadow-lime-500/20 active:scale-95"
                                >
                                    İşlemi Onayla & Bilgileri Gör
                                </button>
                                <p className="text-[10px] text-gray-500 mt-3">İşlemi onayladığınızda ödeme bilgileri gösterilecek ve 30 dakika süre başlayacaktır.</p>
                            </div>
                        )}
                    </>
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

            {/* Suggestions Modal - Tam eşleşme yoksa öneriler */}
            {
                showSuggestions && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                            onClick={() => setShowSuggestions(false)}
                        />
                        {/* Modal */}
                        <div className="relative bg-[#1a1a1a] border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
                            {/* Icon */}
                            <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-4xl text-amber-400">search</span>
                            </div>
                            {/* Title */}
                            <h2 className="text-white text-xl font-bold text-center mb-2">Eşleşme Bulunamadı</h2>
                            {/* Message */}
                            <p className="text-gray-400 text-center text-sm mb-4">
                                ${amount} tutarında çekim talebi yok. En yakın bekleyen tutarları seçebilirsiniz:
                            </p>
                            {/* Suggestions */}
                            <div className="space-y-2 mb-6">
                                {pendingWithdrawals.map((withdrawal, index) => (
                                    <button
                                        key={withdrawal.id || index}
                                        onClick={() => handleSuggestionSelect(withdrawal.amount_usd)}
                                        className="w-full py-3 px-4 rounded-xl bg-[#252525] border border-white/10 hover:border-lime-500/50 hover:bg-lime-500/10 transition-all flex justify-between items-center"
                                    >
                                        <span className="text-white font-bold">${withdrawal.amount_usd.toLocaleString()}</span>
                                        <span className="text-gray-500 text-sm">≈ {(withdrawal.amount_usd * exchangeRate).toLocaleString()} TL</span>
                                    </button>
                                ))}
                            </div>
                            {/* Cancel */}
                            <button
                                onClick={() => setShowSuggestions(false)}
                                className="w-full py-3 rounded-xl border border-gray-600 text-gray-400 font-semibold hover:bg-white/5 transition-all"
                            >
                                İptal
                            </button>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
export default Deposit;