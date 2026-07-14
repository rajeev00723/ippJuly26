# Security Remaining Risks — IPP_Demoselfservice

**Date:** 2026-06-25

---

## Risk 1 — dangerouslyDisableDefaultAuthPolicy: true (HIGH)

**File:** `ipp-platform-app/backstage/app-config.yaml:41`  
**Why Not Fixed:** Disabling this would require wiring up a real auth provider (GitHub, Okta, etc.) which would break the local demo that uses guest authentication  
**Manual Action Required:** Before any production deployment, set this to `false` and configure a proper auth provider  
**Risk Level:** HIGH for production; accepted for isolated local demo  
**Owner:** Platform team

---

## Risk 2 — skipTLSVerify: true for K8s Cluster (MEDIUM)

**File:** `ipp-platform-app/backstage/app-config.yaml:109`  
**Why Not Fixed:** KIND local cluster uses self-signed certs; providing real CA data is the correct fix  
**Manual Action Required:** Replace `skipTLSVerify: true` with `caData: <base64-CA-cert>` for staging/production clusters  
**Risk Level:** MEDIUM — enables MitM against Backstage→K8s API server traffic  
**Owner:** Platform team

---

## Risk 3 — nginx Frontend Dockerfile Runs as Root (MEDIUM) — **FIXED**

**File:** `ipp-platform-legacy/scripts/apps/employee-portal/frontend/Dockerfile`  
**Fix applied:** nginx now listens on port 8080 with `USER nginx` (UID 101). K8s Service keeps external port 80 → targetPort 8080. Network policies updated to allow ingress on pod port 8080.  
**Risk Level:** Resolved for demo builds; rebuild frontend image and redeploy to apply.

---

## Risk 4 — Backstage Guest Auth With No Restrictions (MEDIUM)

**File:** `ipp-platform-app/backstage/app-config.yaml:73`  
**Why Not Fixed:** Removing `guest: {}` would break the demo login personas  
**Manual Action:** In production, replace with SSO provider (GitHub, OIDC, Okta)  
**Risk Level:** HIGH if exposed publicly; MEDIUM for internal demo network  
**Owner:** Platform team

---

## Risk 5 — Crossplane PostgreSQL Password Now a Placeholder (MEDIUM)

**Files:** Both `composition-threetierapp.yaml` files  
**Why:** The placeholder `REPLACE-WITH-SECURE-PASSWORD` will cause Crossplane composition to create a Secret with that literal value if deployed without further configuration  
**Manual Action Required:** Either:
  1. Add a `postgresPassword` parameter to the XRD and patch it into the Secret via `FromCompositeFieldPath`, or
  2. Use an ExternalSecret resource to pull the password from Vault/AWS Secrets Manager/Azure Key Vault  
**Risk Level:** Medium — placeholder is obvious but still creates a weak password if deployed as-is  
**Owner:** Platform/Crossplane team

---

## Risk 6 — ARGOCD_TOKEN as Cookie Header (LOW)

**File:** `ipp-platform-app/backstage/app-config.yaml:48`  
**Why Not Fixed:** ArgoCD authentication via cookie is how ArgoCD API tokens work in this pattern  
**Manual Action:** Consider using ArgoCD API key via `Authorization: Bearer ${ARGOCD_TOKEN}` if ArgoCD version supports it. Ensure `ARGOCD_TOKEN` is rotated regularly and has minimal permissions.  
**Risk Level:** LOW — token is environment-injected, not hardcoded

---

## Risk 7 — Demo Credentials in Frontend Source (LOW)

**File:** `ipp-platform-app/backstage/packages/app/src/components/personas/PersonaLoginGate.tsx`  
**Why Not Fixed:** These are intentional demo-mode credentials displayed to demo users. They are not real credentials — they only control UI persona switching, not actual authentication.  
**Manual Action:** Mark clearly in code that these are demo-only; add `if (process.env.NODE_ENV !== 'production')` guard if the component is ever shipped in a non-demo build.  
**Risk Level:** LOW — demo-only, no real system access

---

## Risk 8 — Legacy dist/ Already Committed (LOW)

**File:** `ipp-platform-legacy/scripts/backstage/packages/app/dist/`  
**Why Not Fixed:** Cannot remove from non-git directory without knowing git history  
**Manual Action:** If this project is added to git, run `git rm -r --cached ipp-platform-legacy/scripts/backstage/packages/app/dist/` and commit the removal. The `.gitignore` entry has been added to prevent future commits.  
**Risk Level:** LOW — minified build artifacts; gitleaks false positives only

---

## Risk 9 — SPIRE Agent hostPID / hostNetwork (ACCEPTED — FALSE POSITIVE)

**File:** `ipp-platform-policies/spire/spire-agent.yaml`  
**Why Accepted:** SPIRE agent requires `hostPID` for workload attestation (to inspect host process identities) and `hostNetwork` for SPIRE-specific attestation flows. This is required functionality, not a misconfiguration.  
**Risk Level:** ACCEPTED as by-design for SPIRE architecture

---

## Risk 10 — KubeVirt DaemonSet Runs Privileged (ACCEPTED — FALSE POSITIVE)

**File:** `ipp-platform-compositions/compositions/kubevirt/arm64-mpx-fix-daemonset.yaml`  
**Why Accepted:** KubeVirt device plugin DaemonSet requires privileged access to expose `/dev/kvm` to nodes for VM support on ARM64.  
**Risk Level:** ACCEPTED as by-design for KubeVirt

---

## Risk 11 — CSP upgrade-insecure-requests: false (LOW)

**File:** `ipp-platform-app/backstage/app-config.yaml:23`  
**Why Not Fixed:** The demo runs on HTTP (`http://backstage.ipp.local`); enabling upgrade-insecure-requests would cause the browser to try HTTPS which is not configured for local KIND  
**Manual Action:** Enable in production where TLS is terminated  
**Risk Level:** LOW for internal demo; MEDIUM for internet-facing

---

## Production Recommendations Summary

1. **P0 — Before any cloud deployment:** Remove `dangerouslyDisableDefaultAuthPolicy: true` and configure real SSO
2. **P0 — Before any cloud deployment:** Set `GRAFANA_BASIC_AUTH` from a secret manager, not `.env`
3. **P1 — Before any workload provisioning:** Parameterize Crossplane PostgreSQL passwords via XRD claim parameter + ExternalSecret
4. **P1 — Ongoing:** Rotate `ARGOCD_TOKEN` and `BACKSTAGE_SESSION_SECRET` regularly
5. **P2:** Replace `skipTLSVerify: true` with real CA data for all non-local clusters
6. **P2:** Enable HTTPS for Backstage and Grafana ingress in staging/production
7. **P3:** Run `sonar-scanner` in CI with `SONAR_HOST_URL` and `SONAR_TOKEN` secrets
8. **P3:** Pin `yarn install` to the security-fixed lock file after running `yarn install` with the new resolutions
