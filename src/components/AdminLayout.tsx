import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../App';

const AdminLayout = ({ children, title }: { children: React.ReactNode, title: string }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useApp();

    const menu = [
        { icon: 'dashboard', label: 'Dashboard', path: '/admin' },
        { icon: 'group', label: 'Users', path: '/admin/users' },
        { icon: 'receipt_long', label: 'Transactions', path: '/admin/transactions' },
        { icon: 'swap_horiz', label: 'P2P Orders', path: '/admin/p2p-orders' },
        { icon: 'lock', label: 'Crypto Vaults', path: '/admin/vaults' },
        { icon: 'business', label: 'Departmanlar', path: '/admin/departments' },
        { icon: 'terminal', label: 'System Logs', path: '/admin/logs' },
    ];

    return (
        <div className="admin-layout flex h-screen bg-gray-100 font-display">
            {/* Sidebar */}
            <div className="w-64 bg-[#111827] text-white flex flex-col shadow-2xl z-20">
                <div className="p-6 flex items-center gap-3 border-b border-gray-800">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">NUSD Admin</span>
                </div>

                <div className="flex-1 py-6 space-y-1 px-3">
                    {menu.map(item => {
                        const active = location.pathname === item.path;
                        return (
                            <button
                                key={item.path}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
                                    ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-900/50'
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white font-medium'
                                    }`}
                            >
                                <span className="material-symbols-outlined">{item.icon}</span>
                                {item.label}
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t border-gray-800">
                    <button onClick={() => navigate('/dashboard')} className="w-full flex items-center gap-3 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm mb-2">
                        <span className="material-symbols-outlined text-sm">exit_to_app</span>
                        Exit Admin Mode
                    </button>
                    <button onClick={() => { logout(); navigate('/'); }} className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:text-red-300 transition-colors text-sm">
                        <span className="material-symbols-outlined text-sm">logout</span>
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden h-screen">
                {/* Header */}
                <div className="bg-white shadow-sm border-b border-gray-200 px-8 py-4 flex justify-between items-center z-10">
                    <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-600 text-sm">person</span>
                        </div>
                        <span className="text-sm font-bold text-gray-700">Administrator</span>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-8 bg-gray-50/50">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
export default AdminLayout;
