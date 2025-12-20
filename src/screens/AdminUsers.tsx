import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = () => api.getAllUsers().then(setUsers);

    const toggleStatus = async (email: string) => {
        if (window.confirm("Change user status?")) {
            await api.toggleUserStatus(email);
            loadUsers();
        }
    };

    const toggleRole = async (email: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'user' : 'admin';
        if (window.confirm(`Change role to ${newRole}?`)) {
            await api.toggleUserRole(email);
            loadUsers();
        }
    };

    const editBalance = async (email: string, currentBalance: number) => {
        const newBalanceStr = prompt(`Yeni bakiye (mevcut: $${currentBalance.toFixed(2)}):`, currentBalance.toString());
        if (newBalanceStr === null) return;
        const newBalance = parseFloat(newBalanceStr);
        if (isNaN(newBalance)) {
            alert('Geçersiz tutar');
            return;
        }
        const result = await api.updateUserBalance(email, newBalance);
        if (result.success) {
            loadUsers();
        } else {
            alert('Hata: ' + (result.error || 'Güncelleme başarısız'));
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = searchQuery === '' ||
            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === 'all' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const exportToCsv = () => {
        const headers = ['Ad', 'Email', 'Rol', 'Bakiye', 'Durum', 'TRX Adres'];
        const rows = filteredUsers.map(u => [
            u.name,
            u.email,
            u.role,
            u.balance?.toFixed(2) || '0',
            u.isActive ? 'Aktif' : 'Pasif',
            u.trxAddress || ''
        ]);
        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    };

    return (
        <AdminLayout title="User Management">
            {/* Search & Filters */}
            <div className="mb-4 flex gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                    <input
                        type="text"
                        placeholder="İsim veya email ara..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-2">
                    {(['all', 'admin', 'user'] as const).map(role => (
                        <button
                            key={role}
                            onClick={() => setRoleFilter(role)}
                            className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${roleFilter === role ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {role === 'all' ? 'Tümü' : role}
                        </button>
                    ))}
                </div>
                <span className="text-sm text-gray-500">{filteredUsers.length} kullanıcı</span>
                <button
                    onClick={exportToCsv}
                    className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">download</span>
                    CSV İndir
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">TRX Wallet</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Balance</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredUsers.map(u => (
                                <tr key={u.email} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-bold">
                                                {u.name.substring(0, 1)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{u.name}</p>
                                                <p className="text-gray-500 text-xs">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <p className="font-mono text-xs text-gray-600 max-w-[150px] truncate" title={u.trxAddress}>
                                            {u.trxAddress || '-'}
                                        </p>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button
                                            onClick={() => editBalance(u.email, u.balance || 0)}
                                            className="font-mono font-bold text-gray-700 hover:text-blue-600 cursor-pointer"
                                        >
                                            ${u.balance?.toFixed(2)} ✏️
                                        </button>
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-bold ${u.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                            <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                            {u.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => toggleRole(u.email, u.role)}
                                                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors"
                                            >
                                                {u.role === 'admin' ? '→ User' : '→ Admin'}
                                            </button>
                                            <button
                                                onClick={() => toggleStatus(u.email)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${u.isActive
                                                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                                                    : 'border-green-200 text-green-600 hover:bg-green-50'
                                                    }`}
                                            >
                                                {u.isActive ? 'Suspend' : 'Activate'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};
export default AdminUsers;
