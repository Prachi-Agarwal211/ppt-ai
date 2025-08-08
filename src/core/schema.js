// src/core/schema.js

// Moving toward Superstruct for streaming-friendly partial validation
import { object, array, string, number, union, literal, nullable, optional, enums, partial } from 'superstruct';

// Slide element schemas
export const positionSchema = object({ x: number(), y: number() });
export const sizeSchema = object({ width: number(), height: number() });

export const titleElementSchema = object({
  id: string(),
  type: literal('title'),
  content: string(),
  position: positionSchema,
  size: sizeSchema,
});

export const contentElementSchema = object({
  id: string(),
  type: literal('content'),
  content: array(string()),
  position: positionSchema,
  size: sizeSchema,
});

export const imageSuggestionSchema = object({
  id: string(),
  type: literal('image_suggestion'),
  content: string(),
});

export const diagramElementSchema = object({
  id: string(),
  type: literal('diagram'),
  content: string(),
  syntax: enums(['mermaid', 'plantuml', 'd2', 'graphviz']),
  position: positionSchema,
  size: sizeSchema,
});

export const layoutElementSchema = object({
  id: string(),
  type: literal('layout'),
  layout: enums(['title-only','two-column','three-column','cards','image-left','image-right','full-bleed','diagram','quote'])
});

export const elementSchema = union([
  titleElementSchema,
  contentElementSchema,
  imageSuggestionSchema,
  diagramElementSchema,
  layoutElementSchema,
]);

export const slideSchema = object({
  id: union([string(), number()]),
  elements: array(elementSchema),
  notes: optional(string()),
  order: number(),
  image_url: nullable(optional(string())),
  presentation_id: union([string(), number()])
});

export const themeSchema = object({
  bg_css: optional(nullable(string())),
  primary_color: optional(nullable(string())),
  secondary_color: optional(nullable(string())),
  accent_color: optional(nullable(string())),
});

// AI Outputs (existing)
export const blueprintSchema = object({
  title: string(),
  slides: array(object({ slide_title: string(), visual_prompt: string() }))
});

export const slideContentSchema = object({
  notes: string(),
  content_points: array(string()),
});

export const diagramSchema = object({
  syntax: enums(['mermaid', 'plantuml', 'd2', 'graphviz']),
  code: string(),
});

export const themeOutputSchema = object({
  bg_css: string(),
  primary_color: string(),
  secondary_color: string(),
  accent_color: string(),
});

export const interpretSchema = object({ task: enums(['generate_diagram','generate_theme','generate_image','clarify'])});

// New Cognitive Core contracts (v1)
export const presentationStrategySchema = object({
  version: literal('1'),
  goal: string(),
  targetAudience: string(),
  narrativeOutline: array(object({
    slideId: string(),
    titleHint: string(),
    keyMessage: string(),
    type: enums(['overview','comparison','process','data','quote','image','conclusion']),
    notes: optional(string()),
    dependencies: optional(array(string()))
  })),
  length: object({ slides: number() })
});

export const slideTextSchema = object({
  version: literal('1'),
  slideId: string(),
  title: string(),
  bullets: array(string()),
  speakerNotes: string(),
  charBudget: number(),
  locale: optional(string())
});

export const layoutPlanSchema = object({
  version: literal('1'),
  slideId: string(),
  layout: enums(['title-only','two-column','three-column','cards','image-left','image-right','full-bleed','diagram']),
  components: array(object({
    type: enums(['text','image','icon','svg','list','quote','chart']),
    contentRef: string(),
    position: object({ area: string() }),
    styleHints: optional(object({
      emphasis: optional(enums(['low','medium','high'])),
      iconSet: optional(enums(['outline','filled'])),
      density: optional(enums(['cozy','comfortable','compact']))
    }))
  })),
  assets: optional(array(object({
    assetId: string(),
    kind: enums(['svg','image']),
    source: enums(['inline','generated','uploaded']),
    prompt: optional(string()),
    svg: optional(string())
  }))),
  accessibility: optional(object({ contrastMin: number(), fontScale: optional(enums(['normal','large'])) }))
});

export const finalSlideSchema = object({
  version: literal('1'),
  slideId: string(),
  html: string(),
  themeId: optional(string()),
  assets: optional(array(string())),
  a11yScore: number()
});

export const themeTokensSchema = object({
  version: literal('1'),
  name: string(),
  colors: object({
    background: string(),
    surface: string(),
    primary: string(),
    secondary: string(),
    accent: string(),
    textPrimary: string(),
    textSecondary: string(),
    muted: string(),
  }),
  fonts: object({
    heading: object({ family: string(), weight: number() }),
    body: object({ family: string(), weight: number() }),
  }),
  radii: object({ sm: number(), md: number(), lg: number() }),
  shadows: object({ elev1: string(), elev2: string() }),
  spacing: object({ xs: number(), sm: number(), md: number(), lg: number(), xl: number() })
});

// Utilities
export const safeParseJSON = (text, schema) => {
  try {
    const obj = JSON.parse(text);
    const data = schema.create(obj);
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e };
  }
};

// streaming-friendly partial slide validation
export const PartialSlideStruct = partial(slideSchema);
export const validateIncremental = (chunk) => {
  try {
    const obj = JSON.parse(chunk);
    return PartialSlideStruct.create(obj);
  } catch {
    return null;
  }
};
