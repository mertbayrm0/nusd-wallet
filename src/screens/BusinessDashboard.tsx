import React, { useEffect, useState } from 'react';
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
                    onClick={() => copyToClipboard(department?.nusd_address || '')}
                >
                    <span className="font-mono font-bold text-xl text-lime-300">{department?.nusd_address}</span>
                    <span className="material-symbols-outlined text-lime-400 text-lg">content_copy</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Bu adrese gelen transferler bakiyenize eklenir</p>
            </div>

            {/* Balance Card */}
            <div className="bg-[#1a1a1a] rounded-2xl p-5 mb-4">
                <p className="text-gray-400 text-sm">Bakiye</p>
                <p className="text-4xl font-bold text-white">${(department?.balance || 0).toLocaleString()}</p>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                    onClick={() => setShowTransfer(true)}
                    className="bg-lime-500 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">send</span>
                    NUSD Gönder
                </button>
                <button
                    onClick={() => alert('Çekim talebi özelliği yakında')}
                    className="bg-[#1a1a1a] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-gray-700"
                >
                    <span className="material-symbols-outlined">account_balance</span>
                    Çekim Talebi
                </button>
            </div>

            {/* Payment Portal Section */}
            <div className="bg-[#1a1a1a] rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">Ödeme Portalı</h3>
                    <button
                        onClick={togglePanel}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${panel?.is_active
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                    >
                        {panel?.is_active ? 'AKTİF' : 'KAPALI'}
                    </button>
                </div>
                {panel && (
                    <div
                        className="bg-[#0a0a0a] p-3 rounded-xl flex items-center justify-between cursor-pointer"
                        onClick={() => copyToClipboard(`${window.location.origin}/#/pay/${panel.public_slug}`)}
                    >
                        <div>
                            <p className="text-xs text-gray-500">Portal Linki</p>
                            <p className="text-sm text-lime-400 font-mono">/pay/{panel.public_slug}</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-500">content_copy</span>
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
        </div>
    );
};

export default BusinessDashboard;
