// Real client for kubevirt-vm / local-cluster / aks targets: builds the actual
// Crossplane claim manifest and submits it to the live IIP service via the
// Backstage '/iip' proxy (POST /api/proxy/iip/api/provision). If IIP is
// unreachable (offline demo, no cluster access) this transparently falls back
// to a labeled, client-side simulation — the flow itself never breaks.
// Knative has no matching claim kind yet, so it always uses the simulation.
import type { InfraOnboardingApi } from './InfraOnboardingApi';
import type {
  InfraRequest,
  ProvisioningResult,
  ProvisioningStep,
  InfraResource,
  CostBreakdown,
  ProvisionTarget,
  TShirtSize,
  TargetAvailability,
  Environment,
  CloudType,
} from '../types';
import { SEED_RESOURCES, PRICING } from './mockData';

// [DEMO] In-memory tracking for the simulated fallback path only, keyed by claimName.
const STORE: {
  resources: InfraResource[];
  simulatedResults: Map<string, ProvisioningResult>;
} = {
  resources: [...SEED_RESOURCES],
  simulatedResults: new Map(),
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// Set from app-config's `infraOnboarding.demoMode` (see OnboardingWizard) — when true,
// skips the real IIP call entirely and always uses the labeled simulation. The
// per-request fetch-failure fallback below covers the "IIP unreachable" case even
// when this flag is left at its default (false).
export let DEMO_MODE = false;
export function setDemoMode(value: boolean): void {
  DEMO_MODE = value;
}

// ── Real claim construction ──────────────────────────────────────────────────

// local-cluster has two compositions: the real vcluster-backed one (default)
// and the original namespace-only simulation, kept selectable only when
// DEMO_MODE is on (offline demo, or the vcluster chart install would be too
// slow/unreliable to show live).
function compositionSelectorFor(target: ProvisionTarget): string {
  if (target === 'kubevirt-vm') return 'vm-three-tier-app';
  if (target === 'aks') return 'aks-cluster';
  return DEMO_MODE ? 'kind-cluster' : 'vcluster-cluster';
}

const CLAIM_KIND: Record<ProvisionTarget, string> = {
  'kubevirt-vm': 'VMAppClaim',
  'local-cluster': 'KindClusterClaim',
  'aks': 'AKSClusterClaim',
};

export const CLOUD_TYPE_BY_TARGET: Record<ProvisionTarget, CloudType> = {
  'kubevirt-vm': 'private',
  'local-cluster': 'private',
  'aks': 'public',
};

const VM_SIZE: Record<TShirtSize, { cpuCores: number; memoryMi: number; diskGi: number }> = {
  S: { cpuCores: 1, memoryMi: 1024, diskGi: 20 },
  M: { cpuCores: 2, memoryMi: 2048, diskGi: 40 },
  L: { cpuCores: 4, memoryMi: 4096, diskGi: 80 },
};

const CLUSTER_NODE_COUNT: Record<TShirtSize, number> = { S: 1, M: 2, L: 3 };

const AKS_VM_SIZE: Record<TShirtSize, string> = {
  S: 'Standard_B2s',
  M: 'Standard_D2s_v7',
  L: 'Standard_D4s_v7',
};

function envSlug(env: Environment): 'dev' | 'staging' | 'prod' {
  return env === 'development' ? 'dev' : env === 'staging' ? 'staging' : 'prod';
}

function buildClaimManifest(request: InfraRequest): Record<string, unknown> {
  const target = request.target as ProvisionTarget;
  const { appName, team, environment } = request.details;
  const env = envSlug(environment);
  const owner = { team, environment: env, costCenter: 'demo-001' };

  const base = {
    apiVersion: 'platform.iip.com/v1alpha1',
    kind: CLAIM_KIND[target],
    metadata: { name: appName, namespace: 'crossplane-system' },
    spec: {
      compositionSelector: { matchLabels: { 'platform.iip.com/composition': compositionSelectorFor(target) } },
    } as Record<string, unknown>,
  };

  if (target === 'kubevirt-vm') {
    const size = VM_SIZE[request.size ?? 'M'];
    base.spec.writeConnectionSecretToRef = { name: `${appName}-connection` };
    base.spec.parameters = {
      vmName: appName,
      namespace: `${appName}-${env}`,
      cpuCores: size.cpuCores,
      memoryMi: size.memoryMi,
      diskGi: size.diskGi,
      ingressHost: `${appName}.ipp.local`,
      owner,
    };
  } else if (target === 'local-cluster') {
    base.spec.parameters = {
      clusterName: appName,
      nodeCount: CLUSTER_NODE_COUNT[request.size ?? 'M'],
      environment: env,
      ownerTeam: team,
      costCenter: 'demo-001',
    };
  } else if (target === 'aks') {
    base.spec.parameters = {
      clusterName: appName,
      location: request.azureRegion ?? 'eastus',
      nodeCount: CLUSTER_NODE_COUNT[request.size ?? 'M'],
      nodeVmSize: AKS_VM_SIZE[request.size ?? 'M'],
      environment: env,
      ownerTeam: team,
      costCenter: 'demo-001',
    };
  }

  return base;
}

const REAL_STEP_LABELS: { id: string; label: string }[] = [
  { id: 'commit', label: 'Claim committed to Gitea' },
  { id: 'sync', label: 'Argo CD sync' },
  { id: 'health', label: 'Resource health' },
  { id: 'ready', label: 'Ready' },
];

function realSteps(statuses: StepStatus[]): ProvisioningStep[] {
  return REAL_STEP_LABELS.map((s, i) => ({ ...s, status: statuses[i] }));
}

type StepStatus = 'pending' | 'in_progress' | 'done' | 'error';

// ── Simulated fallback (used for Knative always, or when IIP is unreachable) ──

function simulateProvision(request: InfraRequest): { claimName: string; status: string; simulated: boolean } {
  const claimName = `sim-${request.details.appName || 'app'}-${randomId()}`;
  const steps: ProvisioningStep[] = [
    { id: 's1', label: 'Request validated', status: 'pending' },
    { id: 's2', label: 'Infra template generated', status: 'pending' },
    { id: 's3', label: 'Resource allocation started', status: 'pending' },
    { id: 's4', label: 'Network configuration applied', status: 'pending' },
    { id: 's5', label: 'Health checks passing', status: 'pending' },
    { id: 's6', label: 'Provisioning complete', status: 'pending' },
  ];

  const simulateError = typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('simulateError') === 'true';

  const run = async () => {
    for (let i = 0; i < steps.length; i++) {
      const result = STORE.simulatedResults.get(claimName);
      if (!result) return;
      result.steps[i].status = 'in_progress';
      result.status = 'in_progress';
      STORE.simulatedResults.set(claimName, { ...result, steps: [...result.steps] });
      await delay(800 + Math.random() * 600);

      if (simulateError && i === 2) {
        result.steps[i].status = 'error';
        result.status = 'failed';
        result.errorMessage = 'Simulated resource allocation error (add ?simulateError=true to trigger).';
        STORE.simulatedResults.set(claimName, { ...result, steps: [...result.steps] });
        return;
      }
      result.steps[i].status = 'done';
      STORE.simulatedResults.set(claimName, { ...result, steps: [...result.steps] });
    }

    const final = STORE.simulatedResults.get(claimName);
    if (!final) return;
    const target = request.target;
    const forecast = target
      ? calcClaimCost(target, request.size ?? 'M')
      : PRICING.knative.baseMonthly;
    const actual = Math.round(forecast * (0.95 + Math.random() * 0.10) * 100) / 100;

    final.status = 'complete';
    final.forecastCost = forecast;
    final.actualCost = actual;
    final.result = target
      ? {
          claimName,
          target,
          size: request.size,
          azureRegion: request.azureRegion,
          cloudType: CLOUD_TYPE_BY_TARGET[target],
        }
      : { claimName };
    STORE.simulatedResults.set(claimName, { ...final });
  };

  STORE.simulatedResults.set(claimName, { claimName, status: 'pending', steps, simulated: true });
  run();
  return { claimName, status: 'accepted', simulated: true };
}

function calcClaimCost(target: ProvisionTarget, size: TShirtSize): number {
  if (target === 'aks') {
    const s = PRICING.aks.size[size];
    return Math.round((s.hourly * 730 + PRICING.aks.networkingPerNode) * 100) / 100;
  }
  const s = PRICING.private.size[size];
  return Math.round((s.hourly * 730 + PRICING.private.networkingPerNode) * 100) / 100;
}

// ── Real Argo-backed status mapping ──────────────────────────────────────────

interface ArgoStatusResponse {
  app?: string;
  health?: string;
  sync?: string;
  status?: string;
  reason?: string;
}

function mapArgoStatusToResult(claimName: string, data: ArgoStatusResponse): ProvisioningResult {
  const synced = data.sync === 'Synced';
  const healthy = data.health === 'Healthy';
  const degraded = data.health === 'Degraded';

  let statuses: StepStatus[];
  let status: ProvisioningResult['status'] = 'in_progress';
  let errorMessage: string | undefined;

  if (degraded) {
    statuses = ['done', synced ? 'done' : 'in_progress', 'error', 'pending'];
    status = 'failed';
    errorMessage = `Argo CD reports the resource is Degraded (sync: ${data.sync ?? 'unknown'}).`;
  } else if (synced && healthy) {
    statuses = ['done', 'done', 'done', 'done'];
    status = 'complete';
  } else if (synced) {
    statuses = ['done', 'done', 'in_progress', 'pending'];
  } else if (data.app) {
    statuses = ['done', 'in_progress', 'pending', 'pending'];
  } else {
    // Not found yet — the ApplicationSet generator refreshes every ~20s.
    statuses = ['done', 'pending', 'pending', 'pending'];
  }

  return {
    claimName,
    status,
    steps: realSteps(statuses),
    simulated: false,
    errorMessage,
    result: status === 'complete'
      ? { claimName, argoCDApp: data.app, argoCDUrl: data.app ? `http://argocd.ipp.local/applications/${data.app}` : undefined }
      : undefined,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export const infraOnboardingClient: InfraOnboardingApi = {
  async provision(request: InfraRequest) {
    if (request.infraType === 'knative' || !request.target || DEMO_MODE) {
      await delay(200);
      return simulateProvision(request);
    }

    const manifest = buildClaimManifest(request);
    const requestedBy = request.details.requestedBy || 'guest@ipp.local';
    const businessUnit = (request.details.team || 'bu-demo').toLowerCase().replace(/\s+/g, '-');

    try {
      const res = await fetch('/api/proxy/iip/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manifest,
          requestedBy,
          costCenter: 'demo-001',
          requestId: `REQ-${Date.now()}`,
          businessUnit,
          environment: envSlug(request.details.environment),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.detail === 'string' ? data.detail : `IIP rejected the claim (HTTP ${res.status})`);
      }
      return { claimName: data.claimName as string, status: 'accepted', simulated: false };
    } catch {
      // Offline-safe fallback — IIP unreachable. Never breaks the wizard flow.
      return simulateProvision(request);
    }
  },

  async getProvisioningStatus(claimName: string): Promise<ProvisioningResult> {
    const simEntry = STORE.simulatedResults.get(claimName);
    if (simEntry) {
      await delay(50);
      return { ...simEntry, steps: simEntry.steps.map(s => ({ ...s })) };
    }
    try {
      const res = await fetch(`/api/proxy/iip/api/status/${encodeURIComponent(claimName)}`);
      const data: ArgoStatusResponse = await res.json();
      return mapArgoStatusToResult(claimName, data);
    } catch {
      return {
        claimName,
        status: 'failed',
        steps: realSteps(['done', 'error', 'pending', 'pending']),
        simulated: false,
        errorMessage: 'Could not reach the IIP status endpoint.',
      };
    }
  },

  async getTargetAvailability(): Promise<Record<ProvisionTarget, TargetAvailability>> {
    const fallback: Record<ProvisionTarget, TargetAvailability> = {
      'kubevirt-vm': { available: true, reason: 'Assumed available (IIP unreachable)' },
      'local-cluster': { available: true, reason: 'Assumed available (IIP unreachable)' },
      'aks': { available: true, reason: 'Assumed available (IIP unreachable — preflight skipped)' },
    };
    try {
      const res = await fetch('/api/proxy/iip/api/targets');
      if (!res.ok) return fallback;
      return await res.json();
    } catch {
      return fallback;
    }
  },

  async getResources(): Promise<InfraResource[]> {
    await delay(150);
    return [...STORE.resources];
  },

  async scaleResource(id, params) {
    await delay(100);
    const resource = STORE.resources.find(r => r.id === id);
    if (!resource) throw new Error(`Unknown resource: ${id}`);
    // [DEMO] Simulate scale update; real operation would trigger a new claim patch via IIP.
    if (params.nodeCount !== undefined) resource.nodeCount = params.nodeCount;
    return { operationId: `op-${randomId()}` };
  },

  async getCostForecast(infraType: string, config: Record<string, unknown>): Promise<CostBreakdown> {
    await delay(80);
    const target = config.target as ProvisionTarget | undefined;
    const size = (config.size as TShirtSize) ?? 'M';
    if (infraType === 'knative') {
      const base = PRICING.knative.baseMonthly;
      return { compute: base * 0.6, storage: 0, networking: base * 0.4, total: base };
    }
    const rates = target === 'aks' ? PRICING.aks : PRICING.private;
    const compute = rates.size[size].hourly * 730;
    const networking = rates.networkingPerNode;
    const total = Math.round((compute + networking) * 100) / 100;
    return { compute: Math.round(compute * 100) / 100, storage: 0, networking, total };
  },

  async getActualCost(resourceId: string) {
    await delay(100);
    const resource = STORE.resources.find(r => r.id === resourceId);
    if (!resource) throw new Error(`Unknown resource: ${resourceId}`);
    const rates = resource.provisionTarget === 'aks' ? PRICING.aks : PRICING.private;
    const size = resource.size ?? 'M';
    const breakdown: CostBreakdown = {
      compute: Math.round(rates.size[size].hourly * 730 * 100) / 100,
      storage: 0,
      networking: rates.networkingPerNode,
      total: Math.round((rates.size[size].hourly * 730 + rates.networkingPerNode) * 100) / 100,
    };
    return {
      monthToDate: resource.monthlyCost,
      forecastedMonthly: resource.forecastCost,
      breakdown,
    };
  },
};
