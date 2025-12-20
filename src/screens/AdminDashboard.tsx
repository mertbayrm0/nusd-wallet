import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

interface Stats {
    totalRevenue: number;
    totalVolume: number;
    totalUserBalance: number;
    totalVaultBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    vaultDeposits: number;
    vaultWithdrawals: number;
    pendingTransactions: number;
    totalTransactions: number;
    activeUsers: number;
    departmentCount: number;
}

const StatCard = ({ icon, iconBg, label, value, sublabel, trend }: {
    icon: string;
    iconBg: string;
    label: string;
    value: string;
    sublabel?: string;
    trend?: 'up' | 'down' | 'neutral';
}) => (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-3">
            <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            {trend && (
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${trend === 'up' ? 'bg-green-100 text-green-600' :
                    trend === 'down' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                    }`}>
                    {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '—'}
                </span>
            )}
        </div>
        <p className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-2xl font-extrabold text-gray-900">{value}</h3>
        {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = () => {
            api.getSystemStats().then(s => {
                setStats(s);
                setLoading(false);
            });
        };
        load();
        const interval = setInterval(load, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const reset = async () => {
        if (window.confirm("Emin misiniz? Tüm işlemler silinecek ve bakiyeler sıfırlanacak.")) {
            await api.resetDB();
            window.location.reload();
        }
    }

    return (
        <AdminLayout title="Sistem Özeti">
            {/* Main Stats Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 mb-6 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Toplam Sistem Bakiyesi</p>
                        <h2 className="text-4xl font-extrabold">
                            ${loading ? '—' : ((stats?.totalUserBalance || 0) + (stats?.totalVaultBalance || 0)).toLocaleString()}
                        </h2>
                        <p className="text-emerald-200 text-sm mt-2">
                            Kullanıcı: ${stats?.totalUserBalance?.toLocaleString() || 0} • Vault: ${stats?.totalVaultBalance?.toLocaleString() || 0}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-2">
                            <span className="material-symbols-outlined text-4xl">account_balance_wallet</span>
                        </div>
                        <p className="text-xs text-emerald-200">Canlı Güncelleniyor</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Money Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon="south_west"
                    iconBg="bg-green-50 text-green-600"
                    label="Gelen Bakiye"
                    value={`$${stats?.totalDeposits?.toLocaleString() || 0}`}
                    sublabel={`Vault: $${stats?.vaultDeposits?.toLocaleString() || 0}`}
                    trend="up"
                />
                <StatCard
                    icon="north_east"
                    iconBg="bg-red-50 text-red-600"
                    label="Çıkan Bakiye"
                    value={`$${stats?.totalWithdrawals?.toLocaleString() || 0}`}
                    sublabel={`Vault: $${stats?.vaultWithdrawals?.toLocaleString() || 0}`}
                    trend="down"
                />
                <StatCard
                    icon="lock"
                    iconBg="bg-purple-50 text-purple-600"
                    label="Vault Bakiye"
                    value={`$${stats?.totalVaultBalance?.toLocaleString() || 0}`}
                    sublabel="Kripto kasası"
                />
                <StatCard
                    icon="sync"
                    iconBg="bg-amber-50 text-amber-600"
                    label="Net Akış"
                    value={`$${((stats?.totalDeposits || 0) - (stats?.totalWithdrawals || 0)).toLocaleString()}`}
                    sublabel="Gelen - Çıkan"
                    trend={(stats?.totalDeposits || 0) >= (stats?.totalWithdrawals || 0) ? 'up' : 'down'}
                />
            </div>

            {/* Stats Grid - Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                    icon="receipt_long"
                    iconBg="bg-blue-50 text-blue-600"
                    label="Toplam İşlem"
                    value={stats?.totalTransactions?.toString() || '0'}
                />
                <StatCard
                    icon="pending"
                    iconBg="bg-orange-50 text-orange-600"
                    label="Bekleyen İşlem"
                    value={stats?.pendingTransactions?.toString() || '0'}
                />
                <StatCard
                    icon="group"
                    iconBg="bg-cyan-50 text-cyan-600"
                    label="Aktif Kullanıcı"
                    value={stats?.activeUsers?.toString() || '0'}
                />
                <StatCard
                    icon="business"
                    iconBg="bg-indigo-50 text-indigo-600"
                    label="Departman"
                    value={stats?.departmentCount?.toString() || '0'}
                />
            </div>

            {/* Revenue & Volume */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined">attach_money</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Toplam Gelir</p>
                            <h3 className="text-3xl font-extrabold text-gray-900">${stats?.totalRevenue?.toFixed(2) || '0.00'}</h3>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">Komisyon ve işlem ücretlerinden</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined">bar_chart</span>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">Toplam Hacim</p>
                            <h3 className="text-3xl font-extrabold text-gray-900">${stats?.totalVolume?.toLocaleString() || '0.00'}</h3>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400">Tüm işlemlerin toplam değeri</p>
                </div>
            </div>

            {/* Visual Flow Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600">insights</span>
                    Para Akış Grafiği
                </h3>
                <div className="space-y-4">
                    {/* Deposits Bar */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-bold text-green-600">Gelen</span>
                            <span className="font-bold text-green-600">${stats?.totalDeposits?.toLocaleString() || 0}</span>
                        </div>
                        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000"
                                style={{
                                    width: `${Math.min(100, ((stats?.totalDeposits || 0) / Math.max((stats?.totalDeposits || 0) + (stats?.totalWithdrawals || 0), 1)) * 100)}%`
                                }}
                            />
                        </div>
                    </div>
                    {/* Withdrawals Bar */}
                    <div>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="font-bold text-red-600">Çıkan</span>
                            <span className="font-bold text-red-600">${stats?.totalWithdrawals?.toLocaleString() || 0}</span>
                        </div>
                        <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-red-400 to-rose-500 rounded-full transition-all duration-1000"
                                style={{
                                    width: `${Math.min(100, ((stats?.totalWithdrawals || 0) / Math.max((stats?.totalDeposits || 0) + (stats?.totalWithdrawals || 0), 1)) * 100)}%`
                                }}
                            />
                        </div>
                    </div>
                    {/* Ratio Info */}
                    <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-100">
                        <div className="text-center">
                            <p className="text-3xl font-extrabold text-gray-900">
                                {stats && (stats.totalDeposits + stats.totalWithdrawals) > 0
                                    ? Math.round((stats.totalDeposits / (stats.totalDeposits + stats.totalWithdrawals)) * 100)
                                    : 0}%
                            </p>
                            <p className="text-xs text-gray-400">Gelen Oranı</p>
                        </div>
                        <div className="w-px h-12 bg-gray-200" />
                        <div className="text-center">
                            <p className="text-3xl font-extrabold text-gray-900">
                                {stats?.totalTransactions || 0}
                            </p>
                            <p className="text-xs text-gray-400">Toplam İşlem</p>
                        </div>
                        <div className="w-px h-12 bg-gray-200" />
                        <div className="text-center">
                            <p className={`text-3xl font-extrabold ${(stats?.totalDeposits || 0) >= (stats?.totalWithdrawals || 0) ? 'text-green-600' : 'text-red-600'}`}>
                                ${Math.abs((stats?.totalDeposits || 0) - (stats?.totalWithdrawals || 0)).toLocaleString()}
                            </p>
                            <p className="text-xs text-gray-400">Net Bakiye</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tehlikeli Bölge</h3>
                <div className="flex gap-4">
                    <button onClick={reset} className="px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined">restart_alt</span>
                        Veritabanını Sıfırla
                    </button>
                    <button className="px-6 py-3 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl font-bold transition-colors flex items-center gap-2">
                        <span className="material-symbols-outlined">build</span>
                        Bakım Modu
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
};
export default AdminDashboard;