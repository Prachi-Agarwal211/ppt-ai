'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { FiLoader } from 'react-icons/fi';
import { createClient } from '../../utils/supabase/client';
import { usePresentationStore } from '../../utils/store';

// Import components
import { LeftSidebar } from './components/LeftSidebar';
import { IdeaView } from './components/IdeaView';
import { OutlineView } from './components/OutlineView';
import { DeckView } from './components/DeckView';
import { HistorySidebar } from './components/HistorySidebar';
import { AIChatSidebar } from './components/AIChatSidebar';
import { Header } from './components/header';
import { ShareModal } from './components/ShareModal';

// Lazy load heavy components for better performance
const PresentationView = dynamic(() => import('./components/PresentationView').then(mod => mod.PresentationView));
const DesignView = dynamic(() => import('./components/DesignView').then(mod => mod.DesignView));

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const {
    slides, isGenerating, generationError, presentationsHistory,
    historyLoading, fetchHistory, loadPresentation
  } = usePresentationStore();

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('idea');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/');
      } else {
        setLoading(false);
        fetchHistory();
      }
    };
    checkUser();
  }, [router, fetchHistory, supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };
  
  const handleLoadHistoryItem = async (id) => {
    const success = await loadPresentation(id);
    if (success) setView('outline');
  };
  
  // A helper function to render the correct view component based on the current state
  const renderCurrentView = () => {
    switch (view) {
        case 'idea':
            return <IdeaView key="idea" onPresentationStarted={() => setView('outline')} />;
        case 'outline':
            return <OutlineView key="outline" onProceed={() => setView('deck')} />;
        case 'deck':
            return <DeckView key="deck" />;
        case 'design':
            return <DesignView key="design" />;
        default:
            return <IdeaView key="idea" onPresentationStarted={() => setView('outline')} />;
    }
  }

  if (loading) return <main className="min-h-screen w-full bg-black flex items-center justify-center"><FiLoader className="text-4xl animate-spin text-white" /></main>;

  return (
    <main className="h-screen w-full text-white flex flex-col font-sans relative overflow-hidden">
      <div className="relative z-10 flex flex-col flex-grow h-full">
        <Header view={view} setView={setView} onShare={() => setIsShareModalOpen(true)} onPresent={() => setView('presentation')} onLogout={handleLogout} />
        <div className="flex-grow flex overflow-hidden">
          <AnimatePresence>
            {(slides.length > 0) && ( 
              <motion.aside initial={{ width: 0, opacity: 0, padding: 0 }} animate={{ width: 288, opacity: 1, padding: '1rem' }} exit={{ width: 0, opacity: 0, padding: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="bg-black/20 border-r border-white/10 flex flex-col overflow-hidden"> 
                <LeftSidebar /> 
              </motion.aside> 
            )}
          </AnimatePresence>
          <main className="flex-grow p-6 flex flex-col overflow-y-auto">
            <AnimatePresence mode="wait"> 
              {renderCurrentView()} 
            </AnimatePresence>
          </main>
          <AnimatePresence>
            {isRightSidebarOpen && ( 
              <motion.aside initial={{ width: 0, opacity: 0, padding: 0 }} animate={{ width: 352, opacity: 1, padding: '1rem' }} exit={{ width: 0, opacity: 0, padding: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} className="w-88 bg-black/20 border-l border-white/10 flex flex-col overflow-hidden">
                {view === 'idea' ? <HistorySidebar history={presentationsHistory} onLoad={handleLoadHistoryItem} isLoading={historyLoading} /> : <AIChatSidebar />}
              </motion.aside> 
            )}
          </AnimatePresence>
        </div>
      </div>
      <PresentationView isVisible={view === 'presentation'} onClose={() => setView('deck')} />
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} />
    </main>
  );
}