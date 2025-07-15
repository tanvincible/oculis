// frontend/src/components/ChatInterface.js

import React, { useState, useRef, useEffect } from 'react';
import { apiChat } from '../api/api';

export default function ChatInterface({ companyId, companyName }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    // Effect to scroll to the bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Clear messages when company changes
    useEffect(() => {
        setMessages([]);
        setInput('');
        setLoading(false);
    }, [companyId]);

    const sendMessage = async () => {
        if (!input.trim()) return;

        // Frontend validation: Ensure a company is selected
        if (!companyId) {
            setMessages(msgs => [
                ...msgs,
                { sender: 'system', text: 'Error: Please select a company before chatting.' }
            ]);
            return;
        }

        const userMsg = { sender: 'user', text: input };
        setMessages(msgs => [...msgs, userMsg]);
        setInput(''); // Clear input immediately after sending
        setLoading(true);

        try {
            const response = await apiChat(input, companyId);
            setMessages(msgs => [
                ...msgs,
                { sender: 'assistant', text: response.answer }
            ]);
        } catch (err) {
            console.error("Chat API Error:", err); // Log the full error for debugging
            setMessages(msgs => [
                ...msgs,
                { sender: 'system', text: `Error: ${err.message || 'Failed to get response.'}` } // Use 'system' for errors
            ]);
        } finally {
            setLoading(false);
            // Scrolling is handled by the useEffect hook
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Prevent new line in textarea
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl shadow-lg p-6 font-inter"> {/* Added rounded-xl, shadow-lg, p-6, font-inter */}
            <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200"> {/* Enhanced heading */}
                {companyName ? `${companyName} - Analyst Chat` : 'Select a Company to Chat'}
            </h2>

            {/* Chat Messages Display Area */}
            <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar" style={{ minHeight: '250px', maxHeight: '400px' }}> {/* Adjusted min/max height, added custom-scrollbar */}
                {messages.length === 0 && !companyName && (
                    <div className="text-center text-gray-500 mt-10 p-4 bg-gray-50 rounded-lg">
                        <p className="text-lg">👋 Welcome! Select a company from the sidebar to begin your financial analysis chat.</p>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`flex mb-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[80%] px-4 py-2 rounded-lg shadow-md break-words ${msg.sender === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none' // User message styling
                                : msg.sender === 'assistant' ? 'bg-gray-100 text-gray-800 rounded-bl-none' // AI message styling
                                    : 'bg-red-100 text-red-700 border border-red-300' // System error styling
                                }`}
                        >
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="flex mt-4 pt-4 border-t border-gray-200">
                <textarea
                    className="flex-1 border border-gray-300 rounded-lg p-3 mr-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ease-in-out text-gray-800" // ADDED text-gray-800 here
                    rows={2}
                    placeholder={companyId ? "Type your question here..." : "Please select a company first to enable chat..."}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading || !companyId}
                />
                <button
                    onClick={sendMessage}
                    className={`px-6 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out transform hover:scale-105
                                ${loading || !companyId
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2' // Enhanced button styling
                        }`}
                    disabled={loading || !companyId}
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        'Send'
                    )}
                </button>
            </div>
        </div>
    );
}
