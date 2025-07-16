import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { apiGetCompanyMetrics } from '../api/api';

export default function FinancialCharts({ companyId, companyName }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCompanyMetrics = useCallback(async () => {
        if (!companyId) {
            setMetrics(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await apiGetCompanyMetrics(companyId);
            setMetrics(data);
        } catch (err) {
            console.error("Failed to fetch company metrics:", err);
            setError(err.message || "Failed to load financial data for charts.");
            setMetrics(null);
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        fetchCompanyMetrics();
    }, [fetchCompanyMetrics]);

    if (loading) return <div className="p-6 text-gray-800">Loading financial charts for {companyName}...</div>;
    if (error) return <div className="p-6 text-red-600">Error loading charts: {error}</div>;
    if (!metrics || metrics.years.length === 0) return <div className="p-6 text-gray-600">No financial data available for {companyName}</div>;

    const { years, revenue, netIncome, assets, liabilities, currency } = metrics;
    const unit = currency === 'INR' ? '₹' : '$';

    const chartData = years.map((year, idx) => ({
        year,
        Revenue: revenue[idx],
        NetIncome: netIncome[idx],
        Assets: assets[idx],
        Liabilities: liabilities[idx],
    })).reverse();

    const renderLineChart = (title, dataKey, color) => (
        <div className="mb-8 p-6 bg-white rounded-2xl shadow-xl border border-gray-300">
            <h3 className="text-2xl font-bold text-gray-900 mb-5">{title} ({unit})</h3>
            <ResponsiveContainer width="100%" height={320}>
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="year" stroke="#6b7280" />
                    <YAxis stroke="#6b7280" />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}
                        formatter={(val) => `${unit}${val?.toLocaleString()}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">
                Financial Charts for {companyName}
            </h2>
            {renderLineChart('Revenue', 'Revenue', '#3b82f6')}
            {renderLineChart('Net Income', 'NetIncome', '#10b981')}
            {renderLineChart('Assets', 'Assets', '#f59e0b')}
            {renderLineChart('Liabilities', 'Liabilities', '#ef4444')}
        </div>
    );
}
