// frontend/src/components/ChatInterface.jsx

import React, { useState, useEffect, useRef } from 'react';
import { apiChatWithAI, apiUploadBalanceSheet } from '../api/api';

export default function ChatInterface({ companyId, companyName }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    // State for file upload
    const [file, setFile] = useState(null);
    const [uploadYear, setUploadYear] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Scroll to the latest message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Clear messages and upload form when company changes
    useEffect(() => {
        setMessages([]);
        setFile(null);
        setUploadYear('');
        setUploadError(null);
        setUploadSuccess(false);
    }, [companyId]);


    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading || !companyId) return;

        const userMessage = { sender: 'user', text: input };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setInput('');
        setLoading(true);
        setError(null);

        try {
            const response = await apiChatWithAI(input, companyId);
            const aiMessage = { sender: 'ai', text: response.response };
            setMessages((prevMessages) => [...prevMessages, aiMessage]);
        } catch (err) {
            console.error("Error communicating with AI:", err);
            setError(err.message || "Failed to get response from AI.");
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'ai', text: `Error: ${err.message || "Could not get a response."}` }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file || !uploadYear || !companyId || uploading) {
            // Add more specific feedback if button is clicked while disabled
            if (!companyId) setUploadError("Please select a company first.");
            else if (!file) setUploadError("Please select a PDF file.");
            else if (!uploadYear) setUploadError("Please enter a year for the balance sheet.");
            return;
        }

        setUploading(true);
        setUploadError(null);
        setUploadSuccess(false);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('company_id', companyId);
        formData.append('year', uploadYear);

        try {
            await apiUploadBalanceSheet(formData);
            setUploadSuccess(true);
            setFile(null); // Clear file input
            setUploadYear(''); // Clear year input
            // Optionally, add a success message to chat or a toast
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'system', text: `Successfully uploaded and processed balance sheet for ${companyName} (${uploadYear}). You can now ask questions about this data.` }
            ]);
        } catch (err) {
            console.error("Error uploading file:", err);
            setUploadError(err.message || "Failed to upload balance sheet.");
        } finally {
            setUploading(false);
        }
    };


    return (
        <div className="flex flex-col h-[600px] bg-white rounded-xl shadow-xl p-6 border border-gray-100 font-inter">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                Chat with AI about {companyName || 'the selected company'}
            </h2>

            {/* File Upload Section */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Upload Balance Sheet (PDF)</h3>
                <form onSubmit={handleFileUpload} className="flex flex-col sm:flex-row items-center gap-4">
                    <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setFile(e.target.files[0])}
                        className="block w-full sm:w-auto text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                                   file:rounded-full file:border-0 file:text-sm file:font-semibold
                                   file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        required
                    />
                    <input
                        type="number"
                        placeholder="Year (e.g., 2023)"
                        value={uploadYear}
                        onChange={(e) => setUploadYear(e.target.value)}
                        className="w-full sm:w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        min="1900" max="2100"
                        required
                    />
                    <button
                        type="submit"
                        disabled={!file || !uploadYear || uploading || !companyId}
                        className={`w-full sm:w-auto px-6 py-2 rounded-lg font-semibold text-white transition-colors duration-200
                                    ${(!file || !uploadYear || uploading || !companyId) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'}`}
                    >
                        {uploading ? 'Uploading...' : 'Upload PDF'}
                    </button>
                </form>
                {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
                {uploadSuccess && <p className="text-green-600 text-sm mt-2">Upload successful!</p>}
                {!companyId && <p className="text-yellow-600 text-sm mt-2">Please select a company to upload balance sheets.</p>}
            </div>


            {/* Chat Messages Display */}
            <div className="flex-1 overflow-y-auto p-4 border border-gray-200 rounded-lg mb-4 bg-gray-50 custom-scrollbar">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">
                        Start by asking a question about {companyName || 'the selected company'}...
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex mb-4 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'
                                }`}
                        >
                            <div
                                className={`max-w-[70%] p-3 rounded-xl shadow-sm ${msg.sender === 'user'
                                        ? 'bg-blue-500 text-white rounded-br-none'
                                        : 'bg-gray-200 text-gray-800 rounded-bl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} /> {/* For auto-scrolling */}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="flex items-center">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={companyId ? `Ask about ${companyName}'s financials...` : "Please select a company first..."}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading || !companyId}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || loading || !companyId}
                    className={`px-6 py-2 rounded-r-lg font-semibold text-white transition-colors duration-200 ${(!input.trim() || loading || !companyId) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md'
                        }`}
                >
                    {loading ? 'Sending...' : 'Send'}
                </button>
            </form>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {!companyId && (
                <p className="text-yellow-600 text-sm mt-2">
                    Please select a company from the sidebar to enable chat.
                </p>
            )}
        </div>
    );
}
