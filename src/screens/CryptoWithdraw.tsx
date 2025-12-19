import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { supabase } from '../services/supabase';

const CryptoWithdraw = () => {
    const navigate = useNavigate();
    const { user, refreshUser } = useApp();
    const [amount, setAmount] = useState('');
    const [address, setAddress] = useState('');
    const [network, setNetwork] = useState('Tron (TRC20)');
    const [loading, setLoading] = useState(false);

    // Pending withdrawal state
    const [pendingWithdrawal, setPendingWithdrawal] = useState<any>(null);
    const [checkingPending, setCheckingPending] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    // Success modal state
    const [showSuccess, setShowSuccess] = useState(false);
    const [successAmount, setSuccessAmount] = useState(0);
    const [successRecipient, setSuccessRecipient] = useState('');

    // Check for pending withdrawal on mount
    useEffect(() => {
        const checkPending = async () => {
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) return;

                const { data } = await supabase
                    .from('transactions')
                    .select('id, amount, created_at, network')
                    .eq('user_id', authUser.id)
                    .eq('type', 'WITHDRAW')
                    .eq('status', 'PENDING')
                    .limit(1);

                if (data && data.length > 0) {
                    setPendingWithdrawal(data[0]);
                }
            } catch (e) {
                console.error('Check pending error:', e);
            }
            setCheckingPending(false);
        };
        checkPending();
    }, []);

    // Cancel pending withdrawal
    const cancelPending = async () => {
        if (!pendingWithdrawal) return;
        setCancelling(true);
        try {
            const { data, error } = await supabase.functions.invoke('cancel-withdrawal', {
                body: { transactionId: pendingWithdrawal.id }
            });

            if (error) {
                alert(error.message || 'İptal başarısız');
            } else if (data?.success) {
                alert('✅ Çekim talebi iptal edildi. Bakiyeniz iade edildi.');
                setPendingWithdrawal(null);
                refreshUser();
            } else {
                alert(data?.error || 'İptal başarısız');
            }
        } catch (e: any) {
            alert(e.message || 'İptal başarısız');
        }
        setCancelling(false);
    };

    // Detect if it's internal transfer (NUSD-XXXX) or external (wallet address)
    const isInternalTransfer = address.toUpperCase().startsWith('NUSD-');

    // Internal transfer: no fee, External: 1 USDT fee
    const fee = isInternalTransfer ? 0 : 1.00;
    const val = parseFloat(amount) || 0;
    const receiveAmount = val > fee ? val - fee : 0.00;
    const isValid = address.length > 5 && val >= 10;

    const handleMax = () => {
        if (user) setAmount(user.balance.toString());
    };

    const submit = async () => {
        if (!isValid) return;
        setLoading(true);

        try {
            if (isInternalTransfer) {
                // Internal Transfer - anında gerçekleşir
                const { data, error } = await supabase.functions.invoke('internal-transfer', {
                    body: {
                        amount: val,
                        recipient_code: address.toUpperCase()
                    }
                });

                if (error) {
                    alert(error.message || "Transfer failed");
                } else if (data?.success) {
                    // Show success modal instead of alert
                    setSuccessAmount(val);
                    setSuccessRecipient(address.toUpperCase());
                    setShowSuccess(true);
                    refreshUser();
                } else {
                    alert(data?.error || "Transfer failed");
                }
            } else {
                // External Withdraw - PENDING olarak gider
                const { data, error } = await supabase.functions.invoke('withdraw-request', {
                    body: {
                        amount: val,
                        asset: network
                    }
                });

                if (error) {
                    alert(error.message || "Withdrawal failed");
                } else if (data?.success) {
                    alert("Withdrawal Request Submitted (Pending)");
                    refreshUser();
                    navigate('/dashboard');
                } else if (data?.hasPendingWithdrawal) {
                    // Server returned pending withdrawal info
                    setPendingWithdrawal(data.pendingWithdrawal);
                    alert(data.error);
                } else {
                    alert(data?.error || "Withdrawal failed");
                }
            }
        } catch (e: any) {
            alert(e.message || "Transfer failed");
        }
        setLoading(false);
    }

    // Loading state
    if (checkingPending) {
        return (
            <div className="min-h-screen bg-[#111111] flex items-center justify-center">
                <div className="text-gray-400">Yükleniyor...</div>
            </div>
        );
    }

    // Show pending withdrawal if exists
    if (pendingWithdrawal) {
        return (
            <div className="min-h-screen bg-[#111111] flex flex-col font-display">
                <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10">
                    <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Send USDT</h1>
                </div>

                <div className="p-4 flex-1 flex flex-col items-center justify-center">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full text-center">
                        <span className="material-symbols-outlined text-amber-400 text-5xl mb-4">pending</span>
                        <h2 className="text-xl font-bold text-white mb-2">Bekleyen Çekim Talebi</h2>
                        <p className="text-gray-400 mb-4">Zaten bir çekim talebiniz işleniyor. Yeni talep oluşturmak için mevcut talebin tamamlanmasını bekleyin veya iptal edin.</p>

                        <div className="bg-[#0a0a0a] rounded-xl p-4 mb-4">
                            <p className="text-2xl font-bold text-amber-400">${pendingWithdrawal.amount}</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {new Date(pendingWithdrawal.created_at).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-500">{pendingWithdrawal.network}</p>
                        </div>

                        <button
                            onClick={cancelPending}
                            disabled={cancelling}
                            className="w-full bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold disabled:opacity-50 mb-3"
                        >
                            {cancelling ? 'İptal Ediliyor...' : 'Talebi İptal Et'}
                        </button>

                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full bg-[#1a1a1a] text-gray-400 py-3 rounded-xl font-bold border border-white/10"
                        >
                            Bekle, Geri Dön
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col font-display">
            <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10">
                <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Send USDT</h1>
            </div>

            <div className="p-4 space-y-6">
                {/* Available Balance */}
                <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/5">
                    <p className="text-gray-500 font-medium text-sm mb-1">Available Balance</p>
                    <h2 className="text-3xl font-extrabold text-white tracking-tight">
                        {user?.balance.toLocaleString()} <span className="text-xl font-bold text-gray-500">USDT</span>
                    </h2>
                </div>

                {/* Smart Address Input */}
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">
                        Recipient Address or NUSD Code
                    </label>
                    <div className="relative">
                        <input
                            className="w-full pl-4 pr-12 py-3.5 rounded-xl border border-white/10 focus:border-lime-500 transition-all outline-none bg-[#1a1a1a] text-white font-medium placeholder:text-gray-600"
                            placeholder="NUSD-XXXX or TAeaxx..."
                            value={address}
                            onChange={e => setAddress(e.target.value)}
                        />
                        <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 ${isInternalTransfer ? 'text-lime-400' : 'text-gray-500'}`}>
                            {isInternalTransfer ? 'bolt' : 'qr_code_scanner'}
                        </span>
                    </div>

                    {/* Transfer Type Indicator */}
                    {address.length > 3 && (
                        <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 ${isInternalTransfer
                            ? 'bg-lime-500/20 text-lime-400'
                            : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            <span className="material-symbols-outlined text-sm">
                                {isInternalTransfer ? 'bolt' : 'language'}
                            </span>
                            {isInternalTransfer ? 'Internal Transfer (Instant, No Fee)' : 'External Withdraw (Blockchain)'}
                        </div>
                    )}
                </div>

                {/* Network - only show for external */}
                {!isInternalTransfer && (
                    <div>
                        <label className="block text-sm font-bold text-gray-400 mb-2">Network</label>
                        <div className="relative">
                            <select
                                className="w-full px-4 py-3.5 rounded-xl border border-white/10 focus:border-lime-500 transition-all outline-none bg-[#1a1a1a] text-white font-medium appearance-none"
                                value={network}
                                onChange={e => setNetwork(e.target.value)}
                            >
                                <option>Tron (TRC20)</option>
                                <option>Ethereum (ERC20)</option>
                                <option>BSC (BEP20)</option>
                            </select>
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">expand_more</span>
                        </div>
                    </div>
                )}

                {/* Amount */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="block text-sm font-bold text-gray-400">Amount</label>
                        <button onClick={handleMax} className="text-lime-400 text-xs font-bold hover:text-lime-300">MAX</button>
                    </div>
                    <div className="relative">
                        <input
                            className="w-full pl-4 pr-16 py-3.5 rounded-xl border border-white/10 focus:border-lime-500 transition-all outline-none bg-[#1a1a1a] text-white font-bold text-lg placeholder:text-gray-600"
                            type="number"
                            placeholder="Min 10.00"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">USDT</span>
                    </div>
                </div>

                {/* Summary */}
                <div className="bg-[#1a1a1a] rounded-xl p-4 border border-white/5 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Fee</span>
                        <span className={`font-bold ${isInternalTransfer ? 'text-lime-400' : 'text-white'}`}>
                            {isInternalTransfer ? 'FREE' : `${fee.toFixed(2)} USDT`}
                        </span>
                    </div>
                    <div className="flex justify-between text-base border-t border-white/5 pt-2 mt-2">
                        <span className="font-bold text-white">Receive Amount</span>
                        <span className="font-bold text-lime-400">{(isInternalTransfer ? val : receiveAmount).toFixed(2)} USDT</span>
                    </div>
                </div>

                <button
                    onClick={submit}
                    disabled={!isValid || loading}
                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-xl transition-all ${isValid && !loading
                        ? 'bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-black shadow-lime-500/20'
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
                        }`}
                >
                    {loading ? 'Processing...' : isInternalTransfer ? '⚡ Send Instantly' : 'Confirm Withdrawal'}
                </button>
            </div>

            {/* Success Modal */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    {/* Modal */}
                    <div className="relative bg-[#1a1a1a] border border-lime-500/30 rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-scale-in text-center">
                        {/* Success Icon */}
                        <div className="w-20 h-20 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-5xl text-lime-400">check_circle</span>
                        </div>
                        {/* Title */}
                        <h2 className="text-2xl font-bold text-white mb-2">Transfer Başarılı!</h2>
                        {/* Amount */}
                        <div className="bg-[#111111] rounded-xl p-4 mb-4">
                            <p className="text-3xl font-extrabold text-lime-400">{successAmount.toLocaleString()} USDT</p>
                            <p className="text-gray-500 text-sm mt-1">gönderildi</p>
                        </div>
                        {/* Recipient */}
                        <div className="bg-[#0a0a0a] rounded-lg px-4 py-3 mb-6">
                            <p className="text-xs text-gray-500 mb-1">Alıcı</p>
                            <p className="font-mono text-lime-400 font-bold">{successRecipient}</p>
                        </div>
                        {/* Button */}
                        <button
                            onClick={() => {
                                setShowSuccess(false);
                                navigate('/dashboard');
                            }}
                            className="w-full bg-lime-500 hover:bg-lime-400 text-black py-4 rounded-xl font-bold text-lg transition-all"
                        >
                            Tamam
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
export default CryptoWithdraw;