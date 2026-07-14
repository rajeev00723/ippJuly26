import React, { useState } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Minus,
  User, Wrench, LayoutDashboard, CheckCircle2,
  AlertTriangle, XCircle, Info, Lock, GitBranch,
  Database,
} from 'lucide-react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { tokens as ds } from '../../design-system/tokens';
import { BackBreadcrumb } from './shared';

// ─── Color aliases (mapped from old DesignSystem tokens) ─────────────────────

const c = {
  brand:        '#FFCC00',                      // DHL yellow
  brandBg:      'rgba(255,204,0,0.10)',
  brandBorder:  'rgba(255,204,0,0.25)',
  green:        ds.color.success,
  greenBg:      'var(--ds-chip-success-bg)',
  greenBorder:  'var(--ds-chip-success-border)',
  blue:         '#4A9EDF',                      // data-viz blue
  amber:        ds.color.warn,
  amberBg:      'var(--ds-chip-warn-bg)',
  amberBorder:  'var(--ds-chip-warn-border)',
  red:          ds.color.error,
  redBg:        'var(--ds-chip-error-bg)',
  redBorder:    'var(--ds-chip-error-border)',
  purple:       '#9B72CF',                      // data-viz purple
  purpleBg:     'rgba(155,114,207,0.10)',
  purpleBorder: 'rgba(155,114,207,0.25)',
  cyan:         '#26C6DA',                      // data-viz teal
  surface:      ds.color.css.surface,
  surfaceAlt:   ds.color.css.surfaceAlt,
  border:       ds.color.css.hairline,
  text:         ds.color.css.textPrimary,
  textSec:      ds.color.css.textSecondary,
  textMut:      ds.color.css.textTertiary,
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type PageTab    = 'overview' | 'workloads' | 'optimization' | 'governance';
type PersonaTab = 'developer' | 'operations' | 'platform';
type SimSize    = 'small' | 'medium' | 'large';

interface WorkloadCharge {
  app: string; owner: string; team: string; env: string; runtime: string;
  forecast: number; actual: number; projected: number;
  variance: number; opportunity: number;
  status: 'On Track' | 'Budget Risk' | 'Over Forecast' | 'Optimization Available' | 'Unallocated' | 'Needs Owner';
}

interface OptRec {
  title: string; workload: string; saving: number; confidence: number;
  risk: 'Low' | 'Medium' | 'High';
  owner: 'Developer' | 'Operations' | 'Platform Engineer';
  action: 'Automated' | 'Suggested' | 'Approval Required';
  detail: string;
}

interface AllocationRow {
  app: string; namespace: string; team: string; owner: string;
  costCenter: string; env: string; platform: string; claim: string;
  mtdActual: number; tagged: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const EXEC_KPIS = [
  { label: 'Forecasted Monthly',        value: '$8,420',    sub: 'Current month projection',       color: c.brand,  trend: 'flat' },
  { label: 'Actual MTD Charge',         value: '$6,870',    sub: 'Month-to-date consumption',      color: c.green,  trend: 'down' },
  { label: 'Forecast Accuracy',         value: '91.4%',     sub: 'Rolling 30-day model',           color: c.blue,   trend: 'up'   },
  { label: 'Unallocated Spend',         value: '3.2%',      sub: '$277 without owner/tag',         color: c.amber,  trend: 'down' },
  { label: 'Optimization Opportunity',  value: '$1,240/mo', sub: 'Low-risk actions ready',         color: c.purple, trend: 'flat' },
  { label: 'Budget Risk Workloads',     value: '4',         sub: 'Projected to exceed threshold',  color: c.red,    trend: 'up'   },
];

const COST_BREAKDOWN = [
  { category: 'Compute (CPU)',         forecast: 3100, actual: 2540, pct: 37 },
  { category: 'Memory',                forecast: 1480, actual: 1210, pct: 18 },
  { category: 'Storage (PVC/disk)',    forecast: 940,  actual: 880,  pct: 13 },
  { category: 'Database (PostgreSQL)', forecast: 820,  actual: 730,  pct: 11 },
  { category: 'Network / Egress',      forecast: 540,  actual: 470,  pct: 7  },
  { category: 'Observability',         forecast: 410,  actual: 390,  pct: 6  },
  { category: 'Shared Platform',       forecast: 680,  actual: 580,  pct: 8  },
  { category: 'Backup / Snapshots',    forecast: 450,  actual: 70,   pct: 1  },
];

const WORKLOADS: WorkloadCharge[] = [
  { app: 'employee-portal',       owner: 'alice@acme.com',  team: 'Platform',    env: 'dev',     runtime: 'Kubernetes',  forecast: 420,  actual: 310,  projected: 390,  variance: -7,  opportunity: 118, status: 'Optimization Available' },
  { app: 'claims-api',            owner: 'bob@acme.com',    team: 'Engineering', env: 'prod',    runtime: 'Kubernetes',  forecast: 890,  actual: 940,  projected: 1100, variance: 24,  opportunity: 0,   status: 'Budget Risk'             },
  { app: 'shipment-tracker',      owner: 'carol@acme.com',  team: 'Operations',  env: 'prod',    runtime: 'KubeVirt VM', forecast: 1200, actual: 1180, projected: 1200, variance: 0,   opportunity: 0,   status: 'On Track'                },
  { app: 'customer-notification', owner: 'dave@acme.com',   team: 'Engineering', env: 'staging', runtime: 'Kubernetes',  forecast: 310,  actual: 275,  projected: 295,  variance: -5,  opportunity: 60,  status: 'Optimization Available' },
  { app: 'reporting-worker',      owner: '',                team: '',            env: 'dev',     runtime: 'Kubernetes',  forecast: 180,  actual: 170,  projected: 175,  variance: -3,  opportunity: 90,  status: 'Needs Owner'             },
  { app: 'integration-bus',       owner: 'eve@acme.com',    team: 'Platform',    env: 'prod',    runtime: 'AKS',         forecast: 2100, actual: 2340, projected: 2700, variance: 29,  opportunity: 0,   status: 'Over Forecast'           },
  { app: 'audit-log-archiver',    owner: '',                team: '',            env: 'dev',     runtime: 'Kubernetes',  forecast: 0,    actual: 107,  projected: 130,  variance: 0,   opportunity: 130, status: 'Unallocated'             },
];

const OPT_RECS: OptRec[] = [
  { title: 'Reduce dev replicas after business hours', workload: 'employee-portal',       saving: 118, confidence: 94, risk: 'Low',    owner: 'Developer',         action: 'Automated',         detail: 'Frontend replicas x3 → x1 between 20:00–08:00. No production impact.'          },
  { title: 'Right-size backend CPU request',           workload: 'claims-api',            saving: 310, confidence: 87, risk: 'Low',    owner: 'Operations',        action: 'Suggested',         detail: 'CPU request 4x observed peak for 9 days. Reduce 2000m → 500m.'                  },
  { title: 'Move non-prod VM to scheduled runtime',    workload: 'shipment-tracker',      saving: 340, confidence: 81, risk: 'Medium', owner: 'Platform Engineer', action: 'Approval Required', detail: 'KubeVirt VM runs 24/7 in staging. Schedule off: 19:00–07:00.'                  },
  { title: 'Delete unattached PVCs',                   workload: 'reporting-worker',      saving: 90,  confidence: 99, risk: 'Low',    owner: 'Operations',        action: 'Automated',         detail: '3 x 20Gi PVCs not mounted to any pod for 14+ days.'                            },
  { title: 'Convert always-on test env to on-demand',  workload: 'customer-notification', saving: 60,  confidence: 78, risk: 'Low',    owner: 'Developer',         action: 'Suggested',         detail: 'Staging namespace active <4h/day. Convert to ephemeral via Crossplane.'         },
  { title: 'Adjust log retention for dev namespace',   workload: 'employee-portal',       saving: 42,  confidence: 95, risk: 'Low',    owner: 'Platform Engineer', action: 'Automated',         detail: 'Dev log retention 30 days → 7 days. Saves Loki/S3 storage cost.'               },
  { title: 'Use shared PostgreSQL for dev workloads',  workload: 'reporting-worker',      saving: 280, confidence: 72, risk: 'Medium', owner: 'Developer',         action: 'Suggested',         detail: 'Dedicated PostgreSQL 16 for a dev-only workload. Share demo-db instead.'        },
];

const ALLOCATION: AllocationRow[] = [
  { app: 'employee-portal',       namespace: 'employee-portal', team: 'Platform',    owner: 'alice@acme.com', costCenter: 'demo-001', env: 'dev',     platform: 'kubernetes-local', claim: 'threetierappclaim.employee-portal', mtdActual: 310,  tagged: true  },
  { app: 'claims-api',            namespace: 'claims',          team: 'Engineering', owner: 'bob@acme.com',   costCenter: 'eng-204',  env: 'prod',    platform: 'kubernetes-local', claim: 'threetierappclaim.claims-api',      mtdActual: 940,  tagged: true  },
  { app: 'shipment-tracker',      namespace: 'shipment',        team: 'Operations',  owner: 'carol@acme.com', costCenter: 'ops-301',  env: 'prod',    platform: 'kubevirt-vm',      claim: 'vmthreetierappclaim.shipment',      mtdActual: 1180, tagged: true  },
  { app: 'customer-notification', namespace: 'notifications',   team: 'Engineering', owner: 'dave@acme.com',  costCenter: 'eng-204',  env: 'staging', platform: 'kubernetes-local', claim: 'threetierappclaim.notif',           mtdActual: 275,  tagged: true  },
  { app: 'reporting-worker',      namespace: 'reporting',       team: '—',           owner: '—',              costCenter: '—',        env: 'dev',     platform: 'kubernetes-local', claim: '—',                                 mtdActual: 170,  tagged: false },
  { app: 'integration-bus',       namespace: 'integration',     team: 'Platform',    owner: 'eve@acme.com',   costCenter: 'plat-100', env: 'prod',    platform: 'aks-cloud',        claim: '—',                                 mtdActual: 2340, tagged: true  },
  { app: 'audit-log-archiver',    namespace: 'audit',           team: '—',           owner: '—',              costCenter: '—',        env: 'dev',     platform: 'kubernetes-local', claim: '—',                                 mtdActual: 107,  tagged: false },
];

const GOVERNANCE_CHECKS = [
  { check: 'Budget threshold enforced (<$500/mo auto-approve)',  status: 'pass',    detail: '5 of 7 workloads below threshold'              },
  { check: 'Required cost-center tag present',                   status: 'warning', detail: '2 workloads missing costCenter label'          },
  { check: 'Owner metadata on all namespaces',                   status: 'fail',    detail: 'reporting-worker, audit-log-archiver unowned'  },
  { check: 'Showback report generated (last 30 days)',           status: 'pass',    detail: 'Exported via OpenCost API on 2026-05-01'       },
  { check: 'Forecast vs actual variance < 15%',                  status: 'warning', detail: 'integration-bus at 29% over forecast'         },
  { check: 'Mandatory tagging policy (OPA / Kyverno)',           status: 'pass',    detail: 'Admission policy active in all namespaces'     },
  { check: 'Approval workflow for provisioning >$500/mo',        status: 'pass',    detail: 'Backstage scaffolder gate active'              },
  { check: 'Monthly variance review scheduled',                  status: 'pass',    detail: 'Next review: 2026-06-01 09:00 UTC'            },
];

const ROADMAP = [
  { phase: '1', title: 'Cost Visibility & Tag Hygiene',          desc: 'OpenCost per-namespace attribution. Mandatory metadata. Ownership policy enforcement.',               done: true  },
  { phase: '2', title: 'Forecast Before Provisioning',           desc: 'Pre-flight cost estimate at scaffolder submit. Budget guardrail before claim is applied.',            done: true  },
  { phase: '3', title: 'Showback by App/Team/Environment',       desc: 'Monthly showback report by cost center, environment, and Crossplane claim. Finance-readable export.', done: false },
  { phase: '4', title: 'Optimization Recommendations',           desc: 'Agent-driven right-sizing, idle-resource detection, and scheduled runtime proposals.',               done: false },
  { phase: '5', title: 'Policy-Driven Chargeback & Autonomy',    desc: 'Chargeback to cost center. Autonomous scaling and scheduling. Self-healing cost governance.',        done: false },
];

const SIM_CONFIGS: Record<SimSize, { label: string; replicas: number; storage: string; db: string; forecast: number; saving: number; approval: boolean }> = {
  small:  { label: 'Dev / Small',  replicas: 1, storage: '5Gi',  db: 'Shared PostgreSQL',  forecast: 148,  saving: 272, approval: false },
  medium: { label: 'Dev / Medium', replicas: 2, storage: '10Gi', db: 'Dedicated pg16',     forecast: 420,  saving: 118, approval: false },
  large:  { label: 'Prod / Large', replicas: 4, storage: '50Gi', db: 'Dedicated pg16 HA',  forecast: 1340, saving: 0,   approval: true  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) { return `$${n.toLocaleString()}`; }

function TrendIcon({ dir }: { dir: string }) {
  const s = { display: 'inline-flex', marginLeft: 4, verticalAlign: 'middle' } as const;
  if (dir === 'up')   return <span style={s}><TrendingUp   size={14} color={c.green} strokeWidth={2} /></span>;
  if (dir === 'down') return <span style={s}><TrendingDown size={14} color={c.red}   strokeWidth={2} /></span>;
  return                     <span style={s}><Minus        size={14} color={c.textMut} strokeWidth={2} /></span>;
}

function VarianceChip({ pct }: { pct: number }) {
  const abs = Math.abs(pct);
  if (pct <= -5) return <span style={{ color: c.green,   fontWeight: 700, fontSize: 12 }}>▼ {abs}% under</span>;
  if (pct >= 15) return <span style={{ color: c.red,     fontWeight: 700, fontSize: 12 }}>▲ {abs}% over</span>;
  if (pct >= 5)  return <span style={{ color: c.amber,   fontWeight: 700, fontSize: 12 }}>▲ {abs}% over</span>;
  return                <span style={{ color: c.textMut, fontWeight: 600, fontSize: 12 }}>≈ on track</span>;
}

function GovIcon({ status }: { status: string }) {
  if (status === 'pass')    return <CheckCircle2   size={18} color={c.green} strokeWidth={2} />;
  if (status === 'warning') return <AlertTriangle  size={18} color={c.amber} strokeWidth={2} />;
  return                           <XCircle        size={18} color={c.red}   strokeWidth={2} />;
}

function RiskChip({ risk }: { risk: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    Low:    { bg: c.greenBg,  color: 'var(--ds-chip-success-text)', border: c.greenBorder  },
    Medium: { bg: c.amberBg,  color: 'var(--ds-chip-warn-text)', border: c.amberBorder  },
    High:   { bg: c.redBg,    color: 'var(--ds-chip-error-text)', border: c.redBorder    },
  };
  const s = map[risk] || map.Medium;
  return <span style={{ ...s, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, border: `1px solid ${s.border}` }}>{risk}</span>;
}

function ActionChip({ action }: { action: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    'Automated':         { bg: 'var(--ds-chip-info-bg)', color: 'var(--ds-chip-info-text)', border: 'var(--ds-chip-info-border)'  },
    'Suggested':         { bg: c.greenBg, color: 'var(--ds-chip-success-text)', border: c.greenBorder },
    'Approval Required': { bg: c.purpleBg, color: c.purple, border: c.purpleBorder },
  };
  const s = map[action] || map['Suggested'];
  return <span style={{ ...s, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, border: `1px solid ${s.border}` }}>{action}</span>;
}

function WorkloadStatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    'On Track':               { bg: c.greenBg,  color: 'var(--ds-chip-success-text)', border: c.greenBorder  },
    'Budget Risk':            { bg: c.redBg,    color: 'var(--ds-chip-error-text)', border: c.redBorder    },
    'Over Forecast':          { bg: c.redBg,    color: 'var(--ds-chip-error-text)', border: c.redBorder    },
    'Optimization Available': { bg: 'var(--ds-chip-info-bg)',  color: 'var(--ds-chip-info-text)', border: 'var(--ds-chip-info-border)'      },
    'Unallocated':            { bg: c.amberBg,  color: 'var(--ds-chip-warn-text)', border: c.amberBorder  },
    'Needs Owner':            { bg: c.amberBg,  color: 'var(--ds-chip-warn-text)', border: c.amberBorder  },
  };
  const s = map[status] || { bg: 'var(--ds-surface-alt)', color: 'var(--ds-text-secondary)', border: '#e2e8f0' };
  return <span style={{ ...s, padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' as const }}>{status}</span>;
}

function EnvPill({ env }: { env: string }) {
  const bg     = env === 'prod' ? 'var(--ds-chip-error-bg)' : env === 'staging' ? c.amberBg : c.surfaceAlt;
  const color  = env === 'prod' ? c.red     : env === 'staging' ? c.amber   : c.textSec;
  const border = env === 'prod' ? '#fecaca' : env === 'staging' ? c.amberBorder : c.border;
  return <span style={{ background: bg, color, border: `1px solid ${border}`, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{env}</span>;
}

function RepBadge() {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.amberBg, border: `1px solid ${c.amberBorder}`, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, color: 'var(--ds-chip-warn-text)', letterSpacing: '0.04em', flexShrink: 0 }}>
      <Info size={11} strokeWidth={2} />
      Representative demo data
    </span>
  );
}

function SectionHead({ icon, title, tag, tagStyle, right }: {
  icon: React.ReactNode; title: string; tag?: string;
  tagStyle?: React.CSSProperties; right?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: `1px solid ${c.border}`, flexWrap: 'wrap' }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 700, color: c.text, flex: 1, minWidth: 0 }}>{title}</span>
      {tag && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, padding: '2px 8px', borderRadius: 999, ...tagStyle }}>{tag}</span>}
      {right}
    </div>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: ds.radius.card, padding: '20px 24px', boxShadow: ds.color.css.shadowResting, ...style }}>
      {children}
    </div>
  );
}

