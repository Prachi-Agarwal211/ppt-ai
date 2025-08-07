'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePresentationStore } from '@/utils/store';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

import { Header } from './components/header';
import { LeftSidebar } from './components/LeftSidebar';
import { HistorySidebar } from './components/HistorySidebar';
import { AIChatSidebar } from './components/AIChatSidebar';
import { IdeaView } from './components/IdeaView';
import { OutlineView } from './components/OutlineView';
import { DesignView } from './components/DesignView';
import DeckView from './components/DeckView';
import { ShareModal } from './components/ShareModal';
import dynamic from 'next/dynamic';

const PresentationView = dynamic(() => import('./components/PresentationView').then(mod => mod.PresentationView), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-white">Loading Presentation...</div>,
});

const viewComponents = {
    idea: IdeaView,
    outline: OutlineView,
    deck: DeckView,
    design: DesignView,
    present: PresentationView,
};

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    const { 
        loadPresentation, 
        fetchHistory, 
        presentationsHistory, 
        historyLoading,
        slides,
        isGenerating
    } = usePresentationStore();

    const [view, setView] = useState('idea'); 
    const [rightPanelView, setRightPanelView] = useState('ai');
    const [isShareModalOpen, setShareModalOpen] = useState(false);

    useEffect(() => {
        const checkUserAndFetchHistory = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) router.push('/');
            else fetchHistory();
        };
        checkUserAndFetchHistory();
    }, [supabase, router, fetchHistory]);
    
    useEffect(() => {
        if (slides.length > 0 && view === 'idea' && !isGenerating) {
            setView('outline');
        }
    }, [slides, view, isGenerating]);

    const handleLogout = () => {
        toast.promise(supabase.auth.signOut(), {
            loading: 'Logging out...',
            success: () => { router.push('/'); return 'Logged out successfully.'; },
            error: 'Logout failed!',
        });
    };
    
    // This function now handles rendering for all main content views.
    const renderMainView = () => {
        const Component = viewComponents[view] || IdeaView;
        const props = {
            onPresentationStarted: () => setView('outline'),
            onProceed: () => setView('deck'),
        };
        return <Component {...props} />;
    };
    
    const renderRightPanel = () => {
        return rightPanelView === 'ai' 
            ? <AIChatSidebar /> 
            : <HistorySidebar history={presentationsHistory} onLoad={loadPresentation} isLoading={historyLoading} />;
    };

    return (
        <div className="flex flex-col h-screen bg-transparent text-white font-sans overflow-hidden">
            <ShareModal isOpen={isShareModalOpen} onClose={() => setShareModalOpen(false)} />
            <Header
                view={view}
                setView={setView}
                onShare={() => setShareModalOpen(true)}
                onPresent={() => setView('present')}
                onLogout={handleLogout}
            />

            {/* Conditional layout for fullscreen presentation mode */}
            {view === 'present' ? (
                 <main className="flex-1 bg-black">{renderMainView()}</main>
            ) : (
                /* The default 3-panel layout is now always active */
                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel */}
                    <aside className="w-80 flex-shrink-0 bg-black/30 border-r border-white/10 p-4 flex flex-col">
                        <LeftSidebar />
                    </aside>
                    
                    {/* Center Panel */}
                    <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                        {renderMainView()}
                    </main>
                    
                    {/* Right Panel */}
                    <aside className="w-96 flex-shrink-0 bg-black/30 border-l border-white/10 p-4 flex flex-col">
                        <div className="flex-shrink-0 mb-4 flex gap-1 p-1 bg-black/30 rounded-full border border-white/10">
                             <button onClick={() => setRightPanelView('ai')} className={`flex-1 py-2 text-sm rounded-full transition-colors ${rightPanelView === 'ai' ? 'bg-white/10' : 'hover:bg-white/5 text-gray-400'}`}>AI Assistant</button>
                             <button onClick={() => setRightPanelView('history')} className={`flex-1 py-2 text-sm rounded-full transition-colors ${rightPanelView === 'history' ? 'bg-white/10' : 'hover:bg-white/5 text-gray-400'}`}>History</button>
                        </div>
                        <div className="flex-grow overflow-hidden flex flex-col">
                            {renderRightPanel()}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}