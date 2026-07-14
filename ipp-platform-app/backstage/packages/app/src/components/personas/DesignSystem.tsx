/**
 * IPP — Infrastructure Platform Portal — Shared Design System
 *
 * Central design tokens, reusable components, and style utilities shared
 * across all persona dashboard pages. Import from this file instead of
 * redefining styles per page.
 */
import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import Chip from '@material-ui/core/Chip';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import CheckCircleIcon from '@material-ui/icons/CheckCircle';
import ErrorIcon from '@material-ui/icons/Error';
import WarningIcon from '@material-ui/icons/Warning';
import InfoIcon from '@material-ui/icons/Info';
import SyncIcon from '@material-ui/icons/Sync';
import HourglassEmptyIcon from '@material-ui/icons/HourglassEmpty';
import OpenInNewIcon from '@material-ui/icons/OpenInNew';

// ─── Design Tokens ─────────────────────────────────────────────────────────────

export const tokens = {
  // Brand
  brand:       'var(--ds-focus)',
  brandLight:  '#D40511',
  brandBg:     'var(--ds-chip-info-bg)',
  brandBorder: 'var(--ds-chip-info-border)',

  // Neutrals
  bg:           '#FAFAF8',
  surface:      '#ffffff',
  surfaceAlt:   'var(--ds-surface-alt)',
  border:       '#E5E7EB',
  borderStrong: '#D1C9B0',

  // Text
  textPrimary:   '#1A1A1A',
  textSecondary: 'var(--ds-text-secondary)',
  textMuted:     '#6B6B6B',

  // Status
  green:       '#16a34a',
  greenBg:     'var(--ds-chip-success-bg)',
  greenBorder: 'var(--ds-chip-success-border)',

  amber:       '#d97706',
  amberBg:     'var(--ds-chip-warn-bg)',
  amberBorder: 'var(--ds-chip-warn-border)',

  red:       '#D40511',
  redBg:     'var(--ds-chip-error-bg)',
  redBorder: 'var(--ds-chip-error-border)',

  blue:       '#D40511',
  blueBg:     'var(--ds-chip-info-bg)',
  blueBorder: 'var(--ds-chip-info-border)',

  purple:       '#7c3aed',
  purpleBg:     'var(--ds-chip-info-bg)',
  purpleBorder: 'var(--ds-chip-info-border)',

  cyan:       '#D40511',
  cyanBg:     'var(--ds-chip-info-bg)',
  cyanBorder: 'var(--ds-chip-info-border)',

  // Persona palette
  personas: {
    developer:        { color: '#D40511', bg: 'var(--ds-chip-info-bg)',  border: 'var(--ds-chip-info-border)' },
    platform:         { color: 'var(--clr-compose)', bg: 'var(--clr-compose-bg)',  border: 'var(--clr-compose-border)' },
    operations:       { color: '#d97706', bg: 'var(--ds-chip-warn-bg)',  border: 'var(--ds-chip-warn-border)' },
    security:         { color: '#D40511', bg: 'var(--ds-chip-error-bg)',  border: '#fecaca' },
    provider:         { color: '#D40511', bg: 'var(--ds-chip-info-bg)',  border: 'var(--ds-chip-info-border)' },
    crossplane:       { color: 'var(--clr-compose)', bg: 'var(--clr-compose-bg)',  border: 'var(--clr-compose-border)' },
    gitops:           { color: '#ea580c', bg: 'var(--ds-chip-warn-bg)',  border: 'var(--ds-chip-warn-border)' },
    aiops:            { color: '#d97706', bg: 'var(--ds-chip-warn-bg)',  border: 'var(--ds-chip-warn-border)' },
    cost:             { color: '#16a34a', bg: 'var(--ds-chip-success-bg)',  border: 'var(--ds-chip-success-border)' },
    securityPosture:  { color: '#D40511', bg: 'var(--ds-chip-error-bg)',  border: '#fecaca' },
  },

  // Spacing
  radiusCard: 12,
  radiusChip: 999,
  radiusInner: 8,

  // Shadows
  shadowCard: 'var(--ds-shadow-resting)',
  shadowHover: 'var(--ds-shadow-hover)',
} as const;

// ─── Shared makeStyles classes reusable across pages ───────────────────────────

