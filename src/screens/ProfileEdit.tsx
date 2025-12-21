import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useApp } from '../App';

const ProfileEdit = () => {
    const navigate = useNavigate();
    const { refreshUser } = useApp();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        loadProfileData();
    }, []);

    const loadProfileData = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('first_name, last_name, birth_date')
                .eq('id', user.id)
                .single();

            if (profile) {
                setFirstName(profile.first_name || '');
                setLastName(profile.last_name || '');
                setBirthDate(profile.birth_date || '');
            }
        } catch (error) {
            console.error('Load profile error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim() || !birthDate) {
            return;
        }

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const { error } = await supabase
                .from('profiles')
                .update({
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    birth_date: birthDate,
                    name: `${firstName.trim()} ${lastName.trim()}`,
                    profile_completed: true
                })
                .eq('id', user.id);

            if (error) {
                console.error('Update error:', error);
            }

            setShowSuccess(true);
            await refreshUser();

            setTimeout(() => {
                navigate('/profile');
            }, 1500);

        } catch (error) {
            console.error('Save error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const isFormValid = firstName.trim() && lastName.trim() && birthDate;

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-emerald-800 via-emerald-900 to-emerald-950 flex flex-col font-display">
            {/* Header */}
            <div className="px-4 py-4 flex items-center shrink-0">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-outlined text-white">arrow_back</span>
                </button>
                <h1 className="flex-1 text-center font-bold text-lg text-white pr-8">Profil Bilgileri</h1>
            </div>

            {/* Success Message */}
            {showSuccess && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 text-center max-w-xs w-full shadow-xl">
                        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                        </div>
                        <h3 className="text-gray-900 font-bold text-lg mb-2">Kaydedildi!</h3>
                        <p className="text-gray-500 text-sm">Profil bilgileriniz güncellendi.</p>
                    </div>
                </div>
            )}

            <div className="flex-1 p-5 space-y-6">
                {/* Info Card */}
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-emerald-400">info</span>
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">Neden bu bilgiler gerekli?</p>
                            <p className="text-emerald-200 text-xs mt-1">
                                Kimlik bilgileriniz hesap güvenliği ve yasal yükümlülükler için gereklidir.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl p-5 shadow-lg space-y-4">
                    {/* First Name */}
                    <div className="space-y-2">
                        <label className="text-gray-700 text-sm font-medium pl-1">Ad</label>
                        <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="Adınızı girin"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                        />
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                        <label className="text-gray-700 text-sm font-medium pl-1">Soyad</label>
                        <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Soyadınızı girin"
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                        />
                    </div>

                    {/* Birth Date */}
                    <div className="space-y-2">
                        <label className="text-gray-700 text-sm font-medium pl-1">Doğum Tarihi</label>
                        <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                        />
                    </div>

                    {/* Preview */}
                    {(firstName || lastName) && (
                        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 mt-4">
                            <p className="text-emerald-600 text-xs font-medium mb-1">Önizleme</p>
                            <p className="text-gray-900 font-bold text-lg">
                                {firstName} {lastName}
                            </p>
                            {birthDate && (
                                <p className="text-gray-500 text-sm mt-1">
                                    Doğum: {new Date(birthDate).toLocaleDateString('tr-TR')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <button
                    onClick={handleSave}
                    disabled={!isFormValid || isSaving}
                    className={`w-full py-4 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 shadow-lg ${isFormValid && !isSaving
                        ? 'bg-emerald-500 text-white hover:bg-emerald-400 active:scale-[0.98] shadow-emerald-500/30'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Kaydediliyor...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">save</span>
                            Kaydet
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default ProfileEdit;
