import React, { useState, useRef, useEffect } from 'react';
import { apiChat } from '../api/api';

export default function ChatInterface({ companyId, companyName }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        setMessages([]);
        setInput('');
        setLoading(false);
    }, [companyId]);

    const sendMessage = async () => {
        if (!input.trim() || !companyId) return;

        const userMsg = { sender: 'user', text: input };
        setMessages(msgs => [...msgs, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const response = await apiChat(input, companyId);
            setMessages(msgs => [
                ...msgs,
                { sender: 'assistant', text: response.answer }
            ]);
        } catch (err) {
            console.error("Chat API Error:", err);
            setMessages(msgs => [
                ...msgs,
                { sender: 'system', text: `Error: ${err.message || 'Failed to get response.'}` }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-280px bg-gradient-to-b from-white to-gray-50 rounded-2xl shadow-2xl p-6 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-3 border-b border-gray-300 flex items-center gap-2">
                {companyName ? `${companyName} - Analyst Chat` : 'Select a Company to Chat'}
            </h2>

            <div className="flex-1 overflow-y-auto mb-4 pr-2 space-y-4 custom-scrollbar" style={{ minHeight: '250px', maxHeight: '450px' }}>
                {messages.length === 0 && (
                    <div className="text-center text-gray-500 mt-10 p-5 bg-gray-100 rounded-lg text-lg">
                        👋 Start by asking a question about {companyName || 'the selected company'}'s financial data.
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-5 py-3 rounded-2xl max-w-[80%] shadow ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : msg.sender === 'assistant' ? 'bg-gray-200 text-gray-800 rounded-bl-none' : 'bg-red-100 text-red-700 border border-red-300'}`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="flex mt-4 pt-4 border-t border-gray-200">
                <textarea
                    className="flex-1 border border-gray-300 rounded-xl p-4 mr-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-800 shadow-sm transition"
                    rows={2}
                    placeholder={companyId ? "Ask about financial metrics..." : "Please select a company..."}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading || !companyId}
                />
                <button
                    onClick={sendMessage}
                    disabled={loading || !companyId}
                    className={`px-6 py-3 rounded-xl font-semibold text-white transition transform hover:scale-105 ${loading || !companyId ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'}`}
                >
                    {loading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : 'Send'}
                </button>
            </div>
        </div>
    );
}
