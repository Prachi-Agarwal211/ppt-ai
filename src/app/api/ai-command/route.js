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
    'PRESENTATION_MODEL',
    'DIAGRAM_MODEL',
    'IMAGE_MODEL',
    'THEME_MODEL',
    'INTERPRETATION_MODEL',
    'CONTENT_MODEL'
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const supabaseAdmin = missingEnvVars.length === 0
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

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

async function generateSlideContent(presentationTitle, slideTitle, visualPrompt) {
     const contentPrompt = `
        You are an expert content writer creating a slide for a presentation titled "${presentationTitle}".
        The title of this specific slide is "${slideTitle}".
        The key visual for this slide will be: "${visualPrompt}".

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
            slide_number: idx + 1, // *** FIX: Added the missing slide_number field ***
            elements: [
                { id: uuidv4(), type: 'title', content: slide.slide_title, position: {x: 5, y: 10}, size: {width: 90, height: 15} },
                { id: uuidv4(), type: 'content', content: [], position: {x: 10, y: 30}, size: {width: 80, height: 60} },
                { id: uuidv4(), type: 'image_suggestion', content: slide.visual_prompt }
            ],
            notes: "Generating..."
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
    const { slideContext } = context;
    if (!slideContext) throw new Error("Missing slide context for diagram generation.");

    const codeGenPrompt = `You are a data visualization expert. Based on the slide content, choose the BEST syntax (mermaid, plantuml, d2, graphviz) to create a clear diagram. Return ONLY a JSON object with "syntax" and "code" keys. Content: ${JSON.stringify(slideContext)}`;
    const codeGenResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openrouter/quasar-alpha', messages: [{ role: 'user', content: codeGenPrompt }] }),
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

async function generateTheme(context) {
    const { presentationId, command } = context;
    if (!presentationId) throw new Error("Missing presentation ID for theme generation.");

    const themeGenPrompt = `You are a UI/UX designer. Create a theme for a presentation. Style Hint: "${command}". Output ONLY a raw JSON object with keys: "bg_css", "primary_color", "secondary_color", "accent_color". Example values are CSS gradients for bg_css and hex codes for colors.`;
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'openrouter/optimus-alpha', messages: [{ role: 'user', content: themeGenPrompt }] }),
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
            const interpretationPrompt = `You are an AI task orchestrator. Analyze the user's command and context, then return a JSON object with a "task" key. The task must be one of: "generate_diagram", "generate_theme", "generate_image", "generate_presentation", or "clarify". Command: "${context.command}"`;
            const brainResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'openrouter/optimus-alpha', messages: [{ role: 'user', content: interpretationPrompt }] }),
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