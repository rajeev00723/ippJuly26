import React from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { Network } from 'lucide-react';
import { StatusChip, MetricCard, DsCard, TH, TD, BackBreadcrumb } from './shared';

// ─── Design system helpers (matches existing page convention) ─────────────────
import { tokens as _fTokens } from '../../design-system/tokens';
const FONT = _fTokens.font.sans;
const MONO = "'SF Mono',ui-monospace,'JetBrains Mono',Menlo,monospace";

// ─── Static demo data ──────────────────────────────────────────────────────────

interface MemberCluster {
  name: string;
  region: string;
  status: string;
  syncMode: string;
  nodes: number;
  version: string;
  provider: string;
}

interface PropagationPolicy {
  name: string;
  namespace: string;
  targetClusters: string[];
  resourceSelectors: string;
  placement: string;
}

interface PropagatedWorkload {
  name: string;
  kind: string;
  namespace: string;
  clusters: { name: string; status: string }[];
}

interface ResourceBinding {
  name: string;
  namespace: string;
  resource: string;
  schedulerName: string;
  phase: string;
  clusters: string[];
}

const DEMO_CLUSTERS: MemberCluster[] = [
  {
    name: 'cluster-us-east-1',
    region: 'us-east-1',
    status: 'Ready',
    syncMode: 'Push',
    nodes: 5,
    version: 'v1.28.4',
    provider: 'AWS EKS',
  },
  {
    name: 'cluster-eu-west-1',
    region: 'eu-west-1',
    status: 'Ready',
    syncMode: 'Pull',
    nodes: 3,
    version: 'v1.28.4',
    provider: 'Azure AKS',
  },
  {
    name: 'cluster-ap-southeast-1',
    region: 'ap-southeast-1',
    status: 'NotReady',
    syncMode: 'Push',
    nodes: 3,
    version: 'v1.27.9',
    provider: 'GKE',
  },
];

const DEMO_POLICIES: PropagationPolicy[] = [
  {
    name: 'employee-portal-policy',
    namespace: 'employee-app',
    targetClusters: ['cluster-us-east-1', 'cluster-eu-west-1'],
    resourceSelectors: 'Deployment, Service',
    placement: 'TargetClusters',
  },
  {
    name: 'monitoring-propagation',
    namespace: 'monitoring',
    targetClusters: ['cluster-us-east-1', 'cluster-eu-west-1', 'cluster-ap-southeast-1'],
    resourceSelectors: 'ConfigMap, ServiceMonitor',
    placement: 'ClusterAffinity',
  },
  {
    name: 'frontend-blue-green',
    namespace: 'frontend',
    targetClusters: ['cluster-us-east-1'],
    resourceSelectors: 'Deployment',
    placement: 'SpreadByField',
  },
];

const DEMO_CLUSTER_POLICIES = [
  {
    name: 'global-security-baseline',
    targetClusters: 'All Clusters',
    resourceSelectors: 'NetworkPolicy, PodDisruptionBudget',
    placement: 'ClusterAffinity',
  },
  {
    name: 'namespace-propagation-policy',
    targetClusters: 'cluster-us-east-1, cluster-eu-west-1',
    resourceSelectors: 'Namespace, ResourceQuota',
    placement: 'TargetClusters',
  },
];

const DEMO_WORKLOADS: PropagatedWorkload[] = [
  {
    name: 'employee-portal-frontend',
    kind: 'Deployment',
    namespace: 'employee-app',
    clusters: [
      { name: 'cluster-us-east-1', status: 'Applied' },
      { name: 'cluster-eu-west-1', status: 'Applied' },
    ],
  },
  {
    name: 'employee-portal-backend',
    kind: 'Deployment',
    namespace: 'employee-app',
    clusters: [
      { name: 'cluster-us-east-1', status: 'Applied' },
      { name: 'cluster-eu-west-1', status: 'Pending' },
    ],
  },
  {
    name: 'postgresql',
    kind: 'StatefulSet',
    namespace: 'employee-app',
    clusters: [{ name: 'cluster-us-east-1', status: 'Applied' }],
  },
  {
    name: 'employee-portal-svc',
    kind: 'Service',
    namespace: 'employee-app',
    clusters: [
      { name: 'cluster-us-east-1', status: 'Applied' },
      { name: 'cluster-eu-west-1', status: 'Applied' },
    ],
  },
];

