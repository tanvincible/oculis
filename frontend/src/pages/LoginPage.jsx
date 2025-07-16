// frontend/src/pages/LoginPage.jsx

import React, { useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth(); // Destructure login from useAuth
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(username, password); // Call the login function from AuthContext
            // Navigation is handled inside AuthContext's login function now
        } catch (err) {
            setError(err.message || 'Login failed. Please check your credentials.');
            console.error("Login attempt error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-neutral-950 font-inter p-4">
            <div className="bg-neutral-900 p-10 rounded-3xl shadow-2xl w-full max-w-md border border-neutral-800 text-neutral-200">
                <h2 className="text-4xl font-extrabold text-center mb-8 text-white tracking-tight">Oculis Portal</h2>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-neutral-400" htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            className="w-full py-3 px-4 rounded-xl bg-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 transition"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-neutral-400" htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full py-3 px-4 rounded-xl bg-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-neutral-800 transition"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    {error && (
                        <p className="text-red-500 text-sm text-center">{error}</p>
                    )}
                    <button
                        type="submit"
                        className={`w-full !bg-white text-neutral-900 font-bold py-3 rounded-xl border border-neutral-300 shadow-md hover:bg-neutral-100 hover:border-neutral-400 transition-all transform hover:scale-[1.02] active:scale-100 duration-200`}
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
                <p className="text-xs text-center text-neutral-500 mt-6">© {new Date().getFullYear()} Oculis Technologies</p>
            </div>
        </div>
    );
}
