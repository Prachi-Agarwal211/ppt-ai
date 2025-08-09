"use client";

import { create } from "zustand";
import { createClient } from "@/utils/supabase-client";

// Simplified global state based on MASTER_PLAN Parts 1–4
export const useAppStore = create((set, get) => ({
  activeView: "idea", // 'idea' | 'outline' | 'deck'
  isLoading: false,
  error: null,
  presentation: {
    id: null,
    topic: "",
    strategicAngles: [],
    chosenAngle: null,
    slideCount: 10,
    blueprint: null,
    slideRecipes: [],
    activeSlideIndex: 0,
  },
  history: [],
  chatHistory: [], // rolling last N messages for refine
  _autosaveTimer: null,

  setActiveView: (view) => set({ activeView: view }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  setActiveSlideIndex: (i) =>
    set((state) => ({
      presentation: {
        ...state.presentation,
        activeSlideIndex: Math.max(0, Math.min(i, (state.presentation.slideRecipes?.length || 1) - 1)),
      },
    })),

  // History loader (minimal list)
  loadHistory: async () => {
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('presentations')
        .select('id, topic, updated_at, status')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      set({ history: data || [] });
    } catch (e) {
      // non-blocking
      set({ history: [] });
    }
  },

  // Persistence helper per Section 9.2
  savePresentation: async () => {
    const supabase = createClient();
    const { presentation } = get();
    const upsert = {
      id: presentation.id || undefined,
      topic: presentation.topic,
      chosen_angle: presentation.chosenAngle,
      slide_count: presentation.slideCount,
      blueprint: presentation.blueprint,
      recipes: presentation.slideRecipes,
      updated_at: new Date().toISOString(),
      status: get().activeView === 'deck' ? 'deck' : get().activeView === 'outline' ? 'outline' : 'idea',
    };
    try {
      const { data, error } = await supabase.from('presentations').upsert(upsert).select('id').single();
      if (error) throw error;
      if (data?.id && !presentation.id) {
        set((state) => ({ presentation: { ...state.presentation, id: data.id } }));
      }
      return data?.id || presentation.id;
    } catch (e) {
      // Non-blocking per Section 10 – user can continue locally
      console.warn('savePresentation failed:', e.message);
      return presentation.id;
    }
  },

  // debounce/autosave blueprint edits
  _scheduleAutosave: () => {
    const existing = get()._autosaveTimer;
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      get().savePresentation();
      set({ _autosaveTimer: null });
    }, 2000);
    set({ _autosaveTimer: timer });
  },

  // Idea → Angles
  generateAngles: async (topic) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_angles", payload: { topic } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate angles");
      set((state) => ({
        isLoading: false,
        presentation: {
          ...state.presentation,
          topic,
          strategicAngles: data.angles || [],
        },
      }));
      return data.angles || [];
    } catch (e) {
      set({ isLoading: false, error: e.message });
      return [];
    }
  },

  // Angle → Blueprint with Phase 2 instant navigation
  chooseAngleAndBuildBlueprint: async (angle) => {
    const { presentation } = get();
    
    // Phase 2.1: Navigate immediately to outline view with loading state
    set((state) => ({
      activeView: "outline",
      isLoading: true,
      error: null,
      presentation: {
        ...state.presentation,
        chosenAngle: angle,
        blueprint: null, // Set to loading state
      },
    }));

    // Phase 2.3 & 2.4: Generate blueprint with streaming for real-time updates
    const generateInBackground = async () => {
      try {
        const useStreaming = true; // Enable streaming for better UX
        
        if (useStreaming) {
          const res = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "generate_blueprint",
              payload: { topic: presentation.topic, angle, slideCount: presentation.slideCount, stream: true },
            }),
          });
          
          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to generate blueprint");
          }
          
          // Phase 2.4: Process streaming response
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let blueprintData = { slides: [] };
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            
            // Process complete lines
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line in buffer
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'metadata') {
                    // Initialize blueprint with metadata
                    blueprintData = {
                      topic: data.topic,
                      chosen_angle: data.chosen_angle,
                      slide_count: data.slide_count,
                      theme: data.theme,
                      slides: []
                    };
                  } else if (data.type === 'slide') {
                    // Add slide incrementally
                    blueprintData.slides.push(data);
                    
                    // Update state with current progress
                    set((state) => ({
                      presentation: {
                        ...state.presentation,
                        blueprint: { ...blueprintData },
                      },
                    }));
                  } else if (data.type === 'complete') {
                    // Streaming complete
                    set({ isLoading: false });
                    
                    // Persist final blueprint
                    await get().savePresentation();
                    return blueprintData;
                  } else if (data.type === 'error') {
                    throw new Error(data.error);
                  }
                } catch (parseError) {
                  console.warn('Failed to parse streaming data:', parseError);
                }
              }
            }
          }
        } else {
          // Fallback to non-streaming
          const res = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "generate_blueprint",
              payload: { topic: presentation.topic, angle, slideCount: presentation.slideCount },
            }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to generate blueprint");
          
          set((state) => ({
            isLoading: false,
            presentation: {
              ...state.presentation,
              blueprint: data,
            },
          }));
          
          // Persist after blueprint creation
          await get().savePresentation();
          return data;
        }
      } catch (e) {
        set({ isLoading: false, error: e.message });
        return null;
      }
    };

    // Start generation but don't await it - let navigation happen instantly
    generateInBackground();
    return angle; // Return the angle to indicate successful navigation
  },

  updateBlueprintLocal: (patch) => {
    set((state) => ({
      presentation: {
        ...state.presentation,
        blueprint: { ...state.presentation.blueprint, ...patch },
      },
    }));
    get()._scheduleAutosave();
  },

  refineBlueprintViaChat: async (message, context = {}) => {
    const { presentation, chatHistory } = get();
    const newHistory = [...chatHistory, { role: 'user', content: String(message).slice(0, 1000) }].slice(-10);
    set({ chatHistory: newHistory, isLoading: true, error: null });
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refine_blueprint",
          payload: {
            blueprint: presentation.blueprint,
            chatHistory: newHistory,
            context,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to refine blueprint");
      set((state) => ({
        isLoading: false,
        presentation: {
          ...state.presentation,
          blueprint: data,
        },
        chatHistory: [...newHistory, { role: 'assistant', content: 'Applied changes' }].slice(-10),
      }));
      // Persist after refinement
      await get().savePresentation();
      return data;
    } catch (e) {
      set({ isLoading: false, error: e.message });
      return null;
    }
  },

  generateRecipes: async () => {
    const { presentation } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate_recipes", payload: { blueprint: presentation.blueprint } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate slide recipes");
      set((state) => ({
        isLoading: false,
        activeView: "deck",
        presentation: {
          ...state.presentation,
          slideRecipes: data.recipes || [],
          activeSlideIndex: 0,
        },
      }));
      // Persist after recipes
      await get().savePresentation();
      return data.recipes || [];
    } catch (e) {
      set({ isLoading: false, error: e.message });
      return [];
    }
  },

  // Phase 4.2: Export presentation as PPTX
  exportToPPTX: async () => {
    const { presentation } = get();
    if (!presentation.blueprint || !presentation.slideRecipes) {
      throw new Error('Presentation must be complete to export');
    }

    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentation: {
            topic: presentation.topic,
            chosen_angle: presentation.chosenAngle,
            slide_count: presentation.slideCount
          },
          recipes: presentation.slideRecipes
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(presentation.topic || 'presentation').replace(/[^a-zA-Z0-9]/g, '_')}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      set({ isLoading: false });
      return true;
    } catch (e) {
      set({ isLoading: false, error: e.message });
      throw e;
    }
  },
}));