const DEMO_BINDINGS: ResourceBinding[] = [
  {
    name: 'employee-portal-frontend-binding',
    namespace: 'employee-app',
    resource: 'Deployment/employee-portal-frontend',
    schedulerName: 'default-scheduler',
    phase: 'Scheduled',
    clusters: ['cluster-us-east-1', 'cluster-eu-west-1'],
  },
  {
    name: 'employee-portal-backend-binding',
    namespace: 'employee-app',
    resource: 'Deployment/employee-portal-backend',
    schedulerName: 'default-scheduler',
    phase: 'Scheduled',
    clusters: ['cluster-us-east-1', 'cluster-eu-west-1'],
  },
  {
    name: 'postgresql-binding',
    namespace: 'employee-app',
    resource: 'StatefulSet/postgresql',
    schedulerName: 'default-scheduler',
    phase: 'Scheduled',
    clusters: ['cluster-us-east-1'],
  },
];

// ─── Live data fetch helpers ──────────────────────────────────────────────────

type DataSource = 'live' | 'demo' | 'loading' | 'unreachable';

async function tryFetchClusters(): Promise<MemberCluster[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(
      '/api/proxy/karmada/api/apis/cluster.karmada.io/v1alpha1/clusters',
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!resp.ok) return null;
    const body = await resp.json();
    const items: any[] = body.items ?? [];
    return items.map(item => ({
      name: item.metadata?.name ?? 'unknown',
      region: item.metadata?.labels?.['topology.kubernetes.io/region'] ?? 'unknown',
      status: item.status?.conditions?.find((c: any) => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
      syncMode: item.spec?.syncMode ?? 'Push',
      nodes: item.status?.nodeSummary?.totalNum ?? 0,
      version: item.status?.kubernetesVersion ?? 'unknown',
      provider: item.metadata?.labels?.['cluster.karmada.io/provider'] ?? 'Kubernetes',
    }));
  } catch {
    return null;
  }
}

async function tryFetchPolicies(): Promise<PropagationPolicy[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(
      '/api/proxy/karmada/api/apis/policy.karmada.io/v1alpha1/propagationpolicies',
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!resp.ok) return null;
    const body = await resp.json();
    const items: any[] = body.items ?? [];
    return items.map(item => ({
      name: item.metadata?.name ?? 'unknown',
      namespace: item.metadata?.namespace ?? 'default',
      targetClusters:
        item.spec?.placement?.clusterAffinity?.clusterNames ??
        item.spec?.placement?.clusterNames ??
        [],
      resourceSelectors: (item.spec?.resourceSelectors ?? [])
        .map((s: any) => s.kind)
        .join(', ') || 'All',
      placement: item.spec?.placement?.clusterAffinity ? 'ClusterAffinity' : 'TargetClusters',
    }));
  } catch {
    return null;
  }
}

async function tryFetchBindings(): Promise<ResourceBinding[] | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(
      '/api/proxy/karmada/api/apis/work.karmada.io/v1alpha2/namespaces/employee-app/resourcebindings',
      { signal: controller.signal },
    );
    clearTimeout(timer);
    if (!resp.ok) return null;
    const body = await resp.json();
    const items: any[] = body.items ?? [];
    return items.map(item => ({
      name: item.metadata?.name ?? 'unknown',
      namespace: item.metadata?.namespace ?? 'default',
      resource: `${item.spec?.resource?.kind ?? 'Resource'}/${item.spec?.resource?.name ?? item.metadata?.name}`,
      schedulerName: item.spec?.schedulerName ?? 'default-scheduler',
      phase: item.status?.conditions?.find((c: any) => c.type === 'Scheduled')?.status === 'True' ? 'Scheduled' : 'Pending',
      clusters: (item.status?.aggregatedStatus ?? []).map((a: any) => a.clusterName ?? 'unknown'),
    }));
  } catch {
    return null;
  }
}

// ─── Collapsible binding row ──────────────────────────────────────────────────

