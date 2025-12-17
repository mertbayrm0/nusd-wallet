import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { useApp } from '../App';

interface BankAccount {
    id: string;
    bankName: string;
    iban: string;
    accountName: string;
}

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
    const [activeOrder, setActiveOrder] = useState<any>(null); // Mevcut aktif order

    // Load bank accounts when user is available
    useEffect(() => {
        if (user?.email) {
            loadBankAccounts();
        }
    }, [user?.email]);

    // Check for active P2P order on page load
    useEffect(() => {
        checkActiveOrder();
    }, []);

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
            alert('İşlem iptal edildi');
        } else {
            alert('İptal hatası: ' + result.error);
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
            alert('Minimum 10 USDT');
            return;
        }
        if (parseFloat(amount) > (user?.balance || 0)) {
            alert('Yetersiz bakiye');
            return;
        }
        if (instant) {
            submitInstantWithdraw();
        } else {
            if (!selectedBank) {
                alert('Lütfen bir banka hesabı seçin');
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
                alert(error.message || 'Hata oluştu');
            } else if (data?.success) {
                alert('Çekim talebiniz oluşturuldu. Onay bekliyor.');
                refreshUser();
                navigate('/dashboard');
            } else {
                alert(data?.error || 'Hata oluştu');
            }
        } catch (e: any) {
            alert(e.message || 'Hata oluştu');
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
                        fiatAmount: result.order.amount_usd * 32, // Mock TRY rate
                        status: 'MATCHED'
                    });
                } else {
                    // Bekleme - polling başlat
                    startPolling(orderId);
                }
            } else {
                // Hata - aktif order var mı kontrol et
                if ((result as any).activeOrder) {
                    setActiveOrder((result as any).activeOrder);
                } else {
                    alert('Hata: ' + (result.error || 'İstek oluşturulamadı'));
                }
            }
        } catch (e: any) {
            alert(e.message || 'Bağlantı hatası');
        }
        setLoading(false);
    };

    const startPolling = (orderId: string) => {
        const interval = setInterval(async () => {
            const order = await api.getP2POrderStatus(orderId);

            if (order && order.status === 'MATCHED') {
                setMatch({
                    tradeId: orderId,
                    buyer: 'Eşleşme bulundu',
                    amount: order.amount_usd,
                    fiatAmount: order.amount_usd * 32,
                    status: 'MATCHED'
                });
                clearInterval(interval);
                setPollInterval(null);
            } else if (order?.status === 'EXPIRED' || order?.status === 'CANCELLED') {
                clearInterval(interval);
                setPollInterval(null);
                alert('Sipariş süresi doldu veya iptal edildi');
                navigate('/dashboard');
            }
        }, 3000);
        setPollInterval(interval);
    };

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col font-display pb-20">
            {/* Header */}
            <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10">
                <button
                    onClick={() => step > 1 ? setStep(1) : navigate('/dashboard')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
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
                                disabled={loading}
                                className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 py-3 rounded-xl font-bold transition-colors disabled:opacity-50"
                            >
                                {loading ? 'İptal Ediliyor...' : 'İşlemi İptal Et'}
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
                        <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5">
                            <p className="text-gray-500 font-medium text-sm mb-1">Mevcut Bakiye</p>
                            <h2 className="text-3xl font-extrabold text-white tracking-tight">
                                {user?.balance.toFixed(2)} <span className="text-xl font-bold text-gray-500">NUSD</span>
                            </h2>
                        </div>

                        {/* Bank Account Selection */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-bold text-gray-400">Ödeme Alacağınız Hesap</label>
                                <button
                                    onClick={() => navigate('/bank-accounts')}
                                    className="text-xs text-lime-400 font-bold hover:underline flex items-center gap-1"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span>
                                    Yeni Ekle
                                </button>
                            </div>

                            {loadingBanks ? (
                                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/10 animate-pulse">
                                    <div className="h-6 bg-gray-700 rounded w-1/2"></div>
                                </div>
                            ) : bankAccounts.length === 0 ? (
                                <button
                                    onClick={() => navigate('/bank-accounts')}
                                    className="w-full bg-[#1a1a1a] rounded-xl p-4 border border-dashed border-white/20 hover:border-lime-500/50 transition-colors text-center"
                                >
                                    <span className="material-symbols-outlined text-lime-400 text-3xl mb-2">add_card</span>
                                    <p className="text-white font-bold">Banka Hesabı Ekle</p>
                                    <p className="text-gray-500 text-xs mt-1">Çekim yapmak için bir banka hesabı eklemelisiniz</p>
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    {bankAccounts.map((account) => (
                                        <button
                                            key={account.id}
                                            onClick={() => setSelectedBank(account)}
                                            className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-3 ${selectedBank?.id === account.id
                                                ? 'bg-lime-500/10 border-lime-500/50'
                                                : 'bg-[#1a1a1a] border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedBank?.id === account.id
                                                ? 'bg-lime-500/20 text-lime-400'
                                                : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                <span className="material-symbols-outlined">account_balance</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-white">{account.bankName}</p>
                                                <p className="text-xs text-gray-500 font-mono">{account.iban}</p>
                                            </div>
                                            {selectedBank?.id === account.id && (
                                                <span className="material-symbols-outlined text-lime-400">check_circle</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Amount Input */}
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">Çekim Tutarı (USDT)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">$</span>
                                <input
                                    className="w-full pl-10 pr-4 py-4 rounded-xl border border-white/10 focus:border-lime-500 transition-all outline-none bg-[#1a1a1a] text-white font-bold text-lg placeholder:text-gray-600"
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">Minimum: 10 USDT • Alacağınız: ≈{(parseFloat(amount || '0') * 32).toLocaleString()} TL</p>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="flex gap-2">
                            {[50, 100, 500, 1000].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setAmount(val.toString())}
                                    className="flex-1 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-gray-400 font-bold text-sm hover:border-lime-500/50 hover:text-lime-400 transition-colors"
                                >
                                    ${val}
                                </button>
                            ))}
                        </div>

                        {/* Method Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setInstant(false)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${!instant ? 'bg-lime-500/10 border-lime-500/50' : 'bg-[#1a1a1a] border-white/5 hover:border-white/10'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-lg ${!instant ? 'text-lime-400' : 'text-white'}`}>Standart</h3>
                                    {!instant && <span className="material-symbols-outlined text-lime-400">check_circle</span>}
                                </div>
                                <p className="text-xs text-gray-500 font-medium">P2P Eşleşme</p>
                                <p className="text-xs text-lime-400 font-bold mt-1">%0 Komisyon</p>
                            </button>

                            <button
                                onClick={() => setInstant(true)}
                                className={`p-4 rounded-2xl border-2 text-left transition-all ${instant ? 'bg-lime-500/10 border-lime-500/50' : 'bg-[#1a1a1a] border-white/5 hover:border-white/10'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className={`font-bold text-lg ${instant ? 'text-lime-400' : 'text-white'}`}>Hızlı</h3>
                                    {instant && <span className="material-symbols-outlined text-lime-400">check_circle</span>}
                                </div>
                                <p className="text-xs text-gray-500 font-medium">Sistem Ödeme</p>
                                <p className="text-xs text-red-400 font-bold mt-1">%2 Komisyon</p>
                            </button>
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
        </div>
    );
};
export default Withdraw;