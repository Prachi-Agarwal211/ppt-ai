'use client';
import { useState, useRef, useEffect } from 'react';
import { FiLoader, FiSend } from 'react-icons/fi';
import { usePresentationStore } from '../../../utils/store';

export const AIChatSidebar = () => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const { messages, sendCommand, addMessage, isAssistantProcessing } = usePresentationStore();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isAssistantProcessing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isAssistantProcessing) return;
        
        // The `command` object sent from the chat always has the task 'interpret_chat'.
        // The backend AI will then decide the *actual* task (e.g., 'generate_diagram').
        const command = { task: 'interpret_chat', command: input };
        addMessage({ role: 'user', content: input });
        setInput('');
        
        await sendCommand(command);
    };

    return (
        <div className="h-full flex flex-col">
            <h3 className="text-xl font-semibold mb-4 text-gray-200 flex-shrink-0">AI Assistant</h3>
            <div className="flex-grow bg-white/5 rounded-lg p-3 overflow-y-auto space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-gray-600 ${msg.role === 'user' ? 'rounded-s-xl rounded-ee-xl bg-blue-500/30' : 'rounded-e-xl rounded-es-xl bg-gray-600/40'}`}>
                           <p className="text-sm font-normal text-white">{msg.content}</p>
                       </div>
                    </div>
                ))}
                {isAssistantProcessing && (
                     <div className="flex items-start gap-2.5 justify-start">
                         <div className="flex flex-col w-full max-w-[320px] leading-1.5 p-3 border-gray-600 rounded-e-xl rounded-es-xl bg-gray-600/40">
                             <div className="flex items-center space-x-2">
                                 <FiLoader className="animate-spin text-white"/>
                                 <span className="text-sm font-normal text-gray-300">Thinking...</span>
                             </div>
                         </div>
                     </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="mt-4 flex-shrink-0 flex items-center gap-2">
                <input 
                    type="text" 
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Ask for a diagram, theme, etc." 
                    disabled={isAssistantProcessing}
                    className="w-full bg-black/30 p-3 rounded-lg border border-white/10 focus:outline-none focus:ring-1 focus:ring-peachSoft disabled:opacity-50" 
                />
                <button type="submit" disabled={isAssistantProcessing || !input.trim()} className="primary-button p-3 disabled:opacity-50">
                    <FiSend size={20} />
                </button>
            </form>
        </div>
    );
}