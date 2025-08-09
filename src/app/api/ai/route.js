import { NextResponse } from 'next/server';
import * as AiCore from '@/core/ai';

export async function POST(req) {
  try {
    const { action, payload } = await req.json();
    let result;
    switch (action) {
      case 'generate_angles':
        result = await AiCore.generateStrategicAngles(payload?.topic || '');
        break;
      case 'generate_blueprint':
        result = await AiCore.generateBlueprint(
          payload?.topic || '',
          payload?.angle || null,
          Number(payload?.slideCount || 10)
        );
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
      default:
        return NextResponse.json({ error: 'Invalid AI action' }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'AI route error' }, { status: 500 });
  }
}
