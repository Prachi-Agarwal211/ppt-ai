import { create } from 'zustand';
import { createClient } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { persist, createJSONStorage } from 'zustand/middleware';

// A shared helper function to find a specific element within a slide's elements array.
export const getElement = (slide, type) => {
    if (!slide || !Array.isArray(slide.elements)) return undefined;
    return slide.elements.find(el => el.type === type);
};

// A debounced utility to save slide changes to the database.
const updateSlideInDB = async (slideId, slideData) => {
    if (!slideId || String(slideId).startsWith('new-')) return;
    const supabase = createClient();
    try {
        await supabase.from('slides').update(slideData).eq('id', slideId);
    } catch (error) {
        console.error("Error debounced saving slide:", error);
        toast.error("Auto-save failed.");
    }
};

export const usePresentationStore = create(
    persist(
        (set, get) => ({
            // --- STATE ---
            slides: [],
            presentationId: null,
            activeSlideId: null,
            presentationsHistory: [],
            historyLoading: true,
            isGenerating: false, // For initial presentation creation
            generationError: null,
            currentSlideIndex: 0,
            isAssistantProcessing: false, // For all other AI tasks (diagrams, themes, etc.)
            messages: [], // Centralized chat history for the AI Assistant
            
            theme: { bg_css: null, primary_color: null, secondary_color: null, accent_color: null },
            
            // --- THE "SUPERBOSS" AI ACTION ---
            /**
             * The single entry point for all AI commands, from buttons or chat.
             * @param {object} command - An object containing the task and any necessary context.
             * @returns {Promise<boolean>} A boolean indicating success or failure.
             */
            sendCommand: async (command) => {
                const { activeSlideId, slides, presentationId, addMessage, loadPresentation } = get();

                // Context validation to provide helpful feedback to the user.
                if (!activeSlideId && ['generate_diagram', 'generate_image', 'interpret_chat'].includes(command.task)) {
                    toast.error("Please select a slide first.");
                    return false;
                }
                if (!presentationId && command.task === 'generate_theme') {
                    toast.error("Please load a presentation first.");
                    return false;
                }
                
                // Use the appropriate loading state based on the task.
                const isLoadingState = command.task === 'generate_presentation' ? 'isGenerating' : 'isAssistantProcessing';
                set({ [isLoadingState]: true, generationError: null });

                const activeSlide = slides.find(s => s.id === activeSlideId);
                
                // Prepare a comprehensive context object to send to the Superboss API.
                const context = {
                    presentationId,
                    slideId: activeSlideId,
                    command: command.command, // The raw text from the chat box
                    topic: command.topic, // The topic for a new presentation
                    slideCount: command.slideCount,
                    slideContext: activeSlide ? {
                        title: getElement(activeSlide, 'title')?.content,
                        points: getElement(activeSlide, 'content')?.content,
                    } : null,
                    imageSuggestion: activeSlide ? getElement(activeSlide, 'image_suggestion')?.content : null,
                };

                try {
                    const response = await fetch('/api/ai-command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task: command.task, context }),
                    });

                    if (!response.ok) {
                        let errorMessage = 'An unexpected error occurred.';
                        try {
                            // Attempt to parse a JSON error response from the server
                            const errorBody = await response.json();
                            errorMessage = errorBody.error || errorMessage;
                        } catch (e) {
                            // If the response body isn't JSON, use the HTTP status text
                            errorMessage = `Server error: ${response.status} ${response.statusText}`;
                        }
                        throw new Error(errorMessage);
                    }
                    
                    const result = await response.json();

                    // --- Dispatch the result from the Superboss to the correct state update ---
                    switch (result.type) {
                        case 'presentation_started':
                            await loadPresentation(result.presentationId);
                            toast.success("Presentation generated successfully!");
                            return true; // Signal success to the IdeaView for view switching.
                        
                        case 'diagram':
                            const newElement = { id: uuidv4(), type: 'diagram', content: result.content, syntax: result.syntax, position: { x: 10, y: 30 }, size: { width: 80, height: 60 } };
                            set(state => ({ slides: state.slides.map(s => s.id === activeSlideId ? { ...s, elements: [...s.elements, newElement] } : s) }));
                            addMessage({ role: 'ai', content: `I've created a ${result.syntax} diagram for you.` });
                            toast.success("Diagram added to slide!");
                            break;
                        
                        case 'theme':
                            set({ theme: result.theme });
                            addMessage({ role: 'ai', content: "I've updated the presentation theme." });
                            toast.success("New AI theme applied!");
                            break;
                        
                        case 'image':
                            set(state => ({ slides: state.slides.map(s => s.id === activeSlideId ? { ...s, image_url: result.imageUrl } : s) }));
                            updateSlideInDB(activeSlideId, { image_url: result.imageUrl });
                            addMessage({ role: 'ai', content: "Here is the image you requested." });
                            toast.success("AI Image generated!");
                            break;
                        
                        case 'clarification':
                            addMessage({ role: 'ai', content: result.message });
                            break;
                        
                        default:
                            throw new Error("Received an unknown result type from the AI.");
                    }
                } catch (error) {
                    console.error("AI Command failed:", error);
                    const errorMessage = error.message || "An unknown error occurred.";
                    set({ generationError: errorMessage });
                    toast.error(errorMessage);
                    addMessage({ role: 'ai', content: `Sorry, an error occurred: ${errorMessage}` });
                    return false; // Signal failure.
                } finally {
                    set({ [isLoadingState]: false });
                }
                return true; // Default success
            },
            
            // --- REGULAR STATE MANAGEMENT ACTIONS ---
            
            addMessage: (message) => set(state => ({ messages: [...state.messages, message] })),
            
            updateElementTransform: (slideId, elementId, newPosition, newSize) => {
                set(state => ({
                    slides: state.slides.map(slide => {
                        if (slide.id === slideId) {
                            const newElements = slide.elements.map(el => el.id === elementId ? { ...el, position: newPosition, size: newSize } : el);
                            updateSlideInDB(slide.id, { elements: newElements });
                            return { ...slide, elements: newElements };
                        }
                        return slide;
                    })
                }));
            },

            updateElementContent: (slideId, elementId, newContent) => {
                set(state => ({
                    slides: state.slides.map(slide => {
                        if (slide.id === slideId) {
                            const newElements = slide.elements.map(el => el.id === elementId ? { ...el, content: newContent } : el);
                            updateSlideInDB(slide.id, { elements: newElements });
                            return { ...slide, elements: newElements };
                        }
                        return slide;
                    })
                }));
            },
            
            updateSlideNotes: (slideId, notes) => {
                set(state => ({
                    slides: state.slides.map(s => {
                        if (s.id === slideId) {
                            updateSlideInDB(slide.id, { notes: notes });
                            return { ...s, notes: notes };
                        }
                        return s;
                    })
                }));
            },

            addSlide: () => {
                const newSlide = {
                    id: `new-${uuidv4()}`,
                    elements: [
                        { id: uuidv4(), type: 'title', content: 'New Slide Title', position: {x: 5, y: 10}, size: {width: 90, height: 15} },
                        { id: uuidv4(), type: 'content', content: ['Add your bullet points here.'], position: {x: 5, y: 30}, size: {width: 90, height: 60} },
                        { id: uuidv4(), type: 'image_suggestion', content: 'A relevant background image' }
                    ],
                    notes: '', order: get().slides.length + 1, presentation_id: get().presentationId, image_url: null
                };
                set(state => ({ slides: [...state.slides, newSlide], activeSlideId: newSlide.id, currentSlideIndex: state.slides.length }));
                toast.success("New slide added!");
            },
            
            setSlides: (slides) => set({ slides, activeSlideId: slides[0]?.id || null, currentSlideIndex: 0, messages: [] }),
            
            setActiveSlideId: (id) => {
                const slides = get().slides;
                const index = slides.findIndex(s => s.id === id);
                set({ activeSlideId: id, currentSlideIndex: index });
            },

            nextSlide: () => {
                const { slides, currentSlideIndex } = get();
                if (currentSlideIndex < slides.length - 1) set({ currentSlideIndex: currentSlideIndex + 1, activeSlideId: slides[currentSlideIndex + 1].id });
            },
            prevSlide: () => {
                const { slides, currentSlideIndex } = get();
                if (currentSlideIndex > 0) set({ currentSlideIndex: currentSlideIndex - 1, activeSlideId: slides[currentSlideIndex - 1].id });
            },

            deleteSlide: async (id) => {
                set(state => ({ slides: state.slides.filter(s => s.id !== id) }));
                if (!String(id).startsWith('new-')) await createClient().from('slides').delete().eq('id', id);
                toast.success("Slide deleted.");
            },
            
            reorderSlides: (startIndex, endIndex) => {
                const slides = Array.from(get().slides);
                const [removed] = slides.splice(startIndex, 1);
                slides.splice(endIndex, 0, removed);
                const updatedSlides = slides.map((s, index) => ({ ...s, order: index + 1 }));
                set({ slides: updatedSlides });
                updatedSlides.forEach(slide => updateSlideInDB(slide.id, { order: slide.order }));
                toast.success("Outline reordered.");
            },
            
            fetchHistory: async () => {
                set({ historyLoading: true });
                const { data, error } = await createClient().from('presentations').select('id, title, created_at').order('created_at', { ascending: false });
                if (!error) set({ presentationsHistory: data });
                else toast.error("Could not load history.");
                set({ historyLoading: false });
            },

            loadPresentation: async (id) => {
                set({ isGenerating: true, generationError: null, slides: [], activeSlideId: null, presentationId: null, theme: {}, messages: [] }); 
                const promise = Promise.all([
                    createClient().from('presentations').select('*').eq('id', id).single(),
                    createClient().from('slides').select('id, elements, notes, order, image_url, presentation_id').eq('presentation_id', id).order('order', { ascending: true })
                ]);
                toast.promise(promise, {
                    loading: 'Loading presentation...',
                    success: (results) => {
                        const [presentationRes, slidesRes] = results;
                         if (slidesRes.error || presentationRes.error) throw slidesRes.error || presentationRes.error;
                        set({
                            slides: slidesRes.data,
                            presentationId: presentationRes.data.id,
                            activeSlideId: slidesRes.data[0]?.id || null,
                            currentSlideIndex: 0,
                            theme: { bg_css: presentationRes.data.theme_bg_css, primary_color: presentationRes.data.theme_primary_color, secondary_color: presentationRes.data.theme_secondary_color, accent_color: presentationRes.data.theme_accent_color },
                            isGenerating: false 
                        });
                        return `Loaded "${presentationRes.data.title}"`;
                    },
                    error: (err) => {
                        set({ generationError: 'Failed to load presentation.', isGenerating: false });
                        return `Error: ${err.message}`;
                    }
                });
                return promise.then(() => true).catch(() => false);
            },
        }),
        {
            name: 'presentation-storage', // unique name
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
        }
    )
);