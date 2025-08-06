import { motion, AnimatePresence } from 'framer-motion';
import { usePresentationStore, getElement } from '../../../utils/store';
import { useMemo } from 'react';
import { FiImage, FiMousePointer } from 'react-icons/fi';

// A new unified Diagram component that can render raw SVG from Kroki
const Diagram = ({ chart }) => {
    if (!chart) return null;
    return (
        <div className="w-full h-full bg-white rounded-md p-2 overflow-auto">
            <div dangerouslySetInnerHTML={{ __html: chart }} />
        </div>
    );
};

// A renderer for individual elements based on their type and position
const ElementRenderer = ({ element, theme }) => {
    if (!element) return null;
    
    const titleStyle = theme.primary_color ? { color: theme.primary_color } : {};

    const renderContent = () => {
        switch(element.type) {
            case 'title':
                return <h2 className="text-4xl font-bold text-white w-full h-full" style={titleStyle}>{element.content}</h2>;
            case 'content':
                const points = Array.isArray(element.content) ? element.content : [];
                return (
                    <div className="space-y-2 text-xl text-gray-300 w-full h-full text-left">
                        {points.map((point, i) => <p key={i}>• {point}</p>)}
                    </div>
                );
            case 'diagram':
                return <Diagram chart={element.content} />;
            default:
                return null;
        }
    };
    
    // Element container with absolute positioning based on stored values
    return (
        <div 
            style={{
                position: 'absolute',
                left: `${element.position.x}%`,
                top: `${element.position.y}%`,
                width: `${element.size.width}%`,
                height: `${element.size.height}%`,
            }}
            className="flex items-center justify-center"
        >
            {renderContent()}
        </div>
    );
};

export const DeckView = () => {
    const slides = usePresentationStore(state => state.slides);
    const activeSlideId = usePresentationStore(state => state.activeSlideId);
    const theme = usePresentationStore(state => state.theme);
    const slide = useMemo(() => slides.find(s => s.id === activeSlideId), [slides, activeSlideId]);

    if (!slide) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center text-gray-500">
                <FiMousePointer className="mb-4 text-4xl" />
                <h3 className="text-xl font-semibold text-gray-300">Select a Slide</h3>
                <p>Choose a slide from the outline on the left to see its preview here.</p>
            </div>
        );
    }

    const imageSuggestionElement = getElement(slide, 'image_suggestion');
    const containerStyle = theme.bg_css ? { background: theme.bg_css } : {};

    return (
        <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center">
            <div 
                style={containerStyle}
                className="w-full aspect-video bg-black/20 rounded-xl p-8 border border-white/10 shadow-lg transition-all duration-500 relative"
            >
                <AnimatePresence>
                    <motion.div 
                        key={slide.id} 
                        initial={{ opacity: 0, scale: 0.95 }} 
                        animate={{ opacity: 1, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.95 }} 
                        className="w-full h-full"
                    >
                       {slide.image_url && (
                          <div className="absolute w-full h-full top-0 left-0 -z-10 p-0">
                                <img src={slide.image_url} alt={imageSuggestionElement?.content || 'AI generated image'} className="w-full h-full object-cover rounded-xl" />
                           </div>
                       )}
                       
                       {slide.elements.map(el => <ElementRenderer key={el.id} element={el} theme={theme} />)}

                    </motion.div>
                </AnimatePresence>
            </div>
        </motion.div>
    );
};