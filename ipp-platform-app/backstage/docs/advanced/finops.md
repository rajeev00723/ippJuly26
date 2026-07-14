# FinOps Visibility

**Audience:** Platform Engineers, FinOps, Tech Providers  
**Route:** `/finops`

---

## Purpose

The FinOps Visibility page provides governance-level cost visibility beyond the operational Cost dashboard. Where the [Cost dashboard](../operations/cost.md) shows current spend per namespace, FinOps Visibility focuses on trends, chargeback attribution, and right-sizing recommendations across the entire platform.

---

## Key Views

| View | Description |
|---|---|
| Cost by team / domain | Monthly cost attributed to `domain` and `owner` catalog metadata |
| Right-sizing table | Workloads where requested resources exceed actual P95 usage by > 20% |
| Idle resource list | Workloads with < 1 request/minute over the past 7 days |
| Budget vs actual | Configured budget envelopes per namespace vs. actual spend |

---

## Data Source

All cost data is sourced from OpenCost (`http://opencost.dpcs.local`). The FinOps page queries the OpenCost API directly and overlays Backstage Catalog metadata (owner, domain, system) to produce team-level attribution.

---

## Chargeback Labels

For chargeback to work correctly, workloads must carry the `cost-center` label. The Kyverno `require-labels` policy enforces this at admission time. Workloads without `cost-center` are grouped under **Unattributed** in the FinOps view.

---

## AIOps Integration

Ask the [Agent Command Center](../aiops/index.md):

> "What is driving today's cost increase?"

The FinOps Agent cross-references OpenCost data with Kubernetes pod counts to identify the specific workload causing the spike and suggests right-sizing or scale-down actions.
