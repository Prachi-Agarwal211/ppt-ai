import { create } from 'zustand';
import { createClient } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';

// This utility function is used for debounced saving in the OutlineView
const updateSlideInDB = async (slide) => {
    if (!slide || !slide.id || String(slide.id).startsWith('new-')) return;
    const supabase = createClient();
    try {
        await supabase
            .from('slides')
            .update({
                title: slide.title,
                points: slide.points,
                notes: slide.notes,
                order: slide.order,
                image_url: slide.image_url // Ensure image_url is part of the update
            })
            .eq('id', slide.id);
    } catch (error) {
        console.error("Error debounced saving slide:", error);
    }
};

export const usePresentationStore = create((set, get) => ({
    // STATE
    slides: [],
    presentationId: null, // NEW: Keep track of the current presentation's ID
    activeSlideId: null,
    presentationsHistory: [],
    historyLoading: true,
    isGenerating: false, 
    generationError: null,
    currentSlideIndex: 0,
    isDiagramGenerating: false, 
    isImageGenerating: false,
    isThemeGenerating: false, // NEW: Loading state for theme generation
    
    // NEW: State for the current presentation's theme
    theme: {
        bg_css: null,
        primary_color: null,
        secondary_color: null,
        accent_color: null,
    },

    // ACTIONS
    setSlides: (slides) => {
        set({ slides, activeSlideId: slides[0]?.id || null, currentSlideIndex: 0 });
    },

    setActiveSlideId: (id) => {
        const slides = get().slides;
        const index = slides.findIndex(s => s.id === id);
        set({ activeSlideId: id, currentSlideIndex: index });
    },

    nextSlide: () => {
        const { slides, currentSlideIndex } = get();
        if (currentSlideIndex < slides.length - 1) {
            const newIndex = currentSlideIndex + 1;
            set({ currentSlideIndex: newIndex, activeSlideId: slides[newIndex].id });
        }
    },

    prevSlide: () => {
        const { slides, currentSlideIndex } = get();
        if (currentSlideIndex > 0) {
            const newIndex = currentSlideIndex - 1;
            set({ currentSlideIndex: newIndex, activeSlideId: slides[newIndex].id });
        }
    },

    updateSlide: (id, field, value) => {
        set(state => ({
            slides: state.slides.map(s => s.id === id ? { ...s, [field]: value } : s)
        }));
    },

    updateSlideInDB: (slide) => updateSlideInDB(slide),

    addSlide: () => {
        if (get().isGenerating) return; 
        const newSlide = {
            id: `new-${uuidv4()}`,
            title: 'New Slide',
            points: [],
            notes: '',
            order: get().slides.length + 1,
            presentation_id: get().presentationId, // Use the stored presentation ID
            image_url: null
        };
        set(state => ({
            slides: [...state.slides, newSlide],
            activeSlideId: newSlide.id,
            currentSlideIndex: state.slides.length,
        }));
    },

    deleteSlide: async (id) => {
        if (get().isGenerating) return;
        const supabase = createClient();
        set(state => ({
            slides: state.slides.filter(s => s.id !== id)
        }));
        if (!String(id).startsWith('new-')) {
            await supabase.from('slides').delete().eq('id', id);
        }
    },
    
    reorderSlides: (startIndex, endIndex) => {
        const slides = Array.from(get().slides);
        const [removed] = slides.splice(startIndex, 1);
        slides.splice(endIndex, 0, removed);
        const updatedSlides = slides.map((s, index) => ({ ...s, order: index + 1 }));
        set({ slides: updatedSlides });
        updatedSlides.forEach(slide => updateSlideInDB(slide));
    },

    startPresentation: async (config) => {
        if (get().isGenerating) return false;
        set({ isGenerating: true, generationError: null, slides: [], activeSlideId: null, presentationId: null, theme: {} });
        const channelId = `presentation-gen-${uuidv4()}`;
        const supabase = createClient();
        const channel = supabase.channel(channelId);

        channel
            .on('broadcast', { event: 'complete' }, async (payload) => {
                await get().loadPresentation(payload.payload.presentationId);
                set({ isGenerating: false }); 
                supabase.removeChannel(channel);
            })
            .on('broadcast', { event: 'error' }, (payload) => {
                set({ isGenerating: false, generationError: payload.payload.message });
                supabase.removeChannel(channel);
            })
            .subscribe();

        try {
            await fetch('/api/generate-presentation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...config, channelId }),
            });
        } catch (error) {
            set({ isGenerating: false, generationError: error.message });
            supabase.removeChannel(channel);
        }
        return true;
    },

    fetchHistory: async () => {
        const supabase = createClient();
        set({ historyLoading: true });
        const { data, error } = await supabase
            .from('presentations')
            .select('id, title, created_at')
            .order('created_at', { ascending: false });
        if (!error) set({ presentationsHistory: data });
        set({ historyLoading: false });
    },

    loadPresentation: async (id) => {
        set({ isGenerating: true, generationError: null, slides: [], activeSlideId: null, presentationId: null, theme: {} }); 
        const supabase = createClient();
        
        const [presentationRes, slidesRes] = await Promise.all([
            supabase.from('presentations').select('*').eq('id', id).single(),
            supabase.from('slides').select('*').eq('presentation_id', id).order('order', { ascending: true })
        ]);
        
        if (slidesRes.error || presentationRes.error) {
            const error = slidesRes.error || presentationRes.error;
            console.error("Error loading presentation:", error);
            set({ generationError: 'Failed to load presentation.', isGenerating: false });
            return false;
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
                accent_color: presentationRes.data.theme_accent_color,
            },
            isGenerating: false 
        });
        return true;
    },

    // --- AI FEATURE ACTIONS ---

    generateDiagramForSlide: async (slideId) => {
        if (!slideId || get().isDiagramGenerating) return;
        set({ isDiagramGenerating: true });

        const slide = get().slides.find(s => s.id === slideId);
        if (!slide) {
            set({ isDiagramGenerating: false });
            return;
        }

        try {
            const response = await fetch('/api/generate-diagram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slideTitle: slide.title, slidePoints: slide.points }),
            });
            if (!response.ok) throw new Error('Diagram generation failed.');
            
            const { diagram } = await response.json();
            if (diagram) {
                const newPoints = [...(slide.points || []), diagram];
                get().updateSlide(slideId, 'points', newPoints);
                updateSlideInDB({ ...slide, points: newPoints });
            }
        } catch (error) {
            console.error("Error generating diagram:", error);
        } finally {
            set({ isDiagramGenerating: false });
        }
    },
    
    generateImageForSlide: async (slideId) => {
        if (!slideId || get().isImageGenerating) return;
        set({ isImageGenerating: true });

        const slide = get().slides.find(s => s.id === slideId);
        if (!slide || !slide.image_suggestion) {
            console.error("No image suggestion found for this slide.");
            set({ isImageGenerating: false });
            return;
        }

        try {
            const response = await fetch('/api/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageSuggestion: slide.image_suggestion, slideId }),
            });

            if (!response.ok) {
                throw new Error('Image generation API call failed.');
            }

            const { imageUrl } = await response.json();
            if (imageUrl) {
                get().updateSlide(slideId, 'image_url', imageUrl);
            }
        } catch (error) {
            console.error("Error generating image:", error);
        } finally {
            set({ isImageGenerating: false });
        }
    },

    generateThemeForPresentation: async () => {
        const { presentationId, slides } = get();
        if (!presentationId || get().isThemeGenerating) return;
        set({ isThemeGenerating: true });

        const presentationTitle = slides[0]?.title || "Untitled Presentation";

        try {
            const response = await fetch('/api/generate-theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ presentationTitle, presentationId }),
            });
            if (!response.ok) throw new Error('Theme generation failed.');

            const { theme } = await response.json();
            if (theme) {
                set({ theme: theme });
            }
        } catch (error) {
            console.error("Error generating theme:", error);
        } finally {
            set({ isThemeGenerating: false });
        }
    }
}));