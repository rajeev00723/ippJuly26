# Template Consolidation Report
**Branch:** `backstage-template-consolidation-v1`
**Date:** 2026-06-25
**Author:** Platform Engineering (Claude Sonnet 4.6 pair)

---

## Before — Original 10 Templates

| # | Name | Title | File (line) |
|---|---|---|---|
| 1 | `three-tier-enterprise-app` | Provision Three-Tier Application via Crossplane | templates.yaml:2 |
| 2 | `destroy-three-tier-app` | Destroy Three-Tier Application | templates.yaml:184 |
| 3 | `scale-application` | Scale Application Deployment | templates.yaml:254 |
| 4 | `provision-kubevirt-vm-app` | Provision KubeVirt VM + Deploy 3-Tier App | templates.yaml:331 |
| 5 | `destroy-kubevirt-vm-app` | Destroy KubeVirt VM Application | templates.yaml:488 |
| 6 | `deploy-kubevirt-vm` | Deploy KubeVirt VM Application (standalone) | templates.yaml:559 |
| 7 | `provision-kind-cluster` | Provision Kubernetes Cluster (KIND) | templates.yaml:689 |
| 8 | `provision-azure-aks-tiny` | Provision Azure AKS Tiny Cluster | templates.yaml:841 |
| 9 | `destroy-azure-aks-cluster` | Destroy Azure AKS Cluster | templates.yaml:1037 |
| 10 | `destroy-kind-cluster` | Destroy Kubernetes Cluster | templates.yaml:1101 |

---

## Mapping — 10 → 5

| Original template | Consolidated template | How mapped |
|---|---|---|
| `three-tier-enterprise-app` | Day 0 — Provision New Infrastructure | `infraType: three-tier-k8s` enum path |
| `provision-kubevirt-vm-app` | Day 0 — Provision New Infrastructure | `infraType: kubevirt-vm-app` enum path |
| `deploy-kubevirt-vm` | Day 0 — Provision New Infrastructure | `infraType: kubevirt-vm-standalone` enum path |
| `provision-kind-cluster` | Day 0 — Provision New Infrastructure | `infraType: kind-cluster` enum path |
| `provision-azure-aks-tiny` | Day 0 — Provision New Infrastructure | `infraType: azure-aks` enum path |
| `scale-application` | Day 2 — Modify Existing Infrastructure | `changeType: scale` enum path |
| `destroy-three-tier-app` | Day 2 — Modify Existing Infrastructure | `changeType: destroy-three-tier` enum path |
| `destroy-kubevirt-vm-app` | Day 2 — Modify Existing Infrastructure | `changeType: destroy-vm` enum path |
| `destroy-azure-aks-cluster` | Day 2 — Modify Existing Infrastructure | `changeType: destroy-aks` enum path |
| `destroy-kind-cluster` | Day 2 — Modify Existing Infrastructure | `changeType: destroy-kind` enum path |
| *(none — new)* | Onboard Brownfield Application | Full standalone; `crossplane:apply-claim` on namespace labels |
| *(none — new)* | Onboard Greenfield Application | Full standalone; `crossplane:apply-claim` per infraChoice |
| *(none — new)* | YAML Upload — Bring Your Own Config | Full standalone; `crossplane:apply-claim` via parsed structured fields |

---

## After — 5 Consolidated Templates

| # | Name | Card Title | sort-order | Actions used |
|---|---|---|---|---|
| 1 | `day0-provision-infrastructure` | Day 0 — Provision New Infrastructure | 1 | `crossplane:apply-claim` × 5 paths, `debug:log` |
| 2 | `day2-modify-infrastructure` | Day 2 — Modify Existing Infrastructure | 2 | `crossplane:apply-claim` (scale), `kubernetes:delete-resource` × 4 paths, `debug:log` |
| 3 | `onboard-brownfield-application` | Onboard Brownfield Application | 3 | `crossplane:apply-claim` (namespace labels), `debug:log` |
| 4 | `onboard-greenfield-application` | Onboard Greenfield Application | 4 | `crossplane:apply-claim` × 3 paths, `debug:log` |
| 5 | `yaml-upload-bring-your-own-config` | YAML Upload — Bring Your Own Config | 5 | `crossplane:apply-claim` × 2 paths (k8s+vm), `debug:log` |

---

## Files Changed

