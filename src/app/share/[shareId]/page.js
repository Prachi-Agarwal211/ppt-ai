import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { SharePresentationClient } from './SharePresentationClient';

// This is a SERVER COMPONENT. It runs on the server to securely fetch data.
export default async function SharePage({ params }) {
    const cookieStore = cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );

    // 1. Fetch the presentation using the unique 'share_id' from the URL.
    const { data: presentation, error: presError } = await supabase
        .from('presentations')
        .select('id, title, is_public, theme_bg_css, theme_primary_color')
        .eq('share_id', params.shareId)
        .single();
    
    // 2. SECURITY CHECK: If the presentation doesn't exist or if its 'is_public' flag is false,
    //    immediately render a 404 Not Found page. This prevents private presentations from being accessed.
    if (presError || !presentation || !presentation.is_public) {
        notFound();
    }

    // 3. If the presentation is valid and public, fetch its associated slides.
    const { data: slides, error: slidesError } = await supabase
        .from('slides')
        .select('id, elements, image_url, order')
        .eq('presentation_id', presentation.id)
        .order('order', { ascending: true });

    // If there's an error fetching slides or the presentation is empty, also render a 404 page.
    if (slidesError || !slides || slides.length === 0) {
        notFound();
    }
    
    // 4. Package the necessary data into a clean object to pass to the client component.
    const presentationData = {
        title: presentation.title,
        theme: {
            bg_css: presentation.theme_bg_css,
            primary_color: presentation.theme_primary_color,
        }
    };

    return (
        <main className="min-h-screen w-full bg-black flex flex-col items-center justify-center p-4 sm:p-8 font-sans">
            <header className="w-full max-w-5xl mx-auto mb-4 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-white">{presentationData.title}</h2>
            </header>
            
            {/* 5. Render the Client Component, passing the securely-fetched data as props. */}
            <SharePresentationClient slides={slides} presentation={presentationData} />
            
            <footer className="mt-4 text-gray-500 text-sm">
                Powered by <a href="/" className="font-semibold text-gray-400 hover:text-white transition-colors">Nether AI</a>
            </footer>
        </main>
    );
}