function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <div style={{ height, borderRadius: height / 2, background: c.border, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: color, borderRadius: height / 2, transition: 'width 0.4s ease' }} />
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const PAGE_TABS: { id: PageTab; label: string }[] = [
  { id: 'overview',     label: 'Overview' },
  { id: 'workloads',    label: 'Workloads' },
  { id: 'optimization', label: 'Optimization' },
  { id: 'governance',   label: 'Governance & Roadmap' },
];

function TabBar({ active, onChange }: { active: PageTab; onChange: (t: PageTab) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: `1px solid ${c.border}`, background: c.surface, flexShrink: 0 }}>
      {PAGE_TABS.map(t => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: ds.font.sans, fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? c.brand : c.textSec,
              padding: '12px 16px',
              borderBottom: isActive ? `2px solid ${c.brand}` : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
              whiteSpace: 'nowrap' as const,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function KpiHero() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 20 }}>
      {EXEC_KPIS.map(k => (
        <div key={k.label} style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: ds.radius.inner, padding: '14px 16px', borderTop: `3px solid ${k.color}`, boxShadow: ds.color.css.shadowResting }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: c.textMut, marginBottom: 4 }}>{k.label}</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.1, color: k.color }}>{k.value}</span>
            <TrendIcon dir={k.trend} />
          </div>
          <div style={{ fontSize: 11, color: c.textMut, marginTop: 3 }}>{k.sub}</div>
        </div>
      ))}
    </div>
  );
}

