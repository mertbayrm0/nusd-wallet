import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AutoLogin = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const processLogin = () => {
            try {
                console.log("AutoLogin processing URL:", window.location.href);

                // 1. Try URLSearchParams (standard)
                let search = new URLSearchParams(window.location.search);
                let token = search.get('token');
                let email = search.get('email');

                // 2. Fallback: Parse from Hash (if coming after #)
                if (!token) {
                    const hashParts = window.location.hash.split('?');
                    if (hashParts.length > 1) {
                        const hashSearch = new URLSearchParams(hashParts[1]);
                        token = hashSearch.get('token');
                        email = hashSearch.get('email');
                    }
                }

                if (token && email) {
                    console.log("Found Credentials. Logging in...");
                    localStorage.setItem('nusd_auth_token', token);
                    localStorage.setItem('nusd_current_user', email);

                    setTimeout(() => {
                        window.location.href = window.location.origin + '/#/admin';
                        window.location.reload();
                    }, 500);
                } else {
                    console.warn("No credentials found in URL");
                    // Don't redirect immediately to allow debugging visually
                    alert("AutoLogin Error: No token found in link.");
                    navigate('/');
                }
            } catch (e) {
                console.error("Auto-login failed:", e);
                navigate('/');
            }
        };

        processLogin();
    }, []);

    return (
        <div className="min-h-screen bg-[#111111] flex flex-col items-center justify-center font-display">
            <div className="w-16 h-16 border-4 border-lime-500 border-t-transparent rounded-full animate-spin mb-6"></div>
            <h1 className="text-2xl font-bold text-white mb-2">Securely Logging In...</h1>
            <p className="text-gray-500">Connecting to Admin Panel...</p>
        </div>
    );
};

export default AutoLogin;
