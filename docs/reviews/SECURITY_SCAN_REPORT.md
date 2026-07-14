# Security Scan Report — IPP_Demoselfservice

**Date:** 2026-06-25  
**Repo:** `/Users/amitabhsharan/project/IPP_Demoselfservice`  
**Scanned by:** Claude Code (automated local security audit)

---

## Tools Installed

| Tool | Version | Purpose |
|------|---------|---------|
| semgrep | latest | SAST — multi-language |
| gitleaks | latest | Secret scanning |
| trivy | latest | Filesystem + dependency CVEs |
| grype | 0.114.0 | Dependency CVEs |
| syft | 1.45.1 | SBOM generation |
| hadolint | latest | Dockerfile linting |
| checkov | latest | K8s/IaC security |
| kube-linter | 0.8.3 | K8s manifest linting |
| shellcheck | latest | Shell script analysis |
| yamllint | latest | YAML linting |
| bandit | latest | Python SAST |
| pip-audit | latest | Python dependency CVEs |
| detect-secrets | latest | Secret pattern detection |

## Tools Unavailable

- `sonar-scanner` — SONAR_HOST_URL and SONAR_TOKEN not set; `sonar-project.properties` created for future use
- `terrascan` — no Terraform IaC detected; skipped
- `kubesec` — not in brew by default; checkov used instead
- `pip3 install --user` required `--break-system-packages` on macOS Python 3.14

---

## Commands Run

```bash
gitleaks detect --no-git --source . --report-format json
detect-secrets scan --all-files
semgrep scan --config=auto --json
bandit -r ipp-platform-legacy/scripts/aiops/app/ -f json
pip-audit -r ipp-platform-legacy/scripts/aiops/requirements.txt
yarn audit --json  (ipp-platform-app/backstage)
trivy fs . --severity HIGH,CRITICAL
hadolint <all Dockerfiles>
checkov -d ipp-platform-app/backstage/deploy --framework kubernetes
shellcheck scripts/bootstrap.sh scripts/destroy.sh
```

---

## Findings by Severity

### CRITICAL

| # | Finding | File | Tool |
|---|---------|------|------|
| C1 | Hardcoded Grafana Basic-Auth credential (`admin:grafana-demo-local-2024`) embedded as Base64 in proxy config | `ipp-platform-app/backstage/app-config.yaml:62` | Manual review |
| C2 | Hardcoded PostgreSQL password `demo-postgres-password-2024` written into a K8s Secret via Crossplane composition | `ipp-platform-compositions/compositions/appbox/composition-threetierapp.yaml:335,340` | detect-secrets + manual |
| C3 | Same hardcoded PostgreSQL password in legacy composition copy | `ipp-platform-legacy/scripts/crossplane/compositions/threetierapp-composition.yaml:335,340` | detect-secrets |
| C4 | `vm2` sandbox escape CVE-2026-47131, CVE-2026-47137, CVE-2026-47140, CVE-2026-47208, CVE-2026-47210 (fix: 3.11.4) | `ipp-platform-legacy/scripts/backstage/node_modules/vm2` | trivy |

### HIGH

| # | Finding | File | Tool |
|---|---------|------|------|
| H1 | Wildcard CORS `allow_origins=["*"]` combined with `allow_credentials=True` — browsers reject this; also exposes API to any origin | `ipp-platform-legacy/scripts/aiops/app/main.py:86` | semgrep |
| H2 | Backstage Dockerfile runs final stage as root (no USER) | `ipp-platform-legacy/scripts/backstage/Dockerfile:34` | semgrep |
| H3 | Employee-portal backend Dockerfile runs as root | `ipp-platform-legacy/scripts/apps/employee-portal/backend/Dockerfile` | semgrep |
| H4 | `aiohttp==3.9.5` — 25+ CVEs including request smuggling, DoS, path traversal (fix: >=3.14.1) | `requirements.txt` | pip-audit |
| H5 | `jinja2==3.1.4` — sandbox escape CVEs (fix: >=3.1.6) | `requirements.txt` | pip-audit |
| H6 | `starlette==0.37.2` — request smuggling, host header injection (fix: >=1.3.1) | transitive from fastapi | pip-audit |
| H7 | `koa@2.15.3` CRITICAL — ReDoS + Host Header Injection (fix: >=2.16.4) | `ipp-platform-app/backstage` lockfile | yarn audit |
| H8 | `tar@6.2.1` — multiple path traversal CVEs (fix: >=7.5.11) | backstage lockfile | yarn audit |
| H9 | `minimatch@9.0.3` — multiple ReDoS CVEs (fix: >=9.0.7) | backstage lockfile | yarn audit |
| H10 | `ws@8.18.0` — DoS via memory exhaustion (fix: >=8.21.0) | backstage lockfile | yarn audit |
| H11 | `undici@7.25.0` — CRITICAL DoS CVEs (fix: >=7.28.0) | backstage lockfile | trivy |
| H12 | `dangerouslyDisableDefaultAuthPolicy: true` — disables all Backstage backend auth | `app-config.yaml:41` | Manual |
| H13 | `skipTLSVerify: true` for Kubernetes cluster | `app-config.yaml:109` | Manual |
| H14 | K8s deployments (aiops, backstage) missing `securityContext` / `runAsNonRoot` | `deploy/base/` | semgrep/checkov |
| H15 | Shell SC2261 — competing stderr redirections in bootstrap.sh | `bootstrap.sh:1213` | shellcheck |

