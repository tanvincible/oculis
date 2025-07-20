import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrashAlt, FaTimesCircle, FaInfoCircle, FaSpinner } from 'react-icons/fa'; // Import icons

export default function CompanyManagement({ apiAddCompany, apiUpdateCompany, apiDeleteCompany, apiGetCompanies }) {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEdit] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false); // New state for delete confirmation
    const [companyToDelete, setCompanyToDelete] = useState(null); // Company ID to delete
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

    const confirmDeleteCompany = (companyId) => {
        setCompanyToDelete(companyId);
        setShowConfirmDeleteModal(true);
    };

    const handleDeleteCompany = async () => {
        if (!companyToDelete) return;
        setError(null);
        try {
            await apiDeleteCompany(companyToDelete);
            setShowConfirmDeleteModal(false);
            setCompanyToDelete(null);
            fetchCompanies(); // Refresh list
        } catch (err) {
            console.error("Failed to delete company:", err);
            setError(err.message || "Failed to delete company.");
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

    const closeModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowConfirmDeleteModal(false);
        setCurrentCompany(null);
        setCompanyToDelete(null);
        setFormData({ name: '', currency: 'INR', parent_company_id: '' });
        setError(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg p-6 font-inter text-gray-600">
                <FaSpinner className="animate-spin h-8 w-8 mr-3 text-blue-500" />
                Loading companies...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-lg relative font-inter text-sm sm:text-base">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline ml-2">{error}</span>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 pb-2 border-b border-gray-200">Company Management</h2>

            <button
                onClick={() => setShowAddModal(true)}
                className="mb-4 sm:mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors duration-200 shadow-md flex items-center text-sm"
            >
                <FaPlus className="mr-1 sm:mr-2 text-sm" /> Add New Company
            </button>

            {companies.length === 0 ? (
                <p className="text-gray-600 text-sm sm:text-base">No companies found. Add a new company to get started.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parent Company</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {companies.map(company => (
                                <tr key={company.id}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{company.name}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{company.currency}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                        {company.parent_company_id ? companies.find(c => c.id === company.parent_company_id)?.name || 'N/A' : 'None'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-left text-sm font-medium flex flex-col sm:flex-row gap-1 sm:gap-2">
                                        <button
                                            onClick={() => openEditModal(company)}
                                            className="text-blue-600 hover:text-blue-900 flex items-center py-1 px-2 rounded-md border border-blue-200 hover:border-blue-400 transition-colors"
                                            title="Edit Company"
                                        >
                                            <FaEdit className="text-sm" />
                                            <span className="ml-1 text-xs hidden sm:inline">Edit</span>
                                        </button>
                                        <button
                                            onClick={() => confirmDeleteCompany(company.id)}
                                            className="text-red-600 hover:text-red-900 flex items-center py-1 px-2 rounded-md border border-red-200 hover:border-red-400 transition-colors"
                                            title="Delete Company"
                                        >
                                            <FaTrashAlt className="text-sm" />
                                            <span className="ml-1 text-xs hidden sm:inline">Delete</span>
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
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md">
                        <h3 className="text-lg sm:text-xl font-bold mb-4">Add New Company</h3>
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
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
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
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
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
                                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                >
                                    <option value="">-- Select Parent --</option>
                                    {companies.map(comp => (
                                        // Prevent a company from being its own parent when adding
                                        <option key={comp.id} value={comp.id}>{comp.name}</option>
                                    ))}
                                </select>
                            </div>
                            {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-3 rounded-md focus:outline-none focus:shadow-outline w-full sm:w-auto text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md focus:outline-none focus:shadow-outline w-full sm:w-auto text-sm"
                                >
                                    Add Company
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Company Modal */}
            {showEditModal && currentCompany && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md">
                        <h3 className="text-lg sm:text-xl font-bold mb-4">Edit Company: {currentCompany.name}</h3>
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
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
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
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
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
                                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
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
                            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-3 rounded-md focus:outline-none focus:shadow-outline w-full sm:w-auto text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md focus:outline-none focus:shadow-outline w-full sm:w-auto text-sm"
                                >
                                    Update Company
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showConfirmDeleteModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md">
                        <h3 className="text-lg sm:text-xl font-bold mb-4 text-red-700 flex items-center">
                            <FaTimesCircle className="mr-2" /> Confirm Deletion
                        </h3>
                        <p className="mb-6 text-gray-700 text-sm sm:text-base">
                            Are you sure you want to delete this company and all its associated data (users, balance sheets)?
                            This action cannot be undone.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 sm:gap-4">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-3 rounded-md focus:outline-none focus:shadow-outline w-full sm:w-auto text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteCompany}
                                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md focus:outline-none focus:shadow-outline w-full sm:w-auto text-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
