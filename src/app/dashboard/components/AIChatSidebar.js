// src/app/dashboard/components/AIChatSidebar.js

'use client';
import { useState, useEffect, useRef } from 'react';
import { usePresentationStore } from '@/utils/store';
import { FiArrowUp, FiLoader } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

export const AIChatSidebar = () => {
  const [input, setInput] = useState('');
  const { sendCommand, addMessage, messages, isAssistantProcessing } = usePresentationStore();
  const messagesEndRef = useRef(null);
  
  // Automatically scroll down to the newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isAssistantProcessing) return;

    const userMessage = { role: 'user', content: input };
    addMessage(userMessage);
    const commandToRun = input;
    setInput('');

    // Route all AI tasks through the central command handler in the store
    await sendCommand({
        task: 'interpret_chat',
        command: commandToRun
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 space-y-4">
        <AnimatePresence>
            {messages.map((msg, index) => (
                <motion.div
                    key={index}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                    <div className={`max-w-xs lg:max-w-sm px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-peachSoft/80 text-black' : 'bg-white/10 text-gray-200'}`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                </motion.div>
            ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <div className="flex-shrink-0 pt-4 mt-2 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Change theme to cyberpunk"
            className="flex-1 p-2 bg-white/5 rounded-lg focus:outline-none focus:ring-1 focus:ring-peachSoft text-sm"
            disabled={isAssistantProcessing}
          />
          <button
            type="submit"
            className="p-2 bg-peachSoft text-black rounded-lg hover:brightness-110 disabled:bg-gray-500 disabled:opacity-70 transition-all"
            disabled={!input.trim() || isAssistantProcessing}
          >
            {isAssistantProcessing ? <FiLoader className="animate-spin" size={20} /> : <FiArrowUp size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};