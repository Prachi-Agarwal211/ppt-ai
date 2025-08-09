import { NextResponse } from 'next/server';
import { promptVariantManager, isHypertuneMock } from '@/utils/hypertune';

export async function GET() {
  try {
    const anglesPrompt = promptVariantManager.getAnglesPromptVariant('diagnostics');
    const blueprintPrompt = promptVariantManager.getBlueprintPromptVariant('diagnostics');

    return NextResponse.json({
      hypertune: {
        mock: isHypertuneMock,
        anglesPromptPreview: anglesPrompt.split('\n').slice(0, 2).join(' '),
        blueprintPromptPreview: blueprintPrompt.split('\n').slice(0, 2).join(' ')
      }
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

