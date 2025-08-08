// src/app/api/review/route.js

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function assess(slide, theme) {
  const title = (slide.elements || []).find(e => e.type === 'title')?.content || '';
  const points = (slide.elements || []).find(e => e.type === 'content')?.content || [];
  const bullets = Array.isArray(points) ? points : [];
  const issues = [];

  if (bullets.some(b => (b || '').length > 160)) {
    issues.push({ severity: 'medium', message: 'Some bullets are too long', suggestion: { task: 'magic_edit', intent: 'fix_overflow', slideId: slide.id } });
  }
  if (bullets.length > 6) {
    issues.push({ severity: 'low', message: 'Slide may be too dense', suggestion: { task: 'magic_edit', intent: 'summarize', slideId: slide.id } });
  }
  if (title.length > 60) {
    issues.push({ severity: 'low', message: 'Title is lengthy', suggestion: { task: 'magic_edit', intent: 'fix_overflow', slideId: slide.id } });
  }
  return issues;
}

export async function POST(request) {
  try {
    const { slides, theme } = await request.json();
    if (!Array.isArray(slides)) return NextResponse.json({ error: 'slides required' }, { status: 400 });

    const report = [];
    for (const s of slides) {
      const issues = assess(s, theme);
      if (issues.length) report.push({ slideId: s.id, issues });
    }
    return NextResponse.json({ type: 'review_report', issues: report });
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Review failed' }, { status: 500 });
  }
}
