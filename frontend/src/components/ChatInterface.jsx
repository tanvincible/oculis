import React, { useState, useRef } from 'react';
import { apiChat } from '../api/api';

export default function ChatInterface({ companyId, companyName }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const sendMessage = async () => {
        if (!input.trim()) return;
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
            setMessages(msgs => [
                ...msgs,
                { sender: 'assistant', text: 'Error: ' + (err.message || 'Failed to get response.') }
            ]);
        } finally {
            setLoading(false);
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded shadow p-4">
            <h2 className="text-lg font-semibold mb-2">{companyName} - Analyst Chat</h2>
            <div className="flex-1 overflow-y-auto mb-2" style={{ minHeight: 200, maxHeight: 350 }}>
                {messages.map((msg, idx) => (
                    <div
                        key={idx}
                        className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
                    >
                        <span
                            className={`inline-block px-3 py-2 rounded ${msg.sender === 'user'
                                    ? 'bg-blue-500 text-white'
                                    : 'bg-gray-200 text-gray-800'
                                }`}
                        >
                            {msg.text}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="flex mt-2">
                <textarea
                    className="flex-1 border rounded p-2 mr-2 resize-none"
                    rows={2}
                    placeholder="Type your question..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />
                <button
                    onClick={sendMessage}
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    disabled={loading}
                >
                    {loading ? '...' : 'Send'}
                </button>
            </div>
        </div>
    );
}
