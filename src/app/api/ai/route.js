import { NextResponse } from 'next/server';
import * as AiCore from '@/core/ai';
import { presentationFlow } from '@/core/presentation.flow';

export async function POST(req) {
  try {
    const { action, payload } = await req.json();
    let result;
    switch (action) {
      case 'generate_angles':
        result = await AiCore.generateStrategicAngles(payload?.topic || '');
        break;
      case 'generate_blueprint':
        // Phase 2.3: Support streaming for blueprint generation
        if (payload?.stream) {
          const stream = await AiCore.generateBlueprintStreaming(
            payload?.topic || '',
            payload?.angle || null,
            Number(payload?.slideCount || 10)
          );
          return new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Transfer-Encoding': 'chunked'
            }
          });
        } else {
          result = await AiCore.generateBlueprint(
            payload?.topic || '',
            payload?.angle || null,
            Number(payload?.slideCount || 10)
          );
        }
        break;
      case 'refine_blueprint':
        result = await AiCore.refineBlueprintViaChat(
          payload?.blueprint || null,
          Array.isArray(payload?.chatHistory) ? payload.chatHistory : [],
          payload?.context || {}
        );
        break;
      case 'generate_recipes':
        result = await AiCore.generateSlideRecipes(payload?.blueprint || null);
        break;
      case 'run_presentation_flow':
        // Orchestrated end-to-end flow using Genkit
        result = await presentationFlow.run({
          topic: String(payload?.topic || ''),
          slideCount: Number(payload?.slideCount || 10)
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid AI action' }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'AI route error' }, { status: 500 });
  }
}
