import React, { useEffect, useState } from 'react';
import { api } from '../services/api';

interface AuditLog {
    id: string;
    transaction_id: string;
    action: string;
    actor_role: string;
    actor_id: string;
    metadata: any;
    created_at: string;
}

interface Props {
    transactionId: string;
}

const AdminTransactionAuditLogs: React.FC<Props> = ({ transactionId }) => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            setLoading(true);
            const data = await api.getTransactionLogs(transactionId);
            setLogs(data);
            setLoading(false);
        };

        if (transactionId) {
            fetchLogs();
        }
    }, [transactionId]);

    if (loading) return <div className="p-4 text-gray-500 text-sm">Loading logs...</div>;

    if (logs.length === 0) return (
        <div className="p-4 bg-gray-50 rounded-lg text-gray-500 text-sm italic">
            No audit logs found for this transaction. This might be an old transaction created before the audit system was active.
        </div>
    );

    return (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">history_edu</span>
                Transaction Audit Trail
            </h4>

            <div className="space-y-4">
                {logs.map((log) => (
                    <div key={log.id} className="relative pl-6 pb-2 border-l-2 border-slate-200 last:border-0 last:pb-0">
                        {/* Dot on timeline */}
                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white 
                            ${log.action === 'APPROVE' ? 'bg-green-500' :
                                log.action === 'REJECT' ? 'bg-red-500' :
                                    log.action === 'CREATE' ? 'bg-blue-500' : 'bg-slate-400'}`}>
                        </div>

                        <div className="flex justify-between items-start">
                            <div>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded mr-2 
                                    ${log.action === 'APPROVE' ? 'bg-green-100 text-green-700' :
                                        log.action === 'REJECT' ? 'bg-red-100 text-red-700' :
                                            'bg-slate-100 text-slate-700'}`}>
                                    {log.action}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                    by {log.actor_role}
                                    {log.actor_role === 'admin' ? '' : ' (system)'}
                                </span>
                            </div>
                            <span className="text-xs text-slate-400 whitespace-nowrap">
                                {new Date(log.created_at).toLocaleString('tr-TR')}
                            </span>
                        </div>

                        {/* Metadata View */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <div className="mt-2 bg-white border border-slate-200 rounded p-2 text-xs font-mono text-slate-600 overflow-x-auto">
                                <pre className="m-0 whitespace-pre-wrap">
                                    {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AdminTransactionAuditLogs;
