'use client';
import { useState } from 'react';

export const AIChatSidebar = () => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if(!input.trim()) return;
        setMessages(prev => [...prev, {role: 'user', content: input}]);
        setInput('');
        // Mock AI response
        setTimeout(() => setMessages(prev => [...prev, {role: 'ai', content: "Okay, I've updated that for you."}]), 1000);
    }

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-gray-200 flex-shrink-0">AI Assistant</h3>
            <div className="flex-grow bg-white/5 rounded-lg p-2 overflow-y-auto space-y-3">
                {messages.map((msg, i) => (
                    <div key={i} className={`text-sm p-2 rounded-lg ${msg.role === 'user' ? 'bg-blue-500/20 ml-auto' : 'bg-gray-600/30'}`}>{msg.content}</div>
                ))}
            </div>
            <form onSubmit={handleSubmit} className="mt-2 flex-shrink-0">
                <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="e.g., Make the title bolder" 
                    className="w-full bg-black/30 p-2 rounded-lg border-t border-white/10 focus:outline-none" 
                />
            </form>
        </div>
    );
}