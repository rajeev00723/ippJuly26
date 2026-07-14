import React from 'react';
import { useNavigate } from 'react-router-dom';
import { tokens as ds } from '../../design-system/tokens';

// ── Types ─────────────────────────────────────────────────────────────────────

type DataMode = 'live' | 'cached' | 'simulated' | 'rule-based';

export interface ContextSignal {
  label: string;
  value: string;
  status?: string;
  dataMode: DataMode;
}

export interface ContextCardDef {
  sourcePersona: string;
  sourcePersonaColor: string;
  sourceRoute: string;
  title: string;
  description: string;
  signals: ContextSignal[];
  iconPath: string;
}

// ── Data-mode label ───────────────────────────────────────────────────────────

const DATA_MODE: Record<DataMode, { label: string; color: string }> = {
  live:          { label: 'Live',        color: '#16a34a' },
  cached:        { label: 'Cached',      color: '#D40511' },
  simulated:     { label: 'Simulated',   color: '#d97706' },
  'rule-based':  { label: 'Rule-based',  color: 'var(--clr-compose)' },
};

// ── StatusChip (inline) ───────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { bg: string; text: string; border: string }> = {
  healthy:  { bg: 'var(--ds-chip-success-bg)', text: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  synced:   { bg: 'var(--ds-chip-success-bg)', text: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  ready:    { bg: 'var(--ds-chip-info-bg)', text: 'var(--ds-chip-info-text)', border: 'var(--ds-chip-info-border)' },
  active:   { bg: 'var(--ds-chip-info-bg)', text: 'var(--ds-chip-info-text)', border: 'var(--ds-chip-info-border)' },
  pass:     { bg: 'var(--ds-chip-success-bg)', text: 'var(--ds-chip-success-text)', border: 'var(--ds-chip-success-border)' },
  warning:  { bg: 'var(--ds-chip-warn-bg)', text: 'var(--ds-chip-warn-text)', border: 'var(--ds-chip-warn-border)' },
  error:    { bg: 'var(--ds-chip-error-bg)', text: 'var(--ds-chip-error-text)', border: 'var(--ds-chip-error-border)' },
};

function StatusChipInline({ status }: { status: string }) {
  const s = STATUS_MAP[status.toLowerCase()] ?? { bg: 'var(--ds-surface-alt)', text: 'var(--ds-text-secondary)', border: '#e2e8f0' };
  return (
    <span style={{ ...s, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
}

// ── ContextCard ───────────────────────────────────────────────────────────────

function ContextCard({ card }: { card: ContextCardDef }) {
  const navigate = useNavigate();
  const primaryMode: DataMode = card.signals[0]?.dataMode ?? 'simulated';
  const { label: modeLabel, color: modeColor } = DATA_MODE[primaryMode];

  return (
    <div
      onClick={() => navigate(card.sourceRoute)}
      onKeyDown={e => { if (e.key === 'Enter') navigate(card.sourceRoute); }}
      role="button"
      tabIndex={0}
      aria-label={`View ${card.sourcePersona} details`}
      style={{
        background: ds.color.css.surface,
        border: `1px solid ${ds.color.css.hairline}`,
        borderLeft: `3px solid ${card.sourcePersonaColor}`,
        borderRadius: 12,
        padding: '16px 18px',
        boxShadow: ds.color.css.shadowResting,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        fontFamily: ds.font.sans,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = ds.color.css.shadowHover;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = ds.color.css.shadowResting;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Source persona tag */}
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10, background: ds.color.css.surfaceAlt, border: `1px solid ${ds.color.css.hairline}`, color: ds.color.css.textTertiary }}>
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={card.sourcePersonaColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={card.iconPath} />
        </svg>
        Context · {card.sourcePersona}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${card.sourcePersonaColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={card.sourcePersonaColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={card.iconPath} />
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: ds.color.css.textPrimary, lineHeight: 1.25 }}>{card.title}</span>
      </div>

      <div style={{ fontSize: 12, color: ds.color.css.textSecondary, lineHeight: 1.5, marginBottom: 10 }}>{card.description}</div>

      {/* Signals */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {card.signals.map((sig, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, color: ds.color.css.textSecondary, flex: 1 }}>{sig.label}</span>
            {sig.status ? (
              <StatusChipInline status={sig.status} />
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, color: ds.color.css.textPrimary }}>{sig.value}</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${ds.color.css.hairline}`, paddingTop: 8, marginTop: 4 }}>
        <span title="Read-only context — no privileged actions" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, background: ds.color.css.surfaceAlt, border: `1px solid ${ds.color.css.hairline}`, fontSize: 10, color: ds.color.css.textTertiary, fontWeight: 500 }}>
          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Read-only
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: modeColor, display: 'inline-block' }} />
            <span style={{ fontSize: 10, fontWeight: 600, color: modeColor }}>{modeLabel}</span>
          </span>
          <span style={{ fontSize: 11, fontWeight: 600, color: card.sourcePersonaColor }}>View full →</span>
        </div>
      </div>
    </div>
  );
}

// ── CrossPersonaContextCards ──────────────────────────────────────────────────

interface CrossPersonaContextCardsProps {
  cards: ContextCardDef[];
  sectionLabel?: string;
}

export const CrossPersonaContextCards = ({
  cards,
  sectionLabel = 'Cross-persona context — read-only signals from adjacent roles',
}: CrossPersonaContextCardsProps) => {
  if (cards.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--ds-text-muted, #86868b)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, fontFamily: ds.font.sans }}>
        {sectionLabel}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
        {cards.map((card, i) => <ContextCard key={i} card={card} />)}
      </div>
    </div>
  );
};

// ── Pre-built context card sets per persona ───────────────────────────────────

export const DEVELOPER_CONTEXT_CARDS: ContextCardDef[] = [
  {
    sourcePersona: 'Security', sourcePersonaColor: '#dc2626', sourceRoute: '/security',
    title: 'Security posture on your workloads',
    description: 'Policy check results, RBAC scope, and identity status for workloads you own.',
    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    signals: [
      { label: 'Policy violations (your apps)', value: '0 failures',  dataMode: 'simulated' },
      { label: 'SPIFFE identities registered',  value: '3 / 3',       dataMode: 'simulated' },
      { label: 'Kyverno checks on your PRs',    value: 'Pass', status: 'pass', dataMode: 'simulated' },
    ],
  },
  {
    sourcePersona: 'Platform', sourcePersonaColor: 'var(--clr-compose)', sourceRoute: '/platform',
    title: 'Platform health for your apps',
    description: 'Cluster readiness, GitOps sync state, and template health for capabilities you consume.',
    iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    signals: [
      { label: 'Cluster health',            value: 'Healthy', status: 'healthy', dataMode: 'simulated' },
      { label: 'Argo CD sync (your app)',    value: 'Synced',  status: 'synced',  dataMode: 'simulated' },
      { label: 'Crossplane composition',    value: 'Ready',   status: 'ready',   dataMode: 'simulated' },
    ],
  },
];

export const PLATFORM_CONTEXT_CARDS: ContextCardDef[] = [
  {
    sourcePersona: 'Developer', sourcePersonaColor: '#D40511', sourceRoute: '/developer',
    title: 'Developer activity across teams',
    description: 'Roll-up of active apps, in-flight provisioning requests, template adoption, and drift.',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    signals: [
      { label: 'Apps in catalog',               value: '4',    dataMode: 'simulated'  },
      { label: 'Pending provision requests',     value: '1',    dataMode: 'simulated'  },
      { label: 'Template adoption rate',         value: '100%', dataMode: 'rule-based' },
    ],
  },
  {
    sourcePersona: 'Security', sourcePersonaColor: '#dc2626', sourceRoute: '/security',
    title: 'Security posture across the platform',
    description: 'Policy compliance per workload, RBAC anomalies, Cilium zero-trust signals.',
    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    signals: [
      { label: 'Policy violations (platform)', value: '0',        dataMode: 'simulated'  },
      { label: 'RBAC anomalies',               value: 'None',     dataMode: 'rule-based' },
      { label: 'Cilium zero-trust',            value: 'Enforced', status: 'active', dataMode: 'simulated' },
    ],
  },
];

export const SECURITY_CONTEXT_CARDS: ContextCardDef[] = [
  {
    sourcePersona: 'Platform', sourcePersonaColor: 'var(--clr-compose)', sourceRoute: '/platform',
    title: 'Platform risk surface',
    description: 'Crossplane composition health, Argo CD drift, and cluster inventory as security attack surface.',
    iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    signals: [
      { label: 'Crossplane compositions', value: 'All healthy', status: 'healthy',  dataMode: 'simulated'  },
      { label: 'Argo CD drift detected',  value: '0 apps',                          dataMode: 'simulated'  },
      { label: 'Provider versions',       value: 'Current',    status: 'healthy',   dataMode: 'rule-based' },
    ],
  },
  {
    sourcePersona: 'Developer', sourcePersonaColor: '#D40511', sourceRoute: '/developer',
    title: 'Per-team security posture',
    description: 'Failed policy checks per developer team, risky workloads, and recent audit actions.',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    signals: [
      { label: 'Failed policy checks (devs)',  value: '0',  dataMode: 'simulated'  },
      { label: 'Risky workloads flagged',      value: '0',  dataMode: 'rule-based' },
      { label: 'Developer audit events (24h)', value: '12', dataMode: 'simulated'  },
    ],
  },
];

export const OPERATIONS_CONTEXT_CARDS: ContextCardDef[] = [
  {
    sourcePersona: 'Security', sourcePersonaColor: '#dc2626', sourceRoute: '/security',
    title: 'Security signals for operations',
    description: 'Policy violations, zero-trust anomalies, and identity issues affecting operational stability.',
    iconPath: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    signals: [
      { label: 'Active policy violations',  value: '0',    dataMode: 'simulated' },
      { label: 'Network deny events (1h)',   value: '0',    dataMode: 'simulated' },
      { label: 'SPIRE identity issues',      value: 'None', status: 'healthy', dataMode: 'simulated' },
    ],
  },
  {
    sourcePersona: 'Developer', sourcePersonaColor: '#D40511', sourceRoute: '/developer',
    title: 'Developer deployment activity',
    description: 'Recent deployments, rollback events, and GitOps sync status affecting ops workload.',
    iconPath: 'M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4',
    signals: [
      { label: 'Deployments (last 24h)', value: '3',       dataMode: 'simulated' },
      { label: 'Rollback events',        value: '0',       dataMode: 'simulated' },
      { label: 'Argo CD sync state',     value: 'Synced',  status: 'synced', dataMode: 'simulated' },
    ],
  },
];

export const PROVIDER_CONTEXT_CARDS: ContextCardDef[] = [
  {
    sourcePersona: 'Platform', sourcePersonaColor: 'var(--clr-compose)', sourceRoute: '/platform',
    title: 'Platform health overview',
    description: 'Crossplane provider status, cluster capacity, and composition readiness relevant to your fulfillment queue.',
    iconPath: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    signals: [
      { label: 'Platform providers',      value: 'All healthy', status: 'healthy', dataMode: 'simulated'  },
      { label: 'Cluster capacity',        value: '72% used',                       dataMode: 'rule-based' },
      { label: 'Composition readiness',   value: 'Ready',       status: 'ready',   dataMode: 'simulated'  },
    ],
  },
];
