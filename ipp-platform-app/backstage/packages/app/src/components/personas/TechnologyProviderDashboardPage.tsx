import React, { useState, useEffect } from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { Card } from '../../design-system/primitives/Card';
import { WhatShouldIDoNow } from './WhatShouldIDoNow';
import { CrossPersonaContextCards, PROVIDER_CONTEXT_CARDS } from './CrossPersonaContextCards';
import { tokens as dsTokens, dhl } from '../../design-system/tokens';
import { ExternalLink as ExternalLinkIcon, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { StatusChip, MetricCard, UnavailableBanner } from './shared';

const font = dsTokens.font.sans;
const mono = dsTokens.font.mono;

const ProgressBar = ({ value }: { value: number }) => (
  <div style={{ height: '5px', borderRadius: '3px', background: 'var(--ds-hairline)', overflow: 'hidden', marginBottom: '2px' }}>
    <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: 'var(--ds-focus)', borderRadius: '3px' }} />
  </div>
);

function FulfillmentIcon({ status }: { status: string }) {
  if (status === 'Fulfilled')    return <CheckCircle2 size={16} strokeWidth={1.5} style={{ color: 'var(--ds-success)' }} />;
  if (status === 'Provisioning') return <Clock size={16} strokeWidth={1.5} style={{ color: 'var(--ds-warn)' }} />;
  if (status === 'Failed')       return <XCircle size={16} strokeWidth={1.5} style={{ color: 'var(--ds-error)' }} />;
  return <Clock size={16} strokeWidth={1.5} style={{ color: 'var(--ds-text-tertiary)' }} />;
}

// ── Static data ───────────────────────────────────────────────────────────────

const provisioningRequests = [
  { id: 'REQ-0012', requester: 'dev.user',          team: 'Engineering', resource: 'ThreeTierApp', name: 'employee-portal', namespace: 'employee-portal', status: 'Fulfilled',    submitted: '2d ago', fulfilled: '2d ago', ttl: '30d' },
  { id: 'REQ-0011', requester: 'dev.user',          team: 'Engineering', resource: 'ThreeTierApp', name: 'demo-app',        namespace: 'demo',            status: 'Fulfilled',    submitted: '5h ago', fulfilled: '5h ago', ttl: '7d'  },
  { id: 'REQ-0013', requester: 'platform.engineer', team: 'Platform',    resource: 'ThreeTierApp', name: 'staging-env',     namespace: 'staging',         status: 'Provisioning', submitted: '5m ago', fulfilled: '—',      ttl: '14d' },
];

const infraResources = [
  { kind: 'Namespace',   name: 'employee-portal',          cluster: 'idp-demo-cluster', status: 'Active',  claim: 'employee-portal', age: '2d' },
  { kind: 'Namespace',   name: 'demo',                     cluster: 'idp-demo-cluster', status: 'Active',  claim: 'demo-app',        age: '5h' },
  { kind: 'Deployment',  name: 'employee-portal-frontend', cluster: 'idp-demo-cluster', status: 'Running', claim: 'employee-portal', age: '2d' },
  { kind: 'Deployment',  name: 'employee-portal-backend',  cluster: 'idp-demo-cluster', status: 'Running', claim: 'employee-portal', age: '2d' },
  { kind: 'StatefulSet', name: 'employee-portal-db',       cluster: 'idp-demo-cluster', status: 'Running', claim: 'employee-portal', age: '2d' },
];

const providerHealth = [
  { name: 'provider-kubernetes', version: 'v0.12.1', status: 'Healthy', crds: 142, uptime: '99.9%' },
  { name: 'provider-helm',       version: 'v0.18.4', status: 'Healthy', crds: 58,  uptime: '99.9%' },
];

const slaMetrics = [
  { category: 'Provisioning SLA',   target: '< 2min',  actual: '82s',   pct: 95  },
  { category: 'Fulfillment Rate',   target: '> 98%',   actual: '100%',  pct: 100 },
  { category: 'Crossplane Uptime',  target: '> 99.5%', actual: '99.9%', pct: 99  },
  { category: 'Provider Readiness', target: '> 99%',   actual: '99.9%', pct: 99  },
];

const platformTools = [
  { label: 'Argo CD UI', url: 'http://argocd.dpcs.local',  desc: 'GitOps sync state for all resources' },
  { label: 'Grafana',    url: 'http://grafana.dpcs.local', desc: 'Resource and cost dashboards' },
  { label: 'OpenCost',   url: 'http://opencost.dpcs.local', desc: 'Cost attribution per claim' },
];

const AIOPS_URL = '/api/proxy/aiops/api';

// ── AIOps Provider Panel ──────────────────────────────────────────────────────

