// src/core/ai.js
// Phase 2-4: Enhanced AI logic with Portkey acceleration and Hypertune A/B testing
// Provider: Portkey → OpenRouter. Model: z-ai/glm-4.5-air:free by default.

import Portkey from 'portkey-ai';
import { promptVariantManager } from '@/utils/hypertune';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY;
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'z-ai/glm-4.5-air:free';

// Validate Portkey API key format (should start with 'pk-' and be long enough)
const isValidPortkeyKey = PORTKEY_API_KEY && 
  PORTKEY_API_KEY.length > 50 && 
  (PORTKEY_API_KEY.startsWith('pk-') || PORTKEY_API_KEY.startsWith('sk-'));

if (PORTKEY_API_KEY && !isValidPortkeyKey) {
  console.warn('⚠️ Portkey API key appears invalid. Falling back to direct OpenRouter calls.');
}

// Phase 2.1 & 2.2: Initialize Portkey client with caching and retries
const portkey = isValidPortkeyKey ? new Portkey({
  apiKey: PORTKEY_API_KEY,
  baseURL: 'https://api.portkey.ai/v1',
  mode: 'proxy' // Use proxy mode for OpenRouter
}) : null;

// Enhanced AI call function with Portkey acceleration
export async function callAIWithPortkey({ system, user, json = true, cacheKey = null }) {
  if (!OPENROUTER_API_KEY) {
    // No key: return null so the caller can trigger fallbacks
    return null;
  }
  
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  if (user) messages.push({ role: 'user', content: user });

  try {
    // Use Portkey when available, fallback to direct OpenRouter
    if (portkey && PORTKEY_API_KEY) {
      const response = await portkey.chat.completions.create({
        model: DEFAULT_MODEL,
        messages,
        response_format: json ? { type: 'json_object' } : undefined,
        temperature: 0.7,
        provider: 'openrouter',
        // Add OpenRouter specific headers
        override: {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'HTTP-Referer': 'https://nether-ai.local',
            'X-Title': 'Nether AI',
            'x-portkey-cache': cacheKey ? 'semantic' : 'simple',
            'x-portkey-cache-ttl': '3600',
            'x-portkey-retry-count': '3'
          }
        }
      });
      
      const content = response.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty AI response');
      
      return json ? JSON.parse(content) : content;
    } else {
      // Fallback to direct OpenRouter call
      return await callOpenRouterDirect({ system, user, json });
    }
  } catch (error) {
    console.warn('Portkey call failed, falling back to direct:', error.message);
    return await callOpenRouterDirect({ system, user, json });
  }
}

// Fallback direct OpenRouter call
async function callOpenRouterDirect({ system, user, json = true }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  if (user) messages.push({ role: 'user', content: user });

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'HTTP-Referer': 'https://nether-ai.local',
      'X-Title': 'Nether AI',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      response_format: json ? { type: 'json_object' } : undefined,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenRouter response');
  try {
    return json ? JSON.parse(content) : content;
  } catch {
    return null;
  }
}

