# IPP — Production Readiness Review

**Date:** 2026-07-03
**Scope:** Full repo — Backstage portal, IIP middleware, Crossplane compositions, GitOps (Argo CD), policies, legacy scripts
**Lens:** Backstage expert · hybrid cloud architect · security architect · Crossplane principal · enterprise GitOps · zero trust

Ratings: 🔴 Critical (fix before any production exposure) · 🟠 High · 🟡 Medium · 🔵 Tech debt / optimization

---

## 1. Security & Zero Trust

### 🔴 S1 — Webhook signature verification fails open
`services/iip/src/routes/webhook.ts:13` — if `ARGOCD_WEBHOOK_SECRET` is unset **or the header is missing**, verification returns `true`. Anyone can forge provisioning-status webhooks. Additional bugs: `timingSafeEqual` throws on unequal buffer lengths (unhandled → 500), and the HMAC is computed over `JSON.stringify(req.body)` — a re-serialization that won't byte-match the original payload, so verification would fail even with a valid signature.
**Fix:** fail closed (401 if secret or header missing); capture the raw request body (`express.raw` or `verify` hook); guard length before `timingSafeEqual`.

### 🔴 S2 — `/api/provision` has no authentication, authorization, or rate limiting
`services/iip/src/routes/provision.ts` — any caller who can reach the service can provision infrastructure and enumerate provisioning state via `GET /:id`. This is the core zero-trust violation: the trust boundary is the network, not identity.
**Fix:** require a Backstage-issued service token (or mTLS/SPIFFE ID since SPIRE is already deployed), add per-caller rate limiting, and validate `requestedBy` against the authenticated identity rather than trusting the body.

### 🔴 S3 — GitOps review gate is bypassed by design
`services/iip/src/lib/gitWriter.ts:79–104` — the bot creates a PR and **immediately merges its own PR**; on 403/405/422 it falls back to **pushing directly to `main`**. This contradicts the README's branch model ("humans open PRs reviewed by platform-ops") and means the single source of truth accepts unreviewed writes. Also, the PAT is embedded in the clone URL (`https://owner:PAT@github.com/...`), which persists in `.git/config` on disk and can leak via error messages.
**Fix:** make auto-merge an explicit, per-environment policy (auto-merge for `dev`, required human review for `staging`/`prod`); remove the push-to-main fallback (fail loudly instead); authenticate git via header/credential-helper, never the URL; prefer a GitHub App over a PAT.

### 🔴 S4 — Hardcoded DB password placeholder in composition
`ipp-platform-compositions/compositions/appbox/composition-threetierapp.yaml:342` — `password: "REPLACE-WITH-SECURE-PASSWORD"` ships as a literal. Every three-tier app provisioned gets the same known password. Duplicate exists in `ipp-platform-legacy/scripts/crossplane/compositions/threetierapp-composition.yaml`.
**Fix:** generate per-claim credentials (Crossplane connection secrets, or ESO + Vault — Vault is already deployed in the stack but nothing consumes it).

### 🟠 S5 — Backstage demo-mode flags have no production gate
`ipp-platform-app/backstage/app-config.yaml`: `dangerouslyDisableDefaultAuthPolicy: true`, `guest: {}` auth, `skipTLSVerify: true`, CSP `connect-src` allowing `http:`, plain-HTTP `baseUrl`, static `ARGOCD_TOKEN` cookie in proxy. These are documented in `SECURITY_REMAINING_RISKS.md` but nothing structurally prevents them reaching production.
**Fix:** split config into `app-config.yaml` (safe defaults) + `app-config.local.yaml` (demo overrides) + `app-config.production.yaml` (OIDC/SSO, TLS, real CA data). Production overlay should fail startup if demo flags are set.

### 🟠 S6 — Policies audit but don't enforce
`ipp-platform-policies/kyverno/kyverno-policies.yaml` — `validationFailureAction: audit` everywhere. The README claims "non-compliant workloads rejected before scheduling"; today they are only logged.
**Fix:** move to `enforce` for prod-namespaces (keep `audit` for dev), add exceptions via `PolicyException` rather than weakening globally.

