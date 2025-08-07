'use client';
import { motion } from 'framer-motion';
import { usePresentationStore, getElement } from '@/utils/store';
import { useMemo, useRef, useState, useEffect } from 'react';
import { FiMove, FiEdit, FiCheck, FiLayout } from 'react-icons/fi';
import { Rnd } from 'react-rnd';
import { Toolbox } from '@/app/dashboard/components/Toolbox';

const ElementRenderer = ({ element }) => {
    switch (element.type) {
        case 'title':
            return <h2 className="text-4xl font-bold text-white w-full h-full p-2 overflow-hidden flex items-center justify-center text-center">{element.content}</h2>;
        case 'content':
            return <div className="text-xl text-gray-300 w-full h-full p-4 overflow-auto text-left">{Array.isArray(element.content) && element.content.map((point, i) => <p key={i}>• {point}</p>)}</div>;
        case 'diagram':
            return <div className="w-full h-full bg-white rounded-md p-2 overflow-auto" dangerouslySetInnerHTML={{ __html: element.content }} />;
        default:
            return null;
    }
};

const EditableElement = ({ element, slideId, containerSize }) => {
    // --- FIX: Selecting state individually. ---
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

    // --- FIX: Selecting state individually. ---
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
    
    useEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight });
            }
        };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [activeSlide]);

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