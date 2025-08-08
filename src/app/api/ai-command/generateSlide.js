// src/app/api/ai-command/generateSlide.js

import { diagramSchema, safeParseJSON, themeOutputSchema } from '@/core/schema';
import { v4 as uuidv4 } from 'uuid';
import { Buffer } from 'buffer';

export async function generateDiagram(context, supabaseAdmin) {
  const { slideContext, slideId } = context;
  if (!slideContext) throw new Error('Missing slide context');
  let syntax = 'mermaid';
  let code = `flowchart TD\nA[${(slideContext.title || 'Idea').slice(0, 20)}]-->B[Point 1]\nA-->C[Point 2]`;
  if (process.env.FREE_MODE !== 'true') {
    const prompt = `Choose best syntax (mermaid|plantuml|d2|graphviz) and return JSON {"syntax","code"} for slide: ${JSON.stringify(slideContext)}`;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.DIAGRAM_MODEL || 'openai/gpt-oss-20b:free', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
    });
    if (!res.ok) throw new Error('Diagram model failed');
    const ai = await res.json();
    const parsed = safeParseJSON(ai.choices[0].message.content, diagramSchema);
    if (!parsed.ok) throw new Error('Invalid diagram JSON');
    ({ syntax, code } = parsed.data);
  }
  const kroki = await fetch(`https://kroki.io/${syntax}/svg/${Buffer.from(code, 'utf8').toString('base64url')}`);
  if (!kroki.ok) throw new Error(`Kroki ${syntax} render failed`);
  const svg = await kroki.text();
  const newElement = { id: uuidv4(), type: 'diagram', content: svg, syntax, position: { x: 10, y: 30 }, size: { width: 80, height: 60 } };
  const { data: slide, error } = await supabaseAdmin.from('slides').select('elements').eq('id', slideId).single();
  if (error) throw error;
  const updatedElements = [...slide.elements, newElement];
  await supabaseAdmin.from('slides').update({ elements: updatedElements }).eq('id', slideId);
  return { type: 'diagram', content: svg, syntax };
}

export async function generateImage(context, supabaseAdmin) {
  const { imageSuggestion, slideId } = context;
  if (!imageSuggestion || !slideId) throw new Error('Missing image suggestion or slideId');
  let imageUrl = '';
  if (process.env.FREE_MODE === 'true') {
    imageUrl = `https://picsum.photos/seed/${encodeURIComponent(imageSuggestion)}/1200/675`;
  } else {
    const masterPrompt = `Photorealistic 16:9 image: ${imageSuggestion}`;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.IMAGE_MODEL || 'openai/gpt-oss-20b:free', messages: [{ role: 'user', content: masterPrompt }] })
    });
    if (!res.ok) throw new Error('Image model failed');
    const data = await res.json();
    imageUrl = data.choices[0]?.message?.content?.trim();
  }
  if (!imageUrl || !imageUrl.startsWith('http')) throw new Error('Invalid image URL');
  await supabaseAdmin.from('slides').update({ image_url: imageUrl }).eq('id', slideId);
  return { type: 'image', imageUrl };
}

export async function generateTheme(context, supabaseAdmin) {
  const { presentationId, command } = context;
  if (!presentationId) throw new Error('Missing presentationId');
  let theme;
  if (process.env.FREE_MODE === 'true') {
    theme = {
      bg_css: 'linear-gradient(135deg, #0f172a, #1f2937)',
      primary_color: '#fadadd',
      secondary_color: '#ffe1c6',
      accent_color: '#ebd8e6',
    };
  } else {
    const prompt = `Return JSON {"bg_css","primary_color","secondary_color","accent_color"} for style: "${command}"`;
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.THEME_MODEL || 'openai/gpt-oss-20b:free', messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' } })
    });
    if (!res.ok) throw new Error('Theme model failed');
    const ai = await res.json();
    const parsed = safeParseJSON(ai.choices[0].message.content.trim(), themeOutputSchema);
    if (!parsed.ok) throw new Error('Invalid theme JSON');
    theme = parsed.data;
  }
  await supabaseAdmin.from('presentations').update({
    theme_bg_css: theme.bg_css,
    theme_primary_color: theme.primary_color,
    theme_secondary_color: theme.secondary_color,
    theme_accent_color: theme.accent_color,
  }).eq('id', presentationId);
  return { type: 'theme', theme };
}