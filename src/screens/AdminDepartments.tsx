import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import { useNavigate } from 'react-router-dom';

const CATEGORIES = [
    { id: 'Kobi', label: 'Kobi', color: 'bg-green-100 text-green-700' },
    { id: 'Forex', label: 'Forex', color: 'bg-blue-100 text-blue-700' },
    { id: 'Cash Point', label: 'Cash Point', color: 'bg-purple-100 text-purple-700' }
];

const COLORS = [
    '#10B981', // Green
    '#3B82F6', // Blue
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#6366F1'  // Indigo
];

const AdminDepartments = () => {
    const navigate = useNavigate();
    const [depts, setDepts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Create Form
    const [newItem, setNewItem] = useState({
        name: '',
        category: 'Kobi',
        commission_mode: 'percentage',
        commission_value: 2.0,
        color: '#10B981',
        is_active: true
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        setLoading(true);
        const data = await api.getDepartments();
        setDepts(data);
        setLoading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        const res = await api.createDepartment(newItem);
        if (res && res.success) {
            setIsCreateModalOpen(false);
            setNewItem({
                name: '',
                category: 'Kobi',
                commission_mode: 'percentage',
                commission_value: 2.0,
                color: '#10B981',
                is_active: true
            });
            fetchDepartments();
        } else {
            alert('Failed to create department');
        }
        setCreating(false);
    };

    const getCategoryStyle = (cat: string) => {
        const found = CATEGORIES.find(c => c.id === cat);
        return found ? found.color : 'bg-gray-100 text-gray-600';
    };

    return (
        <AdminLayout title="Departman Yönetimi">
            {/* Header / Actions might be handled by layout title, but we can add more here if needed */}

            <div className="flex gap-6 h-[calc(100vh-140px)]">
                {/* Left Side: Department List (Cards) */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-700">Departmanlar</h3>
                        <div className="flex gap-2">
                            <button onClick={fetchDepartments} className="p-2 bg-white rounded-full text-gray-400 hover:text-gray-600 shadow-sm border border-gray-100">
                                <span className="material-symbols-outlined text-lg">refresh</span>
                            </button>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="p-2 bg-green-100 rounded-full text-green-600 hover:bg-green-200 shadow-sm"
                            >
                                <span className="material-symbols-outlined text-lg">add</span>
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <div className="text-center py-10 text-gray-400">Loading...</div>
                        ) : depts.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                No departments found.
                            </div>
                        ) : (
                            depts.map(dept => (
                                <div
                                    key={dept.id}
                                    onClick={() => navigate(`/admin/departments/${dept.id}`)}
                                    className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div
                                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-sm"
                                            style={{ backgroundColor: dept.color || newItem.color || '#10B981' }} // Fallback
                                        >
                                            <span className="material-symbols-outlined">business</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{dept.name}</h4>
                                            <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                                <span>{dept.vaults_count || 1} vault</span>
                                                <span>•</span>
                                                <span>{dept.members ? dept.members[0]?.count || 0 : 0} üye</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-gray-400 font-bold uppercase mb-1">Bakiye</div>
                                            <div className="font-bold text-gray-800">$0</div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg">
                                            <div className="text-xs text-gray-400 font-bold uppercase mb-1">İşlem</div>
                                            <div className="font-bold text-gray-800">0</div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Side: Placeholder or Details Preview (If dashboard requires split view like screenshot) 
                    The screenshot shows "A Departmanı" details on the right while list is on left.
                    However, our routing pushes to /admin/departments/:id. 
                    To achieve split view, we'd need nested routes or conditional rendering.
                    For now, following the prompt "Update AdminDepartments.tsx" primarily for the list.
                    The Detail screen will handle the full view.
                */}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Yeni Departman</h3>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Kategori / Tip</label>
                                <div className="flex gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, category: cat.id })}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${newItem.category === cat.id
                                                    ? 'bg-white border-green-500 text-green-600 shadow-sm ring-1 ring-green-500'
                                                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                                                }`}
                                        >
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Departman Adı</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 transition-all font-bold text-gray-800"
                                    placeholder="Örn: Firma A"
                                    value={newItem.name}
                                    onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Komisyon Tipi</label>
                                    <select
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white font-medium"
                                        value={newItem.commission_mode}
                                        onChange={e => setNewItem({ ...newItem, commission_mode: e.target.value })}
                                    >
                                        <option value="percentage">Yüzde (%)</option>
                                        <option value="fixed">Sabit ($)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Değer</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-bold"
                                        value={newItem.commission_value}
                                        onChange={e => setNewItem({ ...newItem, commission_value: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Renk Etiketi</label>
                                <div className="flex gap-3">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setNewItem({ ...newItem, color })}
                                            className={`w-8 h-8 rounded-full transition-transform ${newItem.color === color ? 'scale-125 ring-2 ring-offset-2 ring-gray-300' : 'hover:scale-110'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-all"
                                >
                                    {creating ? '...' : 'Oluştur'}
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
