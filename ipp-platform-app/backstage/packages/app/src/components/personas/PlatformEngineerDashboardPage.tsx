import React, { useState, useEffect } from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { Card } from '../../design-system/primitives/Card';
import { WhatShouldIDoNow } from './WhatShouldIDoNow';
import { CrossPersonaContextCards, PLATFORM_CONTEXT_CARDS } from './CrossPersonaContextCards';
import { tokens as dsTokens } from '../../design-system/tokens';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { StatusChip, MetricCard, UnavailableBanner } from './shared';

const font = dsTokens.font.sans;
const mono = dsTokens.font.mono;

// ── Static data ───────────────────────────────────────────────────────────────

const providers = [
  { name: 'provider-kubernetes', version: 'v0.12.1', health: 'Healthy', packages: 142 },
  { name: 'provider-helm',       version: 'v0.18.4', health: 'Healthy', packages: 58  },
];

const compositeResources = [
  { name: 'employee-portal', kind: 'XThreeTierApp', namespace: 'employee-portal', ready: 'True', synced: 'True', age: '2d' },
];

const argoApps = [
  { name: 'employee-portal',   project: 'default',  status: 'Synced', health: 'Healthy', revision: 'a1b2c3d', lastSync: '2m ago'  },
  { name: 'crossplane-claims', project: 'default',  status: 'Synced', health: 'Healthy', revision: 'd4e5f6a', lastSync: '8m ago'  },
  { name: 'backstage',         project: 'platform', status: 'Synced', health: 'Healthy', revision: 'b7c8d9e', lastSync: '1h ago'  },
  { name: 'monitoring-stack',  project: 'platform', status: 'Synced', health: 'Healthy', revision: 'f0a1b2c', lastSync: '3h ago'  },
];

const compositions = [
  { name: 'three-tier-app',    xrd: 'XThreeTierApp', claims: 1, status: 'Active' },
  { name: 'vm-three-tier-app', xrd: 'XVMApp',        claims: 0, status: 'Active' },
];

const externalTools = [
  { label: 'Argo CD UI',  url: 'http://argocd.dpcs.local',    desc: 'GitOps application management' },
  { label: 'Grafana',     url: 'http://grafana.dpcs.local',   desc: 'Metrics and observability' },
  { label: 'Hubble UI',   url: 'http://hubble.dpcs.local',    desc: 'Cilium network flow visibility' },
  { label: 'OpenCost UI', url: 'http://opencost.dpcs.local',  desc: 'Kubernetes cost visibility' },
  { label: 'Prometheus',  url: 'http://prometheus.dpcs.local', desc: 'Raw metrics scraping' },
];

// ── AIOps Platform Panel ──────────────────────────────────────────────────────