export const useSharedStyles = makeStyles(theme => ({
  // Metric KPI card (top of each page)
  metricCard: {
    background: theme.palette.background.paper,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: tokens.radiusCard,
    padding: theme.spacing(2, 2.5),
    borderTop: '3px solid',
    boxShadow: tokens.shadowCard,
    height: '100%',
  },
  metricLabel: {
    fontSize: '0.67rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: theme.palette.text.secondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: '1.55rem',
    fontWeight: 800,
    lineHeight: 1.1,
    color: theme.palette.text.primary,
  },
  metricSub: {
    fontSize: '0.72rem',
    color: theme.palette.text.secondary,
    marginTop: 3,
    lineHeight: 1.4,
  },

  // Table header
  tableHeader: {
    fontWeight: 700,
    backgroundColor: theme.palette.background.default,
    fontSize: '0.68rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: theme.palette.text.secondary,
    whiteSpace: 'nowrap',
  },

  // Action buttons row
  actionButton: {
    marginRight: theme.spacing(1),
    marginBottom: theme.spacing(1),
    fontWeight: 600,
  },

  // External link row
  externalLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing(0.75),
  },

  // Info/guidance box (blue tint)
  guidanceBox: {
    background: tokens.brandBg,
    border: `1px solid ${tokens.brandBorder}`,
    borderRadius: tokens.radiusInner,
    padding: theme.spacing(2.5),
  },
  guidanceTitle: {
    fontWeight: 700,
    fontSize: '0.75rem',
    color: tokens.brand,
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: theme.spacing(1),
  },

  // Section label (small uppercase divider text)
  sectionLabel: {
    fontSize: '0.68rem',
    fontWeight: 700,
    color: tokens.textMuted,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: theme.spacing(1.5),
  },

  // Provisioning / step row
  stepRow: {
    display: 'flex',
    alignItems: 'flex-start',
    marginBottom: theme.spacing(1.75),
    gap: theme.spacing(1.5),
  },
  stepLabel: {
    fontWeight: 600,
    fontSize: '0.85rem',
    color: theme.palette.text.primary,
  },
  stepDetail: {
    fontSize: '0.75rem',
    color: theme.palette.text.secondary,
    marginTop: 2,
    lineHeight: 1.45,
  },

  // Empty state box
  emptyState: {
    textAlign: 'center',
    padding: theme.spacing(5),
    color: theme.palette.text.secondary,
  },

  // Demo banner / alert box at the bottom of pages
  demoBanner: {
    background: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    borderLeft: `4px solid ${tokens.brandLight}`,
    borderRadius: tokens.radiusInner,
    padding: theme.spacing(2, 2.5),
    marginTop: theme.spacing(1),
  },

  // Agent / evidence code block
  evidenceBox: {
    background: theme.palette.background.default,
    borderRadius: 6,
    padding: theme.spacing(0.75, 1.25),
    fontFamily: "'SF Mono', 'Fira Code', 'Fira Mono', monospace",
    fontSize: '0.72rem',
    color: theme.palette.text.secondary,
    wordBreak: 'break-all',
    lineHeight: 1.5,
  },
}));

// ─── MetricCard ────────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color: string;
  icon?: React.ReactNode;
}

export const MetricCard = ({ label, value, sub, color, icon }: MetricCardProps) => {
  const classes = useSharedStyles();
  return (
    <Paper elevation={0} className={classes.metricCard} style={{ borderTopColor: color }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div className={classes.metricLabel}>{label}</div>
          <div className={classes.metricValue} style={{ color }}>{value}</div>
          {sub && <div className={classes.metricSub}>{sub}</div>}
        </div>
        {icon && (
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: `${color}14`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginLeft: 8,
          }}>
            {icon}
          </div>
        )}
      </div>
    </Paper>
  );
};

// ─── StatusChip ────────────────────────────────────────────────────────────────

type StatusVariant =
  | 'healthy' | 'synced' | 'ready' | 'active' | 'pass' | 'true'
  | 'degraded' | 'outofsync' | 'error' | 'failed' | 'false'
  | 'warning' | 'pending' | 'unknown';

