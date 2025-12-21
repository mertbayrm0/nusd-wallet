import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

interface LogEntry {
    id: string;
    formattedTime: string;
    type: string;
    action: string;
    description: string;
    user: string;
    userName?: string;
    status: string;
    metadata?: any;
    targetType?: string;
    targetId?: string;
}

const ACTION_TYPES = [
    { value: '', label: 'Tümü' },
    { value: 'auth', label: 'Kimlik Doğrulama' },
    { value: 'transaction', label: 'İşlem' },
    { value: 'kyc', label: 'KYC' },
    { value: 'p2p', label: 'P2P' },
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'Kullanıcı' },
    { value: 'system', label: 'Sistem' },
    { value: 'security', label: 'Güvenlik' }
];

const getTypeColor = (type: string) => {
    switch (type?.toLowerCase()) {
        case 'auth': return 'text-blue-400';
        case 'transaction': return 'text-emerald-400';
        case 'kyc': return 'text-purple-400';
        case 'p2p': return 'text-yellow-400';
        case 'admin': return 'text-pink-400';
        case 'user': return 'text-cyan-400';
        case 'system': return 'text-gray-400';
        case 'security': return 'text-red-400';
        default: return 'text-gray-400';
    }
};

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'success': return 'bg-emerald-500/20 text-emerald-400';
        case 'failed': return 'bg-red-500/20 text-red-400';
        case 'pending': return 'bg-yellow-500/20 text-yellow-400';
        default: return 'bg-gray-500/20 text-gray-400';
    }
};

const AdminLogs = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            setIsLoading(true);
            const data = await api.getAdminLogs({
                action_type: filter || undefined,
                limit: 200
            });
            setLogs(data);
            setIsLoading(false);
        };

        fetchLogs();
        const interval = setInterval(fetchLogs, 5000); // Auto-refresh every 5s
        return () => clearInterval(interval);
    }, [filter]);

    const filteredLogs = searchTerm
        ? logs.filter(log =>
            log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : logs;

    return (
        <AdminLayout title="Aktivite Logları">
            {/* Filters */}
            <div className="bg-[#1E1E1E] rounded-xl p-4 mb-4 border border-gray-800 flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                    <label className="text-gray-500 text-xs mb-1 block">Ara</label>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Açıklama, kullanıcı veya işlem ara..."
                        className="w-full bg-[#2D2D2D] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                    />
                </div>
                <div className="w-full sm:w-48">
                    <label className="text-gray-500 text-xs mb-1 block">Tür</label>
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="w-full bg-[#2D2D2D] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none"
                    >
                        {ACTION_TYPES.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Logs Terminal */}
            <div className="bg-[#1E1E1E] rounded-xl shadow-lg border border-gray-800 overflow-hidden">
                {/* Terminal Header */}
                <div className="bg-[#2D2D2D] px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs">
                            {filteredLogs.length} kayıt
                        </span>
                        <span className="flex items-center gap-1 text-emerald-400 text-xs">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                            Canlı
                        </span>
                    </div>
                </div>

                {/* Logs Content */}
                <div className="font-mono text-sm h-[600px] overflow-y-auto">
                    {isLoading && logs.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-600">
                            {searchTerm || filter ? 'Sonuç bulunamadı' : 'Henüz log kaydı yok...'}
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-[#252525] sticky top-0">
                                <tr className="text-gray-500 text-xs">
                                    <th className="text-left p-3 font-medium">Zaman</th>
                                    <th className="text-left p-3 font-medium">Tür</th>
                                    <th className="text-left p-3 font-medium">Durum</th>
                                    <th className="text-left p-3 font-medium">Açıklama</th>
                                    <th className="text-left p-3 font-medium">Kullanıcı</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <tr
                                        key={log.id}
                                        className="border-b border-gray-800/50 hover:bg-white/5 transition-colors"
                                    >
                                        <td className="p-3 text-gray-500 whitespace-nowrap">
                                            {log.formattedTime}
                                        </td>
                                        <td className="p-3">
                                            <span className={`font-bold ${getTypeColor(log.type)}`}>
                                                {log.type}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(log.status)}`}>
                                                {log.status === 'success' ? '✓' : log.status === 'failed' ? '✗' : '⏳'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-gray-300 max-w-md truncate">
                                            {log.description}
                                        </td>
                                        <td className="p-3 text-gray-500 text-xs">
                                            {log.userName || log.user}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminLogs;