// 6.2 generate_angles
export async function generateStrategicAngles(topic) {
  try {
    if (!topic || typeof topic !== 'string') throw new Error('Topic required');

    // Phase 4: Get A/B tested prompt variant from Hypertune
    const variantPrompt = promptVariantManager.getAnglesPromptVariant();
    
    const system = variantPrompt;

    const user = `Topic: ${topic}`;
    // Phase 2.2: Use Portkey with semantic caching for angles
    const cacheKey = `angles_${topic.replace(/\s+/g, '_').toLowerCase()}`;
    const out = await callAIWithPortkey({ system, user, json: true, cacheKey });

    // Phase 4.1: Enhanced fallback strategies
    const valid = Array.isArray(out?.angles) && out.angles.length >= 2;
    if (!valid) {
      // Provide topic-aware fallback angles when AI fails
      const topicLower = topic.toLowerCase();
      const fallbackAngles = [];
      
      if (topicLower.includes('tech') || topicLower.includes('software') || topicLower.includes('system')) {
        fallbackAngles.push({ angle_id: 'technical', title: 'Technical Deep-Dive', description: 'Explain the mechanisms and architecture.', audience: 'Technical', emphasis_keywords: ['architecture','performance','scalability'] });
        fallbackAngles.push({ angle_id: 'business', title: 'Business Impact', description: 'Focus on ROI and business value.', audience: 'Executive', emphasis_keywords: ['roi','efficiency','growth'] });
      } else if (topicLower.includes('health') || topicLower.includes('medical') || topicLower.includes('wellness')) {
        fallbackAngles.push({ angle_id: 'scientific', title: 'Evidence-Based Approach', description: 'Present research and data.', audience: 'Academic', emphasis_keywords: ['research','evidence','outcomes'] });
        fallbackAngles.push({ angle_id: 'human', title: 'Patient-Centered Story', description: 'Focus on human impact and care.', audience: 'General', emphasis_keywords: ['care','wellbeing','hope'] });
      } else {
        // Generic fallbacks
        fallbackAngles.push({ angle_id: 'inspirational', title: 'Vision and Impact', description: 'Tell a story that inspires action.', audience: 'General', emphasis_keywords: ['story','impact','future'] });
        fallbackAngles.push({ angle_id: 'practical', title: 'Practical Application', description: 'Focus on actionable insights.', audience: 'General', emphasis_keywords: ['practical','actionable','steps'] });
        fallbackAngles.push({ angle_id: 'analytical', title: 'Data-Driven Analysis', description: 'Present facts and analytical insights.', audience: 'Executive', emphasis_keywords: ['data','analysis','insights'] });
      }
      
      return { angles: fallbackAngles };
    }

    // Truncate and sanitize per Section 17.1
    const angles = out.angles.slice(0, 3).map((a, idx, arr) => ({
      angle_id: String(a.angle_id || `angle-${idx}`).slice(0, 40),
      title: String(a.title || `Angle ${idx + 1}`).slice(0, 80),
      description: String(a.description || '').slice(0, 280),
      audience: ['Technical','General','Executive','Academic','Students'].includes(a.audience) ? a.audience : 'General',
      emphasis_keywords: Array.isArray(a.emphasis_keywords) ? a.emphasis_keywords.slice(0, 7).map(String) : [],
    }));

    // Ensure uniqueness of angle_id
    const seen = new Set();
    const unique = angles.map((a) => {
      let id = a.angle_id;
      let i = 1;
      while (seen.has(id)) id = `${a.angle_id}-${i++}`;
      seen.add(id);
      return { ...a, angle_id: id };
    });

    // Track successful angle generation for A/B test conversion
    promptVariantManager.trackConversion('anonymous', 'angles_generated', { topic, angleCount: unique.length });
    
    return { angles: unique };
  } catch (e) {
    // Fallback per Section 10.2
    return {
      angles: [
        { angle_id: 'technical', title: 'Technical Deep-Dive', description: 'Explain the mechanisms and architecture.', audience: 'Technical' },
        { angle_id: 'inspirational', title: 'Vision and Impact', description: 'Tell a story that inspires action.', audience: 'General' },
      ],
    };
  }
}

