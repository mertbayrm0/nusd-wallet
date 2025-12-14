import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

interface VerifyResult {
    valid: boolean;
    error?: string;
    amount?: number;
    confirmed?: boolean;
    vaultMatch?: boolean;
    recommendApprove?: boolean;
}

import AdminTransactionAuditLogs from '../components/AdminTransactionAuditLogs';

const AdminTransactions = () => {
    const [txs, setTxs] = useState<any[]>([]);
    const [filter, setFilter] = useState('all');
    const [verifying, setVerifying] = useState<string | null>(null);
    const [verifyResults, setVerifyResults] = useState<Record<string, VerifyResult>>({});
    const [expandedLogs, setExpandedLogs] = useState<string | null>(null);

    useEffect(() => {
        api.getAllTransactions().then(setTxs);
    }, []);

    const filteredTxs = txs.filter(t => filter === 'all' || t.status === filter);

    const handleVerify = async (tx: any) => {
        if (!tx.txHash) {
            alert('No TX hash provided for this transaction');
            return;
        }

        setVerifying(tx.id);
        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/verify-tx/${tx.txHash}?expectedAmount=${tx.amount}&transactionId=${tx.id}`);
            const result = await res.json();
            setVerifyResults(prev => ({ ...prev, [tx.id]: result }));

            // Refresh transactions list
            api.getAllTransactions().then(setTxs);
        } catch (err) {
            setVerifyResults(prev => ({ ...prev, [tx.id]: { valid: false, error: 'API request failed' } }));
        }
        setVerifying(null);
    };

    const handleApprove = async (tx: any) => {
        if (confirm('Approve this transaction?')) {
            const success = await api.approveTransaction(tx.id);
            if (success) {
                api.getAllTransactions().then(setTxs);
            } else {
                alert('Failed to approve');
            }
        }
    };

    const handleReject = async (tx: any) => {
        if (confirm('İptal etmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
            const success = await api.rejectTransaction(tx.id);
            if (success) {
                api.getAllTransactions().then(setTxs);
            } else {
                alert('Failed to reject');
            }
        }
    };

    const toggleLogs = (txId: string) => {
        setExpandedLogs(prev => prev === txId ? null : txId);
    };

    return (
        <AdminLayout title="Transactions">
            <div className="mb-6 flex gap-2">
                {['all', 'completed', 'pending', 'cancelled'].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-colors ${filter === f ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">TX Hash</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTxs.map(t => {
                                const verifyResult = verifyResults[t.id];
                                const isExpanded = expandedLogs === t.id;

                                return (
                                    <React.Fragment key={t.id}>
                                        <tr className={`hover:bg-gray-50/50 transition-colors ${isExpanded ? 'bg-slate-50' : ''}`}>
                                            <td className="p-4 text-xs text-gray-400 font-mono">{t.id.substring(0, 12)}...</td>
                                            <td className="p-4 text-sm font-bold text-gray-700">{t.owner}</td>
                                            <td className="p-4">
                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wider ${t.type.startsWith('P2P')
                                                    ? 'bg-purple-100 text-purple-600'
                                                    : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td className={`p-4 font-mono font-bold ${t.amount > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                                {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()} {t.currency}
                                            </td>
                                            <td className="p-4">
                                                {t.txHash ? (
                                                    <a
                                                        href={`https://tronscan.org/#/transaction/${t.txHash}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs font-mono text-blue-600 hover:underline"
                                                    >
                                                        {t.txHash.substring(0, 16)}...
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400">No TX hash</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide ${t.status === 'completed' || t.status === 'COMPLETED' ? 'bg-green-50 text-green-600' :
                                                    t.status === 'pending' || t.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                                        t.status === 'cancelled' || t.status === 'CANCELLED' ? 'bg-red-50 text-red-600' :
                                                            'bg-gray-50 text-gray-500'
                                                    }`}>
                                                    {t.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    {/* History Toggle */}
                                                    <button
                                                        onClick={() => toggleLogs(t.id)}
                                                        className={`p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors ${isExpanded ? 'bg-gray-200 text-gray-800' : ''}`}
                                                        title="View Audit Logs"
                                                    >
                                                        <span className="material-symbols-outlined text-base">history</span>
                                                    </button>

                                                    {/* Verify Button */}
                                                    {t.status === 'PENDING' && t.txHash && (
                                                        <button
                                                            onClick={() => handleVerify(t)}
                                                            disabled={verifying === t.id}
                                                            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-bold px-3 py-1 rounded transition-colors shadow-sm flex items-center gap-1"
                                                        >
                                                            {verifying === t.id ? (
                                                                <>
                                                                    <span className="animate-spin">⏳</span> Verifying...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span className="material-symbols-outlined text-sm">search</span>
                                                                    Verify TX
                                                                </>
                                                            )}
                                                        </button>
                                                    )}

                                                    {/* Approve Button */}
                                                    {t.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleApprove(t)}
                                                            className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1 rounded transition-colors shadow-sm"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}

                                                    {/* Cancel/Reject Button */}
                                                    {t.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleReject(t)}
                                                            className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-3 py-1 rounded transition-colors shadow-sm"
                                                        >
                                                            İptal
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Verification Result Row */}
                                        {verifyResult && (
                                            <tr className={`${verifyResult.valid ? (verifyResult.recommendApprove ? 'bg-green-50' : 'bg-amber-50') : 'bg-red-50'}`}>
                                                <td colSpan={7} className="px-4 py-3">
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span className={`material-symbols-outlined text-xl ${verifyResult.valid ? (verifyResult.recommendApprove ? 'text-green-600' : 'text-amber-600') : 'text-red-600'}`}>
                                                            {verifyResult.valid ? (verifyResult.recommendApprove ? 'check_circle' : 'warning') : 'cancel'}
                                                        </span>

                                                        {verifyResult.valid ? (
                                                            <div className="flex gap-6 flex-wrap">
                                                                <div>
                                                                    <span className="text-gray-500 text-xs">Blockchain Amount:</span>
                                                                    <span className="ml-2 font-bold">{verifyResult.amount?.toFixed(2)} USDT</span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 text-xs">Confirmed:</span>
                                                                    <span className={`ml-2 font-bold ${verifyResult.confirmed ? 'text-green-600' : 'text-amber-600'}`}>
                                                                        {verifyResult.confirmed ? 'Yes' : 'Pending'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="text-gray-500 text-xs">Vault Match:</span>
                                                                    <span className={`ml-2 font-bold ${verifyResult.vaultMatch ? 'text-green-600' : 'text-red-600'}`}>
                                                                        {verifyResult.vaultMatch ? '✓ Correct' : '✗ Wrong Address'}
                                                                    </span>
                                                                </div>
                                                                {verifyResult.recommendApprove && (
                                                                    <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">
                                                                        ✓ RECOMMENDED TO APPROVE
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-red-600 font-medium">{verifyResult.error}</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}

                                        {/* Audit Logs Row */}
                                        {isExpanded && (
                                            <tr>
                                                <td colSpan={7} className="p-4 bg-slate-50 border-b border-gray-100">
                                                    <AdminTransactionAuditLogs transactionId={t.id} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};
export default AdminTransactions;
