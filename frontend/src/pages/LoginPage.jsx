import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { apiLogin } from '../api/api';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { setUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const user = await apiLogin(username, password);
            setUser(user);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Login failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] px-4">
            <form
                onSubmit={handleSubmit}
                className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-10 w-full max-w-md shadow-xl space-y-8 transition-all"
            >
                <h2 className="text-4xl font-bold text-center text-white tracking-wide">Oculis: AI-powered Balance Sheet Analyst</h2>

                {error && (
                    <div className="text-red-500 bg-red-100/10 text-center rounded-lg py-2 px-4 border border-red-400/20 font-medium text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-6">
                    <input
                        type="text"
                        placeholder="Username"
                        className="w-full p-4 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:ring-2 focus:ring-cyan-400 outline-none"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-4 rounded-xl bg-white/10 text-white placeholder-gray-400 border border-white/20 focus:ring-2 focus:ring-cyan-400 outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-black font-bold tracking-wide shadow-lg hover:scale-105 hover:shadow-xl transform transition-all duration-300"
                >
                    Login
                </button>
            </form>
        </div>

    );
}