### 🟠 S7 — Secrets hygiene
`.env.local` with a real GitHub PAT and cloud-credential slots sits in the working tree (correctly gitignored, verified untracked). No automated guarantee it stays that way, and no history scan has run.
**Fix:** add `gitleaks` to CI + pre-commit; run a one-time history scan; rotate the PAT as a precaution; move runtime secrets to K8s Secrets sourced via ESO.

### 🟡 S8 — Zero-trust gaps in the mesh story
SPIRE server/agent manifests exist, default-deny NetworkPolicies exist for `employee-portal`, but: IIP middleware, Backstage, and AIOps namespaces lack default-deny; nothing consumes SPIFFE identities for service-to-service authn (S2 is where it should land); Hubble UI versions are inconsistent (`v0.13.0` vs `v0.13.1`).

---

## 2. GitOps & Argo CD

### 🟠 G1 — Two competing GitOps trees (source-of-truth violation)
`gitops/` (app-of-apps → `project: default`, personal repo URL, recursive sync of mixed resource kinds into `crossplane-system`) coexists with `ipp-platform-control/` (root-app → `ipp-platform` AppProject, ApplicationSets, placeholder `dhl-ipp` URLs). XRDs are literally duplicated (`gitops/xrds/*` vs `ipp-platform-compositions/apis/*` — the files even say "symlink-equivalent"), plus a third copy under `ipp-platform-legacy/scripts/crossplane/`. Drift between copies is inevitable.
**Fix:** pick `ipp-platform-control` as the only entry point; make `gitops/` either generated-only (claims/manifests written by IIP) or fold it in; delete duplicate XRD/composition copies; parameterize repo URLs (one place, e.g. kustomize vars or AppSet generator values).

### 🟠 G2 — Weak Argo CD guardrails
`gitops/apps/argo-app-of-apps.yaml` uses `project: default` (unrestricted destinations/sources); `root-app.yaml` uses `targetRevision: HEAD` (should be `main` or a pinned tag); no AppProject `sourceRepos` allow-list shown for the gitops tree; `prune: true` + `recurse: true` over a directory that mixes XRDs, compositions, and claims is a blast-radius risk (sync-waves help but ordering across CRD→CR is fragile).
**Fix:** dedicated AppProject with allow-listed repos/destinations/cluster-scoped kinds; split XRDs/compositions (platform lifecycle) from claims (tenant lifecycle) into separate Applications with explicit sync-waves; pin `targetRevision`.

### 🟡 G3 — Provisioning state is ephemeral and lookup is fragile
`provisioningStore` is an in-memory `Map` (acknowledged in a comment) — restart loses all in-flight state, so webhook updates silently no-op. `findProvisioningIdByAppName` matches by `claimPath.includes(...)` substring — collisions likely.
**Fix:** persist to Postgres (already in the stack for Backstage) or Redis; correlate strictly via the `iip.dhl.com/provisioning-id` annotation, drop the substring fallback.

---

## 3. Crossplane

### 🟠 C1 — Three copies of XRDs/compositions (see G1) — consolidate to `ipp-platform-compositions` as the sole authority and build it as a Configuration package (OCI) that the control repo installs by version.

### 🟡 C2 — Schema looseness: `x-kubernetes-preserve-unknown-fields: true` on XRD specs undermines the contract the portal form relies on. Tighten schemas, add enums/patterns/defaults, and add `crossplane beta validate` + composition rendering tests (`crossplane render` golden files, or uptest) to CI.

### 🟡 C3 — All APIs are `v1alpha1` with no versioning/conversion strategy, no deprecation policy, and connection secrets are declared (`kubeconfig`, `endpoint`) but the DB composition doesn't wire generated credentials into them (see S4).

### 🟡 C4 — Provider/function pinning: verify `provider-azure`, `provider-kubernetes`, `provider-helm`, and `function-patch-and-transform` are pinned to exact versions with controlled upgrade PRs (Renovate), not floating.

