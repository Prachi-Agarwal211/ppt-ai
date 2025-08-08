// src/core/cognitive/designer.js

// Simple heuristic-based Designer that outputs a layout plan string and component areas.
export function pickLayout(slide) {
  const title = (slide.elements || []).find(e => e.type === 'title')?.content || '';
  const points = (slide.elements || []).find(e => e.type === 'content')?.content || [];
  const hasImage = !!slide.image_url;
  const hasImageSuggestion = (slide.elements || []).some(e => e.type === 'image_suggestion');
  const bullets = Array.isArray(points) ? points.length : 0;

  if (hasImage || hasImageSuggestion) {
    return bullets <= 2 ? 'image-right' : 'image-left';
  }
  if (bullets >= 5) return 'three-column';
  if (bullets >= 3) return 'two-column';
  if (bullets <= 1 && title.length <= 40) return 'quote';
  return 'cards';
}

export function toLayoutElement(layout) {
  return { id: `layout-${layout}`, type: 'layout', layout };
}
