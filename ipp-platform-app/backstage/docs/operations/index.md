# Operations Module

**Audience:** Operations Support, Platform Engineers  
**Route:** `/operations`

---

## Overview

The Operations module provides a real-time view of workload health, security posture, and cost across the platform. It is the first stop for on-call engineers during an incident.

The module has three pages accessible from the left nav under **Operations**:

| Page | Route | Purpose |
|---|---|---|
| Operations | `/operations` | Cluster and workload health overview |
| Security | `/security` | Policy violation and zero-trust posture summary |
| Cost | `/cost` | Namespace-level cost attribution |

---

## Operations Dashboard

The main Operations page surfaces:

- **Pod health summary** — counts of Running, Pending, CrashLoopBackOff, and Failed pods across all namespaces
- **Node utilisation** — CPU and memory pressure across KIND nodes
- **Deployment readiness** — replica availability per deployment
- **Recent events** — Kubernetes warning events from the last 30 minutes

**Key views:**

| Widget | Data source | What to look for |
|---|---|---|
| Pod Status | Kubernetes API | Any non-Running pods indicate a potential incident |
| Node Pressure | Prometheus (node exporter) | MemoryPressure or DiskPressure taints |
| Argo CD Sync | Argo CD API | OutOfSync applications indicate drift from Git |

### Triggering Demo Scenarios

The following scripts simulate real incidents visible in the Operations dashboard:

```bash
# Trigger a CrashLoop on employee-backend
./scripts/simulate-crashloop.sh

# Trigger a network deny event (Cilium)
./scripts/simulate-network-deny.sh

# Roll back any scenario
./scripts/simulate-crashloop.sh --rollback
```

After triggering, refresh the Operations page. CrashLoopBackOff pods appear immediately; the AIOps Agent Command Center can then be queried for root cause analysis.

---

## Next Steps

- [Security Dashboard](security.md)
- [Cost Dashboard](cost.md)
- [AIOps Agent Command Center](../aiops/index.md) — ask natural-language questions about what you see
