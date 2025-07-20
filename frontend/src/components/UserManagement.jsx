import React, { useState, useEffect, useCallback } from 'react';
import { FaPlus, FaEdit, FaTrashAlt, FaTimesCircle, FaInfoCircle, FaSpinner } from 'react-icons/fa'; // Import icons

// Define roles for dropdowns
const ROLES = ['group_admin', 'ceo', 'analyst'];

export default function UserManagement({ apiGetAllUsers, apiRegisterUser, apiUpdateUser, apiDeleteUser, apiGetCompanies }) {
    const [users, setUsers] = useState([]);
    const [companies, setCompanies] = useState([]); // For assigning users to companies
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false); // New state for delete confirmation
    const [userToDelete, setUserToDelete] = useState(null); // User ID to delete
    const [currentUser, setCurrentUser] = useState(null); // User being edited
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'analyst', // Default role
        company_id: '',
        email: ''
    });

    const fetchUsersAndCompanies = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersData, companiesData] = await Promise.all([
                apiGetAllUsers(),
                apiGetCompanies() // Fetch all companies for assignment dropdown
            ]);
            setUsers(usersData);
            setCompanies(companiesData);
        } catch (err) {
            console.error("Failed to fetch users or companies:", err);
            setError(err.message || "Failed to load data.");
        } finally {
            setLoading(false);
        }
    }, [apiGetAllUsers, apiGetCompanies]);

    useEffect(() => {
        fetchUsersAndCompanies();
    }, [fetchUsersAndCompanies]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await apiRegisterUser(formData);
            setShowAddModal(false);
            setFormData({ username: '', password: '', role: 'analyst', company_id: '', email: '' }); // Reset form
            fetchUsersAndCompanies(); // Refresh list
        } catch (err) {
            console.error("Failed to add user:", err);
            setError(err.message || "Failed to add user.");
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setError(null);
        if (!currentUser) return;
        try {
            // Only send fields that can be updated by admin, and hash password if provided
            const updateData = {
                username: formData.username,
                role: formData.role,
                email: formData.email,
                company_id: formData.role !== 'group_admin' ? (formData.company_id || null) : null // Set company_id to null for admin
            };
            // Only include password if it's explicitly set (i.e., not empty)
            if (formData.password) {
                updateData.password = formData.password; // Backend will hash this
            }

            await apiUpdateUser(currentUser.id, updateData);
            setShowEditModal(false);
            setCurrentUser(null);
            setFormData({ username: '', password: '', role: 'analyst', company_id: '', email: '' }); // Reset form
            fetchUsersAndCompanies(); // Refresh list
        } catch (err) {
            console.error("Failed to update user:", err);
            setError(err.message || "Failed to update user.");
        }
    };

    const confirmDeleteUser = (userId) => {
        setUserToDelete(userId);
        setShowConfirmDeleteModal(true);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setError(null);
        try {
            await apiDeleteUser(userToDelete);
            setShowConfirmDeleteModal(false);
            setUserToDelete(null);
            fetchUsersAndCompanies(); // Refresh list
        } catch (err) {
            console.error("Failed to delete user:", err);
            setError(err.message || "Failed to delete user.");
        }
    };

    const openEditModal = (user) => {
        setCurrentUser(user);
        setFormData({
            username: user.username,
            password: '', // Password is never pre-filled for security
            role: user.role,
            company_id: user.company_id || '',
            email: user.email || ''
        });
        setShowEditModal(true);
    };

    const closeModal = () => {
        setShowAddModal(false);
        setShowEditModal(false);
        setShowConfirmDeleteModal(false);
        setCurrentUser(null);
        setUserToDelete(null);
        setFormData({ username: '', password: '', role: 'analyst', company_id: '', email: '' });
        setError(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg p-6 font-inter text-gray-600">
                <FaSpinner className="animate-spin h-8 w-8 mr-3 text-blue-500" />
                Loading users...
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
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6 pb-2 border-b border-gray-200">User Management</h2>

            <button
                onClick={() => setShowAddModal(true)}
                className="mb-4 sm:mb-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors duration-200 shadow-md flex items-center text-sm"
            >
                <FaPlus className="mr-1 sm:mr-2 text-sm" /> Add New User
            </button>

            {users.length === 0 ? (
                <p className="text-gray-600 text-sm sm:text-base">No users found. Add a new user to get started.</p>
            ) : (
                <div className="overflow-x-auto rounded-lg shadow-md border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                        {user.company_id ? companies.find(c => c.id === user.company_id)?.name || 'N/A' : 'N/A'}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{user.email || 'N/A'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap text-left text-sm font-medium flex flex-col sm:flex-row gap-1 sm:gap-2">
                                        <button
                                            onClick={() => openEditModal(user)}
                                            className="text-blue-600 hover:text-blue-900 flex items-center py-1 px-2 rounded-md border border-blue-200 hover:border-blue-400 transition-colors"
                                            title="Edit User"
                                        >
                                            <FaEdit className="text-sm" />
                                            <span className="ml-1 text-xs hidden sm:inline">Edit</span>
                                        </button>
                                        <button
                                            onClick={() => confirmDeleteUser(user.id)}
                                            className="text-red-600 hover:text-red-900 flex items-center py-1 px-2 rounded-md border border-red-200 hover:border-red-400 transition-colors"
                                            title="Delete User"
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

            {/* Add User Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md">
                        <h3 className="text-lg sm:text-xl font-bold mb-4">Add New User</h3>
                        <form onSubmit={handleAddUser}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    id="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                                    Password
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    id="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                                    Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
                                    Role
                                </label>
                                <select
                                    name="role"
                                    id="role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    required
                                >
                                    {ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.role !== 'group_admin' && (
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="company_id">
                                        Assign Company (for CEO/Analyst)
                                    </label>
                                    <select
                                        name="company_id"
                                        id="company_id"
                                        value={formData.company_id}
                                        onChange={handleChange}
                                        className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    >
                                        <option value="">-- Select Company --</option>
                                        {companies.map(comp => (
                                            <option key={comp.id} value={comp.id}>{comp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                                    Add User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && currentUser && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-sm sm:max-w-md">
                        <h3 className="text-lg sm:text-xl font-bold mb-4">Edit User: {currentUser.username}</h3>
                        <form onSubmit={handleEditUser}>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-username">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    id="edit-username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-password">
                                    New Password (leave blank to keep current)
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    id="edit-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-email">
                                    Email (Optional)
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    id="edit-email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-role">
                                    Role
                                </label>
                                <select
                                    name="role"
                                    id="edit-role"
                                    value={formData.role}
                                    onChange={handleChange}
                                    className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    required
                                >
                                    {ROLES.map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
                            </div>
                            {formData.role !== 'group_admin' && (
                                <div className="mb-4">
                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-company_id">
                                        Assign Company (for CEO/Analyst)
                                    </label>
                                    <select
                                        name="company_id"
                                        id="edit-company_id"
                                        value={formData.company_id}
                                        onChange={handleChange}
                                        className="shadow border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline text-sm"
                                    >
                                        <option value="">-- Select Company --</option>
                                        {companies.map(comp => (
                                            <option key={comp.id} value={comp.id}>{comp.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
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
                                    Update User
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
                            Are you sure you want to delete this user? This action cannot be undone.
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
                                onClick={handleDeleteUser}
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