function ForecastActualPanel() {
  const totalForecast = COST_BREAKDOWN.reduce((s, r) => s + r.forecast, 0);
  const totalActual   = COST_BREAKDOWN.reduce((s, r) => s + r.actual,   0);
  const projected     = Math.round(totalActual * (31 / 16));
  const budget        = 9000;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Left: summary + budget bar */}
      <Card>
        <SectionHead
          icon={<DollarSign size={17} color={c.green} strokeWidth={2} />}
          title="Forecast vs Actual — May 2026"
          right={<RepBadge />}
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Monthly Forecast', value: fmt(totalForecast),  color: c.blue,  sub: 'Model projection'              },
            { label: 'Actual MTD',       value: fmt(totalActual),    color: c.green, sub: 'Day 16 of 31'                  },
            { label: 'Projected EOM',    value: fmt(projected),      color: projected > budget ? c.red : c.amber, sub: 'Extrapolated'  },
            { label: 'Budget Threshold', value: fmt(budget),         color: c.textSec, sub: 'Approved allocation'         },
            { label: 'Forecast Accuracy', value: '91.4%',            color: c.purple, sub: 'Rolling 30-day'               },
            { label: 'Variance (EOM)',   value: projected > budget ? `+${fmt(projected - budget)} over` : `${fmt(budget - projected)} under`, color: projected > budget ? c.red : c.green, sub: 'vs budget' },
          ].map(m => (
            <div key={m.label} style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: c.textMut, marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: m.color, lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: 11, color: c.textMut, marginTop: 2 }}>{m.sub}</div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: c.textSec, fontWeight: 600 }}>Budget utilisation — {fmt(totalActual)} of {fmt(budget)} ({Math.round(totalActual / budget * 100)}%)</span>
          <span style={{ fontSize: 12, color: c.textMut }}>Projected: {Math.round(projected / budget * 100)}%</span>
        </div>
        <div style={{ height: 10, borderRadius: 5, background: c.border, position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(totalActual / budget * 100, 100)}%`, background: c.green, borderRadius: 5 }} />
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${Math.min(projected / budget * 100, 100)}%`, background: `${c.amber}60`, borderRadius: 5 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 11, color: c.green }}>▌ Actual MTD</span>
          <span style={{ fontSize: 11, color: c.amber }}>▌ Projected EOM</span>
          <span style={{ fontSize: 11, color: c.textMut }}>Budget: {fmt(budget)}</span>
        </div>
      </Card>

      {/* Right: category breakdown */}
      <Card>
        <SectionHead
          icon={<Database size={17} color={c.blue} strokeWidth={2} />}
          title="Cost by Category"
          tag="May 2026"
          tagStyle={{ background: c.greenBg, color: 'var(--ds-chip-success-text)', border: `1px solid ${c.greenBorder}` }}
        />
        {COST_BREAKDOWN.map(row => (
          <div key={row.category} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${c.border}` }}>
            <span style={{ fontSize: 13, color: c.textSec, flex: 1 }}>{row.category}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: c.textMut, width: 60, textAlign: 'right' as const }}>{fmt(row.forecast)}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.text,    width: 60, textAlign: 'right' as const }}>{fmt(row.actual)}</span>
            <div style={{ flex: 2, height: 5, borderRadius: 3, background: c.border, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${row.pct}%`, background: c.brand, borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 11, color: c.textMut, width: 28, textAlign: 'right' as const }}>{row.pct}%</span>
          </div>
        ))}
        <div style={{ fontSize: 11, color: c.textMut, marginTop: 8 }}>Left: Forecasted &nbsp; Right: Actual MTD</div>
      </Card>
    </div>
  );
}

