import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { createClient } from '@supabase/supabase-js';

// This line forces the route to be fully dynamic, which is the correct approach.
export const dynamic = 'force-dynamic';
// Increase the max duration for streaming responses
export const maxDuration = 60; 

// A simple parser to find JSON objects in a stream
function findJsonObjects(str) {
    const objects = [];
    let braceCount = 0;
    let startIndex = -1;

    for (let i = 0; i < str.length; i++) {
        if (str[i] === '{') {
            if (braceCount === 0) {
                startIndex = i;
            }
            braceCount++;
        } else if (str[i] === '}') {
            braceCount--;
            if (braceCount === 0 && startIndex !== -1) {
                objects.push(str.substring(startIndex, i + 1));
                startIndex = -1;
            }
        }
    }
    return objects;
}


export async function POST(request) {
  const { content, slideCount, channelId } = await request.json(); // channelId is new
  const cookieStore = cookies();

  // Create a Supabase client for user auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  
  // Create a separate Admin client to broadcast messages from the server
  // This is secure because this code only runs on the server
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- Realtime Setup ---
  const channel = supabaseAdmin.channel(channelId);

  try {
    const topic = content;
    const masterPrompt = `
      You are an expert presentation creator. Your task is to generate a full ${slideCount}-slide presentation based on the topic provided below.

      --- USER TOPIC START ---
      ${topic}
      --- USER TOPIC END ---

      For each slide, you must provide:
        - "title": A string for the slide title.
        - "points": An array of 2 to 4 concise bullet points (strings).
        - "detailed_content": A single, rich, explanatory paragraph.
        - "image_suggestion": A descriptive suggestion for a relevant visual aid.

      Your entire output must be ONLY a single, raw JSON object in the following format, with no other text, markdown, or explanations.
      
      {
        "slides": [
          { "title": "...", "points": [], "detailed_content": "...", "image_suggestion": "..." },
          { "title": "...", "points": [], "detailed_content": "...", "image_suggestion": "..." }
        ]
      }
    `;

    // --- AI Call with Streaming ---
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'moonshotai/kimi-k2:free', 
            messages: [{ role: 'user', content: masterPrompt }],
            stream: true, // Enable streaming
        }),
    });
    
    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const stream = OpenAIStream(response, {
      async onCompletion(completion) {
        // This block runs after the entire stream is finished
        try {
            // Create the presentation entry in the database
            const { data: presentation, error: presError } = await supabase
                .from('presentations')
                .insert({ user_id: user.id, title: topic.substring(0, 70) })
                .select()
                .single();

            if (presError) throw presError;

            const jsonObjects = findJsonObjects(completion);
            const parsed = JSON.parse(jsonObjects[0]);
            const generatedSlides = parsed.slides;

            const slidesToInsert = generatedSlides.map((slide, idx) => ({
                presentation_id: presentation.id,
                slide_number: idx + 1,
                order: idx + 1,
                title: slide.title,
                points: slide.points,
                notes: slide.detailed_content, // Schema Change
                image_suggestion: slide.image_suggestion, // Schema Change
            }));

            const { error: slideError } = await supabase
                .from('slides')
                .insert(slidesToInsert);

            if (slideError) throw slideError;
            
            // Send a final "complete" message over the WebSocket channel
            await channel.send({
                type: 'broadcast',
                event: 'complete',
                payload: { presentationId: presentation.id },
            });
            console.log("Broadcasting generation complete.");

        } catch (dbError) {
            console.error("Error during onCompletion DB operations:", dbError);
            await channel.send({
                type: 'broadcast',
                event: 'error',
                payload: { message: 'Failed to save the presentation.' },
            });
        }
      },
    });

    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('API Route Error:', error);
     await channel.send({
        type: 'broadcast',
        event: 'error',
        payload: { message: error.message || 'An internal error occurred.' },
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}