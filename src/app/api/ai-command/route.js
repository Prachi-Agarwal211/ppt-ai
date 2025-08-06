import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';

// Configuration for the API route
export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Increased timeout for long AI tasks like presentation generation

// Initialize the Supabase admin client for secure, server-side operations
const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// --- WORKER FUNCTIONS (The "Sub-AIs") ---

/**
 * WORKER: Generates a brand new presentation from a topic.
 * @param {object} context - Contains topic and slideCount.
 * @param {object} user - The authenticated Supabase user.
 * @returns {object} An object containing the new presentation's ID.
 */
async function handleGeneratePresentation(context, user) {
    const { topic, slideCount } = context;
    if (!topic || !slideCount) throw new Error("Missing topic or slide count for presentation generation.");

    const masterPrompt = `
      You are an expert presentation creator. Generate a full ${slideCount}-slide presentation on the topic: "${topic}".
      Your entire output must be ONLY a single, raw JSON object in the format: { "slides": [ ... ] }.
      
      For each slide, you must generate an "elements" array. Each element in the array is an object with these properties:
      - "id": A unique UUID string for the element.
      - "type": Can be "title", "content", or "image_suggestion".
      - "content": A string for "title" and "image_suggestion", or an array of strings (bullet points) for "content".
      - "position": An object with "x" and "y" coordinates (from 0 to 100).
      - "size": An object with "width" and "height" dimensions (from 0 to 100).

      RULES:
      - Every slide MUST have one "title" element and one "image_suggestion" element.
      - Position elements logically (e.g., title at top, content below).
      - Do not include markdown wrappers or any explanations.
    `;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'moonshotai/kimi-k2:free', messages: [{ role: 'user', content: masterPrompt }] }),
    });

    if (!response.ok) throw new Error("AI failed to generate presentation content.");
    
    const aiResponse = await response.json();
    const jsonString = aiResponse.choices[0].message.content.trim().match(/{\s*"slides"\s*:\s*\[[\s\S]*?\]\s*}/)[0];
    const parsed = JSON.parse(jsonString);
    
    const { data: presentation, error: presError } = await supabaseAdmin.from('presentations').insert({ user_id: user.id, title: topic.substring(0, 70) }).select().single();
    if (presError) throw presError;

    const slidesToInsert = parsed.slides.map((slide, idx) => ({
        presentation_id: presentation.id,
        order: idx + 1,
        elements: slide.elements,
    }));

    const { error: slideError } = await supabaseAdmin.from('slides').insert(slidesToInsert);
    if (slideError) throw slideError;

    return { type: 'presentation_started', presentationId: presentation.id };
}

/**
 * WORKER: Generates a diagram SVG using Kroki for maximum compatibility and quality.
 * @param {object} context - Contains slideContext (title, points).
 * @returns {object} An object containing the diagram SVG and syntax used.
 */
async function generateDiagram(context) {
    const { slideContext } = context;
    if (!slideContext) throw new Error("Missing slide context for diagram generation.");

    const codeGenPrompt = `You are a data visualization expert. Based on the slide content, choose the BEST syntax (mermaid, plantuml, d2, graphviz) to create a clear and professional diagram. Return ONLY a JSON object with "syntax" and "code" keys. Content: ${JSON.stringify(slideContext)}`;
    const codeGenResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'google/gemma-2-9b-it:free', messages: [{ role: 'user', content: codeGenPrompt }] }),
    });
    if (!codeGenResponse.ok) throw new Error("AI failed to generate diagram code.");
    const diagramData = await codeGenResponse.json();
    const { syntax, code } = JSON.parse(diagramData.choices[0].message.content.trim().replace(/```json/g, '').replace(/```/g, ''));

    const krokiResponse = await fetch(`https://kroki.io/${syntax}/svg/${Buffer.from(code, 'utf8').toString('base64url')}`);
    if (!krokiResponse.ok) throw new Error(`Kroki failed to render the ${syntax} diagram.`);
    const svg = await krokiResponse.text();
    return { type: 'diagram', content: svg, syntax };
}

