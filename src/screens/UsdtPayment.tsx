import React, { useState } from 'react';

const UsdtPayment = () => {
    const [tab, setTab] = useState<'deposit' | 'withdraw'>('deposit');
    const [amount, setAmount] = useState('');
    const [email, setEmail] = useState('');
    const [network, setNetwork] = useState('TRC20');

    // Deposit Specific
    const [vaultAddress, setVaultAddress] = useState('');
    const [vaultId, setVaultId] = useState('');
    const [showPayment, setShowPayment] = useState(false);

    // Withdraw Specific
    const [toAddress, setToAddress] = useState('');

    // Status
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [success, setSuccess] = useState(false);

    const API_URL = 'https://nusd-wallet-production.up.railway.app/api';

    const fetchVault = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/payment/vault`);
            const data = await res.json();
            setVaultAddress(data.address);
            setVaultId(data.vaultId);
            setShowPayment(true);
        } catch (err) {
            console.error('Error fetching vault:', err);
        }
        setLoading(false);
    };

    const copyAddress = () => {
        navigator.clipboard.writeText(vaultAddress);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // confirmPayment removed per user request

    const requestWithdraw = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/payment/withdraw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    amount: parseFloat(amount),
                    network,
                    toAddress
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
            } else {
                alert(data.error || 'Withdrawal request failed');
            }
        } catch (err) {
            alert('Connection error');
        }
        setLoading(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (tab === 'deposit') {
            if (amount && parseFloat(amount) >= 10 && email) {
                fetchVault();
            }
        } else {
            if (amount && parseFloat(amount) >= 10 && email && toAddress) {
                requestWithdraw();
            }
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4 font-display">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/10 shadow-2xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
                        <span className="material-symbols-outlined text-4xl text-white">check</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Request Submitted!</h2>
                    <p className="text-gray-400 mb-6">
                        {tab === 'deposit'
                            ? "We have received your payment notification. note: Only Vault balance updates (User balance remains unchanged)."
                            : "Your withdrawal request has been submitted and is pending approval."}
                    </p>
                    <button
                        onClick={() => {
                            setSuccess(false);
                            setShowPayment(false);
                            setAmount('');
                            setEmail('');
                            setToAddress('');
                        }}
                        className="w-full bg-white text-gray-900 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4 font-display">
            <div className="w-full max-w-md">
                {/* Logo & Tab Switcher */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
                        <span className="text-white text-2xl font-bold">₮</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-6">Tether Portal</h1>

                    <div className="bg-white/5 p-1 rounded-xl flex">
                        <button
                            onClick={() => { setTab('deposit'); setShowPayment(false); }}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${tab === 'deposit' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Deposit (Pay)
                        </button>
                        <button
                            onClick={() => { setTab('withdraw'); setShowPayment(false); }}
                            className={`flex-1 py-3 px-4 rounded-lg text-sm font-bold transition-all ${tab === 'withdraw' ? 'bg-white text-gray-900 shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            Withdraw (Get)
                        </button>
                    </div>
                </div>

                {tab === 'deposit' && !showPayment ? (
                    <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Your Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Deposit Amount (USDT)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="10" step="0.01" required className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white text-lg font-bold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        {/* Network Selection */}
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Network</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['TRC20', 'ERC20', 'BEP20'].map(net => (
                                    <button type="button" key={net} onClick={() => setNetwork(net)} className={`py-3 rounded-xl text-sm font-bold transition-all ${network === net ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}>{net}</button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={!amount || !email || loading} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg">Generate Address</button>
                    </form>
                ) : tab === 'withdraw' ? (
                    <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Your Email (Account)</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Your Wallet Address (To Receive)</label>
                            <input type="text" value={toAddress} onChange={(e) => setToAddress(e.target.value)} placeholder="T..." required className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Withdraw Amount (USDT)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" min="10" step="0.01" required className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-white text-lg font-bold placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                        </div>
                        {/* Network Selection */}
                        <div className="mb-6">
                            <label className="block text-gray-300 text-sm font-bold mb-2">Network</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['TRC20', 'ERC20', 'BEP20'].map(net => (
                                    <button type="button" key={net} onClick={() => setNetwork(net)} className={`py-3 rounded-xl text-sm font-bold transition-all ${network === net ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400'}`}>{net}</button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" disabled={!amount || !email || !toAddress || loading} className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg">Request Withdrawal</button>
                    </form>
                ) : (
                    // Deposit Payment Info View (ShowPayment)
                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                        <div className="text-center mb-6 pb-6 border-b border-white/10">
                            <p className="text-gray-400 text-sm mb-1">Amount to Pay</p>
                            <p className="text-4xl font-bold text-white">${parseFloat(amount).toFixed(2)}</p>
                            <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">{network} Network</span>
                        </div>
                        {/* QR Code Placeholder */}
                        <div className="flex justify-center mb-6">
                            <div className="w-48 h-48 bg-white rounded-2xl p-4 flex items-center justify-center">
                                <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                                    <span className="text-gray-400 text-4xl">QR</span>
                                </div>
                            </div>
                        </div>
                        {/* Wallet Address */}
                        <div className="mb-6">
                            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2 text-center">Wallet Address ({network})</p>
                            <div onClick={copyAddress} className="bg-white/5 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/10 transition-colors">
                                <p className="font-mono text-white text-sm break-all text-center">{vaultAddress}</p>
                            </div>
                        </div>
                        <button onClick={copyAddress} className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 mb-4 ${copied ? 'bg-green-500 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'}`}>
                            <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
                            {copied ? 'Copied!' : 'Copy Address'}
                        </button>
                        {/* 'I Have Paid' button removed per request */}
                        <div className="text-center p-4 bg-blue-500/10 rounded-xl mb-4 border border-blue-500/20">
                            <p className="text-blue-200 text-sm">
                                Please send exactly <span className="font-bold text-white">${parseFloat(amount).toFixed(2)}</span>.
                                The transaction will be detected automatically.
                            </p>
                        </div>
                        <button onClick={() => { setShowPayment(false); }} className="w-full mt-4 py-3 text-gray-400 hover:text-white text-sm font-medium transition-colors">← Cancel</button>
                    </div>
                )}

                <p className="text-center text-gray-500 text-xs mt-6">Powered by NUSD Wallet</p>
            </div>
        </div>
    );
};

export default UsdtPayment;
