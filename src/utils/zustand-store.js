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

  // Angle → Blueprint
  chooseAngleAndBuildBlueprint: async (angle) => {
    const { presentation } = get();
    set({ isLoading: true, error: null });
    try {
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
        activeView: "outline",
        presentation: {
          ...state.presentation,
          chosenAngle: angle,
          blueprint: data,
        },
      }));
      // Persist after blueprint creation
      await get().savePresentation();
      return data;
    } catch (e) {
      set({ isLoading: false, error: e.message });
      return null;
    }
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
}));
