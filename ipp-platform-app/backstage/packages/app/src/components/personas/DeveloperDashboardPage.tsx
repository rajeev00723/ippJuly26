import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { Card } from '../../design-system/primitives/Card';
import { WhatShouldIDoNow } from './WhatShouldIDoNow';
import { CrossPersonaContextCards, DEVELOPER_CONTEXT_CARDS } from './CrossPersonaContextCards';
import { tokens as dsTokens, dhl } from '../../design-system/tokens';
import { CheckCircle2, ExternalLink as ExternalLinkIcon } from 'lucide-react';
import { StatusChip, MetricCard, UnavailableBanner } from './shared';

// ── Design tokens (inline) ───────────────────────────────────────────────────
const font = dsTokens.font.sans;
const mono = dsTokens.font.mono;

// ── Static data ───────────────────────────────────────────────────────────────

const provisioningSteps = [
  { name: 'Backstage Template',   status: 'complete',    detail: 'ThreeTierAppClaim submitted via scaffolder',         duration: '2s'   },
  { name: 'Git Commit',           status: 'complete',    detail: 'feat: scaffold employee-portal via IPP',             duration: '1s'   },
  { name: 'Argo CD Sync',         status: 'complete',    detail: 'Application synced to cluster idp-demo-cluster',     duration: '8s'   },
  { name: 'Crossplane Reconcile', status: 'in-progress', detail: 'XThreeTierApp employee-portal reconciling…',         duration: '~30s' },
  { name: 'Kubernetes Ready',     status: 'pending',     detail: 'Waiting for Crossplane to complete reconciliation'                   },
];

const applications = [
  { name: 'employee-portal',   type: 'website',  status: 'Synced', health: 'Healthy', namespace: 'employee-portal', version: 'v1.0.0' },
  { name: 'employee-backend',  type: 'service',  status: 'Synced', health: 'Healthy', namespace: 'employee-portal', version: 'v1.0.0' },
  { name: 'employee-database', type: 'database', status: 'Synced', health: 'Healthy', namespace: 'employee-portal', version: 'pg16'   },
];

const appHealth = [
  { name: 'employee-portal',   health: 'Healthy', replicas: '2/2', cpu: '45m',  memory: '128Mi', latency: '12ms'  },
  { name: 'employee-backend',  health: 'Healthy', replicas: '2/2', cpu: '80m',  memory: '256Mi', latency: '28ms'  },
  { name: 'employee-database', health: 'Healthy', replicas: '1/1', cpu: '20m',  memory: '512Mi', latency: '4ms'   },
];

const developerJourney = [
  { step: '1', title: 'Onboard via Infra Wizard', desc: 'Pick KubeVirt VM, Local Cluster, or AKS; IIP submits the real claim to Crossplane — same GitOps flow as the scaffolder path.', link: '/infra-onboarding', done: true  },
  { step: '2', title: 'Explore the Catalog',      desc: 'Your app, its components, dependencies, and docs are auto-registered in the Backstage service catalog.',                      link: '/catalog',          done: true  },
  { step: '3', title: 'Watch GitOps Deploy',      desc: 'Argo CD detects the Git change and syncs resources to the cluster with a zero-downtime rolling deploy.',                      link: '/gitops',           done: false },
  { step: '4', title: 'Monitor and Observe',      desc: 'View live metrics in Grafana, check AIOps for anomalies, and see cost attribution in OpenCost.',                              link: '/operations',       done: false },
];

const stepColor = (status: string) => {
  if (status === 'complete') return 'var(--ds-success)';
  if (status === 'in-progress') return 'var(--ds-warn)';
  return 'var(--ds-text-tertiary)';
};

// ── AIOps Dev Panel ───────────────────────────────────────────────────────────

