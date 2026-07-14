# ipp-platform-app

**Purpose**: The IPP application layer — Backstage portal (TypeScript/React frontend + Node.js backend), AIOps multi-agent service (Python/FastAPI/LangGraph with local Ollama LLM), demo Employee Portal app (Go backend + React frontend), and Kustomize deployment manifests for both KIND and AKS.

**Owner**: `@ipp-platform-ops`

**Argo CD Watch Scope**: Watched by `app-appset.yaml` in `ipp-platform-control`, targeting `deploy/overlays/local/` (KIND) or `deploy/overlays/cloud/` (AKS).

---

## Repository Structure

```
ipp-platform-app/
├── backstage/                          ← Backstage Yarn workspace
│   ├── app-config.yaml                 ← Main Backstage config (DEMO_MODE, Ollama refs)
│   ├── package.json                    ← Workspace root (ipp-platform-backstage)
│   ├── catalog/                        ← Entity catalog YAML files
│   ├── docs/                           ← TechDocs source (MkDocs)
│   ├── e2e/                            ← Playwright end-to-end tests
│   ├── packages/
│   │   ├── app/                        ← Backstage frontend (imports from @internal/plugin-ipp-*)
│   │   └── backend/                    ← Backstage backend + custom scaffold actions
│   └── plugins/
│       ├── ipp-design-system/          ← @internal/plugin-ipp-design-system
│       ├── ipp-personas/               ← @internal/plugin-ipp-personas
│       ├── ipp-infra-onboarding/       ← @internal/plugin-ipp-infra-onboarding
│       ├── ipp-marketplace/            ← @internal/plugin-ipp-marketplace
│       └── infra-onboarding-backend/   ← Backend plugin (cost, provisioning, Day-2)
├── aiops/                              ← AIOps multi-agent service
│   ├── app/
│   │   ├── agents/                     ← 5 agents: CapacitySRE, DeploymentHealthDoctor,
│   │   │                                   FinOps, IncidentPreventionRemediation, SecureShield
│   │   ├── collectors/                 ← Data collectors (k8s, argocd, crossplane, …)
│   │   ├── prompts/                    ← Agent system prompts (Markdown)
│   │   ├── llm.py                      ← Ollama LLM provider (no OpenAI key required)
│   │   ├── demo_responses.py           ← Pre-seeded responses for DEMO_MODE=true
│   │   └── …
│   ├── Dockerfile
│   └── requirements.txt
├── apps/
│   └── employee-portal/                ← Demo three-tier app (Go backend + React frontend)
└── deploy/
    ├── base/
    │   ├── backstage/
    │   ├── aiops/
    │   ├── employee-portal/
    │   ├── observability/
    │   └── cost/
    ├── overlays/
    │   ├── local/                      ← KIND: NodePort, local images, reduced replicas
    │   │   └── kind-config.yaml
    │   └── cloud/                      ← AKS: LoadBalancer, ACR images, prod resources
    └── kustomization.yaml
```

---

## DEMO_MODE

The `DEMO_MODE` environment variable controls whether the portal and AIOps service use live cluster data or pre-seeded demo content.

| `DEMO_MODE` | Backstage | AIOps |
|---|---|---|
| `true` (default) | Uses `mockData.ts` — no live cluster connection required | Returns pre-seeded responses from `demo_responses.py` |
| `false` | Calls real Kubernetes/ArgoCD/Crossplane APIs via `InfraOnboardingClient.ts` | Queries live Prometheus, ArgoCD, OpenCost, Hubble, SPIRE |

Set in `.env`:
```bash
DEMO_MODE=true
```

---

## AIOps — Ollama (No OpenAI Key Required)

The AIOps service uses a local Ollama LLM. No OpenAI API key is needed.

```bash
# Install and start Ollama
brew install ollama
ollama pull llama3
ollama serve   # runs at http://localhost:11434 by default
```

Configure via environment:
```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3
```

If Ollama is unreachable, agents fall back to `fallback_rules.py` rules-based responses automatically.

---

## Backstage Plugin Architecture (Approach G)

All DHL customizations live in isolated plugins under `backstage/plugins/`. The core `packages/app` imports only from `@internal/plugin-ipp-*`:

| Plugin | Package | Contents |
|---|---|---|
| `ipp-design-system` | `@internal/plugin-ipp-design-system` | Tokens, theme, primitives (Button, Card, Modal, …) |
| `ipp-personas` | `@internal/plugin-ipp-personas` | All persona pages + landing + login gate |
| `ipp-infra-onboarding` | `@internal/plugin-ipp-infra-onboarding` | Wizard, MyResources, Day2Ops, CostDashboard, YamlUpload |
| `ipp-marketplace` | `@internal/plugin-ipp-marketplace` | Marketplace + ProviderDetailModal |

---

## Branch Protection

- Branch: `main`
- PR required with at least 1 approval from `@ipp-platform-ops`
- No force-push to `main`
