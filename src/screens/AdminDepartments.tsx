import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

interface Department {
    id: string;
    name: string;
    color: string;
    category: string;
    commission: { type: string; value: number };
    vaultCount: number;
    totalBalance: number;
    totalDeposits: number;
    totalWithdrawals: number;
    transactionCount: number;
    memberCount: number;
}

interface DepartmentDetail extends Department {
    vaults: { id: string; name: string; address: string; balance: number }[];
    transactions: { id: string; type: string; amount: number; userEmail: string; timestamp: string; network: string }[];
    members: { email: string; deposits: number; withdrawals: number; txCount: number }[];
}

interface Merchant {
    id: string;
    slug: string;
    name: string;
    isActive: boolean;
    primaryColor: string;
    isAgent?: boolean;
    latitude?: number;
    longitude?: number;
    address?: string;
    hours?: string;
}

const AdminDepartments = () => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedDept, setSelectedDept] = useState<DepartmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Create State
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptColor, setNewDeptColor] = useState('#10B981');

    // Edit State
    const [editDeptName, setEditDeptName] = useState('');
    const [editDeptColor, setEditDeptColor] = useState('#10B981');
    const [editCategory, setEditCategory] = useState('MERCHANT');
    const [editCommissionType, setEditCommissionType] = useState('PERCENT');
    const [editCommissionRate, setEditCommissionRate] = useState('');
    const [activeTab, setActiveTab] = useState<'transactions' | 'members' | 'vaults' | 'merchant'>('transactions');
    const [merchant, setMerchant] = useState<Merchant | null>(null);
    const [allVaults, setAllVaults] = useState<{ id: string; name: string; address: string; departmentId: string | null }[]>([]);
    const [showMerchantModal, setShowMerchantModal] = useState(false);
    const [merchantSlug, setMerchantSlug] = useState('');
    const [merchantName, setMerchantName] = useState('');
    const [newCategory, setNewCategory] = useState('MERCHANT');
    const [newCommissionType, setNewCommissionType] = useState('PERCENT');
    const [newCommissionRate, setNewCommissionRate] = useState('');

    // Merchant Edit State
    const [isEditingMerchant, setIsEditingMerchant] = useState(false);
    const [merchantIsAgent, setMerchantIsAgent] = useState(false);
    const [merchantLat, setMerchantLat] = useState('');
    const [merchantLng, setMerchantLng] = useState('');
    const [merchantAddress, setMerchantAddress] = useState('');
    const [merchantHours, setMerchantHours] = useState('');

    useEffect(() => {
        loadDepartments();
        loadAllVaults();
    }, []);

    const loadDepartments = async () => {
        setLoading(true);
        const data = await api.getDepartments();
        setDepartments(data);
        setLoading(false);
    };

    const loadAllVaults = async () => {
        try {
            const res = await api.getVaults();
            setAllVaults(res.vaults || []);
        } catch { /* ignore */ }
    };

    const selectDepartment = async (dept: Department) => {
        setDetailLoading(true);
        try {
            const detail = await api.getDepartmentDetail(dept.id);
            if (detail) {
                // Ensure all required fields have default values
                setSelectedDept({
                    ...detail,
                    totalBalance: detail.totalBalance || 0,
                    totalDeposits: detail.totalDeposits || 0,
                    totalWithdrawals: detail.totalWithdrawals || 0,
                    vaults: detail.vaults || [],
                    transactions: detail.transactions || [],
                    members: detail.members || []
                });
            }
            // Load merchant for this department
            const m = await api.getDepartmentMerchant(dept.id);
            setMerchant(m || null);
        } catch (err) {
            console.error('Error loading department:', err);
        }
        setDetailLoading(false);
    };

    const createDepartment = async () => {
        if (!newDeptName.trim()) return;
        await api.createDepartment({
            name: newDeptName,
            color: newDeptColor,
            category: newCategory,
            commissionType: newCommissionType,
            commissionRate: parseFloat(newCommissionRate) || 0
        });
        setShowCreateModal(false);
        setNewDeptName('');
        setNewCategory('MERCHANT');
        setNewCommissionType('PERCENT');
        setNewCommissionRate('');
        loadDepartments();
    };

    const updateDepartment = async () => {
        if (!selectedDept || !editDeptName.trim()) return;
        await api.updateDepartment(selectedDept.id, {
            name: editDeptName,
            color: editDeptColor,
            category: editCategory,
            commissionType: editCommissionType,
            commissionRate: parseFloat(editCommissionRate) || 0
        });
        setShowEditModal(false);
        loadDepartments();
        // Refresh selected dept logic is complex, simpler to reload
        const updated = await api.getDepartmentDetail(selectedDept.id);
        if (updated) {
            // ... re-transform logic duplicated from selectDepartment, simpler to just re-select
            // For now just quick update local state partially
            selectDepartment({ ...selectedDept, name: editDeptName, color: editDeptColor } as Department);
        }
    };

    const deleteDepartment = async (id: string) => {
        if (confirm('Bu departmanı silmek istediğinize emin misiniz?')) {
            await api.deleteDepartment(id);
            setSelectedDept(null);
            loadDepartments();
        }
    };

    const openEditModal = () => {
        if (!selectedDept) return;
        setEditDeptName(selectedDept.name);
        setEditDeptColor(selectedDept.color);
        setEditCategory(selectedDept.category || 'MERCHANT');
        setEditCommissionType(selectedDept.commission?.type || 'PERCENT');
        setEditCommissionRate(selectedDept.commission?.value?.toString() || '');
        setShowEditModal(true);
    };

    const assignVault = async (vaultId: string) => {
        if (!selectedDept) return;
        await api.updateDepartment(selectedDept.id, { assignVaultId: vaultId });
        loadAllVaults();
        selectDepartment(selectedDept);
    };

    const unassignVault = async (vaultId: string) => {
        if (!selectedDept) return;
        await api.updateDepartment(selectedDept.id, { unassignVaultId: vaultId });
        loadAllVaults();
        selectDepartment(selectedDept);
    };

    const createMerchant = async () => {
        if (!selectedDept || !merchantSlug.trim()) return;
        const payload = {
            name: merchantName || selectedDept.name,
            slug: merchantSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            departmentId: selectedDept.id,
            primaryColor: selectedDept.color,
            defaultVaultId: selectedDept.vaults[0]?.id,
            isAgent: merchantIsAgent,
            latitude: merchantIsAgent ? parseFloat(merchantLat) : null,
            longitude: merchantIsAgent ? parseFloat(merchantLng) : null,
            address: merchantAddress,
            hours: merchantHours
        };
        const result = await api.createMerchant(payload);
        if (result && result.id) {
            setMerchant(result);
            setShowMerchantModal(false);
            resetMerchantForm();
        } else {
            alert('Merchant oluşturulamadı');
        }
    };

    const updateMerchantFunc = async () => {
        if (!selectedDept || !merchant) return;
        const payload = {
            name: merchantName,
            slug: merchantSlug,
            isAgent: merchantIsAgent,
            latitude: merchantIsAgent ? parseFloat(merchantLat) : null,
            longitude: merchantIsAgent ? parseFloat(merchantLng) : null,
            address: merchantAddress,
            hours: merchantHours
        };
        const result = await api.updateMerchant(merchant.id, payload);
        if (result && result.id) {
            setMerchant(result);
            setShowMerchantModal(false);
            resetMerchantForm();
        } else {
            alert('Güncelleme başarısız');
        }
    };

    const resetMerchantForm = () => {
        setMerchantSlug('');
        setMerchantName('');
        setMerchantIsAgent(false);
        setMerchantLat('');
        setMerchantLng('');
        setMerchantAddress('');
        setMerchantHours('');
        setIsEditingMerchant(false);
    };

    const openEditMerchant = () => {
        if (!merchant) return;
        setMerchantName(merchant.name);
        setMerchantSlug(merchant.slug);
        setMerchantIsAgent(merchant.isAgent || false);
        setMerchantLat(merchant.latitude?.toString() || '');
        setMerchantLng(merchant.longitude?.toString() || '');
        setMerchantAddress(merchant.address || '');
        setMerchantHours(merchant.hours || '');
        setIsEditingMerchant(true);
        setShowMerchantModal(true);
    };

    const copyMerchantLink = () => {
        if (!merchant) return;
        const url = `${window.location.origin}/#/pay/${merchant.slug}`;
        navigator.clipboard.writeText(url);
        alert('Link kopyalandı!');
    };

    const colorOptions = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];

    return (
        <AdminLayout title="Departman Yönetimi">
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">

                {/* LEFT: Department List */}
                <div className="lg:w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800">Departmanlar</h2>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={loadDepartments}
                                className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-gray-200 transition-colors"
                                title="Yenile"
                            >
                                <span className="material-symbols-outlined text-sm">refresh</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(true)}
                                className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-colors"
                            >
                                <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="animate-pulse space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-24 bg-gray-100 rounded-xl"></div>
                                ))}
                            </div>
                        ) : departments.length === 0 ? (
                            <div className="text-center py-12 text-gray-400">
                                <span className="material-symbols-outlined text-4xl mb-2">folder_off</span>
                                <p>Henüz departman yok</p>
                            </div>
                        ) : (
                            departments.map(dept => (
                                <button
                                    type="button"
                                    key={dept.id}
                                    onClick={() => selectDepartment(dept)}
                                    className={`w-full p-4 rounded-xl border transition-all text-left ${selectedDept?.id === dept.id
                                        ? 'border-emerald-300 bg-emerald-50 shadow-md'
                                        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                                            style={{ backgroundColor: `${dept.color}20`, color: dept.color }}
                                        >
                                            <span className="material-symbols-outlined">business</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-gray-800">{dept.name}</h3>
                                            <p className="text-xs text-gray-500">{dept.vaultCount} vault • {dept.memberCount} üye</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-gray-500">Bakiye</p>
                                            <p className="font-bold text-gray-800">${dept.totalBalance.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-2">
                                            <p className="text-gray-500">İşlem</p>
                                            <p className="font-bold text-gray-800">{dept.transactionCount}</p>
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* RIGHT: Department Detail */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {!selectedDept ? (
                        <div className="flex-1 flex items-center justify-center text-gray-400">
                            <div className="text-center">
                                <span className="material-symbols-outlined text-6xl mb-4 opacity-30">select</span>
                                <p>Detay görmek için bir departman seçin</p>
                            </div>
                        </div>
                    ) : detailLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${selectedDept.color}20`, color: selectedDept.color }}
                                    >
                                        <span className="material-symbols-outlined">business</span>
                                    </div>
                                    <div>
                                        <h2 className="font-bold text-gray-800">{selectedDept.name}</h2>
                                        <p className="text-xs text-gray-500">{selectedDept.vaults.length} vault atanmış</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={openEditModal}
                                        className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <span className="material-symbols-outlined">edit</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => deleteDepartment(selectedDept.id)}
                                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                        title="Sil"
                                    >
                                        <span className="material-symbols-outlined">delete</span>
                                    </button>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="p-4 grid grid-cols-4 gap-3 border-b border-gray-100">
                                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-extrabold text-emerald-600">${selectedDept.totalBalance.toLocaleString()}</p>
                                    <p className="text-xs text-emerald-700">Toplam Bakiye</p>
                                </div>
                                <div className="bg-blue-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-extrabold text-blue-600">${selectedDept.totalDeposits.toLocaleString()}</p>
                                    <p className="text-xs text-blue-700">Yatırımlar</p>
                                </div>
                                <div className="bg-red-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-extrabold text-red-600">${selectedDept.totalWithdrawals.toLocaleString()}</p>
                                    <p className="text-xs text-red-700">Çekimler</p>
                                </div>
                                <div className="bg-purple-50 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-extrabold text-purple-600">{selectedDept.members.length}</p>
                                    <p className="text-xs text-purple-700">Üyeler</p>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-100">
                                {[
                                    { id: 'transactions', label: 'İşlemler', icon: 'receipt_long' },
                                    { id: 'members', label: 'Üyeler', icon: 'group' },
                                    { id: 'vaults', label: 'Vaults', icon: 'account_balance_wallet' },
                                    { id: 'merchant', label: 'Ödeme Portalı', icon: 'storefront' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                        className={`flex-1 py-3 text-xs font-bold transition-colors flex items-center justify-center gap-1 ${activeTab === tab.id
                                            ? 'text-emerald-600 border-b-2 border-emerald-500'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-auto">
                                {activeTab === 'transactions' && (
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 text-xs font-bold text-gray-500 uppercase">Zaman</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 uppercase">Kullanıcı</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 uppercase">Tutar</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">Tür</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedDept.transactions.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                                        Henüz işlem yok
                                                    </td>
                                                </tr>
                                            ) : (
                                                selectedDept.transactions.map(tx => (
                                                    <tr key={tx.id} className="hover:bg-gray-50">
                                                        <td className="p-3 text-xs text-gray-500">{new Date(tx.timestamp).toLocaleString()}</td>
                                                        <td className="p-3 text-xs font-bold text-gray-700">{tx.userEmail}</td>
                                                        <td className={`p-3 font-mono font-bold ${tx.type === 'withdraw' ? 'text-red-600' : 'text-green-600'}`}>
                                                            {tx.type === 'withdraw' ? '-' : '+'}${tx.amount.toLocaleString()}
                                                        </td>
                                                        <td className="p-3 text-right">
                                                            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${tx.type === 'withdraw' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                                }`}>{tx.type}</span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'members' && (
                                    <table className="w-full text-left">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 text-xs font-bold text-gray-500 uppercase">Kullanıcı</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 uppercase">Yatırımlar</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 uppercase">Çekimler</th>
                                                <th className="p-3 text-xs font-bold text-gray-500 uppercase text-right">İşlem Sayısı</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {selectedDept.members.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                                        Henüz üye yok
                                                    </td>
                                                </tr>
                                            ) : (
                                                selectedDept.members.map(member => (
                                                    <tr key={member.email} className="hover:bg-gray-50">
                                                        <td className="p-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs">
                                                                    {member.email.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="text-sm font-bold text-gray-700">{member.email}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-3 font-mono text-green-600 font-bold">${member.deposits.toLocaleString()}</td>
                                                        <td className="p-3 font-mono text-red-600 font-bold">${member.withdrawals.toLocaleString()}</td>
                                                        <td className="p-3 text-right">
                                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold">
                                                                {member.txCount} işlem
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}

                                {activeTab === 'vaults' && (
                                    <div className="p-4 space-y-4">
                                        {/* Assigned Vaults */}
                                        <div>
                                            <h3 className="font-bold text-gray-800 mb-3">Atanmış Vaults</h3>
                                            {selectedDept.vaults.length === 0 ? (
                                                <p className="text-gray-400 text-sm">Bu departmana atanmış vault yok</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {selectedDept.vaults.map(v => (
                                                        <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div>
                                                                <p className="font-bold text-gray-800">{v.name}</p>
                                                                <p className="text-xs text-gray-500 font-mono">{v.address}</p>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <span className="font-bold text-emerald-600">${v.balance.toLocaleString()}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => unassignVault(v.id)}
                                                                    className="text-red-500 hover:bg-red-100 p-1 rounded text-xs"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">close</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Available Vaults */}
                                        {/* Available Vaults */}
                                        <div className="mt-6 border-t pt-6">
                                            <h3 className="font-bold text-gray-800 mb-3">Boşta Olan Cüzdanlar</h3>
                                            {allVaults.filter(v => !v.departmentId).length === 0 ? (
                                                <p className="text-gray-400 text-sm mb-4">Boşta cüzdan yok. Yeni cüzdan oluşturun veya diğerlerinden transfer edin.</p>
                                            ) : (
                                                <div className="space-y-2 mb-6">
                                                    {allVaults.filter(v => !v.departmentId).map(v => (
                                                        <div key={v.id} className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                                                            <div>
                                                                <p className="font-bold text-gray-800 text-sm">{v.name}</p>
                                                                <p className="text-xs text-gray-500 font-mono">{v.address.substring(0, 10)}...{v.address.substring(v.address.length - 4)}</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => assignVault(v.id)}
                                                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">add_circle</span>
                                                                Ata
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <h3 className="font-bold text-gray-800 mb-3 mt-6">Diğer Departmanlardaki Cüzdanlar (Transfer)</h3>
                                            <div className="space-y-2 opacity-80 hover:opacity-100 transition-opacity">
                                                {allVaults.filter(v => v.departmentId && v.departmentId !== selectedDept.id).map(v => {
                                                    const ownerDept = departments.find(d => d.id === v.departmentId);
                                                    return (
                                                        <div key={v.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                            <div>
                                                                <p className="font-bold text-gray-700 text-sm">{v.name}</p>
                                                                <p className="text-xs text-gray-400 mb-1">Şu an: <span className="text-gray-600 font-bold">{ownerDept?.name || 'Unknown'}</span></p>
                                                                <p className="text-xs text-gray-400 font-mono">{v.address.substring(0, 8)}...</p>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (confirm(`"${v.name}" cüzdanını ${ownerDept?.name} departmanından alıp buraya transfer etmek istiyor musunuz?`)) {
                                                                        assignVault(v.id);
                                                                    }
                                                                }}
                                                                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">swap_horiz</span>
                                                                Transfer
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                                {allVaults.filter(v => v.departmentId && v.departmentId !== selectedDept.id).length === 0 && (
                                                    <p className="text-gray-400 text-sm">Başka departmanda cüzdan yok.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'merchant' && (
                                    <div className="p-6">
                                        {merchant ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4 p-4 rounded-xl" style={{ backgroundColor: `${merchant.primaryColor}10` }}>
                                                    <div
                                                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
                                                        style={{ backgroundColor: merchant.primaryColor, color: 'white' }}
                                                    >
                                                        {merchant.name.charAt(0)}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h3 className="font-bold text-gray-800 text-lg">{merchant.name}</h3>
                                                        <p className="text-sm text-gray-500">/{merchant.slug}</p>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${merchant.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {merchant.isActive ? 'Aktif' : 'Pasif'}
                                                    </span>
                                                </div>

                                                <div className="bg-gray-50 rounded-xl p-4">
                                                    <label className="text-xs text-gray-500 font-bold block mb-2">Ödeme Portalı Linki</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            readOnly
                                                            value={window.location.origin.startsWith('http')
                                                                ? `${window.location.origin}/#/pay/${merchant.slug}`
                                                                : `https://app.nusd.finance/#/pay/${merchant.slug}`}
                                                            className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-sm font-mono"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={openEditMerchant}
                                                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">edit</span>
                                                            Düzenle
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={copyMerchantLink}
                                                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-1"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">content_copy</span>
                                                            Kopyala
                                                        </button>
                                                    </div>
                                                </div>

                                                <a
                                                    href={`/#/pay/${merchant.slug}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full text-center py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-bold"
                                                >
                                                    Portalı Aç →
                                                </a>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12">
                                                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">storefront</span>
                                                <h3 className="font-bold text-gray-700 mb-2">Ödeme Portalı Yok</h3>
                                                <p className="text-gray-500 text-sm mb-6">Bu departman için henüz ödeme portalı oluşturulmamış.</p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMerchantName(selectedDept.name);
                                                        setMerchantSlug(selectedDept.name.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                                        setShowMerchantModal(true);
                                                    }}
                                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold"
                                                >
                                                    Ödeme Portalı Oluştur
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Create Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-2xl shadow-xl w-96">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Yeni Departman</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Kategori / Tip</label>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {['MERCHANT', 'FOREX', 'EXCHANGE'].map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setNewCategory(cat)}
                                                className={`py-2 rounded-lg text-xs font-bold border transition-all ${newCategory === cat
                                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                            >
                                                {cat === 'MERCHANT' ? 'Kobi' : cat === 'FOREX' ? 'Forex' : 'Cash Point'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Departman Adı</label>
                                    <input
                                        type="text"
                                        value={newDeptName}
                                        onChange={e => setNewDeptName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 font-bold text-gray-700"
                                        placeholder="Örn: Firma A"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Komisyon Tipi</label>
                                        <select
                                            value={newCommissionType}
                                            onChange={e => setNewCommissionType(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                                        >
                                            <option value="PERCENT">Yüzde (%)</option>
                                            <option value="FIXED">Sabit (USDT)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Değer</label>
                                        <input
                                            type="number"
                                            value={newCommissionRate}
                                            onChange={e => setNewCommissionRate(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                            placeholder={newCommissionType === 'PERCENT' ? '2.0' : '50'}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Renk Etiketi</label>
                                    <div className="flex gap-2">
                                        {colorOptions.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setNewDeptColor(color)}
                                                className={`w-8 h-8 rounded-full transition-all ${newDeptColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold"
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={createDepartment}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold"
                                >
                                    Oluştur
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-2xl shadow-xl w-96">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Departmanı Düzenle</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Kategori / Tip</label>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {['MERCHANT', 'FOREX', 'EXCHANGE'].map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setEditCategory(cat)}
                                                className={`py-2 rounded-lg text-xs font-bold border transition-all ${editCategory === cat
                                                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                            >
                                                {cat === 'MERCHANT' ? 'Kobi' : cat === 'FOREX' ? 'Forex' : 'Cash Point'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Departman Adı</label>
                                    <input
                                        type="text"
                                        value={editDeptName}
                                        onChange={e => setEditDeptName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2 font-bold text-gray-700"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Komisyon Tipi</label>
                                        <select
                                            value={editCommissionType}
                                            onChange={e => setEditCommissionType(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white"
                                        >
                                            <option value="PERCENT">Yüzde (%)</option>
                                            <option value="FIXED">Sabit (USDT)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-1">Değer</label>
                                        <input
                                            type="number"
                                            value={editCommissionRate}
                                            onChange={e => setEditCommissionRate(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Renk Etiketi</label>
                                    <div className="flex gap-2">
                                        {colorOptions.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setEditDeptColor(color)}
                                                className={`w-8 h-8 rounded-full transition-all ${editDeptColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                                                    }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold"
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={updateDepartment}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Merchant Modal */}
                {showMerchantModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-2xl shadow-xl w-96 max-h-[90vh] overflow-y-auto">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">{isEditingMerchant ? 'Portalı Düzenle' : 'Ödeme Portalı Oluştur'}</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Portal Adı</label>
                                    <input
                                        type="text"
                                        value={merchantName}
                                        onChange={e => setMerchantName(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="Örn: Firma A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">URL Slug</label>
                                    <div className="flex items-center">
                                        <span className="text-gray-400 text-sm mr-1">/pay/</span>
                                        <input
                                            type="text"
                                            value={merchantSlug}
                                            onChange={e => setMerchantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            className="flex-1 border border-gray-300 rounded-lg p-2"
                                            placeholder="firma-a"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1">Sadece küçük harf, rakam ve tire kullanın</p>
                                </div>

                                <div className="border-t border-gray-100 my-4 pt-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={merchantIsAgent}
                                            onChange={e => setMerchantIsAgent(e.target.checked)}
                                            className="w-4 h-4 text-emerald-600 rounded"
                                        />
                                        <span className="font-bold text-gray-700 text-sm">Ajan (Haritada Göster)</span>
                                    </label>

                                    {merchantIsAgent && (
                                        <div className="mt-3 space-y-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Latitude</label>
                                                    <input
                                                        type="text"
                                                        value={merchantLat}
                                                        onChange={e => setMerchantLat(e.target.value)}
                                                        className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                                        placeholder="41.0082"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 mb-1">Longitude</label>
                                                    <input
                                                        type="text"
                                                        value={merchantLng}
                                                        onChange={e => setMerchantLng(e.target.value)}
                                                        className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                                        placeholder="28.9784"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Adres</label>
                                                <textarea
                                                    value={merchantAddress}
                                                    onChange={e => setMerchantAddress(e.target.value)}
                                                    className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                                    rows={2}
                                                    placeholder="Açık adres..."
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-gray-500 mb-1">Çalışma Saatleri</label>
                                                <input
                                                    type="text"
                                                    value={merchantHours}
                                                    onChange={e => setMerchantHours(e.target.value)}
                                                    className="w-full border border-gray-300 rounded p-1.5 text-xs"
                                                    placeholder="Örn: 09:00 - 18:00"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2 justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowMerchantModal(false)}
                                    className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold"
                                >
                                    İptal
                                </button>
                                <button
                                    type="button"
                                    onClick={isEditingMerchant ? updateMerchantFunc : createMerchant}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold"
                                >
                                    {isEditingMerchant ? 'Kaydet' : 'Oluştur'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default AdminDepartments;
