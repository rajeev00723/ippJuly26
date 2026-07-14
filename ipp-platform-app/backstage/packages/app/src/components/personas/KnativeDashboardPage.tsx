import React from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { Zap } from 'lucide-react';
import { StatusChip, MetricCard, DsCard, TH, TD, BackBreadcrumb } from './shared';

import { tokens as _fTokens } from '../../design-system/tokens';
const FONT = _fTokens.font.sans;
const MONO = "'SF Mono',ui-monospace,'JetBrains Mono',Menlo,monospace";

// ─── Representative demo data ──────────────────────────────────────────────────

interface KnativeRoute {
  name: string;
  namespace: string;
  url: string;
  ready: string;
  latestRevision: string;
  traffic: string;
}

interface KnativeRevision {
  name: string;
  service: string;
  generation: number;
  ready: string;
  replicas: number;
  created: string;
  traffic: string;
}

interface ScaleEvent {
  time: string;
  service: string;
  from: number;
  to: number;
  trigger: string;
}

const DEMO_ROUTES: KnativeRoute[] = [
  {
    name: 'notification-svc',
    namespace: 'notification-svc-prod',
    url: 'https://notification-svc.knative.dpcs.local',
    ready: 'True',
    latestRevision: 'notification-svc-00003',
    traffic: '100% → latest',
  },
  {
    name: 'report-generator',
    namespace: 'analytics-prod',
    url: 'https://report-generator.knative.dpcs.local',
    ready: 'True',
    latestRevision: 'report-generator-00001',
    traffic: '100% → latest',
  },
  {
    name: 'image-resizer',
    namespace: 'media-staging',
    url: 'https://image-resizer.knative.dpcs.local',
    ready: 'True',
    latestRevision: 'image-resizer-00002',
    traffic: '80% → latest, 20% → prev',
  },
];

const DEMO_REVISIONS: KnativeRevision[] = [
  { name: 'notification-svc-00003', service: 'notification-svc', generation: 3, ready: 'True',  replicas: 0, created: '2h ago',  traffic: '100%' },
  { name: 'notification-svc-00002', service: 'notification-svc', generation: 2, ready: 'True',  replicas: 0, created: '1d ago',  traffic: '0%'   },
  { name: 'report-generator-00001', service: 'report-generator',  generation: 1, ready: 'True',  replicas: 0, created: '3d ago',  traffic: '100%' },
  { name: 'image-resizer-00002',    service: 'image-resizer',     generation: 2, ready: 'True',  replicas: 2, created: '45m ago', traffic: '80%'  },
  { name: 'image-resizer-00001',    service: 'image-resizer',     generation: 1, ready: 'True',  replicas: 0, created: '2d ago',  traffic: '20%'  },
];

const DEMO_SCALE_EVENTS: ScaleEvent[] = [
  { time: '14:32:01', service: 'notification-svc',  from: 0, to: 3, trigger: 'Burst: 420 req/s'   },
  { time: '14:33:45', service: 'notification-svc',  from: 3, to: 1, trigger: 'Load stabilised'     },
  { time: '14:35:00', service: 'notification-svc',  from: 1, to: 0, trigger: 'Scale-to-zero (60s)' },
  { time: '14:41:18', service: 'image-resizer',     from: 0, to: 2, trigger: 'Burst: 80 req/s'     },
  { time: '14:42:10', service: 'report-generator',  from: 0, to: 1, trigger: 'Scheduled job'       },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function ScaleBar({ current, max }: { current: number; max: number }) {
  const pct = max > 0 ? Math.min((current / max) * 100, 100) : 0;
  const color = current === 0 ? 'var(--ds-text-tertiary)' : current >= max * 0.8 ? 'var(--ds-error)' : 'var(--ds-success)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--ds-surface-alt)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--ds-text-primary)', minWidth: 20, textAlign: 'right' }}>
        {current === 0 ? <em style={{ fontStyle: 'italic', color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>idle</em> : current}
      </span>
    </div>
  );
}

