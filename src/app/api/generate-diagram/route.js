import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request) {
    const { slideTitle, slidePoints } = await request.json();
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
    if (!slideTitle || !slidePoints) {
        return NextResponse.json({ error: 'Missing slide title or points' }, { status: 400 });
    }

    // 3. Create a specialized prompt for the AI
    const masterPrompt = `
      You are an expert in data visualization and an assistant specialized in creating Mermaid.js diagrams.
      Based on the title and bullet points of the presentation slide provided below, generate a single, clean Mermaid.js code block that visually represents the key concepts.

      RULES:
      - Your output must be ONLY the raw Mermaid.js code.
      - Do NOT include the \`\`\`mermaid markdown wrapper or any explanation.
      - The diagram should be a Top-Down graph (graph TD).
      - Keep the diagram clear and concise.

      --- SLIDE CONTENT ---
      Title: ${slideTitle}
      Points:
      - ${Array.isArray(slidePoints) ? slidePoints.join('\n- ') : slidePoints}
      --- END SLIDE CONTENT ---

      Generate the Mermaid.js code now.
    `;

    try {
        // 4. Call the AI service (non-streaming)
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'openai/gpt-3.5-turbo', // Using a fast model for this task
                messages: [{ role: 'user', content: masterPrompt }],
            }),
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        const diagramCode = data.choices[0].message.content.trim();

        // 5. Return the generated code to the client
        return NextResponse.json({ diagram: diagramCode });

    } catch (error) {
        console.error('Diagram Generation API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}