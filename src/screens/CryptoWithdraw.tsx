import React, { useState } from 'react';
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
                    alert(`✅ ${val} USDT transferred to ${address.toUpperCase()}`);
                    refreshUser();
                    navigate('/dashboard');
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
                } else {
                    alert(data?.error || "Withdrawal failed");
                }
            }
        } catch (e: any) {
            alert(e.message || "Transfer failed");
        }
        setLoading(false);
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
        </div>
    );
};
export default CryptoWithdraw;