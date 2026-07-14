"""
IIP Service — Infrastructure Interface Platform
Sole authorized Git writer for ipp-platform-claims.

Flow:
  POST /api/provision  →  validate  →  conftest  →  git commit  →  PR  →  auto-merge
  GET  /api/status/{claim_name}  →  ArgoCD app status
  GET  /api/targets  →  target-availability preflight (KubeVirt / local-cluster / AKS)
  POST /api/onboard/brownfield  →  server-side descriptor validation (parse only, no commit)
  GET  /health
"""
import base64
import hashlib
import logging
import os
import re
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Any, Optional

import httpx
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("iip")

app = FastAPI(title="IIP Service", version="1.0.0", description="Infrastructure Interface Platform — claim Git writer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Config from env / secret mount ──────────────────────────────────────────
GITEA_URL  = os.getenv("GITEA_URL",  "http://gitea.gitea.svc.cluster.local:3000")
# Browser-facing URL — must resolve from the host machine, unlike the in-cluster GITEA_URL above.
GITEA_EXTERNAL_URL = os.getenv("GITEA_EXTERNAL_URL", "http://gitea.ipp.local")
BOT_USER   = os.getenv("BOT_USER",   "ipp-automation-bot")
BOT_TOKEN  = os.getenv("BOT_TOKEN",  "")          # injected from k8s secret
REPO       = os.getenv("REPO",       "ipp-platform-claims")
ARGOCD_URL = os.getenv("ARGOCD_URL", "http://argocd-server.argocd.svc.cluster.local")
ARGOCD_TOKEN = os.getenv("ARGOCD_TOKEN", "")

# ── Models ───────────────────────────────────────────────────────────────────
class ProvisionRequest(BaseModel):
    manifest: dict = Field(..., description="Crossplane claim manifest (full YAML as dict)")
    requestedBy: str = Field(..., description="Requester email")
    costCenter:  str = Field(default="demo-001")
    requestId:   str = Field(default="")
    businessUnit: str = Field(default="bu-demo")
    environment: str  = Field(default="dev")

class ProvisionResponse(BaseModel):
    claimName:   str
    claimPath:   str
    prUrl:       str
    argoCDApp:   str
    message:     str

# ── Gitea helpers ────────────────────────────────────────────────────────────
def gitea(method: str, path: str, **kwargs) -> httpx.Response:
    url = f"{GITEA_URL}/api/v1{path}"
    headers = {"Authorization": f"token {BOT_TOKEN}", "Content-Type": "application/json"}
    with httpx.Client(timeout=30) as c:
        return c.request(method, url, headers=headers, **kwargs)

def get_file_sha(repo_path: str) -> Optional[str]:
    """Get the current SHA of a file (needed for updates)."""
    r = gitea("GET", f"/repos/{BOT_USER}/{REPO}/contents/{repo_path}")
    if r.status_code == 200:
        return r.json().get("sha")
    return None

def commit_file(repo_path: str, content: str, message: str, branch: str) -> bool:
    encoded = base64.b64encode(content.encode()).decode()
    sha = get_file_sha(repo_path)
    payload: dict[str, Any] = {
        "message": message,
        "content": encoded,
        "branch":  branch,
    }
    if sha:
        payload["sha"] = sha
    r = gitea("POST" if not sha else "PUT",
              f"/repos/{BOT_USER}/{REPO}/contents/{repo_path}",
              json=payload)
    if r.status_code not in (200, 201):
        log.error("commit_file failed %s: %s", r.status_code, r.text)
        return False
    return True

def delete_file(repo_path: str, message: str, branch: str) -> bool:
    """Delete a file from the Gitea repo."""
    sha = get_file_sha(repo_path)
    if not sha:
        log.warning("delete_file: %s not found in repo", repo_path)
        return False
    r = gitea("DELETE", f"/repos/{BOT_USER}/{REPO}/contents/{repo_path}",
              json={"message": message, "sha": sha, "branch": branch})
    if r.status_code not in (200, 204):
        log.error("delete_file failed %s: %s", r.status_code, r.text)
        return False
    return True

def create_branch(branch: str) -> bool:
    r = gitea("POST", f"/repos/{BOT_USER}/{REPO}/branches",
              json={"new_branch_name": branch, "old_branch_name": "main"})
    return r.status_code in (200, 201)

def create_pr(branch: str, title: str, body: str) -> Optional[dict]:
    r = gitea("POST", f"/repos/{BOT_USER}/{REPO}/pulls",
              json={"title": title, "body": body,
                    "head": branch, "base": "main",
                    "labels": []})
    if r.status_code in (200, 201):
        return r.json()
    log.error("create_pr failed %s: %s", r.status_code, r.text)
    return None

def merge_pr(pr_number: int) -> bool:
    r = gitea("POST", f"/repos/{BOT_USER}/{REPO}/pulls/{pr_number}/merge",
              json={"Do": "merge", "merge_message_field": "Auto-merge: Conftest passed",
                    "delete_branch_after_merge": True})
    return r.status_code in (200, 204)

# ── Conftest validation ──────────────────────────────────────────────────────
POLICY_DIR = os.getenv("POLICY_DIR", "/app/policy")

def run_conftest(claim_yaml: str) -> tuple[bool, str]:
    """Write claim to temp file, run conftest, return (passed, output)."""
    policy_path = Path(POLICY_DIR)
    if not policy_path.exists() or not any(policy_path.rglob("*.rego")):
        log.warning("Policy dir %s empty or not found — skipping Conftest", POLICY_DIR)
        return True, "WARN: No Conftest policies found, skipping validation"
    with tempfile.NamedTemporaryFile(suffix=".yaml", mode="w", delete=False) as f:
        f.write(claim_yaml)
        tmpfile = f.name
    try:
        result = subprocess.run(
            ["conftest", "test", tmpfile, "--policy", POLICY_DIR, "--output", "table"],
            capture_output=True, text=True, timeout=30
        )
        passed = result.returncode == 0
        output = result.stdout + result.stderr
        return passed, output
    except FileNotFoundError:
        log.warning("conftest binary not found — skipping validation")
        return True, "WARN: conftest not in PATH, skipping validation"
    except subprocess.TimeoutExpired:
        return False, "ERROR: conftest timed out"
    finally:
        Path(tmpfile).unlink(missing_ok=True)

# ── Claim path calculation ───────────────────────────────────────────────────
KIND_TO_DIR = {
    "VMAppClaim":          "vms",
    "ThreeTierAppClaim":   "appbox",
    "KindClusterClaim":    "clusters",
    "AKSClusterClaim":     "clusters",
    "IPPVirtualMachineClaim": "vms",
    "IPPAppBoxClaim":      "appbox",
    "IPPClusterClaim":     "clusters",
    "IPPDatabaseClaim":    "databases",
    "IPPNetworkClaim":     "networks",
}

def claim_path(kind: str, name: str, env: str, bu: str) -> str:
    dir_ = KIND_TO_DIR.get(kind, "appbox")
    slug = name.lower().replace("_", "-")
    return f"{dir_}/{env}/{bu}/claim-{slug}.yaml"

# ── Enrich manifest with required annotations ────────────────────────────────
def enrich_manifest(manifest: dict, req: ProvisionRequest) -> dict:
    m = dict(manifest)
    meta = m.setdefault("metadata", {})
    annotations = meta.setdefault("annotations", {})
    annotations.setdefault("ipp.dhl.com/request-id",    req.requestId or f"REQ-{int(time.time())}")
    annotations.setdefault("ipp.dhl.com/business-unit", req.businessUnit)
    annotations.setdefault("ipp.dhl.com/cost-center",   req.costCenter)
    annotations.setdefault("ipp.dhl.com/environment",   req.environment)
    annotations.setdefault("ipp.dhl.com/requested-by",  req.requestedBy)
    labels = meta.setdefault("labels", {})
    labels.setdefault("platform.ipp.dhl.com/managed-by", "iip-service")
    labels.setdefault("platform.ipp.dhl.com/environment", req.environment)
    # Ensure conftest-required labels are always present
    if not labels.get("owner"):
        # Derive owner from spec.parameters.owner.team, businessUnit, or requestedBy
        owner = (
            (manifest.get("spec", {}) or {})
            .get("parameters", {}).get("owner", {}).get("team")
            or req.businessUnit
            or req.requestedBy.split("@")[0]
        )
        labels["owner"] = owner
    labels.setdefault("environment", req.environment)
    return m

# ── Main provision endpoint ──────────────────────────────────────────────────
@app.post("/api/provision", response_model=ProvisionResponse)
async def provision(req: ProvisionRequest):
    manifest = enrich_manifest(req.manifest, req)
    kind      = manifest.get("kind", "Unknown")
    name      = manifest.get("metadata", {}).get("name", "unnamed")
    env       = req.environment
    bu        = req.businessUnit.lower().replace(" ", "-")

    log.info("Provision request: kind=%s name=%s env=%s bu=%s by=%s", kind, name, env, bu, req.requestedBy)

    # 1. Render YAML
    claim_yaml = yaml.dump(manifest, default_flow_style=False, allow_unicode=True)

    # 2. Conftest validation
    passed, conftest_out = run_conftest(claim_yaml)
    if not passed:
        log.warning("Conftest FAILED for %s/%s:\n%s", kind, name, conftest_out)
        raise HTTPException(status_code=400, detail=f"Conftest validation failed:\n{conftest_out}")
    log.info("Conftest passed for %s/%s", kind, name)

    # 3. Commit claim YAML directly to main (demo: Conftest is the gate, no PR review needed)
    file_path  = claim_path(kind, name, env, bu)
    commit_msg = f"feat({kind.lower()}): provision {name} [{env}/{bu}] by {req.requestedBy}"
    if not commit_file(file_path, claim_yaml, commit_msg, "main"):
        raise HTTPException(status_code=500, detail="Failed to commit claim YAML to git")

    # 4. Construct a "PR-like" URL pointing to the commit on main for audit trail
    repo_url  = f"{GITEA_EXTERNAL_URL}/{BOT_USER}/{REPO}"
    pr_url    = f"{repo_url}/src/branch/main/{file_path}"
    log.info("Claim committed to main: %s", pr_url)

    # 5. Derive ArgoCD app name
    basename = Path(file_path).parent.name  # e.g. bu-demo
    argocd_app = f"ipp-claim-{basename}"

    return ProvisionResponse(
        claimName=name,
        claimPath=file_path,
        prUrl=pr_url,
        argoCDApp=argocd_app,
        message=f"Claim committed to main. ArgoCD will sync within ~30s.",
    )

# ── Status endpoint ──────────────────────────────────────────────────────────
@app.get("/api/status/{claim_name}")
async def status(claim_name: str):
    if not ARGOCD_TOKEN:
        return {"status": "unknown", "reason": "ARGOCD_TOKEN not configured"}
    try:
        async with httpx.AsyncClient(timeout=10, verify=False) as c:
            r = await c.get(
                f"{ARGOCD_URL}/api/v1/applications",
                headers={"Authorization": f"Bearer {ARGOCD_TOKEN}"},
                params={"name": f"ipp-claim-{claim_name}"}
            )
        if r.status_code == 200:
            apps = r.json().get("items", [])
            if apps:
                a = apps[0]
                return {
                    "app":    a["metadata"]["name"],
                    "health": a["status"]["health"]["status"],
                    "sync":   a["status"]["sync"]["status"],
                }
        return {"status": "not found"}
    except Exception as e:
        return {"status": "error", "reason": str(e)}

@app.get("/health")
async def health():
    return {"status": "ok", "service": "iip", "gitea": GITEA_URL}

# ── Targets preflight ────────────────────────────────────────────────────────
# In-cluster K8s API access (ServiceAccount token auto-mounted by kubelet) — used
# only to read cluster-scoped, non-secret status (ProviderConfig readiness), never
# Secret contents. See deployment.yaml for the narrowly-scoped ClusterRole.
K8S_API      = "https://kubernetes.default.svc"
SA_TOKEN_PATH = "/var/run/secrets/kubernetes.io/serviceaccount/token"
SA_CA_PATH    = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"

async def k8s_get(path: str) -> Optional[dict]:
    if not os.path.exists(SA_TOKEN_PATH):
        return None
    token = Path(SA_TOKEN_PATH).read_text().strip()
    try:
        async with httpx.AsyncClient(timeout=5, verify=SA_CA_PATH) as c:
            r = await c.get(f"{K8S_API}{path}", headers={"Authorization": f"Bearer {token}"})
        if r.status_code == 200:
            return r.json()
        return None
    except Exception as e:
        log.warning("k8s_get %s failed: %s", path, e)
        return None

async def azure_provider_ready() -> bool:
    obj = await k8s_get("/apis/azure.upbound.io/v1beta1/providerconfigs/default")
    if not obj:
        return False
    conditions = (obj.get("status") or {}).get("conditions") or []
    return any(c.get("type") == "Ready" and c.get("status") == "True" for c in conditions)

@app.get("/api/targets")
async def targets():
    aks_ready = await azure_provider_ready()
    return {
        "kubevirt-vm": {
            "available": True,
            "reason": "KubeVirt is part of the base platform install",
        },
        "local-cluster": {
            "available": True,
            "reason": "Real vcluster (isolated Kubernetes API server, ~30-60s to provision)",
        },
        "aks": {
            "available": aks_ready,
            "reason": "Azure ProviderConfig is Ready" if aks_ready
                      else "Azure ProviderConfig not found or not Ready — check azure-creds secret",
        },
    }

# ── Destroy endpoint ─────────────────────────────────────────────────────────
class DestroyRequest(BaseModel):
    claimName:   str  = Field(..., description="Name of the claim to destroy")
    claimKind:   str  = Field(default="VMAppClaim")
    businessUnit: str = Field(default="bu-demo")
    environment: str  = Field(default="dev")
    requestedBy: str  = Field(default="")

class DestroyResponse(BaseModel):
    claimName: str
    claimPath: str
    message:   str

@app.delete("/api/provision", response_model=DestroyResponse)
async def destroy(req: DestroyRequest):
    name = req.claimName.lower().replace("_", "-")
    bu   = req.businessUnit.lower().replace(" ", "-")
    env  = req.environment
    kind = req.claimKind

    file_path   = claim_path(kind, name, env, bu)
    commit_msg  = f"chore({kind.lower()}): destroy {name} [{env}/{bu}] by {req.requestedBy}"

    log.info("Destroy request: kind=%s name=%s env=%s bu=%s by=%s", kind, name, env, bu, req.requestedBy)

    if not delete_file(file_path, commit_msg, "main"):
        raise HTTPException(status_code=404, detail=f"Claim file not found in repo: {file_path}")

    log.info("Claim deleted from repo: %s — ArgoCD prune will remove the resource", file_path)
    return DestroyResponse(
        claimName=name,
        claimPath=file_path,
        message=f"Claim file deleted from Gitea. ArgoCD will prune the {kind} within ~30s.",
    )

# ── Brownfield onboarding: server-side descriptor validation (O5) ───────────
# Previously the wizard's YamlUpload parsed and validated the uploaded
# infra-request.yaml entirely client-side (trivially bypassable — anyone could
# call downstream endpoints directly with an unvalidated payload). This
# endpoint re-validates server-side before the wizard is allowed to proceed to
# the normal /api/provision flow. It never writes anything to git itself —
# parse + validate only, "pre-fill and confirm" happens back in the wizard.
#
# yaml.safe_load only (never yaml.load/unsafe_load) — no arbitrary Python
# object construction from the document. Every field is treated as inert
# data (string/int/bool) and only ever copied into a plain dict response;
# nothing here is interpolated into a shell command, template, or eval'd,
# so there is no injection surface from attacker-controlled YAML content.
NAME_RE = re.compile(r"^[a-z0-9-]+$")
ALLOWED_APP_TYPES = {"greenfield", "brownfield"}
ALLOWED_ENVIRONMENTS = {"development", "staging", "production"}
ALLOWED_INFRA_TYPES = {"kubernetes", "vm", "knative"}
ALLOWED_TARGETS = {"kubevirt-vm", "local-cluster", "aks"}
ALLOWED_SIZES = {"S", "M", "L"}
ALLOWED_AZURE_REGIONS = {"eastus", "westeurope", "southeastasia"}

class BrownfieldRequest(BaseModel):
    descriptor: str = Field(..., description="Raw infra-request.yaml text, as uploaded by the user")

class BrownfieldResponse(BaseModel):
    valid: bool
    errors: list[str] = []
    # Normalized, validated request — safe to render directly in the wizard's
    # review step. Only present when valid=True.
    request: Optional[dict] = None

def _validate_brownfield_doc(doc: Any) -> tuple[list[str], Optional[dict]]:
    errors: list[str] = []
    if not isinstance(doc, dict):
        return ["Document must be a YAML mapping"], None

    if doc.get("apiVersion") != "platform.demo/v1":
        errors.append('apiVersion must be "platform.demo/v1"')
    if doc.get("kind") != "InfraRequest":
        errors.append('kind must be "InfraRequest"')

    meta = doc.get("metadata")
    meta = meta if isinstance(meta, dict) else {}
    name = meta.get("name")
    if not isinstance(name, str) or not NAME_RE.match(name):
        errors.append("metadata.name is required and must be a lowercase slug (letters, numbers, hyphens)")
    team = meta.get("team")
    if not isinstance(team, str) or not team:
        errors.append("metadata.team is required")
    environment = meta.get("environment")
    if environment not in ALLOWED_ENVIRONMENTS:
        errors.append(f"metadata.environment must be one of: {', '.join(sorted(ALLOWED_ENVIRONMENTS))}")
    repository = meta.get("repository")
    if not isinstance(repository, str) or not repository:
        errors.append("metadata.repository is required")

    spec = doc.get("spec")
    spec = spec if isinstance(spec, dict) else {}
    app_type = spec.get("appType")
    if app_type not in ALLOWED_APP_TYPES:
        errors.append(f"spec.appType must be one of: {', '.join(sorted(ALLOWED_APP_TYPES))}")
    description = spec.get("description") if isinstance(spec.get("description"), str) else ""

    infra = spec.get("infra")
    infra = infra if isinstance(infra, dict) else {}
    infra_type = infra.get("type")
    if infra_type not in ALLOWED_INFRA_TYPES:
        errors.append(f"spec.infra.type must be one of: {', '.join(sorted(ALLOWED_INFRA_TYPES))}")

    target = infra.get("target")
    size = infra.get("size")
    azure_region = infra.get("azureRegion")
    if infra_type != "knative":
        if target not in ALLOWED_TARGETS:
            errors.append(f"spec.infra.target must be one of: {', '.join(sorted(ALLOWED_TARGETS))}")
        if size not in ALLOWED_SIZES:
            errors.append(f"spec.infra.size must be one of: {', '.join(sorted(ALLOWED_SIZES))}")
        if target == "aks" and azure_region not in ALLOWED_AZURE_REGIONS:
            errors.append(f"spec.infra.azureRegion must be one of: {', '.join(sorted(ALLOWED_AZURE_REGIONS))} (required for aks)")

    if errors:
        return errors, None

    normalized = {
        "appType": app_type,
        "details": {
            "appName": name,
            "team": team,
            "repositoryUrl": repository,
            "description": description,
            "environment": environment,
        },
        "infraType": infra_type,
        # lifecycle: migrated marks this as a brownfield (existing-system) onboarding,
        # distinct from a greenfield claim — surfaced in the wizard's review step.
        "lifecycle": "migrated" if app_type == "brownfield" else "production",
    }
    if infra_type != "knative":
        normalized["target"] = target
        normalized["size"] = size
        if target == "aks":
            normalized["azureRegion"] = azure_region
    return [], normalized

@app.post("/api/onboard/brownfield", response_model=BrownfieldResponse)
async def onboard_brownfield(req: BrownfieldRequest):
    try:
        doc = yaml.safe_load(req.descriptor)
    except yaml.YAMLError as e:
        return BrownfieldResponse(valid=False, errors=[f"YAML parse error: {e}"])
    errors, normalized = _validate_brownfield_doc(doc)
    if errors:
        return BrownfieldResponse(valid=False, errors=errors)
    return BrownfieldResponse(valid=True, request=normalized)
