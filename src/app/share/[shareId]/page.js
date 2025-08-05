import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SharePresentationClient } from './SharePresentationClient'; // New client component

// This is a SERVER COMPONENT
export default async function SharePage({ params }) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    const { data: presentation, error: presError } = await supabase
        .from('presentations')
        .select('id, title, is_public')
        .eq('share_id', params.shareId)
        .single();
    
    // If presentation doesn't exist or isn't public, show a 404 page
    if (presError || !presentation || !presentation.is_public) {
        return notFound();
    }

    const { data: slides, error: slidesError } = await supabase
        .from('slides')
        .select('id, title, points')
        .eq('presentation_id', presentation.id)
        .order('order', { ascending: true });

    // If there's an error fetching slides or no slides exist, also 404
    if (slidesError || !slides || slides.length === 0) {
        return notFound();
    }

    return (
        <main className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
            <header className="w-full max-w-5xl mx-auto mb-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{presentation.title}</h2>
            </header>
            
            {/* We pass the server-fetched data as props to the client component */}
            <SharePresentationClient slides={slides} />
            
            <footer className="mt-4 text-gray-500 text-sm">
                Powered by <a href="/" className="font-semibold text-gray-400 hover:text-white transition-colors">Nether AI</a>
            </footer>
        </main>
    );
}