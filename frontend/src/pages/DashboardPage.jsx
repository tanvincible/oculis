// frontend/src/pages/DashboardPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiGetCompanies, apiUploadBalanceSheet, apiDeleteBalanceSheet, apiGetAllUsers, apiRegisterUser, apiUpdateUser, apiDeleteUser, apiAddCompany, apiUpdateCompany, apiDeleteCompany } from '../api/api'; // Import all necessary API functions
import FinancialCharts from '../components/FinancialCharts';
import ChatInterface from '../components/ChatInterface';
import UserManagement from '../components/UserManagement'; // Assuming you have this component
import CompanyManagement from '../components/CompanyManagement'; // Assuming you have this component
import BalanceSheetUploader from '../components/BalanceSheetUploader';

// Define navigation items for different roles
const navItems = {
    'group_admin': [
        { id: 'dashboard', name: 'Dashboard' },
        { id: 'user-management', name: 'User Management' },
        { id: 'company-management', name: 'Company Management' },
    ],
    'ceo': [
        { id: 'dashboard', name: 'Dashboard' },
    ],
    'analyst': [
        { id: 'dashboard', name: 'Dashboard' },
    ],
};

export default function DashboardPage() {
    const { user, logout, loading: authLoading } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);
    const [selectedCompanyName, setSelectedCompanyName] = useState('');
    const [companiesLoading, setCompaniesLoading] = useState(true);
    const [companiesError, setCompaniesError] = useState(null);
    const [activeNavItem, setActiveNavItem] = useState('dashboard'); // State for active navigation item

    const fetchCompanies = useCallback(async () => {
        if (!user) { // Only fetch if user is authenticated
            setCompaniesLoading(false);
            return;
        }
        setCompaniesLoading(true);
        setCompaniesError(null);
        try {
            const data = await apiGetCompanies();
            setCompanies(data);
            if (data.length > 0) {
                // Automatically select the first company if authorized
                setSelectedCompanyId(data[0].id);
                setSelectedCompanyName(data[0].name);
            } else {
                setSelectedCompanyId(null);
                setSelectedCompanyName('');
            }
        } catch (error) {
            console.error("Failed to fetch companies:", error);
            setCompaniesError(error.message || "Failed to load companies.");
        } finally {
            setCompaniesLoading(false);
        }
    }, [user]); // Depend on user to re-fetch when user changes (e.g., after login)

    useEffect(() => {
        if (!authLoading) { // Only attempt to fetch companies once authentication state is known
            fetchCompanies();
        }
    }, [authLoading, fetchCompanies]);

    const handleCompanyChange = (e) => {
        const id = e.target.value;
        const company = companies.find(c => String(c.id) === id);
        setSelectedCompanyId(id);
        setSelectedCompanyName(company?.name || '');
    };

    const handleNavItemClick = (itemId) => {
        setActiveNavItem(itemId);
    };

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 font-inter">
                <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3 text-lg text-gray-700">Loading user data...</span>
            </div>
        );
    }

    if (!user) {
        // This case should ideally be handled by PrivateRoute, but as a fallback
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 font-inter text-red-600">
                You are not logged in. Redirecting...
            </div>
        );
    }

    const userNavItems = navItems[user.role] || [];

    return (
        <div className="flex min-h-screen w-screen bg-gray-50 font-inter">
            {/* Sidebar */}
            <aside className="sticky top-0 h-screen w-64 bg-neutral-900 shadow-2xl p-6 flex flex-col rounded-r-xl border-r border-neutral-800">
                <div className="text-3xl font-extrabold text-white mb-8 tracking-tight">Oculis</div>
                <nav className="flex-grow">
                    <ul className="space-y-2">
                        {userNavItems.map(item => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleNavItemClick(item.id)}
                                    className={`w-full text-left px-5 py-3 rounded-xl font-medium text-lg transition-all duration-200
                            ${activeNavItem === item.id
                                            ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-400'
                                            : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white'
                                        }`}
                                >
                                    {item.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="mt-auto pt-6 border-t border-neutral-800">
                    <p className="text-sm text-neutral-400 mb-3">
                        Logged in as: <span className="font-semibold text-white">{user.username} ({user.role})</span>
                    </p>
                    <button
                        onClick={logout}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all duration-200"
                    >
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                {activeNavItem === 'dashboard' && (
                    <>
                        <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

                        {companiesLoading ? (
                            <div className="flex items-center justify-center h-32 bg-white rounded-xl shadow-lg p-6 text-gray-600">
                                <svg className="animate-spin h-6 w-6 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading companies...
                            </div>
                        ) : companiesError ? (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative font-inter">
                                <strong className="font-bold">Error:</strong>
                                <span className="block sm:inline ml-2">{companiesError}</span>
                            </div>
                        ) : (
                            <div className="mb-8 p-6 bg-white rounded-xl shadow-lg border border-gray-100">
                                <label htmlFor="company-select" className="block text-lg font-medium text-gray-700 mb-2">
                                    Select Company:
                                </label>
                                <select
                                    id="company-select"
                                    value={selectedCompanyId || ''}
                                    onChange={handleCompanyChange}
                                    className="text-black bg-white mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
                                >
                                    {companies.length === 0 ? (
                                        <option value="">No companies available</option>
                                    ) : (
                                        <>
                                            <option value="">-- Select a Company --</option>
                                            {companies.map(company => (
                                                <option key={company.id} value={String(company.id)}>
                                                    {company.name}
                                                </option>
                                            ))}
                                        </>
                                    )}
                                </select>
                                {companies.length === 0 && (user.role === 'ceo' || user.role === 'analyst') && (
                                    <p className="mt-4 text-yellow-700">
                                        You are assigned to a company that is not available or has no data.
                                        Please contact your administrator.
                                    </p>
                                )}
                            </div>
                        )}

                        {selectedCompanyId && (
                            <>
                                <div className="mb-8">
                                    <BalanceSheetUploader companyId={selectedCompanyId} companyName={selectedCompanyName} />
                                    <ChatInterface companyId={selectedCompanyId} companyName={selectedCompanyName} />
                                    <FinancialCharts companyId={selectedCompanyId} companyName={selectedCompanyName} />
                                </div>
                            </>
                        )}
                        {!selectedCompanyId && !companiesLoading && companies.length > 0 && (
                            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-xl shadow-lg relative font-inter mt-8">
                                <strong className="font-bold">Please Select a Company</strong>
                                <span className="block sm:inline ml-2">to view financial charts and chat.</span>
                            </div>
                        )}
                    </>
                )}

                {activeNavItem === 'user-management' && user.role === 'group_admin' && (
                    <UserManagement
                        apiGetAllUsers={apiGetAllUsers}
                        apiRegisterUser={apiRegisterUser}
                        apiUpdateUser={apiUpdateUser}
                        apiDeleteUser={apiDeleteUser}
                        apiGetCompanies={apiGetCompanies} // Make sure this prop is passed
                    />
                )}

                {activeNavItem === 'company-management' && user.role === 'group_admin' && (
                    <CompanyManagement
                        apiAddCompany={apiAddCompany}
                        apiUpdateCompany={apiUpdateCompany}
                        apiDeleteCompany={apiDeleteCompany}
                        apiGetCompanies={apiGetCompanies} // Make sure this prop is passed
                    />
                )}
            </main>
        </div>
    );
}
