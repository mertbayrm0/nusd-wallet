import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

interface P2POrder {
    id: string;
    status: string;
    amount_usd: number;
    buyer_id: string | null;
    seller_id: string | null;
    matched_order_id: string | null;
    created_at: string;
    updated_at: string;
    buyer?: { email: string; name: string } | null;
    seller?: { email: string; name: string } | null;
}

const AdminP2POrders = () => {
    const [orders, setOrders] = useState<P2POrder[]>([]);
    const [filter, setFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        setLoading(true);
        const data = await api.getAllP2POrders();
        setOrders(data);
        setLoading(false);
    };

    const filteredOrders = orders.filter(o => filter === 'all' || o.status === filter.toUpperCase());

    const handleForceComplete = async (orderId: string) => {
        if (!confirm('Bu siparişi zorla tamamlamak istediğinize emin misiniz?')) return;

        setActionLoading(orderId);
        const result = await api.adminForceCompleteP2POrder(orderId);
        setActionLoading(null);

        if (result.success) {
            alert('Sipariş başarıyla tamamlandı');
            loadOrders();
        } else {
            alert(`Hata: ${result.error}`);
        }
    };

    const handleForceCancel = async (orderId: string) => {
        if (!confirm('Bu siparişi zorla iptal etmek istediğinize emin misiniz?')) return;

        setActionLoading(orderId);
        const result = await api.adminForceCancelP2POrder(orderId);
        setActionLoading(null);

        if (result.success) {
            alert('Sipariş başarıyla iptal edildi');
            loadOrders();
        } else {
            alert(`Hata: ${result.error}`);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'bg-blue-50 text-blue-600';
            case 'MATCHED': return 'bg-purple-50 text-purple-600';
            case 'PAID': return 'bg-amber-50 text-amber-600';
            case 'COMPLETED': return 'bg-green-50 text-green-600';
            case 'CANCELLED': return 'bg-red-50 text-red-600';
            default: return 'bg-gray-50 text-gray-600';
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('tr-TR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <AdminLayout title="P2P Orders">
            {/* Filter Buttons */}
            <div className="mb-6 flex gap-2 flex-wrap">
                {['all', 'open', 'matched', 'paid', 'completed', 'cancelled'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${filter === f
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        {f === 'all' ? 'Tümü' : f}
                    </button>
                ))}
                <button
                    onClick={loadOrders}
                    className="ml-auto px-4 py-2 rounded-lg text-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    Yenile
                </button>
            </div>

            {/* Orders Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Alıcı (Buyer)</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Satıcı (Seller)</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Miktar</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Durum</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        <div className="animate-spin inline-block w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full"></div>
                                        <p className="mt-2">Yükleniyor...</p>
                                    </td>
                                </tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">
                                        Gösterilecek sipariş yok
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4 text-xs text-gray-400 font-mono">
                                            {order.id.substring(0, 8)}...
                                        </td>
                                        <td className="p-4">
                                            {order.buyer ? (
                                                <div>
                                                    <div className="text-sm font-bold text-gray-700">{order.buyer.name || 'N/A'}</div>
                                                    <div className="text-xs text-gray-400">{order.buyer.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            {order.seller ? (
                                                <div>
                                                    <div className="text-sm font-bold text-gray-700">{order.seller.name || 'N/A'}</div>
                                                    <div className="text-xs text-gray-400">{order.seller.email}</div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-900">
                                            ${order.amount_usd.toLocaleString()}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-gray-500">
                                            {formatDate(order.created_at)}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex gap-2 justify-end">
                                                {/* Force Complete Button */}
                                                {['OPEN', 'MATCHED', 'PAID'].includes(order.status) && (
                                                    <button
                                                        onClick={() => handleForceComplete(order.id)}
                                                        disabled={actionLoading === order.id}
                                                        className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white text-xs font-bold px-3 py-1 rounded transition-colors shadow-sm"
                                                    >
                                                        {actionLoading === order.id ? '...' : 'Zorla Tamamla'}
                                                    </button>
                                                )}

                                                {/* Force Cancel Button */}
                                                {['OPEN', 'MATCHED', 'PAID'].includes(order.status) && (
                                                    <button
                                                        onClick={() => handleForceCancel(order.id)}
                                                        disabled={actionLoading === order.id}
                                                        className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-xs font-bold px-3 py-1 rounded transition-colors shadow-sm"
                                                    >
                                                        {actionLoading === order.id ? '...' : 'Zorla İptal'}
                                                    </button>
                                                )}

                                                {/* No actions for completed/cancelled */}
                                                {['COMPLETED', 'CANCELLED'].includes(order.status) && (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Stats Summary */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-5 gap-4">
                {['OPEN', 'MATCHED', 'PAID', 'COMPLETED', 'CANCELLED'].map(status => (
                    <div key={status} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                        <div className={`text-2xl font-bold ${getStatusColor(status).replace('bg-', 'text-').replace('-50', '-600')}`}>
                            {orders.filter(o => o.status === status).length}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wider">{status}</div>
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
};

export default AdminP2POrders;
