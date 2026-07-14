# IPP — Demo Improvement Review

**Date:** 2026-07-05
**Scope:** Demo optimization · UX · real onboarding tool · cloud-type labeling · tech debt
**Lens:** Backstage · hybrid cloud · security · Crossplane · GitOps · zero trust · UX
**Goal:** Demo-grade excellence (not production hardening — that's `PRODUCTION_READINESS_REVIEW.md`)

> **Status update (2026-07-06):** All four waves below have landed on
> `fix/demo-excellence`. See the **Fix Status** table at the end of this
> document for per-finding disposition (Fixed / Deferred) with commit refs.
> Findings below are left as originally written (including now-stale file
> paths from Phase 1 — the real paths are noted in the status table) since
> they're the historical record this review was built from.

**Decisions locked (2026-07-05):** onboarding fully real for all targets · brownfield = YAML/descriptor upload · live AKS provisioning allowed · consolidate portal into `ipp-platform-app` first · real clusters via **vcluster** · scope excludes prior-review security waves.

Ratings: 🔴 Blocks the demo story · 🟠 High-value improvement · 🟡 Polish / debt

---

## 1. Structural blocker — two portals, the real one is in "legacy"

### 🔴 P1 — Active portal is a broken skeleton
`ipp-platform-app/backstage/packages/app/` contains only `App.tsx` + 2 persona components and **no `package.json`**, yet `App.tsx` lazy-imports ~50 components (`./components/infra-onboarding/InfraOnboardingPage`, marketplace, dashboards…) that do not exist in that tree. The portal that actually runs is built by `bootstrap.sh:1268` (`BACKSTAGE_DIR="${REPO_ROOT}/backstage"`) from `ipp-platform-legacy/scripts/backstage/` — inside the **nested git repo** at `ipp-platform-legacy/scripts/.git`, invisible to the outer repo, ~2.3 GB working tree.
**Fix (approved):** consolidate — move the working portal (packages, plugins, catalog, app-config) into `ipp-platform-app/backstage/`, absorb the nested `.git`, point `bootstrap.sh` at the new location, delete the legacy copy. Everything below happens in the consolidated tree.

---

## 2. Onboarding tool — make it real

### 🔴 O1 — Wizard and backend are 100% mock
- `.../infra-onboarding/api/InfraOnboardingClient.ts` — every method is a `TODO[ENTERPRISE]` returning simulated data with fake delays.
- Legacy `plugins/infra-onboarding-backend/src/router.ts` — `InMemoryStore` + simulated delays (self-documented at line 4).
- Meanwhile the real provisioning path already exists and works: Scaffolder → IIP `/api/provision` → `xrBuilder.ts` (builds `IPPClusterClaim`, `IPPVirtualMachineClaim`, `IPPAppBoxClaim`…) → git claim → Argo CD → Crossplane.

**Fix:** delete the mock client/backend; make the wizard a first-class front end to IIP. Wizard submit → `POST /api/provision`; status step polls IIP provisioning status (fed by the existing Argo webhook) and renders real phases: *Claim written → PR merged → Argo synced → Resource ready → Endpoint live*. `DEMO_MODE=true` retains today's simulated responses behind a visible **Simulated** badge, so the demo still runs on a plane.

### 🔴 O2 — Wizard targets don't map to the platform
`types.ts` offers AWS instance types (`t3.medium`, `m5.large`) and AWS regions (`us-east-1`…) — in a DHL private-cloud + Azure demo. There is no target selection at all (KubeVirt / kind-style / AKS), and `InfraType` (`kubernetes|vm|knative`) never reaches a claim.
**Fix:** replace Step 3 with a **deployment-target selector**:

| Target | Claim | Composition | Cloud type |
|---|---|---|---|
| Virtual Machine (KubeVirt) | `IPPVirtualMachineClaim` | `ipp-composition-kubevirt-vmapp` | 🔒 Private Cloud |
| Local cluster (vcluster) | `IPPClusterClaim target=local` | new `ipp-composition-cluster-vcluster` | 🔒 Private Cloud |
| AKS (Azure) | `IPPClusterClaim target=aks` | `ipp-composition-cluster-aks` | ☁️ Public Cloud |

Sizes become platform-native T-shirt sizes (S/M/L → cpu/memory/disk), regions become Azure regions (AKS only) or "on-premises" (local targets).

### 🔴 O3 — "kind" cluster composition is a namespace, not a cluster
`compositions/cluster/composition-kind-local.yaml` creates a namespace labeled `kind-cluster-sim`. Not real.
**Fix (approved):** new **vcluster composition** — provider-helm `Release` of the vcluster chart → real isolated API server in ~30s; write the generated kubeconfig to the claim's connection secret; register the resulting cluster in the Backstage catalog (`kind: Resource, type: kubernetes-cluster`). Keep the old sim composition only behind `DEMO_MODE`.

### 🟠 O4 — AKS path: real but demo-aware
`composition-aks-azure.yaml` (ARM `SubscriptionTemplateDeployment`) is real once provider-azure creds exist. Live AKS ≈ 8–12 min — too slow to watch synchronously.
**Fix:** async by design — wizard fires the claim, shows "Provisioning in Azure (~10 min)" with live Argo/Crossplane condition streaming, notifies on ready. Add a pre-flight check in IIP (`GET /api/targets`) that reports which targets are actually available (Azure creds present? KubeVirt installed? vcluster chart reachable?) so the wizard disables unavailable targets with an honest tooltip instead of failing mid-flow.

### 🟠 O5 — Brownfield = real YAML/descriptor upload
`YamlUpload/index.tsx` currently parses and discards. **Fix:** upload manifest/descriptor → IIP parses (server-side, schema-validated) → derives an `IPPAppBoxClaim` (or VM claim for VM descriptors) + `catalog-info.yaml` → same git-PR flow → app lands on the chosen target and appears in the catalog with `lifecycle: migrated`. Greenfield = blank form; brownfield = pre-filled from the descriptor. That single distinction makes both stories real.

---

## 3. Private vs public cloud labeling

### 🔴 L1 — No cloud-type concept anywhere
Nothing in XRDs, compositions, claims, or UI distinguishes private from public cloud.
**Fix (one label, everywhere):**
- Compositions stamp `platform.ipp.dhl.com/cloud-type: private` (kubevirt, vcluster/kind-local) or `public` (aks) on every composed resource + as an XR label.
- XRD gains a status field `cloudType` patched from the composition, so `kubectl get ippclusterclaims` shows it (`additionalPrinterColumns`).
- Wizard, Review step, MyResources, CostDashboard, and catalog entities render a badge: 🔒 **Private Cloud** / ☁️ **Public Cloud**.
- OpenCost/cost views group by the same label → private-vs-public spend split becomes a FinOps demo beat for free.

---

## 4. UX improvements

### 🟠 U1 — Show real state, honestly
Demo credibility comes from visible truth: every simulated element gets a subtle `Simulated` chip (pattern already exists — `DemoChip` in `shared.tsx`); every real element shows live status from IIP/Argo. Mixed dashboards where mock and real are indistinguishable undermine the pitch.

### 🟠 U2 — Provisioning progress is fake theater
Wizard progress steps advance on timers. Replace with event-driven progress (poll IIP `GET /provision/:id`, which the Argo webhook already updates) — including failure states with the actual Crossplane condition message and a "View in Argo CD" deep link. Failures shown well are a *better* demo than fake success.

### 🟡 U3 — Persona flow polish
`PersonaLoginGate` roles are cosmetic. For the demo that's fine, but the onboarding entry point should appear on the Developer dashboard as the primary CTA ("Onboard an application →"), and `DemoFlowPage`/`GettingStartedPage` steps should be updated to feature the real onboarding path (they currently narrate the scaffolder-template path only).

### 🟡 U4 — Cost panel honesty
`PRICING` in the client is hardcoded AWS-ish numbers. Re-base on the T-shirt sizes; for local targets show "internal chargeback rate," for AKS show real Azure retail-ish rates; label estimates as estimates and link to OpenCost actuals post-provision.

---

## 5. Demo optimization & tech debt (non-breaking)

| # | Item | Action |
|---|---|---|
| 🟠 D1 | `bootstrap.sh` ~1,300 lines, rebuilds images serially, no preflight | Add `make demo-up / demo-reset / demo-status`; preflight checks (Docker memory, ollama model pulled, ports free); skip unchanged image rebuilds (hash-based) |
| 🟠 D2 | Claims for onboarded resources must land where Argo actually watches | Onboarding writes to `ipp-platform-claims/` via IIP only; delete the drifting XRD copies in `gitops/xrds/` + `ipp-platform-legacy/scripts/crossplane/` as part of consolidation (prior-review G1/C1) |
| 🟡 D3 | Wizard state lost on refresh mid-demo | Persist wizard state + last provisioning ID (sessionStorage) so an accidental refresh doesn't kill the live demo |
| 🟡 D4 | `InfraOnboardingClient` duplicated active vs legacy | Dies with consolidation (P1) |
| 🟡 D5 | Stray `=` file at repo root; report .mds cluttering root | Delete `=`; move reports to `docs/reviews/` |
| 🟡 D6 | No smoke test for the demo path | One Playwright spec: wizard → mock IIP → status reaches "ready"; plus an IIP unit test: wizard payload → expected claim YAML (golden file) |

---

## 6. Demo narrative after these changes

1. **Greenfield:** dev picks "New app" → target **AKS** → badge flips to ☁️ Public Cloud → claim PR → Argo sync → real AKS provisioning streams in (async).
2. **Greenfield-local:** same flow, target **vcluster** → 🔒 Private Cloud → real cluster live in ~30s, kubeconfig in a connection secret, catalog entry appears.
3. **Brownfield:** upload legacy descriptor → pre-filled wizard → target **KubeVirt VM** → 🔒 Private Cloud → real VM boots, app in catalog as `migrated`.
4. **FinOps beat:** cost dashboard splits spend private vs public via the cloud-type label.
5. Everything simulated is labeled; everything else is verifiably live (`kubectl get` on stage).

---

## Fix order

1. **Wave 0 — consolidation (P1, D2, D4, D5):** one portal, one XRD source, bootstrap points at it. Demo must still boot identically.
2. **Wave 1 — cloud-type labeling (L1):** labels + badges; zero behavioral risk, instant visual win.
3. **Wave 2 — real onboarding core (O1, O2, U2):** wizard → IIP → claims for KubeVirt + existing AKS composition; DEMO_MODE fallback preserved.
4. **Wave 3 — real local clusters (O3):** vcluster composition + connection secret + catalog registration.
5. **Wave 4 — brownfield + polish (O5, O4, U1, U3, U4, D1, D3, D6).**

Each wave keeps `bootstrap.sh → portal on :3000` working; anything risky is env-gated, never removed.

---

## Fix Status (as of 2026-07-06, branch `fix/demo-excellence`)

**Wave 0 (P1, D2, D4, D5) — already done before this session started.** Confirmed
via `git log` (commits `02252ea`…`4a67251`, same day as this review): portal
consolidated into `ipp-platform-app/backstage/`, nested legacy git repo
absorbed, XRDs/compositions canonical under `ipp-platform-compositions/`, root
cleanup done. Two stale doc/comment references fixed in passing but not
tracked further (`sonar-project.properties`, an `app-config.iip-overlay.yaml`
comment).

| ID | Finding | Status | Commit(s) |
|---|---|---|---|
| L1 | No cloud-type concept anywhere | **Fixed** | `c13d83f` (compositions), `5a5031c` (UI badge) |
| O1 | Wizard and backend are 100% mock | **Fixed** | `b4dbc9a`, `76d0f89`, `18745b9` |
| O2 | Wizard targets don't map to the platform (AWS instance types/regions) | **Fixed** | `76d0f89`, `18745b9` — real target selector (kubevirt-vm/local-cluster/aks), T-shirt sizes |
| O3 | "kind" cluster composition is a namespace, not a cluster | **Fixed** | `a87a2e4`, `162ca6d` — real vcluster composition, verified live twice |
| O4 | AKS path: real but demo-aware (no preflight) | **Fixed** | `f825cb2` — `GET /api/targets`, RBAC-scoped Azure ProviderConfig check |
| O5 | Brownfield = real YAML/descriptor upload | **Partially fixed** | `5dea626` — server-side validation endpoint (`POST /api/onboard/brownfield`, yaml.safe_load, injection-tested). Catalog-info generation attempted and **reverted** (breaks Argo's Directory-source sync — see `162ca6d`'s note); still a client-triggered upload, not auto-discovered from an external system |
| U1 | Show real state, honestly | **Partially fixed** | `2e67212` — fixed CostDashboard's hardcoded "Running" status. Broader `WhatShouldIDoNow`/dashboard `dataMode` chip rendering not revisited |
| U2 | Provisioning progress is fake theater | **Fixed** | `18745b9` — real Argo health/sync polling with phased steps + Argo CD deep link; falls back to labeled simulation only if IIP unreachable |
| U3 | Persona flow polish (CTA placement, narrative) | **Fixed** | `2e67212` — wizard promoted to primary CTA on Developer dashboard, DemoFlowPage/GettingStartedPage narrate the real flow |
| U4 | Cost panel honesty (AWS-ish pricing) | **Fixed** | `76d0f89` — T-shirt-size pricing, private (internal chargeback) vs public (Azure-ish) rate split. Still representative estimates, as intended |
| D1 | bootstrap.sh has no preflight, no incremental rebuild | **Partially fixed** | `99a4d84` — `make preflight`/`demo-up`/`demo-reset`/`demo-status` added (additive, `start`/`stop`/`status` unchanged). Hash-based image-rebuild skip in bootstrap.sh explicitly **deferred** (see commit message for why) |
| D2 | Claims must land where Argo watches; delete drifting XRD copies | **Already fixed pre-session** | Confirmed via GitOps-tree investigation (Phase 1) — `ipp-platform-compositions/` is canonical, duplicates already gone |
| D3 | Wizard state lost on refresh | **Fixed** | `18745b9` — step/state/active-claim-name persisted to `sessionStorage` |
| D4 | `InfraOnboardingClient` duplicated | **Already fixed pre-session** | Confirmed only one copy exists; legacy `infra-onboarding-backend` plugin (dead code, never mounted) deleted in `f825cb2` |
| D5 | Stray `=` file; report .mds cluttering root | **Already fixed pre-session** | Confirmed clean root, reports under `docs/reviews/` |
| D6 | No smoke test for the demo path | **Fixed (partial local verification)** | `d1a626e` — 16 IIP pytest unit tests (all passing locally); Playwright wizard spec added but could not get a fully green **local** run — guest sign-in needs a running backend, which can't start in this dev sandbox due to a pre-existing `isolated-vm` native-module issue unrelated to this work (confirmed by observing the *existing* `personas.spec.ts` fail identically) |

### Known limitations carried forward (not fixed, flagged for follow-up)

- **Catalog auto-registration for provisioned clusters** (O3/O5's "register in
  catalog" ask): needs a mechanism that doesn't collide with Argo's
  Directory-source sync of the claims tree — either a separate Gitea path +
  Backstage catalog `Location`, or IIP calling Backstage's catalog ingestion
  API directly after commit. Attempted the simple approach (commit
  catalog-info.yaml next to the claim) and reverted it live after it broke
  Argo sync — see `162ca6d`.
- **`ARGOCD_TOKEN` was never configured** in this demo cluster (secret doesn't
  exist), so IIP's `GET /api/status/{claim_name}` always returns `{"status":
  "unknown", ...}` rather than real Argo health/sync. The wizard's polling
  code handles this gracefully (shows "in progress" rather than erroring),
  but the "real progress" story won't show live phases until this is wired.
- **provider-helm's RBAC binding fragility** (found + fixed in `a87a2e4`): the
  binding now targets the ServiceAccount name the provider-helm pod actually
  runs under, but that name is Crossplane's auto-generated per-package-revision
  name and isn't stable across provider reinstalls/upgrades — re-verify after
  any `provider-helm` version bump.
- **Hash-based image rebuild skip in bootstrap.sh** (D1): explicitly deferred,
  see `99a4d84`'s commit message.
- **Full brownfield UX polish** (pre-fill wizard from the parsed descriptor,
  visually distinct "migrated" lifecycle badge): the server-side validation
  and `lifecycle: migrated`/`production` computation exist (`5dea626`) but
  aren't yet surfaced further than the existing preview table.
