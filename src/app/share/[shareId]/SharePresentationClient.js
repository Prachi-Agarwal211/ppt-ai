'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';

export const SharePresentationClient = ({ slides }) => {
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

    const activeSlide = slides[currentSlideIndex];

    if (!slides || slides.length === 0) {
        return (
            <div className="w-full max-w-5xl aspect-video bg-black/20 rounded-xl flex justify-center items-center border border-white/10 shadow-lg">
                <p className="text-gray-400">This presentation has no slides.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl h-full flex flex-col relative">
            {/* Main presentation view */}
            <div className="w-full aspect-video bg-black/30 backdrop-blur-sm rounded-xl p-8 flex flex-col justify-center items-center border border-white/10 shadow-lg relative overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSlide.id}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.3 }}
                        className="w-full h-full flex flex-col justify-center items-center text-center p-4"
                    >
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">{activeSlide.title}</h1>
                        <ul className="space-y-3 text-lg sm:text-xl md:text-2xl text-gray-300">
                            {Array.isArray(activeSlide.points) && activeSlide.points.map((point, i) => (
                                <motion.li
                                    key={i}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + i * 0.1 }}
                                >
                                    {point}
                                </motion.li>
                            ))}
                        </ul>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between items-center px-0 md:-px-4 pointer-events-none">
                 <button
                    onClick={prevSlide}
                    disabled={currentSlideIndex === 0}
                    className="pointer-events-auto p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    aria-label="Previous Slide"
                >
                    <FiArrowLeft size={32} />
                </button>
                <button
                    onClick={nextSlide}
                    disabled={currentSlideIndex === slides.length - 1}
                    className="pointer-events-auto p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                    aria-label="Next Slide"
                >
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