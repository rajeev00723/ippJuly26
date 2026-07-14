// Interface-first: every consumer depends on this contract, not the implementation.
import type {
  InfraRequest,
  ProvisioningResult,
  InfraResource,
  CostBreakdown,
  TargetAvailability,
  ProvisionTarget,
} from '../types';

export interface InfraOnboardingApi {
  // Real path: POST /api/proxy/iip/api/provision. Falls back to a labeled
  // simulation if IIP is unreachable (offline-safe demo, never breaks the flow).
  provision(request: InfraRequest): Promise<{ claimName: string; status: string; simulated: boolean }>;

  // Real path: GET /api/proxy/iip/api/status/{claimName} (Argo CD health/sync).
  getProvisioningStatus(claimName: string): Promise<ProvisioningResult>;

  // Real path: GET /api/proxy/iip/api/targets (preflight — which targets are usable today).
  getTargetAvailability(): Promise<Record<ProvisionTarget, TargetAvailability>>;

  // TODO[ENTERPRISE]: Replace mock with GET /api/infra-onboarding/resources
  getResources(): Promise<InfraResource[]>;

  // TODO[ENTERPRISE]: Replace mock with POST /api/infra-onboarding/resources/:id/scale
  scaleResource(
    id: string,
    params: { nodeCount?: number },
  ): Promise<{ operationId: string }>;

  // TODO[ENTERPRISE]: Replace mock with GET /api/infra-onboarding/costs/forecast
  getCostForecast(infraType: string, config: Record<string, unknown>): Promise<CostBreakdown>;

  // TODO[ENTERPRISE]: Replace mock with GET /api/infra-onboarding/costs/actual/:resourceId
  getActualCost(
    resourceId: string,
  ): Promise<{ monthToDate: number; forecastedMonthly: number; breakdown: CostBreakdown }>;
}
