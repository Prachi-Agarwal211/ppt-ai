'use client';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCpu, FiType, FiLink, FiUploadCloud, FiLoader, FiInbox } from 'react-icons/fi';
import mammoth from 'mammoth';
import { AnimatedCharacters } from './AnimatedCharacters';
import toast from 'react-hot-toast';
import { usePresentationStore } from '@/utils/store';

const HistoryItemSkeleton = () => (
    <div className="w-full p-3 rounded-lg bg-white/5 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/10 rounded w-1/2"></div>
    </div>
);

export const IdeaView = () => {
    const [inputMode, setInputMode] = useState('text');
    const [text, setText] = useState('');
    const [link, setLink] = useState('');
    const [file, setFile] = useState(null);
    const [slideCount, setSlideCount] = useState(7);
    const fileInputRef = useRef(null);
    
    // --- FIX: Select each piece of state individually to avoid the infinite loop error. ---
    const sendCommand = usePresentationStore(state => state.sendCommand);
    const isGenerating = usePresentationStore(state => state.isGenerating);
    const generationError = usePresentationStore(state => state.generationError);
    const presentationsHistory = usePresentationStore(state => state.presentationsHistory);
    const historyLoading = usePresentationStore(state => state.historyLoading);
    const loadPresentation = usePresentationStore(state => state.loadPresentation);
    const fetchHistory = usePresentationStore(state => state.fetchHistory);
    
    // Fetch history when this view is mounted
    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);
  
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isGenerating) return;
    
        let topic = '';
        let toastId;

        try {
            if (inputMode === 'text' && text.trim()) {
                topic = text;
            } else if (inputMode === 'link' && link.trim()) {
                topic = `A presentation based on the content at this link: ${link}`;
            } else if (inputMode === 'file' && file) {
                toastId = toast.loading('Reading file...');
                if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    topic = result.value;
                } else if (file.type.startsWith('text/')) {
                    topic = await file.text();
                } else {
                    throw new Error(`Unsupported file type: ${file.type}. Please use .docx, .txt, or .md files.`);
                }
                toast.success('File read successfully!', { id: toastId });
            }
            
            if (topic) {
                await sendCommand({
                    task: 'generate_presentation',
                    topic: topic,
                    slideCount: Number(slideCount) || 7
                });
            } else {
                toast.error("Please provide a topic, link, or file to get started.");
            }
        } catch (err) {
            if(toastId) toast.dismiss(toastId);
            toast.error(err.message || 'Could not process the provided input.');
        }
    };

    const handleSlideCountChange = (e) => {
        const value = e.target.value;
        const num = parseInt(value, 10);
        setSlideCount(isNaN(num) ? '' : num);
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
    };
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 h-screen w-full">
        {/* Left Column: Idea Generation Form */}
        <motion.div key="idea-form" initial={{opacity: 0, x: -50}} animate={{opacity: 1, x: 0}} transition={{duration: 0.5}} className="flex h-full flex-col items-center justify-center p-8 bg-black/10">
          <div className="w-full max-w-2xl">
            <AnimatedCharacters text="Let's Create Your Presentation" className="text-4xl font-bold bg-gradient-to-r from-pinkBlush via-peachSoft to-mauveLight bg-clip-text text-transparent mb-4" />
            <p className="text-gray-400 mb-6">Start with a topic, a link, or a document.</p>
            
            <div className="w-full bg-black/20 rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
              <div className="flex gap-2 mb-4 p-1 bg-black/20 rounded-full">
                {[{key: 'text', icon: FiType, label: 'From Text'}, {key: 'link', icon: FiLink, label: 'From Link'}, {key: 'file', icon: FiUploadCloud, label: 'From File'}].map(mode => (
                  <button key={mode.key} onClick={() => setInputMode(mode.key)} className={`flex-1 text-sm py-2 rounded-full flex items-center justify-center gap-2 transition-colors ${inputMode === mode.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                    <mode.icon /> {mode.label}
                  </button>
                ))}
              </div>
      
              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {inputMode === 'text' && ( <motion.textarea key="text" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} value={text} onChange={e => setText(e.target.value)} placeholder="e.g., A presentation on the history of space exploration..." rows="4" className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-peachSoft resize-none"></motion.textarea> )}
                  {inputMode === 'link' && ( <motion.input key="link" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://example.com/article" className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-peachSoft" /> )}
                  {inputMode === 'file' && ( <motion.div key="file" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}}> 
                    <label htmlFor="file-upload" className="w-full flex flex-col items-center justify-center bg-white/5 rounded-lg p-6 border-2 border-dashed border-white/20 cursor-pointer hover:bg-white/10"> 
                        {file ? <p className="text-peachSoft">{file.name}</p> : <><FiUploadCloud className="text-3xl mb-2" /><p>Click to upload (.docx, .txt, .md)</p></>} 
                    </label> 
                    <input id="file-upload" ref={fileInputRef} type="file" className="sr-only" accept=".docx,.txt,.md,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={handleFileChange} /> 
                  </motion.div> )}
                </AnimatePresence>
                <div className="mt-4">
                  <label htmlFor="slide-count" className="block text-sm font-medium text-gray-300 mb-2">Number of Slides</label>
                  <input type="number" id="slide-count" name="slide-count" value={slideCount} onChange={handleSlideCountChange} min="3" max="15" className="w-full bg-white/5 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-peachSoft"/>
                </div>
                <button type="submit" disabled={isGenerating} className="primary-button w-full justify-center mt-4"> 
                  {isGenerating ? <><FiLoader className="mr-2 animate-spin" /> Generating...</> : <><FiCpu className="mr-2" /> Generate Presentation</>} 
                </button>
                {generationError && <p className="text-red-400 text-sm text-center mt-2">{generationError}</p>}
              </form>
            </div>
          </div>
        </motion.div>

        {/* Right Column: History Panel */}
        <motion.div key="history-panel" initial={{opacity: 0, x: 50}} animate={{opacity: 1, x: 0}} transition={{duration: 0.5}} className="bg-black/30 border-l border-white/10 p-8 flex flex-col h-full">
            <h3 className="text-xl font-semibold mb-4 text-gray-200">History</h3>
            <div className="flex-grow overflow-y-auto pr-2 -mr-4 space-y-2">
                {historyLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <HistoryItemSkeleton key={i} />)
                ) : presentationsHistory.length > 0 ? (
                    presentationsHistory.map(item => (
                        <button key={item.id} onClick={() => loadPresentation(item.id)} className="w-full text-left p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                            <p className="font-semibold text-white truncate">{item.title}</p>
                            <p className="text-xs text-gray-400">{new Date(item.created_at).toLocaleDateString()}</p>
                        </button>
                    ))
                ) : (
                    <div className="text-center text-gray-500 mt-8 flex flex-col items-center p-4 h-full justify-center">
                        <FiInbox className="text-4xl mb-3" />
                        <h4 className="font-semibold text-gray-300">No History Yet</h4>
                        <p className="text-sm">Your past presentations will appear here.</p>
                    </div>
                )}
            </div>
        </motion.div>
      </div>
    );
};