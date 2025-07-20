// frontend/src/api/api.js

const API_BASE_URL = 'https://oculis-morning-sea-5448.fly.dev/api';

// Helper function to get the token
const getToken = () => localStorage.getItem('token');

// Helper for authenticated fetch requests
const authenticatedFetch = async (url, options = {}) => {
    const token = getToken();
    const headers = {
        // 'Content-Type': 'application/json', // This should be set conditionally or not at all for FormData
        ...options.headers,
    };

    // If the request body is FormData, let the browser set the Content-Type
    // Otherwise, default to application/json for JSON bodies
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }


    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (response.status === 401) {
        // If unauthorized, clear token and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login'; // Redirect to login page
        throw new Error('Unauthorized: Session expired or invalid token.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorData.msg || errorData.error || 'Something went wrong');
    }

    return response.json();
};

// --- Authentication Endpoints ---

export const apiLogin = async (username, password) => {
    const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.msg || 'Login failed');
    }
    return response.json();
};

export const apiLogout = async () => {
    // For logout, we still send the token to allow backend to blacklist if implemented
    return authenticatedFetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
    });
};

export const apiGetCurrentUser = async (token = null) => {
    // This function can be called with an explicit token (e.g., from AuthContext loading)
    // or it will pick it up from localStorage via authenticatedFetch
    const headers = {};
    if (token) { // If a token is explicitly passed (e.g., during initial loadUser)
        headers['Authorization'] = `Bearer ${token}`;
    }
    return authenticatedFetch(`${API_BASE_URL}/current_user`, {
        method: 'GET',
        headers: headers // Pass headers here
    });
};

// --- User Management Endpoints (Admin Only) ---
export const apiRegisterUser = (userData) => authenticatedFetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    body: JSON.stringify(userData),
});

export const apiGetAllUsers = () => authenticatedFetch(`${API_BASE_URL}/users`);
export const apiGetUserById = (userId) => authenticatedFetch(`${API_BASE_URL}/users/${userId}`);
export const apiUpdateUser = (userId, userData) => authenticatedFetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData),
});
export const apiDeleteUser = (userId) => authenticatedFetch(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
});

// --- Company Management Endpoints ---
export const apiAddCompany = (companyData) => authenticatedFetch(`${API_BASE_URL}/companies`, {
    method: 'POST',
    body: JSON.stringify(companyData),
});

export const apiGetCompanies = () => authenticatedFetch(`${API_BASE_URL}/companies`);
export const apiGetCompanyById = (companyId) => authenticatedFetch(`${API_BASE_URL}/companies/${companyId}`);
export const apiUpdateCompany = (companyId, companyData) => authenticatedFetch(`${API_BASE_URL}/companies/${companyId}`, {
    method: 'PUT',
    body: JSON.stringify(companyData),
});
export const apiDeleteCompany = (companyId) => authenticatedFetch(`${API_BASE_URL}/companies/${companyId}`, {
    method: 'DELETE',
});

// --- Balance Sheet Endpoints ---
export const apiUploadBalanceSheet = (formData) => authenticatedFetch(`${API_BASE_URL}/balance_sheets`, {
    method: 'POST',
    body: formData, // FormData doesn't need Content-Type header, browser sets it
    headers: {
        // Ensure NO 'Content-Type' header is set here for FormData.
        // The conditional logic in authenticatedFetch should handle it.
    }
});

export const apiDeleteBalanceSheet = (companyId, year) => authenticatedFetch(`${API_BASE_URL}/balance_sheets/${companyId}/${year}`, {
    method: 'DELETE',
});

export const apiGetCompanyMetrics = (companyId) => authenticatedFetch(`${API_BASE_URL}/company_metrics/${companyId}`);

// --- Chat Endpoint ---
export const apiChatWithAI = (query, companyId) => authenticatedFetch(`${API_BASE_URL}/chat`, {
    method: 'POST',
    body: JSON.stringify({ query, company_id: companyId }),
});
