import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AdminLayout from '../components/AdminLayout';

interface ExchangeRate {
    rate: number;
    buy_rate: number;
    sell_rate: number;
    spread: number;
    fetched_at: string;
    is_fallback?: boolean;
}

const AdminExchangeRate = () => {
    const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [updateResult, setUpdateResult] = useState<{ success: boolean; message: string } | null>(null);

    useEffect(() => {
        loadCurrentRate();
    }, []);

    const loadCurrentRate = async () => {
        setIsLoading(true);
        try {
            const rate = await api.getExchangeRate();
            setCurrentRate(rate);
            if (rate.fetched_at) {
                setLastUpdate(new Date(rate.fetched_at));
            }
        } catch (error) {
            console.error('Load rate error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateRate = async () => {
        setIsUpdating(true);
        setUpdateResult(null);
        try {
            const result = await api.updateExchangeRate();
            if (result.success) {
                setUpdateResult({ success: true, message: `Kur güncellendi: 1 USDT = ${result.rate.toFixed(2)} TRY` });
                setCurrentRate({
                    rate: result.rate,
                    buy_rate: result.buy_rate,
                    sell_rate: result.sell_rate,
                    spread: result.spread,
                    fetched_at: result.fetched_at,
                    is_fallback: false
                });
                setLastUpdate(new Date(result.fetched_at));
            } else {
                setUpdateResult({ success: false, message: result.error || 'Güncelleme başarısız' });
            }
        } catch (error: any) {
            setUpdateResult({ success: false, message: error.message || 'Bağlantı hatası' });
        } finally {
            setIsUpdating(false);
        }
    };

    const formatDate = (date: Date) => {
        return date.toLocaleString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getTimeSinceUpdate = () => {
        if (!lastUpdate) return 'Bilinmiyor';
        const diff = Date.now() - lastUpdate.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Az önce';
        if (minutes < 60) return `${minutes} dakika önce`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} saat önce`;
        return formatDate(lastUpdate);
    };

    return (
        <AdminLayout title="Kur Yönetimi">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Kur Yönetimi</h1>
                        <p className="text-gray-400 text-sm mt-1">USDT/TRY döviz kuru ayarları</p>
                    </div>
                    <button
                        onClick={handleUpdateRate}
                        disabled={isUpdating}
                        className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${isUpdating
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : 'bg-lime-500 text-black hover:bg-lime-400 active:scale-[0.98]'
                            }`}
                    >
                        {isUpdating ? (
                            <>
                                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                Güncelleniyor...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">refresh</span>
                                Kuru Güncelle
                            </>
                        )}
                    </button>
                </div>

                {/* Update Result */}
                {updateResult && (
                    <div className={`mb-6 p-4 rounded-xl border ${updateResult.success
                        ? 'bg-lime-500/10 border-lime-500/30 text-lime-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined">
                                {updateResult.success ? 'check_circle' : 'error'}
                            </span>
                            {updateResult.message}
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-lime-500/30 border-t-lime-500 rounded-full animate-spin" />
                    </div>
                ) : currentRate ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Market Rate Card */}
                        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-blue-400 text-2xl">show_chart</span>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Piyasa Kuru</p>
                                    <p className="text-xs text-gray-500">CoinGecko</p>
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white">
                                ₺{currentRate.rate.toFixed(2)}
                            </p>
                            <p className="text-gray-500 text-sm mt-2">1 USDT</p>
                        </div>

                        {/* Buy Rate Card */}
                        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-lime-500/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-lime-500/20 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-lime-400 text-2xl">add_circle</span>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Alım Kuru</p>
                                    <p className="text-xs text-lime-400">+₺{currentRate.spread.toFixed(2)} spread</p>
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-lime-400">
                                ₺{currentRate.buy_rate.toFixed(2)}
                            </p>
                            <p className="text-gray-500 text-sm mt-2">Kullanıcı USDT alırken öder</p>
                        </div>

                        {/* Sell Rate Card */}
                        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-red-500/20">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-400 text-2xl">remove_circle</span>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Satım Kuru</p>
                                    <p className="text-xs text-red-400">-₺{currentRate.spread.toFixed(2)} spread</p>
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-red-400">
                                ₺{currentRate.sell_rate.toFixed(2)}
                            </p>
                            <p className="text-gray-500 text-sm mt-2">Kullanıcı USDT satarken alır</p>
                        </div>
                    </div>
                ) : null}

                {/* Info Section */}
                <div className="mt-6 bg-[#1a1a1a] rounded-2xl p-6 border border-white/5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-gray-400">info</span>
                        Kur Bilgileri
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-gray-400">Son Güncelleme</span>
                            <span className="text-white">{getTimeSinceUpdate()}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-gray-400">Kaynak</span>
                            <span className="text-white">CoinGecko API</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-gray-400">Spread</span>
                            <span className="text-white">₺{currentRate?.spread.toFixed(2) || '0.20'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-white/5">
                            <span className="text-gray-400">Veri Tipi</span>
                            <span className={currentRate?.is_fallback ? 'text-amber-400' : 'text-lime-400'}>
                                {currentRate?.is_fallback ? 'Fallback (Varsayılan)' : 'Gerçek Zamanlı'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Spread Explanation */}
                <div className="mt-6 bg-amber-500/10 rounded-2xl p-6 border border-amber-500/20">
                    <h3 className="text-amber-400 font-bold mb-2 flex items-center gap-2">
                        <span className="material-symbols-outlined">calculate</span>
                        Spread Nasıl Çalışır?
                    </h3>
                    <p className="text-gray-300 text-sm">
                        Her işlemde ±₺0.20 spread uygulanır:
                    </p>
                    <ul className="text-gray-400 text-sm mt-2 space-y-1">
                        <li>• <strong className="text-lime-400">Alım:</strong> Kullanıcı USDT satın alırken piyasa kuru + ₺0.20 öder</li>
                        <li>• <strong className="text-red-400">Satım:</strong> Kullanıcı USDT satarken piyasa kuru - ₺0.20 alır</li>
                    </ul>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminExchangeRate;
