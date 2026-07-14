# Telemetry Sources

**Source:** `aiops/app/collectors/`

The AIOps engine collects data from eight platform sources before running the worker agents. Each source is tagged in the UI as **LIVE**, **DEMO**, or **N/A**.

---

## Tag Definitions

| Tag | Meaning |
|---|---|
| **LIVE** | The collector successfully reached the source in the current request and returned real cluster data. |
| **DEMO** | The collector could not reach the source (timeout, network error, or service unavailable). The engine substituted pre-scripted simulation data to keep the demo functional. |
| **N/A** | The source is not applicable to this query (e.g. the FinOps agent was not invoked, so OpenCost data was not collected). |

A response can contain a mix of LIVE and DEMO evidence items — the Manager Agent aggregates across all available data and flags each piece of evidence with its origin mode.

---

## Source Reference Table

| Source | Collector | In-cluster endpoint | Used by agents | Demo fallback |
|---|---|---|---|---|
| **Kubernetes API** | `KubernetesCollector` | `https://kubernetes.default.svc` | All agents | Pod/deployment snapshot |
| **Prometheus** | `PrometheusCollector` | `http://prometheus-operated.monitoring.svc:9090` | Capacity SRE, Incident Prevention | CPU/memory metric snapshot |
| **Argo CD** | `ArgoCDCollector` | `http://argocd-server.argocd.svc.cluster.local` | Deployment Health Doctor | OutOfSync app snapshot |
| **OpenCost** | `OpenCostCollector` | `http://opencost.opencost.svc:9003` | FinOps | Namespace cost snapshot |
| **Hubble / Cilium** | `HubbleCollector` | `hubble-relay.kube-system.svc:4245` (exec) | Incident Prevention, Secure Shield | Network deny snapshot |
| **Crossplane** | `CrossplaneCollector` | Kubernetes API (CRD queries) | Deployment Health Doctor | Claim status snapshot |
| **OPA / Kyverno** | `GatekeeperCollector`, `KyvernoCollector` | Kubernetes API (policy reports) | Secure Shield | Policy violation snapshot |
| **SPIRE** | `SpireCollector` | `spire-server.spire-system.svc` (exec) | Secure Shield | SVID coverage snapshot |

---

## Collector Timeout Behaviour

Each collector has an **8-second** per-request timeout (configurable). If a collector times out:

1. The exception is caught silently.
2. The collector returns `None` for that source.
3. The corresponding worker agent uses the DEMO fallback data.
4. The response is tagged **DEMO** for that evidence item.

This design ensures a complete response is always returned, even when parts of the platform are unreachable (common in a laptop-based KIND demo environment).

---

## Improving LIVE Coverage

To increase the number of LIVE-tagged sources in the demo:

1. Ensure all pods are running: `kubectl get pods -A`
2. Verify Prometheus is scraping: `http://prometheus.dpcs.local/targets`
3. Verify Argo CD is reachable: `http://argocd.dpcs.local`
4. Check AIOps engine logs: `kubectl logs -n aiops -l app=aiops-engine`

See [Troubleshooting](../troubleshooting.md) for per-source debugging steps.
