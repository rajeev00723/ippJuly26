// ── DHL Design Tokens ─────────────────────────────────────────────────────────
// All consuming code should use these tokens or the CSS variable equivalents
// (var(--dhl-yellow) etc.) so light/dark mode works automatically.

export const dhl = {
  yellow:        '#FFCC00',
  yellowLight:   '#FFF4CC',
  yellowSurface: '#FFFBEB',
  red:           '#D40511',
  redDeep:       '#B0000B',
  black:         '#1A1A1A',
  charcoal:      '#2B2B2B',
  slate:         '#3D3D3D',
  grey100:       '#F5F5F5',
  grey200:       '#EBEBEB',
  grey600:       '#6B6B6B',
  surface:       '#FFFFFF',
  surfaceDark:   '#2F2F2F',
  textPrimary:   '#1A1A1A',
  textSecondary: '#6B6B6B',
  borderWarm:    '#F1E3A3',
} as const;

export const tokens = {
  color: {
    background:    dhl.grey100,
    surface:       dhl.surface,
    surfaceAlt:    '#F0F0F0',
    textPrimary:   dhl.textPrimary,
    textSecondary: dhl.textSecondary,
    textTertiary:  '#9A9A9A',
    hairline:      dhl.grey200,
    focus:         dhl.yellow,
    success:       '#22C55E',
    warn:          '#F59E0B',
    error:         dhl.red,
    /** Crossplane / composition domain accent */
    compose:       '#7c3aed',
    // CSS variable references for dark-mode-aware inline styles
    css: {
      bg:            'var(--ds-bg)',
      surface:       'var(--ds-surface)',
      surfaceAlt:    'var(--ds-surface-alt)',
      textPrimary:   'var(--ds-text-primary)',
      textSecondary: 'var(--ds-text-secondary)',
      textTertiary:  'var(--ds-text-tertiary)',
      hairline:      'var(--ds-hairline)',
      focus:         'var(--ds-focus)',
      compose:       'var(--clr-compose)',
      success:       'var(--ds-success)',
      warn:          'var(--ds-warn)',
      error:         'var(--ds-error)',
      shadowResting: 'var(--ds-shadow-resting)',
      shadowHover:   'var(--ds-shadow-hover)',
      chipNeutralBg: 'var(--ds-chip-neutral-bg)',
    },
  },
  /** 4-px base spacing scale */
  space: {
    1:  '4px',
    2:  '8px',
    3:  '12px',
    4:  '16px',
    5:  '20px',
    6:  '24px',
    7:  '28px',
    8:  '32px',
    10: '40px',
    12: '48px',
    16: '64px',
  },
  radius: {
    card:   '8px',
    button: '8px',
    pill:   '999px',
    inner:  '8px',
    sm:     '6px',
  },
  shadow: {
    resting: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
    hover:   '0 4px 12px rgba(0,0,0,0.08), 0 16px 40px rgba(0,0,0,0.08)',
  },
  font: {
    sans: "'Inter','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
    mono: "'JetBrains Mono','SF Mono',ui-monospace,Menlo,monospace",
  },
  type: {
    heroSize:    'clamp(40px,4.5vw,60px)',
    h1Size:      '40px',
    h2Size:      '28px',
    h3Size:      '20px',
    bodySize:    '15px',
    smallSize:   '13px',
    eyebrowSize: '11px',
    metricSize:  '32px',
  },
  motion: {
    standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
    duration: '150ms',
  },
  sidebar: {
    width: '240px',
  },
  topbar: {
    height: '56px',
  },
} as const;

export type Tokens = typeof tokens;
