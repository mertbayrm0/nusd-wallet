import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../App';

const BusinessDashboard = () => {
    const { user, logout } = useApp();
    const navigate = useNavigate();

    const [department, setDepartment] = useState<any>(null);
    const [panel, setPanel] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Transfer modal
    const [showTransfer, setShowTransfer] = useState(false);
    const [transferTo, setTransferTo] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [transferLoading, setTransferLoading] = useState(false);

    // Çekim Talepleri modal
    const [showWithdrawals, setShowWithdrawals] = useState(false);
    const [withdrawalRequests, setWithdrawalRequests] = useState<any[]>([]);
    const [processingWithdrawal, setProcessingWithdrawal] = useState<string | null>(null);

    // Ekip Yönetimi
    const [showTeam, setShowTeam] = useState(false);
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [pendingInvites, setPendingInvites] = useState<any[]>([]);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('staff');
    const [inviteLoading, setInviteLoading] = useState(false);

    // NUSD adresi - profilden al (tüm ekranlarda aynı)
    const memoCode = user?.nusd_code || 'NUSD-XXXX';

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get user's business department
            const profile = await api.getProfile();
            if (!profile || profile.account_type !== 'business') {
                setError('İşletme hesabı bulunamadı');
                return;
            }

            if (profile.business_department_id) {
                const dept = await api.getDepartment(profile.business_department_id);
                setDepartment(dept);

                // Get panel for this department
                if (dept?.panels?.length > 0) {
                    setPanel(dept.panels[0]);
                }

                // Get incoming transactions for this department
                const txs = await api.getDepartmentTransactions(profile.business_department_id);
                setTransactions(txs || []);
            }
        } catch (e) {
            console.error(e);
            setError('Veriler yüklenemedi');
        }
        setLoading(false);
    };

    const handleTransfer = async () => {
        if (!transferTo || !transferAmount || parseFloat(transferAmount) <= 0) {
            alert('Lütfen geçerli bilgiler girin');
            return;
        }

        setTransferLoading(true);
        try {
            const res = await api.internalTransfer(transferTo, parseFloat(transferAmount));
            if (res.success) {
                alert('Transfer başarılı!');
                setShowTransfer(false);
                setTransferTo('');
                setTransferAmount('');
                loadData();
            } else {
                alert(res.error || 'Transfer başarısız');
            }
        } catch (e) {
            alert('Transfer hatası');
        }
        setTransferLoading(false);
    };

    const togglePanel = async () => {
        if (!panel) return;
        const newStatus = !panel.is_active;
        const res = await api.updatePanelStatus(panel.id, newStatus);
        if (res?.success) {
            setPanel({ ...panel, is_active: newStatus });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Kopyalandı!');
    };

    // Ekip verilerini yükle
    const loadTeam = async () => {
        const teamResult = await api.getBusinessTeam();
        if (teamResult.success) {
            setTeamMembers(teamResult.members || []);
        }

        const invitesResult = await api.getBusinessInvites();
        if (invitesResult.success) {
            setPendingInvites(invitesResult.invites || []);
        }
    };

    // Ekip üyesi davet et
    const handleInvite = async () => {
        if (!inviteEmail) {
            alert('Email gerekli');
            return;
        }

        setInviteLoading(true);
        const result = await api.inviteBusinessMember(inviteEmail, inviteRole);

        if (result.success) {
            alert(`Davet gönderildi!\n\nDavet linki: ${result.invite_link}`);
            setInviteEmail('');
            loadTeam();
        } else {
            alert(result.error || 'Davet gönderilemedi');
        }
        setInviteLoading(false);
    };

    // Daveti iptal et
    const handleCancelInvite = async (inviteId: string) => {
        const result = await api.cancelBusinessInvite(inviteId);
        if (result.success) {
            loadTeam();
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="text-white">Yükleniyor...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-4">
                <div className="text-red-400 mb-4">{error}</div>
                <button onClick={() => navigate('/')} className="text-lime-400">Ana Sayfaya Dön</button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-4 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-lime-500 rounded-full flex items-center justify-center text-black font-bold">
                            {department?.name?.[0] || 'F'}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg">{department?.name}</h1>
                            <p className="text-xs text-gray-500">İşletme Paneli</p>
                        </div>
                    </div>
                </div>
                <button onClick={() => navigate('/')} className="text-gray-400">
                    <span className="material-symbols-outlined">close</span>
                </button>
            </div>

            {/* NUSD Address Card */}
            <div className="bg-gradient-to-r from-lime-600/20 to-green-600/20 border border-lime-500/30 rounded-2xl p-4 mb-4">
                <p className="text-xs text-lime-400 font-bold uppercase mb-1"># NUSD Adresiniz</p>
                <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => copyToClipboard(memoCode)}
                >
                    <span className="font-mono font-bold text-xl text-lime-300">{memoCode}</span>
                    <span className="material-symbols-outlined text-lime-400 text-lg">content_copy</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Bu adrese gelen transferler bakiyenize eklenir</p>
            </div>

            {/* Balance Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4">
                <p className="text-gray-400 text-sm">Bakiye</p>
                <p className="text-4xl font-bold text-white">${(user?.balance || 0).toLocaleString()}</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                    onClick={() => setShowTransfer(true)}
                    className="bg-lime-500 text-black font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1"
                >
                    <span className="material-symbols-outlined">send</span>
                    <span className="text-xs">Gönder</span>
                </button>
                <button
                    onClick={() => setShowWithdrawals(true)}
                    className="bg-[#1a1a1a] text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 border border-gray-700"
                >
                    <span className="material-symbols-outlined">account_balance</span>
                    <span className="text-xs">Çekim</span>
                </button>
                <button
                    onClick={() => { setShowTeam(true); loadTeam(); }}
                    className="bg-[#1a1a1a] text-white font-bold py-3 rounded-xl flex flex-col items-center justify-center gap-1 border border-gray-700"
                >
                    <span className="material-symbols-outlined">groups</span>
                    <span className="text-xs">Ekip</span>
                </button>
            </div>

            {/* Çekim Talepleri Modal */}
            {showWithdrawals && (
                <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
                    <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-lg">Çekim Talepleri</h2>
                            <button onClick={() => setShowWithdrawals(false)}>
                                <span className="material-symbols-outlined text-gray-400">close</span>
                            </button>
                        </div>

                        {withdrawalRequests.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                                <p>Bekleyen çekim talebi yok</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {withdrawalRequests.map((req: any) => (
                                    <div key={req.id} className="bg-[#0a0a0a] rounded-xl p-4 border border-white/5">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-white">${req.amount}</span>
                                            <span className="text-xs text-amber-400 bg-amber-500/20 px-2 py-1 rounded">{req.status}</span>
                                        </div>
                                        <p className="text-sm text-gray-400 mb-1">Adres: {req.wallet_address}</p>
                                        <p className="text-xs text-gray-500 mb-3">{new Date(req.created_at).toLocaleString()}</p>
                                        <button
                                            onClick={async () => {
                                                setProcessingWithdrawal(req.id);
                                                // TODO: API call to complete withdrawal
                                                alert('Çekim tamamlandı olarak işaretlendi');
                                                setProcessingWithdrawal(null);
                                            }}
                                            disabled={processingWithdrawal === req.id}
                                            className="w-full bg-lime-500 text-black py-2 rounded-lg font-bold text-sm disabled:opacity-50"
                                        >
                                            {processingWithdrawal === req.id ? 'İşleniyor...' : 'Gönderildi Olarak İşaretle'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Portallarım Section */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                        <span className="material-symbols-outlined text-lime-400">storefront</span>
                        Portallarım
                    </h3>
                    <button
                        onClick={() => alert('Yeni portal oluşturma yakında')}
                        className="bg-lime-500/20 text-lime-400 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Portal Ekle
                    </button>
                </div>

                {/* Portal List */}
                {panel ? (
                    <div className="space-y-3">
                        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-white/5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${panel.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                    <span className="font-medium text-white">{department?.name || 'Portal'}</span>
                                </div>
                                <button
                                    onClick={togglePanel}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${panel.is_active
                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                        }`}
                                >
                                    {panel.is_active ? 'AKTİF' : 'KAPALI'}
                                </button>
                            </div>

                            {/* Portal Link */}
                            <div
                                className="bg-[#1a1a1a] p-3 rounded-lg flex items-center justify-between cursor-pointer hover:bg-[#222] transition-colors"
                                onClick={() => copyToClipboard(`${window.location.origin}/#/pay/${panel.public_slug}`)}
                            >
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Portal Linki</p>
                                    <p className="text-sm text-lime-400 font-mono">{window.location.origin}/#/pay/{panel.public_slug}</p>
                                </div>
                                <span className="material-symbols-outlined text-lime-500">content_copy</span>
                            </div>

                            {/* Portal Actions */}
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => window.open(`${window.location.origin}/#/pay/${panel.public_slug}`, '_blank')}
                                    className="flex-1 bg-[#1a1a1a] text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-[#222] transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                    Önizle
                                </button>
                                <button
                                    onClick={() => copyToClipboard(`${window.location.origin}/#/pay/${panel.public_slug}`)}
                                    className="flex-1 bg-[#1a1a1a] text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1 hover:bg-[#222] transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">share</span>
                                    Paylaş
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6 text-gray-500">
                        <span className="material-symbols-outlined text-3xl mb-2">storefront</span>
                        <p className="text-sm">Henüz portal yok</p>
                        <button
                            onClick={() => alert('Portal oluşturma yakında')}
                            className="mt-3 text-lime-400 text-sm font-medium"
                        >
                            İlk portalını oluştur →
                        </button>
                    </div>
                )}
            </div>

            {/* Recent Transactions */}
            <div className="mb-6">
                <h3 className="font-bold mb-3">Son Yatırımlar</h3>
                {transactions.length === 0 ? (
                    <div className="bg-[#1a1a1a] rounded-xl p-6 text-center text-gray-500">
                        Henüz yatırım yok
                    </div>
                ) : (
                    <div className="space-y-2">
                        {transactions.slice(0, 5).map((tx: any) => (
                            <div key={tx.id} className="bg-[#1a1a1a] rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-green-400 text-sm">arrow_downward</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{tx.sender_email || 'Transfer'}</p>
                                        <p className="text-xs text-gray-500">{new Date(tx.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <p className="text-green-400 font-bold">+${tx.amount}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Transfer Modal */}
            {showTransfer && (
                <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
                    <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-lg">NUSD Gönder</h2>
                            <button onClick={() => setShowTransfer(false)}>
                                <span className="material-symbols-outlined text-gray-400">close</span>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 uppercase mb-2">Alıcı NUSD Adresi</label>
                                <input
                                    type="text"
                                    value={transferTo}
                                    onChange={e => setTransferTo(e.target.value)}
                                    placeholder="NUSD-XXXXXX"
                                    className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 uppercase mb-2">Tutar</label>
                                <input
                                    type="number"
                                    value={transferAmount}
                                    onChange={e => setTransferAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-[#0a0a0a] border border-gray-700 rounded-xl p-3 text-white"
                                />
                            </div>

                            <button
                                onClick={handleTransfer}
                                disabled={transferLoading}
                                className="w-full bg-lime-500 text-black font-bold py-4 rounded-xl disabled:opacity-50"
                            >
                                {transferLoading ? 'Gönderiliyor...' : 'Gönder'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Ekip Modal */}
            {showTeam && (
                <div className="fixed inset-0 bg-black/80 flex items-end justify-center z-50">
                    <div className="bg-[#1a1a1a] w-full max-w-lg rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-bold text-lg flex items-center gap-2">
                                <span className="material-symbols-outlined text-lime-400">groups</span>
                                Ekip Yönetimi
                            </h2>
                            <button onClick={() => setShowTeam(false)}>
                                <span className="material-symbols-outlined text-gray-400">close</span>
                            </button>
                        </div>

                        {/* Davet Formu */}
                        <div className="bg-[#0a0a0a] rounded-xl p-4 mb-6">
                            <h3 className="font-bold text-sm mb-3 text-gray-300">Yeni Üye Davet Et</h3>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                placeholder="Email adresi"
                                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-white mb-3"
                            />
                            <select
                                value={inviteRole}
                                onChange={e => setInviteRole(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-gray-700 rounded-lg p-3 text-white mb-3"
                            >
                                <option value="staff">Staff (Sadece Görüntüleme)</option>
                                <option value="manager">Manager (İşlem Yapabilir)</option>
                            </select>
                            <button
                                onClick={handleInvite}
                                disabled={inviteLoading || !inviteEmail}
                                className="w-full bg-lime-500 text-black font-bold py-3 rounded-lg disabled:opacity-50"
                            >
                                {inviteLoading ? 'Gönderiliyor...' : 'Davet Gönder'}
                            </button>
                        </div>

                        {/* Bekleyen Davetler */}
                        {pendingInvites.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-bold text-sm mb-3 text-gray-300">Bekleyen Davetler</h3>
                                <div className="space-y-2">
                                    {pendingInvites.map((invite: any) => (
                                        <div key={invite.id} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                                            <div>
                                                <p className="text-white font-medium">{invite.email}</p>
                                                <p className="text-xs text-amber-400">{invite.role}</p>
                                            </div>
                                            <button
                                                onClick={() => handleCancelInvite(invite.id)}
                                                className="text-red-400 text-xs"
                                            >
                                                İptal
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ekip Üyeleri */}
                        <div>
                            <h3 className="font-bold text-sm mb-3 text-gray-300">Ekip Üyeleri ({teamMembers.length})</h3>
                            <div className="space-y-2">
                                {teamMembers.map((member: any) => (
                                    <div key={member.id} className="bg-[#0a0a0a] rounded-lg p-3 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${member.business_role === 'owner' ? 'bg-lime-500/20 text-lime-400' : 'bg-gray-700 text-gray-300'}`}>
                                                <span className="material-symbols-outlined text-sm">
                                                    {member.business_role === 'owner' ? 'star' : 'person'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{member.name || member.email?.split('@')[0]}</p>
                                                <p className="text-xs text-gray-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded ${member.business_role === 'owner' ? 'bg-lime-500/20 text-lime-400' :
                                            member.business_role === 'manager' ? 'bg-blue-500/20 text-blue-400' :
                                                'bg-gray-700 text-gray-400'
                                            }`}>
                                            {member.business_role === 'owner' ? 'Sahip' :
                                                member.business_role === 'manager' ? 'Yönetici' : 'Personel'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessDashboard;
