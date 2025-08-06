'use client';
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCpu, FiType, FiLink, FiUploadCloud, FiLoader } from 'react-icons/fi';
import mammoth from 'mammoth';
import { AnimatedCharacters } from './AnimatedCharacters';
import toast from 'react-hot-toast';
import { usePresentationStore } from '@/utils/store';

export const IdeaView = ({ onPresentationStarted }) => {
    const [inputMode, setInputMode] = useState('text');
    const [text, setText] = useState('');
    const [link, setLink] = useState('');
    const [file, setFile] = useState(null);
    const [slideCount, setSlideCount] = useState(7);
    const fileInputRef = useRef(null);
    const { sendCommand, isGenerating, generationError } = usePresentationStore();
  
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

                // Check for .docx file type
                if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
                    const arrayBuffer = await file.arrayBuffer();
                    const result = await mammoth.extractRawText({ arrayBuffer });
                    topic = result.value;
                } 
                // Check for plain text file types
                else if (file.type.startsWith('text/')) {
                    topic = await file.text();
                } 
                // Handle unsupported file types
                else {
                    throw new Error(`Unsupported file type: ${file.type}. Please use .docx, .txt, or .md files.`);
                }
                toast.success('File read successfully!', { id: toastId });
            }
            
            if (topic) {
                const finalSlideCount = Number(slideCount) || 7;
                const success = await sendCommand({
                    task: 'generate_presentation',
                    topic: topic,
                    slideCount: finalSlideCount
                });
                if (success) {
                    onPresentationStarted();
                }
            } else {
                toast.error("Please provide a topic, link, or file to get started.");
            }
        } catch (err) {
            console.error('Error processing input:', err);
            // Dismiss loading toast if it exists, and show error
            if(toastId) toast.dismiss(toastId);
            toast.error(err.message || 'Could not process the provided input.');
        }
    };

    const handleSlideCountChange = (e) => {
        const value = e.target.value;
        if (value === '') {
            setSlideCount('');
            return;
        }
        const num = parseInt(value, 10);
        if (!isNaN(num)) {
            setSlideCount(num);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };
  
    return (
      <motion.div key="idea" initial={{opacity: 0, y: 20}} animate={{opacity: 1, y: 0}} exit={{opacity: 0, y: -20}} className="flex h-full flex-col items-center justify-center">
        <AnimatedCharacters text="Let's Create Your Presentation" className="text-4xl font-bold bg-gradient-to-r from-pinkBlush via-peachSoft to-mauveLight bg-clip-text text-transparent mb-4" />
        <p className="text-gray-400 mb-6">Start with a topic, a link, or a document.</p>
        
        <div className="w-full max-w-2xl bg-black/20 rounded-2xl border border-white/10 p-6 backdrop-blur-sm">
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
      </motion.div>
    );
};