import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Chooses a free, capable model from OpenRouter for image generation.
const IMAGE_MODEL = "stabilityai/stable-diffusion-3-medium";

export async function POST(request) {
    const { imageSuggestion, slideId } = await request.json();
    const cookieStore = cookies();

    // 1. Authenticate the user
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { cookies: { get: (name) => cookieStore.get(name)?.value } }
    );
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate the input
    if (!imageSuggestion || !slideId) {
        return NextResponse.json({ error: 'Missing image suggestion or slide ID' }, { status: 400 });
    }

    // 3. Create a detailed prompt for the image model
    const masterPrompt = `Photorealistic, vibrant, cinematic shot of: ${imageSuggestion}. High-resolution, professional, 16:9 aspect ratio.`;

    try {
        // 4. Call the OpenRouter API for image generation
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: IMAGE_MODEL,
                messages: [{ role: 'user', content: masterPrompt }],
                // Add specific parameters for image generation if the model supports them
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`OpenRouter API error: ${response.statusText} - ${errorBody}`);
        }

        const data = await response.json();
        
        // Extract the generated image URL from the response.
        // NOTE: The exact path to the URL can vary between models.
        // This path is based on typical AI message structures.
        const imageUrl = data.choices[0]?.message?.content;

        if (!imageUrl || !imageUrl.startsWith('http')) {
             throw new Error('Failed to extract a valid image URL from the AI response.');
        }

        // 5. Update the specific slide in the database with the new image URL
        const { error: updateError } = await supabase
            .from('slides')
            .update({ image_url: imageUrl })
            .eq('id', slideId);

        if (updateError) {
            throw updateError;
        }

        // 6. Return the generated URL to the client for immediate UI update
        return NextResponse.json({ imageUrl });

    } catch (error) {
        console.error('Image Generation API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}