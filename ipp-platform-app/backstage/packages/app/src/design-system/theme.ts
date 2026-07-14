import { createUnifiedTheme, palettes, genPageTheme, shapes } from '@backstage/theme';
import { tokens, dhl } from './tokens';

// ── Page header themes ────────────────────────────────────────────────────────
// These control the gradient background of Backstage card headers.
// Our custom AppleShell hides the main Backstage page <Header> so these
// only appear inside ItemCardHeader thumbnail areas.

// All card headers use flat DHL yellow — CSS override below also enforces this.
// fontColor is DHL red on yellow for WCAG AA contrast (4.5:1 ratio).
const mkPage = (colors: [string, string], shape = shapes.wave2) =>
  genPageTheme({ colors, shape, options: { fontColor: '#B0000B' } });

const DHL_YELLOW_FLAT: [string, string] = ['#FFCC00', '#FFCC00'];

const pageThemeMap = {
  service:       mkPage(DHL_YELLOW_FLAT),
  website:       mkPage(DHL_YELLOW_FLAT),
  library:       mkPage(DHL_YELLOW_FLAT),
  tool:          mkPage(DHL_YELLOW_FLAT, shapes.round),
  app:           mkPage(DHL_YELLOW_FLAT),
  documentation: mkPage(DHL_YELLOW_FLAT),
  apis:          mkPage(DHL_YELLOW_FLAT),
  home:          mkPage(DHL_YELLOW_FLAT),
  other:         mkPage(DHL_YELLOW_FLAT),
  card:          mkPage(DHL_YELLOW_FLAT),
};

// ── Light theme ────────────────────────────────────────────────────────────────
export const appleThemeLight = createUnifiedTheme({
  palette: {
    ...palettes.light,
    primary:    { main: dhl.red,   light: '#E8420A', dark: '#A30010', contrastText: '#ffffff' },
    secondary:  { main: dhl.yellow, light: '#FFD740', dark: '#E6B800', contrastText: dhl.black },
    background: { default: '#FAFAF8', paper: '#FFFFFF' },
    text:       { primary: dhl.textPrimary, secondary: dhl.textSecondary, disabled: '#9A9A9A' },
    error:      { main: dhl.red },
    warning:    { main: '#F59E0B' },
    success:    { main: '#22C55E' },
    divider:    dhl.grey200,
    navigation: {
      background:    dhl.surface,
      indicator:     dhl.red,
      color:         dhl.textSecondary,
      selectedColor: dhl.red,
      navItem:       { hoverBackground: 'rgba(255,204,0,0.15)' },
      submenu:       { background: '#FFF9E6' },
    },
  },
  fontFamily: tokens.font.sans,
  typography: {
    fontFamily: tokens.font.sans,
    h1: { fontSize: 36, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15 },
    h2: { fontSize: 28, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2 },
    h3: { fontSize: 22, fontWeight: 700, lineHeight: 1.25 },
    h4: { fontSize: 18, fontWeight: 600, lineHeight: 1.3 },
    h5: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: 13, fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: 14, lineHeight: 1.6 },
    body2: { fontSize: 13, lineHeight: 1.5 },
    caption: { fontSize: 11, letterSpacing: 0.3 },
    overline: { fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase' as const },
  },
  pageTheme: pageThemeMap,
  defaultPageTheme: 'home',
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: tokens.font.sans,
          backgroundColor: '#FAFAF8',
          color: dhl.textPrimary,
          fontSize: '15px',
        },
      },
    },
    MuiAppBar:  { styleOverrides: { root: { display: 'none' } } },
    MuiToolbar: { styleOverrides: { root: { display: 'none' } } },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: tokens.radius.button,
          fontFamily: tokens.font.sans,
          letterSpacing: 'normal',
          boxShadow: 'none',
          transition: 'transform 100ms ease, background 150ms ease, box-shadow 150ms ease',
          '&:hover': { boxShadow: 'none' },
          '&:active': { transform: 'scale(0.97)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.card,
          boxShadow: 'none',
          border: `1px solid ${dhl.grey200}`,
          backgroundColor: dhl.surface,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.card,
          boxShadow: tokens.shadow.resting,
          border: `1px solid ${dhl.grey200}`,
          backgroundColor: dhl.surface,
          transition: 'transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease',
          '&:hover': {
            borderColor: dhl.yellow,
            boxShadow: tokens.shadow.hover,
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '999px',
          fontFamily: tokens.font.sans,
          fontSize: '12px',
          fontWeight: 600,
          height: '24px',
        },
      },
    },
    MuiTypography: {
      styleOverrides: { root: { fontFamily: tokens.font.sans } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: dhl.black,
          color: '#F5F5F5',
          fontSize: '12px',
          borderRadius: '4px',
          padding: '6px 10px',
          transitionDelay: '200ms',
        },
      },
    },
  },
});

