// frontend/src/components/FinancialCharts.jsx

import React, { useState, useEffect, useCallback } from 'react';
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
            setMetrics(null); // Clear previous data on error
        } finally {
            setLoading(false);
        }
    }, [companyId]);

    useEffect(() => {
        fetchCompanyMetrics();
    }, [fetchCompanyMetrics]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 bg-white rounded-xl shadow-lg p-6 font-inter text-gray-600">
                <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading financial charts for {companyName || 'selected company'}...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-lg relative font-inter">
                <strong className="font-bold">Error loading charts:</strong>
                <span className="block sm:inline ml-2">{error}</span>
            </div>
        );
    }

    if (!metrics || metrics.years.length === 0) {
        return (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-xl shadow-lg relative font-inter">
                <strong className="font-bold">No financial data available</strong>
                <span className="block sm:inline ml-2">for {companyName}. Please upload financial data (CSV/Excel) for this company.</span>
            </div>
        );
    }

    // Helper to render a simple line chart (text-based for now)
    const renderSimpleChart = (title, data, unit) => {
        if (!data || data.every(val => val === null)) {
            return (
                <div className="bg-gray-50 p-4 rounded-lg text-gray-600 text-center">
                    No {title.toLowerCase()} data available.
                </div>
            );
        }
        return (
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-6">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">{title} ({metrics.currency})</h3>
                <div className="flex flex-wrap justify-center gap-4">
                    {metrics.years.map((year, index) => (
                        <div key={year} className="flex flex-col items-center p-3 border border-gray-200 rounded-lg shadow-sm bg-blue-50">
                            <span className="text-sm font-medium text-gray-500">{year}</span>
                            <span className="text-lg font-bold text-blue-700">
                                {data[index] !== null ? `${unit}${data[index].toLocaleString()}` : 'N/A'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-2 border-b border-gray-200">
                Financial Charts for {companyName}
            </h2>

            {renderSimpleChart("Revenue", metrics.revenue, metrics.currency === "INR" ? "₹" : "$")}
            {renderSimpleChart("Net Income", metrics.netIncome, metrics.currency === "INR" ? "₹" : "$")}
            {renderSimpleChart("Assets", metrics.assets, metrics.currency === "INR" ? "₹" : "$")}
            {renderSimpleChart("Liabilities", metrics.liabilities, metrics.currency === "INR" ? "₹" : "$")}
        </div>
    );
}
