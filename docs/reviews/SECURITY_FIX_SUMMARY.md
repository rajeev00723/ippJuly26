# Security Fix Summary — IPP_Demoselfservice

**Date:** 2026-06-25

---

## Fix 1 — Remove Hardcoded Grafana Basic-Auth Credential

**File:** `ipp-platform-app/backstage/app-config.yaml:62`  
**Vulnerability:** Hardcoded Base64 credential `YWRtaW46Z3JhZmFuYS1kZW1vLWxvY2FsLTIwMjQ=` (admin:grafana-demo-local-2024) committed in plain text  
**Fix:** Replaced with `${GRAFANA_BASIC_AUTH}` environment variable reference  
**Risk Mitigated:** Credential exposure in VCS; replay attacks against Grafana  
**Functionality Impact:** None — requires `GRAFANA_BASIC_AUTH` to be set in environment (added to `.env.example`)  
**Validation:** grep confirms no hardcoded value remains

---

## Fix 2 — Document dangerouslyDisableDefaultAuthPolicy

**File:** `ipp-platform-app/backstage/app-config.yaml:41`  
**Vulnerability:** Backstage auth policy disabled without documentation  
**Fix:** Added `# DEMO-ONLY` comment to prevent accidental production use  
**Risk Mitigated:** Operator awareness; prevents shipping to production without noticing  
**Functionality Impact:** None — flag value unchanged

---

## Fix 3 — Document skipTLSVerify

**File:** `ipp-platform-app/backstage/app-config.yaml:109`  
**Fix:** Added `# DEMO-ONLY` comment  
**Functionality Impact:** None

---

## Fix 4 — Replace Hardcoded PostgreSQL Passwords in Crossplane Compositions

**Files:**  
- `ipp-platform-compositions/compositions/appbox/composition-threetierapp.yaml:335,340`  
- `ipp-platform-legacy/scripts/crossplane/compositions/threetierapp-composition.yaml:335,340`  

**Vulnerability:** Literal password `demo-postgres-password-2024` written into a Kubernetes Secret via Crossplane composition  
**Fix:** Replaced with `REPLACE-WITH-SECURE-PASSWORD` placeholder + comment directing to ExternalSecret/Vault injection  
**Risk Mitigated:** Hardcoded database credential would be readable by anyone with K8s Secret access  
**Functionality Impact:** Demo cluster must set the password before running `kubectl apply`. The claim-watcher bootstrap script must set the real value. Add `spec.parameters.postgresPassword` to the XRD and patch from claim, or inject via ExternalSecret.

---

## Fix 5 — Restrict AIOps CORS from Wildcard to Specific Origins

**Files:**  
- `ipp-platform-legacy/scripts/aiops/app/main.py:84-90`  
- `ipp-platform-legacy/scripts/aiops/app/config.py` (new `cors_allowed_origins` field)

**Vulnerability:** `allow_origins=["*"]` + `allow_credentials=True` — per RFC 6454 this combination is rejected by browsers and is a security misconfiguration; any origin could make credentialed requests in environments where the wildcard was accepted  
**Fix:** Origins now read from `CORS_ALLOWED_ORIGINS` env var (comma-separated); default includes Backstage local URLs. Methods restricted to `GET, POST, OPTIONS`. Headers restricted to `Authorization, Content-Type, Accept`.  
**Risk Mitigated:** CORS misconfiguration, credential exposure to arbitrary origins  
**Functionality Impact:** None for the demo — Backstage origin is in the default list. Set `CORS_ALLOWED_ORIGINS` if a custom host is used.

---

## Fix 6 — Add Non-Root USER to Backstage Dockerfile

**File:** `ipp-platform-legacy/scripts/backstage/Dockerfile`  
**Vulnerability:** Container ran as root  
**Fix:** Added `addgroup/adduser` and `USER nodeuser` before CMD  
**Risk Mitigated:** Container escape to host root  
**Functionality Impact:** None — Backstage backend does not require root

---

## Fix 7 — Add Non-Root USER to Employee-Portal Backend Dockerfile

**File:** `ipp-platform-legacy/scripts/apps/employee-portal/backend/Dockerfile`  
**Vulnerability:** Go binary ran as root in Alpine  
**Fix:** Added `addgroup/adduser appuser` and `USER appuser` before CMD  
**Risk Mitigated:** Container escape to host root  
**Functionality Impact:** None — Go binary binds to port 8080 (unprivileged)

---

## Fix 8 — Add securityContext to K8s Deployments

**Files:**  
- `ipp-platform-app/backstage/deploy/base/aiops/deployment.yaml`  
- `ipp-platform-app/backstage/deploy/base/backstage/deployment.yaml`

**Fix:** Added pod-level `securityContext` (`runAsNonRoot: true`, `runAsUser: 1001`, `fsGroup: 1001`) and container-level `securityContext` (`allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]`)  
**Risk Mitigated:** Privilege escalation inside container; kernel capability abuse  
**Functionality Impact:** None — both services run fine as non-root

