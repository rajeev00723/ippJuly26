import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { Card } from '../../design-system/primitives/Card';
import { WhatShouldIDoNow } from './WhatShouldIDoNow';
import { CrossPersonaContextCards, SECURITY_CONTEXT_CARDS } from './CrossPersonaContextCards';
import { tokens as dsTokens, dhl } from '../../design-system/tokens';
import { ExternalLink as ExternalLinkIcon, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { StatusChip, MetricCard, UnavailableBanner } from './shared';

const font = dsTokens.font.sans;
const mono = dsTokens.font.mono;

const ProgressBar = ({ value, good }: { value: number; good?: boolean }) => (
  <div style={{ height: '5px', borderRadius: '3px', background: 'var(--ds-hairline)', overflow: 'hidden' }}>
    <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: good ? 'var(--ds-success)' : 'var(--ds-warn)', borderRadius: '3px' }} />
  </div>
);

// ── Static data ───────────────────────────────────────────────────────────────

const spiffeIdentities = [
  { spiffeId: 'spiffe://cluster.local/ns/employee-portal/sa/employee-frontend', workload: 'employee-portal',  namespace: 'employee-portal',   status: 'Valid' },
  { spiffeId: 'spiffe://cluster.local/ns/employee-portal/sa/employee-backend',  workload: 'employee-backend', namespace: 'employee-portal',   status: 'Valid' },
  { spiffeId: 'spiffe://cluster.local/ns/aiops/sa/aiops-engine',                workload: 'aiops-engine',     namespace: 'aiops',             status: 'Valid' },
  { spiffeId: 'spiffe://cluster.local/ns/backstage/sa/backstage',               workload: 'backstage',        namespace: 'backstage',         status: 'Valid' },
  { spiffeId: 'spiffe://cluster.local/ns/crossplane-system/sa/crossplane',      workload: 'crossplane',       namespace: 'crossplane-system', status: 'Valid' },
];

const policyViolations = [
  { policy: 'require-resource-limits',  namespace: 'default',     resource: 'Pod/test-pod',  severity: 'Medium', action: 'Audit' },
  { policy: 'no-privileged-containers', namespace: 'kube-system', resource: 'Pod/debug-pod', severity: 'Medium', action: 'Audit' },
];

const networkPolicies = [
  { name: 'allow-employee-portal-ingress', namespace: 'employee-portal', type: 'Ingress', status: 'Enforced' },
  { name: 'deny-all-egress-default',       namespace: 'employee-portal', type: 'Egress',  status: 'Enforced' },
  { name: 'allow-backend-to-db',           namespace: 'employee-portal', type: 'Egress',  status: 'Enforced' },
  { name: 'allow-monitoring-scrape',       namespace: 'employee-portal', type: 'Ingress', status: 'Enforced' },
];

const rbacAudit = [
  { subject: 'developer-sa', namespace: 'default',   role: 'cluster-admin',              risk: 'High', recommendation: 'Scope to namespace level'         },
  { subject: 'backstage',    namespace: 'backstage',  role: 'backstage-scaffolder-writer', risk: 'Low',  recommendation: 'Required for IPP scaffolding'     },
];

const policyCompliance = [
  { category: 'Pod Security',      checks: 12, passed: 11, failed: 1 },
  { category: 'Resource Limits',   checks: 8,  passed: 6,  failed: 2 },
  { category: 'Network Isolation', checks: 6,  passed: 6,  failed: 0 },
  { category: 'Image Registry',    checks: 10, passed: 10, failed: 0 },
];

const zeroTrustItems = [
  'SPIFFE identities: Active on all pods',
  'mTLS: Enforced via Cilium',
  'Network: Default-deny + allowlist',
  'Policy: OPA + Kyverno enforcing',
];

// ── AIOps Security Panel ──────────────────────────────────────────────────────

