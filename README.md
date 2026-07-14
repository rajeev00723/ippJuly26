# IPP — Infrastructure Platform Portal
## DHL Group | Private Cloud 2.0

> A production-grade, laptop-deployable enterprise platform engineering demo that proves developer self-service, GitOps-driven infrastructure provisioning, Crossplane-based abstraction, zero-trust security, FinOps visibility, and AIOps-assisted operations — built on CNCF open-source tools, running on KIND locally or AKS in Azure.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform: KIND](https://img.shields.io/badge/Platform-KIND-orange.svg)](https://kind.sigs.k8s.io/)
[![Platform: AKS](https://img.shields.io/badge/Platform-AKS-blue.svg)](https://azure.microsoft.com/en-us/products/kubernetes-service)
[![Portal: Backstage](https://img.shields.io/badge/Portal-Backstage-9cf.svg)](https://backstage.io/)
[![GitOps: Argo CD](https://img.shields.io/badge/GitOps-Argo%20CD-blue.svg)](https://argoproj.github.io/cd/)
[![Crossplane](https://img.shields.io/badge/IaC-Crossplane-orange.svg)](https://crossplane.io/)
[![AIOps: Ollama](https://img.shields.io/badge/AIOps-Ollama-green.svg)](https://ollama.ai/)

---

## What IPP Proves

A developer with no Kubernetes or infrastructure knowledge can provision a three-tier application — with databases, networking policies, cost tracking, and security controls — in under 90 seconds, without writing a single line of YAML.

| Capability | Mechanism | Proof Point |
|---|---|---|
| **Developer self-service** | Backstage Scaffolder → Crossplane XRD Claim | Three-tier app live in < 90 seconds, zero kubectl |
| **GitOps delivery** | Argo CD App of Apps, continuous reconciliation | Git is the single source of truth |
| **Infrastructure abstraction** | Crossplane XRDs + Compositions | Developer fills a form; platform creates Namespace, Deployments, StatefulSet, NetworkPolicy, ResourceQuota |
| **Zero-trust networking** | SPIFFE/SPIRE identity + Cilium eBPF | Every pod has a cryptographic identity; lateral movement blocked |
| **Policy-as-code** | OPA Gatekeeper + Kyverno admission control | Non-compliant workloads rejected before scheduling |
| **Cost visibility** | OpenCost per-namespace attribution | Real-time $/hr per team, surfaced in Backstage |
| **AI-assisted operations** | 5-agent LangGraph system, local Ollama LLM | Root-cause analysis, incident prevention, capacity planning — no data leaves the laptop |
| **Serverless runtime** | Knative Serving | Scale-to-zero workloads alongside standard Deployments |
| **VM modernisation path** | KubeVirt + Crossplane XVMApp Composition | VMs as first-class Kubernetes workloads |
| **Persona-aware UX** | 5 role-based portal views | Each persona sees only what is relevant to their role |
| **Private Cloud Marketplace** | Backstage Marketplace plugin | Browse and install Crossplane providers |
| **Full telemetry** | Prometheus + Grafana + Hubble | Multi-panel observability dashboard, per-namespace metrics |

---

## Six-Repo Architecture

IPP follows DHL GitOps federated-repository architecture. Each folder below is an independent Git repository with its own branch protection, CODEOWNERS, and Argo CD watch scope.

| Repo | Purpose | Owner | Argo CD Scope |
|---|---|---|---|
| [ipp-platform-control](ipp-platform-control/README.md) | ArgoCD fleet, App-of-Apps root, ApplicationSets, cluster bootstrap | `@ipp-platform-ops` | Self-referential — watches `clusters/` recursively |
| [ipp-platform-compositions](ipp-platform-compositions/README.md) | Crossplane XRDs, Compositions, Provider packages, OCI descriptor | `@ipp-platform-ops` | Watched by `compositions-appset.yaml` in control repo |
| [ipp-platform-claims](ipp-platform-claims/README.md) | Tenant resource claims — sole writer is `@ipp-automation-bot` | `@ipp-automation-bot` | Watched by `claims-appset.yaml` in control repo |
| [ipp-platform-legacy](ipp-platform-legacy/README.md) | GitHub Actions workflows, shell scripts, Makefile — progressively deprecated | `@ipp-platform-ops` | Not watched by Argo CD (legacy operational tooling) |
| [ipp-platform-policies](ipp-platform-policies/README.md) | OPA/Gatekeeper, Kyverno, network policies, SPIRE, RBAC, Conftest stubs | `@ipp-security-eng` | Dedicated ArgoCD Application in control repo |
| [ipp-platform-app](ipp-platform-app/README.md) | Backstage portal + AIOps service + Employee Portal demo app + Kustomize deploy | `@ipp-platform-ops` | Watched by `app-appset.yaml` in control repo |

---

## Persona Matrix

| Persona | Portal Entry Point | Key Capabilities |
|---|---|---|
| **Developer** | Developer Dashboard | Self-service provisioning, My Resources, cost attribution, AIOps chat |
| **Platform Engineer** | Platform Engineer Dashboard | Crossplane compositions, ArgoCD fleet, marketplace, architecture view |
| **SRE / Operations** | Operations Dashboard | AIOps agents, incident prevention, deployment health, Hubble network flows |
| **Security** | Security Dashboard | Security posture, SPIRE workload identities, Kyverno/Gatekeeper policy reports |
| **FinOps / Leadership** | Cost Dashboard | OpenCost per-namespace attribution, FinOps charge visibility, chargeback |

---

## Quick Start

### Prerequisites

```bash
# Required tools
brew install kind kubectl helm argocd-cli

# Ollama — local LLM (no OpenAI key required)
brew install ollama
ollama pull llama3
```

### Local (KIND)

```bash
# 1. Clone this repo
git clone <this-repo-url> IPP_Demoselfservice
cd IPP_Demoselfservice

# 2. Configure environment
cp .env.example .env
# Edit .env if needed — defaults work for local KIND

# 3. Bootstrap the cluster
./ipp-platform-legacy/scripts/bootstrap.sh

# 4. Open the portal
open http://localhost:3000
```

### Cloud (AKS)

```bash
# Prerequisites: az CLI, AKS cluster provisioned, kubeconfig configured
# See ipp-platform-control/clusters/aks-prod-weu/README.md
./ipp-platform-legacy/scripts/bootstrap.sh --target cloud
```

### Teardown

```bash
./ipp-platform-legacy/scripts/destroy.sh
```

---

## Deployment Targets

| Target | Cluster | Ingress | Image Registry | Env Overlay |
|---|---|---|---|---|
| Local | KIND (`kind-ipp-local`) | nginx NodePort | Local Docker daemon | `deploy/overlays/local/` |
| Cloud | AKS (`ipp-prod-weu`) | Azure LoadBalancer | Azure Container Registry | `deploy/overlays/cloud/` |

---

## Known Limitations

### `vmReady: false` on local KIND (Apple Silicon)

On local KIND clusters running on Apple Silicon Macs, `VMAppClaim`s reconcile successfully
(`Synced=True`, `Ready=True`) but `status.vmReady` stays `false` — the underlying KubeVirt
`VirtualMachineInstance` never leaves `Scheduled`/`Starting`. This is a hardware limitation,
not a claim/GitOps bug:

- KubeVirt v1.8.4's admission webhook only permits `cpu.model: host-passthrough` on Arm64.
- `host-passthrough` requires real KVM CPU passthrough, which needs `/dev/kvm`.
- Apple Silicon Macs have no `/dev/kvm` inside Docker Desktop's Linux VM — Apple's chips
  don't implement nested virtualization, so `useEmulation: true` (already set in the
  KubeVirt CR) falls back to pure QEMU/TCG, which `host-passthrough` cannot run under.

There's no CPU model that satisfies both the admission webhook and TCG emulation, so this
can't be fixed with a composition-level config change on this hardware. The claim →
Gitea → ArgoCD → Crossplane reconciliation flow (the part of the demo this platform
actually demonstrates) works end-to-end regardless. To get a real `vmReady: true`, run
the cluster on hardware with actual KVM (Linux host, or a cloud cluster like AKS).

---

## Branch Model

- `main` is the GitOps source of truth for all repos
- **`ipp-platform-claims/`**: only `@ipp-automation-bot` merges to `main`; humans open PRs reviewed by `@ipp-platform-ops`
- All other repos: PR required with `@ipp-platform-ops` or `@ipp-security-eng` mandatory review; no force-push to `main`

---

## Key Environment Variables

See [.env.example](.env.example) for the full documented list. The two most important for demo operation:

```bash
DEMO_MODE=true          # Use mock data and pre-seeded AIOps responses (no live cluster needed)
OLLAMA_MODEL=llama3     # Local LLM model — no OpenAI API key required
```

---

## License

MIT — see [LICENSE](ipp-platform-legacy/LICENSE) for details.
# ippJuly26
