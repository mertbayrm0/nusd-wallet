import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

const AdminUsers = () => {
    const [users, setUsers] = useState<any[]>([]);

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

    return (
        <AdminLayout title="User Management">
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
                            {users.map(u => (
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
                                    <td className="p-4 font-mono font-bold text-gray-700">
                                        ${u.balance?.toFixed(2)}
                                    </td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1.5 text-xs font-bold ${u.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                            <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-600' : 'bg-red-600'}`}></span>
                                            {u.isActive ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => toggleStatus(u.email)}
                                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors ${u.isActive
                                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                                : 'border-green-200 text-green-600 hover:bg-green-50'
                                                }`}
                                        >
                                            {u.isActive ? 'Suspend' : 'Activate'}
                                        </button>
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
