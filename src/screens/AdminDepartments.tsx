import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

interface Department {
    id: string;
    name: string;
    category: string;
    commission_mode: string;
    commission_value: number;
    is_active: boolean;
    created_at: string;
    members?: { count: number }[];
}

const AdminDepartments = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        category: '',
        commission_mode: 'percentage', // percentage | fixed
        commission_value: 0
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        const data = await api.getDepartments();
        setDepartments(data || []);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);

        try {
            const res = await api.createDepartment(formData);
            if (res && res.success) {
                setIsCreateModalOpen(false);
                setFormData({ name: '', category: '', commission_mode: 'percentage', commission_value: 0 });
                fetchDepartments();
            } else {
                alert('Failed to create department: ' + (res?.error?.message || 'Unknown error'));
            }
        } catch (error) {
            console.error(error);
            alert('Error creating department');
        }
        setCreating(false);
    };

    return (
        <AdminLayout title="Departments">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Department Management</h2>
                    <p className="text-sm text-gray-500">Manage internal and external departments</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Department
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Category</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Commission Mode</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Members</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : departments.length === 0 ? (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No departments found.</td></tr>
                        ) : (
                            departments.map(dept => (
                                <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-800">{dept.name}</td>
                                    <td className="p-4 text-sm text-gray-600">{dept.category || '-'}</td>
                                    <td className="p-4 text-sm">
                                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-mono">
                                            {dept.commission_mode === 'percentage' ? '%' : '$'} {dept.commission_value}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${dept.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                            {dept.is_active ? 'ACTIVE' : 'INACTIVE'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600">
                                        {/* Supabase returns array of objects for count usually, handling simplified case */}
                                        {dept.members && dept.members[0] ? dept.members[0].count : 0} members
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={() => window.location.hash = `#/admin/departments/${dept.id}`}
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded transition-colors text-sm font-bold"
                                        >
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl transform transition-all">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">New Department</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Finance, Marketing"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                <input
                                    type="text"
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g. Internal"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Commission Type</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={formData.commission_mode}
                                        onChange={e => setFormData({ ...formData, commission_mode: e.target.value })}
                                    >
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Value</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.commission_value}
                                        onChange={e => setFormData({ ...formData, commission_value: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2"
                                >
                                    {creating ? <span className="animate-spin text-lg">⏳</span> : 'Create Department'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminDepartments;