const STATUS_MAP: Record<string, { bg: string; color: string; border: string; label?: string }> = {
  healthy:    { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  synced:     { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  ready:      { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  active:     { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  pass:       { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  done:       { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  true:       { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  running:    { bg: 'var(--ds-chip-info-bg)', color: 'var(--ds-chip-info-text)', border: 'var(--ds-chip-info-border)' },
  degraded:   { bg: 'var(--ds-chip-error-bg)', color: 'var(--ds-chip-error-text)', border: 'var(--ds-chip-error-border)' },
  outofsync:  { bg: 'var(--ds-chip-error-bg)', color: 'var(--ds-chip-error-text)', border: 'var(--ds-chip-error-border)', label: 'Out of Sync' },
  error:      { bg: 'var(--ds-chip-error-bg)', color: 'var(--ds-chip-error-text)', border: 'var(--ds-chip-error-border)' },
  failed:     { bg: 'var(--ds-chip-error-bg)', color: 'var(--ds-chip-error-text)', border: 'var(--ds-chip-error-border)' },
  false:      { bg: 'var(--ds-chip-error-bg)', color: 'var(--ds-chip-error-text)', border: 'var(--ds-chip-error-border)' },
  warning:    { bg: 'var(--ds-chip-warn-bg)', color: 'var(--ds-chip-warn-text)', border: 'var(--ds-chip-warn-border)' },
  pending:    { bg: 'var(--ds-surface-alt)', color: 'var(--ds-text-secondary)', border: '#e2e8f0' },
  unknown:    { bg: 'var(--ds-surface-alt)', color: 'var(--ds-text-secondary)', border: '#e2e8f0' },
};

export const StatusChip = ({ status, size = 'small' }: { status: string; size?: 'small' | 'medium' }) => {
  const key = status.toLowerCase().replace(/\s+/g, '');
  const style = STATUS_MAP[key] ?? STATUS_MAP.unknown;
  return (
    <Chip
      label={style.label ?? status}
      size={size}
      style={{
        fontWeight: 700,
        fontSize: size === 'small' ? '0.68rem' : '0.78rem',
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        height: size === 'small' ? 22 : 28,
      }}
    />
  );
};

// ─── StepIcon ──────────────────────────────────────────────────────────────────

export const StepIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'complete':     return <CheckCircleIcon style={{ color: '#16a34a', fontSize: 20 }} />;
    case 'in-progress':  return <SyncIcon style={{ color: '#D40511', fontSize: 20 }} />;
    case 'error':        return <ErrorIcon style={{ color: '#D40511', fontSize: 20 }} />;
    case 'warning':      return <WarningIcon style={{ color: '#d97706', fontSize: 20 }} />;
    case 'pending':
    default:             return <HourglassEmptyIcon style={{ color: '#6B6B6B', fontSize: 20 }} />;
  }
};

// ─── SeverityIcon ──────────────────────────────────────────────────────────────

export const SeverityIcon = ({ severity, size = 20 }: { severity: string; size?: number }) => {
  const s = severity?.toLowerCase();
  if (s === 'critical' || s === 'high')   return <ErrorIcon style={{ color: '#D40511', fontSize: size }} />;
  if (s === 'medium' || s === 'warning')  return <WarningIcon style={{ color: '#d97706', fontSize: size }} />;
  if (s === 'low' || s === 'info')        return <InfoIcon style={{ color: '#D40511', fontSize: size }} />;
  return <CheckCircleIcon style={{ color: '#16a34a', fontSize: size }} />;
};

// ─── ExternalLink ──────────────────────────────────────────────────────────────

export const ExternalLink = ({ href, label }: { href: string; label: string }) => {
  const classes = useSharedStyles();
  return (
    <Box className={classes.externalLink}>
      <OpenInNewIcon style={{ color: '#6B6B6B', fontSize: 13 }} />
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: tokens.brandLight, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}
      >
        {label}
      </a>
    </Box>
  );
};

// ─── EmptyState ────────────────────────────────────────────────────────────────

export const EmptyState = ({
  title = 'No data available',
  description = 'Data will appear here when the service is reachable.',
  icon,
}: {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}) => {
  const classes = useSharedStyles();
  return (
    <Box className={classes.emptyState}>
      {icon && <Box mb={1.5} style={{ opacity: 0.4 }}>{icon}</Box>}
      <Typography variant="body2" style={{ fontWeight: 600, color: 'var(--ds-text-secondary)', marginBottom: 4 }}>
        {title}
      </Typography>
      <Typography variant="caption" style={{ color: '#6B6B6B', lineHeight: 1.6 }}>
        {description}
      </Typography>
    </Box>
  );
};

// ─── UnavailableBanner ─────────────────────────────────────────────────────────

export const UnavailableBanner = ({
  service,
  reason = 'Service is not reachable from this browser. It may require cluster port-forwarding.',
  action,
  command,
}: {
  service: string;
  reason?: string;
  action?: string;
  command?: string;
}) => {
  const classes = useSharedStyles();
  return (
    <Box className={classes.demoBanner}>
      <Typography style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--ds-text-secondary)', marginBottom: 4 }}>
        {service} — Representative Data
      </Typography>
      <Typography style={{ fontSize: '0.75rem', color: 'var(--ds-text-secondary)', lineHeight: 1.6, marginBottom: command ? 8 : 0 }}>
        {reason}
        {action && <> {action}</>}
      </Typography>
      {command && (
        <Box component="code" style={{
          display: 'block',
          fontFamily: "'SF Mono', 'Fira Code', monospace",
          fontSize: '0.72rem',
          background: 'var(--ds-surface-alt)',
          border: '1px solid #e2e8f0',
          borderRadius: 6,
          padding: '6px 10px',
          color: 'var(--ds-text-secondary)',
        }}>
          {command}
        </Box>
      )}
    </Box>
  );
};

// ─── PageBreadcrumb ────────────────────────────────────────────────────────────

export const PageBreadcrumb = ({
  persona,
  personaRoute,
  page,
}: {
  persona: string;
  personaRoute: string;
  page: string;
}) => (
  <Box display="flex" alignItems="center" style={{ gap: 6, marginBottom: 4 }}>
    <a href={personaRoute} style={{ color: '#6B6B6B', fontSize: '0.75rem', textDecoration: 'none' }}>
      {persona}
    </a>
    <span style={{ color: '#cbd5e1', fontSize: '0.75rem' }}>›</span>
    <span style={{ color: 'var(--ds-text-secondary)', fontSize: '0.75rem', fontWeight: 500 }}>{page}</span>
  </Box>
);

// ─── InlineIcon (SVG path helper) ──────────────────────────────────────────────

export const InlineIcon = ({
  d,
  size = 20,
  color = 'currentColor',
}: {
  d: string;
  size?: number;
  color?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d={d} />
  </svg>
);

// ─── Severity color helper ─────────────────────────────────────────────────────

export const SEVERITY_COLORS: Record<string, string> = {
  critical: '#D40511',
  high:     '#ea580c',
  medium:   '#d97706',
  low:      '#D40511',
  info:     '#16a34a',
  healthy:  '#16a34a',
};

export const getSeverityColor = (sev: string): string =>
  SEVERITY_COLORS[sev?.toLowerCase()] ?? 'var(--ds-text-secondary)';

// ─── Screen governance: Mockup vs Real ────────────────────────────────────────
//
// Mockup screens: soft amber accent, "Future Vision" badge, dashed border,
//   banner stating data is simulated.
// Real functional screens: blue/graphite accent, "Live · Functional" badge,
//   production-style cards, real action affordances.
//
// Never mix treatments on the same screen.

type ScreenMode = 'live' | 'mockup';

interface ScreenGovernanceBadgeProps {
  mode: ScreenMode;
  label?: string;
}

export const ScreenGovernanceBadge = ({ mode, label }: ScreenGovernanceBadgeProps) => {
  const isLive = mode === 'live';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 5,
      padding: '3px 10px',
      borderRadius: 999,
      fontSize: '0.65rem',
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      background: isLive ? 'var(--ds-chip-info-bg)' : 'var(--ds-chip-warn-bg)',
      border: `1px solid ${isLive ? 'var(--ds-chip-info-border)' : 'var(--ds-chip-warn-border)'}`,
      color: isLive ? 'var(--ds-chip-info-text)' : 'var(--ds-chip-warn-text)',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: isLive ? '#D40511' : '#d97706',
        display: 'inline-block',
      }} />
      {label ?? (isLive ? 'Live · Functional' : 'Future Vision')}
    </span>
  );
};

interface MockupBannerProps {
  message?: string;
}

export const MockupBanner = ({ message }: MockupBannerProps) => (
  <Box style={{
    background: 'var(--ds-chip-warn-bg)',
    border: '1px dashed #d97706',
    borderRadius: 8,
    padding: '8px 14px',
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  }}>
    <span style={{
      width: 8, height: 8, borderRadius: '50%',
      background: '#d97706', flexShrink: 0, display: 'inline-block',
    }} />
    <Typography style={{ fontSize: '0.75rem', color: 'var(--ds-chip-warn-text)', lineHeight: 1.5 }}>
      {message ?? 'Conceptual demo view — not connected to live APIs. Simulated data only. No real actions are executed from this screen.'}
    </Typography>
  </Box>
);

interface LiveScreenHeaderProps {
  source?: string;
}

export const LiveScreenHeader = ({ source }: LiveScreenHeaderProps) => (
  <Box style={{
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  }}>
    <ScreenGovernanceBadge mode="live" />
    {source && (
      <Typography style={{ fontSize: '0.7rem', color: tokens.textMuted }}>
        Source: {source}
      </Typography>
    )}
  </Box>
);
