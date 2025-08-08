// src/app/api/ai-command/generateSlideHtml.js

import { safeParseJSON } from '@/core/schema';

// Create a simple responsive template (FREE_MODE) for consistency
function buildTemplate({ title, points, theme, queued }) {
  const list = (points || []).map((p) => `<li>${String(p)}</li>`).join('');
  const badge = queued?.length ? `<div class="badge">Queued: ${queued.join(', ')}</div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
    :root { --primary:${theme?.primary_color || '#fadadd'}; --secondary:${theme?.secondary_color || '#ffe1c6'}; --accent:${theme?.accent_color || '#ebd8e6'}; --bg:#0b0b0f; --fg:#ffffff; }
    html,body{margin:0;padding:0;width:100%;height:100%;font-family:ui-sans-serif, system-ui; background:linear-gradient(135deg,#0b0b0f,#111827);} 
    .slide{position:relative; width:100%; height:100%; box-sizing:border-box; padding:56px; color:var(--fg);} 
    .title{font-size:48px; font-weight:800; margin:0 0 24px 0; background-image:linear-gradient(100deg,var(--primary),var(--secondary),var(--accent)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;}
    .content{font-size:20px; line-height:1.6;}
    .content li{margin:8px 0;}
    .badge{position:absolute; bottom:24px; right:24px; font-size:12px; color:#bbb;}
  </style></head><body><div class="slide">
    <h1 class="title">${title || ''}</h1>
    <ul class="content">${list}</ul>
    ${badge}
  </div></body></html>`;
}

export async function generateSlideHtml({ slide, presentation, freeMode = true }) {
  const title = (slide.elements || []).find((e) => e.type === 'title')?.content || '';
  const points = (slide.elements || []).find((e) => e.type === 'content')?.content || [];
  const queued = (slide.elements || []).filter((e) => e.type === 'ai_task').map((t) => t.task);

  if (freeMode) {
    return buildTemplate({ title, points, theme: {
      primary_color: presentation?.theme_primary_color,
      secondary_color: presentation?.theme_secondary_color,
      accent_color: presentation?.theme_accent_color,
    }, queued });
  }

  // Non-free mode: call model to synthesize HTML/CSS/JS (to be implemented)
  // This is a placeholder to avoid breaking when FREE_MODE=false
  return buildTemplate({ title, points, theme: {
    primary_color: presentation?.theme_primary_color,
    secondary_color: presentation?.theme_secondary_color,
    accent_color: presentation?.theme_accent_color,
  }, queued });
}

