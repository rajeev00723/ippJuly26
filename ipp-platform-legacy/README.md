# ipp-platform-legacy

**Purpose**: Legacy operational tooling — GitHub Actions workflows, shell bootstrap/destroy scripts, and Makefile — that predates the GitOps-first IPP architecture. These tools are progressively deprecated as Argo CD ApplicationSets and Crossplane Compositions reach production readiness.

**Owner**: `@ipp-platform-ops`

**Argo CD Watch Scope**: None — this repo is not watched by Argo CD. It is operational tooling, not a GitOps source.

---

## Repository Structure

```
ipp-platform-legacy/
├── github-actions/
│   └── workflows/
│       ├── docs-lint.yml          ← Markdown lint on docs/ changes
│       └── claim-watcher.yml      ← Stub: triggers on ipp-platform-claims push
├── scripts/
│   ├── bootstrap.sh               ← Cluster + platform bootstrap (KIND and AKS)
│   ├── destroy.sh                 ← Cluster teardown
│   └── README.md                  ← Script usage + deprecation timeline
└── Makefile                       ← Dev convenience targets
```

---

## Deprecation Plan

Each script or workflow below will be retired on the listed milestone:

| Tool | Replacement | Target Milestone |
|---|---|---|
| `scripts/bootstrap.sh` (ArgoCD install) | `ipp-platform-control/bootstrap/argocd/` applied via `root-app.yaml` | After ArgoCD App-of-Apps reaches stable in staging |
| `scripts/bootstrap.sh` (Crossplane install) | `ipp-platform-control/bootstrap/crossplane/` | After composition package published to OCI registry |
| `scripts/destroy.sh` | Manual ArgoCD Application deletion + cluster teardown | TBD |
| `github-actions/workflows/claim-watcher.yml` | Argo CD ApplicationSet with `ipp-platform-claims` source | After claims ApplicationSet reaches production |

Once all items are retired, this repo is archived (read-only) and removed from active rotation.

---

## Branch Protection

- Branch: `main`
- PR required with at least 1 approval from `@ipp-platform-ops`
- No force-push to `main`
