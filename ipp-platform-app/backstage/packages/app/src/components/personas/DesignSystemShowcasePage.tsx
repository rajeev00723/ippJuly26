import React, { useState } from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { tokens as ds } from '../../design-system/tokens';

// ── Color swatch ──────────────────────────────────────────────────────────────

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${ds.color.css.hairline}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: value, border: `1px solid ${ds.color.css.hairline}`, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: ds.color.css.textPrimary, fontFamily: ds.font.mono }}>{name}</div>
        <div style={{ fontSize: 11, color: ds.color.css.textTertiary, fontFamily: ds.font.mono }}>{value}</div>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: ds.color.css.textTertiary, marginBottom: 16, paddingBottom: 10, borderBottom: `1px solid ${ds.color.css.hairline}` }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: ds.color.css.surface, border: `1px solid ${ds.color.css.hairline}`, borderRadius: ds.radius.card, padding: 24, boxShadow: ds.color.css.shadowResting, ...style }}>
      {children}
    </div>
  );
}

// ── Button showcase ───────────────────────────────────────────────────────────

function ButtonShowcase() {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
      {[
        { label: 'Primary',  bg: ds.color.css.textPrimary, color: '#fff', border: 'none' },
        { label: 'Focus',    bg: ds.color.css.focus,        color: '#fff', border: 'none' },
        { label: 'Success',  bg: ds.color.success,      color: '#fff', border: 'none' },
        { label: 'Warn',     bg: ds.color.warn,         color: '#fff', border: 'none' },
        { label: 'Error',    bg: ds.color.error,        color: '#fff', border: 'none' },
        { label: 'Ghost',    bg: 'transparent',         color: ds.color.css.textPrimary, border: `1px solid ${ds.color.css.hairline}` },
      ].map(b => (
        <button
          key={b.label}
          style={{
            padding: '10px 22px', borderRadius: ds.radius.button, border: b.border,
            background: b.bg, color: b.color, fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: ds.font.sans, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.82'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}

// ── Tag / badge showcase ──────────────────────────────────────────────────────

function TagShowcase() {
  const tags = [
    { label: 'Success', bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
    { label: 'Warning', bg: 'var(--ds-chip-warn-bg)', color: 'var(--ds-chip-warn-text)', border: 'var(--ds-chip-warn-border)' },
    { label: 'Error',   bg: 'var(--ds-chip-error-bg)', color: 'var(--ds-chip-error-text)', border: 'var(--ds-chip-error-border)' },
    { label: 'Info',    bg: 'var(--ds-chip-info-bg)', color: 'var(--ds-chip-info-text)', border: 'var(--ds-chip-info-border)' },
    { label: 'Purple',  bg: 'var(--ds-chip-info-bg)', color: '#7c3aed', border: 'var(--ds-chip-info-border)' },
    { label: 'Neutral', bg: ds.color.css.surfaceAlt, color: ds.color.css.textSecondary, border: ds.color.css.hairline },
  ];
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {tags.map(t => (
        <span key={t.label} style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
          {t.label}
        </span>
      ))}
    </div>
  );
}

// ── Typography showcase ───────────────────────────────────────────────────────

function TypographyShowcase() {
  const samples = [
    { label: 'Hero', size: ds.type.heroSize, weight: 800 },
    { label: 'H1',   size: ds.type.h1Size,   weight: 700 },
    { label: 'H2',   size: ds.type.h2Size,   weight: 700 },
    { label: 'H3',   size: ds.type.h3Size,   weight: 600 },
    { label: 'Body', size: ds.type.bodySize,  weight: 400 },
    { label: 'Small', size: ds.type.smallSize, weight: 400 },
    { label: 'Eyebrow', size: ds.type.eyebrowSize, weight: 700 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {samples.map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: ds.color.css.textTertiary, width: 60, flexShrink: 0, letterSpacing: '0.06em' }}>{s.label}</span>
          <span style={{ fontSize: s.size, fontWeight: s.weight, color: ds.color.css.textPrimary, fontFamily: ds.font.sans, lineHeight: 1.2 }}>
            The quick brown fox
          </span>
        </div>
      ))}
      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: ds.color.css.textTertiary, width: 60, flexShrink: 0, letterSpacing: '0.06em' }}>Mono</span>
        <span style={{ fontSize: 14, color: ds.color.css.textSecondary, fontFamily: ds.font.mono }}>const x = &quot;hello world&quot;;</span>
      </div>
    </div>
  );
}

// ── Shadow showcase ───────────────────────────────────────────────────────────

function ShadowShowcase() {
  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
      {[
        { label: 'Resting', shadow: ds.color.css.shadowResting },
        { label: 'Hover',   shadow: ds.color.css.shadowHover   },
      ].map(s => (
        <div key={s.label} style={{ background: ds.color.css.surface, borderRadius: ds.radius.card, padding: '24px 32px', boxShadow: s.shadow, textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: ds.color.css.textPrimary, marginBottom: 4 }}>{s.label}</div>
          <div style={{ fontSize: 11, color: ds.color.css.textTertiary, fontFamily: ds.font.mono, maxWidth: 220 }}>{s.shadow}</div>
        </div>
      ))}
    </div>
  );
}

// ── Radius showcase ───────────────────────────────────────────────────────────

