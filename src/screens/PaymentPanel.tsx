import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../App';

const PaymentPanel = () => {
    const { slug } = useParams<{ slug: string }>();
    const { user, session } = useApp();

    const [panel, setPanel] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState<string>('');
    const [processing, setProcessing] = useState(false);
    const [result, setResult] = useState<{ success: boolean, message?: string } | null>(null);

    useEffect(() => {
        if (slug) fetchPanel();
    }, [slug]);

    const fetchPanel = async () => {
        setLoading(true);
        const data = await api.getPanelBySlug(slug!);
        setPanel(data);
        setLoading(false);
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            alert('Invalid amount');
            return;
        }

        setProcessing(true);
        const res = await api.payViaPanel(slug!, numericAmount);

        if (res && res.success) {
            setResult({ success: true });
        } else {
            setResult({ success: false, message: res?.error?.message || 'Transaction failed' });
        }
        setProcessing(false);
    };

    // Loading State
    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    // Not Found State
    if (!panel) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                <span className="material-symbols-outlined text-6xl text-gray-300 mb-4">link_off</span>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Payment Panel Not Found</h2>
                <p className="text-gray-500 mb-6">The link you followed is invalid or has been deactivated.</p>
                <Link to="/" className="text-blue-600 font-bold hover:underline">Go Home</Link>
            </div>
        </div>
    );

    // Unauthenticated State
    if (!user || !session) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                <span className="material-symbols-outlined text-6xl text-blue-100 text-blue-500 mb-4">lock</span>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Login Required</h2>
                <p className="text-gray-500 mb-6">You need to be logged in to make a payment to <b>{panel.name}</b>.</p>
                <Link to="/" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                    Login / Register
                </Link>
            </div>
        </div>
    );

    // Success State
    if (result?.success) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Initiated</h2>
                <p className="text-gray-500 mb-6">Your transaction has been created successfully. The admin will review it shortly.</p>
                <Link to="/history" className="block w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors mb-3">
                    View in History
                </Link>
                <Link to="/dashboard" className="text-blue-600 font-bold text-sm hover:underline">Return to Dashboard</Link>
            </div>
        </div>
    );

    // Payment Form
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden w-full max-w-md">
                {/* Header */}
                <div className="bg-blue-600 p-8 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <p className="text-blue-200 text-sm font-bold tracking-wider uppercase mb-1">{panel.department?.name || 'Department'}</p>
                    <h1 className="text-3xl font-bold">{panel.name}</h1>
                </div>

                {/* Body */}
                <div className="p-8">
                    <form onSubmit={handlePayment}>
                        <div className="mb-6">
                            <label className="block text-gray-500 text-xs font-bold uppercase mb-2">Payment Amount ({panel.asset})</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    className="w-full text-3xl font-bold text-gray-800 p-4 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-colors"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                                    {panel.asset}
                                </span>
                            </div>

                            {/* Commission Estimate */}
                            {amount && !isNaN(parseFloat(amount)) && (
                                <div className="mt-3 text-right text-xs text-gray-500">
                                    Fee: {panel.commission_type === 'percentage'
                                        ? `%${panel.commission_value} (${(parseFloat(amount) * panel.commission_value / 100).toFixed(2)} ${panel.asset})`
                                        : `${panel.commission_value} ${panel.asset}`}
                                </div>
                            )}
                        </div>

                        {result?.success === false && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">error</span>
                                {result.message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-lg rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2"
                        >
                            {processing ? 'Processing...' : 'Pay Now'}
                            {!processing && <span className="material-symbols-outlined">arrow_forward</span>}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-400">Secured by NUSD Wallet</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPanel;
