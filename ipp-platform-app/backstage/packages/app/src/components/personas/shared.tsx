/**
 * Shared primitive components for persona and tool dashboard pages.
 * All components use CSS custom properties so they render correctly in both
 * light and dark mode without additional changes to callers.
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { tokens, dhl } from '../../design-system/tokens';
import { ChevronLeft, AlertTriangle, BookOpen } from 'lucide-react';

const font = tokens.font.sans;
const mono = tokens.font.mono;

// ── DHL Rule Line ─────────────────────────────────────────────────────────────
// The Signature Element — 2px yellow rule that opens every section.
export const DhlRule: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <hr style={{
    display: 'block',
    width: '100%',
    height: 2,
    background: dhl.yellow,
    border: 'none',
    margin: '0 0 20px',
    flexShrink: 0,
    ...style,
  }} />
);

// ── StatusChip ────────────────────────────────────────────────────────────────

function chipColor(status: string): { color: string; bg: string; border: string; dot: string } {
  const s = status?.toLowerCase() ?? '';

  if (
    s.includes('healthy') || s.includes('synced') || s.includes('pass') ||
    s.includes('done') || s.includes('complete') || s.includes('active') ||
    s.includes('ready') || s === 'true' || s.includes('valid') ||
    s.includes('enforced') || s.includes('resolved') || s.includes('on track')
  ) return { color: 'var(--ds-chip-success-text)', bg: 'var(--ds-chip-success-bg)', border: 'var(--ds-chip-success-border)', dot: 'var(--ds-success)' };

  if (
    s.includes('progress') || s.includes('running') || s.includes('pending') ||
    s.includes('investigating') || s.includes('audit') || s.includes('monitoring') ||
    s.includes('budget risk') || s.includes('warning')
  ) return { color: 'var(--ds-chip-warn-text)', bg: 'var(--ds-chip-warn-bg)', border: 'var(--ds-chip-warn-border)', dot: 'var(--ds-warn)' };

  if (
    s.includes('error') || s.includes('fail') || s.includes('critical') ||
    s.includes('degraded') || s.includes('high') || s.includes('over forecast')
  ) return { color: 'var(--ds-chip-error-text)', bg: 'var(--ds-chip-error-bg)', border: 'var(--ds-chip-error-border)', dot: 'var(--ds-error)' };

  if (s.includes('low') || s.includes('info'))
    return { color: 'var(--ds-chip-info-text)', bg: 'var(--ds-chip-info-bg)', border: 'var(--ds-chip-info-border)', dot: 'var(--ds-focus)' };

  return { color: 'var(--ds-chip-neutral-text)', bg: 'var(--ds-chip-neutral-bg)', border: 'var(--ds-chip-neutral-border)', dot: 'var(--ds-text-tertiary)' };
}

export interface StatusChipProps {
  status: string;
  style?: React.CSSProperties;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, style }) => {
  const { color, bg, border, dot } = chipColor(status);
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontFamily: font,
        whiteSpace: 'nowrap',
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {/* Color dot + text label — never color alone */}
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, flexShrink: 0 }} />
      {status}
    </span>
  );
};

// ── MetricCard ────────────────────────────────────────────────────────────────

export interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accentColor?: string;
  style?: React.CSSProperties;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, sub, accentColor, style }) => (
  <div
    style={{
      background: 'var(--ds-surface)',
      border: '1px solid var(--ds-hairline)',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: 'var(--ds-shadow-resting)',
      borderTop: accentColor ? `3px solid ${accentColor}` : `3px solid transparent`,
      position: 'relative',
      overflow: 'hidden',
      ...style,
    }}
  >
    {/* DHL Rule Line */}
    {accentColor === dhl.yellow && (
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: dhl.yellow }} />
    )}
    <p className="ds-metric-label" style={{ fontFamily: font }}>{label}</p>
    <p
      className="ds-metric-value"
      style={{
        fontFamily: font,
        fontSize: 'clamp(22px, 3vw, 32px)',
        color: accentColor ?? 'var(--ds-text-primary)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </p>
    {sub && <p className="ds-metric-sub" style={{ fontFamily: font }}>{sub}</p>}
  </div>
);

// ── DsCard ────────────────────────────────────────────────────────────────────

export interface DsCardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  /** Pass true to suppress the DHL yellow rule line above the title */
  noRule?: boolean;
}

