# Troubleshooting & FAQ

---

## Known Issues

### ArgoCD Telemetry Shows DEMO Instead of LIVE

**Status:** Fixed in commit `68bd5a6` (`fix(aiops): ArgoCD live telemetry + question-aware rule-based responses`)

**Root cause:**  
The `ArgoCDCollector` made unauthenticated HTTP calls to the Argo CD API server. Every request returned HTTP 401 Unauthorized. The collector caught the exception and fell back to DEMO simulation data, so all Argo CD evidence in AIOps responses was tagged DEMO even when the cluster was fully running.

**Fix applied:**

1. `aiops/app/config.py` — added `argocd_auth_token` field that reads the `ARGOCD_AUTH_TOKEN` environment variable (populated from the `aiops-secrets` Kubernetes Secret).
2. `aiops/app/collectors/argocd.py` — the collector now passes `Authorization: Bearer <token>` in every request to the Argo CD API.

```python
# argocd.py — after fix
token = cfg.argocd_auth_token.strip()
self._headers = {"Authorization": f"Bearer {token}"} if token else {}

resp = await client.get(
    f"{self._url}/api/v1/applications",
    headers=self._headers,
)
```

**Verification:**

```bash
# 1. Confirm the secret is present
kubectl get secret aiops-secrets -n aiops -o jsonpath='{.data.ARGOCD_AUTH_TOKEN}' | base64 -d | head -c 20

# 2. Query the AIOps engine and check data_mode in the response
curl -s -X POST http://aiops.dpcs.local/api/aiops/chat \
  -H 'Content-Type: application/json' \
  -d '{"message": "What is the ArgoCD sync status?"}' \
  | jq '.evidence[] | select(.source == "argocd") | .dataMode'
# Expected: "live"
```

If the secret is missing, regenerate the Argo CD token and re-create the secret:

```bash
# Regenerate token
ARGOCD_TOKEN=$(argocd account generate-token --account aiops-service-account)

# Update the secret
kubectl create secret generic aiops-secrets -n aiops \
  --from-literal=ARGOCD_AUTH_TOKEN="$ARGOCD_TOKEN" \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart the AIOps engine
kubectl rollout restart deployment/aiops-engine -n aiops
```

---

## Pre-flight Issues

### Docker Desktop Not Running

```
[FAIL] Docker Desktop is not running.
```

**Fix:** Start Docker Desktop. Wait for the green icon, then re-run `./bootstrap-demo.sh`.

### Insufficient Docker Memory

```
[WARN] Docker has only 8GB allocated. Recommend 32GB.
```

**Fix:** Docker Desktop → Settings → Resources → Memory → 32GB → Apply & Restart.

### Missing CLI Tools

```
[FAIL] kubectl not found.
```

**Fix:** `./scripts/install-tools.sh` installs all required tools (kubectl, helm, argocd CLI, kind, crossplane CLI).

---

## Persona Login Issues

### Clicking a Persona Card Does Nothing

**Cause:** A valid session already exists in `localStorage`.

**Fix:** Open DevTools → Application → Local Storage → delete `idp_persona_session`, then reload.

### Credentials Rejected

The demo credentials are displayed inside the login modal as a hint box. Each persona has a distinct password:

| Persona | User ID | Password |
|---|---|---|
| Developer | `dev.user` | `Dev@IDP2025` |
| Platform Engineer | `platform.engineer` | `Platform@IDP2025` |
| Operations Support | `ops.support` | `Ops@IDP2025` |
| Security Analyst | `security.analyst` | `Security@IDP2025` |
| Tech Provider | `tech.provider` | `Provider@IDP2025` |

---

## AIOps Engine

### Engine Returns Simulated Answers (LLM Unavailable)

**Cause:** Ollama is not running or the configured model is not pulled.

```bash
# Check Ollama
curl http://localhost:11434/api/tags

# Pull required model
ollama pull llama3.1:8b

# Verify engine mode
curl http://aiops.dpcs.local/health | jq '.llm_mode'
# Expected: "local"   (if "fallback" → Ollama not reachable)
```

### AIOps Chat Hangs or Times Out

**Fix:** The model may be too large for available RAM. Switch to a smaller model:

```bash
ollama pull llama3.2:3b
# Update LOCAL_LLM_MODEL in aiops/manifests/configmap.yaml, then:
kubectl rollout restart deployment/aiops-engine -n aiops
```

### `/api/aiops/chat` Returns 404

Both `/api/aiops/chat` and `/chat` are valid. If you see 404, the engine may be running an older image:

```bash
cd aiops
docker build -t idp-aiops:latest .
kind load docker-image idp-aiops:latest --name idp-demo
kubectl rollout restart deployment/aiops-engine -n aiops
```

---

## Crossplane

### Provider Not Healthy

```bash
kubectl get providers
kubectl describe provider provider-kubernetes
```

Look for `HealthCondition: Healthy: false`. If stuck, delete and re-apply:

```bash
kubectl delete provider provider-kubernetes
kubectl apply -f crossplane/providers/provider-kubernetes.yaml
```

### Claim Not Reconciling

```bash
# Force re-reconcile
kubectl annotate threetierapp <name> crossplane.io/paused=true --overwrite
kubectl annotate threetierapp <name> crossplane.io/paused- --overwrite
```

---

## KIND Cluster Issues

### Cluster Not Starting

```bash
kind delete cluster --name idp-demo
./bootstrap-demo.sh
```

### Ingress Not Resolving

Ensure `/etc/hosts` contains the KIND node IP for all `*.dpcs.local` entries:

```bash
KIND_IP=$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' idp-demo-control-plane)
echo "$KIND_IP  backstage.dpcs.local argocd.dpcs.local grafana.dpcs.local prometheus.dpcs.local opencost.dpcs.local hubble.dpcs.local aiops.dpcs.local employee.dpcs.local"
```

---

## Resetting Demo State

```bash
# Soft reset — keeps cluster, resets workload state
./reset-demo.sh

# Hard reset — destroys and rebuilds from scratch
./destroy-demo.sh && ./bootstrap-demo.sh
```

---

## FAQ

**Q: Why does the AIOps response say DEMO for some sources?**  
A: See [Telemetry Sources — Tag Definitions](aiops/telemetry-sources.md). A DEMO tag means that specific collector timed out; the engine used simulation data to complete the response. It does not mean the entire cluster is down.

**Q: Can I use a cloud LLM (OpenAI / Anthropic) instead of Ollama?**  
A: The LLM abstraction in `aiops/app/llm.py` supports Ollama today. Swapping to a cloud provider requires implementing a compatible `LLMClient` class and setting the appropriate API key in `aiops-secrets`.

**Q: The Docs section still shows "No documents to show" after setup.**  
A: TechDocs requires the entity to be registered in the catalog with a `backstage.io/techdocs-ref` annotation, and a valid `mkdocs.yml` at the referenced path. Check that the `idp-demo-backstage` entity appears in the Catalog and that `backstage/mkdocs.yml` exists. Then trigger a TechDocs build: `yarn techdocs-cli build --entity default/Component/idp-demo-backstage`.

**Q: How do I add a new page to these docs?**  
A: Create a new `.md` file under `backstage/docs/`, then add it to the `nav:` section of `backstage/mkdocs.yml`. Backstage picks up the change on next TechDocs build.
