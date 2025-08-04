import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// This line forces the route to be fully dynamic, which is the correct approach.
export const dynamic = 'force-dynamic';

// --- MAIN API HANDLER ---
export async function POST(request) {
  const { type, content, slideCount } = await request.json();
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = user.id;

  try {
    const topic = content;

    const masterPrompt = `
      You are an expert presentation creator. Your task is to generate a full ${slideCount}-slide presentation about "${topic}".

      For each slide:
        - "title": string
        - "points": array of 2–4 concise bullet points
        - "detailed_content": one rich explanatory paragraph
        - "image_suggestion": descriptive visual idea

      Output ONLY a JSON object in this format:
      {
        "slides": [
          {
            "title": "Exact Slide Title",
            "points": ["Point 1", "Point 2"],
            "detailed_content": "A complete paragraph with depth and clarity.",
            "image_suggestion": "A futuristic diagram showing..."
          }
        ]
      }

      ⚠️ No markdown, no explanations, no extra text — only raw JSON.
    `;

    const rawOutput = await callOpenRouter(masterPrompt);
    
    const cleaned = rawOutput
      .replace(/^```json\s*|```$/g, '')
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse JSON from AI:", cleaned);
      throw new Error("AI returned invalid JSON. Please try again.");
    }

    const { slides: generatedSlides } = parsed;

    const { data: presentation, error: presError } = await supabase
      .from('presentations')
      .insert({ user_id: userId, title: topic.substring(0, 70) + '...' })
      .select()
      .single();

    if (presError) throw presError;

    const slidesToInsert = generatedSlides.map((slide, idx) => ({
      presentation_id: presentation.id,
      slide_number: idx + 1,
      order: idx + 1,
      title: slide.title,
      points: slide.points,
      notes: `${slide.detailed_content}\n\n---\nImage Suggestion: ${slide.image_suggestion}`,
    }));

    const { data: insertedSlides, error: slideError } = await supabase
      .from('slides')
      .insert(slidesToInsert)
      .select();

    if (slideError) throw slideError;

    return NextResponse.json({ slides: insertedSlides });

  } catch (error) {
    console.error('API Route Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// --- OPENROUTER CALLER ---
async function callOpenRouter(prompt) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 70_000); // 70s timeout

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // THE FIX: Switched to the model you requested.
        model: 'moonshotai/kimi-k2:free', 
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 4096,
        top_p: 0.9,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('The AI model timed out. Please try again with a simpler topic or fewer slides.');
    }
    throw err;
  }
}

// ✅ CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}