function PersonaCostViews() {
  const [tab, setTab] = useState<PersonaTab>('developer');
  const PTABS: { id: PersonaTab; label: string; icon: React.ReactNode }[] = [
    { id: 'developer',  label: 'Developer',       icon: <User size={14} strokeWidth={2} /> },
    { id: 'operations', label: 'Operations',       icon: <LayoutDashboard size={14} strokeWidth={2} /> },
    { id: 'platform',   label: 'Platform Engineer', icon: <Wrench size={14} strokeWidth={2} /> },
  ];

  return (
    <Card>
      <SectionHead
        icon={<User size={17} color={c.blue} strokeWidth={2} />}
        title="Persona-Based Cost Views"
        right={<RepBadge />}
      />
      <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${c.border}`, marginBottom: 16 }}>
        {PTABS.map(t => {
          const isActive = t.id === tab;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: ds.font.sans, fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? c.brand : c.textSec,
              padding: '8px 14px',
              borderBottom: isActive ? `2px solid ${c.brand}` : '2px solid transparent',
              marginBottom: -1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              {t.icon}{t.label}
            </button>
          );
        })}
      </div>
      {tab === 'developer'  && <DeveloperCostView />}
      {tab === 'operations' && <OperationsCostView />}
      {tab === 'platform'   && <PlatformCostView />}
    </Card>
  );
}

function DeveloperCostView() {
  const items = [
    { label: 'App forecast (employee-portal)', value: '$420/mo',   color: c.blue   },
    { label: 'Frontend (2 replicas)',           value: '$148/mo',   color: c.textSec },
    { label: 'Backend (2 replicas)',            value: '$162/mo',   color: c.textSec },
    { label: 'PostgreSQL 16 (dedicated)',       value: '$110/mo',   color: c.textSec },
    { label: 'Budget remaining (demo-001)',     value: '$4,580/mo', color: c.green  },
    { label: 'Savings with dev sizing (x1)',    value: '−$118/mo',  color: c.green  },
  ];
  const steps = [
    'Developer selects template and size in Backstage scaffolder.',
    'Pre-flight cost estimate runs before the Crossplane claim is submitted.',
    'If under $500/mo threshold: auto-approved. Above: routed for budget sign-off.',
    'Cost is tagged to app, namespace, cost-center, and environment at claim time.',
    'Monthly showback report lands in the developer\'s catalog service page.',
  ];
  return (
    <div>
      <div style={{ background: c.brandBg, border: `1px solid ${c.brandBorder}`, borderLeft: `4px solid ${c.brand}`, borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 13, color: c.brand, lineHeight: 1.65, fontStyle: 'italic' }}>
        "Your selected environment is forecasted at $420/month. Reducing dev replicas from 3 to 1 saves $118/month with no production impact. No approval required — below $500/month threshold."
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {items.map(i => (
          <div key={i.label} style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px', flex: '1 1 140px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c.textMut, marginBottom: 2 }}>{i.label}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: i.color }}>{i.value}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.textMut, textTransform: 'uppercase' as const, letterSpacing: '0.06em', marginBottom: 8 }}>Developer cost feedback at request time</div>
      {steps.map((text, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', background: c.brandBg, border: `1px solid ${c.brandBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: c.brand, flexShrink: 0 }}>{i + 1}</div>
          <div style={{ fontSize: 13, color: c.textSec, lineHeight: 1.55 }}>{text}</div>
        </div>
      ))}
    </div>
  );
}

