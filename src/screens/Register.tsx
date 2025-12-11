import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useApp } from '../App';

const Register = () => {
    const navigate = useNavigate();
    const { login } = useApp();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) return alert("Please fill all fields");
        if (password !== confirmPassword) return alert("Passwords do not match");

        setLoading(true);
        const user = await api.register(name, email);
        if (user) {
            await login(user.email);
            navigate('/dashboard');
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[#111111] p-6 font-display">
            {/* Logo */}
            <div className="w-16 h-16 bg-lime-500/20 rounded-2xl flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-lime-400 text-3xl">person_add</span>
            </div>

            <h1 className="text-2xl font-extrabold text-white mb-8">Create Account</h1>

            <div className="w-full space-y-5">
                {/* Full Name */}
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Full Name</label>
                    <input
                        className="w-full px-4 py-3.5 rounded-xl border border-white/10 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none bg-[#1a1a1a] text-white font-medium placeholder:text-gray-600"
                        placeholder="John Doe"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Email</label>
                    <input
                        className="w-full px-4 py-3.5 rounded-xl border border-white/10 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none bg-[#1a1a1a] text-white font-medium placeholder:text-gray-600"
                        placeholder="name@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                </div>

                {/* Password */}
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Password</label>
                    <input
                        className="w-full px-4 py-3.5 rounded-xl border border-white/10 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none bg-[#1a1a1a] text-white font-medium placeholder:text-gray-600"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                </div>

                {/* Confirm Password */}
                <div>
                    <label className="block text-sm font-bold text-gray-400 mb-2">Confirm Password</label>
                    <input
                        className="w-full px-4 py-3.5 rounded-xl border border-white/10 focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all outline-none bg-[#1a1a1a] text-white font-medium placeholder:text-gray-600"
                        type="password"
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleRegister}
                    disabled={loading}
                    className="w-full bg-lime-500 hover:bg-lime-400 active:scale-[0.98] text-black py-4 rounded-xl font-bold text-lg shadow-xl shadow-lime-500/20 transition-all mb-4 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </div>

            <div className="mt-8 text-center">
                <p className="text-gray-500 text-sm font-medium">Already have an account?</p>
                <button onClick={() => navigate('/')} className="text-lime-400 font-bold text-sm hover:underline mt-1">
                    Log in here
                </button>
            </div>
        </div>
    );
};
export default Register;
