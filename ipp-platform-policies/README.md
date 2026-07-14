# ipp-platform-policies

**Purpose**: All security and compliance policies for the IPP platform — OPA/Gatekeeper constraints, Kyverno admission policies, SPIFFE/SPIRE workload identity config, Cilium network policies, RBAC, and Conftest pre-merge validation stubs for claim PRs.

**Owner**: `@ipp-security-eng`

**Argo CD Watch Scope**: Dedicated ArgoCD Application `ipp-policies` in `ipp-platform-control` applies this repo to the management cluster.

---

## Repository Structure

```
ipp-platform-policies/
├── kyverno/
│   └── kyverno-policies.yaml          ← Admission mutation + validation policies
├── gatekeeper/
│   └── gatekeeper-constraints.yaml    ← OPA ConstraintTemplates + Constraints
├── network/
│   ├── employee-portal-netpol.yaml
│   └── network-isolation.yaml
├── spire/
│   ├── spire-server.yaml
│   ├── spire-agent.yaml
│   └── spire-entries.yaml
├── rbac/
│   └── workload-rbac.yaml
└── conftest/
    ├── policy/
    │   └── claim_annotations.rego     ← OPA policy: required ipp.dhl.com/* annotations
    └── README.md                      ← How to run Conftest locally before PR
```

---

## Policy Layers

| Layer | Tool | Enforcement Point |
|---|---|---|
| Admission mutation | Kyverno | On resource create/update in cluster |
| Admission validation | OPA Gatekeeper | On resource create/update in cluster |
| Network isolation | Cilium NetworkPolicy | Enforced by eBPF data plane |
| Workload identity | SPIFFE/SPIRE | mTLS between all workloads |
| Pre-merge validation | Conftest (OPA) | GitHub Actions CI on `ipp-platform-claims` PRs |

---

## Running Conftest Locally

```bash
# Install conftest
brew install conftest

# Validate a claim before opening a PR
conftest test ipp-platform-claims/appbox/dev/bu-demo/claim-threetierapp-demo-dev-001.yaml \
  --policy ipp-platform-policies/conftest/policy/
```

---

## Branch Protection

- Branch: `main`
- PR required with at least 1 approval from `@ipp-security-eng`
- No force-push to `main`
