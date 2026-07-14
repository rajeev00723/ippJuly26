# Worker Agents

**Source:** `aiops/app/graph.py` — `run_workers_node`

The five worker agents run in parallel. Each receives the full `SignalBundle` (all collected telemetry) and produces an `AgentFinding` covering its domain.

---

## Capacity SRE Agent

**Key:** `capacity_sre`  
**Role:** Resource & Saturation Analysis  
**Data sources:** Prometheus, Kubernetes API

**Responsibilities:**
- Pod health assessment (Running / Pending / Failed / OOMKilled counts)
- CPU and memory pressure detection at node and namespace level
- Scaling risk identification (replicas near HPA max, requests near limits)
- OOMKill prediction based on memory trend data

**Typical findings:**
- `"memory pressure on node kind-control-plane: 87% used"`
- `"employee-backend has 0/2 replicas available"`
- `"OOMKill risk: employee-backend memory usage at 94% of limit"`

---

## FinOps Agent

**Key:** `finops`  
**Role:** Cost & Waste Analysis  
**Data sources:** OpenCost, Kubernetes API

**Responsibilities:**
- Per-namespace monthly cost attribution
- Idle resource detection (deployed but receiving < 1 req/min)
- Right-sizing signals (requested resources significantly above actual usage)
- Cost spike detection against 7-day rolling baseline

**Typical findings:**
- `"employee-app namespace: $142/month, up 340% from 7-day average"`
- `"employee-database: provisioned 5Gi, using 0.2Gi — right-size to 1Gi"`

---

## Incident Prevention & Remediation Agent

**Key:** `incident_prevention_remediation`  
**Role:** Incident Detection & Runbooks  
**Data sources:** Kubernetes API, Hubble (Cilium), Prometheus

**Responsibilities:**
- CrashLoopBackOff detection and restart frequency analysis
- Network deny event correlation (Hubble flow denies)
- Error rate analysis from Prometheus HTTP metrics
- Runbook attachment — maps detected incident patterns to remediation scripts

**Typical findings:**
- `"CrashLoopBackOff: employee-backend — 8 restarts in 30 minutes"`
- `"Hubble flow DENIED: backend→postgres TCP 5432"`
- `"Runbook: run scripts/simulate-network-deny.sh --rollback"`

---

## Deployment Health Doctor Agent

**Key:** `deployment_health_doctor`  
**Role:** GitOps & Rollout Analysis  
**Data sources:** Argo CD, Kubernetes API, Crossplane

**Responsibilities:**
- Argo CD application sync state (Synced / OutOfSync / Unknown)
- Deployment replica availability and rollout progress
- Crossplane Claim reconciliation health
- Drift detection — resources that exist in the cluster but not in Git

**Typical findings:**
- `"ArgoCD app employee-portal: OutOfSync — 2 resources differ from Git HEAD"`
- `"Deployment employee-backend: 0/2 replicas available"`
- `"Crossplane claim employee-portal: Not Ready — composition error"`

---

## Secure Shield Agent

**Key:** `secure_shield`  
**Role:** Security Posture & Compliance  
**Data sources:** Kyverno, SPIRE, OPA Gatekeeper, Cilium/Hubble

**Responsibilities:**
- Kyverno policy violation audit (all four enforced policies)
- SPIFFE identity gap detection (workloads without valid SVIDs)
- Zero-trust posture assessment (Cilium network deny verdicts)
- OPA Gatekeeper constraint violation summary

**Typical findings:**
- `"Kyverno: disallow-latest-tag FAILED for employee-backend (image: node:latest)"`
- `"Kyverno: require-labels FAILED — missing owner, cost-center labels"`
- `"SPIFFE identity missing for employee-portal/backend"`
- `"Cilium DENY: 14 flows blocked in last 15 minutes"`

---

## Agent Invocation Control

Some agents are conditionally included based on the query context:

| Agent | Included when |
|---|---|
| `capacity_sre` | Always |
| `finops` | `request.include_cost == True` |
| `incident_prevention_remediation` | Always |
| `deployment_health_doctor` | `request.include_deployment == True` |
| `secure_shield` | `request.include_security == True` |

The Manager Agent sets these flags based on keyword analysis of the user's question.