function AIOpsProviderPanel() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`${AIOPS_URL}/analysis/latest`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setData(d))
      .catch(() => {});
  }, []);

  const depHealth = data?.worker_findings?.deployment_health_doctor;
  const finops = data?.worker_findings?.finops;

  return (
    <Card title="AIOps — Infrastructure Fulfillment Health" subtitle="Deployment Health Doctor · FinOps Agent — provider and resource signals" padding={3}>
      {!data ? (
        <UnavailableBanner service="AIOps Engine" command="kubectl port-forward -n aiops svc/aiops-engine 8000:8000" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {depHealth && (
            <div style={{ padding: '14px', border: '1px solid var(--ds-hairline)', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Deployment Health Doctor</p>
              {depHealth.findings.slice(0, 3).map((f: string, i: number) => (
                <p key={i} style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font }}>• {f.substring(0, 90)}</p>
              ))}
            </div>
          )}
          {finops && (
            <div style={{ padding: '14px', background: 'var(--ds-chip-success-bg)', border: '1px solid var(--ds-chip-success-border)', borderRadius: '8px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-chip-success-text)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>FinOps Agent — Cost Signals</p>
              {finops.findings.slice(0, 3).map((f: string, i: number) => (
                <p key={i} style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--ds-chip-success-text)', fontFamily: font }}>• {f.substring(0, 90)}</p>
              ))}
              {finops.recommendations.slice(0, 1).map((r: any, i: number) => (
                <p key={i} style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--ds-chip-info-text)', fontFamily: font }}>→ {r.action}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const TechnologyProviderDashboardPage = () => {
  const fulfilled      = provisioningRequests.filter(r => r.status === 'Fulfilled').length;
  const pending        = provisioningRequests.filter(r => r.status === 'Provisioning' || r.status === 'Pending').length;
  const totalResources = infraResources.length;

  return (
    <AppleShell title="Agentic Operated Autonomous Self Service Private Cloud">
      <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* WhatShouldIDoNow */}
        <WhatShouldIDoNow
          accentColor={dhl.yellow}
          topAction={{
            title: 'Review and approve pending provisioning request from developer team',
            why: 'A developer has submitted a ThreeTierAppClaim. Until approved, the Crossplane composition cannot begin reconciliation.',
            ctaLabel: 'View Provider Queue',
            route: '/provider',
            color: '#D40511',
            dataMode: 'simulated',
          }}
          nextActions={[
            {
              title: 'Check SLA status for in-flight infrastructure requests',
              reason: 'Any provisioning taking longer than agreed SLA needs escalation to prevent developer blockers.',
              priority: 'medium',
              etaHint: '5 min',
              route: '/provider',
              dataMode: 'rule-based',
            },
            {
              title: 'Review cluster capacity before accepting new requests',
              reason: 'Current cluster capacity at 72%. Accept new provisioning requests only if headroom is sufficient.',
              priority: 'medium',
              etaHint: '5 min',
              route: '/platform',
              dataMode: 'simulated',
            },
          ]}
          infoItems={[
            { label: 'Pending requests',     value: '1',           dataMode: 'simulated' },
            { label: 'In-flight provisions', value: '2',           dataMode: 'simulated' },
            { label: 'Completed today',      value: '3',           dataMode: 'rule-based' },
            { label: 'Cluster headroom',     value: '28%',         dataMode: 'simulated' },
            { label: 'Provider health',      value: 'All healthy', dataMode: 'simulated' },
          ]}
        />

        <CrossPersonaContextCards cards={PROVIDER_CONTEXT_CARDS} />

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', flexShrink: 0 }}>
          <MetricCard label="Total Requests"     value={provisioningRequests.length} sub="All-time provisioning"        />
          <MetricCard label="Fulfilled"          value={fulfilled}                   sub="Successfully provisioned"     />
          <MetricCard label="In Progress"        value={pending}                     sub="Currently provisioning"       />
          <MetricCard label="Managed Resources"  value={totalResources}              sub="K8s resources provisioned"    />
        </div>

        {/* Main 2-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Provisioning Request Queue */}
            <Card title="Provisioning Request Queue" subtitle="Developer-submitted claims processed by Crossplane — fully automated, zero manual intervention" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Request ID', 'Requester', 'Team', 'Type', 'Name', 'NS', 'Status', 'Submitted', 'Fulfilled', 'TTL'].map(h => (
                      <th key={h} style={{ padding: '8px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {provisioningRequests.map(req => (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 8px', fontFamily: mono, fontWeight: 700, fontSize: '12px', color: '#D40511' }}>{req.id}</td>
                      <td style={{ padding: '9px 8px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{req.requester}</td>
                      <td style={{ padding: '9px 8px' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 8px', borderRadius: '980px', fontSize: '11px', fontWeight: 700, background: 'var(--ds-surface-alt)', color: 'var(--ds-text-secondary)', fontFamily: font }}>{req.team}</span>
                      </td>
                      <td style={{ padding: '9px 8px', fontFamily: mono, fontSize: '12px', color: 'var(--clr-compose)' }}>{req.resource}</td>
                      <td style={{ padding: '9px 8px', fontWeight: 600, fontSize: '13px', color: 'var(--ds-text-primary)' }}>{req.name}</td>
                      <td style={{ padding: '9px 8px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{req.namespace}</td>
                      <td style={{ padding: '9px 8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FulfillmentIcon status={req.status} />
                          <StatusChip status={req.status} />
                        </div>
                      </td>
                      <td style={{ padding: '9px 8px', fontSize: '12px', color: 'var(--ds-text-tertiary)', whiteSpace: 'nowrap' }}>{req.submitted}</td>
                      <td style={{ padding: '9px 8px', fontSize: '12px', color: req.fulfilled === '—' ? 'var(--ds-text-tertiary)' : 'var(--ds-success)', fontWeight: req.fulfilled !== '—' ? 600 : 400, whiteSpace: 'nowrap' }}>{req.fulfilled}</td>
                      <td style={{ padding: '9px 8px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{req.ttl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(8,145,178,0.06)', borderRadius: '8px', border: '1px solid rgba(8,145,178,0.2)' }}>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: font, lineHeight: 1.6 }}>
                  <strong>Key insight:</strong> Zero manual steps. A developer submits a <code style={{ fontFamily: mono, background: 'var(--ds-surface-alt)', padding: '1px 4px', borderRadius: '4px' }}>ThreeTierAppClaim</code> via Backstage → Crossplane reconciles it to K8s → resources are provisioned automatically. The Private Cloud Infrastructure Provider's role is composing and maintaining the XRD, not fulfilling individual requests.
                </p>
              </div>
            </Card>

            {/* Infrastructure Resources */}
            <Card title="Provisioned Infrastructure Resources" subtitle="Kubernetes resources created by Crossplane composites across the cluster" style={{ overflow: 'auto', flex: 1 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Kind', 'Name', 'Cluster', 'Status', 'Claim', 'Age'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {infraResources.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: 'var(--ds-chip-info-bg)', color: 'var(--ds-chip-info-text)', fontFamily: mono }}>{r.kind}</span>
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontWeight: 600, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{r.name}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '11px', color: 'var(--ds-text-tertiary)' }}>{r.cluster}</td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={r.status} /></td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--clr-compose)' }}>{r.claim}</td>
                      <td style={{ padding: '9px 10px', fontSize: '12px', color: 'var(--ds-text-tertiary)' }}>{r.age}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Provider Health + SLA */}
            <Card title="Provider Health & Delivery SLA" subtitle="Crossplane provider status and fulfillment performance" style={{ overflow: 'auto', flex: 1 }} padding={3}>

              {/* Provider table */}
              <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Crossplane Providers</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font, marginBottom: '16px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Provider', 'Version', 'Status', 'CRDs', 'Uptime'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {providerHealth.map(p => (
                    <tr key={p.name} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '8px 8px', fontFamily: mono, fontWeight: 600, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{p.name}</td>
                      <td style={{ padding: '8px 8px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{p.version}</td>
                      <td style={{ padding: '8px 8px' }}><StatusChip status={p.status} /></td>
                      <td style={{ padding: '8px 8px', fontFamily: mono, fontWeight: 600, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{p.crds}</td>
                      <td style={{ padding: '8px 8px', fontSize: '12px', color: 'var(--ds-success)', fontWeight: 600 }}>{p.uptime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--ds-hairline)', margin: '0 0 16px' }} />

              {/* SLA bars */}
              <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Delivery SLA</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {slaMetrics.map(sla => (
                  <div key={sla.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-primary)', fontFamily: font }}>{sla.category}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: font }}>target: {sla.target}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-success)', fontFamily: mono }}>{sla.actual}</span>
                      </div>
                    </div>
                    <ProgressBar value={sla.pct} />
                  </div>
                ))}
              </div>

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--ds-hairline)', margin: '0 0 16px' }} />

              {/* Platform Tools */}
              <p style={{ margin: '0 0 10px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Platform Tools</p>
              {platformTools.map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', textDecoration: 'none' }}>
                  <ExternalLinkIcon size={13} strokeWidth={1.5} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--ds-chip-info-text)', fontSize: '13px', fontWeight: 600, fontFamily: font }}>{link.label}</span>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: font }}>{link.desc}</p>
                  </div>
                </a>
              ))}

              {/* Demo Storyline */}
              <div style={{ padding: '12px', background: 'rgba(8,145,178,0.06)', borderRadius: '10px', border: '1px solid rgba(8,145,178,0.2)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: '#D40511', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: font }}>Demo Storyline — Private Cloud Infrastructure Provider</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font, lineHeight: 1.7 }}>
                  <strong>Show:</strong> The request queue is fully automated — a developer click in Backstage becomes a fulfilled Kubernetes environment in &lt;90s with no provider intervention. Point to the SLA panel — 100% fulfillment rate, sub-2-minute provisioning. Both Crossplane providers are healthy. Navigate to <strong>/crossplane</strong> to show the XRD composition that makes this possible.
                </p>
              </div>

            </Card>

          </div>
        </div>

        {/* AIOps Provider Panel */}
        <AIOpsProviderPanel />

      </div>
    </AppleShell>
  );
};
