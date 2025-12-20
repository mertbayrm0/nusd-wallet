import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { getWalletBalance } from '../services/trongrid';
import AdminLayout from '../components/AdminLayout';

interface Vault {
    id: string;
    name: string;
    address: string;
    balance: number;
}

interface VaultEntry {
    id: string;
    vaultId: string;
    vaultAddress: string;
    type: string;
    amount: number;
    network: string;
    userEmail: string;
    timestamp: string;
}

interface BlockchainBalance {
    trx: number;
    usdt: number;
    loading: boolean;
}

const AdminVaults = () => {
    const [data, setData] = useState<{ vaults: Vault[], ledger: VaultEntry[] }>({ vaults: [], ledger: [] });
    const [loading, setLoading] = useState(true);
    const [blockchainBalances, setBlockchainBalances] = useState<Record<string, BlockchainBalance>>({});

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedVault, setSelectedVault] = useState<Vault | null>(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositEmail, setDepositEmail] = useState('');
    const [addToUser, setAddToUser] = useState(false);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        const load = () => api.getAdminVaults().then(res => {
            setData(res);
            setLoading(false);
        });
        load();
        const interval = setInterval(load, 5000);
        return () => clearInterval(interval);
    }, []);

    // Blockchain bakiyelerini yükle
    useEffect(() => {
        const loadBlockchainBalances = async () => {
            for (const vault of data.vaults) {
                if (vault.address && vault.address.startsWith('T')) {
                    setBlockchainBalances(prev => ({
                        ...prev,
                        [vault.id]: { trx: 0, usdt: 0, loading: true }
                    }));

                    try {
                        const balance = await getWalletBalance(vault.address);
                        setBlockchainBalances(prev => ({
                            ...prev,
                            [vault.id]: { ...balance, loading: false }
                        }));
                    } catch (e) {
                        setBlockchainBalances(prev => ({
                            ...prev,
                            [vault.id]: { trx: 0, usdt: 0, loading: false }
                        }));
                    }
                }
            }
        };

        if (data.vaults.length > 0) {
            loadBlockchainBalances();
        }
    }, [data.vaults]);

    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
    }

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVault || !depositAmount) return;

        setProcessing(true);
        const success = await api.manualVaultDeposit(
            selectedVault.id,
            parseFloat(depositAmount),
            depositEmail || 'External Transfer',
            'TRC20',
            addToUser
        );

        if (success) {
            setShowModal(false);
            setDepositAmount('');
            setDepositEmail('');
            setAddToUser(false);
            setProcessing(false);
            api.getAdminVaults().then(setData);
        } else {
            alert('Failed to deposit');
            setProcessing(false);
        }
    };

    return (
        <AdminLayout title="Crypto Vaults (TRX)">
            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] relative">

                {/* Modal */}
                {showModal && selectedVault && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-2xl">
                        <div className="bg-white p-6 rounded-2xl shadow-xl w-96 max-w-full">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">Add Funds to {selectedVault.name}</h3>
                            <form onSubmit={handleDeposit}>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Amount (USDT)</label>
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={e => setDepositAmount(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="0.00"
                                        step="0.01"
                                        required
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Sender Email (Optional)</label>
                                    <input
                                        type="text"
                                        value={depositEmail}
                                        onChange={e => setDepositEmail(e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg p-2"
                                        placeholder="external@sender.com"
                                    />
                                </div>
                                {depositEmail && (
                                    <div className="mb-6 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="addToUser"
                                            checked={addToUser}
                                            onChange={e => setAddToUser(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <label htmlFor="addToUser" className="text-sm text-gray-700 font-medium select-none">
                                            Also credit user's balance
                                        </label>
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setShowModal(false)}
                                        className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold"
                                    >
                                        {processing ? 'Processing...' : 'Add Funds'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* LEFT: Vaults List */}
                <div className="lg:w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h2 className="font-bold text-gray-800">Vault Accounts</h2>
                        <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{data.vaults.length} Active</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {data.vaults.map(vault => {
                            const bcBalance = blockchainBalances[vault.id];
                            return (
                                <div key={vault.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                                            </div>
                                            <h3 className="font-bold text-gray-700 text-sm">{vault.name}</h3>
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const result = await api.toggleVaultStatus(vault.id);
                                                    if (result.success) {
                                                        api.getAdminVaults().then(setData);
                                                    }
                                                }}
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${(vault as any).is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                                            >
                                                {(vault as any).is_active !== false ? 'AKTİF' : 'PASİF'}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right">
                                                <span className="text-lg font-extrabold text-[#111827]">
                                                    ${vault.balance.toLocaleString()}
                                                </span>
                                                <p className="text-[10px] text-gray-400">Platform Balance</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedVault(vault);
                                                    setShowModal(true);
                                                }}
                                                className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors"
                                                title="Add Funds Manually"
                                            >
                                                <span className="material-symbols-outlined text-xs">add</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Blockchain Balance */}
                                    {vault.address && vault.address.startsWith('T') && (
                                        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-2 mb-2 border border-green-100">
                                            <p className="text-[10px] text-gray-500 font-bold mb-1">⛓️ Blockchain Balance</p>
                                            {bcBalance?.loading ? (
                                                <p className="text-xs text-gray-400 animate-pulse">Loading...</p>
                                            ) : bcBalance ? (
                                                <div className="flex gap-4">
                                                    <span className="text-sm font-bold text-green-600">
                                                        {bcBalance.usdt.toLocaleString()} USDT
                                                    </span>
                                                    <span className="text-sm font-bold text-blue-600">
                                                        {bcBalance.trx.toFixed(2)} TRX
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-400">-</p>
                                            )}
                                        </div>
                                    )}

                                    <div
                                        className="bg-gray-50 rounded-lg p-2 flex justify-between items-center cursor-pointer hover:bg-gray-100 group-hover:bg-blue-50 transition-colors"
                                        onClick={() => copy(vault.address)}
                                        title="Click to copy"
                                    >
                                        <p className="font-mono text-xs text-gray-500 truncate w-48">{vault.address}</p>
                                        <span className="material-symbols-outlined text-gray-400 text-xs group-hover:text-blue-500">content_copy</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT: Ledger Table */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h2 className="font-bold text-gray-800">Vault Ledger</h2>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Network</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Amount</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Type</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {data.ledger.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-12 text-center text-gray-400 italic">
                                            <span className="material-symbols-outlined text-4xl mb-2 opacity-20">receipt_long</span>
                                            <p>No transaction history</p>
                                        </td>
                                    </tr>
                                ) : (
                                    data.ledger.map(entry => (
                                        <tr key={entry.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{new Date(entry.timestamp).toLocaleString()}</td>
                                            <td className="p-4 text-xs font-bold text-gray-700">{entry.userEmail}</td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
                                                    {entry.network}
                                                </span>
                                            </td>
                                            <td className={`p-4 font-mono font-bold text-sm ${entry.type === 'withdraw' ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                {entry.type === 'withdraw' ? '-' : '+'}${entry.amount.toLocaleString()}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${entry.type === 'withdraw' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                    }`}>{entry.type}</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
};
export default AdminVaults;
