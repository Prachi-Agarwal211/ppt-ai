import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
//
// FIX: THIS IS THE CORRECTED IMPORT. 'OpenAIStream' HAS BEEN REMOVED.
//
import { StreamingTextResponse } from 'ai';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// A more robust parser to find the main JSON object in a potentially messy stream
function findJsonObject(str) {
    const jsonRegex = /{\s*"slides"\s*:\s*\[[\s\S]*?\]\s*}/;
    const match = str.match(jsonRegex);
    return match ? match[0] : null;
}

export async function POST(request) {
  const { content, slideCount, channelId } = await request.json();
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
  
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const channel = supabaseAdmin.channel(channelId);

  try {
    const topic = content;
    const masterPrompt = `
      You are an expert presentation creator. Your task is to generate a full ${slideCount}-slide presentation based on the topic provided below.
      --- USER TOPIC START ---
      ${topic}
      --- USER TOPIC END ---
      For each slide, you must provide: "title", "points" (array of strings), "detailed_content", and "image_suggestion".
      Your entire output must be ONLY a single, raw JSON object in the format:
      { "slides": [ { "title": "...", "points": [], "detailed_content": "...", "image_suggestion": "..." } ] }
    `;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'moonshotai/kimi-k2:free',
            messages: [{ role: 'user', content: masterPrompt }],
            stream: true,
        }),
    });
    
    if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    // This ReadableStream replaces the old OpenAIStream logic.
    // It correctly handles the response and streams it to the client.
    const stream = new ReadableStream({
        async start(controller) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullCompletion = '';

            await channel.send({ type: 'broadcast', event: 'start' });

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                controller.enqueue(value);
                fullCompletion += chunk;
            }

            try {
                const { data: presentation, error: presError } = await supabase
                    .from('presentations')
                    .insert({ user_id: user.id, title: topic.substring(0, 70) })
                    .select()
                    .single();

                if (presError) throw presError;

                const jsonString = findJsonObject(fullCompletion);
                if (!jsonString) throw new Error("No valid JSON object found in AI response.");
                
                const parsed = JSON.parse(jsonString);
                const generatedSlides = parsed.slides;

                const slidesToInsert = generatedSlides.map((slide, idx) => ({
                    presentation_id: presentation.id,
                    slide_number: idx + 1,
                    order: idx + 1,
                    title: slide.title,
                    points: slide.points,
                    notes: slide.detailed_content,
                    image_suggestion: slide.image_suggestion,
                }));

                const { error: slideError } = await supabase.from('slides').insert(slidesToInsert);
                if (slideError) throw slideError;
                
                await channel.send({
                    type: 'broadcast',
                    event: 'complete',
                    payload: { presentationId: presentation.id },
                });

            } catch (dbError) {
                console.error("Error during stream completion DB operations:", dbError);
                await channel.send({
                    type: 'broadcast',
                    event: 'error',
                    payload: { message: `Failed to save the generated presentation. ${dbError.message}` },
                });
            } finally {
                await supabase.removeChannel(channel);
                controller.close();
            }
        }
    });

    return new StreamingTextResponse(stream);

  } catch (error) {
    console.error('API Route Error:', error);
    await channel.send({
        type: 'broadcast',
        event: 'error',
        payload: { message: error.message || 'An internal error occurred.' },
    });
    await supabase.removeChannel(channel);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}