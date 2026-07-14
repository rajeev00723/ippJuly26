# Cost Dashboard

**Audience:** Operations Support, Platform Engineers, FinOps  
**Route:** `/cost`

---

## Purpose

The Cost dashboard surfaces OpenCost data to give namespace-level and workload-level cost attribution without leaving the portal.

---

## Key Views

| View | Description |
|---|---|
| Namespace cost breakdown | Monthly cost (CPU + memory + storage) per namespace |
| Workload cost | Per-deployment or per-pod cost within a namespace |
| Cost trend | 7-day rolling cost trend chart |
| Idle resource flag | Workloads consuming budget with zero or minimal request traffic |

---

## Data Source

OpenCost is deployed in-cluster and queries Prometheus for resource utilisation metrics. It uses an on-premises cost model (CPU and memory pricing set in `cost/opencost-values.yaml`). Cost figures in the demo are illustrative and reflect the configured pricing model applied to actual resource usage in the KIND cluster.

**Access OpenCost UI directly:** `http://opencost.dpcs.local`

---

## Demo Scenario

```bash
# Trigger a cost spike (scales employee-portal to 20 replicas)
./scripts/simulate-cost-spike.sh

# Roll back
./scripts/simulate-cost-spike.sh --rollback
```

After triggering, the Cost dashboard shows a spike in the `employee-app` namespace. The [FinOps Agent](../aiops/worker-agents.md#finops-agent) in the Agent Command Center will surface idle-resource and right-sizing recommendations.

---

## Related

- [FinOps Visibility](../advanced/finops.md) — extended cost governance view
- [Infra Costs](../platform-engineering/infra-costs.md) — per-resource cost view for platform engineers
