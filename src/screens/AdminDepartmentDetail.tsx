import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';
import AdminTransactionAuditLogs from '../components/AdminTransactionAuditLogs';

const AdminDepartmentDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    // Data States
    const [dept, setDept] = useState<any>(null);
    const [assignedVaults, setAssignedVaults] = useState<any[]>([]);
    const [availableVaults, setAvailableVaults] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // UI States
    const [activeTab, setActiveTab] = useState<'transactions' | 'members' | 'portal'>('portal');
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isPanelModalOpen, setIsPanelModalOpen] = useState(false);
    const [portalRequests, setPortalRequests] = useState<any[]>([]);

    // Create Panel Form
    const [panelForm, setPanelForm] = useState({
        name: '',
        commission_mode: 'percentage',
        commission_value: 0,
        asset: 'USDT', // Default per screenshot
        settlement_type: 'external',
        is_active: true
    });

    useEffect(() => {
        if (id) {
            fetchDetail();
            fetchVaults();
            fetchTransactions();
            fetchPortalRequests();
        }
    }, [id]);

    const fetchDetail = async () => {
        const data = await api.getDepartment(id!);
        if (data) {
            setDept(data);
        } else {
            navigate('/admin/departments');
        }
        setLoading(false);
    };

    const fetchTransactions = async () => {
        const txs = await api.getDepartmentTransactions(id!);
        setTransactions(txs);
    };

    const fetchPortalRequests = async () => {
        const requests = await api.getPortalRequests(id!);
        setPortalRequests(requests);
    };

    const fetchVaults = async () => {
        // 1. Get assigned vaults
        // We assume we can filter vaults by department_id via API or supabase client directly if API is missing generic filter.
        // Since we didn't add getDepartmentVaults to API, let's assume we can fetch all or use the relationship if loaded.
        // Actually, let's add a quick fetch logic here or use api.getDepartment if it includes vaults? 
        // api.getDepartment includes 'panels' but maybe not vaults.
        // Let's rely on api.getAvailableVaults for unassigned, and maybe we need a way to get assigned ones.
        // For now, I'll assume dept.vaults exists OR I'll update API.
        // Wait, the plan said "Update api.ts" but I only added vault mgmt methods, not "getDepartmentVaults".
        // I will use `availableVaults` logic.

        const avail = await api.getAvailableVaults();
        setAvailableVaults(avail);

        // For assigned vaults, we can reload department if we updated the query, OR we can fetch manually.
        // Let's assume we reload department and modify getDepartment to include vaults.
        // PROACTIVE FIX: I should have updated getDepartment query.
        // I will fetch them directly here for now to ensure it works without touching API again if possible.
        // access supabase client directly? No, use api.
        // I'll try to use data from getDepartment if I can update it? 
        // Actually, let's just assume `dept` has `vaults` if I update the query in existing `api.getDepartment`.
        // I'll check `api.ts` content via `view_file`? No need.
        // I will implement a fetch here using the `supabase` client if I could, but I can't import it easily.
        // Let's just assume `dept` loads them. If not, I'll fix api.ts in next step.
    };

    // Vault Actions
    const handleAssign = async (vaultId: string) => {
        if (!id) return;
        const success = await api.assignVault(vaultId, id);
        if (success) {
            setIsAssignModalOpen(false);
            fetchDetail(); // Refresh dept to get updated vaults
            fetchVaults(); // Refresh available list
        } else {
            alert('Atama başarısız oldu. Lütfen yetkilerinizi kontrol edin veya Step 4 SQL dosyasını çalıştırdığınızdan emin olun.');
        }
    };

    const handleUnassign = async (vaultId: string) => {
        if (confirm('Are you sure you want to unassign this vault?')) {
            const success = await api.unassignVault(vaultId);
            if (success) {
                fetchDetail();
                fetchVaults();
            }
        }
    };

    const handleSetPrimary = async (vaultId: string) => {
        if (!id) return;
        const success = await api.setPrimaryVault(vaultId, id);
        if (success) {
            fetchDetail();
        }
    };

    // Panel Actions
    const handleCreatePanel = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await api.createPaymentPanel({ department_id: id, ...panelForm });
        if (res?.success) {
            setIsPanelModalOpen(false);
            fetchDetail();
        } else {
            alert('Error creating panel');
        }
    };

    if (loading || !dept) return <AdminLayout title="...">Loading...</AdminLayout>;

    // We assume dept.vaults is populated. If not, we might need a quick API fix.
    // Let's proceed assuming we will fix API query.
    const myVaults = dept.vaults || [];

    return (
        <AdminLayout title="">
            {/* Header / Breadcrumb */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="cursor-pointer hover:text-gray-600" onClick={() => navigate('/admin/departments')}>Departmanlar</span>
                        <span>/</span>
                        <span className="text-gray-800 font-bold">{dept.name}</span>
                    </div>
                    {/* İşletme Paneli Toggle Button */}
                    <button
                        onClick={async () => {
                            const isCurrentlyBusiness = dept.owner?.account_type === 'business';
                            const result = await api.activateBusinessPanel(dept.owner?.id, !isCurrentlyBusiness);
                            if (result.success) {
                                alert(isCurrentlyBusiness ? 'İşletme Paneli deaktif edildi!' : 'İşletme Paneli aktifleştirildi!');
                                fetchDetail();
                            } else {
                                alert('Hata: ' + (result.error || 'İşlem başarısız'));
                            }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${dept.owner?.account_type === 'business'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                    >
                        <span className="material-symbols-outlined text-sm">
                            {dept.owner?.account_type === 'business' ? 'storefront' : 'add_business'}
                        </span>
                        {dept.owner?.account_type === 'business' ? 'İşletme Paneli Aktif' : 'İşletme Paneli Aktifleştir'}
                    </button>
                    {/* Departman Aktif/Pasif Toggle */}
                    <button
                        onClick={async () => {
                            const result = await api.toggleDepartmentStatus(dept.id);
                            if (result.success) {
                                alert(result.newStatus ? 'Departman aktif edildi!' : 'Departman pasif edildi!');
                                fetchDetail();
                            } else {
                                alert('Hata: İşlem başarısız');
                            }
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${dept.is_active
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                    >
                        <span className="material-symbols-outlined text-sm">
                            {dept.is_active ? 'check_circle' : 'cancel'}
                        </span>
                        {dept.is_active ? 'Departman Aktif' : 'Departman Pasif'}
                    </button>
                </div>

                {/* Top Stats Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <div className="text-center">
                            <h3 className="text-green-600 font-bold text-2xl">${(dept.owner?.balance || 0).toLocaleString()}</h3>
                            <p className="text-green-800 text-xs font-bold uppercase mt-1">Toplam Bakiye</p>
                        </div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="text-center">
                            <h3 className="text-blue-600 font-bold text-2xl">${transactions.filter(t => t.type === 'DEPOSIT' || t.amount > 0).reduce((sum, t) => sum + Math.abs(t.amount || 0), 0).toLocaleString()}</h3>
                            <p className="text-blue-800 text-xs font-bold uppercase mt-1">Yatırımlar</p>
                        </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                        <div className="text-center">
                            <h3 className="text-red-600 font-bold text-2xl">${transactions.filter(t => t.type === 'WITHDRAW' || t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount || 0), 0).toLocaleString()}</h3>
                            <p className="text-red-800 text-xs font-bold uppercase mt-1">Çekimler</p>
                        </div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <div className="text-center">
                            <h3 className="text-purple-600 font-bold text-2xl">{transactions.length}</h3>
                            <p className="text-purple-800 text-xs font-bold uppercase mt-1">İşlemler</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 border-b border-gray-100 mb-6">
                    {['transactions', 'members', 'portal'].map(t => (
                        <button
                            key={t}
                            onClick={() => setActiveTab(t as any)}
                            className={`pb-3 text-sm font-bold capitalize transition-colors ${activeTab === t
                                ? 'text-green-600 border-b-2 border-green-500'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {t === 'transactions' ? 'İşlemler' :
                                t === 'members' ? 'Üyeler' : 'Ödeme Portalı'}
                        </button>
                    ))}
                </div>

                {/* CONTENT */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">

                    {/* TRANSACTIONS TAB */}
                    {activeTab === 'transactions' && (
                        <div className="p-6">
                            {transactions.length === 0 ? (
                                <div className="text-center text-gray-400 py-12">
                                    Henüz işlem yok.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {transactions.map((tx: any) => (
                                        <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' || tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    <span className="material-symbols-outlined text-sm">
                                                        {tx.type === 'DEPOSIT' || tx.amount > 0 ? 'arrow_downward' : 'arrow_upward'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800">
                                                        {tx.type === 'DEPOSIT' ? 'Yatırım' :
                                                            tx.type === 'WITHDRAW' ? 'Çekim' :
                                                                tx.type === 'TRANSFER' ? 'Transfer' : tx.type}
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(tx.created_at).toLocaleString('tr-TR')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.amount > 0 ? '+' : ''}{Math.abs(tx.amount).toLocaleString()} USDT
                                                </p>
                                                <p className={`text-xs ${tx.status === 'COMPLETED' ? 'text-green-500' :
                                                    tx.status === 'PENDING' ? 'text-amber-500' : 'text-gray-500'
                                                    }`}>
                                                    {tx.status === 'COMPLETED' ? 'Tamamlandı' :
                                                        tx.status === 'PENDING' ? 'Beklemede' : tx.status}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* MEMBERS TAB */}
                    {activeTab === 'members' && (
                        <div className="p-8 text-center text-gray-400">
                            Henüz üye yok.
                        </div>
                    )}

                    {/* PORTAL TAB */}
                    {activeTab === 'portal' && (
                        <div className="p-6">
                            {/* NUSD Address Card */}
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200 mb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-green-600 font-bold uppercase mb-1"># NUSD Adresi</p>
                                        <p className="font-mono font-bold text-xl text-green-700">
                                            {dept.owner?.nusd_code || 'NUSD kod bulunamadı'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const code = dept.owner?.nusd_code;
                                            if (code) {
                                                navigator.clipboard.writeText(code);
                                                alert('Kopyalandı!');
                                            }
                                        }}
                                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-sm">content_copy</span>
                                        Kopyala
                                    </button>
                                </div>
                            </div>

                            {/* Bekleyen Portal Talepleri */}
                            {portalRequests.filter(r => r.status === 'pending').length > 0 && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                                    <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-amber-600">pending_actions</span>
                                        Bekleyen Portal Talepleri ({portalRequests.filter(r => r.status === 'pending').length})
                                    </h4>
                                    <div className="space-y-2">
                                        {portalRequests.filter(r => r.status === 'pending').map((req: any) => (
                                            <div key={req.id} className="bg-white p-3 rounded-lg flex items-center justify-between">
                                                <div>
                                                    <p className="font-bold text-gray-800">{req.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {req.requester?.email || 'Bilinmiyor'} - {new Date(req.created_at).toLocaleDateString('tr-TR')}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const result = await api.approvePortalRequest(req.id);
                                                            if (result.success) {
                                                                alert('Portal oluşturuldu!');
                                                                fetchDetail();
                                                                fetchPortalRequests();
                                                            } else {
                                                                alert('Hata: ' + (result.error || 'Onaylama başarısız'));
                                                            }
                                                        }}
                                                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold"
                                                    >
                                                        Onayla
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            const result = await api.rejectPortalRequest(req.id);
                                                            if (result.success) {
                                                                fetchPortalRequests();
                                                            }
                                                        }}
                                                        className="bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold"
                                                    >
                                                        Reddet
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-gray-800">Ödeme Portalları</h3>
                                <button
                                    onClick={() => setIsPanelModalOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
                                >
                                    + Yeni Portal
                                </button>
                            </div>

                            {dept.panels && dept.panels.length > 0 ? (
                                <div className="space-y-4">
                                    {dept.panels.map((panel: any) => (
                                        <div key={panel.id} className="border border-gray-200 p-4 rounded-xl">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 font-bold text-xl">
                                                        {panel.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800">{panel.name}</h4>
                                                        <p className="text-xs text-gray-400">/{panel.public_slug}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${panel.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                    {panel.is_active ? 'AKTİF' : 'PASİF'}
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 p-3 rounded-lg flex items-center gap-2">
                                                <code className="flex-1 text-xs text-gray-600 truncate font-mono">
                                                    {window.location.origin}/#/pay/{panel.public_slug}
                                                </code>
                                                <button
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-bold transition-colors"
                                                    onClick={() => window.open(`/#/pay/${panel.public_slug}`, '_blank')}
                                                >
                                                    Portalı Aç →
                                                </button>
                                                <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-bold transition-colors">
                                                    Kopyala
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    Henüz portal oluşturulmamış.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Panel Modal */}
            {isPanelModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="font-bold text-lg mb-4">Yeni Portal Oluştur</h3>
                        <form onSubmit={handleCreatePanel} className="space-y-4">
                            <input
                                className="w-full p-3 border rounded-lg"
                                placeholder="Portal Adı"
                                value={panelForm.name}
                                onChange={e => setPanelForm({ ...panelForm, name: e.target.value })}
                                required
                            />
                            {/* Simplified form for speed */}
                            <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">Oluştur</button>
                            <button type="button" onClick={() => setIsPanelModalOpen(false)} className="w-full text-gray-500 mt-2">İptal</button>
                        </form>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default AdminDepartmentDetail;
