// Shared UI primitives for the infra-onboarding plugin.
// All components use CSS custom properties for dark/light mode compatibility.
import React from 'react';
import { tokens } from '../../../design-system/tokens';
import type { CloudType } from '../types';

const FONT = tokens.font.sans;
const MONO = tokens.font.mono;

// ── DemoChip ──────────────────────────────────────────────────────────────────

export const DemoChip: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span
    title="Demo data — representative values only"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: 980,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.04em',
      background: 'var(--ds-chip-warn-bg)',
      color: 'var(--ds-warn)',
      fontFamily: FONT,
      cursor: 'default',
      userSelect: 'none',
      ...style,
    }}
  >
    DEMO
  </span>
);

// ── CloudTypeBadge ────────────────────────────────────────────────────────────

export const CloudTypeBadge: React.FC<{ cloudType: CloudType; style?: React.CSSProperties }> = ({ cloudType, style }) => {
  const isPrivate = cloudType === 'private';
  return (
    <span
      title={isPrivate ? 'Private Cloud — on-premises / KubeVirt / vcluster' : 'Public Cloud — Azure AKS'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 980,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        background: isPrivate ? 'var(--ds-chip-neutral-bg)' : 'var(--ds-chip-info-bg)',
        color: isPrivate ? 'var(--ds-chip-neutral-text)' : 'var(--ds-chip-info-text)',
        fontFamily: FONT,
        cursor: 'default',
        userSelect: 'none',
        ...style,
      }}
    >
      {isPrivate ? '🔒 Private Cloud' : '☁️ Public Cloud'}
    </span>
  );
};

// ── SectionCard ───────────────────────────────────────────────────────────────

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  demo?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, demo, children, style }) => (
  <div style={{
    background: 'var(--ds-surface)',
    border: '1px solid var(--ds-hairline)',
    borderRadius: 18,
    padding: 20,
    boxShadow: 'var(--ds-shadow-resting)',
    ...style,
  }}>
    {(title || demo) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: subtitle ? 4 : 14 }}>
        {title && (
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ds-text-primary)', fontFamily: FONT, letterSpacing: '-0.01em' }}>
            {title}
          </p>
        )}
        {demo && <DemoChip />}
      </div>
    )}
    {subtitle && (
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
        {subtitle}
      </p>
    )}
    {children}
  </div>
);

// ── ProgressStepper ───────────────────────────────────────────────────────────

interface Step {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'done' | 'error';
}

export const ProgressStepper: React.FC<{ steps: Step[] }> = ({ steps }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {steps.map((step, i) => {
      const isActive = step.status === 'in_progress';
      const isDone = step.status === 'done';
      const isError = step.status === 'error';
      return (
        <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            fontFamily: FONT,
            background: isError
              ? 'var(--ds-error)'
              : isDone
              ? 'var(--ds-success)'
              : isActive
              ? 'var(--ds-focus)'
              : 'var(--ds-surface-alt)',
            color: (isDone || isError || isActive) ? '#fff' : 'var(--ds-text-tertiary)',
            transition: 'background 0.3s ease',
          }}>
            {isDone ? '✓' : isError ? '✕' : isActive ? (
              <span style={{ display: 'inline-block', animation: 'io-spin 1s linear infinite' }}>◌</span>
            ) : i + 1}
          </div>
          <span style={{
            fontSize: 14,
            fontFamily: FONT,
            color: isError
              ? 'var(--ds-error)'
              : isDone
              ? 'var(--ds-success)'
              : isActive
              ? 'var(--ds-text-primary)'
              : 'var(--ds-text-tertiary)',
            fontWeight: isActive ? 600 : 400,
            transition: 'color 0.3s ease',
          }}>
            {step.label}
          </span>
          {isActive && (
            <span style={{ fontSize: 12, color: 'var(--ds-focus)', fontFamily: FONT }}>
              In progress…
            </span>
          )}
        </div>
      );
    })}
    <style>{`@keyframes io-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ── CostPanel ────────────────────────────────────────────────────────────────

interface CostBreakdown {
  compute: number;
  storage: number;
  networking: number;
  total: number;
}

export const CostPanel: React.FC<{
  breakdown: CostBreakdown | null;
  loading?: boolean;
  title?: string;
}> = ({ breakdown, loading, title = 'Estimated Monthly Cost' }) => (
  <div style={{
    background: 'var(--ds-surface-alt)',
    border: '1px solid var(--ds-hairline)',
    borderRadius: 14,
    padding: '16px 20px',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary)', fontFamily: FONT }}>
        💰 {title}
      </span>
      <DemoChip />
    </div>
    {loading || !breakdown ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 14, borderRadius: 6, background: 'var(--ds-hairline)', animation: 'io-shimmer 1.4s ease-in-out infinite' }} />
        ))}
        <style>{`@keyframes io-shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
      </div>
    ) : (
      <>
        <CostRow label="Compute" value={breakdown.compute} />
        <CostRow label="Storage" value={breakdown.storage} />
        <CostRow label="Networking" value={breakdown.networking} />
        <div style={{ borderTop: '1px solid var(--ds-hairline)', margin: '10px 0 8px' }} />
        <CostRow label="Total Forecast" value={breakdown.total} bold />
        <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>
          ⓘ Estimates are indicative. Actual charges appear after provisioning.
        </p>
      </>
    )}
  </div>
);

