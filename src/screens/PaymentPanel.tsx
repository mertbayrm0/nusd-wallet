import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

const PaymentPanel = () => {
    const { slug } = useParams<{ slug: string }>();

    const [panel, setPanel] = useState<any>(null);
    const [department, setDepartment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Flow State
    const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');

    // Form States (for withdraw)
    const [amount, setAmount] = useState('');
    const [walletAddress, setWalletAddress] = useState('');

    useEffect(() => {
        if (slug) loadData();
    }, [slug]);

    const loadData = async () => {
        setLoading(true);
        const p = await api.getPanelBySlug(slug!);
        if (p) {
            setPanel(p);
            // Fetch department with NUSD address
            if (p.department_id) {
                const dept = await api.getDepartment(p.department_id);
                if (dept) {
                    setDepartment(dept);
                }
            }
        } else {
            setError('Portal not found');
        }
        setLoading(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Kopyalandı!');
    };

    const handleWithdraw = async () => {
        alert('Çekim talebi gönderildi. Admin onayı bekleniyor.');
    };

    if (loading) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">Loading Portal...</div>;
    if (error || !panel) return <div className="min-h-screen bg-[#0F172A] flex items-center justify-center text-white">{error || 'Not Found'}</div>;

    const nusdAddress = department?.nusd_address || 'Adres Bulunamadı';

    return (
        <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 font-sans text-slate-300">
            {/* Logo area */}
            <div className="mb-6 flex flex-col items-center animate-fade-in-down">
                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
                    <span className="text-white text-2xl font-bold">₮</span>
                </div>
                <h1 className="text-2xl font-bold text-white tracking-tight">{panel.name}</h1>
                <p className="text-sm text-slate-500 mt-1">{department?.name}</p>
            </div>

            {/* Card */}
            <div className="bg-[#1E293B] w-full max-w-md rounded-3xl p-2 shadow-2xl border border-slate-700/50">
                {/* Toggle */}
                <div className="bg-[#0F172A]/50 p-1 rounded-2xl flex mb-6">
                    <button
                        onClick={() => setMode('deposit')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'deposit'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Yatırım (Deposit)
                    </button>
                    <button
                        onClick={() => setMode('withdraw')}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'withdraw'
                            ? 'bg-white text-slate-900 shadow-md'
                            : 'text-slate-400 hover:text-white'
                            }`}
                    >
                        Çekim (Withdraw)
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 pb-6 space-y-5">

                    {mode === 'deposit' ? (
                        // DEPOSIT VIEW - Show NUSD Address
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-2">Yatırım Adresi</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Bu NUSD adresine <b className="text-white">kendi cüzdanınızdan</b> transfer yapın
                            </p>

                            {/* NUSD Address Box */}
                            <div className="bg-lime-500/10 border-2 border-lime-500/50 p-4 rounded-xl mb-4">
                                <p className="text-xs text-lime-400 font-bold uppercase mb-2"># NUSD Adresi (Önemli!)</p>
                                <div
                                    className="flex items-center justify-between bg-[#0F172A] p-3 rounded-lg cursor-pointer group"
                                    onClick={() => copyToClipboard(nusdAddress)}
                                >
                                    <span className="text-lime-300 font-mono font-bold text-lg tracking-widest">{nusdAddress}</span>
                                    <span className="material-symbols-outlined text-lime-400 opacity-60 group-hover:opacity-100">content_copy</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-2">Cüzdanınızdan transfer yaparken bu adresi kullanın</p>
                            </div>

                            {/* Instructions */}
                            <div className="bg-[#0F172A] p-4 rounded-xl text-left space-y-2">
                                <p className="text-xs text-slate-400">
                                    <span className="text-indigo-400 font-bold">1.</span> Wallet uygulamanızda "Gönder" butonuna basın
                                </p>
                                <p className="text-xs text-slate-400">
                                    <span className="text-indigo-400 font-bold">2.</span> Alıcı olarak yukarıdaki NUSD adresini girin
                                </p>
                                <p className="text-xs text-slate-400">
                                    <span className="text-indigo-400 font-bold">3.</span> Transfer anında tamamlanır
                                </p>
                            </div>
                        </div>
                    ) : (
                        // WITHDRAW VIEW
                        <>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tutar</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#334155]/50 border border-slate-600 rounded-xl p-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                    placeholder="100"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cüzdan Adresi (NUSD veya TRX)</label>
                                <input
                                    type="text"
                                    className="w-full bg-[#334155]/50 border border-slate-600 rounded-xl p-3 text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                                    placeholder="NUSD-XXXXXX veya T..."
                                    value={walletAddress}
                                    onChange={e => setWalletAddress(e.target.value)}
                                />
                            </div>

                            <button
                                onClick={handleWithdraw}
                                className="w-full bg-gradient-to-r from-rose-600 to-pink-600 text-white py-3.5 rounded-xl font-bold text-sm hover:from-rose-500 hover:to-pink-500 transition-all shadow-lg shadow-rose-500/20"
                            >
                                Çekim Talebi Gönder
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Footer */}
            <p className="text-xs text-slate-600 mt-8">Powered by NUSD Wallet</p>
        </div>
    );
};

export default PaymentPanel;
