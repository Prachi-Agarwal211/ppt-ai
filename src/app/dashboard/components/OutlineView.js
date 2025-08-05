import { motion } from 'framer-motion';
import { usePresentationStore } from '../../../utils/store';
import { Toolbox } from './Toolbox';
import { FiLayout } from 'react-icons/fi';
import { useEffect, useState, useRef } from 'react';

const useDebouncedSave = (slide, delay = 1500) => {
    const { updateSlideInDB } = usePresentationStore();
    const [isSaving, setIsSaving] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (!slide || (typeof slide.id === 'string' && slide.id.startsWith('new-'))) return;

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            setIsSaving(true);
            await updateSlideInDB(slide);
            setIsSaving(false);
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [slide, delay, updateSlideInDB]);

    return isSaving;
};

export const OutlineView = ({ onProceed }) => {
  const { slide, updateSlide } = usePresentationStore(state => ({
      slide: state.slides.find(s => s.id === state.activeSlideId),
      updateSlide: state.updateSlide,
  }));
  
  const isSaving = useDebouncedSave(slide);

  if (!slide) return <div className="flex h-full items-center justify-center text-gray-400">Select a slide to begin editing.</div>;
  
  const handlePointsChange = (e) => {
    // Ensure points are always stored as an array, even when the textarea is cleared
    const value = e.target.value;
    const pointsArray = value === '' ? [] : value.split('\n');
    updateSlide(slide.id, 'points', pointsArray);
  };

  return (
    <motion.div key="outline" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="h-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-4 space-y-6">
        <div>
          <label className="text-sm font-medium text-gray-300 flex items-center">
            Title
            {isSaving && <span className="ml-2 text-xs text-gray-400 animate-pulse">Saving...</span>}
          </label>
          <input type="text" value={slide.title} onChange={(e) => updateSlide(slide.id, 'title', e.target.value)} className="mt-1 block w-full text-2xl font-bold rounded-lg border border-transparent bg-transparent px-2 py-1 text-white focus:outline-none focus:border-white/20 focus:bg-white/5" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-300">Content (one bullet point per line)</label>
          <textarea value={Array.isArray(slide.points) ? slide.points.join('\n') : ''} onChange={handlePointsChange} rows={8} className="mt-1 block w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-white resize-none focus:outline-none focus:border-white/20 focus:bg-white/5" />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-300">Speaker Notes</label>
          <textarea value={slide.notes || ''} onChange={(e) => updateSlide(slide.id, 'notes', e.target.value)} rows={4} className="mt-1 block w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-white resize-none" />
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