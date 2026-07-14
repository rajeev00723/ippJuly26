import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { Card } from '../../design-system/primitives/Card';
import { WhatShouldIDoNow } from './WhatShouldIDoNow';
import { CrossPersonaContextCards, OPERATIONS_CONTEXT_CARDS } from './CrossPersonaContextCards';
import { tokens as dsTokens } from '../../design-system/tokens';
import { ExternalLink as ExternalLinkIcon, GitBranch } from 'lucide-react';
import { StatusChip, MetricCard, UnavailableBanner } from './shared';

const font = dsTokens.font.sans;
const mono = dsTokens.font.mono;

// Progress bar helper
const ProgressBar = ({ value, warn }: { value: number; warn?: boolean }) => (
  <div style={{ height: '5px', borderRadius: '3px', background: 'var(--ds-hairline)', overflow: 'hidden', marginBottom: '2px' }}>
    <div style={{ height: '100%', width: `${Math.min(value, 100)}%`, background: warn ? 'var(--ds-error)' : 'var(--ds-focus)', borderRadius: '3px', transition: 'width 0.3s' }} />
  </div>
);

// ── Static data ───────────────────────────────────────────────────────────────

const incidents = [
  { id: 'INC-001', severity: 'warning', title: 'High memory usage on employee-backend', namespace: 'employee-portal', time: '5m ago',  status: 'Investigating' },
  { id: 'INC-002', severity: 'info',    title: 'Pod restart detected: employee-frontend', namespace: 'employee-portal', time: '12m ago', status: 'Resolved'      },
];

const services = [
  { name: 'employee-portal',   namespace: 'employee-portal', status: 'Healthy',  uptime: '99.9%', latency: '12ms',  cpu: 45,  mem: 51  },
  { name: 'employee-backend',  namespace: 'employee-portal', status: 'Degraded', uptime: '99.1%', latency: '312ms', cpu: 80,  mem: 62  },
  { name: 'employee-database', namespace: 'employee-portal', status: 'Healthy',  uptime: '100%',  latency: '4ms',   cpu: 20,  mem: 45  },
  { name: 'aiops-engine',      namespace: 'aiops',           status: 'Healthy',  uptime: '99.8%', latency: '120ms', cpu: 35,  mem: 38  },
  { name: 'backstage',         namespace: 'backstage',       status: 'Healthy',  uptime: '100%',  latency: '28ms',  cpu: 120, mem: 70  },
];

const recentEvents = [
  { type: 'Warning', reason: 'OOMKilled', object: 'pod/employee-backend-7c9f-xk2p',  message: 'Container exceeded memory limit',      time: '5m ago'  },
  { type: 'Normal',  reason: 'Pulled',    object: 'pod/employee-frontend-6b8d-lm4q', message: 'Successfully pulled image v1.0.0',      time: '10m ago' },
  { type: 'Warning', reason: 'BackOff',   object: 'pod/employee-backend-7c9f-xk2p',  message: 'Back-off restarting failed container',  time: '4m ago'  },
  { type: 'Normal',  reason: 'ScaleDown', object: 'hpa/employee-backend',             message: 'Scaled down replicas from 3 to 2',      time: '20m ago' },
];

const sevConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: 'var(--ds-error)', bg: 'var(--ds-chip-error-bg)' },
  warning:  { color: 'var(--ds-warn)', bg: 'var(--ds-chip-warn-bg)' },
  info:     { color: 'var(--ds-chip-info-text)', bg: 'var(--ds-chip-info-bg)' },
};

const obsvTools = [
  { label: 'AIOps Engine', url: 'http://aiops.dpcs.local',      desc: 'Incident signals and recommendations' },
  { label: 'Grafana',      url: 'http://grafana.dpcs.local',    desc: 'Metrics dashboards and alerting' },
  { label: 'Hubble UI',    url: 'http://hubble.dpcs.local',     desc: 'Cilium network flow visualization' },
  { label: 'OpenCost',     url: 'http://opencost.dpcs.local',   desc: 'Cost attribution per namespace' },
  { label: 'Prometheus',   url: 'http://prometheus.dpcs.local', desc: 'Raw metrics and PromQL explorer' },
];

// ── AIOps Command Center Card ─────────────────────────────────────────────────

