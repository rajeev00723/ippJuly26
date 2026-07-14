# Security Dashboard

**Audience:** Security Analysts, Platform Engineers  
**Route:** `/security`

---

## Purpose

The Security dashboard provides a consolidated view of the platform's zero-trust posture. It aggregates policy enforcement results from Kyverno and OPA Gatekeeper, SPIFFE identity coverage, and Cilium network-policy deny events.

---

## Key Views

### Policy Violations

Kyverno audit results are displayed per namespace. The demo cluster ships with four enforced policies:

| Policy | Enforcement | What it checks |
|---|---|---|
| `disallow-latest-tag` | Enforce | Container images must not use the `latest` tag |
| `require-labels` | Enforce | Pods must carry `app`, `owner`, and `cost-center` labels |
| `require-resource-limits` | Enforce | All containers must declare CPU and memory limits |
| `require-approved-registry` | Enforce | Images must be pulled from `registry.dpcs.local` or approved public registries |

A violation badge shows **policy name**, **resource**, **namespace**, and **action taken** (warn / deny).

### SPIFFE Identity Coverage

SPIRE-issued SVIDs are shown per workload. Workloads without a SPIFFE ID cannot participate in mutual-TLS and are flagged as **identity gap** risks.

### Network Deny Events

Cilium / Hubble deny events from the last 15 minutes are listed with source, destination, port, and L7 verdict. Correlate these with the Operations dashboard pod status to identify blocked service-to-service calls.

---

## Demo Scenario

```bash
# Trigger a policy violation
./scripts/simulate-policy-violation.sh

# Trigger a network deny
./scripts/simulate-network-deny.sh
```

Open the Security dashboard. The violation and deny event appear within seconds. Then open the [AIOps Agent Command Center](../aiops/index.md) and ask:

> "Are any security policies violated?"

The Secure Shield Agent returns a summary of the violations, SPIFFE identity gaps, and recommended remediation actions.

---

## Related

- [AIOps Worker Agents — Secure Shield](../aiops/worker-agents.md#secure-shield-agent)
- [Control Plane — Crossplane](../control-plane/crossplane.md)