---

## Fix 9 — Add Liveness Probe to AIOps Deployment

**File:** `ipp-platform-app/backstage/deploy/base/aiops/deployment.yaml`  
**Fix:** Added `livenessProbe` hitting `/health`  
**Risk Mitigated:** Undetected deadlock/hang in production; failed checkov check CKV_K8S_8  
**Functionality Impact:** None — `/health` endpoint already exists

---

## Fix 10 — Upgrade Vulnerable Python Dependencies

**File:** `ipp-platform-legacy/scripts/aiops/requirements.txt`

| Package | Old | New | CVEs Fixed |
|---------|-----|-----|------------|
| fastapi | ==0.111.0 | >=0.115.0 | Pulls in starlette >=1.3.1 |
| starlette | (transitive) 0.37.2 | >=1.3.1 | PYSEC-2026-161, CVE-2024-47874, 8+ more |
| aiohttp | ==3.9.5 | >=3.14.1 | 30+ CVEs including request smuggling, DoS, path traversal |
| jinja2 | ==3.1.4 | >=3.1.6 | CVE-2024-56326, CVE-2024-56201, CVE-2025-27516 (sandbox escape) |

**Functionality Impact:** Minimal — API interfaces are backward-compatible across these ranges. Run `pip install -r requirements.txt` to apply.

---

## Fix 11 — Add Yarn Resolutions for Vulnerable Node.js Packages

**File:** `ipp-platform-app/backstage/package.json`

| Package | Min Fixed Version | CVEs |
|---------|------------------|------|
| koa | >=2.16.4 | CRITICAL ReDoS + Host Header Injection |
| tar | >=7.5.11 | Path traversal, symlink poisoning |
| minimatch | >=9.0.7 | ReDoS |
| ws | >=8.21.0 | DoS via memory exhaustion |
| underscore | >=1.13.8 | DoS |
| vm2 | >=3.11.4 | CRITICAL sandbox escape |
| undici | >=7.28.0 | DoS, info disclosure |

**Functionality Impact:** None — resolutions force minimum safe versions for transitive dependencies. Run `yarn install` to apply.

---

## Fix 12 — Add .gitignore for Legacy Build Artifacts

**File:** `ipp-platform-legacy/.gitignore`  
**Fix:** Added entries for `scripts/backstage/packages/app/dist/`, `packages/backend/dist/`, and `node_modules/`  
**Risk Mitigated:** Minified build artifacts containing false-positive secret patterns being tracked in git; prevents gitleaks false positives

---

## Fix 13 — Shellcheck SC2261 in bootstrap.sh

**File:** `ipp-platform-legacy/scripts/bootstrap.sh:1213`  
**Vulnerability:** Competing stderr redirections caused ambiguous shell behavior  
**Fix:** Removed the competing `2>/dev/null` on the `kubectl exec` line (kept the one on wget and python3 which are sufficient)  
**Functionality Impact:** None

---

## Fix 14 — Add GRAFANA_BASIC_AUTH to .env.example

**File:** `.env.example`  
**Fix:** Added documented variable with local demo default value and clear warning about production use  
**Functionality Impact:** None

---

## Fix 16 — Docker Image Vulnerability Hardening (2026-06-25)

**kindest/node upgrade:** `v1.32.2` → `v1.32.11` (digest-pinned); auto-selects `v1.36.1` when kind >= 0.32.0  
**CVE reduction (trivy, ignore-unfixed):** v1.32.2: ~942 → v1.32.11: ~647 → v1.36.1: ~211  

**Files:**  
- `ipp-platform-legacy/scripts/kind/kind-config.yaml`  
- `ipp-platform-legacy/scripts/bootstrap.sh`  
- `ipp-platform-legacy/scripts/docker/images.env` (new)  
- `ipp-platform-legacy/scripts/security/scan-docker-images.sh` (new)  

**Application Dockerfile upgrades:**  
- Backstage: `node:22.14-alpine3.21` + `apk upgrade`  
- Employee backend: `golang:1.23-alpine3.21`, `alpine:3.21`  
- Employee frontend: `nginx:1.27-alpine3.21`, non-root on port 8080  
- AIOps: `python:3.12-slim-bookworm` + `apt-get upgrade`  

**Makefile:** `make scan-images` target added  

**Apply cluster fix:**  
```bash
brew upgrade kind          # >= 0.32.0 recommended
kind delete cluster --name ipp-local
cd ipp-platform-legacy && make start
```

**Functionality Impact:** Frontend pod port changed to 8080 (Service still exposes 80). Rebuild custom images after Dockerfile changes.

---

## Fix 15 — Create sonar-project.properties

**File:** `sonar-project.properties` (new)  
**Purpose:** Enables future SonarQube/SonarCloud scanning with correct exclusion patterns  
**Functionality Impact:** None