function OperationsCostView() {
  const anomalies = [
    { workload: 'claims-api',       signal: 'Cost spike +24% vs forecast',       severity: 'high',   action: 'Review CPU limits — traffic or leak?' },
    { workload: 'integration-bus',  signal: 'Sustained overspend for 11 days',   severity: 'high',   action: 'Scale-down candidate or pricing review' },
    { workload: 'employee-portal',  signal: 'CPU 4x over observed peak',         severity: 'medium', action: 'Right-size request (2000m → 500m)' },
    { workload: 'reporting-worker', signal: 'Unattached PVCs consuming storage', severity: 'low',    action: 'Automated PVC cleanup eligible' },
  ];
  const sevColor: Record<string, string> = { high: c.red, medium: c.amber, low: c.blue };
  return (
    <div>
      <div style={{ background: c.brandBg, border: `1px solid ${c.brandBorder}`, borderLeft: `4px solid ${c.brand}`, borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 13, color: c.brand, lineHeight: 1.65, fontStyle: 'italic' }}>
        "Backend CPU request is 4× observed peak usage for 9 days. Right-sizing could save $310/month. Risk: Low. Recommendation queued for automated remediation."
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.textMut, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 10 }}>Active anomalies requiring attention</div>
      {anomalies.map(a => (
        <div key={a.workload} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 0', borderBottom: `1px solid ${c.border}` }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: sevColor[a.severity], marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.text, fontFamily: ds.font.mono }}>{a.workload}</div>
            <div style={{ fontSize: 12, color: c.textSec, marginTop: 2 }}>{a.signal}</div>
          </div>
          <div style={{ fontSize: 12, color: c.brand, fontWeight: 500, maxWidth: 200, textAlign: 'right' as const }}>{a.action}</div>
        </div>
      ))}
      <div style={{ marginTop: 14, background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 13, color: c.textSec, lineHeight: 1.65 }}>
        Cost signals are correlated with Prometheus CPU/memory metrics, Argo CD sync events, and Kubernetes scaling history to detect anomalies before they breach budget thresholds.
      </div>
    </div>
  );
}

function PlatformCostView() {
  const templates = [
    { name: 'ThreeTierApp (K8s)',          pct: 34, cost: 2864 },
    { name: 'VMThreeTierApp (KubeVirt)',   pct: 18, cost: 1515 },
    { name: 'Shared platform overhead',    pct: 10, cost: 842  },
    { name: 'Observability stack',         pct: 8,  cost: 673  },
    { name: 'Other Crossplane claims',     pct: 30, cost: 2526 },
  ];
  return (
    <div>
      <div style={{ background: c.brandBg, border: `1px solid ${c.brandBorder}`, borderLeft: `4px solid ${c.brand}`, borderRadius: 8, padding: 14, marginBottom: 14, fontSize: 13, color: c.brand, lineHeight: 1.65, fontStyle: 'italic' }}>
        "ThreeTierApp template drives 34% of demo environment cost. Storage and always-on dev environments are the primary cost drivers. Scheduled-runtime policy could reduce monthly cost by $658."
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: c.textMut, textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: 10 }}>Cost by Crossplane template / composition</div>
      {templates.map(t => (
        <div key={t.name} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, color: c.textSec }}>{t.name}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{fmt(t.cost)}/mo &nbsp;·&nbsp; {t.pct}%</span>
          </div>
          <ProgressBar value={t.pct * 2} color={c.brand} />
        </div>
      ))}
      <div style={{ height: 1, background: c.border, margin: '16px 0' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'Tagging policy compliance', value: '81%',  color: c.amber  },
          { label: 'Showback readiness',         value: '68%',  color: c.amber  },
          { label: 'Cost guardrails active',     value: '100%', color: c.green  },
          { label: 'Templates with estimates',   value: '2/4',  color: c.blue   },
        ].map(m => (
          <div key={m.label} style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c.textMut, marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
      {/* Demo notice */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--ds-chip-warn-bg)', border: `1px solid ${c.amberBorder}`, borderRadius: 8, marginBottom: 20, fontSize: 13, color: 'var(--ds-chip-warn-text)', lineHeight: 1.5 }}>
        <Info size={15} color="#d97706" strokeWidth={2} style={{ flexShrink: 0 }} />
        <span><strong>Representative demo data</strong> — designed to illustrate the future FinOps operating model embedded in an Infrastructure Platform Portal (IPP). Values are realistic but not sourced from a live billing system.</span>
      </div>

      <KpiHero />
      <div style={{ marginBottom: 20 }}>
        <ForecastActualPanel />
      </div>
      <PersonaCostViews />
    </div>
  );
}

// ─── Workloads Tab ────────────────────────────────────────────────────────────

