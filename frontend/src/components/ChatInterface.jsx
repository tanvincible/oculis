// frontend/src/components/ChatInterface.jsx

import React, { useState, useEffect, useRef } from 'react';
import { apiChatWithAI, apiUploadBalanceSheet } from '../api/api';
import { FaPaperPlane, FaFileUpload, FaSpinner, FaCheckCircle, FaTimesCircle, FaInfoCircle, FaTrashAlt } from 'react-icons/fa'; // Added FaTrashAlt for clear chat

export default function ChatInterface({ companyId, companyName }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);

    // State for file upload
    const [file, setFile] = useState(null);
    // Removed uploadYear state as it's no longer needed in frontend form
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [uploadSuccess, setUploadSuccess] = useState(false);

    // Scroll to the latest message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Clear messages and upload form when company changes
    useEffect(() => {
        setMessages([]);
        setFile(null);
        setUploadError(null);
        setUploadSuccess(false);
        // Optionally, clear backend memory if company changes, you'd need an api endpoint for this
        // apiClearChatMemory(companyId); // If you implement this, uncomment
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
            const errorMessage = err.message || "Failed to get response from AI. Please try again.";
            setError(errorMessage);
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'ai', text: `Oops! ${errorMessage}`, type: 'error' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        e.preventDefault();
        if (!file || !companyId || uploading) {
            if (!companyId) setUploadError("Please select a company first.");
            else if (!file) setUploadError("Please select a CSV or Excel file.");
            return;
        }

        setUploading(true);
        setUploadError(null);
        setUploadSuccess(false);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('company_id', companyId);
        // Removed appending 'year' as it's no longer needed from frontend

        try {
            const response = await apiUploadBalanceSheet(formData); // Capture response from API
            if (response.status === "success") {
                const yearsProcessed = Object.keys(response.processed_years).join(', ');
                setUploadSuccess(true);
                setFile(null); // Clear file input
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { sender: 'system', text: `Successfully uploaded and processed financial data for ${companyName || 'the company'} for years: ${yearsProcessed}. You can now ask questions about this data.`, type: 'success' }
                ]);
            } else {
                setUploadError(response.message || "Failed to process the uploaded file.");
                setMessages((prevMessages) => [
                    ...prevMessages,
                    { sender: 'system', text: `File upload failed: ${response.message || "Could not process file."}`, type: 'error' }
                ]);
            }
        } catch (err) {
            console.error("Error uploading file:", err);
            const errorMessage = err.message || "Failed to upload financial data.";
            setUploadError(errorMessage);
            setMessages((prevMessages) => [
                ...prevMessages,
                { sender: 'system', text: `File upload failed: ${errorMessage}`, type: 'error' }
            ]);
        } finally {
            setUploading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        // Call backend API to clear memory for this company_id if implemented
        // apiClearChatMemory(companyId);
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: 'system', text: 'Chat history cleared.', type: 'info' }
        ]);
    };

    // Helper for rendering messages based on sender
    const renderMessage = (msg, index) => {
        const isUser = msg.sender === 'user';
        const isAI = msg.sender === 'ai';
        const isSystem = msg.sender === 'system';
        const isError = msg.type === 'error'; // Added type check for error messages

        let bubbleClasses = 'max-w-[75%] p-3 rounded-xl shadow-sm text-base';
        let containerClasses = `flex mb-3 ${isUser ? 'justify-end' : 'justify-start'}`;

        if (isUser) {
            bubbleClasses += ' bg-blue-600 text-white rounded-br-none';
        } else if (isAI) {
            bubbleClasses += ` ${isError ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'} rounded-bl-none`;
        } else if (isSystem) {
            bubbleClasses += ` ${isError ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-800'} text-sm italic`;
            containerClasses += ' justify-center'; // Center system messages
        }

        return (
            <div key={index} className={containerClasses}>
                <div className={`${bubbleClasses} animate-fade-in`}>
                    {isError && (isAI || isSystem) && <FaTimesCircle className="inline-block mr-2 text-lg align-middle" />}
                    {isSystem && !isError && <FaInfoCircle className="inline-block mr-2 text-lg align-middle" />}
                    {msg.text}
                </div>
            </div>
        );
    };


    return (
        <div className="grid grid-rows-[auto_1fr_auto] h-full bg-white rounded-xl shadow-2xl p-6 border border-gray-100 font-sans">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4 pb-3 border-b border-gray-200 flex justify-between items-center">
                AI Financial Assistant: {companyName || 'Select Company'}
                {companyId && (
                    <button
                        onClick={handleClearChat}
                        className="text-sm text-gray-500 hover:text-red-600 transition-colors duration-200 flex items-center px-3 py-1 rounded-full border border-gray-300 hover:border-red-400"
                        title="Clear chat history for this company"
                    >
                        <FaTrashAlt className="mr-1" /> Clear Chat
                    </button>
                )}
            </h2>

            {/* File Upload Section */}
            <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow-inner border border-blue-100">
                <h3 className="text-xl font-semibold text-blue-800 mb-3 flex items-center">
                    <FaFileUpload className="mr-2 text-2xl" /> Upload Financial Data (CSV/Excel)
                </h3>
                <form onSubmit={handleFileUpload} className="flex flex-col md:flex-row items-stretch gap-4">
                    <label className="block w-full md:w-auto flex-1">
                        <span className="sr-only">Choose file</span>
                        <input
                            type="file"
                            accept=".csv,.xlsx"
                            onChange={(e) => setFile(e.target.files[0])}
                            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                                       file:rounded-full file:border-0 file:text-sm file:font-semibold
                                       file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200
                                       transition-colors duration-200 cursor-pointer"
                            required
                        />
                        {file && <p className="text-sm text-gray-600 mt-1">Selected: {file.name}</p>}
                    </label>

                    {/* Removed Year input as it's now inferred from the file on backend */}

                    <button
                        type="submit"
                        disabled={!file || uploading || !companyId} // Removed !uploadYear from disabled check
                        className={`w-full md:w-auto px-6 py-2 rounded-lg font-bold text-white transition-colors duration-200 flex items-center justify-center
                                    ${(!file || uploading || !companyId) ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md'}`}
                    >
                        {uploading ? (
                            <>
                                <FaSpinner className="animate-spin mr-2" /> Uploading...
                            </>
                        ) : (
                            <>
                                <FaFileUpload className="mr-2" /> Upload Data
                            </>
                        )}
                    </button>
                </form>
                {uploadError && <p className="text-red-600 text-sm mt-2 flex items-center"><FaTimesCircle className="mr-1" /> {uploadError}</p>}
                {uploadSuccess && <p className="text-green-600 text-sm mt-2 flex items-center"><FaCheckCircle className="mr-1" /> Upload successful!</p>}
                {!companyId && <p className="text-orange-600 text-sm mt-2 flex items-center"><FaInfoCircle className="mr-1" /> Please select a company first to enable file upload.</p>}
            </div>


            {/* Chat Messages Display */}
            <div className="flex-1 overflow-y-auto p-4 border border-gray-200 rounded-lg mb-4 bg-gray-50 shadow-inner custom-scrollbar">
                {messages.length === 0 && !loading ? (
                    <div className="text-center text-gray-500 mt-10 p-4 bg-gray-100 rounded-lg">
                        <FaInfoCircle className="inline-block text-4xl text-blue-400 mb-2" />
                        <p className="text-lg font-medium">
                            Start by asking a question about {companyName ? `${companyName}'s financials` : 'the selected company'}...
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            You can also upload new financial data using the section above.
                        </p>
                    </div>
                ) : (
                    messages.map(renderMessage)
                )}
                {loading && (
                    <div className="flex justify-start mb-3">
                        <div className="bg-gray-100 text-gray-800 p-3 rounded-xl rounded-bl-none shadow-sm text-base animate-pulse">
                            <span className="dot-pulse"></span>
                            <span className="dot-pulse delay-100"></span>
                            <span className="dot-pulse delay-200"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} /> {/* For auto-scrolling */}
            </div>

            {/* Chat Input */}
            <form onSubmit={handleSend} className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={companyId ? `Ask about ${companyName}'s financials...` : "Please select a company first..."}
                    className="flex-1 px-5 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base shadow-sm transition-all duration-200"
                    disabled={loading || !companyId}
                />
                <button
                    type="submit"
                    disabled={!input.trim() || loading || !companyId}
                    className={`px-5 py-3 rounded-full font-bold text-white transition-colors duration-200 flex items-center justify-center shadow-md
                                ${(!input.trim() || loading || !companyId) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'}`}
                >
                    {loading ? <FaSpinner className="animate-spin" /> : <FaPaperPlane />}
                </button>
            </form>
            {error && <p className="text-red-600 text-sm mt-2 flex items-center"><FaTimesCircle className="mr-1" /> {error}</p>}
            {!companyId && (
                <p className="text-orange-600 text-sm mt-2 flex items-center">
                    <FaInfoCircle className="mr-1" /> Please select a company from the sidebar to enable chat.
                </p>
            )}
        </div>
    );
}
