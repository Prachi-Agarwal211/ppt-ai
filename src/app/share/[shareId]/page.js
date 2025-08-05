'use client'; // This top-level directive allows defining client components in the same file
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- CLIENT COMPONENT for Public Presentation ---
function PublicPresentation({ slides }) {
    const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
    const activeSlide = slides[currentSlideIndex];

    const nextSlide = () => {
        if (currentSlideIndex < slides.length - 1) {
            setCurrentSlideIndex(currentSlideIndex + 1);
        }
    };

    const prevSlide = () => {
        if (currentSlideIndex > 0) {
            setCurrentSlideIndex(currentSlideIndex - 1);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
          if (e.key === 'ArrowRight') nextSlide();
          if (e.key === 'ArrowLeft') prevSlide();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
      }, [currentSlideIndex, slides.length]);


    return (
        <div className="w-full max-w-4xl aspect-video bg-gray-900 rounded-xl p-8 flex flex-col justify-center items-center border border-gray-700 shadow-lg text-white relative">
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSlide.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full flex flex-col justify-center items-center text-center"
                >
                    <h1 className="text-4xl font-bold text-white mb-8">{activeSlide.title}</h1>
                    <ul className="space-y-4 text-xl text-gray-300">
                        {activeSlide.points.map((point, i) => <li key={i}>{point}</li>)}
                    </ul>
                </motion.div>
            </AnimatePresence>
            
            <button onClick={prevSlide} className="absolute top-1/2 left-6 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30" disabled={currentSlideIndex === 0}><FiArrowLeft size={32} /></button>
            <button onClick={nextSlide} className="absolute top-1/2 right-6 -translate-y-1/2 text-gray-400 hover:text-white disabled:opacity-30" disabled={currentSlideIndex === slides.length - 1}><FiArrowRight size={32} /></button>
            <p className="absolute bottom-4 text-sm text-gray-500">{currentSlideIndex + 1} / {slides.length}</p>
        </div>
    );
}

// --- SERVER COMPONENT for the page itself ---
export default async function SharePage({ params }) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: presentation, error: presError } = await supabase
        .from('presentations')
        .select('id, title, is_public')
        .eq('share_id', params.shareId)
        .single();
    
    if (presError || !presentation || !presentation.is_public) {
        return notFound();
    }

    const { data: slides, error: slidesError } = await supabase
        .from('slides')
        .select('*')
        .eq('presentation_id', presentation.id)
        .order('order', { ascending: true });

    if (slidesError || !slides || slides.length === 0) {
        return notFound();
    }

    return (
        <main className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-8">
            <h2 className="text-2xl font-bold text-white mb-4">{presentation.title}</h2>
            <PublicPresentation slides={slides} />
             <footer className="mt-4 text-gray-500 text-sm">
                Powered by <a href="/" className="font-semibold text-gray-400 hover:text-white">Nether AI</a>
            </footer>
        </main>
    );
}