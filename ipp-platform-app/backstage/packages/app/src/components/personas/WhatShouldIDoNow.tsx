import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tokens as ds } from '../../design-system/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type DataMode = 'live' | 'cached' | 'simulated' | 'rule-based';
type Priority = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface NextAction {
  title: string;
  reason: string;
  priority: Priority;
  etaHint: string;
  route: string;
  dataMode: DataMode;
}

export interface InfoItem {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
  dataMode: DataMode;
}

export interface WhatShouldIDoNowProps {
  topAction: {
    title: string;
    why: string;
    ctaLabel: string;
    route: string;
    color: string;
    dataMode: DataMode;
  };
  nextActions: NextAction[];
  infoItems: InfoItem[];
  accentColor: string;
  allClear?: boolean;
}

// ── Color maps ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<Priority, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'var(--ds-chip-error-bg)', text: 'var(--ds-chip-error-text)', border: 'var(--ds-chip-error-border)', label: 'Critical' },
  high:     { bg: 'var(--ds-chip-warn-bg)', text: 'var(--ds-chip-warn-text)', border: 'var(--ds-chip-warn-border)', label: 'High'     },
  medium:   { bg: 'var(--ds-chip-warn-bg)', text: 'var(--ds-chip-warn-text)', border: 'var(--ds-chip-warn-border)', label: 'Medium'   },
  low:      { bg: 'var(--ds-chip-info-bg)', text: 'var(--ds-chip-info-text)', border: 'var(--ds-chip-info-border)', label: 'Low'      },
  info:     { bg: 'var(--ds-chip-success-bg)', text: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)', label: 'Info'     },
};

const DATA_MODE_META: Record<DataMode, { label: string; color: string }> = {
  live:          { label: 'Live',        color: '#16a34a' },
  cached:        { label: 'Cached',      color: '#D40511' },
  simulated:     { label: 'Simulated',   color: '#d97706' },
  'rule-based':  { label: 'Rule-based',  color: 'var(--clr-compose)' },
};

// ── DataModeTag ───────────────────────────────────────────────────────────────

function DataModeTag({ mode }: { mode: DataMode }) {
  const { label, color } = DATA_MODE_META[mode];
  return (
    <span title={`Data source: ${label.toLowerCase()}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
      <span style={{ fontSize: 10, fontWeight: 600, color }}>{label}</span>
    </span>
  );
}

// ── WhatShouldIDoNow ──────────────────────────────────────────────────────────

export const WhatShouldIDoNow = ({
  topAction,
  nextActions,
  infoItems,
  accentColor,
  allClear = false,
}: WhatShouldIDoNowProps) => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{
      background: ds.color.css.surface,
      border: `1px solid ${ds.color.css.hairline}`,
      borderRadius: 14,
      boxShadow: ds.color.css.shadowResting,
      overflow: 'hidden',
      marginBottom: 24,
      fontFamily: ds.font.sans,
    }}>
      {/* Header / toggle */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: expanded ? `1px solid ${ds.color.css.hairline}` : 'none',
          background: ds.color.css.surfaceAlt, cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accentColor}
            strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 700, color: ds.color.css.textPrimary, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            What should I do now?
          </span>
          <DataModeTag mode={topAction.dataMode} />
        </div>
        <span style={{ color: ds.color.css.textTertiary, fontSize: 12, fontWeight: 700, transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.18s', display: 'inline-block' }}>
          ▼
        </span>
      </div>

      {expanded && (
        <>
          {allClear ? (
            <div style={{ padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--ds-chip-success-bg)', border: '1px solid var(--ds-chip-success-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: ds.color.css.textPrimary, marginBottom: 3 }}>You're all clear</div>
                <div style={{ fontSize: 13, color: ds.color.css.textSecondary, lineHeight: 1.55 }}>No urgent actions required. Here's what's worth watching:</div>
              </div>
            </div>
          ) : (
            /* Top action */
            <div style={{
              padding: '20px 20px 16px', borderBottom: `1px solid ${ds.color.css.hairline}`,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: ds.color.css.textTertiary, marginBottom: 4 }}>Top priority action</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: ds.color.css.textPrimary, lineHeight: 1.25, marginBottom: 5, letterSpacing: '-0.015em' }}>{topAction.title}</div>
                <div style={{ fontSize: 13, color: ds.color.css.textSecondary, lineHeight: 1.55 }}>{topAction.why}</div>
                <div style={{ marginTop: 6 }}><DataModeTag mode={topAction.dataMode} /></div>
              </div>
              <button
                onClick={() => navigate(topAction.route)}
                style={{
                  padding: '10px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, color: '#ffffff', background: topAction.color,
                  whiteSpace: 'nowrap', flexShrink: 0, fontFamily: ds.font.sans,
                  transition: 'opacity 0.12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.87'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
              >
                {topAction.ctaLabel} →
              </button>
            </div>
          )}

          {/* Next actions */}
          {nextActions.length > 0 && (
            <div style={{ padding: '16px 20px 4px', borderBottom: `1px solid ${ds.color.css.hairline}` }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: ds.color.css.textTertiary, marginBottom: 10 }}>Next actions</div>
              {nextActions.map((action, i) => {
                const pColor = PRIORITY_COLORS[action.priority];
                return (
                  <div
                    key={i}
                    onClick={() => navigate(action.route)}
                    style={{ display: 'flex', alignItems: 'flex-start', gap: 10, paddingBottom: 14, cursor: 'pointer' }}
                  >
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: ds.color.css.surfaceAlt, border: `1px solid ${ds.color.css.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ds.color.css.textTertiary, flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: ds.color.css.textPrimary, lineHeight: 1.3 }}>{action.title}</span>
                        <span style={{ padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', background: pColor.bg, color: pColor.text, border: `1px solid ${pColor.border}` }}>
                          {pColor.label}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: ds.color.css.textSecondary, lineHeight: 1.5 }}>{action.reason}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: ds.color.css.textTertiary, fontWeight: 500 }}>⏱ {action.etaHint}</span>
                        <DataModeTag mode={action.dataMode} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Info items */}
          {infoItems.length > 0 && (
            <div style={{ padding: '14px 20px 16px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {infoItems.map((item, i) => (
                <div key={i} style={{ background: ds.color.css.surfaceAlt, border: `1px solid ${ds.color.css.hairline}`, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: ds.color.css.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{item.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: ds.color.css.textPrimary, lineHeight: 1.3 }}>{item.value}</div>
                  <div style={{ marginTop: 4 }}><DataModeTag mode={item.dataMode} /></div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
