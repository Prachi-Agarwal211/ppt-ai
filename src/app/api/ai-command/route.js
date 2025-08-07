import { NextResponse } from 'next/server';
import { Buffer } from 'buffer';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { v4 as uuidv4 } from 'uuid';

// --- Environment Variable Validation ---
const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
    // --- FIX: Use stronger, more specialized models for each task ---
    'ARCHITECT_MODEL',      // Recommend: "openai/gpt-4o" or "anthropic/claude-3-opus"
    'CONTENT_MODEL',        // Recommend: "anthropic/claude-3-sonnet" or "google/gemini-pro"
    'DIAGRAM_MODEL',        // Recommend: "openai/gpt-4-turbo"
    'IMAGE_MODEL',          // Keep: "stabilityai/stable-diffusion-3-medium" is good
    'THEME_MODEL',          // Recommend: "anthropic/claude-3-haiku"
    'INTERPRETATION_MODEL'  // Recommend: "anthropic/claude-3-haiku"
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Increased timeout for potentially longer AI generation

const supabaseAdmin = missingEnvVars.length === 0
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// --- FIX #1: A vastly improved prompt for the Architect AI ---
async function generatePresentationBlueprint(topic, slideCount) {
    const architectPrompt = `
      You are a world-class presentation strategist and content architect. Your task is to create a detailed, logical, and engaging blueprint for a ${slideCount}-slide presentation on the topic: "${topic}".

      Your output MUST be ONLY a single, raw JSON object. Do not include any markdown wrappers, comments, or explanations.
      The JSON object must follow this exact schema:
      {
        "title": "A short, engaging, and professional title for the entire presentation. Max 60 characters.",
        "slides": [
          {
            "slide_title": "A clear and concise title for this slide.",
            "visual_prompt": "A detailed, specific, and creative prompt for an image or diagram. The prompt should be suitable for a text-to-image AI (like Stable Diffusion) or a diagramming AI. Be descriptive. Example for an image: 'A photorealistic image of a vintage astronaut helmet resting on Martian soil, with Earth visible in the distant sky.' Example for a diagram: 'A MermaidJS flowchart diagram showing the 4 stages of cellular respiration, starting from Glycolysis and ending with the Electron Transport Chain.'"
          }
        ]
      }
      Ensure the flow of the presentation is logical, starting with an introduction, building through the main points, and ending with a strong conclusion.
    `;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        // --- FIX: Use the new, more powerful model from your environment variables ---
        body: JSON.stringify({ model: process.env.ARCHITECT_MODEL, messages: [{ role: 'user', content: architectPrompt }], response_format: { type: "json_object" } }),
    });

    if (!response.ok) throw new Error(`Architect AI API call failed: ${response.statusText}`);
    const aiResponse = await response.json();
    // --- FIX: Add validation to ensure the AI output matches the expected structure ---
    const blueprint = JSON.parse(aiResponse.choices[0].message.content);
    if (!blueprint.title || !Array.isArray(blueprint.slides)) {
        throw new Error("Architect AI returned invalid JSON structure.");
    }
    return blueprint;
}


// --- FIX #2: A better prompt for the Content Factory AI ---
async function generateSlideContent(presentationTitle, slideTitle, visualPrompt) {
     const contentPrompt = `
        You are an expert content writer and public speaking coach creating a single slide for a presentation titled "${presentationTitle}".
        The title of this specific slide is "${slideTitle}".
        The key visual for this slide is described as: "${visualPrompt}".

        Your output must be ONLY a single, raw JSON object with this exact structure:
        {
          "notes": "Detailed speaker notes for the presenter. Provide context, explanations, and talking points related to the slide title. Write at least two professional paragraphs. The tone should be informative and engaging.",
          "content_points": ["An array of 3 to 5 concise, impactful bullet points. Each point must directly relate to the slide's title and be easy to understand at a glance."]
        }
        Do not include any markdown wrappers or explanations.
    `;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        // --- FIX: Use the new, more powerful content model ---
        body: JSON.stringify({ model: process.env.CONTENT_MODEL, messages: [{ role: 'user', content: contentPrompt }], response_format: { type: "json_object" } }),
    });

    if (!response.ok) throw new Error(`Content AI API call failed for slide "${slideTitle}": ${response.statusText}`);
    const aiResponse = await response.json();
     // --- FIX: Add validation for the content structure ---
    const content = JSON.parse(aiResponse.choices[0].message.content);
    if (typeof content.notes !== 'string' || !Array.isArray(content.content_points)) {
        throw new Error("Content AI returned invalid JSON structure.");
    }
    return content;
}

