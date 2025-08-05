import { create } from 'zustand';
import { createClient } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient();

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
  generationStatus: '', // e.g., 'Started', 'Streaming', 'Saving'
  historyLoading: true,
  realtimeChannel: null,
  
  // --- ACTIONS ---
  
  setActiveSlideId: (id) => {
    const index = get().slides.findIndex(s => s.id === id);
    if (index !== -1) {
      set({ activeSlideId: id, currentSlideIndex: index });
    }
  },

  nextSlide: () => set(state => {
    if (state.currentSlideIndex < state.slides.length - 1) {
      const nextIndex = state.currentSlideIndex + 1;
      return { currentSlideIndex: nextIndex, activeSlideId: state.slides[nextIndex].id };
    }
    return {};
  }),

  prevSlide: () => set(state => {
    if (state.currentSlideIndex > 0) {
      const prevIndex = state.currentSlideIndex - 1;
      return { currentSlideIndex: prevIndex, activeSlideId: state.slides[prevIndex].id };
    }
    return {};
  }),

  updateSlide: (id, field, value) => set(state => ({
    slides: state.slides.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    )
  })),

  updateSlideInDB: async (slideData) => {
    if (typeof slideData.id === 'string' && slideData.id.startsWith('new-')) return;
    const { error } = await supabase
      .from('slides')
      .update({ title: slideData.title, points: slideData.points, notes: slideData.notes })
      .eq('id', slideData.id);
    if (error) console.error("Failed to save slide content:", error);
  },

  reorderSlides: async (startIndex, endIndex) => {
    const originalSlides = get().slides;
    const reorderedSlides = reorder(originalSlides, startIndex, endIndex);
    
    set({ slides: reorderedSlides }); // Optimistic update

    const updates = reorderedSlides.map((slide, index) => ({
      id: slide.id,
      order: index + 1,
    }));
    
    const { error } = await supabase.from('slides').upsert(updates);

    if (error) {
        console.error("Failed to save new slide order:", error);
        set({ slides: originalSlides, generationError: "Could not save slide order." }); // Revert
    }
  },
  
  addSlide: async () => {
    const presentationId = get().slides[0]?.presentation_id;
    if (!presentationId) return;
    
    const newOrder = get().slides.length + 1;
    const { data, error } = await supabase
      .from('slides')
      .insert({ presentation_id: presentationId, order: newOrder, slide_number: newOrder, title: 'New Slide', points: ['Add content.'] })
      .select().single();
      
    if (error) {
        set({ generationError: "Failed to add new slide." });
    } else {
        set(state => ({ slides: [...state.slides, data], activeSlideId: data.id, currentSlideIndex: state.slides.length }));
    }
  },

  deleteSlide: async (id) => {
    const originalSlides = [...get().slides];
    const newSlides = originalSlides.filter(s => s.id !== id);
    set({ slides: newSlides });
    
    if (typeof id === 'number') {
        const { error } = await supabase.from('slides').delete().eq('id', id);
        if (error) {
            console.error('Failed to delete slide:', error);
            set({ slides: originalSlides, generationError: "Failed to delete slide." });
        }
    }
  },

  fetchHistory: async () => {
    set({ historyLoading: true });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ historyLoading: false, presentationsHistory: [] }); return; }

    const { data, error } = await supabase
      .from('presentations').select('id, title, created_at').eq('user_id', user.id).order('created_at', { ascending: false });
      
    if (!error) set({ presentationsHistory: data });
    set({ historyLoading: false });
  },

  loadPresentation: async (presentationId) => {
    const { data, error } = await supabase.from('slides').select('*').eq('presentation_id', presentationId).order('order', { ascending: true });
    if (!error && data.length > 0) {
      set({ slides: data, activeSlideId: data[0].id, currentSlideIndex: 0, generationError: '' });
      return true;
    }
    set({ generationError: 'Failed to load presentation.' });
    return false;
  },

  startPresentation: async (config) => {
    set({ isGenerating: true, generationError: '', generationStatus: 'Initializing...', slides: [] });
    
    const channelId = `generation-${uuidv4()}`;
    const channel = supabase.channel(channelId);
    
    channel
      .on('broadcast', { event: 'start' }, () => {
        set({ generationStatus: 'Generating content...' });
      })
      .on('broadcast', { event: 'complete' }, ({ payload }) => {
        get().loadPresentation(payload.presentationId);
        set({ isGenerating: false, generationStatus: 'Complete!' });
        get().fetchHistory();
        get().disconnectRealtimeChannel();
      })
      .on('broadcast', { event: 'error' }, ({ payload }) => {
        set({ generationError: payload.message, isGenerating: false, generationStatus: 'Error' });
        get().disconnectRealtimeChannel();
      })
      .subscribe();
      
    set({ realtimeChannel: channel });

    // The API route will handle the streaming and DB saving.
    // We just need to kick it off.
    fetch('/api/generate-presentation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, channelId }),
    });

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