// src/app/dashboard/page.js
'use client';

// Dashboard controller shell per MASTER_PLAN Section 1.2 and 3.1
// Manages activeView and nests Idea, Outline, and Deck views.

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase-client';
import { useAppStore } from '@/utils/zustand-store';
import IdeaView from './idea-view';
import OutlineView from './outline-view';
import DeckView from './deck-view';

export default function DashboardPage() {
  const supabase = createClient();
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  // Lightweight auth check per Section 8
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Redirect client-side to login
        window.location.href = '/';
      }
    })();
  }, [supabase]);

  const renderView = () => {
    switch (activeView) {
      case 'outline':
        return <OutlineView />;
      case 'deck':
        return <DeckView />;
      default:
        return <IdeaView />;
    }
  };

  return (
    <div className="min-h-screen text-white">
      {renderView()}
    </div>
  );
}
