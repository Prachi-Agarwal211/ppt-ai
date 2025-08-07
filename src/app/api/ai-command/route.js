import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { handleGeneratePresentation } from './generateDeck';
import { generateDiagram, generateImage, generateTheme } from './generateSlide';
import { interpretSchema, safeParseJSON } from '@/core/schema';

// --- Environment Variable Validation ---
// Only strictly require core keys; in FREE_MODE, OpenRouter key is not required.
const isFreeMode = process.env.FREE_MODE === 'true';
const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    ...(!isFreeMode ? ['OPENROUTER_API_KEY'] : []),
];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Increased timeout for potentially longer AI generation

const supabaseAdmin = missingEnvVars.length === 0
    ? createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

// moved to dedicated files

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
            if (isFreeMode) {
                const cmd = (context.command || '').toLowerCase();
                if (/(diagram|chart|flow|graph)/.test(cmd)) finalTask = 'generate_diagram';
                else if (/(theme|color|palette|style)/.test(cmd)) finalTask = 'generate_theme';
                else if (/(image|photo|picture)/.test(cmd)) finalTask = 'generate_image';
                else finalTask = 'clarify';
            } else {
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
                    body: JSON.stringify({ model: process.env.INTERPRETATION_MODEL || 'openai/gpt-4o-mini', messages: [{ role: 'user', content: interpretationPrompt }], response_format: { type: "json_object" } }),
            });
            if (!brainResponse.ok) throw new Error("AI Brain failed to interpret command.");
            const decision = await brainResponse.json();
                const parsed = safeParseJSON(decision.choices[0].message.content, interpretSchema);
                if (!parsed.ok) throw new Error('Invalid interpret JSON');
                const { task: decidedTask } = parsed.data;
            finalTask = decidedTask;
            }
        }

        let result;
        switch (finalTask) {
            case 'generate_presentation':
                result = await handleGeneratePresentation(context, user, supabaseAdmin);
                break;
            case 'generate_diagram':
                result = await generateDiagram(context, supabaseAdmin);
                break;
            case 'generate_theme':
                result = await generateTheme(context, supabaseAdmin);
                break;
            case 'generate_image':
                result = await generateImage(context, supabaseAdmin);
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
