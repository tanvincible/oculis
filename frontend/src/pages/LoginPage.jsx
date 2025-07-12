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
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <form
                onSubmit={handleSubmit}
                className="bg-surface border border-neutral-700 p-8 rounded-2xl w-full max-w-sm shadow-xl backdrop-blur-md"
            >
                <h2 className="text-3xl font-bold mb-8 text-center text-text tracking-wide">
                    Welcome to BSA
                </h2>

                {error && (
                    <div className="mb-4 text-error text-sm text-center">
                        {error}
                    </div>
                )}

                <div className="space-y-5">
                    <input
                        type="text"
                        placeholder="Username"
                        className="w-full p-3 bg-neutral-900 text-text placeholder-gray-500 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-3 bg-neutral-900 text-text placeholder-gray-500 border border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                <button
                    type="submit"
                    className="mt-8 w-full bg-accent text-black py-2.5 rounded-lg hover:bg-cyan-300 font-semibold transition-all duration-200"
                >
                    Login
                </button>
            </form>
        </div>
    );
}
