import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// --- Environment Variable Validation ---
const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL', 
    'SUPABASE_SERVICE_ROLE_KEY', 
    'OPENROUTER_API_KEY',
    'PRESENTATION_MODEL', // Architect Model (e.g., Mistral Large)
    'DIAGRAM_MODEL',
    'IMAGE_MODEL',
    'THEME_MODEL',
    'INTERPRETATION_MODEL',
    'CONTENT_MODEL' // Content Specialist Model (e.g., Kimi K2)
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Increased timeout for long AI tasks

// Initialize the Supabase admin client for secure, server-side operations
const supabaseAdmin = missingEnvVars.length === 0
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// --- "AI ASSEMBLY LINE" WORKER FUNCTIONS ---

/**
 * PHASE 1: The Architect AI
 * Generates a strategic blueprint for the entire presentation.
 */
async function generatePresentationBlueprint(topic, slideCount) {
    const architectPrompt = `
      You are a world-class presentation strategist. Your task is to create a blueprint for a ${slideCount}-slide presentation on the topic: "${topic}".
      Your output must be ONLY a single, raw JSON object. Do not include any markdown wrappers or explanations.
      The JSON object must have this exact structure:
      {
        "title": "A short, engaging title for the entire presentation",
        "slides": [
          {
            "slide_title": "The title for slide 1",
            "visual_prompt": "A detailed, specific prompt for an image or diagram for this slide. Be descriptive. Example: 'A detailed flowchart diagram showing the 4 stages of cellular respiration, starting from Glycolysis.'"
          },
          {
            "slide_title": "The title for slide 2",
            "visual_prompt": "Another detailed prompt. Example: 'A photorealistic, cinematic image of a bustling, futuristic city with flying vehicles, symbolizing rapid technological advancement.'"
          }
        ]
      }
    `;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.PRESENTATION_MODEL, messages: [{ role: 'user', content: architectPrompt }], response_format: { type: "json_object" } }),
    });

    if (!response.ok) throw new Error(`Architect AI API call failed: ${response.statusText}`);
    const aiResponse = await response.json();
    return JSON.parse(aiResponse.choices[0].message.content);
}

/**
 * PHASE 2: The Content Factory
 * Generates detailed content for a single slide based on the blueprint.
 */
async function generateSlideContent(presentationTitle, slideTitle, visualPrompt) {
     const contentPrompt = `
        You are an expert content writer creating a slide for a presentation titled "${presentationTitle}".
        The title of this specific slide is "${slideTitle}".
        The key visual for this slide will be: "${visualPrompt}".

        Your task is to generate the speaker notes and bullet points for this slide.
        Your output must be ONLY a single, raw JSON object with this exact structure:
        {
          "notes": "Detailed speaker notes for the presenter. Provide context, explanations, and talking points related to the slide title and visual. Write at least two paragraphs.",
          "content_points": ["An array of 3 to 5 concise, impactful bullet points. Each point should directly relate to the slide's title."]
        }
        Do not include any markdown wrappers or explanations.
    `;
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.CONTENT_MODEL, messages: [{ role: 'user', content: contentPrompt }], response_format: { type: "json_object" } }),
    });

    if (!response.ok) throw new Error(`Content AI API call failed for slide "${slideTitle}": ${response.statusText}`);
    const aiResponse = await response.json();
    return JSON.parse(aiResponse.choices[0].message.content);
}


/**
 * The main handler that orchestrates the AI Assembly Line.
 */
async function handleGeneratePresentation(context, user) {
    const { topic, slideCount } = context;
    if (!topic || !slideCount) throw new Error("Missing topic or slide count for presentation generation.");

    // --- PHASE 1: Call the Architect AI to get the blueprint ---
    const blueprint = await generatePresentationBlueprint(topic, slideCount);
    const presentationTitle = blueprint.title;

    // --- PHASE 2 (Setup): Create the presentation and skeleton slides in the DB ---
    const { data: presentation, error: presError } = await supabaseAdmin
        .from('presentations')
        .insert({ user_id: user.id, title: presentationTitle })
        .select()
        .single();
    if (presError) throw presError;

    const skeletonSlides = blueprint.slides.map((slide, idx) => ({
        presentation_id: presentation.id,
        order: idx + 1,
        // Define the standard layout structure here
        elements: [
            { id: uuidv4(), type: 'title', content: slide.slide_title, position: {x: 5, y: 10}, size: {width: 90, height: 15} },
            { id: uuidv4(), type: 'content', content: [], position: {x: 10, y: 30}, size: {width: 80, height: 60} },
            // The visual prompt is stored as a special, non-rendered element
            { id: uuidv4(), type: 'image_suggestion', content: slide.visual_prompt }
        ],
        notes: "Generating..." // Placeholder notes
    }));

    const { data: insertedSlides, error: slideInsertError } = await supabaseAdmin
        .from('slides')
        .insert(skeletonSlides)
        .select();
    if (slideInsertError) throw slideInsertError;

    // --- PHASE 2 (Execution): Call the Content Factory for all slides in PARALLEL ---
    const contentGenerationPromises = insertedSlides.map(slide => {
        const titleElement = slide.elements.find(el => el.type === 'title');
        const imageSuggestionElement = slide.elements.find(el => el.type === 'image_suggestion');
        
        return generateSlideContent(presentationTitle, titleElement.content, imageSuggestionElement.content)
            .then(content => {
                const newElements = slide.elements.map(el => {
                    if (el.type === 'content') {
                        return { ...el, content: content.content_points };
                    }
                    return el;
                });
                
                // Update the specific slide in the DB with the generated content
                return supabaseAdmin
                    .from('slides')
                    .update({
                        elements: newElements,
                        notes: content.notes
                    })
                    .eq('id', slide.id);
            });
    });

    // Wait for all content generation and DB updates to complete
    await Promise.all(contentGenerationPromises);

    // The entire presentation is now generated and stored in the database.
    // Return the presentation ID to the client, which will then fetch the completed data.
    return { type: 'presentation_started', presentationId: presentation.id };
}

