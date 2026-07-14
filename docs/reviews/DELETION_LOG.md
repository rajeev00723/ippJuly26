# IPP Migration — Deletion Log

Records every source file intentionally excluded from the IPP output, with the reason and confirmation of uniqueness check.

Source root: `/Users/amitabhsharan/project/Demo_Selfservice/IPS_Demo_Final`
Output root: `/Users/amitabhsharan/project/IPP_Demoselfservice`

---

## Module 1 — Scaffold

| Source File | Reason Excluded | Uniqueness Check |
|---|---|---|
| `backstage/dist-types/` | Compiled TypeScript output — never committed | N/A (build artifact) |
| `backstage/node_modules/` | NPM dependency cache — never committed | N/A (dependency cache) |
| `RENAME_REPORT.md` | Internal working doc — tracks a past rename task, not part of clean output | No unique architectural content |
| `UX_AUDIT.md` | Internal working doc — point-in-time UX findings, superseded by implemented changes | No unique content not reflected in code |
| `UX_VERIFICATION.md` | Internal working doc — verification pass companion to UX_AUDIT.md | No unique content not reflected in code |
| `KNATIVE_DEMO_EXTENSION_NOTES.md` | Internal working doc — implementation notes for Knative extension | No unique content not in code or main docs |
| `kind/kind-config.yaml.bak` | Backup artifact — committed by mistake | Content superseded by `kind/kind-config.yaml` |
| `crossplane/compositions/threetierapp-composition.yaml.bak` | Backup artifact — committed by mistake | Content superseded by `crossplane/compositions/threetierapp-composition.yaml` |
| `backstage/packages/app/src/components/personas/LandingV2.tsx` | Duplicate of `LandingPage.tsx` | Confirmed: LandingV2 is an earlier iteration with no unique routes or components not present in LandingPage.tsx |

## Module 1 — Superseded (not deleted — unique content preserved)

| Source File | Status | Resolution |
|---|---|---|
| `aiops/manifests/aiops-deployment.yaml` (v1) | **Differs** from `aiops/manifests/deployment.yaml` (v2) — v1 includes Service + Ingress sections that v2 omits | Unique Service + Ingress sections extracted into `deploy/base/aiops/service.yaml` and `deploy/base/aiops/ingress.yaml` in Module 7. v2 `deployment.yaml` is canonical Deployment resource. |
| `aiops/manifests/aiops-rbac.yaml` (v1) | **Differs** from `aiops/manifests/rbac.yaml` (v2) — v2 adds broader CRD groups (Cilium, SPIRE, Kyverno PolicyReports, wildcard fallback) | v2 `rbac.yaml` is canonical — it is a strict superset of v1 permissions. v1 not copied. |

---

_Updated by each module as files are reviewed._

## Module 5 — Exclusions

| Source File | Reason Excluded | Uniqueness Check |
|---|---|---|
| `security/vault/vault-deployment.yaml` | Vault not listed as a Module 5 target in the prompt spec; no Vault-related ApplicationSet or policy references in IPP target architecture | Unique content — if Vault integration is needed, re-add as a separate `ipp-platform-policies/vault/` subtree in a future module |
