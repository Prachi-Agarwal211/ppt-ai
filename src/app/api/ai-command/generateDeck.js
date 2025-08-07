import { v4 as uuidv4 } from 'uuid';
import { blueprintSchema, slideContentSchema, safeParseJSON } from '@/core/schema';

export async function generatePresentationBlueprint(topic, slideCount) {
  if (process.env.FREE_MODE === 'true') {
    return {
      title: `${topic} — Outline`,
      slides: Array.from({ length: Math.max(1, Number(slideCount) || 5) }).map((_, i) => ({
        slide_title: `${topic}: Key Point ${i + 1}`,
        visual_prompt: `${topic} conceptual illustration, minimal flat style, high contrast`
      })),
    };
  }
  const architectPrompt = `You are a presentation strategist. Create a JSON blueprint for ${slideCount} slides on: "${topic}" with keys: title, slides[{slide_title, visual_prompt}]`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.ARCHITECT_MODEL || 'openai/gpt-4o-mini', messages: [{ role: 'user', content: architectPrompt }], response_format: { type: 'json_object' } })
  });
  if (!response.ok) throw new Error(`Architect AI failed: ${response.statusText}`);
  const ai = await response.json();
  const parsed = safeParseJSON(ai.choices[0].message.content, blueprintSchema);
  if (!parsed.ok) throw new Error('Invalid blueprint JSON');
  return parsed.data;
}

export async function generateSlideContent(presentationTitle, slideTitle, visualPrompt) {
  if (process.env.FREE_MODE === 'true') {
    return {
      notes: `${slideTitle} — speaker notes go here. Summarize the idea and give an example.`,
      content_points: [
        'Main idea in one sentence',
        'Why it matters',
        'Actionable tip',
      ],
    };
  }
  const contentPrompt = `Generate slide content JSON for presentation "${presentationTitle}" slide "${slideTitle}" with keys: notes, content_points[] using the visual prompt: ${visualPrompt}`;
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: process.env.CONTENT_MODEL || 'openai/gpt-4o-mini', messages: [{ role: 'user', content: contentPrompt }], response_format: { type: 'json_object' } })
  });
  if (!response.ok) throw new Error(`Content AI failed: ${response.statusText}`);
  const ai = await response.json();
  const parsed = safeParseJSON(ai.choices[0].message.content, slideContentSchema);
  if (!parsed.ok) throw new Error('Invalid slide content JSON');
  return parsed.data;
}

export async function handleGeneratePresentation(context, user, supabaseAdmin) {
  const { topic, slideCount } = context;
  if (!topic || !slideCount) throw new Error('Missing topic or slideCount');

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
        { id: uuidv4(), type: 'title', content: slide.slide_title, position: { x: 5, y: 10 }, size: { width: 90, height: 15 } },
        { id: uuidv4(), type: 'content', content: [], position: { x: 10, y: 30 }, size: { width: 80, height: 60 } },
        { id: uuidv4(), type: 'image_suggestion', content: slide.visual_prompt }
      ],
      notes: 'Generating content...'
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

    await Promise.allSettled(contentGenerationPromises);
    return { type: 'presentation_started', presentationId: presentation.id };
  } catch (error) {
    if (presentationId) await supabaseAdmin.from('presentations').delete().eq('id', presentationId);
    throw error;
  }
}

