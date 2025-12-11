import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../services/api';

const History = () => {
    const navigate = useNavigate();
    const { user } = useApp();
    const [txs, setTxs] = useState([]);

    useEffect(() => {
        if (user) {
            api.getTransactions(user.email).then(setTxs);
        }
    }, [user]);

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col font-display">
            {/* Header */}
            <div className="bg-[#1a1a1a] px-4 py-4 flex items-center border-b border-white/5 sticky top-0 z-10">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-gray-400">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Transaction History</h1>
            </div>

            <div className="p-4 space-y-3">
                {txs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-20">history_toggle_off</span>
                        <p className="font-medium">No transactions found</p>
                    </div>
                ) : (
                    txs.map((tx: any) => (
                        <div key={tx.id} className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-[#222] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tx.amount > 0 ? 'bg-lime-500/20 text-lime-400' : 'bg-red-500/20 text-red-400'}`}>
                                    <span className="material-symbols-outlined">
                                        {tx.amount > 0 ? 'arrow_downward' : 'arrow_upward'}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">{tx.title}</h3>
                                    <p className="text-gray-500 text-xs font-medium mt-0.5">{tx.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold text-base ${tx.amount > 0 ? 'text-lime-400' : 'text-white'}`}>
                                    {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount).toLocaleString()} <span className="text-xs text-gray-500 font-bold ml-0.5">USDT</span>
                                </p>
                                <p className={`text-xs font-medium mt-0.5 capitalize ${tx.status?.toLowerCase() === 'completed' ? 'text-lime-400' : 'text-amber-400'}`}>{tx.status === 'PAYMENT_REVIEW' ? 'PENDING' : tx.status}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
export default History;