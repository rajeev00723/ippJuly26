// [DEMO] Seed data for InMemoryStore — representative values only.
// TODO[ENTERPRISE]: Remove this file; replace with database-backed persistence.
import type { InfraResource, CostDataPoint } from '../types';

export const SEED_RESOURCES: InfraResource[] = [
  {
    id: 'res-001',
    name: 'payment-svc-dev-cluster',
    infraType: 'kubernetes',
    provisionTarget: 'local-cluster',
    size: 'M',
    environment: 'development',
    status: 'running',
    provisionedAt: '2026-05-18T09:30:00Z',
    nodeCount: 2,
    monthlyCost: 338.20,
    forecastCost: 342.40,
    namespace: 'payment-svc-dev',
    apiEndpoint: 'https://k8s.demo.internal:6443',
    team: 'payments-team',
    appName: 'payment-svc',
    cloudType: 'private',
  },
  {
    id: 'res-002',
    name: 'auth-service-vm-staging',
    infraType: 'vm',
    provisionTarget: 'kubevirt-vm',
    size: 'M',
    environment: 'staging',
    status: 'running',
    provisionedAt: '2026-05-15T14:00:00Z',
    monthlyCost: 337.00,
    forecastCost: 340.00,
    team: 'identity-team',
    appName: 'auth-service',
    cloudType: 'private',
  },
  {
    id: 'res-003',
    name: 'analytics-prod-cluster',
    infraType: 'kubernetes',
    provisionTarget: 'aks',
    size: 'L',
    azureRegion: 'eastus',
    environment: 'production',
    status: 'running',
    provisionedAt: '2026-05-01T08:00:00Z',
    nodeCount: 3,
    monthlyCost: 513.00,
    forecastCost: 558.00,
    namespace: 'analytics-prod',
    apiEndpoint: 'https://k8s-prod.demo.internal:6443',
    team: 'data-platform',
    appName: 'analytics-engine',
    cloudType: 'public',
  },
];

// [DEMO] Knative seed resource — only surfaced when ENABLE_KNATIVE_DEMO=true.
export const KNATIVE_SEED_RESOURCE: import('../types').InfraResource = {
  id: 'res-kn-001',
  name: 'notification-svc-knative',
  infraType: 'knative',
  environment: 'production',
  status: 'running',
  provisionedAt: '2026-05-19T10:00:00Z',
  monthlyCost: 18.50,
  forecastCost: 21.00,
  namespace: 'notification-svc-prod',
  team: 'platform-engineering',
  appName: 'notification-svc',
};

// [DEMO] 30-day mock cost time series. Actual = forecast ± small variance.
export function generateCostTimeSeries(days = 30): CostDataPoint[] {
  const result: CostDataPoint[] = [];
  const base = new Date('2026-04-19');
  const totalForecast = SEED_RESOURCES.reduce((s, r) => s + r.forecastCost, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const noise = (Math.random() - 0.5) * 0.04 * totalForecast;
    result.push({
      date: d.toISOString().slice(0, 10),
      forecasted: Math.round(totalForecast * 100) / 100,
      actual: Math.round((totalForecast + noise) * 100) / 100,
    });
  }
  return result;
}

// [DEMO] Pricing table. One source of truth for cost calculations.
// TODO[ENTERPRISE]: private = real internal chargeback rate card; public = live OpenCost/Azure retail actuals.
// T-shirt sizes replace AWS instance types / node-size labels; private (on-prem) rates
// are flat platform chargeback, public (AKS) rates are Azure-retail-shaped estimates.
export const PRICING = {
  private: {
    size: {
      S: { hourly: 0.02, label: 'Small (1-2 vCPU / 1-2 GB)' },
      M: { hourly: 0.05, label: 'Medium (2-4 vCPU / 2-4 GB)' },
      L: { hourly: 0.12, label: 'Large (4-8 vCPU / 4-8 GB)' },
    },
    networkingPerNode: 1.00,  // $/month — internal chargeback
    haAddon: 40.00,           // $/month for HA control plane (local-cluster only)
  },
  aks: {
    size: {
      S: { hourly: 0.096, label: 'Standard_B2s (2 vCPU / 4 GB)' },
      M: { hourly: 0.166, label: 'Standard_D2s_v7 (2 vCPU / 8 GB)' },
      L: { hourly: 0.333, label: 'Standard_D4s_v7 (4 vCPU / 16 GB)' },
    },
    networkingPerNode: 3.00,  // $/month — Azure-ish estimate
    haAddon: 72.00,           // $/month for HA control plane
  },
  // [DEMO] Knative pricing: pay-per-request + idle scale-to-zero savings.
  // Representative values based on GKE Knative + OpenCost projections.
  knative: {
    requestPer1M: 0.40,              // $/million requests
    memoryGbPerHour: 0.0000025,      // $/GB/hour while active
    idleSavingsPct: 0.62,            // 62% cost reduction vs always-on K8s
    baseMonthly: 18.50,              // floor: routing, auto-scaler overhead
  },
};
