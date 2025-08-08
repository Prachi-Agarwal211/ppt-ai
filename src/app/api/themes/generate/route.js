// src/app/api/themes/generate/route.js

import { NextResponse } from 'next/server';
import { DefaultThemeTokens, validateContrast } from '@/core/theme/tokens';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, presentationId } = body || {};

    // FREE_MODE: return a tweaked palette deterministically from prompt hash
    let tokens = JSON.parse(JSON.stringify(DefaultThemeTokens));
    if (typeof prompt === 'string' && prompt.length) {
      const h = [...prompt].reduce((a, c) => (a + c.charCodeAt(0)) % 360, 0);
      // simple H shift on primary/secondary/accent via HSL-like tweak (approximate using CSS filter)
      // For brevity, just swap to a set based on bucket
      const palette = [
        ['#8EC5FC','#E0C3FC','#FDE68A'],
        ['#FBC2EB','#A18CD1','#FECACA'],
        ['#93C5FD','#86EFAC','#FDE68A'],
        ['#FECACA','#FBCFE8','#BFDBFE']
      ][h % 4];
      tokens.colors.primary = palette[0];
      tokens.colors.secondary = palette[1];
      tokens.colors.accent = palette[2];
    }

    // ensure contrast
    if (!validateContrast(tokens)) {
      tokens.colors.textPrimary = '#ffffff';
      tokens.colors.background = '#0b0b0f';
    }

    // Persist minimal fields for existing schema if presentationId provided
    if (presentationId) {
      const { createClient: createAdminClient } = await import('@supabase/supabase-js');
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const admin = createAdminClient(url, key);
      await admin.from('presentations').update({
        theme_bg_css: `linear-gradient(135deg, ${tokens.colors.background}, ${tokens.colors.surface})`,
        theme_primary_color: tokens.colors.primary,
        theme_secondary_color: tokens.colors.secondary,
        theme_accent_color: tokens.colors.accent,
      }).eq('id', presentationId);
    }

    return NextResponse.json({ type: 'theme_tokens', tokens });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Theme generation failed' }, { status: 500 });
  }
}
