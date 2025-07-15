import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthContext';
import { apiLogout, apiGetCompanies } from '../api/api';
import FinancialCharts from '../components/FinancialCharts';
import ChatInterface from '../components/ChatInterface';

export default function DashboardPage() {
    const { user, setUser } = useAuth();
    const [companies, setCompanies] = useState([]);
    const [selectedCompany, setSelectedCompany] = useState(null);

    useEffect(() => {
        apiGetCompanies()
            .then(setCompanies)
            .catch(() => setCompanies([]));
    }, []);

    const handleLogout = async () => {
        await apiLogout();
        setUser(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white font-inter">
            <header className="flex justify-between items-center px-8 py-6 bg-white shadow-lg sticky top-0 z-50">
                <h1 className="text-3xl font-bold text-gray-800">📊 Financial Intelligence Dashboard</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg font-semibold shadow"
                >
                    Logout
                </button>
            </header>
            <main className="flex flex-col xl:flex-row gap-8 p-8 w-full max-w-[1600px] mx-auto">
                <div className="flex-1 space-y-6">
                    <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
                        <label className="block mb-3 text-lg font-semibold text-gray-700">Select Company</label>
                        <select
                            className="p-3 border rounded-lg w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedCompany ? selectedCompany.id : ''}
                            onChange={e => {
                                const company = companies.find(c => c.id === Number(e.target.value));
                                setSelectedCompany(company);
                            }}
                        >
                            <option value="">-- Choose a company --</option>
                            {companies.map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </div>

                    {selectedCompany && (
                        <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-800 mb-4">📈 {selectedCompany.name} Financial Overview</h2>
                            <FinancialCharts
                                companyId={selectedCompany.id}
                                companyName={selectedCompany.name}
                            />
                        </div>
                    )}
                </div>

                {selectedCompany && (
                    <div className="xl:w-[450px] w-full space-y-6">
                        <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-200 h-full flex flex-col">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">💬 Ask AI about {selectedCompany.name}</h2>
                            <ChatInterface
                                companyId={selectedCompany.id}
                                companyName={selectedCompany.name}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
