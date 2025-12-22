import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import AdminLayout from '../components/AdminLayout';

interface ReportStats {
    totalTransactions: number;
    totalVolume: number;
    totalDeposits: number;
    totalWithdrawals: number;
    averageTransaction: number;
    activeUsers: number;
    newUsers: number;
    p2pTransactions: number;
}

interface DailyData {
    date: string;
    deposits: number;
    withdrawals: number;
    volume: number;
    count: number;
}

interface TopUser {
    id: string;
    email: string;
    name: string;
    total_volume: number;
    transaction_count: number;
}

const AdminReports: React.FC = () => {
    const navigate = useNavigate();
    const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const [stats, setStats] = useState<ReportStats | null>(null);
    const [dailyData, setDailyData] = useState<DailyData[]>([]);
    const [topUsers, setTopUsers] = useState<TopUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);

    const getDateRange = () => {
        const end = new Date();
        const start = new Date();

        switch (period) {
            case '7d': start.setDate(end.getDate() - 7); break;
            case '30d': start.setDate(end.getDate() - 30); break;
            case '90d': start.setDate(end.getDate() - 90); break;
            case 'all': start.setFullYear(2020); break;
        }

        return { start: start.toISOString(), end: end.toISOString() };
    };

    useEffect(() => {
        loadReports();
    }, [period]);

    const loadReports = async () => {
        setIsLoading(true);
        const { start, end } = getDateRange();

        try {
            // Get transactions for stats
            const { data: transactions } = await supabase
                .from('transactions')
                .select('*')
                .gte('created_at', start)
                .lte('created_at', end);

            if (transactions) {
                const deposits = transactions.filter(t => t.type === 'deposit' && t.status === 'completed');
                const withdrawals = transactions.filter(t => t.type === 'withdraw' && t.status === 'completed');
                const totalVolume = transactions
                    .filter(t => t.status === 'completed')
                    .reduce((sum, t) => sum + (t.amount || 0), 0);

                setStats({
                    totalTransactions: transactions.length,
                    totalVolume,
                    totalDeposits: deposits.reduce((sum, t) => sum + (t.amount || 0), 0),
                    totalWithdrawals: withdrawals.reduce((sum, t) => sum + (t.amount || 0), 0),
                    averageTransaction: transactions.length > 0 ? totalVolume / transactions.length : 0,
                    activeUsers: new Set(transactions.map(t => t.user_id)).size,
                    newUsers: 0,
                    p2pTransactions: transactions.filter(t => t.type === 'p2p').length
                });

                // Group by date
                const byDate: Record<string, DailyData> = {};
                transactions.forEach(t => {
                    const date = new Date(t.created_at).toISOString().split('T')[0];
                    if (!byDate[date]) {
                        byDate[date] = { date, deposits: 0, withdrawals: 0, volume: 0, count: 0 };
                    }
                    byDate[date].count++;
                    if (t.status === 'completed') {
                        byDate[date].volume += t.amount || 0;
                        if (t.type === 'deposit') byDate[date].deposits += t.amount || 0;
                        if (t.type === 'withdraw') byDate[date].withdrawals += t.amount || 0;
                    }
                });

                setDailyData(Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)));
            }

            // Get top users
            const { data: userTransactions } = await supabase
                .from('transactions')
                .select('user_id, amount, profiles!inner(email, first_name, last_name)')
                .eq('status', 'completed')
                .gte('created_at', start)
                .lte('created_at', end);

            if (userTransactions) {
                const userStats: Record<string, TopUser> = {};
                userTransactions.forEach((t: any) => {
                    const userId = t.user_id;
                    if (!userStats[userId]) {
                        userStats[userId] = {
                            id: userId,
                            email: t.profiles?.email || '',
                            name: t.profiles?.first_name
                                ? `${t.profiles.first_name} ${t.profiles.last_name || ''}`.trim()
                                : t.profiles?.email?.split('@')[0] || 'User',
                            total_volume: 0,
                            transaction_count: 0
                        };
                    }
                    userStats[userId].total_volume += t.amount || 0;
                    userStats[userId].transaction_count++;
                });

                setTopUsers(
                    Object.values(userStats)
                        .sort((a, b) => b.total_volume - a.total_volume)
                        .slice(0, 10)
                );
            }

        } catch (error) {
            console.error('Report error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const exportToCSV = async () => {
        setExportLoading(true);
        const { start, end } = getDateRange();

        try {
            const { data: transactions } = await supabase
                .from('transactions')
                .select('*, profiles(email, first_name, last_name)')
                .gte('created_at', start)
                .lte('created_at', end)
                .order('created_at', { ascending: false });

            if (transactions) {
                const csvRows = [
                    ['Tarih', 'Kullanıcı', 'Email', 'Tür', 'Miktar', 'Durum', 'Açıklama'].join(',')
                ];

                transactions.forEach((t: any) => {
                    csvRows.push([
                        new Date(t.created_at).toLocaleString('tr-TR'),
                        t.profiles?.first_name || '-',
                        t.profiles?.email || '-',
                        t.type,
                        t.amount?.toFixed(2) || '0',
                        t.status,
                        t.description || '-'
                    ].map(v => `"${v}"`).join(','));
                });

                const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `nusd-rapor-${period}-${new Date().toISOString().split('T')[0]}.csv`;
                link.click();
            }
        } catch (error) {
            console.error('Export error:', error);
        } finally {
            setExportLoading(false);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(val);
    };

    const maxVolume = Math.max(...dailyData.map(d => d.volume), 1);

    return (
        <AdminLayout title="Raporlar">
            {/* Period Selector & Export */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex gap-2">
                    {([
                        { value: '7d', label: 'Son 7 Gün' },
                        { value: '30d', label: 'Son 30 Gün' },
                        { value: '90d', label: 'Son 90 Gün' },
                        { value: 'all', label: 'Tümü' }
                    ] as const).map(p => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${period === p.value
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-white text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
                <button
                    onClick={exportToCSV}
                    disabled={exportLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-sm">download</span>
                    {exportLoading ? 'Hazırlanıyor...' : 'CSV İndir'}
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                </div>
            ) : (
                <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-500">receipt_long</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">Toplam İşlem</p>
                            <p className="text-2xl font-bold text-gray-800">{stats?.totalTransactions || 0}</p>
                        </div>

                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-emerald-500">trending_up</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">Toplam Hacim</p>
                            <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats?.totalVolume || 0)}</p>
                        </div>

                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-green-500">south_west</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">Toplam Yatırım</p>
                            <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats?.totalDeposits || 0)}</p>
                        </div>

                        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-500">north_east</span>
                                </div>
                            </div>
                            <p className="text-sm text-gray-500">Toplam Çekim</p>
                            <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats?.totalWithdrawals || 0)}</p>
                        </div>
                    </div>

                    {/* Chart */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-8">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Günlük İşlem Hacmi</h3>
                        {dailyData.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2">bar_chart</span>
                                <p>Bu dönem için veri yok</p>
                            </div>
                        ) : (
                            <div className="h-64 flex items-end gap-1">
                                {dailyData.slice(-30).map((d, i) => {
                                    const height = (d.volume / maxVolume) * 100;
                                    return (
                                        <div
                                            key={d.date}
                                            className="flex-1 group relative"
                                        >
                                            <div
                                                className="bg-blue-500 hover:bg-blue-600 rounded-t transition-all cursor-pointer"
                                                style={{ height: `${Math.max(height, 2)}%` }}
                                            />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                                <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                                                    <p className="font-medium">{new Date(d.date).toLocaleDateString('tr-TR')}</p>
                                                    <p>{formatCurrency(d.volume)}</p>
                                                    <p>{d.count} işlem</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Secondary Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-5 text-white">
                            <p className="text-purple-200 text-sm">Ortalama İşlem</p>
                            <p className="text-2xl font-bold">{formatCurrency(stats?.averageTransaction || 0)}</p>
                        </div>
                        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-5 text-white">
                            <p className="text-orange-200 text-sm">Aktif Kullanıcı</p>
                            <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
                        </div>
                        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-5 text-white">
                            <p className="text-cyan-200 text-sm">P2P İşlem</p>
                            <p className="text-2xl font-bold">{stats?.p2pTransactions || 0}</p>
                        </div>
                        <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-5 text-white">
                            <p className="text-pink-200 text-sm">Net Akış</p>
                            <p className="text-2xl font-bold">
                                {formatCurrency((stats?.totalDeposits || 0) - (stats?.totalWithdrawals || 0))}
                            </p>
                        </div>
                    </div>

                    {/* Top Users */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">En Aktif Kullanıcılar</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanıcı</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlem Sayısı</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toplam Hacim</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {topUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                                                Veri bulunamadı
                                            </td>
                                        </tr>
                                    ) : (
                                        topUsers.map((user, i) => (
                                            <tr key={user.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm text-gray-500">{i + 1}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                                                            {user.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-800">{user.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                                                <td className="px-6 py-4 text-right text-sm font-medium text-gray-800">
                                                    {user.transaction_count}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">
                                                    {formatCurrency(user.total_volume)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
};

export default AdminReports;
