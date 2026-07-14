# Example Walkthrough: Security Policy Query

This page traces a complete end-to-end query through the AIOps system.

**Query:** `"Are any security policies violated?"`

---

## Step 1 — Request Arrives

The Backstage frontend POSTs to the AIOps engine:

```json
POST /api/aiops/chat
{
  "message": "Are any security policies violated?",
  "namespace": "employee-app"
}
```

The engine parses the question and sets:
- `include_security = True` (keyword: "security policies")
- `include_cost = False`
- `include_deployment = False`

---

## Step 2 — Signal Collection (collect_signals node)

All collectors run in parallel with an 8-second timeout each. For this query, the relevant collectors are:

| Collector | Result |
|---|---|
| `KyvernoCollector` | Returns policy audit report — 4 violations found |
| `SpireCollector` | Returns SVID coverage — 1 workload missing identity |
| `HubbleCollector` | Returns recent deny events — 14 flows blocked |
| `GatekeeperCollector` | Returns OPA constraint results — 0 violations |
| `KubernetesCollector` | Returns pod status — 2 pods in Pending state |

---

## Step 3 — Worker Agents Run (run_workers node)

Only `secure_shield` and `incident_prevention_remediation` are invoked (based on the `include_security` flag). Both run in parallel.

### Secure Shield Agent output

```
status: policy_risk_detected
severity: high
findings:
  - "Kyverno: disallow-latest-tag FAILED — employee-backend (image: node:latest)"
  - "Kyverno: require-labels FAILED — employee-backend missing owner, cost-center"
  - "Kyverno: require-resource-limits FAILED — employee-frontend no CPU limit"
  - "Kyverno: require-approved-registry FAILED — employee-backend using docker.io"
  - "SPIFFE identity missing for employee-portal/backend"
probable_root_cause: "Four Kyverno policies violated by employee-backend; workload identity gap on employee-portal/backend"
confidence: 0.91
```

### Incident Prevention & Remediation Agent output

```
status: incident_detected
severity: medium
findings:
  - "2 pods in Pending state in employee-app namespace"
  - "14 Cilium DENY flows in last 15 minutes — source: employee-backend"
confidence: 0.78
```

---

## Step 4 — Manager Synthesis (manager_synthesize node)

The Manager Agent receives both `AgentFinding` objects and sends them to the LLM (or fallback rules) for synthesis.

**Output — ManagerAnalysis:**

```
summary:
  "Four Kyverno policy violations are present in the employee-app namespace,
   affecting the employee-backend workload. The violations cover image tag
   hygiene (latest tag in use), missing owner and cost-center labels,
   absent CPU resource limits, and use of an unapproved container registry.
   Additionally, the employee-portal/backend pod lacks a SPIFFE workload
   identity, leaving it outside the zero-trust mTLS boundary. Fourteen
   Cilium deny events in the past 15 minutes indicate active policy
   enforcement blocking traffic — this is expected behaviour given the
   violations above."

severity: high
confidence: 0.87
data_mode: demo

recommended_actions:
  1. [LOW RISK] Pin employee-backend image to a specific digest — remove :latest tag
     Owner: developers
     Automation: available (GitOps commit via template)
  2. [LOW RISK] Add owner and cost-center labels to employee-backend pod spec
     Owner: developers
  3. [LOW RISK] Add CPU and memory limits to employee-frontend container spec
     Owner: developers
  4. [MEDIUM RISK] Move employee-backend to registry.dpcs.local
     Owner: platform-engineers
  5. [LOW RISK] Register employee-portal/backend with SPIRE server
     Owner: platform-engineers
     Script: scripts/register-spiffe-id.sh employee-portal backend
```

---

## Step 5 — Response Rendered in UI

The Backstage frontend renders:

- A **severity badge** (HIGH — amber)
- A **confidence score** (87%)
- A **DEMO** data-mode indicator (Kyverno collector was reachable in this run; SPIRE timed out and used DEMO data)
- The summary paragraph
- An expandable **Recommended Actions** list with priority numbers and owner labels
- An **Evidence** panel showing raw findings per agent

---

## Key Takeaways from This Query

1. The Manager Agent correctly correlated Kyverno violations → Cilium denies (violations cause blocks).
2. Recommendations are ranked by risk level, not by which agent surfaced them.
3. The DEMO data-mode tag on SPIRE evidence is transparent — the user sees which data is live and which is simulated.
4. The response is actionable without requiring the user to know which tool produced each finding.