/**
 * WORKER: Generates an image URL for the current slide.
 * @param {object} context - Contains imageSuggestion and slideId.
 * @returns {object} An object containing the generated image URL.
 */
async function generateImage(context) {
    const { imageSuggestion, slideId } = context;
    if (!imageSuggestion || !slideId) throw new Error("Missing image suggestion or slide ID.");

    const masterPrompt = `Photorealistic, vibrant, cinematic shot of: ${imageSuggestion}. High-resolution, 16:9 aspect ratio.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'stabilityai/stable-diffusion-3-medium', messages: [{ role: 'user', content: masterPrompt }] }),
    });
    if (!response.ok) throw new Error("AI failed to generate an image.");
    
    const data = await response.json();
    const imageUrl = data.choices[0]?.message?.content;
    if (!imageUrl || !imageUrl.startsWith('http')) throw new Error('AI returned an invalid image URL.');

    await supabaseAdmin.from('slides').update({ image_url: imageUrl }).eq('id', slideId);
    return { type: 'image', imageUrl };
}

/**
 * WORKER: Generates a new theme for the entire presentation.
 * @param {object} context - Contains presentationId and a style hint from the user command.
 * @returns {object} An object containing the new theme data.
 */
async function generateTheme(context) {
    const { presentationId, command } = context;
    if (!presentationId) throw new Error("Missing presentation ID for theme generation.");

    const themeGenPrompt = `You are a UI/UX designer. Create a theme for a presentation. Style Hint: "${command}". Output ONLY a raw JSON object with keys: "bg_css", "primary_color", "secondary_color", "accent_color".`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'google/gemma-2-9b-it:free', messages: [{ role: 'user', content: themeGenPrompt }] }),
    });
    if (!response.ok) throw new Error("AI failed to generate a theme.");
    const theme = JSON.parse((await response.json()).choices[0].message.content.trim());

    await supabaseAdmin.from('presentations').update({
        theme_bg_css: theme.bg_css,
        theme_primary_color: theme.primary_color,
        theme_secondary_color: theme.secondary_color,
        theme_accent_color: theme.accent_color,
    }).eq('id', presentationId);
    
    return { type: 'theme', theme };
}


// --- "SUPER AI" API ROUTE (The Command Center) ---
export async function POST(request) {
    const { task, context } = await request.json();
    const cookieStore = cookies();
    const { data: { user } } = await createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { get: (name) => cookieStore.get(name)?.value } }).auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        let finalTask = task;
        let finalContext = context;

        // If the task comes from chat, we use the AI brain to determine the real task.
        if (task === 'interpret_chat') {
            const interpretationPrompt = `You are an AI task orchestrator. Analyze the user's command and context, then return a JSON object with a "task" key. The task must be one of: "generate_diagram", "generate_theme", "generate_image", "generate_presentation", or "clarify". Command: "${context.command}"`;
            const brainResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'mistralai/mistral-large', messages: [{ role: 'user', content: interpretationPrompt }] }),
            });
            if (!brainResponse.ok) throw new Error("AI Brain failed to interpret command.");
            const decision = await brainResponse.json();
            const { task: decidedTask } = JSON.parse(decision.choices[0].message.content.trim().replace(/```json/g, '').replace(/```/g, ''));
            finalTask = decidedTask;
        }

        let result;
        switch (finalTask) {
            case 'generate_presentation':
                result = await handleGeneratePresentation(finalContext, user);
                break;
            case 'generate_diagram':
                result = await generateDiagram(finalContext);
                break;
            case 'generate_theme':
                result = await generateTheme(finalContext);
                break;
            case 'generate_image':
                result = await generateImage(finalContext);
                break;
            default:
                return NextResponse.json({ type: 'clarification', message: "I'm not sure how to handle that. Could you be more specific?" });
        }
        
        return NextResponse.json(result);

    } catch (error) {
        console.error('AI Command Error:', error.message);
        return NextResponse.json({ error: error.message || 'An internal server error has occurred.' }, { status: 500 });
    }
}