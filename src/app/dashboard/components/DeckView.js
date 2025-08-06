'use client';
import { usePresentationStore, getElement } from '@/utils/store';
import { GripVertical, Trash2 } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const DeckView = () => {
  const { slides, reorderSlides, deleteSlide, setActiveSlideId } = usePresentationStore();

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }
    reorderSlides(result.source.index, result.destination.index);
  };

  if (!slides || slides.length === 0) {
      return (
          <div className="p-4 h-full flex flex-col items-center justify-center text-center text-gray-500">
              <h2 className="text-xl font-bold mb-4 text-gray-300">Deck View</h2>
              <p>Your slides will appear here. Start by creating a presentation in the 'Idea' tab.</p>
          </div>
      );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      <h2 className="text-xl font-bold mb-4 text-gray-300">Deck View</h2>
      <p className="text-sm text-gray-400 mb-4">Click and drag slides to reorder them.</p>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="deck-slides">
            {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                    {slides.map((slide, index) => (
                        <Draggable key={slide.id} draggableId={slide.id.toString()} index={index}>
                            {(providedDrag) => (
                                <div
                                    ref={providedDrag.innerRef}
                                    {...providedDrag.draggableProps}
                                    className="flex items-center bg-black/30 p-3 rounded-lg border border-white/10 group cursor-pointer hover:border-peachSoft"
                                    onClick={() => setActiveSlideId(slide.id)}
                                >
                                    <div {...providedDrag.dragHandleProps} className="p-1 text-gray-400">
                                        <GripVertical className="cursor-move" />
                                    </div>
                                    <div className="flex-grow mx-2 min-w-0">
                                        <h3 className="font-semibold text-white truncate">{getElement(slide, 'title')?.content || `Slide ${index + 1}`}</h3>
                                        <p className="text-sm text-gray-500 truncate">{getElement(slide, 'content')?.content.join(' ') || 'No content'}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); deleteSlide(slide.id);}} className="text-gray-500 hover:text-red-500 ml-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            )}
                        </Draggable>
                    ))}
                    {provided.placeholder}
                </div>
            )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default DeckView;