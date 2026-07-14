// All interfaces exported for enterprise extensibility.
// Each interface here maps to a swappable implementation layer.
// TODO[ENTERPRISE]: Add Zod schemas for runtime validation at API boundaries.

export type AppType = 'greenfield' | 'brownfield';
export type Environment = 'development' | 'staging' | 'production';
export type InfraType = 'kubernetes' | 'vm' | 'knative';
export type ExistingDeployment = 'none' | 'on-premise-vm' | 'other-cloud' | 'legacy-k8s';

/** platform.ipp.dhl.com/cloud-type: kubevirt/vcluster/kind-local are private, AKS is public. */
export type CloudType = 'private' | 'public';

/**
 * Real, claim-backed provisioning targets — maps 1:1 to a working XRD+Composition:
 * kubevirt-vm -> VMAppClaim, local-cluster -> KindClusterClaim, aks -> AKSClusterClaim.
 * Knative stays a separate, still-simulated InfraType (no matching claim kind today).
 */
export type ProvisionTarget = 'kubevirt-vm' | 'local-cluster' | 'aks';

/** Platform-native sizing — replaces AWS instance types / node-size labels. */
export type TShirtSize = 'S' | 'M' | 'L';

/** Azure regions — only meaningful for the 'aks' target; other targets are on-premises. */
export type AzureRegion = 'eastus' | 'westeurope' | 'southeastasia';

export interface TargetAvailability {
  available: boolean;
  reason: string;
}

export interface KnativeConfig {
  minScale: number;
  maxScale: number;
  concurrency: number;
  memoryMi: number;
}

export interface AppDetails {
  appName: string;
  team: string;
  repositoryUrl: string;
  description: string;
  environment: Environment;
  existingDeployment?: ExistingDeployment;
  /** Signed-in user's email (from Backstage identity), used as IIP's requestedBy. */
  requestedBy?: string;
}

export interface InfraRequest {
  appType: AppType;
  details: AppDetails;
  infraType: InfraType;
  /** Set when infraType !== 'knative' — drives real claim construction. */
  target?: ProvisionTarget;
  size?: TShirtSize;
  /** Only used when target === 'aks'. */
  azureRegion?: AzureRegion;
  /** [DEMO] Knative has no matching claim kind yet — stays simulated. */
  knative?: KnativeConfig;
}

export interface CostBreakdown {
  compute: number;
  storage: number;
  networking: number;
  total: number;
}

export type StepStatus = 'pending' | 'in_progress' | 'done' | 'error';
export type ProvisioningStatus = 'pending' | 'in_progress' | 'complete' | 'failed';

export interface ProvisioningStep {
  id: string;
  label: string;
  status: StepStatus;
}

export interface InfraDetails {
  claimName: string;
  claimPath?: string;
  target?: ProvisionTarget;
  size?: TShirtSize;
  azureRegion?: AzureRegion;
  cloudType?: CloudType;
  /** Deep link to the Argo CD Application for this claim. */
  argoCDApp?: string;
  argoCDUrl?: string;
}

export interface ProvisioningResult {
  /** Real claim name once submitted — also the key used to poll status. */
  claimName: string;
  status: ProvisioningStatus;
  steps: ProvisioningStep[];
  result?: InfraDetails;
  actualCost?: number;
  forecastCost?: number;
  /** True when this result came from the [DEMO] simulation fallback, not real IIP. */
  simulated?: boolean;
  errorMessage?: string;
}

export type ResourceStatus = 'running' | 'stopped' | 'provisioning' | 'error';

export interface InfraResource {
  id: string;
  name: string;
  infraType: InfraType;
  provisionTarget?: ProvisionTarget;
  size?: TShirtSize;
  environment: Environment;
  azureRegion?: AzureRegion;
  status: ResourceStatus;
  provisionedAt: string;
  nodeCount?: number;
  namespace?: string;
  apiEndpoint?: string;
  team: string;
  appName: string;
  monthlyCost: number;
  forecastCost: number;
  /** External URL of the app (populated from live claim status.appUrl) */
  appUrl?: string;
  /** True when sourced from a live cluster claim rather than demo data */
  live?: boolean;
  /** Private (KubeVirt/vcluster/kind-local) vs public (AKS) cloud classification */
  cloudType?: CloudType;
}

export interface CostDataPoint {
  date: string;
  forecasted: number;
  actual: number;
}

export interface YamlInfraRequest {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    team: string;
    environment: Environment;
    repository: string;
  };
  spec: {
    appType: AppType;
    description?: string;
    infra: {
      type: InfraType;
      target?: ProvisionTarget;
      size?: TShirtSize;
      azureRegion?: AzureRegion;
      knative?: KnativeConfig;
    };
  };
}

export interface ValidationError {
  path: string;
  message: string;
}