function AIOpsSecurityPanel() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/proxy/aiops/api/analysis/latest')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))
      .catch(() => {});
  }, []);

  const shield = data?.worker_findings?.secure_shield;
  const actions = (data?.recommended_actions ?? []).filter((a: any) => a.owner === 'security').slice(0, 3);

  if (!data || !shield) {
    return (
      <Card title="AIOps — Secure Shield Agent" subtitle="Policy violations · SPIFFE identity · Network security" padding={3}>
        <UnavailableBanner service="AIOps Engine" command="kubectl port-forward -n aiops svc/aiops-engine 8000:8000" />
      </Card>
    );
  }

  const shieldColor = shield.severity === 'critical' ? 'var(--ds-error)' : shield.severity === 'high' ? 'var(--ds-warn)' : shield.severity === 'medium' ? 'var(--ds-warn)' : 'var(--ds-success)';

  return (
    <Card title="AIOps — Secure Shield Agent" subtitle="Policy violations · SPIFFE identity · Denied flows · RBAC" padding={3}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Findings</p>
          {shield.findings.map((f: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '4px' }}>
              <span style={{ color: shieldColor, fontSize: '14px', lineHeight: '1.5', flexShrink: 0 }}>•</span>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font }}>{f}</p>
            </div>
          ))}
        </div>
        <div>
          <p style={{ margin: '0 0 8px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Security Recommendations</p>
          {shield.recommendations.slice(0, 3).map((r: any, i: number) => (
            <p key={i} style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font }}>
              → {r.action}
              {r.automation && <code style={{ fontFamily: mono, color: 'var(--ds-text-secondary)', marginLeft: '8px', fontSize: '11px' }}>{r.automation}</code>}
            </p>
          ))}
          {actions.length > 0 && (
            <>
              <p style={{ margin: '10px 0 4px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Manager Security Actions</p>
              {actions.map((ra: any, i: number) => (
                <p key={i} style={{ margin: '0 0 2px', fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font }}>
                  <span style={{ fontWeight: 700, color: 'var(--ds-error)', marginRight: '4px' }}>[P{ra.priority}]</span>{ra.action}
                </p>
              ))}
            </>
          )}
          <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(212,5,17,0.07)', borderRadius: '6px', border: `1px solid rgba(212,5,17,0.20)` }}>
            <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: 'var(--ds-error)', fontFamily: font }}>
              Evidence ({shield.evidence.length} signals)
            </p>
            {shield.evidence.slice(0, 3).map((e: any, i: number) => (
              <p key={i} style={{ margin: '0 0 2px', fontSize: '11px', fontFamily: mono, color: 'var(--ds-text-secondary)' }}>[{e.source}] {e.detail || e.value || ''}</p>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const SecurityDashboardPage = () => {
  const navigate = useNavigate();
  const totalChecks  = policyCompliance.reduce((s, c) => s + c.checks, 0);
  const passedChecks = policyCompliance.reduce((s, c) => s + c.passed, 0);
  const scorePercent = Math.round((passedChecks / totalChecks) * 100);

  return (
    <AppleShell title="Security Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* WhatShouldIDoNow */}
        <WhatShouldIDoNow
          accentColor={dhl.red}
          topAction={{
            title: 'Review SPIFFE identity registration for new workloads',
            why: 'Any workload without a registered SPIFFE identity has no cryptographic authentication, violating your zero-trust policy.',
            ctaLabel: 'Open Security Posture',
            route: '/security-posture',
            color: 'var(--ds-error)',
            dataMode: 'simulated',
          }}
          nextActions={[
            {
              title: 'Audit recent Kyverno policy violations',
              reason: 'Policy violations in developer PRs must be reviewed to prevent non-compliant workloads from reaching production.',
              priority: 'high',
              etaHint: '10 min',
              route: '/security',
              dataMode: 'simulated',
            },
            {
              title: 'Review Cilium zero-trust network posture',
              reason: 'Verify all east-west traffic is governed by CiliumNetworkPolicy. No implicit allow rules should exist.',
              priority: 'medium',
              etaHint: '15 min',
              route: '/security-posture',
              dataMode: 'simulated',
            },
            {
              title: 'Check exceptions nearing expiry',
              reason: 'Policy exceptions with approaching expiry dates can create compliance gaps if not renewed or removed.',
              priority: 'low',
              etaHint: '5 min',
              route: '/security',
              dataMode: 'rule-based',
            },
          ]}
          infoItems={[
            { label: 'Compliance score',  value: '94%',          dataMode: 'simulated' },
            { label: 'Policy violations', value: '0 active',     dataMode: 'simulated' },
            { label: 'SPIFFE identities', value: '3 registered', dataMode: 'simulated' },
            { label: 'Cilium mTLS',       value: 'Enforced',     dataMode: 'simulated' },
            { label: 'RBAC anomalies',    value: 'None',         dataMode: 'rule-based' },
          ]}
        />

        <CrossPersonaContextCards cards={SECURITY_CONTEXT_CARDS} />

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', flexShrink: 0 }}>
          <MetricCard label="Compliance Score"   value={`${scorePercent}%`}            sub={`${passedChecks}/${totalChecks} checks pass`} />
          <MetricCard label="SPIFFE Identities"  value={spiffeIdentities.length}       sub="All valid"                                    />
          <MetricCard label="Policy Violations"  value={policyViolations.length}       sub="Audit mode — no blocking"                    />
          <MetricCard label="Network Policies"   value={networkPolicies.length}        sub="All enforced"                                 />
        </div>

        {/* Security Posture shortcut */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/security-posture')}
          onKeyDown={e => e.key === 'Enter' && navigate('/security-posture')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            background: 'var(--ds-chip-info-bg)',
            border: '1px solid var(--ds-chip-info-border)',
            borderRadius: '14px',
            cursor: 'pointer',
            flexShrink: 0,
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={18} strokeWidth={1.6} style={{ color: 'var(--ds-chip-info-text)', flexShrink: 0 }} />
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-primary)', fontFamily: font }}>Security Posture Report</p>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: font }}>Pillar-by-pillar scores: network segmentation, identity, policy, RBAC, secrets</p>
            </div>
          </div>
          <CheckCircle2 size={16} strokeWidth={1.6} style={{ color: 'var(--ds-chip-info-text)', flexShrink: 0 }} />
        </div>

        {/* Main 2-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Compliance Score */}
            <Card title="Compliance Score" subtitle="Policy check results across all namespaces" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <div style={{ textAlign: 'center', padding: '16px', background: 'var(--ds-chip-success-bg)', border: '1px solid var(--ds-chip-success-border)', borderRadius: '12px', marginBottom: '16px' }}>
                <div style={{ fontSize: '3.5rem', fontWeight: 900, color: 'var(--ds-success)', lineHeight: 1, fontFamily: font }}>{scorePercent}%</div>
                <div style={{ fontSize: '13px', color: 'var(--ds-chip-success-text)', fontWeight: 600, marginTop: '4px', fontFamily: font }}>Security Posture Score</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {policyCompliance.map(c => {
                  const pct = Math.round((c.passed / c.checks) * 100);
                  return (
                    <div key={c.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ds-text-primary)', fontFamily: font }}>{c.category}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: c.failed > 0 ? 'var(--ds-error)' : 'var(--ds-success)', fontFamily: mono }}>{c.passed}/{c.checks}</span>
                      </div>
                      <ProgressBar value={pct} good={c.failed === 0} />
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* SPIFFE/SPIRE Identities */}
            <Card title="SPIFFE/SPIRE Workload Identities" subtitle="Cryptographic identities issued to all workloads" style={{ overflow: 'auto', flex: 1 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Workload', 'Namespace', 'SPIFFE ID (truncated)', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {spiffeIdentities.map(id => (
                    <tr key={id.workload} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px', fontWeight: 600, fontSize: '13px', color: 'var(--ds-text-primary)' }}>{id.workload}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{id.namespace}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '11px', color: 'var(--ds-text-secondary)' }}>
                        {id.spiffeId.replace('spiffe://cluster.local', '').substring(0, 42)}…
                      </td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={id.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* RBAC Audit */}
            <Card title="RBAC Audit" subtitle="Service account permissions review and over-privilege detection" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Subject', 'Namespace', 'Bound Role', 'Risk', 'Recommendation'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rbacAudit.map(r => (
                    <tr key={r.subject} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontWeight: 600, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{r.subject}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{r.namespace}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{r.role}</td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={r.risk} /></td>
                      <td style={{ padding: '9px 10px', fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{r.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Policy Violations */}
            <Card title="Policy Violations" subtitle="OPA Gatekeeper + Kyverno constraint violations" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              {policyViolations.length === 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px' }}>
                  <CheckCircle2 size={18} strokeWidth={1.5} style={{ color: 'var(--ds-success)' }} />
                  <span style={{ fontSize: '14px', color: 'var(--ds-chip-success-text)', fontWeight: 600, fontFamily: font }}>No violations detected</span>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      {['Policy', 'Namespace', 'Resource', 'Severity', 'Action'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {policyViolations.map(v => (
                      <tr key={`${v.policy}-${v.resource}`} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                        <td style={{ padding: '9px 10px', fontFamily: mono, fontWeight: 600, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{v.policy}</td>
                        <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{v.namespace}</td>
                        <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-tertiary)' }}>{v.resource}</td>
                        <td style={{ padding: '9px 10px' }}><StatusChip status={v.severity} /></td>
                        <td style={{ padding: '9px 10px' }}><StatusChip status={v.action} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>

            {/* Cilium Network Policies */}
            <Card title="Cilium Network Policies" subtitle="Zero-trust network segmentation status" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Policy', 'Namespace', 'Direction', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {networkPolicies.map(np => (
                    <tr key={np.name} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontWeight: 600, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{np.name}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{np.namespace}</td>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: np.type === 'Ingress' ? 'var(--ds-chip-info-bg)' : 'var(--ds-chip-success-bg)', color: np.type === 'Ingress' ? 'var(--ds-chip-info-text)' : 'var(--ds-chip-success-text)', fontFamily: font }}>{np.type}</span>
                      </td>
                      <td style={{ padding: '9px 10px' }}><StatusChip status={np.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Security Tools + Zero Trust Status */}
            <Card title="Security Tools" subtitle="External security tooling and audit links" style={{ overflow: 'auto', flex: 1 }} padding={3}>
              {[
                { label: 'Hubble UI', url: 'http://hubble.dpcs.local', desc: 'Network flow visibility and denied flows' },
                { label: 'Grafana',   url: 'http://grafana.dpcs.local', desc: 'Security and audit dashboards' },
              ].map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', textDecoration: 'none' }}>
                  <ExternalLinkIcon size={13} strokeWidth={1.5} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--ds-text-primary)', fontSize: '13px', fontWeight: 600, fontFamily: font }}>{link.label}</span>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: font }}>{link.desc}</p>
                  </div>
                </a>
              ))}

              {/* Zero Trust Status */}
              <div style={{ padding: '14px', background: 'var(--ds-chip-success-bg)', border: '1px solid var(--ds-chip-success-border)', borderRadius: '10px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                  <ShieldCheck size={16} strokeWidth={1.5} style={{ color: 'var(--ds-success)' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ds-chip-success-text)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Zero Trust Status</span>
                </div>
                {zeroTrustItems.map(item => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <CheckCircle2 size={13} strokeWidth={1.5} style={{ color: 'var(--ds-success)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--ds-chip-success-text)', fontFamily: font }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Demo Storyline */}
              <div style={{ padding: '12px', background: 'rgba(212,5,17,0.06)', borderRadius: '10px', border: '1px solid rgba(212,5,17,0.15)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-error)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: font }}>Demo Storyline — Security</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font, lineHeight: 1.7 }}>
                  <strong>Show:</strong> All workloads have SPIFFE identities. The two policy violations are in <em>audit</em> mode — show the drift, not breakage. Open <em>Hubble UI</em> to visualize network flows and denied connections. Navigate to <strong>/security-posture</strong> for the full compliance posture view.
                </p>
              </div>
            </Card>

          </div>
        </div>

        {/* AIOps Secure Shield Panel */}
        <AIOpsSecurityPanel />

      </div>
    </AppleShell>
  );
};
