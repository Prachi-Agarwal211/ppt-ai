'use client'; 
import { motion } from 'framer-motion';
import { usePresentationStore, getElement } from '@/utils/store';
import { Toolbox } from '@/app/dashboard/components/Toolbox';
import { FiEdit2, FiLayout } from 'react-icons/fi';
import { useMemo, useCallback, useEffect, useRef } from 'react';

const useDebouncedSave = (slide, updateSlideInDB) => {
    const timeoutRef = useRef(null);
    const debouncedSave = useCallback((slideData) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            if (slide && !(typeof slide.id === 'string' && slide.id.startsWith('new-'))) {
                updateSlideInDB(slide.id, slideData);
            }
        }, 1500);
    }, [slide, updateSlideInDB]);
    useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }, []);
    return debouncedSave;
};

export const OutlineView = ({ setView }) => {
    // --- FIX: Selecting state individually to prevent re-render loops. ---
    const slides = usePresentationStore(state => state.slides);
    const activeSlideId = usePresentationStore(state => state.activeSlideId);
    const updateElementContent = usePresentationStore(state => state.updateElementContent);
    const updateSlideNotes = usePresentationStore(state => state.updateSlideNotes);
    const updateSlideInDB = usePresentationStore(state => state.updateSlideInDB);

    const slide = useMemo(() => slides.find(s => s.id === activeSlideId), [slides, activeSlideId]);
    const titleElement = useMemo(() => getElement(slide, 'title'), [slide]);
    const contentElement = useMemo(() => getElement(slide, 'content'), [slide]);
    const debouncedSave = useDebouncedSave(slide, updateSlideInDB);

    if (!slide) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                <FiEdit2 className="mb-4 text-4xl" />
                <h3 className="text-xl font-semibold text-gray-300">Select a Slide to Edit</h3>
                <p>Choose a slide from the left to review and enhance the AI's plan.</p>
            </div>
        );
    }
    
    const handleContentChange = (newContent, type) => {
        let slideDataToSave = {};
        if (type === 'title') {
            updateElementContent(slide.id, titleElement.id, newContent);
            slideDataToSave = { elements: slide.elements.map(el => el.id === titleElement.id ? { ...el, content: newContent } : el) };
        } else if (type === 'points') {
            const pointsArray = newContent === '' ? [] : newContent.split('\n');
            updateElementContent(slide.id, contentElement.id, pointsArray);
            slideDataToSave = { elements: slide.elements.map(el => el.id === contentElement.id ? { ...el, content: pointsArray } : el) };
        } else if (type === 'notes') {
            updateSlideNotes(slide.id, newContent);
            slideDataToSave = { notes: newContent };
        }
        debouncedSave(slideDataToSave);
    };
    
    const pointsAsText = Array.isArray(contentElement.content) ? contentElement.content.join('\n') : '';

    return (
        <motion.div key="outline" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="h-full flex flex-col">
            <div className="flex-grow overflow-y-auto pr-4 space-y-6">
                <div>
                    <label className="text-sm font-medium text-gray-300">Title</label>
                    <input type="text" value={titleElement.content} onChange={(e) => handleContentChange(e.target.value, 'title')} className="mt-1 block w-full text-2xl font-bold rounded-lg border border-transparent bg-transparent px-2 py-1 text-white focus:outline-none focus:border-white/20 focus:bg-white/5" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-300">Content (one bullet point per line)</label>
                    <textarea value={pointsAsText} onChange={(e) => handleContentChange(e.target.value, 'points')} rows={8} className="mt-1 block w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-white resize-none focus:outline-none focus:border-white/20 focus:bg-white/5" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-300">Speaker Notes</label>
                    <textarea value={slide.notes || ''} onChange={(e) => handleContentChange(e.target.value, 'notes')} rows={4} className="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-white resize-none" />
                </div>
            </div>
            <div className="flex-shrink-0 mt-4 space-y-4">
                <Toolbox />
                <motion.button onClick={() => setView('deck')} className="primary-button w-full justify-center">
                    <FiLayout className="mr-2" /> Finalize & View Deck
                </motion.button>
            </div>
        </motion.div>
    );
};