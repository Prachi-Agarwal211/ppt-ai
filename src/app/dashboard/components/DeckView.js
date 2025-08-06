import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '../../../utils/store';
import { MermaidDiagram } from './MermaidDiagram';
import { useMemo } from 'react';
import { FiImage } from 'react-icons/fi';

export const DeckView = () => {
  const slides = usePresentationStore(state => state.slides);
  const activeSlideId = usePresentationStore(state => state.activeSlideId);
  const theme = usePresentationStore(state => state.theme);
  const slide = useMemo(() => slides.find(s => s.id === activeSlideId), [slides, activeSlideId]);

  if (!slide) return <div className="flex h-full items-center justify-center text-gray-400">Select a slide to preview.</div>;

  const hasImage = !!slide.image_url;
  
  const containerStyle = theme.bg_css ? { background: theme.bg_css } : {};
  const titleStyle = theme.primary_color ? { color: theme.primary_color } : {};

  return (
    <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
      <div 
        style={containerStyle}
        className="w-full aspect-video bg-black/20 rounded-xl p-8 flex flex-col justify-center items-center border border-white/10 shadow-lg transition-all duration-500"
      >
        <AnimatePresence mode="wait">
          <motion.div 
            key={slide.id} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className={`w-full h-full flex flex-col justify-center items-center text-center ${hasImage ? 'md:grid md:grid-cols-2 md:gap-8' : ''}`}
          >
            <div className="flex flex-col justify-center items-center md:items-start md:text-left">
              <h2 className="text-4xl font-bold text-white mb-4" style={titleStyle}>{slide.title}</h2>
              <div className="space-y-2 text-xl text-gray-300 w-full h-full">
                {Array.isArray(slide.points) && slide.points.map((point, i) => {
                  const isMermaid = typeof point === 'string' && (point.trim().startsWith('graph') || point.trim().startsWith('sequenceDiagram') || point.trim().startsWith('gantt'));
                  if (isMermaid) {
                    return <MermaidDiagram key={i} chart={point} />;
                  }
                  return <p key={i}>{point}</p>;
                })}
              </div>
            </div>

            {hasImage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-full h-full bg-black/20 rounded-lg overflow-hidden mt-4 md:mt-0 flex items-center justify-center"
              >
                <img src={slide.image_url} alt={slide.image_suggestion || 'AI generated image'} className="w-full h-full object-cover" />
              </motion.div>
            )}
            
            {!hasImage && slide.image_suggestion && (
               <div className="hidden md:flex w-full h-full bg-black/10 rounded-lg border-2 border-dashed border-white/10 items-center justify-center flex-col text-gray-500">
                  <FiImage size={40} className="mb-2" />
                  <p className="text-sm">AI Image will appear here</p>
               </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};