function WorkloadsTab() {
  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Application Charge Explorer */}
      <Card>
        <SectionHead
          icon={<GitBranch size={17} color={c.purple} strokeWidth={2} />}
          title="Application Charge Explorer"
          right={<RepBadge />}
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ds.font.sans }}>
            <thead>
              <tr style={{ background: c.surfaceAlt }}>
                {['Application', 'Team / Owner', 'Env', 'Runtime', 'Forecast', 'Actual MTD', 'Projected EOM', 'Variance', 'Opportunity', 'Status'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: c.textMut, padding: '8px 12px', textAlign: 'left' as const, whiteSpace: 'nowrap' as const, borderBottom: `1px solid ${c.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WORKLOADS.map(w => (
                <tr key={w.app}>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 13, fontWeight: 600, color: c.text, fontFamily: ds.font.mono }}>{w.app}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 13 }}>
                    {w.owner ? (
                      <><div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{w.team}</div>
                      <div style={{ fontSize: 11, color: c.textMut, fontFamily: ds.font.mono }}>{w.owner}</div></>
                    ) : (
                      <span style={{ color: c.amber, fontWeight: 700, fontSize: 12 }}>— Unowned</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}` }}><EnvPill env={w.env} /></td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 12, color: c.textSec }}>{w.runtime}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 13, fontWeight: 600, color: c.textSec }}>{fmt(w.forecast)}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 13, fontWeight: 700, color: c.text }}>{fmt(w.actual)}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 13, color: c.textSec }}>{fmt(w.projected)}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}` }}><VarianceChip pct={w.variance} /></td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}` }}>
                    {w.opportunity > 0
                      ? <span style={{ color: c.green, fontWeight: 700, fontSize: 13 }}>−{fmt(w.opportunity)}/mo</span>
                      : <span style={{ color: c.textMut, fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}` }}><WorkloadStatusChip status={w.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 12 }}>
          <span style={{ fontSize: 11, color: c.textMut }}>Total MTD actual: <strong>{fmt(WORKLOADS.reduce((s, w) => s + w.actual, 0))}</strong></span>
          <span style={{ fontSize: 11, color: c.green }}>Total optimization opportunity: <strong>−{fmt(WORKLOADS.reduce((s, w) => s + w.opportunity, 0))}/mo</strong></span>
          <span style={{ fontSize: 11, color: c.amber }}>Workloads needing attention: <strong>{WORKLOADS.filter(w => ['Budget Risk', 'Over Forecast', 'Needs Owner', 'Unallocated'].includes(w.status)).length}</strong></span>
        </div>
      </Card>

      {/* Cost Allocation */}
      <Card>
        <SectionHead
          icon={<Database size={17} color={c.cyan} strokeWidth={2} />}
          title="Cost Allocation & Ownership"
          tag="Metadata is FinOps"
          tagStyle={{ background: c.amberBg, color: 'var(--ds-chip-warn-text)', border: `1px solid ${c.amberBorder}` }}
        />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: ds.font.sans }}>
            <thead>
              <tr style={{ background: c.surfaceAlt }}>
                {['App', 'Namespace', 'Team', 'Owner', 'Cost Center', 'Env', 'Platform', 'Crossplane Claim', 'MTD Actual', 'Tagged'].map(h => (
                  <th key={h} style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: c.textMut, padding: '8px 12px', textAlign: 'left' as const, whiteSpace: 'nowrap' as const, borderBottom: `1px solid ${c.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ALLOCATION.map(r => (
                <tr key={r.app} style={{ background: !r.tagged ? 'var(--ds-chip-warn-bg)' : 'inherit' }}>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 13, fontWeight: 600, color: c.text, fontFamily: ds.font.mono }}>{r.app}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 12, color: c.textMut, fontFamily: ds.font.mono }}>{r.namespace}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 13, color: r.team === '—' ? c.amber : c.textSec }}>{r.team}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}` }}>
                    {r.owner === '—'
                      ? <span style={{ color: c.amber, fontWeight: 700, fontSize: 12 }}>Unowned</span>
                      : <span style={{ fontFamily: ds.font.mono, fontSize: 12, color: c.textSec }}>{r.owner}</span>}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}` }}>
                    {r.costCenter === '—'
                      ? <span style={{ color: c.amber, fontSize: 13 }}>—</span>
                      : <span style={{ fontFamily: ds.font.mono, fontSize: 12, color: c.textSec }}>{r.costCenter}</span>}
                  </td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}` }}><EnvPill env={r.env} /></td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontFamily: ds.font.mono, fontSize: 12, color: c.textMut }}>{r.platform}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontFamily: ds.font.mono, fontSize: 12, color: r.claim === '—' ? c.amber : c.textMut }}>{r.claim}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}`, fontSize: 13, fontWeight: 700, color: c.text }}>{fmt(r.mtdActual)}</td>
                  <td style={{ padding: '9px 12px', borderBottom: `1px solid ${c.border}` }}>
                    {r.tagged
                      ? <CheckCircle2  size={16} color={c.green} strokeWidth={2} />
                      : <AlertTriangle size={16} color={c.amber} strokeWidth={2} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 14, background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 8, padding: '12px 16px', fontSize: 13, color: c.textSec, lineHeight: 1.7 }}>
          <strong style={{ color: c.text }}>FinOps principle:</strong> Cost attribution is only possible when every resource carries complete metadata — owner, team, cost-center, environment, and the Crossplane claim that provisioned it. Rows highlighted in amber are missing mandatory labels and will appear as unallocated spend in finance reports.
        </div>
      </Card>
    </div>
  );
}

// ─── Optimization Tab ─────────────────────────────────────────────────────────

