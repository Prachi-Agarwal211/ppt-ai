import { create } from 'zustand';
import { createClient } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient();

// Helper function to reorder arrays
const reorder = (list, startIndex, endIndex) => {
    const result = Array.from(list);
    const [removed] = result.splice(startIndex, 1);
    result.splice(endIndex, 0, removed);
    return result;
};

export const usePresentationStore = create((set, get) => ({
  // --- STATE ---
  slides: [],
  activeSlideId: null,
  currentSlideIndex: 0,
  presentationsHistory: [],
  isGenerating: false,
  generationError: '',
  historyLoading: true,
  realtimeChannel: null,
  
  // --- ACTIONS ---
  
  setActiveSlideId: (id) => {
    const slides = get().slides;
    const index = slides.findIndex(s => s.id === id);
    if (index !== -1) {
      set({ activeSlideId: id, currentSlideIndex: index });
    }
  },

  nextSlide: () => {
    const { slides, currentSlideIndex } = get();
    if (currentSlideIndex < slides.length - 1) {
      const nextIndex = currentSlideIndex + 1;
      set({ currentSlideIndex: nextIndex, activeSlideId: slides[nextIndex].id });
    }
  },

  prevSlide: () => {
    const { slides, currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      const prevIndex = currentSlideIndex - 1;
      set({ currentSlideIndex: prevIndex, activeSlideId: slides[prevIndex].id });
    }
  },

  // Updates slide content LOCALLY
  updateSlide: (id, field, value) => {
    set(state => ({
      slides: state.slides.map(s => 
        s.id === id ? { ...s, [field]: value } : s
      )
    }));
  },

  // NEW: Updates a single slide's content in the DATABASE
  updateSlideInDB: async (slideData) => {
    const { error } = await supabase
      .from('slides')
      .update({
        title: slideData.title,
        points: slideData.points,
        notes: slideData.notes
      })
      .eq('id', slideData.id);
    if (error) {
      console.error("Failed to save slide content:", error);
    }
  },

  // NEW: Reorders slides LOCALLY and saves the new order to the DATABASE
  reorderSlides: async (startIndex, endIndex) => {
    const originalSlides = get().slides;
    const reorderedSlides = reorder(originalSlides, startIndex, endIndex);
    
    // Optimistic UI update
    set({ slides: reorderedSlides });

    // Prepare data for the backend
    const updates = reorderedSlides.map((slide, index) => ({
      id: slide.id,
      order: index + 1,
    }));
    
    // Update the database
    // Using Promise.all to send all updates concurrently
    const { error } = await Promise.all(
        updates.map(update => 
            supabase.from('slides').update({ order: update.order }).eq('id', update.id)
        )
    );

    if (error) {
        console.error("Failed to save new slide order:", error);
        // If it fails, revert to the original order to keep UI consistent
        set({ slides: originalSlides });
    }
  },
  
  addSlide: () => {
    const presentationId = get().slides[0]?.presentation_id;
    if (!presentationId) return;
    
    const newSlide = {
      id: `new-${Date.now()}`,
      presentation_id: presentationId,
      slide_number: get().slides.length + 1,
      order: get().slides.length + 1,
      title: 'New Slide',
      points: ['Add your content here.'],
      notes: '',
      image_suggestion: '',
    };
    set(state => ({ slides: [...state.slides, newSlide] }));
  },

  deleteSlide: (id) => {
    set(state => ({
      slides: state.slides.filter(s => s.id !== id),
      activeSlideId: state.activeSlideId === id ? (state.slides[0]?.id || null) : state.activeSlideId,
    }));
    const { slides, activeSlideId } = get();
    const newIndex = slides.findIndex(s => s.id === activeSlideId);
    set({ currentSlideIndex: newIndex >= 0 ? newIndex : 0 });
  },

  fetchHistory: async () => {
    set({ historyLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        set({ historyLoading: false });
        return;
    }

    const { data, error } = await supabase
      .from('presentations')
      .select('id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (!error) {
      set({ presentationsHistory: data });
    } else {
      console.error("Failed to fetch history:", error);
    }
    set({ historyLoading: false });
  },

  loadPresentation: async (presentationId) => {
    const { data: slides, error } = await supabase
      .from('slides')
      .select('*')
      .eq('presentation_id', presentationId)
      .order('order', { ascending: true });
    
    if (!error && slides.length > 0) {
      set({
        slides,
        activeSlideId: slides[0].id,
        currentSlideIndex: 0,
        generationError: ''
      });
      return true;
    } else {
      console.error("Failed to load presentation slides:", error);
      set({ generationError: 'Failed to load presentation.' });
      return false;
    }
  },

  startPresentation: async (config) => {
    set({ isGenerating: true, generationError: '', slides: [], activeSlideId: null });
    
    const channelId = `generation-${uuidv4()}`;
    const channel = supabase.channel(channelId);
    channel
      .on('broadcast', { event: 'slide' }, ({ payload }) => {
        set(state => ({
            slides: [...state.slides, payload],
            activeSlideId: state.activeSlideId || payload.id,
        }));
      })
      .on('broadcast', { event: 'error' }, ({ payload }) => {
        set({ generationError: payload.message, isGenerating: false });
        get().disconnectRealtimeChannel();
      })
      .on('broadcast', { event: 'complete' }, ({ payload }) => {
        set({ isGenerating: false });
        get().fetchHistory();
        get().disconnectRealtimeChannel();
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetch('/api/generate-presentation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...config, channelId }),
          });
        }
      });
      
    set({ realtimeChannel: channel });
    return true;
  },
  
  disconnectRealtimeChannel: () => {
    const { realtimeChannel } = get();
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      set({ realtimeChannel: null });
    }
  },
}));