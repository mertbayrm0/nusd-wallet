import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

const AdminLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);

    useEffect(() => {
        const fetchLogs = () => api.getAdminLogs().then(setLogs);
        fetchLogs();
        const interval = setInterval(fetchLogs, 3000); // Auto-refresh logs every 3s
        return () => clearInterval(interval);
    }, []);

    return (
        <AdminLayout title="System Logs">
            <div className="bg-[#1E1E1E] rounded-xl shadow-lg border border-gray-800 overflow-hidden font-mono text-sm">
                <div className="bg-[#2D2D2D] px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-gray-400 text-xs">system_logs.log — Live</span>
                </div>
                <div className="p-4 h-[600px] overflow-y-auto space-y-2">
                    {logs.map(log => (
                        <div key={log.id} className="flex gap-4 hover:bg-white/5 p-1 rounded transition-colors group">
                            <span className="text-gray-500 shrink-0 w-36 select-none">[{log.formattedTime}]</span>
                            <span className={`font-bold shrink-0 w-24 ${log.type === 'ERROR' ? 'text-red-400' :
                                    log.type === 'AUTH' ? 'text-blue-400' :
                                        log.type === 'ADMIN' ? 'text-purple-400' :
                                            'text-green-400'
                                }`}>{log.type}</span>
                            <span className="text-gray-300 flex-1">{log.description}</span>
                            <span className="text-gray-600 text-xs group-hover:text-gray-400">{log.user}</span>
                        </div>
                    ))}
                    {logs.length === 0 && <p className="text-gray-600 italic">Waiting for system activity...</p>}
                </div>
            </div>
        </AdminLayout>
    );
};
export default AdminLogs;
