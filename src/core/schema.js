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

export const elementSchema = union([
  titleElementSchema,
  contentElementSchema,
  imageSuggestionSchema,
  diagramElementSchema,
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

// AI Outputs
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

