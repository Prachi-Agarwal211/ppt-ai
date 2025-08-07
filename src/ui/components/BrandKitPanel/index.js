'use client';
import { useState } from 'react';
import { usePresentationStore } from '@/utils/store';

export default function BrandKitPanel() {
  const [colors, setColors] = useState({ primary_color: '', secondary_color: '', accent_color: '' });
  const setTheme = usePresentationStore(s => s.setTheme || ((t) => s => s));

  const apply = () => {
    setTheme({ ...colors });
  };

  return (
    <div className="space-y-3">
      <input className="w-full bg-white/5 p-2 rounded" placeholder="#primary" value={colors.primary_color} onChange={e => setColors(c => ({...c, primary_color: e.target.value}))} />
      <input className="w-full bg-white/5 p-2 rounded" placeholder="#secondary" value={colors.secondary_color} onChange={e => setColors(c => ({...c, secondary_color: e.target.value}))} />
      <input className="w-full bg-white/5 p-2 rounded" placeholder="#accent" value={colors.accent_color} onChange={e => setColors(c => ({...c, accent_color: e.target.value}))} />
      <button className="primary-button" onClick={apply}>Apply Brand Kit</button>
    </div>
  );
}

