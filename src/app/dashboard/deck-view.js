'use client';

// DeckView per MASTER_PLAN Section 4.3
import { useAppStore } from '@/utils/zustand-store';
import { SlideRenderer } from '@/components/slide-renderer';

export default function DeckView() {
  const recipes = useAppStore((s) => s.presentation.slideRecipes);
  const activeIndex = useAppStore((s) => s.presentation.activeSlideIndex);
  const setActiveSlideIndex = useAppStore((s) => s.setActiveSlideIndex);

  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
  };

  if (!recipes || recipes.length === 0) {
    return <div className="min-h-screen flex items-center justify-center text-white/70">No recipes generated yet.</div>;
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-5">
      <div className="lg:col-span-1 p-4 space-y-2 overflow-y-auto bg-black/30 border-r border-white/10">
        {recipes.map((r, i) => (
          <button key={r.slide_id} onClick={() => setActiveSlideIndex(i)} className={`w-full text-left p-2 rounded border ${i === activeIndex ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'}`}>
            <div className="text-xs text-white/70">Slide {i + 1}</div>
            <div className="text-sm text-white truncate">{(r.elements || [])[0]?.content || 'Slide'}</div>
          </button>
        ))}
      </div>
      <div className="lg:col-span-3 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-white/80">Slide {activeIndex + 1} of {recipes.length}</div>
          <div className="flex gap-2">
            <button className="primary-button" onClick={enterFullscreen}>Present</button>
          </div>
        </div>
        <div className="aspect-video bg-black/30 border border-white/10 rounded">
          <SlideRenderer recipe={recipes[activeIndex]} />
        </div>
      </div>
      <div className="lg:col-span-1 p-6 border-l border-white/10 bg-black/30">
        <h3 className="text-lg font-semibold mb-2">AI Assistant (MVP)</h3>
        <p className="text-sm text-white/70">@slideN tweaks can be added later. For now, switch slides and review.</p>
      </div>
    </div>
  );
}
