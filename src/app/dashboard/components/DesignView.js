import { motion } from 'framer-motion';
import { usePresentationStore, getElement } from '../../../utils/store';
import { useMemo, useRef, useState, useEffect } from 'react';
import { FiMove } from 'react-icons/fi';
import { Rnd } from 'react-rnd';

// A unified Diagram component that can render raw SVG from Kroki
const Diagram = ({ chart }) => {
    if (!chart) return null;
    return (
        <div className="w-full h-full bg-white rounded-md p-2 overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: chart }} />
        </div>
    );
};

const ElementEditor = ({ element, slideId, containerSize }) => {
    const { updateElementTransform } = usePresentationStore();

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

    const renderContent = () => {
        switch (element.type) {
            case 'title':
                return <h2 className="text-4xl font-bold text-white w-full h-full p-2 overflow-hidden flex items-center justify-center">{element.content}</h2>;
            case 'content':
                return <div className="text-xl text-gray-300 w-full h-full p-4 overflow-auto text-left">{Array.isArray(element.content) && element.content.map((point, i) => <p key={i}>• {point}</p>)}</div>;
            case 'diagram':
                return <Diagram chart={element.content} />;
            default:
                return null;
        }
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
            {renderContent()}
        </Rnd>
    );
};


export const DesignView = () => {
    const containerRef = useRef(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const { slides, activeSlideId, theme } = usePresentationStore(state => ({ slides: state.slides, activeSlideId: state.activeSlideId, theme: state.theme }));
    const slide = useMemo(() => slides.find(s => s.id === activeSlideId), [slides, activeSlideId]);
    
    useEffect(() => {
        const updateSize = () => { if (containerRef.current) setContainerSize({ width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight }) };
        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [slide]);

    if (!slide) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                <FiMove className="mb-4 text-4xl" />
                <h3 className="text-xl font-semibold text-gray-300">Design Mode</h3>
                <p>Select a slide to start arranging its elements.</p>
            </div>
        );
    }
    
    const imageSuggestionElement = getElement(slide, 'image_suggestion');
    const containerStyle = theme.bg_css ? { background: theme.bg_css } : {};

    return (
        <motion.div key="design" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center p-4">
            <div 
                ref={containerRef}
                style={containerStyle}
                className="w-full aspect-video bg-black/20 rounded-xl border border-white/10 shadow-lg transition-all duration-500 relative"
            >
                {slide.image_url && <img src={slide.image_url} alt={imageSuggestionElement?.content || ''} className="absolute w-full h-full top-0 left-0 object-cover rounded-xl -z-10" />}
                {slide.elements.map(el => <ElementEditor key={el.id} element={el} slideId={slide.id} containerSize={containerSize} />)}
            </div>
        </motion.div>
    );
};