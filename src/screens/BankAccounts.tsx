import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { api } from '../services/api';

interface BankAccount {
    id: string;
    bankName: string;
    iban: string;
    accountName: string;
    addedAt: string;
}

const TURKISH_BANKS = [
    'Ziraat Bankası',
    'Türkiye İş Bankası',
    'Garanti BBVA',
    'Yapı Kredi',
    'Akbank'
];

const BankAccounts = () => {
    const navigate = useNavigate();
    const { user } = useApp();
    const [accounts, setAccounts] = useState<BankAccount[]>([]);
    const [bankName, setBankName] = useState(TURKISH_BANKS[0]);
    const [iban, setIban] = useState('');
    const [accountName, setAccountName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            api.getBankAccounts(user.email).then(setAccounts);
        }
    }, [user]);

    const handleAdd = async () => {
        if (!user) return;
        if (!iban.trim() || !accountName.trim()) return alert("Lütfen tüm alanları doldurunuz");

        // Basic TR IBAN validation
        const cleanIban = iban.replace(/\s/g, '').toUpperCase();
        if (!cleanIban.startsWith('TR') || cleanIban.length !== 26) {
            return alert("Geçersiz IBAN. TR ile başlamalı ve 26 karakter olmalı.");
        }

        setLoading(true);
        const result = await api.addBankAccount(user.email, bankName, cleanIban, accountName);
        if (result) {
            setAccounts([...accounts, result]);
            setIban('');
            setAccountName('');
            alert("Banka hesabı eklendi!");
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!user) return;
        if (!confirm("Bu hesabı silmek istediğinizden emin misiniz?")) return;

        await api.deleteBankAccount(user.email, id);
        setAccounts(accounts.filter(acc => acc.id !== id));
    };

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col font-display">
            {/* Header */}
            <div className="bg-[#1a1a1a] px-5 py-4 flex items-center gap-3 shadow-lg sticky top-0 z-10 border-b border-white/5">
                <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-lime-400 hover:bg-lime-400/10 p-2 rounded-full transition-colors">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="font-extrabold text-lg text-white">Banka Hesapları</h1>
            </div>

            <div className="px-5 py-6 flex-1 overflow-y-auto">
                {/* Add New Account Card */}
                <div className="bg-[#1a1a1a]/50 backdrop-blur-sm p-6 rounded-2xl border border-white/5 mb-6">
                    <h2 className="font-bold text-white mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-lime-500">add_circle</span>
                        Yeni Hesap Ekle
                    </h2>

                    <div className="space-y-4">
                        {/* Bank Selection */}
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">Banka</label>
                            <select
                                value={bankName}
                                onChange={e => setBankName(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#111111] text-white font-medium focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none"
                            >
                                {TURKISH_BANKS.map(bank => (
                                    <option key={bank} value={bank}>{bank}</option>
                                ))}
                            </select>
                        </div>

                        {/* Account Name Input */}
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">Hesap Sahibi Adı Soyadı</label>
                            <input
                                value={accountName}
                                onChange={e => setAccountName(e.target.value)}
                                placeholder="Örn: Ahmet Yılmaz"
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#111111] text-white font-medium focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none placeholder-gray-600"
                            />
                        </div>

                        {/* IBAN Input */}
                        <div>
                            <label className="block text-sm font-bold text-gray-400 mb-2">IBAN</label>
                            <input
                                value={iban}
                                onChange={e => setIban(e.target.value)}
                                placeholder="TR00 0000 0000 0000 0000 0000 00"
                                maxLength={34}
                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#111111] text-white font-mono focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none placeholder-gray-600"
                            />
                            <p className="text-xs text-gray-500 mt-2">TR ile başlamalı, 26 karakter olmalı</p>
                        </div>

                        <button
                            onClick={handleAdd}
                            disabled={loading || !iban || !accountName}
                            className="w-full bg-lime-500 hover:bg-lime-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-black py-3 rounded-xl font-bold shadow-lg shadow-lime-500/20 transition-all"
                        >
                            {loading ? 'Ekleniyor...' : 'Hesap Ekle'}
                        </button>
                    </div>
                </div>

                {/* Saved Accounts */}
                <h2 className="font-bold text-white mb-3 px-1">Kayıtlı Hesaplar</h2>
                {accounts.length === 0 ? (
                    <div className="bg-[#1a1a1a]/50 backdrop-blur-sm p-8 rounded-2xl border border-white/5 text-center">
                        <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">account_balance</span>
                        <p className="text-gray-500 font-medium">Henüz banka hesabı eklemediniz</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {accounts.map(acc => (
                            <div key={acc.id} className="bg-[#1a1a1a]/50 backdrop-blur-sm p-5 rounded-2xl border border-white/5 flex items-start justify-between hover:border-lime-500/30 transition-all">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-lime-500">account_balance</span>
                                        <h3 className="font-bold text-white">{acc.bankName}</h3>
                                    </div>
                                    <p className="font-mono text-sm text-gray-400 bg-[#111111] px-3 py-2 rounded-lg inline-block">
                                        {acc.iban.match(/.{1,4}/g)?.join(' ')}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-2">{acc.addedAt}</p>
                                </div>
                                <button
                                    onClick={() => handleDelete(acc.id)}
                                    className="text-red-400 hover:bg-red-500/10 p-2 rounded-full transition-colors ml-2"
                                >
                                    <span className="material-symbols-outlined">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BankAccounts;