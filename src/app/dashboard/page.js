// --- FIX #1: This entire page must be a Client Component because it uses useState and useEffect.
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePresentationStore } from '@/utils/store';
import { createClient } from '@/utils/supabase/client';
import toast from 'react-hot-toast';

// --- FIX #2: Correcting the import paths to be robust and unambiguous.
import { Header } from '@/app/dashboard/components/header';
import { LeftSidebar } from '@/app/dashboard/components/LeftSidebar';
import { AIChatSidebar } from '@/app/dashboard/components/AIChatSidebar';
import { IdeaView } from '@/app/dashboard/components/IdeaView';
import { OutlineView } from '@/app/dashboard/components/OutlineView';
import DeckView from '@/app/dashboard/components/DeckView';
import { ShareModal } from '@/app/dashboard/components/ShareModal';
import dynamic from 'next/dynamic';

const PresentationView = dynamic(() => import('@/app/dashboard/components/PresentationView').then(mod => mod.PresentationView), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center text-white">Loading Presentation...</div>,
});

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    
    const { presentationId } = usePresentationStore();
    const [view, setView] = useState('idea'); 
    const [isShareModalOpen, setShareModalOpen] = useState(false);

    useEffect(() => {
        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) router.push('/');
        };
        checkUser();
    }, [supabase, router]);
    
    useEffect(() => {
        if (presentationId && view === 'idea') {
            setView('outline');
        }
        if (!presentationId) {
            setView('idea');
        }
    }, [presentationId, view]);

    const handleLogout = () => {
        toast.promise(supabase.auth.signOut(), {
            loading: 'Logging out...',
            success: () => { router.push('/'); return 'Logged out successfully.'; },
            error: 'Logout failed!',
        });
    };
    
    const renderMainEditorView = () => {
        const viewComponents = {
            outline: <OutlineView setView={setView} />,
            deck: <DeckView />,
            present: <PresentationView />,
        };
        return viewComponents[view] || <OutlineView setView={setView} />;
    };

    if (!presentationId) {
        return <IdeaView />;
    }

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
            <div className="flex flex-1 overflow-hidden">
                <aside className="w-80 flex-shrink-0 bg-black/30 border-r border-white/10 p-4 flex flex-col">
                    <LeftSidebar />
                </aside>
                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    {renderMainEditorView()}
                </main>
                <aside className="w-96 flex-shrink-0 bg-black/30 border-l border-white/10 p-4 flex flex-col">
                   <h3 className="text-xl font-semibold mb-4 text-gray-200 flex-shrink-0">AI Assistant</h3>
                   <AIChatSidebar />
                </aside>
            </div>
        </div>
    );
}
