import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { supabase } from '../services/supabase';

const CryptoDeposit = () => {
    const navigate = useNavigate();
    const { user } = useApp();
    const [network, setNetwork] = useState('TRC20');
    const [copied, setCopied] = useState<'address' | 'memo' | null>(null);
    const [amount, setAmount] = useState('');
    const [txHash, setTxHash] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const VAULT_ADDRESS = 'TAeaxxAUqqpdKJmvg9JPHajTNQLRfwdJ3F';

    const memoCode = useMemo(() => {
        if (!user?.email) return 'NUSD-XXXX';
        const hash = user.email.split('').reduce((acc, char) => {
            return ((acc << 5) - acc) + char.charCodeAt(0);
        }, 0);
        const code = Math.abs(hash).toString(36).toUpperCase().slice(0, 6);
        return `NUSD-${code}`;
    }, [user?.email]);

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
                    network,
                    txHash: txHash || null
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
            <div className="min-h-screen bg-[#111111] flex flex-col font-display">
                <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10">
                    <button onClick={() => navigate('/dashboard')} className="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                    </button>
                    <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Deposit USDT</h1>
                </div>
                <div className="flex-1 flex items-center justify-center p-4">
                    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-white/5 text-center max-w-sm">
                        <div className="w-16 h-16 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-lime-400 text-3xl">check_circle</span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2">Deposit Submitted!</h2>
                        <p className="text-gray-400 mb-6">Your deposit notification has been submitted. An admin will verify and approve it shortly.</p>
                        <button onClick={() => navigate('/dashboard')} className="w-full bg-lime-500 text-black py-3 rounded-xl font-bold">
                            Back to Dashboard
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
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Deposit USDT</h1>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
                {/* Network Selection */}
                <div>
                    <h3 className="font-bold text-gray-400 mb-2 text-sm">Select Network</h3>
                    <div className="grid grid-cols-3 gap-2 bg-[#1a1a1a] p-1 rounded-xl border border-white/5">
                        {['TRC20', 'ERC20', 'BEP20'].map(net => (
                            <button
                                key={net}
                                onClick={() => setNetwork(net)}
                                className={`py-2 rounded-lg text-sm font-bold transition-all ${network === net ? 'bg-lime-500 text-black' : 'text-gray-400 hover:bg-white/5'}`}
                            >
                                {net}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Wallet Address */}
                <div className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5">
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-2">Deposit Address ({network})</p>
                    <div
                        className="bg-[#111111] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-[#0a0a0a]"
                        onClick={() => copyToClipboard(VAULT_ADDRESS, 'address')}
                    >
                        <p className="font-mono text-white font-medium text-sm truncate mr-2">{VAULT_ADDRESS}</p>
                        <span className={`material-symbols-outlined transition-colors ${copied === 'address' ? 'text-lime-400' : 'text-lime-500'}`}>
                            {copied === 'address' ? 'check' : 'content_copy'}
                        </span>
                    </div>
                </div>

                {/* MEMO Code */}
                <div className="bg-gradient-to-r from-lime-500/10 to-purple-500/10 rounded-2xl p-4 border border-lime-500/20">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-lime-400 text-lg">tag</span>
                        <p className="text-xs text-lime-400 font-bold uppercase tracking-wide">Your MEMO Code (Important!)</p>
                    </div>
                    <div
                        className="bg-[#1a1a1a] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-[#222] border border-lime-500/20"
                        onClick={() => copyToClipboard(memoCode, 'memo')}
                    >
                        <p className="font-mono text-white font-bold text-lg tracking-widest">{memoCode}</p>
                        <span className={`material-symbols-outlined transition-colors ${copied === 'memo' ? 'text-lime-400' : 'text-lime-500'}`}>
                            {copied === 'memo' ? 'check' : 'content_copy'}
                        </span>
                    </div>
                    <p className="text-xs text-lime-400/70 mt-2">Add this code to the MEMO/Note field when sending funds.</p>
                </div>

                {/* Deposit Notification Form */}
                <form onSubmit={handleSubmit} className="bg-[#1a1a1a] rounded-2xl p-4 border border-white/5 space-y-4">
                    <h3 className="font-bold text-gray-400 text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">receipt_long</span>
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
                            className="w-full border border-white/10 bg-[#111111] rounded-xl p-3 text-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-lime-500 placeholder:text-gray-600"
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 font-bold mb-1">Transaction Hash (Optional)</label>
                        <input
                            type="text"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            placeholder="Paste TX hash..."
                            className="w-full border border-white/10 bg-[#111111] rounded-xl p-3 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-lime-500 placeholder:text-gray-600"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting || !amount}
                        className="w-full bg-lime-500 hover:bg-lime-400 text-black py-3 rounded-xl font-bold disabled:opacity-50 transition-colors"
                    >
                        {submitting ? 'Submitting...' : 'Submit Deposit Notification'}
                    </button>
                </form>

                {/* Warning */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                    <span className="material-symbols-outlined text-amber-400 shrink-0">warning</span>
                    <div className="text-amber-300 text-sm">
                        <p className="font-bold mb-1">Important:</p>
                        <ul className="list-disc list-inside space-y-1 text-amber-300/80">
                            <li>Send only <span className="font-bold">USDT ({network})</span></li>
                            <li>Include your <span className="font-bold">MEMO code</span></li>
                            <li>Minimum deposit: <span className="font-bold">10.00 USDT</span></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default CryptoDeposit;