### MEDIUM

| # | Finding | File | Tool |
|---|---------|------|------|
| M1 | Demo credentials hardcoded in frontend component (`Dev@IPP2025`, etc.) — intentional for demo but must not ship to production | `PersonaLoginGate.tsx` | detect-secrets |
| M2 | `underscore@1.13.6` — DoS via unlimited recursion (fix: >=1.13.8) | backstage lockfile | yarn audit |
| M3 | SPIRE agent uses `hostPID: true` / `hostNetwork: true` | `spire-agent.yaml` | semgrep |
| M4 | KubeVirt arm64 DaemonSet runs privileged with `hostPID` | `arm64-mpx-fix-daemonset.yaml` | semgrep |
| M5 | Hubble relay/UI missing securityContext | `hubble-aks.yaml` | semgrep |
| M6 | CSP `upgrade-insecure-requests: false` — allows mixed content | `app-config.yaml:23` | Manual |
| M7 | ARGOCD_TOKEN passed as Cookie header in proxy — acceptable but should use bearer if ArgoCD supports it | `app-config.yaml:48` | Manual |
| M8 | gitleaks found `generic-api-key` pattern in minified JS build artifact in legacy dist/ | `ipp-platform-legacy/scripts/backstage/packages/app/dist/` | gitleaks |

### INFO / LOW

- Bandit B110 (try/except/pass) in multiple AIOps files — intentional error suppression in optional collectors
- Bandit B101 (assert in tests) — standard pytest pattern; not a security issue
- Backstage app-config.yaml CORS origin is HTTP not HTTPS — expected for local KIND demo
- Multiple Crossplane Providers and policies missing `runAsNonRoot` — cluster-level controllers; acceptable for this demo

---

## Secret Scan Results

- **gitleaks**: 2 findings — both in `dist/` static JS files (minified xterm.js). False positives — a hex string matches the generic-api-key pattern. Not real secrets.
- **detect-secrets**: Flagged demo credentials in `PersonaLoginGate.tsx` — intentional demo-mode credentials, not real secrets. Also flagged K8s composition YAML passwords — real finding (fixed).
- **Grafana Basic-Auth**: Real credential found in `app-config.yaml` (fixed).
- **PostgreSQL password**: Real hardcoded password in Crossplane composition (fixed with placeholder).

---

## SonarQube Status

- `sonar-project.properties` created at repo root.
- Neither `SONAR_HOST_URL` nor `SONAR_TOKEN` are available in the current environment.
- To run: `sonar-scanner -Dsonar.host.url=$SONAR_HOST_URL -Dsonar.token=$SONAR_TOKEN`

---

## Backstage-Specific Findings

| Finding | Severity | Fixed |
|---------|----------|-------|
| Hardcoded Grafana Basic-Auth in proxy | CRITICAL | YES |
| `dangerouslyDisableDefaultAuthPolicy: true` | HIGH | DOCUMENTED |
| `skipTLSVerify: true` for K8s | MEDIUM | DOCUMENTED |
| Guest auth provider with no restrictions | MEDIUM | Demo-only, documented |
| All secrets sourced from env vars except Grafana | OK | Fixed |

---

## Docker Findings

| File | Issue | Severity | Fixed |
|------|-------|----------|-------|
| backstage/Dockerfile | No USER directive | HIGH | YES |
| apps/employee-portal/backend/Dockerfile | No USER directive | HIGH | YES |
| apps/employee-portal/frontend/Dockerfile | nginx runs as root | MEDIUM | Remaining (see risks) |
| aiops/Dockerfile | Already has non-root USER | OK | N/A |

---

## K8s / IaC Findings

| Finding | Fixed |
|---------|-------|
| aiops deployment: missing securityContext | YES |
| backstage deployment: missing securityContext | YES |
| aiops deployment: missing livenessProbe | YES |
| SPIRE agent: hostPID/hostNetwork | False positive — required by SPIRE |
| KubeVirt DaemonSet: privileged | Required for KubeVirt device plugin |
| Crossplane provider-helm/kubernetes: missing runAsNonRoot | Low risk — managed by Crossplane operator |

---

## False Positives

| Finding | Reason |
|---------|--------|
| gitleaks findings in `dist/*.js` | Hex strings in minified xterm.js match generic-api-key pattern; not real secrets |
| Bandit B101 in test files | Standard pytest assert usage |
| SPIRE agent hostPID/hostNetwork | SPIRE agent must see host process tree for workload attestation |
| KubeVirt DaemonSet privileged | Required for KVM device plugin access |
| PersonaLoginGate.tsx "Secret Keyword" | Intentionally visible demo credentials displayed to demo users |
