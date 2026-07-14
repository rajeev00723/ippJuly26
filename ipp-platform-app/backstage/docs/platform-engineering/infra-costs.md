# Infra Costs

**Audience:** Platform Engineers  
**Route:** `/infra-onboarding/costs`

---

## Purpose

The Infra Costs page gives platform engineers a resource-level cost breakdown for everything they have provisioned — one level deeper than the namespace view in the [Cost dashboard](../operations/cost.md).

---

## Key Views

| View | Description |
|---|---|
| Per-claim cost | Monthly cost attributed to each Crossplane Claim |
| Cost by resource type | CPU vs memory vs storage spend breakdown |
| Provisioned vs used | Requested resources compared to actual P95 usage |
| Right-sizing suggestions | Resources where provisioned > used by > 20% |

---

## Cost Labels Required

Cost attribution relies on the following Kubernetes labels being present on all pods:

- `cost-center` — the business unit or team funding the workload
- `owner` — the team responsible for the workload
- `app` — the application name (matches the Crossplane Claim name)

The Kyverno `require-labels` policy enforces these at admission time. If labels are missing, cost is attributed to the **Unattributed** bucket.

---

## Acting on Right-Sizing Suggestions

1. Review the suggestion on this page.
2. Go to [Day 2 Operations](day2-ops.md) → **Scale** to reduce replicas, or
3. Edit the Crossplane Claim YAML in Git to lower `resources.requests.cpu` / `memory`.
4. Argo CD syncs the change; OpenCost reflects the lower cost within one billing cycle.

---

## Related

- [FinOps Visibility](../advanced/finops.md) — governance-level cost view
- [AIOps — FinOps Agent](../aiops/worker-agents.md#finops-agent)