| File | Change |
|---|---|
| `ipp-platform-legacy/scripts/backstage/catalog/templates-consolidated.yaml` | **CREATED** — all 5 consolidated templates (1,504 lines) |
| `ipp-platform-legacy/scripts/backstage/catalog/templates.yaml` | **EDITED** — added `_deprecated` tag + `ipp.dhl.com/deprecated`, `ipp.dhl.com/superseded-by`, `ipp.dhl.com/deprecation-note` annotations to all 10 original templates |
| `ipp-platform-legacy/scripts/backstage/app-config.yaml` | **EDITED** — added `templates-consolidated.yaml` as catalog location |
| `ipp-platform-legacy/scripts/backstage/packages/app/src/App.tsx` | **EDITED** — ScaffolderPage `filter` + `templateFilter` exclude `_deprecated` tagged templates |
| `ipp-platform-app/backstage/catalog/templates.yaml` | **CREATED** — Location file pointing at consolidated templates |
| `ipp-platform-app/backstage/packages/app/src/App.tsx` | **EDITED** — same ScaffolderPage filter update |

---

## Label / Hostname Normalisations Applied

| Before | After | Scope |
|---|---|---|
| `platform.dpcs.io/environment` | `platform.ipp.dhl.com/environment` | All new templates |
| `platform.dpcs.io/team` | `platform.ipp.dhl.com/team` | All new templates |
| `platform.dpcs.io/cost-center` | `platform.ipp.dhl.com/cost-center` | All new templates |
| `platform.dpcs.io/cloud` | `platform.ipp.dhl.com/cloud` | All new templates |
| `myapp.dpcs.local` | `myapp.ipp.local` | Template defaults |
| `vmapp.dpcs.local` | `vmapp.ipp.local` | Template defaults |
| `argocd.dpcs.local` | `argocd.ipp.local` | Output links |
| `backstage.dpcs.local` | `backstage.ipp.local` | Output links |

*Label domain authority: `platform.ipp.dhl.com` confirmed from `ipp-platform-compositions/` XRDs.*

---

## Validation Results

| Check | Result |
|---|---|
| `dpcs` references in consolidated file | **0** ✅ |
| Template count in consolidated file | **5** ✅ |
| `_deprecated` tags added to original templates | **10/10** ✅ |
| `filter` updated in legacy `App.tsx` | ✅ |
| `filter` updated in ipp-platform-app `App.tsx` | ✅ |
| `sort-order` annotations present (1–5) | ✅ |
| Label domain = `platform.ipp.dhl.com` | ✅ |
| No scaffolder actions removed or modified | ✅ |
| No Git/GitHub/Argo CD triggers broken | ✅ (none existed) |
| `yarn lint` | Skipped — no node_modules in scope |
| `yarn tsc` | Skipped — no node_modules in scope |
| `yarn build` | Skipped — no node_modules in scope |

---

## Risk Items & Follow-up Actions

| Item | Severity | Status |
|---|---|---|
| Azure AKS provisioning requires `azure-creds` Secret in `crossplane-system` | MEDIUM | Noted in template output text and sort-order annotation |
| `knative:deploy-service` action registered but used by zero templates | INFO | No action needed — action preserved, no template references it |
| YAML Upload paste path: scaffolder cannot parse raw YAML string at runtime | RESOLVED | Template uses structured mirror fields (`parsedAppName`, `parsedInfraType`, etc.) that drive `crossplane:apply-claim` directly |
| `catalog/templates.yaml` in `ipp-platform-app` was missing | RESOLVED | Created as a Location file |
| `ipp-platform-legacy/scripts` is a git submodule | INFO | Changes committed directly to the submodule — outer repo tracks updated submodule pointer |
| ScaffolderPage `templateFilter` prop — verify it exists in the installed `@backstage/plugin-scaffolder` version | LOW | If prop not available, remove `templateFilter` line — `filter` on the group is sufficient |
| `Namespace` kind apply in Brownfield template (v1 core) | LOW | `crossplane:apply-claim` handles `apps/v1 Deployment` and custom resources; for core `v1/Namespace` it uses `CoreV1Api.createNamespace` — already covered by the action handler |

---

## How Ordering Works

Templates are ordered by `ipp.dhl.com/sort-order` annotation (values `"1"`–`"5"`).
The `ScaffolderPage` `templateFilter` prop surfaces this ordering if the installed
plugin version supports it. If not, templates appear in catalog ingestion order
which matches the document order in `templates-consolidated.yaml` (01→05 by design).

---

*Generated by Claude Sonnet 4.6 on 2026-06-25*