// --- ON-DEMAND SPECIALIST WORKER FUNCTIONS (UNCHANGED) ---

async function generateDiagram(context) {
    const { slideContext } = context;
    if (!slideContext) throw new Error("Missing slide context for diagram generation.");

    const codeGenPrompt = `You are a data visualization expert. Based on the slide content, choose the BEST syntax (mermaid, plantuml, d2, graphviz) to create a clear diagram. Return ONLY a JSON object with "syntax" and "code" keys. Content: ${JSON.stringify(slideContext)}`;
    const codeGenResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.DIAGRAM_MODEL, messages: [{ role: 'user', content: codeGenPrompt }] }),
    });
    if (!codeGenResponse.ok) throw new Error("AI failed to generate diagram code.");
    const diagramData = await codeGenResponse.json();
    const { syntax, code } = JSON.parse(diagramData.choices[0].message.content.trim().replace(/```json/g, '').replace(/```/g, ''));

    const krokiResponse = await fetch(`https://kroki.io/${syntax}/svg/${Buffer.from(code, 'utf8').toString('base64url')}`);
    if (!krokiResponse.ok) throw new Error(`Kroki failed to render the ${syntax} diagram.`);
    const svg = await krokiResponse.text();
    return { type: 'diagram', content: svg, syntax };
}

async function generateImage(context) {
    const { imageSuggestion, slideId } = context;
    if (!imageSuggestion || !slideId) throw new Error("Missing image suggestion or slide ID.");

    // The 'imageSuggestion' is now the high-quality prompt from the blueprint
    const masterPrompt = `Photorealistic, vibrant, cinematic shot of: ${imageSuggestion}. High-resolution, 16:9 aspect ratio.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.IMAGE_MODEL, messages: [{ role: 'user', content: masterPrompt }] }),
    });
    if (!response.ok) throw new Error("AI failed to generate an image.");
    
    const data = await response.json();
    // Assuming the image URL is in the response, adjust if the model returns it differently
    const imageUrl = data.choices[0]?.message?.content; 
    if (!imageUrl || !imageUrl.startsWith('http')) throw new Error('AI returned an invalid image URL.');

    await supabaseAdmin.from('slides').update({ image_url: imageUrl }).eq('id', slideId);
    return { type: 'image', imageUrl };
}

async function generateTheme(context) {
    const { presentationId, command } = context;
    if (!presentationId) throw new Error("Missing presentation ID for theme generation.");

    const themeGenPrompt = `You are a UI/UX designer. Create a theme for a presentation. Style Hint: "${command}". Output ONLY a raw JSON object with keys: "bg_css", "primary_color", "secondary_color", "accent_color". Example values are CSS gradients for bg_css and hex codes for colors.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.THEME_MODEL, messages: [{ role: 'user', content: themeGenPrompt }] }),
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
    if (!supabaseAdmin || missingEnvVars.length > 0) {
        const errorMessage = `Server configuration error: The following environment variables are missing: ${missingEnvVars.join(', ')}`;
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const { task, context } = await request.json();
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
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let finalTask = task;
        if (task === 'interpret_chat') {
            const interpretationPrompt = `You are an AI task orchestrator. Analyze the user's command and context, then return a JSON object with a "task" key. The task must be one of: "generate_diagram", "generate_theme", "generate_image", "generate_presentation", or "clarify". Command: "${context.command}"`;
            const brainResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: process.env.INTERPRETATION_MODEL, messages: [{ role: 'user', content: interpretationPrompt }] }),
            });
            if (!brainResponse.ok) throw new Error("AI Brain failed to interpret command.");
            const decision = await brainResponse.json();
            const { task: decidedTask } = JSON.parse(decision.choices[0].message.content.trim().replace(/```json/g, '').replace(/```/g, ''));
            finalTask = decidedTask;
        }

        let result;
        switch (finalTask) {
            case 'generate_presentation':
                result = await handleGeneratePresentation(context, user);
                break;
            case 'generate_diagram':
                result = await generateDiagram(context);
                break;
            case 'generate_theme':
                result = await generateTheme(context);
                break;
            case 'generate_image':
                result = await generateImage(context);
                break;
            default:
                result = { type: 'clarification', message: "I'm not sure how to handle that. Could you be more specific?" };
        }
        
        return NextResponse.json(result);

    } catch (error) {
        console.error('AI Command Error:', error.message, error.stack);
        return NextResponse.json({ error: error.message || 'An internal server error has occurred.' }, { status: 500 });
    }
}