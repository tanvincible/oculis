import React, { useState } from 'react';
import { FaFileUpload, FaCheckCircle, FaTimesCircle, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import { apiUploadBalanceSheet } from '../api/api';

export default function BalanceSheetUploader({ companyId, companyName }) {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('');
    const [error, setError] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file || !companyId) {
            setError('Please select a company and a file.');
            return;
        }

        setUploading(true);
        setError(null);
        setSuccess(false);
        setStatus('Processing...');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('company_id', companyId);

        try {
            const response = await apiUploadBalanceSheet(formData);

            if (response.status === "success") {
                setStatus(`Uploaded and processed financial data for ${companyName}.`);
                console.log(`✅ Upload successful: ${response.message || ''}`);
                setSuccess(true);
                setFile(null);
            } else {
                console.error(`❌ Upload failed: ${response.message || 'Unknown error'}`);
                throw new Error(response.message || 'Upload failed.');
            }
        } catch (err) {
            console.error(`❌ Upload error: ${err.message}`);
            setError(err.message || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl shadow-2xl border border-blue-200 mb-6 font-sans">
            <h2 className="text-2xl font-bold text-blue-900 mb-4 flex items-center">
                <FaFileUpload className="mr-3 text-3xl" /> Upload Balance Sheet
            </h2>

            <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row gap-4 items-stretch">
                <label className="flex-1 w-full">
                    <input
                        type="file"
                        accept=".csv,.xlsx"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="block w-full file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0
                                    file:bg-indigo-100 file:text-indigo-800 file:font-bold hover:file:bg-indigo-200
                                    text-sm text-gray-700 transition duration-200"
                    />
                    {file && <p className="text-sm text-gray-600 mt-1">Selected: {file.name}</p>}
                </label>

                <button
                    type="submit"
                    disabled={!file || uploading || !companyId}
                    className={`w-full md:w-auto flex items-center justify-center gap-2 font-bold text-white px-6 py-3 rounded-lg transition
                        ${(!file || uploading || !companyId)
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-md'}`}
                >
                    {uploading ? (
                        <>
                            <FaSpinner className="animate-spin" /> Uploading...
                        </>
                    ) : (
                        <>
                            <FaFileUpload /> Upload
                        </>
                    )}
                </button>
            </form>

            {status && success && (
                <div className="flex items-center text-green-700 mt-4 text-sm font-medium">
                    <FaCheckCircle className="mr-2" /> {status}
                </div>
            )}
            {error && (
                <div className="flex items-center text-red-700 mt-4 text-sm font-medium">
                    <FaTimesCircle className="mr-2" /> {error}
                </div>
            )}
            {!companyId && (
                <div className="flex items-center text-orange-600 mt-4 text-sm">
                    <FaInfoCircle className="mr-2" /> Select a company before uploading data.
                </div>
            )}
        </div>
    );
}
