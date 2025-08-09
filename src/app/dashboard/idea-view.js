'use client';

// IdeaView per MASTER_PLAN Section 4.1
import { useEffect, useState } from 'react';
import { useAppStore } from '@/utils/zustand-store';

export default function IdeaView() {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(7);
  const isLoading = useAppStore((s) => s.isLoading);
  const setActiveView = useAppStore((s) => s.setActiveView);
  const generateAngles = useAppStore((s) => s.generateAngles);
  const chooseAngleAndBuildBlueprint = useAppStore((s) => s.chooseAngleAndBuildBlueprint);
  const presentation = useAppStore((s) => s.presentation);
  const history = useAppStore((s) => s.history);
  const loadHistory = useAppStore((s) => s.loadHistory);

  const [angles, setAngles] = useState([]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const onGenerate = async () => {
    const res = await generateAngles(topic.trim());
    setAngles(res || []);
  };

  const onPickAngle = async (angle) => {
    // store desired slide count into state before generating blueprint
    useAppStore.setState((state) => ({ presentation: { ...state.presentation, slideCount } }));
    const bp = await chooseAngleAndBuildBlueprint(angle);
    if (bp) setActiveView('outline');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 min-h-screen">
      <div className="p-8 flex items-center justify-center bg-black/20">
        <div className="w-full max-w-xl">
          <h1 className="text-3xl font-bold mother-of-pearl-text mb-2">Idea & Blueprint</h1>
          <p className="text-white/70 mb-4">Enter a topic. We will suggest strategic angles.</p>
          <textarea
            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white mb-4"
            rows={4}
            placeholder="Your topic..."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <label className="block text-sm text-white/70">Slide count: {slideCount}</label>
          <input type="range" min={3} max={15} value={slideCount} onChange={(e) => setSlideCount(Number(e.target.value))} className="w-full mb-4" />
          <button onClick={onGenerate} disabled={isLoading || !topic.trim()} className="primary-button">{isLoading ? 'Generating…' : 'Generate Angles'}</button>
        </div>
      </div>
      <div className="p-8 bg-black/30 border-l border-white/10 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-2">Angles</h2>
        <div className="space-y-3 mb-8">
          {(angles || presentation.strategicAngles || []).map((a) => (
            <button key={a.angle_id} onClick={() => onPickAngle(a)} className="w-full text-left bg-white/5 hover:bg-white/10 transition p-3 rounded border border-white/10">
              <div className="font-semibold">{a.title}</div>
              <div className="text-sm text-white/70">{a.description}</div>
              <div className="text-xs text-white/50 mt-1">Audience: {a.audience}</div>
            </button>
          ))}
        </div>
        <h3 className="text-lg font-semibold mb-2">History</h3>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {(history || []).map((h) => (
            <div key={h.id} className="bg-white/5 border border-white/10 rounded p-3">
              <div className="text-sm text-white truncate">{h.topic || 'Untitled'}</div>
              <div className="text-xs text-white/60">{new Date(h.updated_at).toLocaleString()}</div>
              <div className="text-xs text-white/50">{h.status || 'idea'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