// ── Dark theme ─────────────────────────────────────────────────────────────────
export const appleThemeDark = createUnifiedTheme({
  palette: {
    ...palettes.dark,
    primary:    { main: '#F5F5F5', light: '#ffffff', dark: '#EBEBEB', contrastText: dhl.black },
    secondary:  { main: dhl.red,   light: '#E8420A', dark: '#A30010', contrastText: '#ffffff' },
    background: { default: dhl.charcoal, paper: dhl.surfaceDark },
    text:       { primary: '#F5F5F5', secondary: '#B0B0B0', disabled: '#757575' },
    error:      { main: '#FF4D57' },
    warning:    { main: '#FCD34D' },
    success:    { main: '#4ADE80' },
    divider:    'rgba(255,255,255,0.10)',
    navigation: {
      background:    dhl.charcoal,
      indicator:     dhl.yellow,
      color:         '#B0B0B0',
      selectedColor: dhl.yellow,
      navItem:       { hoverBackground: 'rgba(255,204,0,0.10)' },
      submenu:       { background: dhl.slate },
    },
  },
  fontFamily: tokens.font.sans,
  typography: {
    fontFamily: tokens.font.sans,
    h1: { fontSize: 36, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15 },
    h2: { fontSize: 28, fontWeight: 700, letterSpacing: -0.3, lineHeight: 1.2 },
    h3: { fontSize: 22, fontWeight: 700, lineHeight: 1.25 },
    h4: { fontSize: 18, fontWeight: 600, lineHeight: 1.3 },
    h5: { fontSize: 15, fontWeight: 600, lineHeight: 1.4 },
    h6: { fontSize: 13, fontWeight: 600, lineHeight: 1.4 },
    body1: { fontSize: 14, lineHeight: 1.6 },
    body2: { fontSize: 13, lineHeight: 1.5 },
    caption: { fontSize: 11, letterSpacing: 0.3 },
    overline: { fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: 'uppercase' as const },
  },
  pageTheme: pageThemeMap,
  defaultPageTheme: 'home',
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          fontFamily: tokens.font.sans,
          backgroundColor: dhl.charcoal,
          color: '#F5F5F5',
          fontSize: '15px',
        },
      },
    },
    MuiAppBar: { styleOverrides: { root: { display: 'none' } } },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: tokens.radius.button,
          fontFamily: tokens.font.sans,
          letterSpacing: 'normal',
          boxShadow: 'none',
          transition: 'transform 100ms ease, background 150ms ease',
          '&:active': { transform: 'scale(0.97)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.card,
          border: `1px solid rgba(255,255,255,0.10)`,
          backgroundColor: dhl.surfaceDark,
          boxShadow: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: tokens.radius.card,
          border: `1px solid rgba(255,255,255,0.10)`,
          backgroundColor: dhl.surfaceDark,
          transition: 'transform 150ms ease, border-color 150ms ease',
          '&:hover': { borderColor: dhl.yellow },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '999px',
          fontFamily: tokens.font.sans,
          fontSize: '12px',
          fontWeight: 600,
          height: '24px',
        },
      },
    },
    MuiTypography: {
      styleOverrides: { root: { fontFamily: tokens.font.sans } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1A1A1A',
          color: '#F5F5F5',
          fontSize: '12px',
          borderRadius: '4px',
          padding: '6px 10px',
          transitionDelay: '200ms',
        },
      },
    },
  },
});