function AIOpsCommandCenterCard() {
  const [summary, setSummary] = useState<{
    severity: string; confidence: number; summary: string; highCount: number; isDemo: boolean;
  } | null>(null);

  useEffect(() => {
    fetch('/api/proxy/aiops/api/analysis/latest')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const highCount = Object.values(d.worker_findings ?? {}).filter(
          (f: any) => ['critical', 'high'].includes(f.severity)
        ).length;
        setSummary({
          severity: d.severity,
          confidence: d.confidence,
          summary: d.summary,
          highCount,
          isDemo: d.llm_mode === 'fallback',
        });
      })
      .catch(() => {});
  }, []);

  const sev = summary?.severity || 'info';
  const sevColor: Record<string, string> = {
    critical: 'var(--ds-error)', high: 'var(--ds-warn)', medium: 'var(--ds-warn)', low: 'var(--ds-chip-info-text)', info: 'var(--ds-success)',
  };
  const color = sevColor[sev] || 'var(--ds-text-tertiary)';

  return (
    <Card title="AIOps Agent Command Center" subtitle="1 Manager Agent · 5 Specialist Agents · Evidence-based recommendations" padding={3}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '12px', background: 'var(--ds-chip-info-bg)', border: '1px solid var(--ds-chip-info-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <GitBranch size={24} strokeWidth={1.5} style={{ color: 'var(--ds-chip-info-text)' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            {summary ? (
              <>
                <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: color + '18', color, fontFamily: font }}>Severity: {sev.toUpperCase()}</span>
                <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: summary.highCount > 0 ? 'var(--ds-chip-error-bg)' : 'rgba(34,197,94,0.10)', color: summary.highCount > 0 ? 'var(--ds-error)' : 'var(--ds-success)', fontFamily: font }}>{summary.highCount} High/Critical</span>
                <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: 'var(--ds-chip-info-bg)', color: 'var(--ds-chip-info-text)', fontFamily: font }}>{(summary.confidence * 100).toFixed(0)}% confidence</span>
                {summary.isDemo && <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: 'var(--ds-chip-warn-bg)', color: 'var(--ds-warn)', fontFamily: font }}>Demo data</span>}
              </>
            ) : (
              <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: 'var(--ds-chip-warn-bg)', color: 'var(--ds-warn)', fontFamily: font }}>Engine unavailable — demo data shown</span>
            )}
          </div>
          {summary && (
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: 'var(--ds-text-primary)', fontFamily: font, lineHeight: 1.5 }}>
              <strong>Latest:</strong> {summary.summary.substring(0, 120)}{summary.summary.length > 120 ? '…' : ''}
            </p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
            {['Capacity SRE', 'FinOps', 'Incident Prev.', 'Deploy Health', 'Secure Shield'].map(name => (
              <span key={name} style={{ display: 'inline-flex', padding: '2px 10px', borderRadius: '980px', fontSize: '11px', fontWeight: 600, background: 'var(--ds-surface-alt)', color: 'var(--ds-text-secondary)', fontFamily: font }}>{name}</span>
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link to="/agent-command-center" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1A1A1A', color: '#fff', borderRadius: '980px', padding: '7px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', fontFamily: font }}>
              <GitBranch size={14} strokeWidth={1.5} />
              Open Agent Command Center
            </Link>
            <Link to="/aiops" style={{ color: 'var(--ds-chip-info-text)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', fontFamily: font }}>
              AIOps Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── AIOps Operations Panel ────────────────────────────────────────────────────

function AIOpsOperationsPanel() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/proxy/aiops/api/analysis/latest')
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))
      .catch(() => {});
  }, []);

  const findings = data?.worker_findings ?? {};
  const opAgents = ['capacity_sre', 'incident_prevention_remediation', 'deployment_health_doctor'];
  const actions = (data?.recommended_actions ?? []).slice(0, 3);

  return (
    <Card title="AIOps — Operations Agent Findings" subtitle="Capacity SRE · Incident Prevention · Deployment Health Doctor" padding={3}>
      {!data ? (
        <UnavailableBanner service="AIOps Engine" command="kubectl port-forward -n aiops svc/aiops-engine 8000:8000" />
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '16px' }}>
            {opAgents.map(key => {
              const f = findings[key];
              if (!f) return null;
              const agentColor = f.severity === 'critical' ? 'var(--ds-error)' : f.severity === 'high' ? 'var(--ds-warn)' : f.severity === 'medium' ? 'var(--ds-warn)' : 'var(--ds-success)';
              return (
                <div key={key} style={{ padding: '12px', border: `1px solid ${agentColor}30`, borderLeft: `3px solid ${agentColor}`, borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: font }}>{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    <StatusChip status={f.severity} />
                  </div>
                  {f.findings.slice(0, 2).map((fi: string, i: number) => (
                    <p key={i} style={{ margin: '0 0 2px', fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font }}>• {fi.substring(0, 70)}</p>
                  ))}
                  {f.recommendations.slice(0, 1).map((r: any, i: number) => (
                    <p key={i} style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--ds-chip-info-text)', fontFamily: font }}>→ {r.action.substring(0, 60)}</p>
                  ))}
                </div>
              );
            })}
          </div>
          {actions.length > 0 && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: font }}>Top Recommended Actions</p>
              {actions.map((ra: any, i: number) => (
                <p key={i} style={{ margin: '0 0 4px', fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font }}>
                  <span style={{ fontWeight: 700, color: 'var(--ds-error)', marginRight: '6px' }}>[P{ra.priority}]</span>
                  {ra.action} — <span style={{ color: 'var(--ds-text-tertiary)' }}>{ra.owner}</span>
                  {ra.script && <code style={{ fontFamily: mono, color: 'var(--ds-chip-info-text)', marginLeft: '8px', fontSize: '11px' }}>{ra.script}</code>}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export const OperationsDashboardPage = () => {
  const activeIncidents = incidents.filter(i => i.status !== 'Resolved').length;
  const healthyServices = services.filter(s => s.status === 'Healthy').length;

  return (
    <AppleShell title="Operations Dashboard">
      <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* WhatShouldIDoNow */}
        <WhatShouldIDoNow
          accentColor="var(--ds-warn)"
          topAction={{
            title: 'Investigate active incident: CrashLoopBackOff in employee-portal',
            why: 'AIOps detected a backend container in CrashLoopBackOff. Root cause: Cilium network policy blocking TCP 5432. Rollback the restrictive policy to restore service.',
            ctaLabel: 'Open AIOps Chat',
            route: '/aiops-chat',
            color: 'var(--ds-warn)',
            dataMode: 'simulated',
          }}
          nextActions={[
            {
              title: 'Review capacity risk: backend at 89% memory limit',
              reason: 'OOMKill risk within 2–3 hours. Apply memory limit increase via GitOps patch.',
              priority: 'high',
              etaHint: '15 min',
              route: '/aiops',
              dataMode: 'simulated',
            },
            {
              title: 'Check OpenCost for cost anomalies in the last 24h',
              reason: 'FinOps Agent detected a potential cost spike. Review namespace spend attribution.',
              priority: 'medium',
              etaHint: '10 min',
              route: '/cost',
              dataMode: 'rule-based',
            },
            {
              title: 'Review Hubble network flow for denied connections',
              reason: 'Cilium denied flows indicate security policy misconfigurations affecting app connectivity.',
              priority: 'medium',
              etaHint: '5 min',
              route: '/operations',
              dataMode: 'simulated',
            },
          ]}
          infoItems={[
            { label: 'Active incidents',      value: '1 critical',     dataMode: 'simulated' },
            { label: 'Cluster health',        value: 'Degraded',       dataMode: 'simulated' },
            { label: 'Argo CD sync',          value: 'All synced',     dataMode: 'simulated' },
            { label: 'Cost (namespace)',       value: '$2.40/day',      dataMode: 'rule-based' },
            { label: 'Network denials (1h)',   value: '3 flows denied', dataMode: 'simulated' },
          ]}
        />

        <CrossPersonaContextCards cards={OPERATIONS_CONTEXT_CARDS} />

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', flexShrink: 0 }}>
          <MetricCard label="Active Incidents"  value={activeIncidents}                       sub="Needs investigation"  />
          <MetricCard label="Services Healthy"  value={`${healthyServices}/${services.length}`} sub="Monitored services"  />
          <MetricCard label="AIOps Signals"     value="3"                                     sub="Last 30 minutes"      />
          <MetricCard label="Platform Cost"     value="$0.12/hr"                              sub="OpenCost estimate"    />
        </div>

        {/* Main 2-col grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Active Incidents */}
            <Card title="Active Incidents" subtitle="AIOps-detected anomalies and platform events" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['ID', 'Severity', 'Title', 'Namespace', 'Time', 'Status'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(inc => {
                    const sc = sevConfig[inc.severity] || sevConfig.info;
                    return (
                      <tr key={inc.id} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                        <td style={{ padding: '9px 10px', fontFamily: mono, fontWeight: 700, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{inc.id}</td>
                        <td style={{ padding: '9px 10px' }}>
                          <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: sc.bg, color: sc.color, fontFamily: font }}>{inc.severity.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '9px 10px', fontSize: '13px', fontWeight: 500, color: 'var(--ds-text-primary)' }}>{inc.title}</td>
                        <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{inc.namespace}</td>
                        <td style={{ padding: '9px 10px', fontSize: '12px', color: 'var(--ds-text-tertiary)' }}>{inc.time}</td>
                        <td style={{ padding: '9px 10px' }}><StatusChip status={inc.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            {/* Service Health Overview */}
            <Card title="Service Health Overview" subtitle="Runtime status with uptime, latency, and resource utilization" style={{ overflow: 'auto', flex: 1 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Service', 'NS', 'Status', 'Uptime', 'Latency', 'CPU', 'Mem'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {services.map(svc => {
                    const lat = parseInt(svc.latency);
                    return (
                      <tr key={svc.name} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                        <td style={{ padding: '9px 10px', fontWeight: 600, fontSize: '13px', color: 'var(--ds-text-primary)' }}>{svc.name}</td>
                        <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '11px', color: 'var(--ds-text-secondary)' }}>{svc.namespace}</td>
                        <td style={{ padding: '9px 10px' }}><StatusChip status={svc.status} /></td>
                        <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{svc.uptime}</td>
                        <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '12px', color: lat > 100 ? 'var(--ds-error)' : 'var(--ds-success)', fontWeight: 600 }}>{svc.latency}</td>
                        <td style={{ padding: '9px 10px', minWidth: '80px' }}>
                          <ProgressBar value={svc.cpu > 100 ? 100 : svc.cpu} warn={svc.cpu > 75} />
                          <span style={{ fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: font }}>{svc.cpu}%</span>
                        </td>
                        <td style={{ padding: '9px 10px', minWidth: '80px' }}>
                          <ProgressBar value={svc.mem} warn={svc.mem > 80} />
                          <span style={{ fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: font }}>{svc.mem}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>

            {/* Recent K8s Events */}
            <Card title="Recent Kubernetes Events" subtitle="Last 30 minutes — cluster-wide event stream" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: font }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                    {['Type', 'Reason', 'Object', 'Message', 'Time'].map(h => (
                      <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600, color: 'var(--ds-text-tertiary)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.map((ev, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                      <td style={{ padding: '9px 10px' }}>
                        <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '980px', fontSize: '12px', fontWeight: 700, background: ev.type === 'Warning' ? 'var(--ds-chip-warn-bg)' : 'rgba(34,197,94,0.10)', color: ev.type === 'Warning' ? 'var(--ds-warn)' : 'var(--ds-success)', fontFamily: font }}>{ev.type}</span>
                      </td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontWeight: 600, fontSize: '12px', color: 'var(--ds-text-primary)' }}>{ev.reason}</td>
                      <td style={{ padding: '9px 10px', fontFamily: mono, fontSize: '11px', color: 'var(--ds-text-secondary)' }}>{ev.object}</td>
                      <td style={{ padding: '9px 10px', fontSize: '12px', color: 'var(--ds-text-secondary)' }}>{ev.message}</td>
                      <td style={{ padding: '9px 10px', fontSize: '12px', color: 'var(--ds-text-tertiary)', whiteSpace: 'nowrap' }}>{ev.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflow: 'hidden' }}>

            {/* Observability Tools */}
            <Card title="Observability Tools" subtitle="External dashboards and monitoring" style={{ overflow: 'auto', flexShrink: 0 }} padding={3}>
              {obsvTools.map(link => (
                <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', textDecoration: 'none' }}>
                  <ExternalLinkIcon size={13} strokeWidth={1.5} style={{ color: 'var(--ds-text-tertiary)', flexShrink: 0 }} />
                  <div>
                    <span style={{ color: 'var(--ds-chip-info-text)', fontSize: '13px', fontWeight: 600, fontFamily: font }}>{link.label}</span>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: font }}>{link.desc}</p>
                  </div>
                </a>
              ))}
              <div style={{ marginTop: '4px', padding: '12px', background: 'rgba(255,149,0,0.06)', borderRadius: '10px', border: '1px solid rgba(255,149,0,0.2)' }}>
                <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: 700, color: 'var(--ds-warn)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: font }}>Demo Storyline — Operations</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--ds-text-primary)', fontFamily: font, lineHeight: 1.7 }}>
                  <strong>Show:</strong> Point to the degraded backend service — AIOps detected high memory usage. Open <em>Grafana</em> to show the spike. Open <em>Hubble UI</em> to show network flows. Navigate to <strong>/aiops</strong> for AI-generated remediation recommendations.
                </p>
              </div>
            </Card>

            {/* AIOps Command Center */}
            <AIOpsCommandCenterCard />

            {/* AIOps Operations Panel */}
            <AIOpsOperationsPanel />

          </div>
        </div>

      </div>
    </AppleShell>
  );
};
