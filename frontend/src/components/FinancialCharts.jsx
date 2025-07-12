import React, { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { apiGetCompanyMetrics } from '../api/api';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export default function FinancialCharts({ companyId, companyName }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setMetrics(null);
        setLoading(true);
        apiGetCompanyMetrics(companyId)
            .then(data => {
                setMetrics(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [companyId]);

    if (loading) return <div>Loading charts...</div>;
    if (!metrics) return <div>No data available.</div>;

    // Prepare data for charts
    const years = metrics.years;
    const revenue = metrics.revenue;
    const assets = metrics.assets;
    const liabilities = metrics.liabilities;

    const lineData = {
        labels: years,
        datasets: [
            {
                label: 'Revenue',
                data: revenue,
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.2)',
                tension: 0.2,
            },
        ],
    };

    const barData = {
        labels: years,
        datasets: [
            {
                label: 'Assets',
                data: assets,
                backgroundColor: 'rgba(16, 185, 129, 0.7)',
            },
            {
                label: 'Liabilities',
                data: liabilities,
                backgroundColor: 'rgba(239, 68, 68, 0.7)',
            },
        ],
    };

    return (
        <div>
            <h2 className="text-lg font-semibold mb-2">{companyName} - Financial Trends</h2>
            <div className="mb-6 bg-white p-4 rounded shadow">
                <Line data={lineData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>
            <div className="bg-white p-4 rounded shadow">
                <Bar data={barData} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
            </div>
        </div>
    );
}
