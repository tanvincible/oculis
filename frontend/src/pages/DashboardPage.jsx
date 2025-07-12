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
        <div className="min-h-screen bg-gray-100">
            <header className="flex justify-between items-center p-4 bg-white shadow">
                <h1 className="text-xl font-bold">Balance Sheet Analyst Dashboard</h1>
                <button
                    onClick={handleLogout}
                    className="bg-red-500 text-white px-4 py-2 rounded"
                >
                    Logout
                </button>
            </header>
            <main className="p-4 max-w-4xl mx-auto">
                <div className="mb-6">
                    <label className="block mb-2 font-semibold">Select Company:</label>
                    <select
                        className="p-2 border rounded w-full"
                        value={selectedCompany ? selectedCompany.id : ''}
                        onChange={e => {
                            const company = companies.find(c => c.id === Number(e.target.value));
                            setSelectedCompany(company);
                        }}
                    >
                        <option value="">-- Choose a company --</option>
                        {companies.map(company => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
                {selectedCompany && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FinancialCharts
                            companyId={selectedCompany.id}
                            companyName={selectedCompany.name}
                        />
                        <ChatInterface
                            companyId={selectedCompany.id}
                            companyName={selectedCompany.name}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}
