import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore } from '../../../utils/store';
import { MermaidDiagram } from './MermaidDiagram';

export const DeckView = () => {
  const slide = usePresentationStore(state => state.slides.find(s => s.id === state.activeSlideId));

  if (!slide) return <div className="flex h-full items-center justify-center text-gray-400">Select a slide to preview.</div>;

  return (
    <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
      <div className="w-full aspect-video bg-black/20 rounded-xl p-8 flex flex-col justify-center items-center border border-white/10 shadow-lg">
        <AnimatePresence mode="wait">
          <motion.div 
            key={slide.id} 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.95 }} 
            className="w-full h-full flex flex-col justify-center items-center text-center"
          >
            <h2 className="text-4xl font-bold text-white mb-4">{slide.title}</h2>
            <div className="space-y-2 text-xl text-gray-300 w-full h-full">
              {Array.isArray(slide.points) && slide.points.map((point, i) => {
                const isMermaid = typeof point === 'string' && (point.trim().startsWith('graph') || point.trim().startsWith('sequenceDiagram') || point.trim().startsWith('gantt'));
                if (isMermaid) {
                  return <MermaidDiagram key={i} chart={point} />;
                }
                return <p key={i}>{point}</p>;
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};