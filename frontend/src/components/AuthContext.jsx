// frontend/src/components/AuthContext.js

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiLogin, apiGetCurrentUser, apiLogout } from '../api/api'; // Ensure apiLogout is imported

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // setUser is defined here
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // Function to load user from localStorage and validate token
    const loadUser = useCallback(async () => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            try {
                // Verify token by fetching current user info
                const currentUser = await apiGetCurrentUser(storedToken); // Pass token for verification
                setUser(currentUser); // This is where setUser is called
            } catch (error) {
                console.error("Token validation failed or user not found:", error);
                localStorage.removeItem('token'); // Clear invalid token
                setUser(null); // This is where setUser is called
            }
        }
        setLoading(false);
    }, []); // No dependencies that change over time, so useCallback is fine.

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    const login = async (username, password) => {
        try {
            const data = await apiLogin(username, password);
            localStorage.setItem('token', data.access_token);
            // After successful login, reload user data to update context
            await loadUser(); // This calls loadUser, which then calls setUser
            navigate('/'); // Navigate to dashboard on successful login
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            setUser(null); // This is where setUser is called
            throw error; // Re-throw to allow component to handle login errors
        }
    };

    const logout = async () => {
        try {
            await apiLogout(); // Call backend logout (if it does anything, e.g., token blacklisting)
            localStorage.removeItem('token');
            setUser(null); // This is where setUser is called
            navigate('/login'); // Redirect to login page
        } catch (error) {
            console.error("Logout failed:", error);
            // Even if backend logout fails, clear client-side token
            localStorage.removeItem('token');
            setUser(null);
            navigate('/login');
        }
    };

    // Provide user, login, logout, and loading state to children
    const authContextValue = {
        user,
        login,
        logout,
        loading,
        token: localStorage.getItem('token') // Provide token directly for API calls
    };

    return (
        <AuthContext.Provider value={authContextValue}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};