function AIOpsDevPanel() {
  const [data, setData] = useState<any>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    fetch('/api/proxy/aiops/api/analysis/latest')
      .then(r => r.ok ? r.json() : null)
      .then(d => d ? setData(d) : setUnavailable(true))
      .catch(() => setUnavailable(true));
  }, []);

  const depHealth = data?.worker_findings?.deployment_health_doctor;
  const topAction = data?.recommended_actions?.[0];
  const sev = data?.severity || 'info';
  const sevColors: Record<string, string> = {
    critical: 'var(--ds-error)', high: 'var(--ds-warn)', medium: 'var(--ds-warn)', low: 'var(--ds-chip-info-text)', info: 'var(--ds-success)',
  };
  const color = sevColors[sev] || 'var(--ds-text-tertiary)';

  if (unavailable && !data) {
    return (
      <Card title="Application Health Summary" subtitle="AI-powered health insight — deployment and availability focus" padding={3}>
        <UnavailableBanner
          service="AIOps Health Engine"
          reason="The AIOps service is not reachable. Representative data is shown when the engine is offline."
          command="kubectl port-forward -n aiops svc/aiops-engine 8000:8000"
        />
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card title="Application Health Summary" subtitle="Powered by AIOps Manager Agent — deployment and availability focus" padding={3}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        <div style={{ padding: '12px', border: `1px solid ${color}40`, borderLeft: `3px solid ${color}`, borderRadius: '8px' }}>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Overall Health</p>
          <p style={{ margin: '4px 0 2px', fontSize: '18px', fontWeight: 700, color, fontFamily: font }}>{sev.toUpperCase()}</p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: font }}>{data.business_impact || 'Platform operating normally'}</p>
        </div>
        {depHealth && (
          <div style={{ padding: '12px', border: '1px solid var(--ds-hairline)', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Deployment Status</p>
            {depHealth.findings.slice(0, 2).map((f: string, i: number) => (
              <p key={i} style={{ margin: '0 0 2px', fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font }}>· {f.substring(0, 80)}</p>
            ))}
          </div>
        )}
        {topAction && (
          <div style={{ padding: '12px', background: 'rgba(255,204,0,0.06)', borderRadius: '8px', border: '1px solid rgba(255,204,0,0.20)' }}>
            <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: dhl.yellow, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Recommended Action</p>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font, lineHeight: 1.5 }}>{topAction.action.substring(0, 100)}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const DeveloperDashboardPage = () => {
  return (
    <AppleShell title="Developer Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* WhatShouldIDoNow */}
        <WhatShouldIDoNow
          accentColor={dhl.yellow}
          topAction={{
            title: 'Review and merge your open pull request',
            why: 'Your employee-portal service has 1 PR in review. Merging it will trigger the Argo CD GitOps sync and deploy the latest changes to the cluster.',
            ctaLabel: 'View GitOps Status',
            route: '/gitops',
            color: '#1A1A1A',
            dataMode: 'simulated',
          }}
          nextActions={[
            {
              title: 'Onboard an application via the infra wizard',
              reason: 'Pick a real deployment target (KubeVirt VM, Local Cluster, AKS) and IIP submits the claim — no ticket needed.',
              priority: 'medium',
              etaHint: '< 2 min',
              route: '/infra-onboarding',
              dataMode: 'rule-based',
            },
            {
              title: 'Check policy validation on your latest commit',
              reason: 'Kyverno and OPA gates run on every commit. Verify no new violations were introduced.',
              priority: 'medium',
              etaHint: '2 min',
              route: '/security',
              dataMode: 'simulated',
            },
            {
              title: 'Request a new 3-tier application via the catalog scaffolder',
              reason: 'Provision a new three-tier stack without raising a ticket — Crossplane handles all Kubernetes resources.',
              priority: 'low',
              etaHint: '< 90 sec',
              route: '/create',
              dataMode: 'rule-based',
            },
            {
              title: 'View AIOps recommendations for your services',
              reason: 'The AIOps Manager Agent may have cost or reliability recommendations for workloads you own.',
              priority: 'low',
              etaHint: '5 min',
              route: '/aiops-chat',
              dataMode: 'rule-based',
            },
          ]}
          infoItems={[
            { label: 'Services in catalog',   value: '3 registered', dataMode: 'simulated' },
            { label: 'GitOps sync state',     value: 'Synced',       dataMode: 'simulated' },
            { label: 'Policy check',          value: 'All pass',     dataMode: 'simulated' },
            { label: 'Crossplane composition',value: 'Ready',        dataMode: 'simulated' },
            { label: 'Last deployment',       value: '2 min ago',    dataMode: 'simulated' },
          ]}
        />

        {/* Cross-persona context */}
        <CrossPersonaContextCards cards={DEVELOPER_CONTEXT_CARDS} />

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', flexShrink: 0 }}>
          <MetricCard label="My Services"   value="3"       sub="Registered in catalog"    />
          <MetricCard label="Deployment"    value="Healthy" sub="All replicas ready"        />
          <MetricCard label="GitOps Sync"   value="Synced"  sub="Last sync: 2 minutes ago"  />
          <MetricCard label="Policy Checks" value="Pass"    sub="OPA + Kyverno enforced"    />
        </div>

        {/* Main 2-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* My Applications */}
            <Card title="My Applications" subtitle="Services registered in the Backstage service catalog" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Name', 'Type', 'Namespace', 'Sync', 'Health', 'Version'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {applications.map(app => (
                    <tr key={app.name} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <Link to={`/catalog/default/component/${app.name}`} style={{ color: 'var(--ds-text-primary)', textDecoration: 'none', fontWeight: 600 }}>{app.name}</Link>
                      </td>
                      <td style={{ padding: '10px 12px', color: 'var(--ds-text-tertiary)', fontFamily: mono, fontSize: '12px' }}>{app.type}</td>
                      <td style={{ padding: '10px 12px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{app.namespace}</td>
                      <td style={{ padding: '10px 12px' }}><StatusChip status={app.status} /></td>
                      <td style={{ padding: '10px 12px' }}><StatusChip status={app.health} /></td>
                      <td style={{ padding: '10px 12px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{app.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Two-column: Pipeline + Health */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

              {/* Provisioning Pipeline */}
              <Card title="Provisioning Pipeline" subtitle="employee-portal — end-to-end GitOps flow" style={{ overflow: 'auto' }} padding={3}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {provisioningSteps.map(step => (
                    <div key={step.name} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: stepColor(step.status), flexShrink: 0, marginTop: 3 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-primary)', fontFamily: font }}>{step.name}</span>
                          {step.duration && <span style={{ fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: mono }}>{step.duration}</span>}
                          <StatusChip status={step.status === 'complete' ? 'Done' : step.status === 'in-progress' ? 'Running' : 'Pending'} />
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: font }}>{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Application Health */}
              <Card title="Application Health" subtitle="Runtime metrics from the Kubernetes cluster" style={{ overflow: 'auto' }} padding={3}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {appHealth.map(svc => (
                    <div key={svc.name}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: font }}>{svc.name}</span>
                        <StatusChip status={svc.health} />
                      </div>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: mono }}>
                        Replicas: {svc.replicas} · CPU: {svc.cpu} · Mem: {svc.memory} · p50: {svc.latency}
                      </p>
                      <div style={{ marginTop: '8px', height: '1px', background: 'var(--ds-hairline)' }} />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Quick Actions */}
            <Card title="Quick Actions" subtitle="Common developer workflows" padding={3} style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                <a href="/infra-onboarding" style={{ display: 'inline-flex', padding: '7px 16px', borderRadius: '980px', background: dhl.black, color: '#fff', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: font }}>+ Onboard an Application</a>
                <a href="/create" style={{ display: 'inline-flex', padding: '7px 16px', borderRadius: '980px', background: 'var(--ds-hairline)', color: 'var(--ds-text-primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: font }}>Scaffolder Template</a>
                <a href="/catalog" style={{ display: 'inline-flex', padding: '7px 16px', borderRadius: '980px', background: 'var(--ds-hairline)', color: 'var(--ds-text-primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: font }}>Service Catalog</a>
                <a href="/docs" style={{ display: 'inline-flex', padding: '7px 16px', borderRadius: '980px', background: 'var(--ds-hairline)', color: 'var(--ds-text-primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: font }}>Platform Docs</a>
                <a href="/api-docs" style={{ display: 'inline-flex', padding: '7px 16px', borderRadius: '980px', background: 'var(--ds-hairline)', color: 'var(--ds-text-primary)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: font }}>API Explorer</a>
              </div>
              <div style={{ height: '1px', background: 'var(--ds-hairline)', margin: '0 0 12px' }} />
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ds-text-tertiary)', fontFamily: font }}>External Links</p>
              {[
                { href: 'http://employee.dpcs.local', label: 'Employee Portal App' },
                { href: 'http://argocd.dpcs.local',  label: 'Argo CD Dashboard' },
                { href: 'http://grafana.dpcs.local',  label: 'Grafana Metrics' },
              ].map(link => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--ds-text-primary)', textDecoration: 'none', fontSize: '13px', fontWeight: 600, fontFamily: font, marginBottom: '8px' }}>
                  <ExternalLinkIcon size={13} strokeWidth={1.5} />
                  {link.label}
                </a>
              ))}
            </Card>

            {/* Developer Journey */}
            <Card title="Developer Journey" subtitle="Request → provision → observe" style={{ overflow: 'auto', flex: 1 }} padding={3}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {developerJourney.map(item => (
                  <div key={item.step} style={{ border: '1px solid var(--ds-hairline)', borderRadius: '10px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <StatusChip status={`Step ${item.step}`} />
                      {item.done && <CheckCircle2 size={14} strokeWidth={1.5} style={{ color: 'var(--ds-success)' }} />}
                    </div>
                    <p style={{ margin: '4px 0 2px', fontSize: '13px', fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: font }}>{item.title}</p>
                    <p style={{ margin: '0 0 6px', fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: font, lineHeight: 1.5 }}>{item.desc}</p>
                    <Link to={item.link} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ds-text-primary)', textDecoration: 'none', letterSpacing: '-0.01em' }}>Open →</Link>
                  </div>
                ))}
              </div>

              {/* Demo guidance */}
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,204,0,0.06)', borderRadius: '10px', border: '1px solid rgba(255,204,0,0.20)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: dhl.yellow, textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: font }}>Demo Storyline — Developer</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font, lineHeight: 1.7 }}>
                  <strong>Show:</strong> Click <em>Onboard an Application</em> → pick a deployment target (KubeVirt VM, Local Cluster, or AKS) → confirm. IIP submits the real claim and Crossplane provisions it. Switch to <strong>GitOps · Argo CD</strong>, then <strong>Operations</strong> for metrics and AIOps insights.
                </p>
              </div>
            </Card>

          </div>
        </div>

        {/* AIOps Health Summary */}
        <AIOpsDevPanel />

      </div>
    </AppleShell>
  );
};
