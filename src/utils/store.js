// src/utils/store.js
import { create } from 'zustand';
import { produce } from 'immer';
import { createClient } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import { persist, createJSONStorage } from 'zustand/middleware';

// Safely clone objects to avoid leaking Immer draft proxies into async code
const deepClone = (obj) => {
    try {
        // Prefer structuredClone when available
        return typeof structuredClone === 'function' ? structuredClone(obj) : JSON.parse(JSON.stringify(obj));
    } catch {
        return JSON.parse(JSON.stringify(obj));
    }
};

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

/**
 * Internal helper to fetch and set presentation data. Centralizes the loading logic.
 * @param {string} id - The presentation ID to load.
 * @param {Function} set - The Zustand set function.
 * @returns {Promise<{success: boolean, data: object|null}>}
 */
const _fetchAndSetPresentation = async (id, set) => {
    try {
        const [presentationRes, slidesRes] = await Promise.all([
            createClient().from('presentations').select('*').eq('id', id).single(),
            createClient().from('slides').select('id, elements, notes, order, image_url, presentation_id').eq('presentation_id', id).order('order', { ascending: true })
        ]);

        if (slidesRes.error || presentationRes.error) {
            throw slidesRes.error || presentationRes.error;
        }

        set({
            slides: slidesRes.data,
            presentationId: presentationRes.data.id,
            activeSlideId: slidesRes.data[0]?.id || null,
            currentSlideIndex: 0,
            theme: { 
                bg_css: presentationRes.data.theme_bg_css, 
                primary_color: presentationRes.data.theme_primary_color, 
                secondary_color: presentationRes.data.theme_secondary_color, 
                accent_color: presentationRes.data.theme_accent_color 
            },
        });
        return { success: true, data: presentationRes.data };
    } catch (err) {
        set({ generationError: 'Failed to load presentation.', loadingStatus: 'idle' });
        console.error("Error loading presentation data:", err);
        return { success: false, error: err };
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
            loadingStatus: 'idle', // 'idle', 'generating-presentation', 'loading-presentation'
            
            theme: { bg_css: null, primary_color: null, secondary_color: null, accent_color: null },
            
            startNewPresentation: () => {
                set({
                    slides: [],
                    presentationId: null,
                    activeSlideId: null,
                    currentSlideIndex: 0,
                    messages: [],
                    theme: { bg_css: null, primary_color: null, secondary_color: null, accent_color: null },
                    generationError: null,
                    loadingStatus: 'idle',
                });
            },

            // --- THE "SUPERBOSS" AI ACTION ---
            sendCommand: async (command) => {
                const { activeSlideId, slides, presentationId, addMessage, fetchHistory } = get();

                if (!activeSlideId && ['generate_diagram', 'generate_image', 'interpret_chat'].includes(command.task)) {
                    toast.error("Please select a slide first.");
                    return false;
                }
                if (!presentationId && command.task === 'generate_theme') {
                    toast.error("Please load a presentation first.");
                    return false;
                }
                
                const isLoadingState = command.task === 'generate_presentation' ? 'isGenerating' : 'isAssistantProcessing';
                set({ [isLoadingState]: true, generationError: null });
                if (command.task === 'generate_presentation') {
                    set({ loadingStatus: 'generating-presentation' });
                }

                const activeSlide = slides.find(s => s.id === activeSlideId);
                
                const context = {
                    presentationId,
                    slideId: activeSlideId,
                    command: command.command,
                    topic: command.topic,
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
                            const errorBody = await response.json();
                            errorMessage = errorBody.error || errorMessage;
                        } catch (e) {
                            errorMessage = `Server error: ${response.status} ${response.statusText}`;
                        }
                        throw new Error(errorMessage);
                    }
                    
                    const result = await response.json();

                    switch (result.type) {
                        case 'presentation_started':
                            const { success } = await _fetchAndSetPresentation(result.presentationId, set);
                            if (success) {
                                toast.success("Presentation generated successfully!");
                                await fetchHistory();
                            } else {
                                toast.error("Could not load the new presentation.");
                            }
                            return true;
                        
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
                        case 'magic_edit':
                            // Re-fetch current presentation to refresh updated slide HTML
                            await _fetchAndSetPresentation(get().presentationId, set);
                            toast.success('Applied edit');
                            break;
                        
                        default:
                            throw new Error("Received an unknown result type from the AI.");
                    }
                } catch (error) {
                    console.error("AI Command failed:", error);
                    const errorMessage = error.message || "An unknown error occurred. Check the server logs.";
                    set({ generationError: errorMessage });
                    toast.error(errorMessage);
                    addMessage({ role: 'ai', content: `Sorry, an error occurred: ${errorMessage}` });
                    return false;
                } finally {
                    set({ [isLoadingState]: false, loadingStatus: 'idle' });
                }
                return true;
            },
            
            // --- REGULAR STATE MANAGEMENT ACTIONS ---
            
            addMessage: (message) => set(state => ({ messages: [...state.messages, message] })),
            
            updateElementTransform: (slideId, elementId, newPosition, newSize) => {
                let payload = null;
                set(state => produce(state, draft => {
                    const slide = draft.slides.find(s => s.id === slideId);
                    if (!slide) return;
                    const el = slide.elements.find(e => e.id === elementId);
                    if (!el) return;
                    el.position = newPosition;
                    el.size = newSize;
                    payload = { elements: deepClone(slide.elements) };
                }));
                if (payload) updateSlideInDB(slideId, payload);
            },

            updateElementContent: (slideId, elementId, newContent) => {
                let payload = null;
                set(state => produce(state, draft => {
                    const slide = draft.slides.find(s => s.id === slideId);
                    if (!slide) return;
                    const el = slide.elements.find(e => e.id === elementId);
                    if (!el) return;
                    el.content = newContent;
                    payload = { elements: deepClone(slide.elements) };
                }));
                if (payload) updateSlideInDB(slideId, payload);
            },
            
            // Queue an AI task on the slide (e.g., image, diagram, theme). Stored as a special element.
            addAiTask: (slideId, taskType, initialPrompt = '') => {
                let payload = null;
                set(state => produce(state, draft => {
                    const slide = draft.slides.find(s => s.id === slideId);
                    if (!slide) return;
                    const taskEl = { id: uuidv4(), type: 'ai_task', task: taskType, content: initialPrompt };
                    slide.elements.push(taskEl);
                    payload = { elements: deepClone(slide.elements) };
                }));
                if (payload) updateSlideInDB(slideId, payload);
            },

            updateAiTask: (slideId, taskId, newPrompt) => {
                let payload = null;
                set(state => produce(state, draft => {
                    const slide = draft.slides.find(s => s.id === slideId);
                    if (!slide) return;
                    const task = slide.elements.find(e => e.id === taskId && e.type === 'ai_task');
                    if (!task) return;
                    task.content = newPrompt;
                    payload = { elements: deepClone(slide.elements) };
                }));
                if (payload) updateSlideInDB(slideId, payload);
            },

            removeAiTask: (slideId, taskId) => {
                let payload = null;
                set(state => produce(state, draft => {
                    const slide = draft.slides.find(s => s.id === slideId);
                    if (!slide) return;
                    slide.elements = slide.elements.filter(e => e.id !== taskId);
                    payload = { elements: deepClone(slide.elements) };
                }));
                if (payload) updateSlideInDB(slideId, payload);
            },
            
            updateSlideNotes: (slideId, notes) => {
                let payload = null;
                set(state => produce(state, draft => {
                    const slide = draft.slides.find(s => s.id === slideId);
                    if (!slide) return;
                    slide.notes = notes;
                    payload = { notes };
                }));
                if (payload) updateSlideInDB(slideId, payload);
            },

            addSlide: async () => {
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
                const presentationId = get().presentationId;
                if (presentationId) {
                    try {
                        const supabase = createClient();
                const { data, error } = await supabase.from('slides').insert({
                            presentation_id: presentationId,
                            order: newSlide.order,
                            slide_number: newSlide.order,
                            elements: newSlide.elements,
                            notes: newSlide.notes,
                            image_url: newSlide.image_url,
                        }).select('id').single();
                        if (!error && data?.id) {
                            set(state => produce(state, draft => {
                                const idx = draft.slides.findIndex(s => s.id === newSlide.id);
                                if (idx !== -1) draft.slides[idx].id = data.id;
                                if (draft.activeSlideId === newSlide.id) draft.activeSlideId = data.id;
                            }));
                        }
                    } catch (e) {
                        console.error('Failed to persist new slide', e);
                    }
                }
                toast.success("New slide added!");
            },
            
            setSlides: (slides) => set({ slides, activeSlideId: slides[0]?.id || null, currentSlideIndex: 0, messages: [] }),

            // Finalize: send blueprint (slides with queued ai_task prompts) to backend to generate slide HTML
            finalizePresentation: async () => {
                const { presentationId } = get();
                if (!presentationId) return false;
                try {
                    const slides = get().slides;
                    const response = await fetch('/api/ai-command', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ task: 'generate_from_blueprint', context: { presentationId, slides } }),
                    });
                    if (!response.ok) throw new Error('Finalize failed');
                    const result = await response.json();
                    if (result.type === 'finalized' && Array.isArray(result.slides)) {
                        set({ slides: result.slides });
                        toast.success('Presentation generated from outline!');
                        return true;
                    }
                    return false;
                } catch (e) {
                    console.error('Finalize error', e);
                    toast.error(e.message || 'Failed to generate from outline');
                    return false;
                }
            },
            
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
                let updates = [];
                set(state => produce(state, draft => {
                    const [removed] = draft.slides.splice(startIndex, 1);
                    draft.slides.splice(endIndex, 0, removed);
                    updates = draft.slides.map((s, idx) => ({ id: s.id, order: idx + 1, slide_number: idx + 1 }));
                }));
                // Apply DB updates outside of produce
                updates.forEach(u => updateSlideInDB(u.id, { order: u.order, slide_number: u.slide_number }));
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
                if (get().loadingStatus !== 'idle') {
                    toast.error("Please wait for the current operation to complete.");
                    return false;
                }
                set({ loadingStatus: 'loading-presentation', generationError: null, slides: [], activeSlideId: null, presentationId: null, theme: {}, messages: [] }); 
                const toastId = toast.loading('Loading presentation...');
                
                const { success, data, error } = await _fetchAndSetPresentation(id, set);

                if (success) {
                    toast.success(`Loaded "${data.title}"`, { id: toastId });
                } else {
                    toast.error(`Error: ${error.message}`, { id: toastId });
                }
                set({ loadingStatus: 'idle' });
                return success;
            },

            // expose for OutlineView debounced save hook
            updateSlideInDB,
        }),
        {
            name: 'presentation-storage',
            storage: createJSONStorage(() => localStorage),
            version: 2,
            migrate: (persistedState, version) => {
                // simple forward-compatible migration
                return persistedState;
            }
        }
    )
);