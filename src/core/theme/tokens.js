// src/core/theme/tokens.js

// Basic ThemeTokens v1 default and mapping to CSS variables
export const DefaultThemeTokens = {
  version: '1',
  name: 'Default Aurora',
  colors: {
    background: '#0b0b0f',
    surface: '#111827',
    primary: '#fadadd',
    secondary: '#ffe1c6',
    accent: '#ebd8e6',
    textPrimary: '#ffffff',
    textSecondary: '#cbd5e1',
    muted: '#94a3b8',
  },
  fonts: {
    heading: { family: 'Inter', weight: 700 },
    body: { family: 'Inter', weight: 400 },
  },
  radii: { sm: 4, md: 8, lg: 12 },
  shadows: { elev1: '0 2px 8px rgba(0,0,0,0.2)', elev2: '0 8px 24px rgba(0,0,0,0.35)' },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};

export function tokensToCSSVars(tokens = DefaultThemeTokens) {
  const t = tokens.colors;
  return {
    '--color-bg': t.background,
    '--color-surface': t.surface,
    '--color-primary': t.primary,
    '--color-secondary': t.secondary,
    '--color-accent': t.accent,
    '--color-fg': t.textPrimary,
    '--color-fg-muted': t.textSecondary,
  };
}

// Simple WCAG-like contrast heuristic (not exact), ensure ratio ~> 4.5 by brightness diff
function luminance(hex) {
  const v = hex.replace('#','');
  const r = parseInt(v.slice(0,2),16)/255;
  const g = parseInt(v.slice(2,4),16)/255;
  const b = parseInt(v.slice(4,6),16)/255;
  const a = [r,g,b].map(c => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
  return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
}
export function contrastRatio(fg, bg) {
  const L1 = luminance(fg) + 0.05;
  const L2 = luminance(bg) + 0.05;
  const ratio = L1 > L2 ? L1 / L2 : L2 / L1;
  return ratio;
}

export function validateContrast(tokens = DefaultThemeTokens) {
  const ratio = contrastRatio(tokens.colors.textPrimary, tokens.colors.background);
  return ratio >= 4.5;
}