// 6.2 generate_blueprint
export async function generateBlueprint(topic, angle, slideCount = 10) {
  if (!topic || !angle) throw new Error('topic and angle required');
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 10));
  const count = clamp(slideCount, 3, 15);

  // Phase 4: Get A/B tested prompt variant from Hypertune
  const variantPrompt = promptVariantManager.getBlueprintPromptVariant();
  
  const system = variantPrompt;

  const user = JSON.stringify({
    topic,
    chosen_angle: angle,
    slide_count: count,
    instructions: 'Provide slides[1..N] with slide_id, slide_index, slide_title, content_points (2-5), optional speaker_notes and visual_suggestion. Optionally include blocks as above and a theme GDS.'
  });

  let out = null;
  try {
    // Phase 2.2: Use Portkey with semantic caching for blueprints
    const cacheKey = `blueprint_${topic.replace(/\s+/g, '_').toLowerCase()}_${angle.angle_id}_${count}`;
    out = await callAIWithPortkey({ system, user, json: true, cacheKey });
  } catch (_) {}

  // Validate minimal contract per Section 17.2
  if (!out || !Array.isArray(out.slides) || out.slides.length !== count) {
    // Deterministic fallback outline
    const slides = Array.from({ length: count }).map((_, i) => ({
      slide_id: `s-${String(i + 1).padStart(2, '0')}`,
      slide_index: i + 1,
      slide_title: i === 0 ? 'Introduction' : i === count - 1 ? 'Conclusion' : `Key Idea ${i}`,
      content_points: i === 0
        ? ['Set the stage', 'Define the goal']
        : i === count - 1
          ? ['Summarize key takeaways', 'Call to action']
          : ['Main point', 'Supporting detail', 'Example'],
      visual_suggestion: { type: 'image', description: 'Subtle background visual related to the topic.' },
    }));
    return {
      topic,
      chosen_angle: angle,
      slide_count: count,
      slides,
    };
  }

  // Sanitize fields and ensure indexing/ids
  const slides = out.slides.map((s, idx) => ({
    slide_id: String(s.slide_id || `s-${String(idx + 1).padStart(2, '0')}`),
    slide_index: Number(s.slide_index || idx + 1),
    slide_title: String(s.slide_title || `Slide ${idx + 1}`).slice(0, 90),
    content_points: Array.isArray(s.content_points) && s.content_points.length > 0
      ? s.content_points.slice(0, 5).map((t) => String(t).slice(0, 180))
      : ['Point 1', 'Point 2'],
    speaker_notes: s.speaker_notes ? String(s.speaker_notes).slice(0, 600) : undefined,
    visual_suggestion: s.visual_suggestion ? {
      type: ['image','diagram','table','quote','chart'].includes(s.visual_suggestion.type) ? s.visual_suggestion.type : 'image',
      description: String(s.visual_suggestion.description || '').slice(0, 180),
      diagram_hint: s.visual_suggestion.diagram_hint ? String(s.visual_suggestion.diagram_hint) : undefined,
      image_keywords: Array.isArray(s.visual_suggestion.image_keywords) ? s.visual_suggestion.image_keywords.slice(0, 6).map(String) : undefined,
    } : undefined,
    attachments: Array.isArray(s.attachments) ? s.attachments : [],
    // Part 4: optional blocks taxonomy passthrough
    blocks: Array.isArray(s.blocks) ? s.blocks.slice(0, 3) : undefined,
  }));

  // Part 4: sanitize/clip theme GDS if present
  const theme = out.theme ? {
    name: String(out.theme.name || ''),
    palette: out.theme.palette || undefined,
    typography: out.theme.typography || undefined,
    mood_keywords: Array.isArray(out.theme.mood_keywords) ? out.theme.mood_keywords.slice(0, 8).map(String) : undefined,
    iconography: out.theme.iconography || undefined,
    shapes_motif: out.theme.shapes_motif || undefined,
  } : undefined;

  const result = {
    topic,
    chosen_angle: angle,
    slide_count: count,
    theme: theme,
    slides,
  };
  
  // Track successful blueprint generation for A/B test conversion
  promptVariantManager.trackConversion('anonymous', 'blueprint_generated', { topic, slideCount: count });
  
  return result;
}

// 6.2 refine_blueprint
export async function refineBlueprintViaChat(blueprint, chatHistory = [], context = {}) {
  if (!blueprint || !Array.isArray(blueprint.slides)) throw new Error('Valid blueprint required');

  const system = [
    'You are a helpful presentation editor who respects explicit user edits.',
    'Return the FULL updated blueprint JSON only (no commentary).',
    'Do NOT reorder slides unless explicitly asked; preserve slide_id stability.',
    'If ambiguous, ask exactly one clarifying question in a field "_clarify" and do NOT make destructive changes.',
    // Part 4
    'When transforming content, prefer using blocks (bullet_points, paragraph, statistic_highlight, pull_quote, callout, image_request, diagram_request, table_request). Keep slide_id stable. Preserve theme GDS if present.'
  ].join('\n');

  const user = JSON.stringify({ blueprint, chatHistory: chatHistory?.slice(-20), context });
  let out = null;
  try {
    // Phase 2.2: Use Portkey for refinement (less aggressive caching for dynamic content)
    const lastMessage = chatHistory?.[chatHistory.length - 1]?.content || 'refine';
    const cacheKey = `refine_${blueprint.topic?.replace(/\s+/g, '_').toLowerCase()}_${lastMessage.slice(0, 20)}`;
    out = await callAIWithPortkey({ system, user, json: true, cacheKey });
  } catch (_) {}

  // If invalid, fallback to no-op blueprint
  if (!out || !Array.isArray(out.slides)) {
    return blueprint;
  }
  // Ensure slide_ids preserved; if not, map by index
  const byIndex = (bp) => Object.fromEntries((bp.slides || []).map((s, i) => [i, s.slide_id]));
  const ids = byIndex(blueprint);
  const slides = out.slides.map((s, i) => ({
    ...s,
    slide_id: s.slide_id || ids[i] || `s-${String(i + 1).padStart(2, '0')}`,
    slide_index: Number(s.slide_index || i + 1),
  }));
  return { ...blueprint, ...out, slides };
}

