// src/core/cognitive/orchestrator.js

import { v4 as uuidv4 } from 'uuid';
import { presentationStrategySchema, slideTextSchema } from '@/core/schema';

// Basic deterministic builders for FREE_MODE. In non-free mode, swap with real LLM calls.
function buildStrategy(topic, slideCount) {
  const outline = Array.from({ length: Math.max(1, Number(slideCount) || 7) }).map((_, i) => ({
    slideId: uuidv4(),
    titleHint: `${topic}: Key Point ${i + 1}`,
    keyMessage: `Essential message about ${topic} (${i + 1})`,
    type: i === 0 ? 'overview' : i === slideCount - 1 ? 'conclusion' : 'process',
    notes: ''
  }));
  const strategy = {
    version: '1',
    goal: `Explain ${topic} clearly and concisely`,
    targetAudience: 'General audience',
    narrativeOutline: outline,
    length: { slides: outline.length }
  };
  return presentationStrategySchema.create(strategy);
}

function buildSlideTextFromKeyMessage(slideId, keyMessage, locale = 'en-US', charBudget = 250) {
  // Heuristic: title <= 60 chars, 3 bullets totaling <= (charBudget - title length)
  const baseTitle = keyMessage.slice(0, 60);
  const remaining = Math.max(40, charBudget - baseTitle.length);
  const chunk = Math.floor(remaining / 3);
  const bullets = [0, 1, 2].map(i => `${keyMessage} — pt ${i + 1}`.slice(0, chunk));
  const notes = `Speaker notes: expand on "${keyMessage}" with one concrete example and a takeaway.`.slice(0, 800);
  return slideTextSchema.create({
    version: '1',
    slideId,
    title: baseTitle,
    bullets,
    speakerNotes: notes,
    charBudget,
    locale,
  });
}

export async function runCognitivePipeline(context, user, supabaseAdmin) {
  const { topic, slideCount } = context || {};
  if (!topic) throw new Error('Missing topic');

  // 1) Strategist
  const strategy = buildStrategy(topic, slideCount);

// 2) Copywriter
  const slideTexts = strategy.narrativeOutline.map(o => buildSlideTextFromKeyMessage(o.slideId, o.keyMessage));

  // 2.5) Designer
  const { pickLayout, toLayoutElement } = await import('./designer');

  // 3) Persist presentation and slides skeleton
  const { data: presentation, error: presError } = await supabaseAdmin
    .from('presentations')
    .insert({ user_id: user.id, title: `${topic} — Deck`, theme_bg_css: null })
    .select()
    .single();
  if (presError) throw presError;

  // Build slide rows
const rows = slideTexts.map((st, idx) => {
    const base = {
      presentation_id: presentation.id,
      order: idx + 1,
      slide_number: idx + 1,
      elements: [
        { id: uuidv4(), type: 'title', content: st.title, position: { x: 5, y: 10 }, size: { width: 90, height: 15 } },
        { id: uuidv4(), type: 'content', content: st.bullets, position: { x: 10, y: 30 }, size: { width: 80, height: 60 } },
        { id: uuidv4(), type: 'image_suggestion', content: `${topic} conceptual minimal illustration` }
      ],
      notes: st.speakerNotes,
    };
    const layout = pickLayout(base);
    base.elements.push(toLayoutElement(layout));
    return base;
  });

  const { data: inserted, error: slideError } = await supabaseAdmin
    .from('slides')
    .insert(rows)
    .select('id, elements, notes, order, image_url, presentation_id');
  if (slideError) throw slideError;

  // 4) Developer: generate HTML per slide
  const { generateSlideHtml } = await import('@/app/api/ai-command/generateSlideHtml');
  const updatedSlides = [];
  for (const slide of inserted) {
    const html = await generateSlideHtml({ slide, presentation, freeMode: true });
    const newElements = [
      ...(slide.elements || []).filter(e => e.type !== 'generated_html'),
      { id: 'gen-' + slide.id, type: 'generated_html', content: html }
    ];
    await supabaseAdmin.from('slides').update({ elements: newElements }).eq('id', slide.id);
    updatedSlides.push({ ...slide, elements: newElements });
  }

  return { type: 'presentation_started', presentationId: presentation.id };
}