export const DsCard: React.FC<DsCardProps> = ({ title, subtitle, children, style, noRule = false }) => (
  <div
    style={{
      background: 'var(--ds-surface)',
      border: '1px solid var(--ds-hairline)',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: 'var(--ds-shadow-resting)',
      ...style,
    }}
  >
    {title && !noRule && <DhlRule style={{ margin: '0 0 16px' }} />}
    {title && (
      <p style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: font, letterSpacing: '-0.02em' }}>
        {title}
      </p>
    )}
    {subtitle && (
      <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--ds-text-secondary)', fontFamily: font }}>
        {subtitle}
      </p>
    )}
    {children}
  </div>
);

// ── Table helpers (TH / TD) ───────────────────────────────────────────────────

export const TH: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <th
    style={{
      padding: '9px 12px',
      textAlign: 'left',
      fontSize: '11px',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.07em',
      color: 'var(--ds-text-secondary)',
      fontFamily: font,
      borderBottom: `2px solid var(--ds-hairline)`,
      whiteSpace: 'nowrap',
      background: 'var(--ds-surface)',
      position: 'sticky',
      top: 0,
      zIndex: 1,
      ...style,
    }}
  >
    {children}
  </th>
);

export const TD: React.FC<{ children: React.ReactNode; useMono?: boolean; style?: React.CSSProperties }> = ({ children, useMono, style }) => (
  <td
    style={{
      padding: '10px 12px',
      fontSize: '13px',
      color: 'var(--ds-text-primary)',
      fontFamily: useMono ? mono : font,
      borderBottom: '1px solid var(--ds-hairline)',
      verticalAlign: 'middle',
      fontVariantNumeric: useMono ? 'tabular-nums' : undefined,
      ...style,
    }}
  >
    {children}
  </td>
);

// ── PageHeader ────────────────────────────────────────────────────────────────
// Consistent page header with DHL rule line, eyebrow, title, subtitle

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ eyebrow, title, subtitle, action, style }) => (
  <div style={{ marginBottom: 24, ...style }}>
    {eyebrow && (
      <p style={{
        margin: '0 0 8px',
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.09em',
        color: dhl.red,
        fontFamily: font,
      }}>
        {eyebrow}
      </p>
    )}
    <DhlRule style={{ margin: '0 0 16px' }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <h1 style={{
          margin: 0,
          fontSize: '32px',
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--ds-text-primary)',
          fontFamily: font,
          lineHeight: 1.2,
        }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{
            margin: '6px 0 0',
            fontSize: '15px',
            color: 'var(--ds-text-secondary)',
            fontFamily: font,
            lineHeight: 1.6,
          }}>
            {subtitle}
          </p>
        )}
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  </div>
);

// ── BackBreadcrumb ────────────────────────────────────────────────────────────

export const BackBreadcrumb: React.FC<{ label: string; to: string; style?: React.CSSProperties }> = ({ label, to, style }) => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '4px 0',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--ds-text-tertiary)',
        fontSize: 12,
        fontFamily: font,
        fontWeight: 600,
        marginBottom: 16,
        letterSpacing: '-0.01em',
        transition: 'color 0.15s',
        ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.color = dhl.red)}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
    >
      <ChevronLeft size={13} strokeWidth={2.5} />
      {label}
    </button>
  );
};

// ── UnavailableBanner ─────────────────────────────────────────────────────────

export interface UnavailableBannerProps {
  service: string;
  reason?: string;
  command?: string;
}

export const UnavailableBanner: React.FC<UnavailableBannerProps> = ({
  service,
  reason = 'The service is not reachable. Live data will appear when the engine is online.',
  command,
}) => {
  const navigate = useNavigate();
  return (
    <div className="ds-unavailable-banner">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
        <AlertTriangle size={15} strokeWidth={2} style={{ color: 'var(--ds-warn)', flexShrink: 0, marginTop: 1 }} />
        <p className="title" style={{ fontFamily: font, margin: 0 }}>{service} unavailable</p>
      </div>
      <p className="reason" style={{ fontFamily: font }}>{reason}</p>
      {command && (
        <code
          style={{
            display: 'block',
            marginTop: '10px',
            fontSize: '12px',
            fontFamily: mono,
            background: 'var(--ds-surface-alt)',
            border: '1px solid var(--ds-hairline)',
            padding: '7px 10px',
            borderRadius: '6px',
            color: 'var(--ds-text-primary)',
          }}
        >
          {command}
        </code>
      )}
      <button
        onClick={() => navigate('/getting-started')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
          padding: '6px 12px',
          borderRadius: '6px',
          border: `1px solid var(--ds-hairline)`,
          background: 'var(--ds-surface)',
          color: 'var(--ds-text-secondary)',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: font,
          cursor: 'pointer',
          transition: 'border-color 150ms ease',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = dhl.yellow)}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--ds-hairline)')}
      >
        <BookOpen size={12} strokeWidth={2} />
        View setup guide
      </button>
    </div>
  );
};