function RadiusShowcase() {
  const radii = [
    { label: 'card (18px)',   value: ds.radius.card   },
    { label: 'button (980px)', value: ds.radius.button },
    { label: 'inner (10px)',  value: ds.radius.inner  },
    { label: 'sm (6px)',      value: ds.radius.sm     },
  ];
  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
      {radii.map(r => (
        <div key={r.label} style={{ textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, background: ds.color.css.focus, borderRadius: r.value, opacity: 0.8, margin: '0 auto 8px' }} />
          <div style={{ fontSize: 11, fontWeight: 600, color: ds.color.css.textSecondary }}>{r.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Interactive state demo ────────────────────────────────────────────────────

function InteractiveDemo() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  const [checked, setChecked] = useState(false);

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: ds.color.css.textSecondary, marginBottom: 8 }}>Counter</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setCount(c => c - 1)} style={{ width: 32, height: 32, borderRadius: ds.radius.sm, background: ds.color.css.surfaceAlt, border: `1px solid ${ds.color.css.hairline}`, cursor: 'pointer', fontFamily: ds.font.sans, fontSize: 18, color: ds.color.css.textPrimary }}>−</button>
          <span style={{ fontSize: 24, fontWeight: 800, color: ds.color.css.textPrimary, minWidth: 40, textAlign: 'center' }}>{count}</span>
          <button onClick={() => setCount(c => c + 1)} style={{ width: 32, height: 32, borderRadius: ds.radius.sm, background: ds.color.css.surfaceAlt, border: `1px solid ${ds.color.css.hairline}`, cursor: 'pointer', fontFamily: ds.font.sans, fontSize: 18, color: ds.color.css.textPrimary }}>+</button>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: ds.color.css.textSecondary, marginBottom: 8 }}>Input</div>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Type something…"
          style={{ padding: '9px 12px', border: `1px solid ${ds.color.css.hairline}`, borderRadius: ds.radius.inner, fontSize: 14, fontFamily: ds.font.sans, background: ds.color.css.surface, color: ds.color.css.textPrimary, outline: 'none', width: 220 }}
        />
        {text && <div style={{ marginTop: 4, fontSize: 11, color: ds.color.css.textTertiary }}>{text.length} chars</div>}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: ds.color.css.textSecondary, marginBottom: 8 }}>Toggle</div>
        <div onClick={() => setChecked(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <div style={{ width: 42, height: 24, borderRadius: 12, background: checked ? ds.color.success : ds.color.css.hairline, transition: 'background 0.2s', position: 'relative', border: `1px solid ${ds.color.css.hairline}` }}>
            <div style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 18, height: 18, borderRadius: '50%', background: 'var(--ds-surface)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
          </div>
          <span style={{ fontSize: 13, color: ds.color.css.textSecondary }}>{checked ? 'On' : 'Off'}</span>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export const DesignSystemShowcasePage = () => {
  return (
    <AppleShell title="Design System">
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: ds.color.css.textTertiary, marginBottom: 8 }}>
            ACME Infrastructure Platform Portal
          </div>
          <h1 style={{ fontSize: ds.type.h1Size, fontWeight: 800, color: ds.color.css.textPrimary, margin: '0 0 12px', letterSpacing: '-0.03em', fontFamily: ds.font.sans }}>
            Design System
          </h1>
          <p style={{ fontSize: ds.type.bodySize, color: ds.color.css.textSecondary, margin: 0, lineHeight: 1.65, maxWidth: 600 }}>
            Tokens, primitives, and interactive patterns for the Apple-inspired IPP. No MUI. No Backstage chrome. SF Pro fonts, hairline borders, 980px pill buttons.
          </p>
        </div>

        <Section title="Color Tokens">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {(Object.entries(ds.color).filter(([, v]) => typeof v === 'string') as [string, string][]).map(([name, value]) => (
              <Swatch key={name} name={`color.${name}`} value={value} />
            ))}
          </div>
        </Section>

        <Section title="Typography">
          <Card><TypographyShowcase /></Card>
        </Section>

        <Section title="Buttons">
          <Card><ButtonShowcase /></Card>
        </Section>

        <Section title="Tags & Badges">
          <Card><TagShowcase /></Card>
        </Section>

        <Section title="Border Radius">
          <Card><RadiusShowcase /></Card>
        </Section>

        <Section title="Shadows">
          <ShadowShowcase />
        </Section>

        <Section title="Interactive">
          <Card><InteractiveDemo /></Card>
        </Section>

        <Section title="Surface Hierarchy">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'color.background (#fbfbfd)', bg: ds.color.background },
              { label: 'color.surfaceAlt (#f5f5f7)', bg: ds.color.css.surfaceAlt },
              { label: 'color.surface (#ffffff)',    bg: ds.color.css.surface    },
            ].map(s => (
              <div key={s.label} style={{ background: s.bg, border: `1px solid ${ds.color.css.hairline}`, borderRadius: ds.radius.inner, padding: '16px 20px', fontFamily: ds.font.mono, fontSize: 13, color: ds.color.css.textSecondary }}>
                {s.label}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Font Stacks">
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: ds.color.css.textTertiary, marginBottom: 6 }}>Sans (font.sans)</div>
                <div style={{ fontFamily: ds.font.sans, fontSize: 16, color: ds.color.css.textPrimary }}>SF Pro Display · The platform engineering layer is yours to shape.</div>
                <div style={{ fontSize: 11, color: ds.color.css.textTertiary, fontFamily: ds.font.mono, marginTop: 4 }}>{ds.font.sans}</div>
              </div>
              <div style={{ height: 1, background: ds.color.css.hairline }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: ds.color.css.textTertiary, marginBottom: 6 }}>Mono (font.mono)</div>
                <div style={{ fontFamily: ds.font.mono, fontSize: 14, color: ds.color.css.textSecondary }}>kubectl get crossplanecompositions --all-namespaces</div>
                <div style={{ fontSize: 11, color: ds.color.css.textTertiary, fontFamily: ds.font.mono, marginTop: 4 }}>{ds.font.mono}</div>
              </div>
            </div>
          </Card>
        </Section>

      </div>
    </AppleShell>
  );
};
