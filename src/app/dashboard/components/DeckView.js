'use client';
import { motion } from 'framer-motion';
import { usePresentationStore, getElement } from '@/utils/store';
import { useMemo, useRef, useState, useEffect } from 'react';
import { FiMove, FiEdit, FiCheck, FiLayout } from 'react-icons/fi';
import { Rnd } from 'react-rnd';
import { Toolbox } from '@/app/dashboard/components/Toolbox';
import { ElementRenderer } from './ElementRenderer'; // Import the shared renderer

const EditableElement = ({ element, slideId, containerSize }) => {
    const updateElementTransform = usePresentationStore(state => state.updateElementTransform);

    if (!element || !containerSize.width) return null;

    const handleDragStop = (e, d) => {
        const newPosition = { x: (d.x / containerSize.width) * 100, y: (d.y / containerSize.height) * 100 };
        updateElementTransform(slideId, element.id, newPosition, element.size);
    };

    const handleResizeStop = (e, direction, ref, delta, position) => {
        const newSize = { width: (parseInt(ref.style.width, 10) / containerSize.width) * 100, height: (parseInt(ref.style.height, 10) / containerSize.height) * 100 };
        const newPosition = { x: (position.x / containerSize.width) * 100, y: (position.y / containerSize.height) * 100 };
        updateElementTransform(slideId, element.id, newPosition, newSize);
    };

    if (element.type === 'image_suggestion') return null;

    return (
        <Rnd
            size={{ width: `${element.size.width}%`, height: `${element.size.height}%` }}
            position={{ x: (element.position.x / 100) * containerSize.width, y: (element.position.y / 100) * containerSize.height }}
            onDragStop={handleDragStop}
            onResizeStop={handleResizeStop}
            bounds="parent"
            className="border-2 border-dashed border-transparent hover:border-peachSoft transition-colors flex items-center justify-center group"
            dragHandleClassName="drag-handle"
        >
            <div className="absolute -top-2 -left-2 p-1 bg-peachSoft text-black rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-move drag-handle z-10">
                <FiMove size={12} />
            </div>
            <ElementRenderer element={element} />
        </Rnd>
    );
};

const DeckView = () => {
    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [isEditMode, setIsEditMode] = useState(false);

    const slides = usePresentationStore(state => state.slides);
    const activeSlideId = usePresentationStore(state => state.activeSlideId);
    const theme = usePresentationStore(state => state.theme);
    const setActiveSlideId = usePresentationStore(state => state.setActiveSlideId);
    
    useEffect(() => {
        if (!activeSlideId && slides.length > 0) {
            setActiveSlideId(slides[0].id);
        }
    }, [activeSlideId, slides, setActiveSlideId]);

    const activeSlide = useMemo(() => slides.find(s => s.id === activeSlideId), [slides, activeSlideId]);
    
    // Effect to update size, now runs on mount and when the active slide changes
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
            }
        };
        updateSize(); // Initial call
    }, [activeSlide]); // Recalculate size if slide content might change aspect ratio (future-proof)

    // Effect for resize listener, runs only once on mount
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
            }
        };
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, []); // Empty dependency array


    if (!activeSlide) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                <FiLayout className="mb-4 text-4xl" />
                <h3 className="text-xl font-semibold text-gray-300">Deck View</h3>
                <p>Select a slide from the left to view and edit it here.</p>
            </div>
        );
    }
    
    const imageSuggestionElement = getElement(activeSlide, 'image_suggestion');
    const containerStyle = theme.bg_css ? { background: theme.bg_css } : {};

    return (
        <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center justify-center space-y-4">
            <div className="w-full flex justify-end">
                <button onClick={() => setIsEditMode(!isEditMode)} className="secondary-button !rounded-md flex items-center gap-2">
                    {isEditMode ? <FiCheck /> : <FiEdit />}
                    {isEditMode ? 'Done Editing' : 'Edit Layout'}
                </button>
            </div>
            <div 
                ref={containerRef}
                style={containerStyle}
                className="w-full aspect-video bg-black/20 rounded-xl border border-white/10 shadow-lg transition-all duration-500 relative"
            >
                {activeSlide.image_url && <img src={activeSlide.image_url} alt={imageSuggestionElement?.content || ''} className="absolute w-full h-full top-0 left-0 object-cover rounded-xl -z-10" />}
                {activeSlide.elements.map(el => {
                    if (el.type === 'image_suggestion') return null;
                    return isEditMode ? (
                        <EditableElement key={el.id} element={el} slideId={activeSlide.id} containerSize={containerSize} />
                    ) : (
                        <div key={el.id} style={{ position: 'absolute', left: `${el.position.x}%`, top: `${el.position.y}%`, width: `${el.size.width}%`, height: `${el.size.height}%` }}>
                           <ElementRenderer element={el} />
                        </div>
                    );
                })}
            </div>
            <div className="w-full">
                <Toolbox />
            </div>
        </motion.div>
    );
};

export default DeckView;