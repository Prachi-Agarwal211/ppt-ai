import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiArrowRight, FiX } from 'react-icons/fi';
import { usePresentationStore } from '../../../utils/store';

export const PresentationView = ({ isVisible, onClose }) => {
    const { slides, currentSlideIndex, nextSlide, prevSlide, theme } = usePresentationStore(state => ({
        slides: state.slides,
        currentSlideIndex: state.currentSlideIndex,
        nextSlide: state.nextSlide,
        prevSlide: state.prevSlide,
        theme: state.theme,
    }));
    const activeSlide = slides[currentSlideIndex];
  
    useEffect(() => {
      const handleKeyDown = (e) => {
        if (!isVisible) return;
        if (e.key === 'ArrowRight') nextSlide();
        if (e.key === 'ArrowLeft') prevSlide();
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isVisible, nextSlide, prevSlide, onClose]);
  
    const hasImage = !!activeSlide?.image_url;

    const containerStyle = theme.bg_css ? { background: theme.bg_css } : { background: '#000' };
    const titleStyle = theme.primary_color ? { color: theme.primary_color } : {};

    return (
      <AnimatePresence>
        {isVisible && activeSlide && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            style={containerStyle}
            className="fixed inset-0 z-50 flex flex-col transition-all duration-500"
          >
            <div className="w-full h-full p-16 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={activeSlide.id} 
                  initial={{ opacity: 0, x: 50 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -50 }} 
                  transition={{ duration: 0.3 }}
                  className={`w-full h-full flex flex-col justify-center items-center text-center ${hasImage ? 'md:grid md:grid-cols-2 md:gap-12' : ''}`}
                >
                  <div className="flex flex-col justify-center">
                    <h1 className="text-6xl font-bold text-white mb-8" style={titleStyle}>{activeSlide.title}</h1>
                    <ul className="space-y-4 text-3xl text-gray-300">
                      {Array.isArray(activeSlide.points) && activeSlide.points.map((point, i) => <motion.li key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.15 }}>{point}</motion.li>)}
                    </ul>
                  </div>

                  {hasImage && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="w-full h-full flex items-center justify-center"
                    >
                      <img src={activeSlide.image_url} alt={activeSlide.image_suggestion || 'AI generated image'} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                    </motion.div>
                  )}

                </motion.div>
              </AnimatePresence>
            </div>
            <button onClick={prevSlide} className="absolute top-1/2 left-6 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30" disabled={currentSlideIndex === 0}><FiArrowLeft size={32} /></button>
            <button onClick={nextSlide} className="absolute top-1/2 right-6 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30" disabled={currentSlideIndex === slides.length - 1}><FiArrowRight size={32} /></button>
            <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white"><FiX size={32} /></button>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-sm">{currentSlideIndex + 1} / {slides.length}</div>
          </motion.div>
        )}
      </AnimatePresence>
    );
};