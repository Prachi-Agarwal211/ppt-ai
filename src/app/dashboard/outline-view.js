'use client';

// OutlineView per MASTER_PLAN Section 4.2 with chat refinement (Section 18)
import { useState } from 'react';
import { useAppStore } from '@/utils/zustand-store';

export default function OutlineView() {
  const blueprint = useAppStore((s) => s.presentation.blueprint);
  const updateBlueprintLocal = useAppStore((s) => s.updateBlueprintLocal);
  const generateRecipes = useAppStore((s) => s.generateRecipes);
  const refineBlueprintViaChat = useAppStore((s) => s.refineBlueprintViaChat);

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]); // local UI history
  const [aiUpdated, setAiUpdated] = useState(false);

  if (!blueprint) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">No blueprint yet. Go back to Idea.</div>
    );
  }

  const handleTitleChange = (idx, val) => {
    const slides = [...(blueprint.slides || [])];
    slides[idx] = { ...slides[idx], slide_title: val };
    updateBlueprintLocal({ ...blueprint, slides });
  };

  const handlePointsChange = (idx, val) => {
    const slides = [...(blueprint.slides || [])];
    slides[idx] = { ...slides[idx], content_points: val.split('\n').filter(Boolean).slice(0, 5) };
    updateBlueprintLocal({ ...blueprint, slides });
  };

  const sendChat = async () => {
    const msg = chatInput.trim();
    if (!msg) return;
    setChatHistory((h) => [...h, { role: 'user', content: msg, timestamp: new Date().toISOString() }]);

    // Extract @mentions like @slide(\d+)
    const mentionMatches = [...msg.matchAll(/@slide(\d+)/gi)].map((m) => m[1]);
    const mention_targets = mentionMatches.map((n) => `slide${n}`);
    const active_slide_id = mentionMatches.length === 1
      ? (blueprint.slides?.[Number(mentionMatches[0]) - 1]?.slide_id || null)
      : null;

    const updated = await refineBlueprintViaChat(msg, {
      active_slide_id,
      mention_targets,
    });

    if (updated) {
      setChatHistory((h) => [...h, { role: 'assistant', content: 'Applied your changes.', timestamp: new Date().toISOString() }]);
      // Trigger a brief highlight animation on the slide cards
      setAiUpdated(true);
      setTimeout(() => setAiUpdated(false), 1200);
    } else {
      setChatHistory((h) => [...h, { role: 'assistant', content: "That edit didn't go through. Try again or adjust your request.", timestamp: new Date().toISOString() }]);
    }
    setChatInput('');
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-3">
      <div className="lg:col-span-2 p-6 space-y-6 overflow-y-auto">
        {(blueprint.slides || []).map((s, idx) => (
          <div key={s.slide_id} className={`bg-white/5 border border-white/10 rounded p-4 ${aiUpdated ? 'ai-updated' : ''}`}>
            <label className="block text-sm text-white/60">Title</label>
            <input className="w-full bg-transparent border-b border-white/20 outline-none text-white text-xl" value={s.slide_title} onChange={(e) => handleTitleChange(idx, e.target.value)} />
            <label className="block text-sm text-white/60 mt-3">Points (one per line)</label>
            <textarea className="w-full bg-transparent border border-white/20 rounded p-2 text-white" rows={5} value={(s.content_points || []).join('\n')} onChange={(e) => handlePointsChange(idx, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="p-6 border-l border-white/10 bg-black/30 flex flex-col">
        <h3 className="text-lg font-semibold mb-2">AI Chat</h3>
        <div className="text-xs text-white/60 mb-4">Use @slideN to target a slide (e.g., @slide2). Edits are applied to the blueprint.</div>
        <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1">
          {chatHistory.map((m, i) => (
            <div key={i} className={`text-sm ${m.role === 'user' ? 'text-white' : 'text-white/80'}`}>{m.role === 'user' ? 'You: ' : 'AI: '}{m.content}</div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-2 text-white outline-none" placeholder="e.g., @slide3 add a bullet about audience benefits" />
          <button onClick={sendChat} className="primary-button">Send</button>
        </div>
        <hr className="my-4 border-white/10" />
        <button className="primary-button" onClick={() => generateRecipes()}>Finalize & Generate Presentation</button>
      </div>
    </div>
  );
}