function ScaleArrow({ from, to }: { from: number; to: number }) {
  const up = to > from;
  const zero = to === 0;
  const color = zero ? 'var(--ds-text-tertiary)' : up ? 'var(--ds-success)' : 'var(--ds-warn)';
  const label = zero ? `${from}→0 (zero)` : `${from}→${to}`;
  return <span style={{ fontFamily: MONO, fontSize: 12, color }}>{label}</span>;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export const KnativeDashboardPage = () => {
  const [tab, setTab] = React.useState<'routes' | 'revisions' | 'scaling'>('routes');

  return (
    <AppleShell title="Knative Serverless">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Breadcrumb */}
        <BackBreadcrumb />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'var(--ds-chip-info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={22} color="var(--ds-focus)" strokeWidth={1.5} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-primary)', letterSpacing: '-0.02em' }}>
              Knative Serverless Runtime
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
              Scale-to-zero · Event-driven · Revision traffic splitting · Representative demo data
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{
              padding: '4px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700,
              background: 'var(--ds-chip-warn-bg)', color: 'var(--ds-warn)', fontFamily: FONT,
              border: '1px solid var(--ds-chip-warn-border)',
            }}>
              DEMO DATA
            </span>
          </div>
        </div>

        {/* KPI strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          <MetricCard label="Active Services" value="3" sub="2 at zero replicas" />
          <MetricCard label="Scale-to-Zero Events" value="18" sub="Last 24 h" />
          <MetricCard label="Idle Savings (rep.)" value="62%" sub="vs always-on K8s" />
          <MetricCard label="P99 Cold-start" value="~320ms" sub="Representative estimate" />
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--ds-hairline)', paddingBottom: 0 }}>
          {(['routes', 'revisions', 'scaling'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 18px', border: 'none', background: 'none',
                borderBottom: tab === t ? '2px solid var(--ds-focus)' : '2px solid transparent',
                color: tab === t ? 'var(--ds-chip-info-text)' : 'var(--ds-text-secondary)',
                fontFamily: FONT, fontSize: 13, fontWeight: tab === t ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Routes tab */}
        {tab === 'routes' && (
          <DsCard title="Knative Routes" subtitle="Live traffic routing to revisions">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH>Service</TH>
                  <TH>Namespace</TH>
                  <TH>URL</TH>
                  <TH>Latest Revision</TH>
                  <TH>Traffic</TH>
                  <TH>Ready</TH>
                </tr>
              </thead>
              <tbody>
                {DEMO_ROUTES.map(r => (
                  <tr key={r.name}>
                    <TD><span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 600 }}>{r.name}</span></TD>
                    <TD><span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--ds-text-secondary)' }}>{r.namespace}</span></TD>
                    <TD><span style={{ fontFamily: MONO, fontSize: 11, color: 'var(--ds-chip-info-text)' }}>{r.url}</span></TD>
                    <TD><span style={{ fontFamily: MONO, fontSize: 12 }}>{r.latestRevision}</span></TD>
                    <TD><span style={{ fontSize: 12, fontFamily: FONT }}>{r.traffic}</span></TD>
                    <TD><StatusChip status={r.ready === 'True' ? 'Ready' : 'Not Ready'} /></TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </DsCard>
        )}

        {/* Revisions tab */}
        {tab === 'revisions' && (
          <DsCard title="Knative Revisions" subtitle="Immutable snapshots — each deploy creates a new revision">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH>Revision</TH>
                  <TH>Service</TH>
                  <TH>Gen</TH>
                  <TH>Active Replicas</TH>
                  <TH>Traffic</TH>
                  <TH>Created</TH>
                  <TH>Ready</TH>
                </tr>
              </thead>
              <tbody>
                {DEMO_REVISIONS.map(rev => (
                  <tr key={rev.name}>
                    <TD><span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600 }}>{rev.name}</span></TD>
                    <TD><span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--ds-text-secondary)' }}>{rev.service}</span></TD>
                    <TD><span style={{ fontFamily: MONO, fontSize: 12 }}>v{rev.generation}</span></TD>
                    <TD style={{ minWidth: 140 }}><ScaleBar current={rev.replicas} max={10} /></TD>
                    <TD><span style={{ fontFamily: MONO, fontSize: 12 }}>{rev.traffic}</span></TD>
                    <TD><span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--ds-text-secondary)' }}>{rev.created}</span></TD>
                    <TD><StatusChip status={rev.ready === 'True' ? 'Ready' : 'Not Ready'} /></TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </DsCard>
        )}

        {/* Scaling events tab */}
        {tab === 'scaling' && (
          <>
            <DsCard title="Scale Events — Last Hour" subtitle="KPA (Knative Pod Autoscaler) scale-up and scale-to-zero events">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <TH>Time</TH>
                    <TH>Service</TH>
                    <TH>Scale transition</TH>
                    <TH>Trigger</TH>
                  </tr>
                </thead>
                <tbody>
                  {DEMO_SCALE_EVENTS.map((e, i) => (
                    <tr key={i}>
                      <TD><span style={{ fontFamily: MONO, fontSize: 12 }}>{e.time}</span></TD>
                      <TD><span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600 }}>{e.service}</span></TD>
                      <TD><ScaleArrow from={e.from} to={e.to} /></TD>
                      <TD><span style={{ fontFamily: FONT, fontSize: 12, color: 'var(--ds-text-secondary)' }}>{e.trigger}</span></TD>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DsCard>

            <DsCard title="Scale-to-Zero: Cost Story" subtitle="Representative — not live OpenCost data">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{
                  padding: 16, borderRadius: 12, background: 'var(--ds-surface-alt)',
                  border: '1px solid var(--ds-hairline)',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Always-on K8s equivalent
                  </p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: MONO, color: 'var(--ds-error)' }}>$48.60/mo</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>3 services × 2 pods × t3.medium, 24/7</p>
                </div>
                <div style={{
                  padding: 16, borderRadius: 12, background: 'var(--ds-chip-success-bg)',
                  border: '1px solid var(--ds-chip-success-border)',
                }}>
                  <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Knative scale-to-zero
                  </p>
                  <p style={{ margin: 0, fontSize: 28, fontWeight: 700, fontFamily: MONO, color: 'var(--ds-success)' }}>$18.50/mo</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>Pay-per-request + routing overhead only</p>
                </div>
              </div>
              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'var(--ds-chip-info-bg)', borderRadius: 8,
                border: '1px solid var(--ds-chip-info-border)',
              }}>
                <p style={{ margin: 0, fontSize: 12, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>
                  <strong>$30.10/mo saving (62%)</strong> · These services are idle ~18 h/day in production — scale-to-zero eliminates that dead compute cost. Representative projection based on OpenCost modelling.
                </p>
              </div>
            </DsCard>
          </>
        )}

        {/* Platform story footer */}
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          border: '1px solid var(--ds-hairline)', background: 'var(--ds-surface-alt)',
          fontSize: 12, fontFamily: FONT, color: 'var(--ds-text-tertiary)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--ds-text-secondary)' }}>Platform Story:</strong>{' '}
          Backstage → Developer front door · GitOps → Controlled delivery · Crossplane → Infra abstraction ·
          Kubernetes/KubeVirt → Container + VM runtime · <strong style={{ color: 'var(--ds-chip-info-text)' }}>Knative → Serverless, event-driven, scale-to-zero</strong> ·
          FinOps → Cost behaviour explained · AIOps → Operational behaviour explained · Security/Policy → Autonomous governance maintained
        </div>

      </div>
    </AppleShell>
  );
};
