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
                console.log('[History] Current user:', user?.id, user?.email);

                if (!user) {
                    console.log('[History] No user found');
                    setLoading(false);
                    return;
                }

                // 1. Normal transactions
                const { data: transactions, error: txError } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (txError) console.error('[History] Transactions error:', txError);

                // 2. P2P orders
                const { data: p2pOrders, error: p2pError } = await supabase
                    .from('p2p_orders')
                    .select('*')
                    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
                    .in('status', ['COMPLETED'])
                    .order('created_at', { ascending: false });

                if (p2pError) console.error('[History] P2P error:', p2pError);

                // Convert P2P orders to transaction format - deduplicate matched pairs
                const seenPairs = new Set<string>();
                const p2pAsTxs = (p2pOrders || [])
                    .filter((order: any) => {
                        if (order.matched_order_id) {
                            const pairKey = [order.id, order.matched_order_id].sort().join('|');
                            if (seenPairs.has(pairKey)) return false;
                            seenPairs.add(pairKey);
                        }
                        return true;
                    })
                    .map((order: any) => {
                        const isSeller = order.seller_id === user.id;
                        return {
                            id: order.id,
                            type: isSeller ? 'P2P_SELL' : 'P2P_BUY',
                            amount: isSeller ? -order.amount_usd : order.amount_usd,
                            status: order.status,
                            created_at: order.created_at
                        };
                    });

                // Combine and sort
                const allTxs = [...(transactions || []), ...p2pAsTxs]
                    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                console.log('[History] Combined result:', { count: allTxs.length });
                setTxs(allTxs);
            } catch (e) {
                console.error('[History] Exception:', e);
            }
            setLoading(false);
        };
        fetchTransactions();
    }, []);

    const getStatusColor = (status: string) => {
        switch (status?.toUpperCase()) {
            case 'COMPLETED': return 'text-emerald-500';
            case 'PENDING': return 'text-amber-500';
            case 'CANCELLED': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'DEPOSIT':
            case 'P2P_BUY': return 'arrow_downward';
            case 'WITHDRAW':
            case 'P2P_SELL': return 'arrow_upward';
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
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display">
            {/* Header */}
            <div className="px-4 py-4 flex items-center sticky top-0 z-10">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">İşlem Geçmişi</h1>
            </div>

            <div className="p-4 space-y-3 flex-1">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-300">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-lime-400 mb-4"></div>
                        <p className="font-medium">Yükleniyor...</p>
                    </div>
                ) : txs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-emerald-300">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-20">history_toggle_off</span>
                        <p className="font-medium">Henüz işlem yok</p>
                    </div>
                ) : (
                    txs.map((tx: any) => (
                        <div key={tx.id} className="bg-white p-4 rounded-2xl shadow-lg flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${['DEPOSIT', 'P2P_BUY'].includes(tx.type) ? 'bg-emerald-100 text-emerald-600' :
                                    ['WITHDRAW', 'P2P_SELL'].includes(tx.type) ? 'bg-red-100 text-red-500' :
                                        'bg-blue-100 text-blue-500'
                                    }`}>
                                    <span className="material-symbols-outlined">
                                        {getTypeIcon(tx.type)}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-sm">
                                        {tx.type === 'DEPOSIT' ? 'Yatırım' :
                                            tx.type === 'WITHDRAW' ? 'Çekim' :
                                                tx.type === 'TRANSFER' ? 'Transfer' :
                                                    tx.type === 'P2P_BUY' ? 'P2P Alış' :
                                                        tx.type === 'P2P_SELL' ? 'P2P Satış' : tx.type}
                                    </h3>
                                    <p className="text-gray-400 text-xs font-medium mt-0.5">{formatDate(tx.created_at)}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`font-bold text-base ${['DEPOSIT', 'P2P_BUY'].includes(tx.type) ? 'text-emerald-500' : 'text-gray-900'}`}>
                                    {['DEPOSIT', 'P2P_BUY'].includes(tx.type) ? '+' : ['WITHDRAW', 'P2P_SELL'].includes(tx.type) ? '-' : ''}${Math.abs(tx.amount).toLocaleString()} <span className="text-xs text-gray-400 font-bold ml-0.5">USD</span>
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