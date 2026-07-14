import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { InfraResource, InfraType, Environment, AzureRegion, ResourceStatus } from '../../types';
import { infraOnboardingClient } from '../../api/InfraOnboardingClient';
import { DemoChip, CloudTypeBadge, Btn, FONT, MONO } from '../shared';

const STATUS_ICON: Record<ResourceStatus, string> = {
  running: '✅', stopped: '⏹', provisioning: '⏳', error: '❌',
};

const LiveChip: React.FC = () => (
  <span
    title="Live resource — read from the cluster"
    style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 980,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.04em',
      background: 'var(--ds-chip-success-bg)', color: 'var(--ds-chip-success-text)',
      fontFamily: FONT, cursor: 'default', userSelect: 'none',
    }}
  >
    LIVE
  </span>
);

// Live AKS claims from the cluster, via the existing authenticated k8s proxy.
// The composition patches the sample app's LoadBalancer IP into status.appUrl.
interface AksClaim {
  metadata: { name: string; namespace?: string; creationTimestamp?: string };
  spec?: { parameters?: {
    clusterName?: string; location?: string; nodeCount?: number;
    nodeVmSize?: string; environment?: string; ownerTeam?: string;
  }};
  status?: { appUrl?: string; conditions?: { type: string; status: string }[] };
}

const CLAIM_ENV: Record<string, Environment> = {
  dev: 'development', staging: 'staging', prod: 'production',
};

async function fetchLiveAksResources(): Promise<InfraResource[]> {
  try {
    const res = await fetch('/api/proxy/knative/k8s/apis/platform.iip.com/v1alpha1/aksclaims');
    if (!res.ok) return [];
    const body = await res.json();
    return ((body.items ?? []) as AksClaim[]).map(claim => {
      const p = claim.spec?.parameters ?? {};
      const ready = (claim.status?.conditions ?? [])
        .some(c => c.type === 'Ready' && c.status === 'True');
      return {
        id: `aks-${claim.metadata.namespace ?? 'default'}-${claim.metadata.name}`,
        name: p.clusterName ?? claim.metadata.name,
        infraType: 'kubernetes' as InfraType,
        provisionTarget: 'aks',
        environment: CLAIM_ENV[p.environment ?? ''] ?? 'development',
        azureRegion: (p.location ?? 'eastus') as AzureRegion,
        status: (ready ? 'running' : 'provisioning') as ResourceStatus,
        provisionedAt: claim.metadata.creationTimestamp ?? new Date().toISOString(),
        nodeCount: p.nodeCount,
        monthlyCost: 0,
        forecastCost: 0,
        namespace: claim.metadata.namespace,
        team: p.ownerTeam ?? 'platform',
        appName: 'ipp-sample-app',
        appUrl: claim.status?.appUrl,
        live: true,
        cloudType: 'public',
      };
    });
  } catch {
    return [];
  }
}

