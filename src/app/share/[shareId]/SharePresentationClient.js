// src/app/share/[shareId]/SharePresentationClient.js

'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import Image from 'next/image';
// ElementRenderer removed in MVP cleanup; render minimal content instead

export const SharePresentationClient = ({ slides, presentation }) => {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

    const nextSlide = useCallback(() => {
        setCurrentSlideIndex(prev => Math.min(prev + 1, slides.length - 1));
    }, [slides.length]);

    const prevSlide = useCallback(() => {
        setCurrentSlideIndex(prev => Math.max(prev - 1, 0));
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') nextSlide();
            if (e.key === 'ArrowLeft') prevSlide();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [nextSlide, prevSlide]);

    const activeSlide = useMemo(() => slides[currentSlideIndex], [slides, currentSlideIndex]);
    const containerStyle = presentation.theme?.bg_css ? { background: presentation.theme.bg_css } : {};

    if (!slides || slides.length === 0) {
        return (
            <div className="w-full max-w-5xl aspect-video bg-black/20 rounded-xl flex justify-center items-center border border-white/10 shadow-lg">
                <p className="text-gray-400">This presentation has no slides.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl h-full flex flex-col relative">
            <div 
                style={containerStyle}
                className="w-full aspect-video bg-black/30 backdrop-blur-sm rounded-xl border border-white/10 shadow-lg relative overflow-hidden"
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSlide.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full p-8"
                    >
                        {activeSlide.image_url && (
                             <div className="absolute top-0 left-0 w-full h-full -z-10">
                              <Image src={activeSlide.image_url} alt="" fill className="object-cover" unoptimized />
                             </div>
                        )}
                        {/* Minimal fallback rendering for shared slides */}
                        <div className="w-full h-full flex flex-col gap-3">
                          <h2 className="text-white text-3xl font-bold">{activeSlide.title || 'Slide'}</h2>
                          {Array.isArray(activeSlide.bullets) && (
                            <ul className="list-disc pl-6 text-white/90">
                              {activeSlide.bullets.map((b, i) => (
                                <li key={i}>{b}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between items-center px-0 md:-px-4 pointer-events-none">
                 <button onClick={prevSlide} disabled={currentSlideIndex === 0} className="pointer-events-auto p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all" aria-label="Previous Slide">
                    <FiArrowLeft size={32} />
                </button>
                <button onClick={nextSlide} disabled={currentSlideIndex === slides.length - 1} className="pointer-events-auto p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all" aria-label="Next Slide">
                    <FiArrowRight size={32} />
                </button>
            </div>

            {/* Progress indicator */}
            <div className="text-center mt-4 text-gray-400 text-sm">
                {currentSlideIndex + 1} / {slides.length}
            </div>
        </div>
    );
};