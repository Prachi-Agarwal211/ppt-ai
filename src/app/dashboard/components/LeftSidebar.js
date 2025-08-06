import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FiPlus, FiTrash2, FiLoader } from 'react-icons/fi';
import { usePresentationStore, getElement } from '../../../utils/store';
import { useMemo } from 'react';

// A memoized component to prevent re-rendering every slide preview on every state change
const SlidePreview = ({ slide }) => {
    const title = useMemo(() => getElement(slide, 'title')?.content || 'Untitled Slide', [slide]);
    const pointsText = useMemo(() => {
        const contentEl = getElement(slide, 'content');
        return Array.isArray(contentEl?.content) ? contentEl.content.join(' ') : '';
    }, [slide]);

    return (
        <>
            <p className="font-semibold text-white text-sm truncate">{title}</p>
            <p className="text-xs text-gray-400 line-clamp-2">{pointsText}</p>
        </>
    );
};

export const LeftSidebar = () => {
    const { 
        slides, 
        activeSlideId, 
        setActiveSlideId, 
        addSlide, 
        deleteSlide, 
        reorderSlides, 
        isGenerating 
    } = usePresentationStore();

    const onDragEnd = (result) => {
        if (!result.destination) {
            return;
        }
        reorderSlides(result.source.index, result.destination.index);
    };

    return (
        <>
            <h3 className="text-xl font-semibold mb-4 text-gray-200 flex-shrink-0">Outline</h3>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="slides">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="flex-grow overflow-y-auto -mr-2 pr-2 space-y-2">
                            {slides.map((slide, index) => (
                                <Draggable key={slide.id} draggableId={slide.id.toString()} index={index}>
                                    {(providedDrag) => (
                                        <div 
                                          ref={providedDrag.innerRef} 
                                          {...providedDrag.draggableProps} 
                                          {...providedDrag.dragHandleProps} 
                                          className="group relative"
                                        >
                                            <button 
                                                onClick={() => setActiveSlideId(slide.id)} 
                                                className={`w-full text-left p-3 rounded-lg transition-colors duration-200 flex items-start gap-3 ${activeSlideId === slide.id ? 'bg-white/20 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                            >
                                                <span className="font-semibold text-sm mt-1">{index + 1}</span>
                                                <div className="flex-grow min-w-0">
                                                    <SlidePreview slide={slide} />
                                                </div>
                                            </button>
                                            <button onClick={() => deleteSlide(slide.id)} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-gray-500 rounded-full hover:bg-red-500/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <FiTrash2 size={14}/>
                                            </button>
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                             {isGenerating && (
                                <div className="flex items-center gap-3 p-3 text-sm text-gray-400">
                                    <FiLoader className="animate-spin" />
                                    <span>Generating slides...</span>
                                </div>
                            )}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <div className="flex-shrink-0 pt-2 border-t border-white/10">
                <button onClick={addSlide} disabled={isGenerating} className="secondary-button w-full justify-center text-sm disabled:opacity-50">
                    <FiPlus className="mr-2" /> Add Slide
                </button>
            </div>
        </>
    );
};