function AIOpsPlatformPanel() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/proxy/aiops/api/agents/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  return (
    <Card title="AIOps — Agent & Signal Source Health" subtitle="Manager Agent · Deployment Health Doctor · Signal source availability" padding={3}>
      {!data ? (
        <UnavailableBanner service="AIOps Engine" command="kubectl port-forward -n aiops svc/aiops-engine 8000:8000" />
      ) : (
        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {(data.agents || []).map((agent: any) => (
              <div key={agent.key} style={{ padding: '8px 14px', border: '1px solid var(--ds-hairline)', borderRadius: '10px', textAlign: 'center', minWidth: '110px' }}>
                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: font }}>{agent.name.replace(' Agent', '').substring(0, 20)}</p>
                <StatusChip status={agent.status === 'ready' ? 'Ready' : 'N/A'} />
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: font }}>{agent.mode}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px 14px', background: 'var(--ds-surface-alt)', borderRadius: '8px', border: '1px solid var(--ds-hairline)' }}>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: font }}>
              LLM: <strong style={{ color: 'var(--ds-text-primary)' }}>{data.llm_model}</strong> ({data.llm_mode}) ·{' '}
              Ollama: <strong style={{ color: 'var(--ds-text-primary)' }}>{data.ollama_reachable ? '✓ reachable' : '✗ unreachable (using rule-based fallback)'}</strong> ·{' '}
              Tracing: <strong style={{ color: 'var(--ds-text-primary)' }}>{data.tracing}</strong>
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const PlatformEngineerDashboardPage = () => {
  return (
    <AppleShell title="Platform Engineering Dashboard">
      <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* WhatShouldIDoNow */}
        <WhatShouldIDoNow
          accentColor="var(--clr-compose)"
          topAction={{
            title: 'Investigate Crossplane composition drift',
            why: 'The vm-three-tier-app composition has 0 active claims. Verify provider health and XRD schema to ensure it is ready for new developer requests.',
            ctaLabel: 'Open Crossplane Dashboard',
            route: '/crossplane',
            color: 'var(--clr-compose)',
            dataMode: 'simulated',
          }}
          nextActions={[
            {
              title: 'Review Argo CD sync status across all applications',
              reason: 'Drift in any GitOps app affects developer deployments. Confirm all 4 apps are Synced and Healthy.',
              priority: 'medium',
              etaHint: '5 min',
              route: '/gitops',
              dataMode: 'simulated',
            },
            {
              title: 'Check provider version currency',
              reason: 'provider-kubernetes and provider-helm should be on latest stable versions to avoid reconciliation bugs.',
              priority: 'low',
              etaHint: '10 min',
              route: '/crossplane',
              dataMode: 'rule-based',
            },
            {
              title: 'Review pending developer provisioning requests',
              reason: 'Developers may have unresolved template submissions awaiting platform review.',
              priority: 'low',
              etaHint: '5 min',
              route: '/developer',
              dataMode: 'rule-based',
            },
          ]}
          infoItems={[
            { label: 'Crossplane providers', value: '2 healthy',  dataMode: 'simulated' },
            { label: 'Compositions',         value: '2 active',   dataMode: 'simulated' },
            { label: 'Argo CD apps',         value: '4 synced',   dataMode: 'simulated' },
            { label: 'Cluster health',       value: 'Healthy',    dataMode: 'simulated' },
            { label: 'Last drift check',     value: '15 min ago', dataMode: 'rule-based' },
          ]}
        />

        <CrossPersonaContextCards cards={PLATFORM_CONTEXT_CARDS} />

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', flexShrink: 0 }}>
          <MetricCard label="Providers"      value={providers.length}    sub="All healthy"          />
          <MetricCard label="Compositions"   value={compositions.length} sub="XRDs registered"      />
          <MetricCard label="Argo CD Apps"   value={argoApps.length}     sub="All synced"           />
          <MetricCard label="Drift Detected" value="0"                   sub="No policy violations" />
        </div>

        {/* Main 2-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Argo CD Apps */}
            <Card title="Argo CD Applications" subtitle="GitOps sync status across all managed applications" style={{ overflow: 'auto', flex: 1 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Application', 'Project', 'Sync', 'Health', 'Revision', 'Last Sync'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {argoApps.map(app => (
                    <tr key={app.name} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600, color: 'var(--ds-text-primary)' }}>{app.name}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{app.project}</td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={app.status} /></td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={app.health} /></td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-tertiary)' }}>{app.revision}</td>
                      <td style={{ padding: '9px 10px', fontSize: '12px', color: 'var(--ds-text-tertiary)' }}>{app.lastSync}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Provider Health */}
            <Card title="Crossplane Provider Health" subtitle="Control plane provider status" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Provider', 'Version', 'Health', 'Packages'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {providers.map(p => (
                    <tr key={p.name} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600, fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{p.name}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{p.version}</td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={p.health} /></td>
                      <td style={{ padding: '9px 10px', fontSize: '13px', color: 'var(--ds-text-primary)' }}>{p.packages}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Compositions + Active Composite Resources */}
            <Card title="Compositions" subtitle="Available Crossplane XRD compositions" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Composition', 'XRD', 'Claims', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compositions.map(c => (
                    <tr key={c.name} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600, fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{c.name}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{c.xrd}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: c.claims > 0 ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface-alt)', color: c.claims > 0 ? 'var(--ds-chip-info-text)' : 'var(--ds-text-tertiary)', fontFamily: font }}>{c.claims}</span>
                      </td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Active Composite Resources */}
            <Card title="Active Composite Resources" subtitle="XThreeTierApp instances managed by Crossplane" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Name', 'Kind', 'Ready', 'Synced', 'Age'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compositeResources.map(r => (
                    <tr key={r.name} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px' }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '13px', color: 'var(--ds-text-primary)', fontFamily: font }}>{r.name}</p>
                        <p style={{ margin: 0, fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: mono }}>{r.namespace}</p>
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{r.kind}</td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={r.ready} /></td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={r.synced} /></td>
                      <td style={{ padding: '9px 10px', fontSize: '12px', color: 'var(--ds-text-tertiary)' }}>{r.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Platform Actions & External Tools */}
            <Card title="Platform Actions & External Tools" subtitle="Day-2 operations and platform tooling" style={{ overflow: 'auto', flex: 1 }} padding={3}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                {[
                  { label: 'Scale Frontend', primary: true },
                  { label: 'Upgrade Backend', primary: false },
                  { label: 'Expand Database', primary: false },
                  { label: 'Crossplane', href: '/crossplane' },
                  { label: 'GitOps', href: '/gitops' },
                ].map(btn => (
                  <a key={btn.label} href={(btn as any).href || '#'}
                    style={{ display: 'inline-flex', padding: '7px 16px', borderRadius: '980px', background: (btn as any).primary ? '#1A1A1A' : 'var(--ds-hairline)', color: (btn as any).primary ? '#fff' : '#1d1d1f', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: font, cursor: 'pointer' }}>
                    {btn.label}
                  </a>
                ))}
              </div>
              <div style={{ height: '1px', background: 'var(--ds-hairline)', margin: '0 0 12px' }} />
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ds-text-tertiary)', fontFamily: font }}>External Tools</p>
              {externalTools.map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', textDecoration: 'none' }}>
                  <ExternalLinkIcon size={13} strokeWidth={1.5} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--ds-chip-info-text)', fontSize: '13px', fontWeight: 600, fontFamily: font }}>{link.label}</span>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: font }}>{link.desc}</p>
                  </div>
                </a>
              ))}
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(124,58,237,0.06)', borderRadius: '10px', border: '1px solid rgba(124,58,237,0.15)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: 'var(--clr-compose)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: font }}>Demo Storyline — Platform Engineer</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font, lineHeight: 1.7 }}>
                  <strong>Show:</strong> Both Crossplane providers are healthy. Point to the composition — one YAML definition provisions an entire three-tier stack. All Argo CD apps are synced. Trigger a Day-2 scale action to show GitOps reconciliation. Navigate to <strong>/crossplane</strong> to explore XRDs and claims.
                </p>
              </div>
            </Card>

          </div>
        </div>

        {/* AIOps Platform Panel */}
        <AIOpsPlatformPanel />

      </div>
    </AppleShell>
  );
};