const ResourceCard: React.FC<{
  resource: InfraResource;
  onDay2: (id: string) => void;
}> = ({ resource, onDay2 }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = React.useState(false);

  const copyConfig = () => {
    const yaml = resource.infraType === 'kubernetes'
      ? `infra:\n  type: kubernetes\n  target: ${resource.provisionTarget ?? 'local-cluster'}\n  clusterName: ${resource.name}\n  apiEndpoint: ${resource.apiEndpoint ?? 'https://k8s.demo.internal:6443'}\n  namespace: ${resource.namespace ?? resource.appName}\n${resource.azureRegion ? `  region: ${resource.azureRegion}\n` : ''}  nodeCount: ${resource.nodeCount}\n  size: ${resource.size ?? 'M'}`
      : `infra:\n  type: vm\n  target: kubevirt-vm\n  vmName: ${resource.name}\n  size: ${resource.size ?? 'M'}`;
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      background: 'var(--ds-surface)',
      border: '1px solid var(--ds-hairline)',
      borderRadius: 16,
      padding: 20,
      boxShadow: 'var(--ds-shadow-resting)',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>
              {resource.name}
            </span>
            <span style={{
              padding: '2px 8px', borderRadius: 980, fontSize: 11, fontWeight: 600, fontFamily: FONT,
              background: resource.infraType === 'kubernetes' ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface-alt)',
              color: resource.infraType === 'kubernetes' ? 'var(--ds-chip-info-text)' : 'var(--ds-text-secondary)',
            }}>
              {resource.infraType === 'kubernetes' ? 'Kubernetes' : 'VM'}
            </span>
            {resource.cloudType && <CloudTypeBadge cloudType={resource.cloudType} />}
            {resource.live ? <LiveChip /> : <DemoChip />}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
            Environment: <strong style={{ textTransform: 'capitalize' }}>{resource.environment}</strong>
            {resource.azureRegion && (
              <>{' · '}Region: <span style={{ fontFamily: MONO }}>{resource.azureRegion}</span></>
            )}
          </div>
        </div>
        <span style={{ fontSize: 14, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>
          {STATUS_ICON[resource.status]} {resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}
        </span>
      </div>

      {/* Details row */}
      <div style={{ fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: FONT, marginBottom: 12 }}>
        Provisioned: {new Date(resource.provisionedAt).toLocaleDateString()}
        {resource.infraType === 'kubernetes' && resource.nodeCount && (
          <span> · Nodes: {resource.nodeCount} <strong>({resource.size ?? 'M'})</strong></span>
        )}
        {resource.infraType === 'vm' && (
          <span> · Size: <span style={{ fontFamily: MONO }}>{resource.size ?? 'M'}</span></span>
        )}
        {resource.appUrl && (
          <span>
            {' · '}App:{' '}
            <a
              href={resource.appUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: MONO, color: 'var(--ds-focus)', textDecoration: 'none' }}
            >
              {resource.appUrl}
            </a>
          </span>
        )}
        {resource.live && !resource.appUrl && resource.status === 'provisioning' && (
          <span> · App IP: <em>pending…</em></span>
        )}
      </div>

      {/* Cost row — live resources have no demo cost model yet */}
      {!resource.live && <div style={{
        padding: '8px 12px', background: 'var(--ds-surface-alt)', borderRadius: 8,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14,
      }}>
        <span style={{ fontSize: 13, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>
          💰 This month:
          <strong style={{ fontFamily: MONO, marginLeft: 6 }}>${resource.monthlyCost.toFixed(2)}</strong>
        </span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
          forecast: ${resource.forecastCost.toFixed(2)}
        </span>
      </div>}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        {resource.appUrl && (
          <Btn onClick={() => window.open(resource.appUrl, '_blank', 'noopener')} style={{ fontSize: 12, padding: '6px 14px' }}>
            Open App ↗
          </Btn>
        )}
        <Btn onClick={() => navigate(`/infra-onboarding/day2?resource=${resource.id}`)} variant="secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
          Day 2 Ops
        </Btn>
        <Btn onClick={copyConfig} variant="secondary" style={{ fontSize: 12, padding: '6px 14px' }}>
          {copied ? 'Copied!' : 'Copy Config'}
        </Btn>
      </div>
    </div>
  );
};

export const MyResourcesPage: React.FC = () => {
  const navigate = useNavigate();
  const [resources, setResources] = React.useState<InfraResource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterEnv, setFilterEnv] = React.useState<string>('all');
  const [filterType, setFilterType] = React.useState<string>('all');

  React.useEffect(() => {
    Promise.all([fetchLiveAksResources(), infraOnboardingClient.getResources()]).then(
      ([live, demo]) => {
        setResources([...live, ...demo]);
        setLoading(false);
      },
    );
  }, []);

  const filtered = resources.filter(r => {
    if (filterEnv !== 'all' && r.environment !== filterEnv) return false;
    if (filterType !== 'all' && r.infraType !== filterType) return false;
    return true;
  });

  const filterBtn = (value: string, current: string, set: (v: string) => void, label: string) => (
    <button
      key={value}
      onClick={() => set(value)}
      style={{
        padding: '5px 12px', border: `1px solid ${current === value ? 'var(--ds-focus)' : 'var(--ds-hairline)'}`,
        borderRadius: 980, fontSize: 12, fontFamily: FONT, fontWeight: current === value ? 700 : 400,
        background: current === value ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface)',
        color: current === value ? 'var(--ds-chip-info-text)' : 'var(--ds-text-secondary)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ fontFamily: FONT }}>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
        All infrastructure provisioned through Platform Engineering.
      </p>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {filterBtn('all', filterEnv, setFilterEnv, 'All Environments')}
        {filterBtn('development', filterEnv, setFilterEnv, 'Development')}
        {filterBtn('staging', filterEnv, setFilterEnv, 'Staging')}
        {filterBtn('production', filterEnv, setFilterEnv, 'Production')}
        <div style={{ width: 1, background: 'var(--ds-hairline)', margin: '0 4px' }} />
        {filterBtn('all', filterType, setFilterType, 'All Types')}
        {filterBtn('kubernetes', filterType, setFilterType, 'Kubernetes')}
        {filterBtn('vm', filterType, setFilterType, 'VM')}
      </div>

      {/* Loading skeletons */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 200, borderRadius: 16, background: 'var(--ds-surface-alt)', animation: 'io-shimmer 1.4s ease-in-out infinite' }} />
          ))}
          <style>{`@keyframes io-shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
        </div>
      )}

      {/* Resource grid */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
          {filtered.map(r => (
            <ResourceCard key={r.id} resource={r} onDay2={id => navigate(`/infra-onboarding/day2?resource=${id}`)} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 24px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏗</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>
            No resources yet
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
            {filterEnv !== 'all' || filterType !== 'all'
              ? 'No resources match your current filters.'
              : 'Provision your first infrastructure resource to get started.'}
          </p>
          <Btn onClick={() => navigate('/infra-onboarding/new')}>+ Onboard New App</Btn>
        </div>
      )}
    </div>
  );
};