const BindingRow: React.FC<{ binding: ResourceBinding }> = ({ binding }) => {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <tr
        style={{ cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <TD useMono>{binding.name}</TD>
        <TD>{binding.namespace}</TD>
        <TD useMono>{binding.resource}</TD>
        <TD><StatusChip status={binding.phase} /></TD>
        <TD>
          <span
            style={{
              fontSize: '11px',
              color: 'var(--ds-text-tertiary)',
              fontFamily: MONO,
              background: 'var(--ds-surface-alt)',
              borderRadius: '4px',
              padding: '2px 6px',
            }}
          >
            {open ? '▲ hide' : '▼ detail'}
          </span>
        </TD>
      </tr>
      {open && (
        <tr>
          <td
            colSpan={5}
            style={{
              padding: '12px 20px',
              background: 'var(--ds-surface)',
              borderBottom: '1px solid var(--ds-hairline)',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--ds-text-secondary)',
                  fontFamily: FONT,
                  marginRight: '4px',
                }}
              >
                Scheduled to:
              </span>
              {binding.clusters.length > 0 ? (
                binding.clusters.map(c => (
                  <span
                    key={c}
                    style={{
                      fontSize: '12px',
                      fontFamily: MONO,
                      background: 'var(--ds-chip-info-bg)',
                      color: 'var(--ds-chip-info-text)',
                      border: '1px solid var(--ds-chip-info-border)',
                      borderRadius: '4px',
                      padding: '2px 8px',
                    }}
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>
                  No clusters scheduled yet
                </span>
              )}
            </div>
            <p
              style={{
                margin: '8px 0 0',
                fontSize: '12px',
                color: 'var(--ds-text-tertiary)',
                fontFamily: FONT,
              }}
            >
              Scheduler: <code style={{ fontFamily: MONO, fontSize: '11px' }}>{binding.schedulerName}</code>
            </p>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Main page component ──────────────────────────────────────────────────────

export const KarmadaDashboardPage = () => {
  const [clusters, setClusters] = React.useState<MemberCluster[]>(DEMO_CLUSTERS);
  const [policies, setPolicies] = React.useState<PropagationPolicy[]>(DEMO_POLICIES);
  const [bindings, setBindings] = React.useState<ResourceBinding[]>(DEMO_BINDINGS);
  const [dataSource, setDataSource] = React.useState<DataSource>('loading');
  const [lastRefreshed, setLastRefreshed] = React.useState<string>('—');

  const refresh = React.useCallback(async () => {
    setDataSource('loading');
    const [liveClusters, livePolicies, liveBindings] = await Promise.all([
      tryFetchClusters(),
      tryFetchPolicies(),
      tryFetchBindings(),
    ]);

    const hasLive = liveClusters !== null;
    if (liveClusters) setClusters(liveClusters);
    if (livePolicies) setPolicies(livePolicies);
    if (liveBindings) setBindings(liveBindings);

    setDataSource(hasLive ? 'live' : 'unreachable');
    setLastRefreshed(new Date().toLocaleTimeString());
  }, []);

  // Initial load + 15s auto-refresh
  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!mounted) return;
      await refresh();
    };
    run();
    const interval = setInterval(() => { if (mounted) run(); }, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [refresh]);

  const readyClusters = clusters.filter(c => c.status === 'Ready').length;
  const totalNodes = clusters.reduce((acc, c) => acc + c.nodes, 0);

  return (
    <AppleShell title="Karmada Multi-Cluster">
      <div style={{ fontFamily: FONT, background: 'var(--ds-bg)', minHeight: '100%', overflow: 'hidden' }}>

        <BackBreadcrumb label="Platform Engineering" to="/platform" />
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
            Multi-cluster fleet management · propagation policies · workload scheduling — ACME Corp
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Data source badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '980px',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: FONT,
                background:
                  dataSource === 'live'
                    ? 'rgba(34,197,94,0.10)'
                    : dataSource === 'unreachable'
                    ? 'var(--ds-warn)' + '18'
                    : '#86868b18',
                color:
                  dataSource === 'live'
                    ? 'var(--ds-success)'
                    : dataSource === 'unreachable'
                    ? 'var(--ds-warn)'
                    : 'var(--ds-text-tertiary)',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background:
                    dataSource === 'live'
                      ? 'var(--ds-success)'
                      : dataSource === 'unreachable'
                      ? 'var(--ds-warn)'
                      : 'var(--ds-text-tertiary)',
                  display: 'inline-block',
                }}
              />
              {dataSource === 'live'
                ? 'Live'
                : dataSource === 'unreachable'
                ? 'Demo (Karmada unreachable)'
                : 'Loading…'}
            </span>

            {lastRefreshed !== '—' && (
              <span style={{ fontSize: '12px', color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>
                Refreshed {lastRefreshed}
              </span>
            )}

            {/* Manual refresh button */}
            <button
              onClick={refresh}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                border: '1px solid var(--ds-hairline)',
                borderRadius: '8px',
                background: 'var(--ds-surface)',
                fontSize: '13px',
                fontWeight: 500,
                fontFamily: FONT,
                color: 'var(--ds-text-primary)',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <Network size={14} strokeWidth={1.5} />
              Refresh
            </button>
          </div>
        </div>

        {/* Karmada unreachable banner */}
        {dataSource === 'unreachable' && (
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 16px',
              background: 'var(--ds-chip-warn-bg)',
              border: '1px solid var(--ds-chip-warn-border)',
              borderRadius: '12px',
              fontSize: '13px',
              color: 'var(--ds-chip-warn-text)',
              fontFamily: FONT,
              lineHeight: 1.6,
            }}
          >
            <strong>Karmada API server unreachable</strong> — showing demo data.
            To connect, set <code style={{ fontFamily: MONO, fontSize: '11px' }}>KARMADA_ENABLED=true</code>,{' '}
            <code style={{ fontFamily: MONO, fontSize: '11px' }}>KARMADA_API_URL</code>, and
            restart Backstage. See README for details.
          </div>
        )}

        {/* KPI row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4,1fr)',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <MetricCard label="Member Clusters" value={clusters.length} sub={`${readyClusters} Ready`} />
          <MetricCard label="Total Nodes" value={totalNodes} sub="Across all clusters" />
          <MetricCard label="Propagation Policies" value={policies.length + DEMO_CLUSTER_POLICIES.length} sub="Namespace + Cluster-wide" />
          <MetricCard label="Resource Bindings" value={bindings.length} sub="Workloads scheduled" />
        </div>

        {/* ── Section 1: Cluster Overview ───────────────────────────────────── */}
        <DsCard
          title="Cluster Overview"
          subtitle="Karmada member clusters — health, sync mode, capacity"
          style={{ marginBottom: '16px' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Cluster', 'Provider', 'Region', 'Status', 'Sync Mode', 'Nodes', 'K8s Version'].map(h => (
                  <TH key={h}>{h}</TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {clusters.map(c => (
                <tr key={c.name}>
                  <TD useMono>{c.name}</TD>
                  <TD>
                    <span
                      style={{
                        fontSize: '12px',
                        fontFamily: MONO,
                        background: 'var(--ds-chip-info-bg)',
                        color: 'var(--ds-chip-info-text)',
                        border: '1px solid var(--ds-chip-info-border)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                      }}
                    >
                      {c.provider}
                    </span>
                  </TD>
                  <TD useMono>{c.region}</TD>
                  <TD>
                    <StatusChip status={c.status} />
                  </TD>
                  <TD>
                    <span
                      style={{
                        fontSize: '12px',
                        fontFamily: MONO,
                        background: c.syncMode === 'Push' ? 'var(--ds-chip-success-bg)' : 'var(--ds-chip-info-bg)',
                        color: c.syncMode === 'Push' ? 'var(--ds-chip-success-text)' : 'var(--ds-chip-info-text)',
                        border: `1px solid ${c.syncMode === 'Push' ? 'var(--ds-chip-success-border)' : 'var(--ds-chip-info-border)'}`,
                        borderRadius: '4px',
                        padding: '2px 6px',
                      }}
                    >
                      {c.syncMode}
                    </span>
                  </TD>
                  <TD>
                    <span style={{ fontFamily: MONO, fontWeight: 600 }}>{c.nodes}</span>
                  </TD>
                  <TD useMono>{c.version}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        </DsCard>

        {/* ── Section 2: Propagation Policies ──────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '16px',
          }}
        >
          <DsCard
            title="Propagation Policies"
            subtitle="Namespace-scoped propagation rules"
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Namespace', 'Target Clusters', 'Resources'].map(h => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map(p => (
                  <tr key={`${p.namespace}/${p.name}`}>
                    <TD useMono>{p.name}</TD>
                    <TD>
                      <span
                        style={{
                          fontSize: '12px',
                          fontFamily: MONO,
                          background: 'var(--ds-chip-info-bg)',
                          color: 'var(--ds-chip-info-text)',
                          border: '1px solid var(--ds-chip-info-border)',
                          borderRadius: '4px',
                          padding: '2px 6px',
                        }}
                      >
                        {p.namespace}
                      </span>
                    </TD>
                    <TD>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {p.targetClusters.length > 0 ? (
                          p.targetClusters.map(tc => (
                            <span
                              key={tc}
                              style={{
                                fontSize: '11px',
                                fontFamily: MONO,
                                background: 'var(--ds-chip-info-bg)',
                                color: 'var(--ds-chip-info-text)',
                                border: '1px solid var(--ds-chip-info-border)',
                                borderRadius: '4px',
                                padding: '1px 5px',
                              }}
                            >
                              {tc.replace('cluster-', '')}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--ds-text-tertiary)' }}>All</span>
                        )}
                      </div>
                    </TD>
                    <TD>
                      <span style={{ fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: MONO }}>
                        {p.resourceSelectors}
                      </span>
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </DsCard>

          <DsCard
            title="Cluster Propagation Policies"
            subtitle="Cluster-scoped propagation rules (global)"
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Target', 'Resources', 'Placement'].map(h => (
                    <TH key={h}>{h}</TH>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DEMO_CLUSTER_POLICIES.map(p => (
                  <tr key={p.name}>
                    <TD useMono>{p.name}</TD>
                    <TD>
                      <span style={{ fontSize: '12px', color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
                        {p.targetClusters}
                      </span>
                    </TD>
                    <TD useMono>{p.resourceSelectors}</TD>
                    <TD>
                      <StatusChip status={p.placement} />
                    </TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </DsCard>
        </div>

        {/* ── Section 3: Propagated Workloads ──────────────────────────────── */}
        <DsCard
          title="Propagated Workloads"
          subtitle="Deployments and StatefulSets propagated to member clusters with per-cluster sync status"
          style={{ marginBottom: '16px' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Workload', 'Kind', 'Namespace', 'cluster-us-east-1', 'cluster-eu-west-1', 'cluster-ap-southeast-1'].map(h => (
                  <TH key={h}>{h}</TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEMO_WORKLOADS.map(w => {
                const statusFor = (clusterName: string) => {
                  const match = w.clusters.find(c => c.name === clusterName);
                  return match ? match.status : 'Not Scheduled';
                };
                return (
                  <tr key={`${w.namespace}/${w.name}`}>
                    <TD useMono>{w.name}</TD>
                    <TD>
                      <span
                        style={{
                          fontFamily: MONO,
                          fontWeight: 700,
                          fontSize: '12px',
                          background: 'var(--ds-chip-info-bg)',
                          color: 'var(--ds-chip-info-text)',
                          border: '1px solid var(--ds-chip-info-border)',
                          borderRadius: '4px',
                          padding: '1px 6px',
                        }}
                      >
                        {w.kind}
                      </span>
                    </TD>
                    <TD useMono>{w.namespace}</TD>
                    <TD><StatusChip status={statusFor('cluster-us-east-1')} /></TD>
                    <TD><StatusChip status={statusFor('cluster-eu-west-1')} /></TD>
                    <TD><StatusChip status={statusFor('cluster-ap-southeast-1')} /></TD>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DsCard>

        {/* ── Section 4: Resource Bindings ──────────────────────────────────── */}
        <DsCard
          title="Resource Bindings"
          subtitle="Scheduler output — click a row to expand cluster assignment details"
          style={{ marginBottom: '16px' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Binding Name', 'Namespace', 'Resource', 'Phase', ''].map(h => (
                  <TH key={h}>{h}</TH>
                ))}
              </tr>
            </thead>
            <tbody>
              {bindings.map(b => (
                <BindingRow key={`${b.namespace}/${b.name}`} binding={b} />
              ))}
            </tbody>
          </table>
        </DsCard>

        {/* ── Section 5: Sample PropagationPolicy YAML ─────────────────────── */}
        <DsCard
          title="Sample PropagationPolicy Template"
          subtitle="Apply this to register a new workload with Karmada — targets both Ready clusters"
        >
          <pre
            style={{
              margin: 0,
              fontFamily: MONO,
              fontSize: '12px',
              color: 'var(--ds-text-primary)',
              background: 'var(--ds-surface-alt)',
              borderRadius: '10px',
              padding: '16px',
              overflowX: 'auto',
              lineHeight: 1.65,
            }}
          >
{`apiVersion: policy.karmada.io/v1alpha1
kind: PropagationPolicy
metadata:
  name: my-app-policy
  namespace: my-namespace
spec:
  resourceSelectors:
    - apiVersion: apps/v1
      kind: Deployment
      name: my-app
  placement:
    clusterAffinity:
      clusterNames:
        - cluster-us-east-1
        - cluster-eu-west-1
    replicaScheduling:
      replicaSchedulingType: Divided
      replicaDivisionPreference: Weighted
      weightPreference:
        staticClusterWeight:
          - targetCluster:
              clusterNames: [cluster-us-east-1]
            weight: 2
          - targetCluster:
              clusterNames: [cluster-eu-west-1]
            weight: 1`}
          </pre>
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>
            Apply with:{' '}
            <code style={{ fontFamily: MONO, fontSize: '11px', background: 'var(--ds-surface-alt)', padding: '2px 6px', borderRadius: '4px' }}>
              kubectl --kubeconfig $KARMADA_KUBECONFIG apply -f policy.yaml
            </code>
          </p>
        </DsCard>

      </div>
    </AppleShell>
  );
};
