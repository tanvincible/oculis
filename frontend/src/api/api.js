const API_BASE = 'http://localhost:5000/api';

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

export async function apiLogin(username, password) {
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
    });
    if (!res.ok) throw new Error('Invalid credentials');
    // Optionally fetch user info after login
    const userRes = await fetch(`${API_BASE}/me`, {
        credentials: 'include',
    });
    if (!userRes.ok) throw new Error('Failed to fetch user info');
    return await userRes.json();
}

export async function apiLogout() {
    await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        credentials: 'include',
    });
}

export async function apiGetCompanies() {
    const res = await fetch(`${API_BASE}/companies`, {
        credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch companies');
    return await res.json();
}

export async function apiGetCompanyMetrics(companyId) {
    const res = await fetch(`${API_BASE}/company_metrics/${companyId}`, {
        credentials: 'include',
    });
    if (!res.ok) throw new Error('Failed to fetch company metrics');
    return await res.json();
}

export async function apiChat(query, companyId) {
    const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query, company_id: companyId }),
    });
    if (!res.ok) throw new Error('Chat failed');
    return await res.json();
}
