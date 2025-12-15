import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../services/api';

interface BankAccount {
    id: string;
    bankName: string;
    iban: string;
    addedAt: string;
}

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

    // Fetch user's bank accounts on mont
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

    const search = async () => {
        if (!selectedBank) {
            alert('Lütfen önce bir banka hesabı seçin veya ekleyin.');
            return;
        }

        setLoading(true);

        try {
            // NEW P2P API - calls p2p-create-order Edge Function
            const result = await api.createP2POrderNew('BUY', parseFloat(amount));

            if (!result) {
                alert('Sunucu hatası: Yanıt alınamadı');
                setLoading(false);
                return;
            }

            if (result.success && result.order) {
                const orderId = result.order.id;
                setPending(orderId);

                // Attempt to find a match immediately
                const matchResult = await api.matchP2POrder(orderId);

                if (matchResult?.success && matchResult?.match) {
                    // Anında eşleşti - seller IBAN'ı göster
                    setMatch({
                        id: matchResult.match.matchedOrderId,
                        amount: result.order.amount_usd * 32, // Mock TRY rate
                        sellerIBAN: matchResult.match.counterparty?.iban || 'N/A',
                        sellerName: matchResult.match.counterparty?.account_name || 'Satıcı',
                        sellerBank: matchResult.match.counterparty?.bank_name || 'Banka',
                        timeRemaining: matchResult.match.lock_expires_at
                    });
                    setPending(null);
                } else {
                    // Bekleme durumu - polling başlat
                    startPolling(orderId);
                }
            } else {
                alert('İstek oluşturulamadı: ' + (result?.error || 'Bilinmeyen hata'));
            }
        } catch (e: any) {
            console.error('Search error:', e);
            alert('Hata: ' + (e.message || 'Bağlantı hatası'));
        }

        setLoading(false);
    };

    const startPolling = (orderId: string) => {
        const interval = setInterval(async () => {
            const order = await api.getP2POrderStatus(orderId);

            if (order && order.status === 'MATCHED') {
                // Match bulundu!
                setConfirmed(false);
                setMatch({
                    id: orderId,
                    amount: order.amount_usd * 32,
                    sellerIBAN: order.seller_iban || 'N/A',
                    sellerName: order.seller_account_name || 'Satıcı',
                    sellerBank: order.seller_bank_name || 'Banka'
                });
                setPending(null);
                clearInterval(interval);
                setPollInterval(null);
            } else if (order?.status === 'EXPIRED' || order?.status === 'CANCELLED') {
                clearInterval(interval);
                setPollInterval(null);
                alert('Sipariş süresi doldu veya iptal edildi');
            }
        }, 5000); // Poll every 5 seconds

        setPollInterval(interval as any);

        // Stop polling after 10 minutes
        setTimeout(() => {
            clearInterval(interval);
            setPollInterval(null);
            if (pending) {
                alert('Eşleşme bulunamadı. Lütfen daha sonra tekrar deneyin.');
            }
        }, 10 * 60 * 1000);
    };

    const proceed = async () => {
        if (match) await api.lockMatch(match.id, user?.email || '');
        navigate('/deposit/confirm', {
            state: {
                amount: parseFloat(amount),
                matchId: match?.id,
                orderId: pending, // P2P order ID for markP2PPaid
                matchedInvestorEmail: match?.userId,
                bankAccount: selectedBank,
                matchDetails: match // Pass full match details including IBAN/Name
            }
        });
    }

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col font-display pb-20">
            {/* Header */}
            <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Para Yatır</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Info Alert */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <span className="material-symbols-outlined text-blue-400 shrink-0">info</span>
                    <div>
                        <p className="text-sm text-blue-300">
                            <span className="font-bold">Dekont Yükleme İsteğe Bağlı:</span> Dekont yüklerseniz işlem 20 dakika içinde otomatik onaylanır.
                        </p>
                    </div>
                </div>

                {/* Bank Account Selection */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-bold text-gray-400">Banka Hesabınız</label>
                        <button
                            onClick={() => navigate('/bank-accounts')}
                            className="text-xs text-lime-400 font-bold hover:underline flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">add</span>
                            Yeni Ekle
                        </button>
                    </div>

                    {loading ? (
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
                            <p className="text-gray-500 text-xs mt-1">Para yatırmak için bir banka hesabı eklemelisiniz</p>
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
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold truncate">{account.bankName}</p>
                                        <p className="text-gray-500 text-xs font-mono truncate">{account.iban}</p>
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
                    <label className="block text-sm font-bold text-gray-400 mb-2">Yatırılacak Tutar (USDT)</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-gray-500">$</span>
                        <input
                            className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-white/10 focus:border-lime-500 transition-all outline-none bg-[#1a1a1a] text-white font-bold text-xl placeholder:text-gray-600"
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                    </div>
                </div>

                {/* Quick Amount Buttons */}
                <div className="flex gap-2">
                    {[100, 500, 1000, 5000].map((val) => (
                        <button
                            key={val}
                            onClick={() => setAmount(val.toString())}
                            className="flex-1 py-2 rounded-lg bg-[#1a1a1a] border border-white/10 text-gray-400 font-bold text-sm hover:border-lime-500/50 hover:text-lime-400 transition-colors"
                        >
                            ${val}
                        </button>
                    ))}\n                </div>

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
                            <p className="text-xs text-lime-500 mt-1 font-mono">≈ {parseFloat(amount).toLocaleString()} USDT</p>
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
            </div>
        </div>
    );
};
export default Deposit;