import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

const AdminDepartmentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [dept, setDept] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Create Panel Modal
    const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
    const [panelForm, setPanelForm] = useState({
        name: '',
        commission_mode: 'percentage', // percentage | fixed
        commission_value: 0,
        asset: 'TRX', // TRX | USDT
        settlement_type: 'external', // internal | external
        is_active: true
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (id) fetchDetail();
    }, [id]);

    const fetchDetail = async () => {
        setLoading(true);
        const data = await api.getDepartment(id!);
        if (data) {
            setDept(data);
        } else {
            alert('Department not found');
            navigate('/admin/departments');
        }
        setLoading(false);
    };

    const handleCreatePanel = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await api.createPaymentPanel({
                department_id: id,
                ...panelForm
            });

            if (res && res.success) {
                setIsPanelModalOpen(false);
                setPanelForm({
                    name: '',
                    commission_mode: 'percentage', // percentage | fixed
                    commission_value: 0,
                    asset: 'TRX',
                    settlement_type: 'external',
                    is_active: true
                });
                fetchDetail(); // Refresh
            } else {
                alert('Failed: ' + (res?.error?.message || 'Unknown error'));
            }
        } catch (err) {
            console.error(err);
            alert('Error creating panel');
        }
        setCreating(false);
    };

    if (loading) return <AdminLayout title="Department Detail"><div>Loading...</div></AdminLayout>;
    if (!dept) return <AdminLayout title="Department Detail"><div>Not Found</div></AdminLayout>;

    return (
        <AdminLayout title={`Department: ${dept.name}`}>
            <div className="mb-6">
                <button onClick={() => navigate('/admin/departments')} className="text-gray-500 hover:text-gray-700 flex items-center mb-4">
                    <span className="material-symbols-outlined">arrow_back</span> Back to Departments
                </button>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{dept.name}</h2>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span className="bg-slate-100 px-2 py-1 rounded">Category: {dept.category}</span>
                            <span className="bg-slate-100 px-2 py-1 rounded">
                                Default Commission: {dept.commission_mode === 'percentage' ? '%' : '$'}{dept.commission_value}
                            </span>
                            <span className={`px-2 py-1 rounded ${dept.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {dept.is_active ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                    </div>
                    {/* Edit Department Button could go here */}
                </div>
            </div>

            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Payment Panels</h3>
                <button
                    onClick={() => setIsPanelModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Panel
                </button>
            </div>

            {/* Panels List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Panel Name</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Asset</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Commission</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Settlement</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Public Link Slug</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {dept.panels && dept.panels.length > 0 ? (
                            dept.panels.map((panel: any) => (
                                <tr key={panel.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-800">{panel.name}</td>
                                    <td className="p-4">
                                        <span className={`text-xs font-bold px-2 py-1 rounded ${panel.asset === 'TRX' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {panel.asset}
                                        </span>
                                    </td>
                                    <td className="p-4 text-sm">
                                        {panel.commission_type === 'percentage' ? '%' : '$'}{panel.commission_value}
                                    </td>
                                    <td className="p-4 text-sm uppercase">{panel.settlement_type}</td>
                                    <td className="p-4 text-sm font-mono text-blue-600">/pay/{panel.public_slug}</td>
                                    <td className="p-4 text-right">
                                        <a
                                            href={`/#/pay/${panel.public_slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 hover:underline text-sm mr-3"
                                        >
                                            View
                                        </a>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={6} className="p-8 text-center text-gray-500">No payment panels found. Create one.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Panel Modal */}
            {isPanelModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">New Payment Panel</h3>
                            <button onClick={() => setIsPanelModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreatePanel} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Panel Name</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={panelForm.name}
                                    onChange={e => setPanelForm({ ...panelForm, name: e.target.value })}
                                    placeholder="e.g. VIP Deposit"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Asset</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={panelForm.asset}
                                        onChange={e => setPanelForm({ ...panelForm, asset: e.target.value })}
                                    >
                                        <option value="TRX">TRX</option>
                                        <option value="USDT">USDT</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Settlement</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={panelForm.settlement_type}
                                        onChange={e => setPanelForm({ ...panelForm, settlement_type: e.target.value })}
                                    >
                                        <option value="external">External (Blockchain)</option>
                                        <option value="internal">Internal (Wallet)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Commission Type</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        value={panelForm.commission_mode}
                                        onChange={e => setPanelForm({ ...panelForm, commission_mode: e.target.value })}
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
                                        value={panelForm.commission_value}
                                        onChange={e => setPanelForm({ ...panelForm, commission_value: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsPanelModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex justify-center items-center gap-2"
                                >
                                    {creating ? <span className="animate-spin text-lg">⏳</span> : 'Create Panel'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminDepartmentDetail;
