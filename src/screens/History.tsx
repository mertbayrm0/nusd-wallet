import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const History = () => {
    const navigate = useNavigate();
    const [txs, setTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTransactions = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error('Transactions fetch error:', error);
                } else {
                    setTxs(data || []);
                }
            } catch (e) {
                console.error('Transactions exception:', e);
            }
            setLoading(false);
        };
        fetchTransactions();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return 'text-lime-400';
            case 'PENDING': return 'text-amber-400';
            case 'CANCELLED': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'DEPOSIT': return 'arrow_downward';
            case 'WITHDRAW': return 'arrow_upward';
            case 'TRANSFER': return 'swap_horiz';
            default: return 'receipt_long';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

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
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">İşlem Geçmişi</h1>
            </div>

            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-500 mb-4"></div>
                        <p className="font-medium">Yükleniyor...</p>
                    </div>
                ) : txs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-20">history_toggle_off</span>
                        <p className="font-medium">Henüz işlem yok</p>
                    </div>
                ) : (
                    txs.map((tx: any) => (
                        <div key={tx.id} className="bg-[#1a1a1a] p-4 rounded-2xl border border-white/5 flex items-center justify-between hover:bg-[#222] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'DEPOSIT' ? 'bg-lime-500/20 text-lime-400' :
                                        tx.type === 'WITHDRAW' ? 'bg-red-500/20 text-red-400' :
                                            'bg-blue-500/20 text-blue-400'
                                    }`}>
                                    <span className="material-symbols-outlined">
                                        {getTypeIcon(tx.type)}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm">
                                        {tx.type === 'DEPOSIT' ? 'Yatırım' :
                                            tx.type === 'WITHDRAW' ? 'Çekim' :
                                                tx.type === 'TRANSFER' ? 'Transfer' : tx.type}
                                    </h3>
                                    <p className="text-gray-500 text-xs font-medium mt-0.5">{formatDate(tx.created_at)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold text-base ${tx.type === 'DEPOSIT' ? 'text-lime-400' : 'text-white'}`}>
                                    {tx.type === 'DEPOSIT' ? '+' : tx.type === 'WITHDRAW' ? '-' : ''}{Math.abs(tx.amount).toLocaleString()} <span className="text-xs text-gray-500 font-bold ml-0.5">USDT</span>
                                </p>
                                <p className={`text-xs font-medium mt-0.5 capitalize ${getStatusColor(tx.status)}`}>
                                    {tx.status === 'COMPLETED' ? 'Tamamlandı' :
                                        tx.status === 'PENDING' ? 'Beklemede' :
                                            tx.status === 'CANCELLED' ? 'İptal Edildi' : tx.status}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
export default History;