async function handleGeneratePresentation(context, user) {
    const { topic, slideCount } = context;
    if (!topic || !slideCount) throw new Error("Missing topic or slide count for presentation generation.");

    let presentationId = null;
    try {
        const blueprint = await generatePresentationBlueprint(topic, slideCount);
        const presentationTitle = blueprint.title;

        const { data: presentation, error: presError } = await supabaseAdmin
            .from('presentations')
            .insert({ user_id: user.id, title: presentationTitle })
            .select()
            .single();
        if (presError) throw presError;
        presentationId = presentation.id;

        const skeletonSlides = blueprint.slides.map((slide, idx) => ({
            presentation_id: presentation.id,
            order: idx + 1,
            elements: [
                { id: uuidv4(), type: 'title', content: slide.slide_title, position: {x: 5, y: 10}, size: {width: 90, height: 15} },
                { id: uuidv4(), type: 'content', content: [], position: {x: 10, y: 30}, size: {width: 80, height: 60} },
                { id: uuidv4(), type: 'image_suggestion', content: slide.visual_prompt }
            ],
            notes: "Generating content..."
        }));

        const { data: insertedSlides, error: slideInsertError } = await supabaseAdmin
            .from('slides')
            .insert(skeletonSlides)
            .select();
        if (slideInsertError) throw slideInsertError;

        const contentGenerationPromises = insertedSlides.map(slide => {
            const titleElement = slide.elements.find(el => el.type === 'title');
            const imageSuggestionElement = slide.elements.find(el => el.type === 'image_suggestion');
            
            return generateSlideContent(presentationTitle, titleElement.content, imageSuggestionElement.content)
                .then(content => {
                    const newElements = slide.elements.map(el => el.type === 'content' ? { ...el, content: content.content_points } : el);
                    return supabaseAdmin.from('slides').update({ elements: newElements, notes: content.notes }).eq('id', slide.id);
                });
        });

        const results = await Promise.allSettled(contentGenerationPromises);
        const failedSlides = results.filter(r => r.status === 'rejected');
        if (failedSlides.length > 0) {
            console.error(`${failedSlides.length} slides failed to generate.`, failedSlides.map(f => f.reason));
        }

        return { type: 'presentation_started', presentationId: presentation.id };
    } catch (error) {
        console.error("Error in handleGeneratePresentation:", error);
        if (presentationId) {
            console.log(`Cleaning up failed presentation with ID: ${presentationId}`);
            await supabaseAdmin.from('presentations').delete().eq('id', presentationId);
        }
        throw error;
    }
}

async function generateDiagram(context) {
    const { slideContext, slideId } = context;
    if (!slideContext) throw new Error("Missing slide context for diagram generation.");

    const codeGenPrompt = `You are a data visualization expert. Based on the slide content below, choose the BEST diagram syntax (mermaid, plantuml, d2, or graphviz) to create a clear and informative diagram.

    Slide Content: ${JSON.stringify(slideContext)}

    Return ONLY a single, raw JSON object with "syntax" and "code" keys. The "code" should be a valid string for the chosen syntax.`;

    const codeGenResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.DIAGRAM_MODEL, messages: [{ role: 'user', content: codeGenPrompt }], response_format: { type: "json_object" } }),
    });
    if (!codeGenResponse.ok) throw new Error("AI failed to generate diagram code.");
    const diagramData = await codeGenResponse.json();
    const { syntax, code } = JSON.parse(diagramData.choices[0].message.content);

    const krokiResponse = await fetch(`https://kroki.io/${syntax}/svg/${Buffer.from(code, 'utf8').toString('base64url')}`);
    if (!krokiResponse.ok) throw new Error(`Kroki failed to render the ${syntax} diagram.`);
    const svg = await krokiResponse.text();

    // Add the new diagram element to the slide in the database
    const newElement = { id: uuidv4(), type: 'diagram', content: svg, syntax: syntax, position: { x: 10, y: 30 }, size: { width: 80, height: 60 } };
    const { data: slide, error } = await supabaseAdmin.from('slides').select('elements').eq('id', slideId).single();
    if (error) throw error;
    const updatedElements = [...slide.elements, newElement];
    await supabaseAdmin.from('slides').update({ elements: updatedElements }).eq('id', slideId);
    
    return { type: 'diagram', newElement };
}


