import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../App';

const JoinBusiness = () => {
    const { inviteCode } = useParams<{ inviteCode: string }>();
    const navigate = useNavigate();
    const { user, refreshUser } = useApp();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleJoin = async () => {
        if (!inviteCode) {
            setError('Geçersiz davet kodu');
            return;
        }

        if (!user) {
            // Kullanıcı giriş yapmamış, login sayfasına yönlendir
            navigate(`/login?redirect=/join/${inviteCode}`);
            return;
        }

        setLoading(true);
        setError(null);

        const result = await api.acceptBusinessInvite(inviteCode);

        if (result.success) {
            setSuccess(result.message || 'Ekibe başarıyla katıldınız!');
            refreshUser();
            setTimeout(() => {
                navigate('/business');
            }, 2000);
        } else {
            setError(result.error || 'Davet kabul edilemedi');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-white">
            <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-sm w-full text-center border border-white/10">
                {/* Icon */}
                <div className="w-20 h-20 bg-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-5xl text-lime-400">group_add</span>
                </div>

                <h1 className="text-2xl font-bold mb-2">İşletme Daveti</h1>
                <p className="text-gray-400 mb-6">
                    Bir işletme sizi ekibine davet etti. Katılmak için aşağıdaki butona tıklayın.
                </p>

                {!user && (
                    <p className="text-amber-400 text-sm mb-4">
                        Daveti kabul etmek için önce giriş yapmalısınız.
                    </p>
                )}

                {error && (
                    <div className="bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-lg mb-4 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-lime-500/20 border border-lime-500/30 text-lime-400 p-3 rounded-lg mb-4 text-sm">
                        {success}
                    </div>
                )}

                <button
                    onClick={handleJoin}
                    disabled={loading || !!success}
                    className="w-full bg-lime-500 hover:bg-lime-400 text-black font-bold py-4 rounded-xl disabled:opacity-50 transition-all mb-4"
                >
                    {loading ? 'Katılınıyor...' : user ? 'Ekibe Katıl' : 'Giriş Yap ve Katıl'}
                </button>

                <button
                    onClick={() => navigate('/')}
                    className="w-full text-gray-400 py-2"
                >
                    Ana Sayfaya Dön
                </button>
            </div>
        </div>
    );
};

export default JoinBusiness;
