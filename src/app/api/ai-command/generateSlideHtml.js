// src/app/api/ai-command/generateSlideHtml.js

// We keep this lightweight HTML generator as a fallback and for FREE_MODE

function buildTemplate({ title, points, theme, queued, layout = 'cards', imageUrl = null }) {
  const list = (points || []).map((p) => `<li>${String(p)}</li>`).join('');
  const badge = queued?.length ? `<div class="badge">Queued: ${queued.join(', ')}</div>` : '';
  // multi-layout CSS
  const layoutCss = `
    .grid{display:grid;gap:24px}
    .two-col{grid-template-columns:1fr 1fr}
    .three-col{grid-template-columns:1fr 1fr 1fr}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:16px;border-radius:12px}
    .img{position:absolute; inset:0; background-size:cover; background-position:center; opacity:0.2; border-radius:16px}
    .quote{font-size:36px; font-weight:600; line-height:1.3}
  `;
  let body = '';
  if (layout === 'two-column') {
    const half = Math.ceil((points||[]).length/2);
    const left = (points||[]).slice(0,half).map(p=>`<li>${String(p)}</li>`).join('');
    const right = (points||[]).slice(half).map(p=>`<li>${String(p)}</li>`).join('');
    body = `<div class="grid two-col"><div><ul class="content">${left}</ul></div><div><ul class="content">${right}</ul></div></div>`;
  } else if (layout === 'three-column') {
    const chunk = Math.ceil((points||[]).length/3);
    const cols = [0,1,2].map(i=> (points||[]).slice(i*chunk,(i+1)*chunk).map(p=>`<li>${String(p)}</li>`).join(''));
    body = `<div class="grid three-col">${cols.map(c=>`<div><ul class="content">${c}</ul></div>`).join('')}</div>`;
  } else if (layout === 'image-left' || layout === 'image-right') {
    const img = imageUrl ? `<div class="img" style="${layout==='image-left'?'clip-path:inset(0 40% 0 0)':'clip-path:inset(0 0 0 40%)'};background-image:url('${imageUrl}')"></div>` : '';
    body = `${img}<ul class="content">${list}</ul>`;
  } else if (layout === 'quote') {
    body = `<div class="quote">${title || ''}</div><ul class="content">${list}</ul>`;
  } else {
    // cards
    body = `<div class="grid two-col">${(points||[]).map(p=>`<div class="card">${String(p)}</div>`).join('')}</div>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
    :root { --primary:${theme?.primary_color || '#fadadd'}; --secondary:${theme?.secondary_color || '#ffe1c6'}; --accent:${theme?.accent_color || '#ebd8e6'}; --bg:#0b0b0f; --fg:#ffffff; }
    html,body{margin:0;padding:0;width:100%;height:100%;font-family:ui-sans-serif, system-ui; background:linear-gradient(135deg,#0b0b0f,#111827);} 
    .slide{position:relative; width:100%; height:100%; box-sizing:border-box; padding:56px; color:var(--fg);} 
    .title{font-size:48px; font-weight:800; margin:0 0 24px 0; background-image:linear-gradient(100deg,var(--primary),var(--secondary),var(--accent)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;}
    .content{font-size:20px; line-height:1.6;}
    .content li{margin:8px 0;}
    .badge{position:absolute; bottom:24px; right:24px; font-size:12px; color:#bbb;}
    ${layoutCss}
  </style></head><body><div class="slide">
    <h1 class="title">${title || ''}</h1>
    ${body}
    ${badge}
  </div></body></html>`;
}

export async function generateSlideHtml({ slide, presentation, freeMode = true }) {
  const title = (slide.elements || []).find((e) => e.type === 'title')?.content || '';
  const points = (slide.elements || []).find((e) => e.type === 'content')?.content || [];
  const queued = (slide.elements || []).filter((e) => e.type === 'ai_task').map((t) => t.task);
  const layout = (slide.elements || []).find((e) => e.type === 'layout')?.layout || 'cards';
  const imageUrl = slide.image_url || null;

  return buildTemplate({ title, points, theme: {
    primary_color: presentation?.theme_primary_color,
    secondary_color: presentation?.theme_secondary_color,
    accent_color: presentation?.theme_accent_color,
  }, queued, layout, imageUrl });
}

