// src/core/presentation.flow.js
// Phase 3: Structured AI Pipeline (plain JS orchestration to avoid runtime deps)

import { callAIWithPortkey } from './ai.js';

// Provide a minimal Flow-like interface (with .run) without external deps
function makeStep(fn) {
  return { run: fn };
}

// Strategist Step
export const generateStrategyFlow = makeStep(async ({ topic }) => {
  const system = [
    'You are a world-class presentation strategist.',
    'Respond ONLY with JSON following the contract:',
    '{ "angles": [ { "angle_id": "...", "title": "...", "description": "...", "audience": "General", "emphasis_keywords": ["..."] } ] }',
    '2-3 angles. Keep concise. angle_id must be unique.'
  ].join('\n');

  const user = `Topic: ${topic}`;
  const cacheKey = `angles_${topic.replace(/\s+/g, '_').toLowerCase()}`;

  try {
    const result = await callAIWithPortkey({ system, user, json: true, cacheKey });
    if (!result || !Array.isArray(result.angles) || result.angles.length < 2) {
      throw new Error('Invalid angles response');
    }
    return result;
  } catch (error) {
    const topicLower = topic.toLowerCase();
    let fallbackAngles = [];
    if (topicLower.includes('tech') || topicLower.includes('software')) {
      fallbackAngles = [
        { angle_id: 'technical', title: 'Technical Deep-Dive', description: 'Explain the mechanisms and architecture.', audience: 'Technical', emphasis_keywords: ['architecture','performance','scalability'] },
        { angle_id: 'business', title: 'Business Impact', description: 'Focus on ROI and business value.', audience: 'Executive', emphasis_keywords: ['roi','efficiency','growth'] }
      ];
    } else if (topicLower.includes('health') || topicLower.includes('medical')) {
      fallbackAngles = [
        { angle_id: 'scientific', title: 'Evidence-Based Approach', description: 'Present research and data.', audience: 'Academic', emphasis_keywords: ['research','evidence','outcomes'] },
        { angle_id: 'human', title: 'Patient-Centered Story', description: 'Focus on human impact and care.', audience: 'General', emphasis_keywords: ['care','wellbeing','hope'] }
      ];
    } else {
      fallbackAngles = [
        { angle_id: 'inspirational', title: 'Vision and Impact', description: 'Tell a story that inspires action.', audience: 'General', emphasis_keywords: ['story','impact','future'] },
        { angle_id: 'practical', title: 'Practical Application', description: 'Focus on actionable insights.', audience: 'General', emphasis_keywords: ['practical','actionable','steps'] }
      ];
    }
    return { angles: fallbackAngles };
  }
});

// Blueprint Step
export const generateBlueprintFlow = makeStep(async ({ topic, angle, slideCount }) => {
  const system = [
    'You are an expert content creator. Output JSON ONLY matching the blueprint schema.',
    'Do not include any commentary.',
    'Act as a brand designer. Extend theme into a Generative Design System (GDS) with palette {text_primary,text_secondary,background_primary,background_secondary,accent_primary,accent_secondary,data_positive,data_negative,neutral}, typography {heading_font,body_font,heading_scale,body_scale,line_height}, and mood_keywords.',
    'For each slide, consider adding blocks: bullet_points, paragraph, statistic_highlight, pull_quote, callout, image_request, diagram_request, table_request. Keep 1–3 blocks per slide.'
  ].join('\n');

  const user = JSON.stringify({
    topic,
    chosen_angle: angle,
    slide_count: slideCount,
    instructions: 'Provide slides[1..N] with slide_id, slide_index, slide_title, content_points (2-5), optional speaker_notes and visual_suggestion. Optionally include blocks as above and a theme GDS.'
  });

  const cacheKey = `blueprint_${topic.replace(/\s+/g, '_').toLowerCase()}_${angle.angle_id}_${slideCount}`;

  try {
    const result = await callAIWithPortkey({ system, user, json: true, cacheKey });
    if (!result || !Array.isArray(result.slides) || result.slides.length !== slideCount) {
      throw new Error('Invalid blueprint response');
    }
    return result;
  } catch (error) {
    const slides = Array.from({ length: slideCount }).map((_, i) => ({
      slide_id: `s-${String(i + 1).padStart(2, '0')}`,
      slide_index: i + 1,
      slide_title: i === 0 ? 'Introduction' : i === slideCount - 1 ? 'Conclusion' : `Key Idea ${i}`,
      content_points: i === 0
        ? ['Set the stage', 'Define the goal']
        : i === slideCount - 1
          ? ['Summarize key takeaways', 'Call to action']
          : ['Main point', 'Supporting detail', 'Example'],
      visual_suggestion: { type: 'image', description: 'Subtle background visual related to the topic.' }
    }));
    return { topic, chosen_angle: angle, slide_count: slideCount, slides };
  }
});

// Recipes Step
export const generateRecipesFlow = makeStep(async ({ blueprint }) => {
  const system = [
    'You are a creative director choosing from a defined component library and layout patterns.',
    'Return JSON with { theme_runtime, recipes: [...] }. Ensure readability, consistent title sizes, and high contrast between text and background as defined by the generated theme.',
    'Compose layouts on a 12-column grid. For each element, include optional grid: { colStart, colEnd, rowStart, rowEnd }. Avoid overlap unless layered by order.'
  ].join('\n');

  const user = JSON.stringify({ blueprint });
  const cacheKey = `recipes_${blueprint.topic?.replace(/\s+/g, '_').toLowerCase()}_${blueprint.slides?.length}_${blueprint.theme?.name || 'default'}`;

  try {
    const result = await callAIWithPortkey({ system, user, json: true, cacheKey });
    if (!result || !Array.isArray(result.recipes) || result.recipes.length !== blueprint.slides.length) {
      throw new Error('Invalid recipes response');
    }
    return result;
  } catch (error) {
    return {
      theme_runtime: { background: '#000000', primary: '#ffffff', secondary: '#cccccc', accent: '#ffe1c6' },
      recipes: blueprint.slides.map((s) => ({
        slide_id: s.slide_id,
        layout_type: 'TitleAndBullets',
        background: { color: '#000000', overlay: false },
        elements: [
          { type: 'Title', content: s.slide_title, style_hints: { size: 'xl', accent: true } },
          { type: 'BulletedList', content: s.content_points, style_hints: { size: 'md' } }
        ]
      }))
    };
  }
});

// Presentation Flow (orchestrator) with a .run API
export const presentationFlow = {
  async run({ topic, slideCount = 10 }) {
    try {
      const strategy = await generateStrategyFlow.run({ topic });
      const chosenAngle = strategy.angles[0];
      const blueprint = await generateBlueprintFlow.run({ topic, angle: chosenAngle, slideCount });
      const recipes = await generateRecipesFlow.run({ blueprint });
      return {
        topic,
        chosen_angle: chosenAngle,
        available_angles: strategy.angles,
        blueprint,
        recipes,
        metadata: {
          generated_at: new Date().toISOString(),
          slide_count: blueprint.slides.length,
          theme: blueprint.theme?.name || 'Default'
        }
      };
    } catch (error) {
      throw new Error(`Presentation generation failed: ${error.message}`);
    }
  }
};

// Flows are exported as objects with .run