// Phase 2.3: Streaming blueprint generation for improved UX
export async function generateBlueprintStreaming(topic, angle, slideCount = 10) {
  if (!topic || !angle) throw new Error('topic and angle required');
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Number(n) || 10));
  const count = clamp(slideCount, 3, 15);

  // Create a streaming response that generates slides one by one
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      try {
        // First, send initial metadata
        const metadata = {
          type: 'metadata',
          topic,
          chosen_angle: angle,
          slide_count: count,
          theme: {
            name: 'Default Theme',
            palette: {
              text_primary: '#ffffff',
              background_primary: '#000000',
              accent_primary: '#ffe1c6'
            }
          }
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));

        // Generate slides progressively
        for (let i = 0; i < count; i++) {
          const slide = {
            type: 'slide',
            slide_id: `s-${String(i + 1).padStart(2, '0')}`,
            slide_index: i + 1,
            slide_title: i === 0 ? 'Introduction' : i === count - 1 ? 'Conclusion' : `Key Idea ${i}`,
            content_points: i === 0
              ? ['Set the stage', 'Define the goal']
              : i === count - 1
                ? ['Summarize key takeaways', 'Call to action']
                : ['Main point', 'Supporting detail', 'Example'],
            visual_suggestion: { type: 'image', description: 'Subtle background visual related to the topic.' },
          };
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(slide)}\n\n`));
          
          // Add a small delay to simulate AI generation
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Send completion signal
        const completion = { type: 'complete' };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(completion)}\n\n`));
        
      } catch (error) {
        const errorData = { type: 'error', error: error.message };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
      } finally {
        controller.close();
      }
    }
  });

  return stream;
}

// 6.2 generate_recipes
export async function generateSlideRecipes(blueprint) {
  if (!blueprint || !Array.isArray(blueprint.slides)) throw new Error('Valid blueprint required');

  const system = [
    'You are a creative director choosing from a defined component library and layout patterns.',
    'Return JSON with { theme_runtime, recipes: [...] }. Ensure readability, consistent title sizes, and high contrast between text and background as defined by the generated theme. Use the theme\'s accent colors sparingly.',
    'For added visual appeal on title or section break slides, you may include background.generative_background with a library name and options. Colors used must come from the presentation\'s GDS palette.',
    // Part 4: Grid composer
    'Compose layouts on a 12-column grid. For each element, include optional grid: { colStart, colEnd, rowStart, rowEnd }. Avoid overlap unless layered by order.'
  ].join('\n');

  const user = JSON.stringify({ blueprint });
  let out = null;
  try {
    // Phase 2.2: Use Portkey with semantic caching for recipes
    const cacheKey = `recipes_${blueprint.topic?.replace(/\s+/g, '_').toLowerCase()}_${blueprint.slides?.length}_${blueprint.theme?.name || 'default'}`;
    out = await callAIWithPortkey({ system, user, json: true, cacheKey });
  } catch (_) {}

  // Validate minimal contract (Section 17.4)
  const mkDefault = () => ({
    theme_runtime: {
      background: '#000000', primary: '#ffffff', secondary: '#cccccc', accent: '#ffe1c6',
    },
    recipes: blueprint.slides.map((s) => ({
      slide_id: s.slide_id,
      layout_type: 'TitleAndBullets',
      background: { color: '#000000', overlay: false },
      elements: [
        { type: 'Title', content: s.slide_title, style_hints: { size: 'xl', accent: true } },
        { type: 'BulletedList', content: s.content_points, style_hints: { size: 'md' } },
      ],
    })),
  });

  if (!out || !Array.isArray(out.recipes) || out.recipes.length !== blueprint.slides.length) {
    return mkDefault();
  }

  // Light sanitation with grid support and new element types
  const theme_runtime = out.theme_runtime || { background: '#000', primary: '#fff', secondary: '#ccc', accent: '#ffe1c6' };
  const recipes = out.recipes.map((r, i) => ({
    slide_id: r.slide_id || blueprint.slides[i].slide_id,
    layout_type: r.layout_type || 'TitleAndBullets',
    background: r.background || { color: theme_runtime.background },
    elements: Array.isArray(r.elements) && r.elements.length > 0 ? r.elements.map((el) => ({
      type: el.type,
      content: el.content,
      style_hints: el.style_hints || {},
      position_hints: el.position_hints || {},
      grid: el.grid || undefined,
      diagram: el.diagram || undefined,
      table: el.table || undefined,
    })) : [
      { type: 'Title', content: blueprint.slides[i].slide_title },
      { type: 'BulletedList', content: blueprint.slides[i].content_points },
    ],
  }));

  return { theme_runtime, recipes };
}