async function generateImage(context) {
    const { imageSuggestion, slideId } = context;
    if (!imageSuggestion || !slideId) throw new Error("Missing image suggestion or slide ID.");

    const masterPrompt = `Photorealistic, vibrant, cinematic shot of: ${imageSuggestion}. High-resolution, 16:9 aspect ratio, professional quality.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.IMAGE_MODEL, messages: [{ role: 'user', content: masterPrompt }] }),
    });
    if (!response.ok) throw new Error("AI failed to generate an image.");
    
    const data = await response.json();
    const imageUrl = data.choices[0]?.message?.content; 
    if (!imageUrl || !imageUrl.startsWith('http')) throw new Error('AI returned an invalid image URL.');

    await supabaseAdmin.from('slides').update({ image_url: imageUrl }).eq('id', slideId);
    return { type: 'image', imageUrl };
}

async function generateTheme(context) {
    const { presentationId, command } = context;
    if (!presentationId) throw new Error("Missing presentation ID for theme generation.");

    const themeGenPrompt = `You are a UI/UX designer. Create a theme for a presentation. The user's style hint is: "${command}". Output ONLY a single, raw JSON object with these exact keys: "bg_css", "primary_color", "secondary_color", "accent_color". For "bg_css", provide a valid CSS background gradient string. For the colors, provide hex codes.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: process.env.THEME_MODEL, messages: [{ role: 'user', content: themeGenPrompt }], response_format: { type: "json_object" } }),
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

export async function POST(request) {
    if (!supabaseAdmin || missingEnvVars.length > 0) {
        const errorMessage = `Server configuration error: The following environment variables are missing: ${missingEnvVars.join(', ')}`;
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }

    const { task, context } = await request.json();
    const supabase = createClient();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let finalTask = task;
        if (task === 'interpret_chat') {
            const interpretationPrompt = `You are an AI task orchestrator. Analyze the user's command and the current context to decide which single task to perform.
            
            User Command: "${context.command}"
            Current Slide Context: ${JSON.stringify(context.slideContext)}

            Your response MUST be a single, raw JSON object with a "task" key. The value for "task" must be one of the following strings:
            - "generate_diagram" (if the user asks for a chart, graph, flowchart, etc.)
            - "generate_theme" (if the user asks to change the colors, style, or theme)
            - "generate_image" (if the user asks for a picture, photo, or image)
            - "clarify" (if the user's request is ambiguous or not one of the above)
            `;
            const brainResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: process.env.INTERPRETATION_MODEL, messages: [{ role: 'user', content: interpretationPrompt }], response_format: { type: "json_object" } }),
            });
            if (!brainResponse.ok) throw new Error("AI Brain failed to interpret command.");
            const decision = await brainResponse.json();
            const { task: decidedTask } = JSON.parse(decision.choices[0].message.content);
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
                result = { type: 'clarification', message: "I'm not sure how to handle that request. You can ask me to generate an image, a diagram, or change the theme." };
        }
        
        return NextResponse.json(result);

    } catch (error) {
        console.error('AI Command Error:', error.message, error.stack);
        return NextResponse.json({ error: error.message || 'An internal server error has occurred.' }, { status: 500 });
    }
}
