// frontend/src/components/CompanyManagement.jsx

import React, { useState, useEffect, useCallback } from 'react';

export default function CompanyManagement({ apiAddCompany, apiUpdateCompany, apiDeleteCompany, apiGetCompanies }) {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [currentCompany, setCurrentCompany] = useState(null); // Company being edited
    const [formData, setFormData] = useState({
        name: '',
        currency: 'INR', // Default currency
        parent_company_id: ''
    });

    const fetchCompanies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiGetCompanies();
            setCompanies(data);
        } catch (err) {
            console.error("Failed to fetch companies:", err);
            setError(err.message || "Failed to load companies.");
        } finally {
            setLoading(false);
        }
    }, [apiGetCompanies]);

    useEffect(() => {
        fetchCompanies();
    }, [fetchCompanies]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddCompany = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await apiAddCompany(formData);
            setShowAddModal(false);
            setFormData({ name: '', currency: 'INR', parent_company_id: '' }); // Reset form
            fetchCompanies(); // Refresh list
        } catch (err) {
            console.error("Failed to add company:", err);
            setError(err.message || "Failed to add company.");
        }
    };

    const handleEditCompany = async (e) => {
        e.preventDefault();
        setError(null);
        if (!currentCompany) return;
        try {
            const updateData = {
                name: formData.name,
                currency: formData.currency,
                parent_company_id: formData.parent_company_id || null // Ensure null if empty string
            };
            await apiUpdateCompany(currentCompany.id, updateData);
            setShowEditModal(false);
            setCurrentCompany(null);
            setFormData({ name: '', currency: 'INR', parent_company_id: '' }); // Reset form
            fetchCompanies(); // Refresh list
        } catch (err) {
            console.error("Failed to update company:", err);
            setError(err.message || "Failed to update company.");
        }
    };

    const handleDeleteCompany = async (companyId) => {
        if (window.confirm("Are you sure you want to delete this company and all its associated data (users, balance sheets)?")) {
            setError(null);
            try {
                await apiDeleteCompany(companyId);
                fetchCompanies(); // Refresh list
            } catch (err) {
                console.error("Failed to delete company:", err);
                setError(err.message || "Failed to delete company.");
            }
        }
    };

    const openEditModal = (company) => {
        setCurrentCompany(company);
        setFormData({
            name: company.name,
            currency: company.currency,
            parent_company_id: company.parent_company_id || ''
        });
        setShowEditModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg p-6 font-inter text-gray-600">
                <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading companies...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-lg relative font-inter">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline ml-2">{error}</span>
            </div>
        );
    }

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">Company Management</h2>

            <button
                onClick={() => setShowAddModal(true)}
                className="mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 shadow-md"
            >
                Add New Company
            </button>

            {companies.length === 0 ? (
                <p className="text-gray-600">No companies found. Add a new company to get started.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Company</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {companies.map(company => (
                                <tr key={company.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{company.currency}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {company.parent_company_id ? companies.find(c => c.id === company.parent_company_id)?.name || 'N/A' : 'None'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openEditModal(company)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCompany(company.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Company Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Add New Company</h3>
                        <form onSubmit={handleAddCompany}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="company-name">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    id="company-name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="currency">
                                    Currency
                                </label>
                                <input
                                    type="text"
                                    name="currency"
                                    id="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="parent_company_id">
                                    Parent Company (Optional)
                                </label>
                                <select
                                    name="parent_company_id"
                                    id="parent_company_id"
                                    value={formData.parent_company_id}
                                    onChange={handleChange}
                                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                >
                                    <option value="">-- Select Parent --</option>
                                    {companies.map(comp => (
                                        // Prevent a company from being its own parent when adding
                                        <option key={comp.id} value={comp.id}>{comp.name}</option>
                                    ))}
                                </select>
                            </div>
                            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                            <div className="flex items-center justify-between">
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
                                >
                                    Add Company
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setFormData({ name: '', currency: 'INR', parent_company_id: '' });
                                        setError(null);
                                    }}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Company Modal */}
            {showEditModal && currentCompany && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                        <h3 className="text-xl font-bold mb-4">Edit Company: {currentCompany.name}</h3>
                        <form onSubmit={handleEditCompany}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-company-name">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    id="edit-company-name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-currency">
                                    Currency
                                </label>
                                <input
                                    type="text"
                                    name="currency"
                                    id="edit-currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-parent_company_id">
                                    Parent Company (Optional)
                                </label>
                                <select
                                    name="parent_company_id"
                                    id="edit-parent_company_id"
                                    value={formData.parent_company_id}
                                    onChange={handleChange}
                                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                >
                                    <option value="">-- Select Parent --</option>
                                    {companies.map(comp => (
                                        // Prevent a company from being its own parent
                                        (comp.id !== currentCompany.id) && (
                                            <option key={comp.id} value={comp.id}>{comp.name}</option>
                                        )
                                    ))}
                                </select>
                            </div>
                            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                            <div className="flex items-center justify-between">
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
                                >
                                    Update Company
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setCurrentCompany(null);
                                        setFormData({ name: '', currency: 'INR', parent_company_id: '' });
                                        setError(null);
                                    }}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg focus:outline-none focus:shadow-outline"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
