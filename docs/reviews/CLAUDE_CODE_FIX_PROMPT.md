# Claude Code Prompt — Holistic Review & Fix

Usage: `cd /Users/amitabhsharan/project/IPP_Demoselfservice && claude`, then paste the prompt below.
Recommended: start in **plan mode** (Shift+Tab) so nothing is changed before you approve.

---

```
You are acting simultaneously as: a Backstage expert, a hybrid cloud architect, a security
architect, an Upbound Crossplane principal engineer, an enterprise GitOps expert, and a
zero-trust security expert.

CONTEXT
This repo is IPP — a platform-engineering demo (Backstage + Crossplane + Argo CD + Kyverno/
Gatekeeper + SPIRE/Cilium + IIP Node middleware) that must become production-grade. A prior
review exists at PRODUCTION_READINESS_REVIEW.md — read it first and treat its findings
(S1–S8, G1–G3, C1–C4, B1–B3, D1–D8) as your seed list, then independently verify each one
and hunt for anything it missed.

HARD CONSTRAINTS — NON-NEGOTIABLE
1. Do NOT break any existing functionality. The local KIND demo flow
   (ipp-platform-legacy/scripts/bootstrap.sh → Backstage on :3000 → scaffolder → IIP →
   Git claim → Argo CD sync) must keep working exactly as today.
2. Demo-mode behavior is preserved via environment flags or config overlays
   (local vs production), never by deleting demo capability.
3. Never print, commit, or move the contents of .env.local. Never weaken .gitignore.
4. Work in a feature branch (fix/production-readiness). Small, atomic commits,
   conventional-commit messages, one finding-ID per commit (e.g. "fix(iip): S1 fail-closed
   webhook signature verification").
5. After EVERY wave, run the verification suite (defined below) before continuing.

PHASE 1 — REVIEW (read-only, no edits)
- Re-verify every finding in PRODUCTION_READINESS_REVIEW.md against the actual code.
- Sweep for additional issues in these areas:
  a. Security: fail-open logic, missing authn/authz, secrets in code or history,
     injection risks in the IIP request→YAML path (xrBuilder.ts — check that user input
     cannot inject YAML or path-traverse claimDirPath), SSRF in proxies, unpinned images.
  b. Backstage: app-config correctness, catalog location integrity, plugin wiring,
     permission framework, scaffolder template input validation.
  c. Crossplane: XRD schema strictness, composition correctness, duplicate definitions,
     provider/function version pinning, connection-secret flows.
  d. GitOps: source-of-truth conflicts, AppProject scoping, sync-wave ordering,
     prune blast radius, targetRevision pinning.
  e. Zero trust: default-deny coverage per namespace, SPIFFE identity usage,
     policy enforcement mode, TLS everywhere.
  f. Tech debt: dead code, duplication (gitops/ vs ipp-platform-compositions/ vs
     ipp-platform-legacy/scripts/crossplane/), stray files, nested git repo at
     ipp-platform-legacy/scripts/.git, missing tests, missing CI.
- Produce a findings table: ID | Severity | File:line | Issue | Proposed fix | Risk of fix
  breaking demo (None/Low — anything higher needs an env-gated approach).
- STOP and present the table plus a wave-by-wave fix plan. WAIT FOR MY EXPLICIT APPROVAL
  before editing anything.

PHASE 2 — FIX (only after approval, wave by wave)

Wave 1 — Security-critical (no functional impact):
- S1: webhook.ts — fail closed when secret/header missing; verify HMAC over the raw body
  (express.json verify hook to capture rawBody); length-guard timingSafeEqual.
- S2: provision routes — require a bearer token (IIP_API_TOKEN env; if unset AND
  DEMO_MODE=true, log a loud warning and allow — preserving the demo); add
  express-rate-limit; validate request bodies with zod.
- S3: gitWriter.ts — remove PAT from clone URL (use http.extraHeader auth); make PR
  auto-merge conditional: env=dev auto-merges, staging/prod leaves PR open for human
  review (IIP_AUTO_MERGE_ENVS env, default "dev" — set to "dev,staging,prod" in demo
  .env.example to preserve current behavior); delete the push-directly-to-main fallback,
  fail with a clear error instead.
- S4: composition-threetierapp.yaml — replace the hardcoded password with a generated
  per-claim secret (Crossplane connection secret or a generated K8s Secret via
  provider-kubernetes); apply the same fix to the legacy copy.
- S7: add gitleaks config + pre-commit hook + CI step; run gitleaks over full git history
  and report (do not rewrite history yourself — report if rotation is needed).
- D1: delete the stray "=" file at repo root.

Wave 2 — Structure & source of truth:
- G1/C1: consolidate XRDs/compositions to ipp-platform-compositions as sole authority;
  make gitops/xrds and gitops/compositions consume or reference them (if Argo CD needs
  them under gitops/, generate via kustomize resource references, not hand-copies);
  mark the legacy third copy deprecated. Verify with kustomize build / kubeconform.
- G2: create/harden AppProject for the gitops tree (sourceRepos allow-list, destination
  scoping, clusterResourceWhitelist for CRDs/XRDs only where needed); replace
  targetRevision: HEAD with main; split XRD/composition sync from claims sync.
- B1: move templates-consolidated.yaml and templates-iip.yaml into
  ipp-platform-app/backstage/catalog/ and update templates.yaml targets; keep the old
  files with a deprecation note so legacy scripts still work.
- S5: split Backstage config into app-config.yaml (secure defaults: auth policy ON,
  skipTLSVerify false) + app-config.local.yaml (demo overrides: guest auth,
  dangerouslyDisableDefaultAuthPolicy, skipTLSVerify) + app-config.production.yaml
  (OIDC placeholder, Redis cache, TLS). Update deploy overlays and bootstrap script so
  the local demo loads the local overlay and behaves identically to today.

Wave 3 — Guardrails:
- D5: add .github/workflows/ci.yaml at repo root: yamllint, kubeconform (with Crossplane
  CRD schemas skipped or supplied), conftest against ipp-platform-policies/conftest,
  gitleaks, trivy config scan, crossplane beta validate for XRDs/compositions,
  npm test + tsc --noEmit for services/iip.
- S6: Kyverno — parameterize validationFailureAction: enforce for prod-labeled
  namespaces, audit elsewhere (use two policy variants or namespaceSelector).
- D4: pin all :latest images to specific tags; align hubble-ui versions; add a comment
  where a digest should be added for prod.
- D6: add renovate.json (group Backstage packages, pin GitHub Actions by SHA).

Wave 4 — Robustness:
- G3: persist provisioningStore (SQLite or Postgres via env; in-memory fallback when
  DEMO_MODE=true); correlate webhooks strictly by the iip.dhl.com/provisioning-id
  annotation; remove the substring fallback.
- D7: services/iip — add unit tests (webhook signature happy/sad paths, xrBuilder golden
  YAML snapshots, provision validation), helmet, graceful shutdown (SIGTERM), and a
  multi-stage non-root distroless Dockerfile.
- C2: tighten XRD schemas (remove x-kubernetes-preserve-unknown-fields where safe, add
  enums/patterns) — ONLY where existing claims in ipp-platform-claims/ and gitops/
  manifests still validate; prove it by validating every existing claim file against
  the new schemas.
- B2: Backstage prod overlay — Redis cache config, techdocs external publisher config
  (values via env), enable permission framework behind a flag defaulted off for demo.

VERIFICATION SUITE (run after every wave)
- yamllint on all changed YAML; kubeconform on all k8s manifests.
- kustomize build on every kustomization touched.
- crossplane beta validate (or kubectl --dry-run=client) on all XRDs/compositions/claims.
- cd services/iip && npx tsc --noEmit && npm test (once tests exist).
- Validate every file in ipp-platform-claims/ and gitops/manifests/ still passes schema.
- grep the diff for any secret-like strings before each commit.
- Confirm bootstrap.sh is untouched or its changes are demo-equivalent (explain any edit).

PHASE 3 — REPORT
Write FIX_REPORT.md: per finding — status (fixed/deferred/needs-human), files changed,
how demo behavior was preserved, and any follow-ups requiring human action (PAT rotation,
SSO wiring, real cluster CA data, repo split). List anything you found beyond the seed
review. Then stop — do not push or open PRs unless I ask.
```
