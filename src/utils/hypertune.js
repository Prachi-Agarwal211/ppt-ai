// src/utils/hypertune.js
// Phase 4.1 6 4.2: Hypertune configuration for A/B testing AI prompts

const HYPERTUNE_API_KEY = process.env.HYPERTUNE_API_KEY;

// Mock Hypertune client for development and fallback
class MockHypertune {
  constructor() {}
  flag(flagName, context) {
    const variants = {
      'blueprint_prompt_logic': ['default', 'creative', 'concise', 'analytical'],
      'blueprint_style_preference': ['default', 'detailed', 'minimal', 'visual']
    };
    const options = variants[flagName] || ['default'];
    const hash = this.simpleHash(context?.userId || 'anonymous');
    return options[hash % options.length];
  }
  track() {}
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

let hypertune;
let isHypertuneMock = true;

if (HYPERTUNE_API_KEY) {
  try {
    const mod = require('hypertune');
    const HypertuneCtor = mod?.Hypertune || mod?.default || mod;
    const maybeInstance = HypertuneCtor ? new HypertuneCtor({ token: HYPERTUNE_API_KEY }) : null;
    if (maybeInstance && typeof maybeInstance.flag === 'function') {
      hypertune = maybeInstance;
      isHypertuneMock = false;
    } else {
      hypertune = new MockHypertune();
      isHypertuneMock = true;
    }
  } catch (e) {
    hypertune = new MockHypertune();
    isHypertuneMock = true;
  }
} else {
  hypertune = new MockHypertune();
  isHypertuneMock = true;
}

/**
 * Phase 4.2: A/B Testing for AI Prompts
 * This allows us to test different prompt strategies and measure their effectiveness
 */
export class PromptVariantManager {
  constructor() {
    this.hypertune = hypertune;
  }

  /**
   * Get the strategic angles prompt variant for A/B testing
   */
  getAnglesPromptVariant(userId = 'anonymous') {
    try {
      const variant = this.hypertune.flag('blueprint_prompt_logic', {
        userId,
        context: { feature: 'angles_generation' }
      });

      return this.getAnglesPrompt(variant);
    } catch (error) {
      console.warn('Hypertune flag evaluation failed, using default:', error);
      return this.getAnglesPrompt('default');
    }
  }

  /**
   * Get the blueprint generation prompt variant
   */
  getBlueprintPromptVariant(userId = 'anonymous') {
    try {
      const variant = this.hypertune.flag('blueprint_style_preference', {
        userId,
        context: { feature: 'blueprint_generation' }
      });

      return this.getBlueprintPrompt(variant);
    } catch (error) {
      console.warn('Hypertune flag evaluation failed, using default:', error);
      return this.getBlueprintPrompt('default');
    }
  }

  /**
   * Different angle prompt variants for A/B testing
   */
  getAnglesPrompt(variant) {
    const prompts = {
      creative: [
        'You are an innovative presentation strategist with a flair for creative storytelling.',
        'Think outside the box and propose unique, memorable angles that will captivate audiences.',
        'Respond ONLY with JSON following the contract:',
        '{ "angles": [ { "angle_id": "...", "title": "...", "description": "...", "audience": "General", "emphasis_keywords": ["..."] } ] }',
        '2-3 bold, creative angles that stand out. Make them memorable and engaging.'
      ].join('\n'),
      
      concise: [
        'You are a strategic presentation consultant focused on clarity and impact.',
        'Propose clear, direct angles that deliver maximum value with minimal complexity.',
        'Respond ONLY with JSON following the contract:',
        '{ "angles": [ { "angle_id": "...", "title": "...", "description": "...", "audience": "General", "emphasis_keywords": ["..."] } ] }',
        '2-3 focused, actionable angles. Keep them crisp and practical.'
      ].join('\n'),
      
      analytical: [
        'You are a data-driven presentation strategist specializing in evidence-based approaches.',
        'Focus on angles that emphasize research, metrics, and analytical insights.',
        'Respond ONLY with JSON following the contract:',
        '{ "angles": [ { "angle_id": "...", "title": "...", "description": "...", "audience": "General", "emphasis_keywords": ["..."] } ] }',
        '2-3 analytical angles backed by logic and data. Emphasize credibility.'
      ].join('\n'),
      
      default: [
        'You are a world-class presentation strategist.',
        'Respond ONLY with JSON following the contract:',
        '{ "angles": [ { "angle_id": "...", "title": "...", "description": "...", "audience": "General", "emphasis_keywords": ["..."] } ] }',
        '2-3 angles. Keep concise. angle_id must be unique.'
      ].join('\n')
    };

    return prompts[variant] || prompts.default;
  }

  /**
   * Different blueprint prompt variants for A/B testing
   */
  getBlueprintPrompt(variant) {
    const prompts = {
      detailed: [
        'You are an expert content creator specializing in comprehensive, detailed presentations.',
        'Create rich, thorough content with extensive supporting details and context.',
        'Output JSON ONLY matching the blueprint schema. Do not include any commentary.',
        'Act as a brand designer. Extend theme into a Generative Design System (GDS) with full palette and typography specifications.',
        'For each slide, include detailed blocks: bullet_points, paragraph, statistic_highlight, pull_quote, callout, image_request, diagram_request. Aim for 2-3 substantial blocks per slide.'
      ].join('\n'),
      
      minimal: [
        'You are an expert content creator focused on clarity and brevity.',
        'Create clean, focused content that delivers key messages with maximum impact.',
        'Output JSON ONLY matching the blueprint schema. Do not include any commentary.',
        'Act as a brand designer with a minimalist approach. Create clean, elegant design systems.',
        'For each slide, use 1-2 focused blocks that deliver core messages clearly and powerfully.'
      ].join('\n'),
      
      visual: [
        'You are an expert content creator with a strong focus on visual storytelling.',
        'Emphasize visual elements, diagrams, and imagery to support your narrative.',
        'Output JSON ONLY matching the blueprint schema. Do not include any commentary.',
        'Act as a brand designer with emphasis on visual appeal and engaging layouts.',
        'For each slide, prioritize visual blocks: image_request, diagram_request, and visually appealing statistics or quotes.'
      ].join('\n'),
      
      default: [
        'You are an expert content creator. Output JSON ONLY matching the blueprint schema.',
        'Do not include any commentary.',
        'Act as a brand designer. Extend theme into a Generative Design System (GDS) with palette {text_primary,text_secondary,background_primary,background_secondary,accent_primary,accent_secondary,data_positive,data_negative,neutral}, typography {heading_font,body_font,heading_scale,body_scale,line_height}, and mood_keywords.',
        'For each slide, consider adding blocks: bullet_points, paragraph, statistic_highlight, pull_quote, callout, image_request, diagram_request, table_request. Keep 1–3 blocks per slide.'
      ].join('\n')
    };

    return prompts[variant] || prompts.default;
  }

  /**
   * Track conversion events for A/B test optimization
   */
  trackConversion(userId, event, properties = {}) {
    try {
      this.hypertune.track(userId, event, properties);
    } catch (error) {
      console.warn('Failed to track conversion:', error);
    }
  }
}

// Export singleton instance
export const promptVariantManager = new PromptVariantManager();
export { hypertune, isHypertuneMock };