---

## 4. Backstage

### 🟠 B1 — Catalog reaches into the legacy nested repo
`ipp-platform-app/backstage/catalog/templates.yaml` targets `../../../../ipp-platform-legacy/scripts/backstage/catalog/...` — the "current" portal depends on files inside `ipp-platform-legacy/scripts`, which is itself a **nested git repo** (`ipp-platform-legacy/scripts/.git`) invisible to the outer repo. This breaks any URL-based catalog location in a real deployment and couples prod to "progressively deprecated" code.
**Fix:** move the consolidated template YAMLs into `ipp-platform-app/backstage/catalog/`; remove the nested `.git` (absorb or make a proper submodule — prefer absorb).

### 🟡 B2 — Production config gaps: `cache: store: memory` (use Redis), `techdocs` local builder/publisher (use CI-built + object storage), no `backend.auth.externalAccess` tokens defined for IIP↔Backstage calls, permission framework not enabled (persona views are cosmetic, not authorization).

### 🟡 B3 — Testing: only 2 Playwright specs (duplicated again under legacy). No unit tests for plugins or the scaffolder→IIP flow.

---

## 5. Tech Debt & Optimizations (non-breaking)

| # | Item | Action |
|---|------|--------|
| D1 | Stray file `=` at repo root (accidental brew output redirect) | Delete |
| D2 | Nested git repo `ipp-platform-legacy/scripts/.git` — ~2.3 GB working tree incl. node_modules; outer repo tracks only 165 files | Absorb or remove nested repo; ensure node_modules never packaged |
| D3 | Root-level report files (`SECURITY_*.md`, `DELETION_LOG.md`, `TEMPLATE_CONSOLIDATION_REPORT.md`) | Move to `docs/` |
| D4 | 17 `:latest` image references; mixed hubble-ui `v0.13.0`/`v0.13.1` | Pin tags (+ digests for prod overlays) |
| D5 | No CI at repo root: no yamllint/kubeconform, no conftest gate (policies exist but nothing runs them pre-merge!), no gitleaks, no trivy scan, no `crossplane beta validate`; sonar-project.properties exists with no pipeline | Add a GitHub Actions workflow: lint → validate → policy-test → secret-scan → image-scan |
| D6 | No Renovate/Dependabot | Add, with grouped Backstage upgrades |
| D7 | `services/iip`: no tests, no zod/JSON-schema request validation, no helmet, no graceful shutdown, no Dockerfile in-tree though `ipp-platform/iip-service:latest` is referenced | Add unit tests (webhook sig, xrBuilder golden YAML), zod validation, helmet, SIGTERM handling, multi-stage distroless Dockerfile (non-root) |
| D8 | CODEOWNERS/branch-model described in README can't be enforced in a single physical repo | Document as demo limitation, or split repos when productionizing |

---

## 6. What's already good

Clear six-repo mental model, App-of-Apps with sync-waves and retry policy, ApplicationSets per concern, PSS `restricted` labels + default-deny netpol on the demo namespace, SPIRE scaffolding, CODEOWNERS everywhere, `.env.local` correctly gitignored, prior security passes documented honestly, shallow clones + temp-dir cleanup in gitWriter, ULID request correlation.

---

## Fix order (recommended)

1. **Wave 1 — security-critical, no functional impact:** S1, S2 (token check behind env flag so demo still runs), S3 (env-gated auto-merge), S4, S7, D1
2. **Wave 2 — structure:** G1/C1 dedupe, B1 catalog move, G2 AppProject hardening, D2
3. **Wave 3 — guardrails:** D5 CI pipeline, S6 enforce-in-prod, D4 pinning, D6
4. **Wave 4 — robustness:** G3 persistence, B2, C2/C3, D7

Every wave is designed to keep the KIND demo (`bootstrap.sh` → portal on :3000) working — demo behavior is preserved via env-var/overlay gating rather than removal.
