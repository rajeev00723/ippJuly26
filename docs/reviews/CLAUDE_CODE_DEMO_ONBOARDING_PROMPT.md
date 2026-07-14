# Claude Code Prompt — Demo Excellence: Real Onboarding, Cloud Labeling, UX, Consolidation

Usage: `cd /Users/amitabhsharan/project/IPP_Demoselfservice && claude`, start in **plan mode** (Shift+Tab), paste the prompt below.

---

```
You are acting simultaneously as: a Backstage expert, hybrid cloud architect, security
architect, Upbound Crossplane principal engineer, enterprise GitOps expert, zero-trust
expert, and UX expert.

CONTEXT
IPP is a platform-engineering DEMO (Backstage + Crossplane + Argo CD + KubeVirt + IIP Node
middleware). Goal: demo excellence, NOT production hardening. Read these first, in order:
1. DEMO_IMPROVEMENT_REVIEW.md — your seed findings (P1, O1–O5, L1, U1–U4, D1–D6) and the
   approved wave plan. Independently verify every finding before acting on it.
2. PRODUCTION_READINESS_REVIEW.md — prior security/prod review. OUT OF SCOPE for fixes in
   this session, but do not make any of its findings worse.

APPROVED DECISIONS (do not re-litigate)
- Onboarding must be FULLY REAL for all three targets: KubeVirt VM, local cluster, AKS.
- Local "kind" clusters are implemented as vcluster (real API server via provider-helm
  Release), replacing the kind-cluster-sim namespace composition. Keep the sim only behind
  DEMO_MODE.
- Brownfield onboarding = YAML/descriptor upload → parsed server-side by IIP → generates
  claim + catalog-info.yaml → same git/Argo flow, catalog lifecycle: migrated.
- Live AKS provisioning is allowed (Azure creds exist) but must be async-friendly in UX.
- Portal consolidation FIRST: move the working portal from
  ipp-platform-legacy/scripts/backstage/ into ipp-platform-app/backstage/, absorb the
  nested .git, repoint bootstrap.sh, then delete the legacy copy.
- Cloud-type labeling: kubevirt + vcluster ⇒ platform.ipp.dhl.com/cloud-type: private;
  aks ⇒ public. Label lands on compositions/XRs/composed resources, XRD printer columns,
  and UI badges (🔒 Private Cloud / ☁️ Public Cloud) in wizard, MyResources, cost views,
  catalog.

HARD CONSTRAINTS — NON-NEGOTIABLE
1. Do NOT break existing functionality. After every wave the demo must still work:
   ipp-platform-legacy/scripts/bootstrap.sh (or its consolidated successor) → Backstage
   on :3000 → scaffolder → IIP → git claim → Argo sync. After Wave 0, bootstrap must
   build the consolidated portal and produce an identical-looking running demo.
2. DEMO_MODE=true must always provide a full offline demo path (simulated responses,
   visibly labeled with the existing DemoChip pattern). Realness is added, never swapped
   in destructively.
3. Never print, commit, or relocate .env.local contents. Never weaken .gitignore.
   No credentials in compositions, code, or logs.
4. Feature branch fix/demo-excellence. Small atomic commits, conventional-commit messages
   tagged with finding IDs, e.g. "feat(onboarding): O2 target selector mapped to claims".
5. Run the verification suite (below) after EVERY wave before continuing.
6. Ask me before: deleting any directory >50 files, changing any XRD served version,
   or anything that changes bootstrap.sh CLI flags.

PHASE 1 — REVIEW (read-only)
- Verify every finding in DEMO_IMPROVEMENT_REVIEW.md against the code (file:line).
- Sweep for additional demo-relevant issues:
  a. Onboarding path: wizard → InfraOnboardingClient (all mock TODO[ENTERPRISE]) →
     legacy infra-onboarding-backend router (InMemoryStore). Map every mock method to its
     real IIP counterpart (services/iip/src/routes/provision.ts, lib/xrBuilder.ts).
     Confirm xrBuilder covers IPPClusterClaim/IPPVirtualMachineClaim field-for-field with
     the XRDs in ipp-platform-compositions/apis/ (schema mismatches = findings).
  b. UX: AWS-isms (t3.*, us-east-1) in types.ts; timer-driven fake progress; refresh
     losing wizard state; missing target availability preflight; mock vs real
     indistinguishable anywhere in dashboards.
  c. Crossplane: composition-kind-local.yaml is a namespace sim; AKS composition
     readiness/connection-secret wiring; where cloud-type labels must be patched.
  d. GitOps: which tree Argo actually watches for claims; ensure onboarding writes only
     there; locate all duplicate XRD copies slated for deletion (gitops/xrds/,
     ipp-platform-legacy/scripts/crossplane/).
  e. Consolidation blast radius: everything bootstrap.sh, Dockerfiles, kustomize overlays,
     and catalog locations reference under ipp-platform-legacy/scripts/backstage/.
- Output: findings table — ID | Severity | File:line | Issue | Proposed fix | Demo-break
  risk (None/Low only; anything higher must be env-gated) — plus a wave-by-wave plan
  refining the one in DEMO_IMPROVEMENT_REVIEW.md.
- STOP. Present table + plan. WAIT FOR MY EXPLICIT APPROVAL before any edit.

PHASE 2 — FIX (after approval, wave by wave; stop for re-approval between waves)

Wave 0 — Consolidation (P1, D2, D4, D5)
- Move working portal (packages/, plugins/, catalog/, app-config*.yaml, Dockerfile,
  e2e/) from ipp-platform-legacy/scripts/backstage/ → ipp-platform-app/backstage/,
  merging with (not clobbering) the newer App.tsx/persona components there; resolve
  divergence by diff, preferring the version the running demo uses unless the newer one
  is a strict superset.
- Absorb the nested git repo (remove ipp-platform-legacy/scripts/.git after confirming
  no unpushed commits — list them for me if any exist). node_modules never enters the
  outer repo.
- Repoint bootstrap.sh BACKSTAGE_DIR; fix catalog locations that reach into legacy
  (templates.yaml relative paths).
- Delete duplicate XRD/composition copies in gitops/xrds/ and
  ipp-platform-legacy/scripts/crossplane/ ONLY after proving Argo watches
  ipp-platform-compositions/ (show me the Application/AppSet that covers them).
- Delete stray "=" file; move root report .md files to docs/reviews/.
- VERIFY: full bootstrap on a fresh kind cluster; portal on :3000; scaffolder flow works.

Wave 1 — Cloud-type labeling (L1)
- Compositions patch platform.ipp.dhl.com/cloud-type onto XR + composed resources
  (kubevirt=private, kind-local/vcluster=private, aks=public).
- XRDs: status.cloudType + additionalPrinterColumns CLOUD.
- UI: shared <CloudTypeBadge/> in the design system; render in wizard review step,
  MyResources, CostDashboard, catalog entity page.
- VERIFY: kubectl get ippclusterclaims shows CLOUD column; badges render.

Wave 2 — Real onboarding core (O1, O2, U2, part of O4)
- Replace InfraOnboardingClient mock methods with real calls through the Backstage
  backend proxy to IIP (/api/provision, /api/provision/:id). Delete the legacy
  infra-onboarding-backend InMemoryStore plugin.
- Rework wizard Step 3 into the target selector (KubeVirt VM | Local cluster (vcluster) |
  AKS) with T-shirt sizes mapped to claim fields; purge AWS instance types/regions;
  Azure regions for AKS only.
- IIP: add GET /api/targets preflight (azure creds present? kubevirt CRDs? vcluster chart
  reachable?) — wizard disables unavailable targets with honest tooltips.
- Event-driven progress: poll provision status (Argo webhook already feeds it); render
  real phases + failure states with Crossplane condition messages + Argo deep link.
- DEMO_MODE: all of the above short-circuits to labeled simulation.
- Persist wizard state + active provisioning id in sessionStorage (D3).
- VERIFY: KubeVirt VM onboarding end-to-end on kind; AKS claim written + async status
  visible (do NOT wait for full AKS provisioning in the verify loop).

Wave 3 — Real local clusters (O3)
- New composition ipp-composition-cluster-vcluster (provider-helm Release, loft vcluster
  chart, pinned version): claim → real vcluster in ~30s; kubeconfig into the claim's
  connection secret; readiness from Release status.
- Composition-selection label (platform.ipp.dhl.com/target: local → vcluster) replacing
  the sim; keep kind-cluster-sim composition selectable only when DEMO_MODE=true.
- Register provisioned cluster in catalog (kind: Resource, type: kubernetes-cluster,
  cloud-type annotation).
- VERIFY: claim → vcluster Ready; kubectl --kubeconfig <connection-secret> get ns works.

Wave 4 — Brownfield + polish (O5, O4 rest, U1, U3, U4, D1, D6)
- YamlUpload → POST to IIP /api/onboard/brownfield: server-side YAML parse with strict
  schema validation (js-yaml safe load; reject non-allowlisted kinds; no YAML injection
  through the request→claim path — treat all fields as data, never templates), derive
  claim + catalog-info.yaml (lifecycle: migrated), pre-fill wizard for confirmation,
  then the normal git flow.
- Developer dashboard primary CTA "Onboard an application"; update DemoFlowPage +
  GettingStartedPage steps to the real onboarding narrative.
- DemoChip on every remaining simulated element; re-base PRICING on T-shirt sizes
  (internal rate for private, Azure-ish for public), labeled as estimates.
- Makefile: demo-up / demo-reset / demo-status with preflight checks (Docker memory,
  ports, ollama model); hash-based image rebuild skip in bootstrap.
- Tests: Playwright spec wizard→(mock IIP)→ready; IIP unit test wizard payload→claim
  YAML golden files for all three targets.
- VERIFY: full suite + fresh-cluster bootstrap + brownfield upload demo.

VERIFICATION SUITE (run after every wave)
1. cd <portal> && yarn tsc --noEmit && yarn lint && yarn test (if configured)
2. cd services/iip && npm test && npx tsc --noEmit
3. kubeconform/kubectl --dry-run=client on all changed YAML; crossplane beta validate on
   changed XRDs/compositions if the CLI is available
4. Fresh KIND bootstrap smoke: portal :3000 loads, scaffolder path works, wizard loads
5. git status clean of secrets: rg -n "ghp_|AKIA|password:" on the diff (report, don't
   auto-fix, if hits are pre-existing)

REPORTING
After each wave: what changed (commits), verification results, any finding whose fix you
deferred and why. At the end: update DEMO_IMPROVEMENT_REVIEW.md marking each finding
Fixed/Deferred with commit refs.
```

---

## Notes for you (not part of the prompt)

- **Run waves in separate sessions** if context runs long; the prompt is resumable — tell Claude Code which wave to start from and that prior waves are merged.
- **Wave 0 is the risky one** (big file moves). Have a clean `git stash`/branch state and ~20 min for a fresh bootstrap verify.
- **AKS costs money**: Wave 2's verify only checks the claim/status path. Do one manual live AKS run before the actual demo day.
- vcluster chart pull needs network on demo day unless you pre-pull it into the kind cluster during bootstrap — the prompt's Wave 4 Makefile work is a good place to add that (`demo-up` pre-pulls).