function CostForecastSimulator() {
  const [size, setSize] = useState<SimSize>('medium');
  const cfg = SIM_CONFIGS[size];
  const breakdown = [
    { label: 'Frontend compute',          value: Math.round(cfg.forecast * 0.28) },
    { label: 'Backend compute',           value: Math.round(cfg.forecast * 0.32) },
    { label: `Database (${cfg.db})`,      value: Math.round(cfg.forecast * 0.26) },
    { label: `Storage (${cfg.storage})`,  value: Math.round(cfg.forecast * 0.09) },
    { label: 'Network / Ingress',         value: Math.round(cfg.forecast * 0.05) },
  ];

  return (
    <Card>
      <SectionHead
        icon={<DollarSign size={17} color={c.blue} strokeWidth={2} />}
        title="Pre-Provisioning Cost Forecast Simulator"
        right={<RepBadge />}
      />
      <p style={{ fontSize: 13, color: c.textSec, margin: '0 0 16px', lineHeight: 1.65 }}>
        Select an environment configuration below. The IPP evaluates the forecasted cost before the Crossplane claim is submitted — giving developers budget context before they provision.
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {(Object.entries(SIM_CONFIGS) as [SimSize, typeof SIM_CONFIGS[SimSize]][]).map(([k, v]) => {
          const active = size === k;
          return (
            <button
              key={k}
              onClick={() => setSize(k)}
              style={{
                flex: 1, background: active ? c.brandBg : c.surfaceAlt,
                border: `${active ? 2 : 1}px solid ${active ? c.brand : c.border}`,
                borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                textAlign: 'left' as const, fontFamily: ds.font.sans,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: active ? c.brand : c.text, marginBottom: 4 }}>{v.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: active ? c.brand : c.text }}>{fmt(v.forecast)}<span style={{ fontSize: 11, fontWeight: 500, color: c.textMut }}>/mo</span></div>
              <div style={{ fontSize: 11, color: c.textMut, marginTop: 2 }}>{v.replicas} replica{v.replicas > 1 ? 's' : ''} · {v.storage} · {v.db}</div>
            </button>
          );
        })}
      </div>
      <div style={{ background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 10, padding: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: c.textMut, marginBottom: 10 }}>Cost by component</div>
            {breakdown.map(b => (
              <div key={b.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${c.border}` }}>
                <span style={{ fontSize: 13, color: c.textSec }}>{b.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: c.text }}>{fmt(b.value)}/mo</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>Total forecast</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: c.brand }}>{fmt(cfg.forecast)}/mo</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.07em', color: c.textMut, marginBottom: 10 }}>Provisioning decision</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Approval required',     value: cfg.approval ? 'Yes — route to budget owner' : 'No — below $500/mo threshold', color: cfg.approval ? c.amber : c.green },
                { label: 'Budget impact',          value: `${fmt(cfg.forecast)}/mo against demo-001`, color: c.textSec },
                { label: 'Chargeback target',      value: 'demo-001 / developers / employee-portal',  color: c.textSec },
                { label: 'Tags applied at claim',  value: 'app, owner, costCenter, env, claim',         color: c.textSec },
                ...(cfg.saving > 0 ? [{ label: 'Optimization: dev replicas x1', value: `Save ${fmt(cfg.saving)}/mo — no prod impact`, color: c.green }] : []),
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c.textMut, width: 170, flexShrink: 0 }}>{row.label}</span>
                  <span style={{ fontSize: 13, color: row.color, fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, background: cfg.approval ? c.amberBg : c.greenBg, border: `1px solid ${cfg.approval ? c.amberBorder : c.greenBorder}`, borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: cfg.approval ? 'var(--ds-chip-warn-text)' : 'var(--ds-chip-success-text)' }}>
              {cfg.approval
                ? '⚠ Requires budget approval — provisioning will pause for sign-off'
                : '✓ Auto-approved — Crossplane claim will be submitted immediately'}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function OptimizationRecommendations() {
  const totalSaving = OPT_RECS.reduce((s, r) => s + r.saving, 0);
  return (
    <Card>
      <SectionHead
        icon={<TrendingDown size={17} color={c.green} strokeWidth={2} />}
        title="Optimization Recommendations"
        tag={`${fmt(totalSaving)}/mo total opportunity`}
        tagStyle={{ background: c.greenBg, color: 'var(--ds-chip-success-text)', border: `1px solid ${c.greenBorder}` }}
        right={<RepBadge />}
      />
      {OPT_RECS.map(rec => (
        <div key={rec.title} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: `1px solid ${c.border}`, alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'center' as const, minWidth: 80 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: c.green, lineHeight: 1, whiteSpace: 'nowrap' as const }}>−{fmt(rec.saving)}</div>
            <div style={{ fontSize: 10, color: c.textMut, marginTop: 2 }}>/month</div>
            <div style={{ marginTop: 6 }}><RiskChip risk={rec.risk} /></div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: c.text, marginBottom: 3 }}>{rec.title}</div>
            <div style={{ fontSize: 12, color: c.textSec, marginBottom: 6, lineHeight: 1.5 }}>{rec.detail}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: ds.font.mono, fontSize: 11, color: c.textMut, background: c.surfaceAlt, border: `1px solid ${c.border}`, borderRadius: 4, padding: '1px 6px' }}>{rec.workload}</span>
              <ActionChip action={rec.action} />
            </div>
          </div>
          <div style={{ minWidth: 130, textAlign: 'right' as const }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: c.textMut, marginBottom: 4 }}>Owner</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 6 }}>{rec.owner}</div>
            <div>
              <div style={{ fontSize: 11, color: c.textMut, marginBottom: 2 }}>Confidence</div>
              <ProgressBar value={rec.confidence} color={c.brand} height={5} />
              <div style={{ fontSize: 11, color: c.textMut, marginTop: 2 }}>{rec.confidence}%</div>
            </div>
          </div>
        </div>
      ))}
    </Card>
  );
}

function OptimizationTab() {
  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <CostForecastSimulator />
      <OptimizationRecommendations />
    </div>
  );
}

// ─── Governance Tab ───────────────────────────────────────────────────────────

function GovernanceTab() {
  const pass = GOVERNANCE_CHECKS.filter(c => c.status === 'pass').length;
  const warn = GOVERNANCE_CHECKS.filter(c => c.status === 'warning').length;
  const fail = GOVERNANCE_CHECKS.filter(c => c.status === 'fail').length;

  return (
    <div style={{ padding: 24, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Governance panel */}
      <Card>
        <SectionHead
          icon={<Lock size={17} color={c.red} strokeWidth={2} />}
          title="Forecast Governance & Guardrails"
          right={
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { count: pass, label: 'pass', bg: c.greenBg,  color: 'var(--ds-chip-success-text)', border: c.greenBorder },
                { count: warn, label: 'warn', bg: c.amberBg,  color: 'var(--ds-chip-warn-text)', border: c.amberBorder },
                { count: fail, label: 'fail', bg: c.redBg,    color: 'var(--ds-chip-error-text)', border: c.redBorder   },
              ].map(s => (
                <span key={s.label} style={{ padding: '2px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                  {s.count} {s.label}
                </span>
              ))}
            </div>
          }
        />
        {GOVERNANCE_CHECKS.map(chk => (
          <div key={chk.check} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: `1px solid ${c.border}` }}>
            <GovIcon status={chk.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{chk.check}</div>
              <div style={{ fontSize: 12, color: c.textSec, marginTop: 2 }}>{chk.detail}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Roadmap */}
      <Card>
        <SectionHead
          icon={<TrendingUp size={17} color={c.purple} strokeWidth={2} />}
          title="FinOps Maturity Roadmap"
          tag="Platform-embedded"
          tagStyle={{ background: c.purpleBg, color: ds.color.css.focus, border: `1px solid ${c.purpleBorder}` }}
        />
        {ROADMAP.map(step => (
          <div key={step.phase} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '14px 0', borderBottom: `1px solid ${c.border}` }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, flexShrink: 0,
              background: step.done ? c.green    : c.surfaceAlt,
              color:      step.done ? '#ffffff'  : c.textMut,
              border:    `1px solid ${step.done ? c.greenBorder : c.border}`,
            }}>
              {step.done ? '✓' : step.phase}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: step.done ? c.green : c.text }}>Phase {step.phase}: {step.title}</span>
                {step.done && <span style={{ padding: '1px 7px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: c.greenBg, color: 'var(--ds-chip-success-text)', border: `1px solid ${c.greenBorder}` }}>Active</span>}
              </div>
              <div style={{ fontSize: 12, color: c.textSec, lineHeight: 1.55 }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* CTA strip */}
      <div style={{ background: ds.color.css.surfaceAlt, border: `1px solid ${c.border}`, borderLeft: `4px solid ${ds.color.css.focus}`, borderRadius: ds.radius.card, padding: '22px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: c.textMut, marginBottom: 6 }}>FinOps Control Plane — ACME Corp</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.text, lineHeight: 1.35 }}>Cost is an operational signal.<br />Forecast before you provision. Explain after you deploy.</div>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {[
            { label: 'Simulate Forecast',           color: c.brand,  bg: c.brandBg,  border: c.brandBorder  },
            { label: 'View Actual Charges',          color: 'var(--ds-chip-success-text)', bg: c.greenBg, border: c.greenBorder  },
            { label: 'Review Optimization Actions',  color: c.brand,  bg: c.purpleBg, border: c.purpleBorder },
          ].map(cta => (
            <button key={cta.label} style={{ display: 'inline-block', padding: '10px 18px', borderRadius: ds.radius.inner, fontSize: 13, fontWeight: 700, background: cta.bg, color: cta.color, textDecoration: 'none', border: `1px solid ${cta.border}`, cursor: 'pointer', letterSpacing: '0.01em', fontFamily: ds.font.sans }}>
              {cta.label} →
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page Root ────────────────────────────────────────────────────────────────

// ─── Knative Scale-to-Zero FinOps Card ────────────────────────────────────────
// Only rendered when knative.demoEnabled=true.

function KnativeFinOpsCard() {
  const font = ds.font.sans;
  const mono = ds.font.mono;
  return (
    <div style={{
      margin: '0 24px 16px',
      padding: '16px 20px',
      borderRadius: 14,
      border: '1.5px solid var(--ds-chip-info-border)',
      background: 'var(--ds-chip-info-bg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: font, color: ds.color.css.textPrimary }}>
            Knative Scale-to-Zero — Cost Opportunity
          </p>
          <p style={{ margin: 0, fontSize: 12, color: ds.color.css.textSecondary, fontFamily: font }}>
            Representative projection · ENABLE_KNATIVE_DEMO=true
          </p>
        </div>
        <span style={{
          marginLeft: 'auto', padding: '3px 10px', borderRadius: 8,
          fontSize: 11, fontWeight: 700, fontFamily: font,
          background: 'var(--ds-chip-warn-bg)', color: ds.color.warn,
          border: '1px solid var(--ds-chip-warn-border)',
        }}>DEMO DATA</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { label: 'Always-on equivalent', value: '$48.60/mo', sub: '3 services × 2 pods × 24/7', color: ds.color.error },
          { label: 'Knative actual (rep.)', value: '$18.50/mo', sub: 'Pay-per-request + routing', color: ds.color.success },
          { label: 'Monthly saving (rep.)', value: '$30.10 (62%)', sub: 'Scale-to-zero eliminating idle compute', color: ds.color.css.focus },
        ].map(({ label, value, sub, color }) => (
          <div key={label} style={{ padding: '10px 14px', background: 'var(--ds-surface)', borderRadius: 10, border: '1px solid var(--ds-hairline)' }}>
            <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: ds.color.css.textTertiary, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: font }}>{label}</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: mono, color }}>{value}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: ds.color.css.textTertiary, fontFamily: font }}>{sub}</p>
          </div>
        ))}
      </div>
      <p style={{ margin: '10px 0 0', fontSize: 12, fontFamily: font, color: ds.color.css.textSecondary }}>
        Services idle ~18 h/day in production. Knative automatically scales to zero and eliminates idle compute cost.{' '}
        <a href="/knative" style={{ color: ds.color.css.focus, textDecoration: 'none', fontWeight: 600 }}>View Knative dashboard →</a>
      </p>
    </div>
  );
}

export const FinOpsChargeVisibilityPage = () => {
  const configApi = useApi(configApiRef);
  const knativeDemoEnabled = React.useMemo(() => {
    try { return configApi.getOptionalBoolean('knative.demoEnabled') ?? false; }
    catch { return false; }
  }, [configApi]);

  const [tab, setTab] = useState<PageTab>('overview');

  return (
    <AppleShell title="FinOps Charge Visibility" noPadding>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: ds.color.background }}>
        <div style={{ padding: '6px 24px 0', flexShrink: 0 }}>
          <BackBreadcrumb label="Cost Dashboard" to="/cost" style={{ marginBottom: 0 }} />
        </div>
        <TabBar active={tab} onChange={setTab} />
        {knativeDemoEnabled && <KnativeFinOpsCard />}
        <div key={tab} className="ds-tab-panel" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          {tab === 'overview'     && <OverviewTab />}
          {tab === 'workloads'    && <WorkloadsTab />}
          {tab === 'optimization' && <OptimizationTab />}
          {tab === 'governance'   && <GovernanceTab />}
        </div>
      </div>
    </AppleShell>
  );
};
