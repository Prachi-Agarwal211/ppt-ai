// src/app/api/ai-command/magicEdit.js

// Minimal Magic Edit handler for FREE_MODE. Text-only operations with guardrails.
export async function magicEdit(context, supabaseAdmin) {
  const { slideId, intent, charBudget = 250 } = context || {};
  if (!slideId) throw new Error('Missing slideId');

  const { data: slide, error } = await supabaseAdmin.from('slides').select('id, elements, notes, presentation_id').eq('id', slideId).single();
  if (error) throw error;

  // Find title/content
  const titleIdx = slide.elements.findIndex(e => e.type === 'title');
  const contentIdx = slide.elements.findIndex(e => e.type === 'content');
  if (titleIdx === -1 && contentIdx === -1) return { type: 'magic_edit', slideId, updated: false };

  let title = titleIdx !== -1 ? slide.elements[titleIdx].content : '';
  let bullets = contentIdx !== -1 ? slide.elements[contentIdx].content : [];

  // Apply ultra-simple transforms deterministically
  switch (intent) {
    case 'summarize': {
      title = String(title).slice(0, 60);
      bullets = (bullets || []).map(b => String(b)).slice(0, 4).map(b => b.slice(0, 120));
      break;
    }
    case 'rephrase': {
      // No LLM in FREE_MODE: just normalize spacing/case lightly
      const norm = s => s.replace(/\s+/g, ' ').trim();
      title = norm(title);
      bullets = (bullets || []).map(norm);
      break;
    }
    case 'fix_overflow':
    default: {
      // Enforce global charBudget across title + bullets
      const maxTitle = 60;
      title = String(title).slice(0, maxTitle);
      const remaining = Math.max(40, charBudget - title.length);
      const each = Math.floor(remaining / Math.max(1, (bullets || []).length || 3));
      bullets = (bullets && bullets.length ? bullets : ['Point 1', 'Point 2', 'Point 3']).map(b => String(b).slice(0, Math.max(60, each)));
      break;
    }
  }

  const newElements = slide.elements.map((e) => {
    if (e.type === 'title') return { ...e, content: title };
    if (e.type === 'content') return { ...e, content: bullets };
    return e;
  });

  // Regenerate HTML from current theme
  const { data: presentation } = await supabaseAdmin
    .from('presentations')
    .select('id, theme_primary_color, theme_secondary_color, theme_accent_color')
    .eq('id', slide.presentation_id)
    .single();
  const { generateSlideHtml } = await import('./generateSlideHtml');
  const html = await generateSlideHtml({ slide: { ...slide, elements: newElements }, presentation, freeMode: true });
  const withHtml = [
    ...newElements.filter(e => e.type !== 'generated_html'),
    { id: 'gen-' + slide.id, type: 'generated_html', content: html }
  ];

  await supabaseAdmin.from('slides').update({ elements: withHtml }).eq('id', slide.id);
  return { type: 'magic_edit', slideId: slide.id, updated: true };
}
