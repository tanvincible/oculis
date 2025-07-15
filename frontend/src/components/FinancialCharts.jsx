// frontend/src/components/FinancialCharts.js

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

// Register Chart.js components
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

// Helper function for currency formatting in tooltips
const formatCurrency = (value, currency = 'USD') => {
    if (value === null || value === undefined) return 'N/A';
    // Basic formatting, could be expanded for different locales/currencies
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0, // No decimals for large numbers
        maximumFractionDigits: 0,
    }).format(value);
};

export default function FinancialCharts({ companyId, companyName }) {
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State for chart type selection
    const [revenueNetIncomeChartType, setRevenueNetIncomeChartType] = useState('line');
    const [revenueGrowthChartType, setRevenueGrowthChartType] = useState('line');

    useEffect(() => {
        // Reset state when companyId changes
        setMetrics(null);
        setLoading(true);
        setError(null);
        // Reset chart types to default line when company changes
        setRevenueNetIncomeChartType('line');
        setRevenueGrowthChartType('line');

        if (!companyId) {
            setLoading(false);
            setError("No company selected.");
            return;
        }

        apiGetCompanyMetrics(companyId)
            .then(data => {
                console.log("Data received from /api/company_metrics:", data); // Keep this for debugging

                // Check if data is empty or invalid
                if (!data || !data.years || data.years.length === 0) {
                    setMetrics(null);
                    setError("No financial data available for this company.");
                } else {
                    setMetrics(data);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch company metrics:", err);
                setError(err.message || "Failed to load financial data.");
                setLoading(false);
            });
    }, [companyId]); // Re-run effect when companyId changes

    // --- Conditional Rendering for Loading/Error/No Data ---
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[420px] bg-white rounded-xl shadow-xl p-6 font-inter text-gray-600 border border-gray-100">
                <svg className="animate-spin h-8 w-8 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading financial data...
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl shadow-xl relative font-inter">
                <strong className="font-bold">Error:</strong>
                <span className="block sm:inline ml-2">{error}</span>
            </div>
        );
    }

    if (!metrics || metrics.years.length === 0) {
        return (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded-xl shadow-xl relative font-inter">
                <strong className="font-bold">Information:</strong>
                <span className="block sm:inline ml-2">No financial data available for this company. Please upload balance sheets.</span>
            </div>
        );
    }

    // --- Data Preparation for Charts ---
    const years = metrics.years;
    const revenue = metrics.revenue || [];
    const assets = metrics.assets || [];
    const liabilities = metrics.liabilities || [];
    const netIncome = metrics.netIncome || [];
    const companyCurrency = metrics.currency || 'USD'; // Get currency from backend response

    // Calculate Revenue Growth
    const revenueGrowth = years.map((_, index) => {
        if (index === 0 || revenue[index - 1] === null || revenue[index - 1] === 0) {
            return null; // Cannot calculate growth for the first year or if previous revenue is zero/null
        }
        const currentRevenue = revenue[index];
        const previousRevenue = revenue[index - 1];
        if (currentRevenue === null) return null; // If current revenue is null, growth is null

        return ((currentRevenue - previousRevenue) / previousRevenue) * 100; // Percentage growth
    });

    // --- Chart.js Data Objects ---

    // Line Chart for Revenue and Net Income Trends
    const revenueNetIncomeLineData = {
        labels: years,
        datasets: [
            {
                label: 'Revenue',
                data: revenue,
                borderColor: 'rgb(37, 99, 235)', // Blue
                backgroundColor: 'rgba(37, 99, 235, 0.5)',
                tension: 0.3, // Smooth curves
                pointBackgroundColor: 'rgb(37, 99, 235)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(37, 99, 235)',
                fill: false, // Don't fill area under the line
            },
            {
                label: 'Net Income',
                data: netIncome,
                borderColor: 'rgb(16, 185, 129)', // Green
                backgroundColor: 'rgba(16, 185, 129, 0.5)',
                tension: 0.3,
                pointBackgroundColor: 'rgb(16, 185, 129)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(16, 185, 129)',
                fill: false,
            },
        ],
    };

    // Line Chart for Revenue Growth Percentage
    const revenueGrowthLineData = {
        labels: years,
        datasets: [
            {
                label: 'Revenue Growth (%)',
                data: revenueGrowth,
                borderColor: 'rgb(234, 179, 8)', // Amber
                backgroundColor: 'rgba(234, 179, 8, 0.5)',
                tension: 0.3,
                pointBackgroundColor: 'rgb(234, 179, 8)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(234, 179, 8)',
                fill: false,
            },
        ],
    };

    // Bar Chart for Assets vs. Liabilities
    const assetsLiabilitiesBarData = {
        labels: years,
        datasets: [
            {
                label: 'Total Assets',
                data: assets,
                backgroundColor: 'rgba(59, 130, 246, 0.8)', // Lighter Blue
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1,
                borderRadius: 5, // Rounded bars
            },
            {
                label: 'Total Liabilities',
                data: liabilities,
                backgroundColor: 'rgba(244, 63, 94, 0.8)', // Red
                borderColor: 'rgba(244, 63, 94, 1)',
                borderWidth: 1,
                borderRadius: 5,
            },
        ],
    };

    // --- Chart.js Options ---
    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false, // Important for flexible sizing
        animation: {
            duration: 1000, // Animation duration in milliseconds
            easing: 'easeInOutQuart', // Easing function
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        family: 'Inter', // Use Inter font
                    },
                },
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        // Apply currency formatting for financial values, percentage for growth
                        if (context.dataset.label.includes('Growth')) {
                            return label + (context.parsed.y !== null ? context.parsed.y.toFixed(2) + '%' : 'N/A');
                        }
                        // Assuming all other values are currency
                        return label + formatCurrency(context.parsed.y, companyCurrency); // Use dynamic companyCurrency
                    }
                },
                titleFont: { family: 'Inter' },
                bodyFont: { family: 'Inter' },
                footerFont: { family: 'Inter' },
            },
            title: {
                display: true,
                font: {
                    size: 18,
                    family: 'Inter',
                    weight: 'bold',
                },
                color: '#333',
                padding: {
                    top: 10,
                    bottom: 10
                }
            }
        },
        scales: {
            x: {
                grid: {
                    display: false, // Hide x-axis grid lines
                },
                ticks: {
                    font: { family: 'Inter' },
                },
                title: {
                    display: true,
                    text: 'Year',
                    font: { family: 'Inter', weight: 'bold' },
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(200, 200, 200, 0.2)', // Lighter grid lines
                },
                ticks: {
                    font: { family: 'Inter' },
                    callback: function (value) {
                        // Format Y-axis labels for currency or percentage
                        if (this.getLabelForValue(value).includes('%')) { // Simple check for growth chart
                            return value + '%';
                        }
                        return formatCurrency(value, companyCurrency); // Use dynamic companyCurrency
                    }
                },
                title: {
                    display: true,
                    text: 'Value',
                    font: { family: 'Inter', weight: 'bold' },
                }
            },
        },
    };

    const revenueNetIncomeOptions = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            title: {
                ...commonOptions.plugins.title,
                text: `${companyName} - Revenue & Net Income Trend`
            }
        },
        scales: {
            ...commonOptions.scales,
            y: {
                ...commonOptions.scales.y,
                ticks: {
                    ...commonOptions.scales.y.ticks,
                    callback: function (value) {
                        return formatCurrency(value, companyCurrency);
                    }
                },
                title: {
                    ...commonOptions.scales.y.title,
                    text: 'Amount'
                }
            }
        }
    };

    const revenueGrowthOptions = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            title: {
                ...commonOptions.plugins.title,
                text: `${companyName} - Revenue Growth (%)`
            }
        },
        scales: {
            ...commonOptions.scales,
            y: {
                ...commonOptions.scales.y,
                ticks: {
                    ...commonOptions.scales.y.ticks,
                    callback: function (value) {
                        return value + '%';
                    }
                },
                title: {
                    ...commonOptions.scales.y.title,
                    text: 'Growth Percentage'
                }
            }
        }
    };

    const assetsLiabilitiesOptions = {
        ...commonOptions,
        plugins: {
            ...commonOptions.plugins,
            title: {
                ...commonOptions.plugins.title,
                text: `${companyName} - Assets vs. Liabilities`
            }
        },
        scales: {
            ...commonOptions.scales,
            y: {
                ...commonOptions.scales.y,
                ticks: {
                    ...commonOptions.scales.y.ticks,
                    callback: function (value) {
                        return formatCurrency(value, companyCurrency);
                    }
                },
                title: {
                    ...commonOptions.scales.y.title,
                    text: 'Amount'
                }
            }
        }
    };


    // Helper to render chart based on type
    const renderChart = (chartType, data, options) => {
        if (chartType === 'line') {
            return <Line data={data} options={options} />;
        } else if (chartType === 'bar') {
            return <Bar data={data} options={options} />;
        }
        return null;
    };

    return (
        <div className="flex flex-col h-full font-inter"> {/* Main container for charts */}
            <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                {companyName ? `${companyName} - Financial Overview` : 'Select a Company for Charts'}
            </h2>

            <div className="flex flex-col gap-8"> {/* Changed from grid to flex-col, adjusted gap */}
                {/* Revenue & Net Income Trend Chart */}
                <div className="bg-white rounded-xl shadow-xl p-6 h-[420px] flex flex-col justify-between border border-gray-100 w-full"> {/* ADDED w-full */}
                    <div className="flex justify-center mb-2"> {/* Chart type controls */}
                        <button
                            onClick={() => setRevenueNetIncomeChartType('line')}
                            className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors duration-200 ${revenueNetIncomeChartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Line
                        </button>
                        <button
                            onClick={() => setRevenueNetIncomeChartType('bar')}
                            className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors duration-200 ${revenueNetIncomeChartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Bar
                        </button>
                    </div>
                    <div className="flex-1 w-full"> {/* Chart container */}
                        {renderChart(revenueNetIncomeChartType, revenueNetIncomeLineData, revenueNetIncomeOptions)}
                    </div>
                </div>

                {/* Revenue Growth Chart */}
                <div className="bg-white rounded-xl shadow-xl p-6 h-[420px] flex flex-col justify-between border border-gray-100 w-full"> {/* ADDED w-full */}
                    <div className="flex justify-center mb-2"> {/* Chart type controls */}
                        <button
                            onClick={() => setRevenueGrowthChartType('line')}
                            className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors duration-200 ${revenueGrowthChartType === 'line' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Line
                        </button>
                        <button
                            onClick={() => setRevenueGrowthChartType('bar')}
                            className={`px-4 py-2 rounded-r-lg text-sm font-medium transition-colors duration-200 ${revenueGrowthChartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            Bar
                        </button>
                    </div>
                    <div className="flex-1 w-full"> {/* Chart container */}
                        {renderChart(revenueGrowthChartType, revenueGrowthLineData, revenueGrowthOptions)}
                    </div>
                </div>

                {/* Assets vs. Liabilities Bar Chart (no type change for this one) */}
                <div className="bg-white rounded-xl shadow-xl p-6 h-[420px] flex items-center justify-center border border-gray-100 w-full"> {/* ADDED w-full */}
                    <Bar data={assetsLiabilitiesBarData} options={assetsLiabilitiesOptions} />
                </div>
            </div>
        </div>
    );
}
