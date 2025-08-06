import { motion } from 'framer-motion';
import { usePresentationStore, getElement } from '../../../utils/store';
import { Toolbox } from './Toolbox';
import { FiLayout, FiEdit2 } from 'react-icons/fi';
import { useEffect, useState, useRef, useMemo } from 'react';

// Debounced save hook to prevent saving on every keystroke
const useDebouncedSave = (slide) => {
    const { updateSlideInDB } = usePresentationStore();
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        // Do not save if the slide is new or not ready
        if (!slide || (typeof slide.id === 'string' && slide.id.startsWith('new-'))) return;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            // We only save the elements and notes, as these are the only fields editable here
            await updateSlideInDB(slide.id, { elements: slide.elements, notes: slide.notes });
            setIsSaving(false);
        }, 1500); // 1.5-second delay

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [slide?.elements, slide?.notes, slide?.id, updateSlideInDB]); // Re-run only when these change

    return isSaving;
};

export const OutlineView = ({ onProceed }) => {
    const slides = usePresentationStore(state => state.slides);
    const activeSlideId = usePresentationStore(state => state.activeSlideId);
    const updateElementContent = usePresentationStore(state => state.updateElementContent);
    const updateSlideNotes = usePresentationStore(state => state.updateSlideNotes);

    const slide = useMemo(() => slides.find(s => s.id === activeSlideId), [slides, activeSlideId]);
    const isSaving = useDebouncedSave(slide);

    const titleElement = useMemo(() => getElement(slide, 'title'), [slide]);
    const contentElement = useMemo(() => getElement(slide, 'content'), [slide]);
    
    // Show a helpful message if no slide is selected or if the slide data is malformed
    if (!slide || !titleElement || !contentElement) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                <FiEdit2 className="mb-4 text-4xl" />
                <h3 className="text-xl font-semibold text-gray-300">Select a Slide to Edit</h3>
                <p>Choose a slide from the outline on the left to start editing its content.</p>
            </div>
        );
    }

    const handlePointsChange = (e) => {
        const value = e.target.value;
        const pointsArray = value === '' ? [] : value.split('\n');
        updateElementContent(slide.id, contentElement.id, pointsArray);
    };
    
    const handleTitleChange = (e) => {
        updateElementContent(slide.id, titleElement.id, e.target.value);
    };

    const pointsAsText = Array.isArray(contentElement.content) ? contentElement.content.join('\n') : '';

    return (
        <motion.div key="outline" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="h-full flex flex-col">
            <div className="flex-grow overflow-y-auto pr-4 space-y-6">
                <div>
                    <label className="text-sm font-medium text-gray-300 flex items-center">
                        Title
                        {isSaving && <span className="ml-2 text-xs text-gray-400 animate-pulse">Saving...</span>}
                    </label>
                    <input type="text" value={titleElement.content} onChange={handleTitleChange} className="mt-1 block w-full text-2xl font-bold rounded-lg border border-transparent bg-transparent px-2 py-1 text-white focus:outline-none focus:border-white/20 focus:bg-white/5" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-300">Content (one bullet point per line)</label>
                    <textarea value={pointsAsText} onChange={handlePointsChange} rows={8} className="mt-1 block w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-white resize-none focus:outline-none focus:border-white/20 focus:bg-white/5" />
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-300">Speaker Notes</label>
                    <textarea value={slide.notes || ''} onChange={(e) => updateSlideNotes(slide.id, e.target.value)} rows={4} className="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-white resize-none" />
                </div>
            </div>
            <div className="flex-shrink-0 mt-4">
                <Toolbox />
                <motion.button onClick={onProceed} className="primary-button mt-4 w-full justify-center">
                    <FiLayout className="mr-2" /> Proceed to Deck
                </motion.button>
            </div>
        </motion.div>
    );
};