const CostRow: React.FC<{ label: string; value: number; bold?: boolean }> = ({ label, value, bold }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
    <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT, fontWeight: bold ? 600 : 400 }}>
      {label}:
    </span>
    <span style={{ fontSize: 13, color: 'var(--ds-text-primary)', fontFamily: MONO, fontWeight: bold ? 700 : 400 }}>
      ${value.toFixed(2)} / month
    </span>
  </div>
);

// ── Btn ───────────────────────────────────────────────────────────────────────

export const Btn: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
}> = ({ children, onClick, variant = 'primary', disabled, style, type = 'button' }) => {
  const [hover, setHover] = React.useState(false);
  const bg = disabled
    ? 'var(--ds-surface-alt)'
    : variant === 'primary'
    ? hover ? '#0050a0' : 'var(--ds-focus)'
    : variant === 'danger'
    ? hover ? '#cc2f26' : 'var(--ds-error)'
    : hover ? 'var(--ds-surface-alt)' : 'var(--ds-surface)';
  const color = disabled
    ? 'var(--ds-text-tertiary)'
    : variant === 'secondary'
    ? 'var(--ds-text-primary)'
    : '#fff';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '9px 20px',
        border: variant === 'secondary' ? '1px solid var(--ds-hairline)' : 'none',
        borderRadius: 980,
        fontSize: 14, fontWeight: 600, fontFamily: FONT,
        background: bg, color,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s ease',
        ...style,
      }}
    >
      {children}
    </button>
  );
};

// ── FormField ────────────────────────────────────────────────────────────────

export const FormField: React.FC<{
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, error, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary)', fontFamily: FONT }}>
      {label}{required && <span style={{ color: 'var(--ds-error)', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && (
      <span style={{ fontSize: 12, color: 'var(--ds-error)', fontFamily: FONT }}>❌ {error}</span>
    )}
  </div>
);

export const Input: React.FC<{
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
}> = ({ value, onChange, placeholder, disabled, error }) => (
  <input
    value={value}
    onChange={e => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    style={{
      padding: '8px 12px',
      border: `1px solid ${error ? 'var(--ds-error)' : 'var(--ds-hairline)'}`,
      borderRadius: 8,
      fontSize: 14,
      fontFamily: FONT,
      background: 'var(--ds-surface)',
      color: 'var(--ds-text-primary)',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
    }}
  />
);

export const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}> = ({ value, onChange, options, disabled }) => (
  <select
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
    style={{
      padding: '8px 12px',
      border: '1px solid var(--ds-hairline)',
      borderRadius: 8,
      fontSize: 14,
      fontFamily: FONT,
      background: 'var(--ds-surface)',
      color: 'var(--ds-text-primary)',
      outline: 'none',
      width: '100%',
      boxSizing: 'border-box',
      cursor: 'pointer',
    }}
  >
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

export const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}> = ({ checked, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => onChange(!checked)}>
    <div style={{
      width: 40, height: 22, borderRadius: 11,
      background: checked ? 'var(--ds-focus)' : 'var(--ds-surface-alt)',
      position: 'relative', transition: 'background 0.2s',
      border: '1px solid var(--ds-hairline)',
      flexShrink: 0,
    }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%',
        background: 'var(--ds-surface)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        position: 'absolute',
        top: 2,
        left: checked ? 20 : 2,
        transition: 'left 0.2s',
      }} />
    </div>
    <span style={{ fontSize: 13, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>{label}</span>
  </div>
);

export const Slider: React.FC<{
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label?: string;
}> = ({ value, min, max, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    {label && <span style={{ fontSize: 13, fontFamily: FONT, color: 'var(--ds-text-secondary)', minWidth: 60 }}>{label}</span>}
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      style={{ flex: 1, accentColor: 'var(--ds-focus)' }}
    />
    <span style={{ fontSize: 14, fontWeight: 600, fontFamily: MONO, color: 'var(--ds-text-primary)', minWidth: 28, textAlign: 'right' }}>
      {value}
    </span>
  </div>
);

// ── CopyBlock ────────────────────────────────────────────────────────────────

export const CopyBlock: React.FC<{ code: string; language?: string }> = ({ code }) => {
  const [copied, setCopied] = React.useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ position: 'relative' }}>
      <pre style={{
        margin: 0,
        padding: '14px 16px',
        background: 'var(--ds-surface-alt)',
        border: '1px solid var(--ds-hairline)',
        borderRadius: 10,
        fontSize: 12,
        fontFamily: MONO,
        color: 'var(--ds-text-primary)',
        overflowX: 'auto',
        whiteSpace: 'pre',
        lineHeight: 1.6,
      }}>
        {code}
      </pre>
      <button
        onClick={copy}
        style={{
          position: 'absolute', top: 8, right: 8,
          padding: '4px 10px', border: 'none', borderRadius: 6,
          fontSize: 11, fontWeight: 600, fontFamily: FONT,
          background: copied ? 'var(--ds-success)' : 'var(--ds-surface)',
          color: copied ? '#fff' : 'var(--ds-text-secondary)',
          cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          transition: 'background 0.2s',
        }}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

export { FONT, MONO };
