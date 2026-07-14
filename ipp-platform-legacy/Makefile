.PHONY: help setup start stop validate demo clean docs status \
        update-backstage update-aiops update scan-images \
        scale-up aiops \
        aiops-use-claude aiops-use-local aiops-llm-status \
        sim-crash sim-cost sim-outofsync sim-netdeny sim-policy \
        sim-policy-drop sim-policy-restore \
        gitops-setup gitops-status update-iip-service \
        deploy-employee-portal \
        setup-azure-creds setup-clustermesh \
        preflight demo-up demo-reset demo-status

SHELL := /usr/bin/env bash

help:
	@echo ""
	@echo "  IPP — Infrastructure Platform Portal | Make targets"
	@echo ""
	@echo "  Setup & Lifecycle:"
	@echo "    make setup              Install required CLI tools (via brew)"
	@echo "    make start              Bootstrap the full demo platform (KIND)"
	@echo "    make stop               Destroy the KIND cluster"
	@echo "    make update-backstage   Rebuild + redeploy Backstage only (idempotent)"
	@echo "    make update-aiops       Rebuild + redeploy AIOps engine only (idempotent)"
	@echo "    make update             Rebuild + redeploy both (idempotent)"
	@echo "    make update-iip-service Rebuild + redeploy IIP Service only (idempotent)"
	@echo ""
	@echo "  GitOps:"
	@echo "    make gitops-setup   Deploy Gitea + IIP Service + ArgoCD ApplicationSet"
	@echo "    make gitops-status  Show GitOps stack health"
	@echo ""
	@echo "  Demo:"
	@echo "    make scan-images      Scan Docker images for CVEs (trivy)"
	@echo "    make demo       Print demo launch checklist"
	@echo "    make status     Collect and display current cluster status"
	@echo ""
	@echo "  Day-2 Operations:"
	@echo "    make scale-up   Scale employee portal frontend to 3 replicas"
	@echo "    make aiops      Trigger a full AIOps analysis cycle"
	@echo ""
	@echo "  Simulation (demo scenarios):"
	@echo "    make sim-crash       Simulate pod CrashLoopBackOff"
	@echo "    make sim-cost        Simulate cost spike"
	@echo "    make sim-outofsync   Simulate Argo CD out-of-sync"
	@echo "    make sim-netdeny     Simulate Cilium network deny"
	@echo "    make sim-policy      Simulate policy violation"
	@echo "    make sim-policy-drop     Drop Kyverno + OPA policy enforcement (AIOps gap demo)"
	@echo "    make sim-policy-restore  Restore Kyverno + OPA policy enforcement"
	@echo ""
	@echo "  Azure / ClusterMesh (AKS demo):"
	@echo "    make setup-azure-creds              Create Azure SP + ProviderConfig (once, before AKS provisioning)"
	@echo "    make setup-clustermesh AKS_CLUSTER= Connect KIND cilium to AKS ClusterMesh (run after AKS READY=True)"
	@echo ""
	@echo "  Claims:"
	@echo "    make validate-claims PATH=<path>   Run Conftest on a claim file"
	@echo ""
	@echo "  Cleanup:"
	@echo "    make clean      Alias for stop"
	@echo ""
	@echo "  Documentation:"
	@echo "    make docs       List all documentation files"
	@echo ""
	@echo "  Demo-friendly aliases (D1 — preflight-checked):"
	@echo "    make preflight    Check Docker memory, required ports, ollama model"
	@echo "    make demo-up      preflight + start (fresh demo, checked first)"
	@echo "    make demo-reset   stop + preflight + start (full reset, checked)"
	@echo "    make demo-status  status + gitops-status combined"
	@echo ""

# ── Setup ─────────────────────────────────────────────────────────────────────

setup:
	@echo "Installing required CLI tools..."
	brew install kind kubectl helm jq yq curl git argocd crossplane-cli conftest ollama trivy hadolint || true
	@echo ""
	@echo "Recommended: brew upgrade kind  # >= 0.32 for kindest/node:v1.36.1 (fewer CVEs)"
	@echo "Next steps:"
	@echo "  1. Pull Ollama model: ollama pull llama3"
	@echo "  2. Copy .env.example to .env (repo root)"
	@echo "  3. make start"

# ── Security ──────────────────────────────────────────────────────────────────

scan-images:
	chmod +x scripts/security/scan-docker-images.sh
	./scripts/security/scan-docker-images.sh $(ARGS)

# ── Lifecycle ─────────────────────────────────────────────────────────────────

start:
	@echo "Bootstrapping IPP demo platform..."
	chmod +x scripts/bootstrap.sh
	./scripts/bootstrap.sh

stop:
	@echo "Destroying KIND cluster..."
	chmod +x scripts/destroy.sh
	./scripts/destroy.sh

# ── Validation ────────────────────────────────────────────────────────────────

validate:
	@echo "Running platform health validation..."
	@kubectl get nodes -o wide 2>/dev/null || echo "No cluster found"
	@kubectl get pods -A --field-selector=status.phase!=Running 2>/dev/null | grep -v "Completed" | head -20 || true
	@argocd app list 2>/dev/null || echo "ArgoCD not reachable"

status:
	@echo "── Cluster ──────────────────────────────────"
	@kubectl get nodes 2>/dev/null || echo "No cluster"
	@echo ""
	@echo "── Namespaces ───────────────────────────────"
	@kubectl get ns 2>/dev/null | grep -E "ipp|backstage|argocd|crossplane|monitoring|aiops|spire|employee" || true
	@echo ""
	@echo "── ArgoCD Apps ──────────────────────────────"
	@argocd app list 2>/dev/null || echo "ArgoCD not reachable (run: argocd login argocd.ipp.local)"

# ── Demo checklist ────────────────────────────────────────────────────────────

demo:
	@echo ""
	@echo "  IPP Demo Pre-flight Checklist"
	@echo "  ──────────────────────────────────────────"
	@echo "  1. make validate              — All checks green"
	@echo "  2. ollama serve &             — Start Ollama (AIOps LLM)"
	@echo "  3. curl -s http://employee.ipp.local/api/health"
	@echo "  4. Open browser tabs:"
	@echo "       http://backstage.ipp.local"
	@echo "       http://argocd.ipp.local"
	@echo "       http://grafana.ipp.local"
	@echo "       http://opencost.ipp.local"
	@echo "       http://hubble.ipp.local"
	@echo ""
	@echo "  Personas: Developer · Platform Engineer · SRE · Security · FinOps"
	@echo ""

# ── Day-2 Operations ──────────────────────────────────────────────────────────

scale-up:
	kubectl scale deployment frontend -n employee-portal --replicas=3
	@echo "Frontend scaled to 3 replicas"

aiops:
	@echo "Triggering AIOps analysis cycle..."
	@curl -s -X POST http://aiops.ipp.local/api/analyze \
	  -H 'Content-Type: application/json' \
	  -d '{"query":"Run full platform health analysis"}' | jq . || \
	  echo "AIOps not reachable — is DEMO_MODE=true? Try: curl http://aiops.ipp.local/health"

# ── Idempotent rebuild targets ────────────────────────────────────────────────

update-backstage:
	@echo "Rebuilding and redeploying Backstage..."
	docker build -t ipp-platform/backstage:latest ../ipp-platform-app/backstage/
	kind load docker-image ipp-platform/backstage:latest --name ipp-local
	kubectl create configmap backstage-catalog \
	  --from-file=catalog-info.yaml=../ipp-platform-app/backstage/catalog/catalog-info.yaml \
	  --from-file=templates-consolidated.yaml=../ipp-platform-app/backstage/catalog/templates-consolidated.yaml \
	  -n backstage --dry-run=client -o yaml | kubectl apply -f -
	kubectl rollout restart deployment/backstage -n backstage

update-aiops:
	@echo "Rebuilding and redeploying AIOps engine..."
	docker build -t ipp-platform/aiops-engine:latest scripts/aiops/
	kind load docker-image ipp-platform/aiops-engine:latest --name ipp-local
	kubectl apply -f scripts/aiops/manifests/configmap.yaml 2>/dev/null || true
	@set -a; [ -f ../.env ] && source ../.env; set +a; \
	if [ -n "$$ANTHROPIC_API_KEY" ]; then \
	  kubectl -n aiops patch secret aiops-secrets --type merge \
	    -p "{\"stringData\":{\"ANTHROPIC_API_KEY\":\"$$ANTHROPIC_API_KEY\"}}" 2>/dev/null \
	    && echo "ANTHROPIC_API_KEY synced from .env — AIOps will use Claude" || true; \
	fi
	kubectl rollout restart deployment/aiops-engine -n aiops

# ── AIOps LLM provider toggle ─────────────────────────────────────────────────
# The Anthropic API key stays configured in aiops-secrets permanently — these
# targets just flip the ANTHROPIC_ENABLED flag in the configmap and restart,
# so switching providers takes ~10s and never touches the rebuilt image.

aiops-use-claude:
	@echo "Switching AIOps LLM provider → Anthropic Claude..."
	kubectl -n aiops patch configmap aiops-config --type merge -p '{"data":{"ANTHROPIC_ENABLED":"true"}}'
	kubectl -n aiops rollout restart deployment/aiops-engine
	kubectl -n aiops rollout status deployment/aiops-engine --timeout=90s
	@$(MAKE) --no-print-directory aiops-llm-status

aiops-use-local:
	@echo "Switching AIOps LLM provider → local Ollama..."
	kubectl -n aiops patch configmap aiops-config --type merge -p '{"data":{"ANTHROPIC_ENABLED":"false"}}'
	kubectl -n aiops rollout restart deployment/aiops-engine
	kubectl -n aiops rollout status deployment/aiops-engine --timeout=90s
	@$(MAKE) --no-print-directory aiops-llm-status

aiops-llm-status:
	@kubectl -n aiops exec deployment/aiops-engine -- curl -s http://localhost:8000/health 2>/dev/null \
	  | jq -r '"AIOps LLM: provider=" + .llm_provider + " model=" + .llm_model + " mode=" + .llm_mode' \
	  || echo "Unable to reach aiops-engine — is it running? (kubectl get pods -n aiops)"

update: update-backstage update-aiops

# ── GitOps / IIP Service targets ─────────────────────────────────────────────

gitops-setup:
	@echo "Setting up GitOps stack (Gitea + ArgoCD ApplicationSet + IIP Service)..."
	kubectl apply -f scripts/gitops/gitea/gitea-deployment.yaml
	kubectl apply -f scripts/gitops/gitea/gitea-init-job.yaml
	kubectl apply -f scripts/gitops/argocd/gitea-repo-secret.yaml
	kubectl apply -f scripts/gitops/argocd/claims-appset-local.yaml
	docker build -t ipp-platform/iip-service:latest scripts/gitops/iip-service/
	kind load docker-image ipp-platform/iip-service:latest --name ipp-local
	kubectl apply -f scripts/gitops/iip-service/deployment.yaml
	kubectl create configmap iip-conftest-policy -n ipp-system \
	  --from-file=scripts/gitops/iip-service/policy/claim.rego \
	  --dry-run=client -o yaml | kubectl apply -f -
	@echo "GitOps stack deployed. Gitea: http://gitea.ipp.local  IIP: http://iip.ipp.local"

gitops-status:
	@echo "=== Gitea ===" && kubectl get pods -n gitea -o wide 2>/dev/null || true
	@echo "=== IIP Service ===" && kubectl get pods -n ipp-system -l app=iip-service -o wide 2>/dev/null || true
	@echo "=== ArgoCD ApplicationSet ===" && kubectl get applicationset ipp-claims-local -n argocd -o wide 2>/dev/null || true
	@echo "=== ArgoCD Applications (ipp-claim-*) ===" && kubectl get applications -n argocd -l "app.kubernetes.io/managed-by=argocd" 2>/dev/null | grep ipp-claim || true
	@echo "=== Gitea claims repo ===" && curl -s http://gitea.ipp.local/ipp-automation-bot/ipp-platform-claims 2>/dev/null | grep -o 'commits/main">[^<]*' || echo "  (gitea.ipp.local may not be in /etc/hosts)"

update-iip-service:
	@echo "Rebuilding and redeploying IIP Service..."
	docker build -t ipp-platform/iip-service:latest scripts/gitops/iip-service/
	kind load docker-image ipp-platform/iip-service:latest --name ipp-local
	kubectl rollout restart deployment/iip-service -n ipp-system

setup-azure-creds:
	@echo "Setting up Azure credentials for Crossplane (persistent across cluster restarts)..."
	@mkdir -p $${HOME}/.ipp-demo
	@APP_ID=$$(az ad sp list --display-name "crossplane-ipp-demo" --query "[0].appId" -o tsv 2>/dev/null); \
	SUB_ID=$$(az account show --query id -o tsv); \
	TENANT_ID=$$(az account show --query tenantId -o tsv); \
	if [ -z "$${APP_ID}" ]; then \
	  echo "Creating Service Principal crossplane-ipp-demo..."; \
	  APP_ID=$$(az ad sp create-for-rbac --name "crossplane-ipp-demo" --role Contributor \
	    --scopes /subscriptions/$${SUB_ID} --query appId -o tsv 2>/dev/null); \
	else \
	  echo "SP crossplane-ipp-demo exists ($$APP_ID) — resetting credentials..."; \
	fi; \
	NEW_PASS=$$(az ad sp credential reset --id "$${APP_ID}" --query password -o tsv 2>/dev/null); \
	printf '{\n  "clientId": "%s",\n  "clientSecret": "%s",\n  "subscriptionId": "%s",\n  "tenantId": "%s",\n  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",\n  "resourceManagerEndpointUrl": "https://management.azure.com/",\n  "activeDirectoryGraphResourceId": "https://graph.windows.net/",\n  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",\n  "galleryEndpointUrl": "https://gallery.azure.com/",\n  "managementEndpointUrl": "https://management.core.windows.net/"\n}\n' \
	  "$${APP_ID}" "$${NEW_PASS}" "$${SUB_ID}" "$${TENANT_ID}" > $${HOME}/.ipp-demo/azure-creds.json; \
	echo "Credentials saved to $${HOME}/.ipp-demo/azure-creds.json (auto-restored on every make start)"; \
	kubectl delete secret azure-creds -n crossplane-system 2>/dev/null || true; \
	kubectl create secret generic azure-creds -n crossplane-system \
	  --from-file=creds=$${HOME}/.ipp-demo/azure-creds.json; \
	echo "azure-creds secret loaded into cluster."
	kubectl apply -f ../ipp-platform-compositions/providers/azure-providerconfig.yaml
	@echo "Done. AKS provisioning is live. Credentials persist at ~/.ipp-demo/azure-creds.json"

deploy-employee-portal:
	@echo "Deploying employee portal to KIND cluster..."
	kubectl create namespace employee-portal --dry-run=client -o yaml | kubectl apply -f -
	kubectl apply -f scripts/apps/employee-portal/manifests/employee-portal.yaml
	kubectl rollout status deployment/employee-backend deployment/employee-frontend -n employee-portal --timeout=120s
	@echo "Employee portal ready: http://employee.ipp.local"

setup-clustermesh:
	@if [ -z "$(AKS_CLUSTER)" ]; then \
	  echo "Usage: make setup-clustermesh AKS_CLUSTER=aks-dev-003"; \
	  echo "       AKS_CLUSTER is the Crossplane resource name (also used as kubeconfig context)"; \
	  exit 1; \
	fi
	@echo "Fetching AKS kubeconfig for $(AKS_CLUSTER)..."
	az aks get-credentials \
	  --resource-group rg-$(AKS_CLUSTER) \
	  --name $(AKS_CLUSTER) \
	  --file /tmp/$(AKS_CLUSTER).yaml \
	  --overwrite-existing 2>/dev/null || \
	az aks get-credentials \
	  --resource-group rg-aks-$(AKS_CLUSTER) \
	  --name aks-$(AKS_CLUSTER) \
	  --file /tmp/$(AKS_CLUSTER).yaml \
	  --overwrite-existing
	@echo "Extracting ClusterMesh certs from AKS..."
	@KUBECONFIG=/tmp/$(AKS_CLUSTER).yaml kubectl get secret cilium-ca -n kube-system \
	  -o jsonpath='{.data.ca\.crt}' | base64 -d > /tmp/aks-ca.crt
	@KUBECONFIG=/tmp/$(AKS_CLUSTER).yaml kubectl get secret clustermesh-apiserver-admin-cert -n kube-system \
	  -o jsonpath='{.data.tls\.crt}' | base64 -d > /tmp/aks-admin.crt
	@KUBECONFIG=/tmp/$(AKS_CLUSTER).yaml kubectl get secret clustermesh-apiserver-admin-cert -n kube-system \
	  -o jsonpath='{.data.tls\.key}' | base64 -d > /tmp/aks-admin.key
	@AKS_IP=$$(KUBECONFIG=/tmp/$(AKS_CLUSTER).yaml kubectl get svc clustermesh-apiserver -n kube-system \
	  -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null); \
	if [ -z "$$AKS_IP" ]; then \
	  echo "ERROR: clustermesh-apiserver LoadBalancer IP not yet assigned. Wait for AKS provisioning to complete."; exit 1; \
	fi; \
	echo "AKS ClusterMesh IP: $$AKS_IP"; \
	printf 'endpoints:\n- https://clustermesh-apiserver.cilium.io:2379\ntrusted-ca-file: /var/lib/cilium/clustermesh/aks-$(AKS_CLUSTER)-cacert\nkey-file: /var/lib/cilium/clustermesh/aks-$(AKS_CLUSTER)-keyfile\ncert-file: /var/lib/cilium/clustermesh/aks-$(AKS_CLUSTER)-certfile\n' > /tmp/aks-clustermesh-config; \
	kubectl create secret generic cilium-clustermesh -n kube-system \
	  --from-file="aks-$(AKS_CLUSTER)"=/tmp/aks-clustermesh-config \
	  --from-file="aks-$(AKS_CLUSTER)-cacert"=/tmp/aks-ca.crt \
	  --from-file="aks-$(AKS_CLUSTER)-certfile"=/tmp/aks-admin.crt \
	  --from-file="aks-$(AKS_CLUSTER)-keyfile"=/tmp/aks-admin.key \
	  --dry-run=client -o yaml | kubectl apply -f -; \
	kubectl patch daemonset cilium -n kube-system --type=json -p \
	  "[{\"op\":\"replace\",\"path\":\"/spec/template/spec/hostAliases\",\"value\":[{\"ip\":\"$$AKS_IP\",\"hostnames\":[\"clustermesh-apiserver.cilium.io\"]}]}]" || \
	kubectl patch daemonset cilium -n kube-system --type=json -p \
	  "[{\"op\":\"add\",\"path\":\"/spec/template/spec/hostAliases\",\"value\":[{\"ip\":\"$$AKS_IP\",\"hostnames\":[\"clustermesh-apiserver.cilium.io\"]}]}]"; \
	kubectl rollout restart daemonset/cilium -n kube-system; \
	kubectl rollout status daemonset/cilium -n kube-system --timeout=120s
	@rm -f /tmp/aks-ca.crt /tmp/aks-admin.crt /tmp/aks-admin.key /tmp/aks-clustermesh-config
	@echo "ClusterMesh setup complete. Verify with:"
	@echo "  cilium clustermesh status --context kind-ipp-local --namespace kube-system"

# ── Claim validation ──────────────────────────────────────────────────────────

validate-claims:
	@if [ -z "$(PATH_ARG)" ]; then \
	  echo "Usage: make validate-claims PATH_ARG=<path-to-claim.yaml>"; exit 1; fi
	conftest test "$(PATH_ARG)" \
	  --policy ../ipp-platform-policies/conftest/policy/ \
	  --output table

# ── Simulation Scenarios ──────────────────────────────────────────────────────

sim-crash:
	@echo "Simulating CrashLoopBackOff on employee-portal backend..."
	kubectl set image deployment/backend backend=invalid-image:crash -n employee-portal
	@echo "Watch: kubectl get pods -n employee-portal -w"
	@echo "Restore: kubectl set image deployment/backend backend=ipp-platform/employee-backend:latest -n employee-portal"

sim-cost:
	@echo "Simulating cost spike (scaling frontend to 10 replicas)..."
	kubectl scale deployment frontend -n employee-portal --replicas=10
	@echo "Restore: kubectl scale deployment frontend -n employee-portal --replicas=2"

sim-outofsync:
	@echo "Simulating ArgoCD out-of-sync (patching ConfigMap directly)..."
	kubectl patch configmap -n employee-portal app-config --patch '{"data":{"DEMO_DRIFT":"true"}}' 2>/dev/null || \
	  echo "ConfigMap not found — Argo CD will detect drift on next sync cycle"

sim-netdeny:
	@echo "Applying deny-all NetworkPolicy to employee-portal..."
	kubectl apply -f - <<< "$$(printf 'apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: sim-deny-all\n  namespace: employee-portal\nspec:\n  podSelector: {}\n  policyTypes: [Ingress, Egress]\n')"
	@echo "Restore: kubectl delete networkpolicy sim-deny-all -n employee-portal"

sim-policy:
	@echo "Applying privileged pod to trigger Kyverno/Gatekeeper violation..."
	kubectl apply -f - -n employee-portal <<< "$$(printf 'apiVersion: v1\nkind: Pod\nmetadata:\n  name: sim-privileged\n  namespace: employee-portal\nspec:\n  containers:\n  - name: test\n    image: busybox\n    securityContext:\n      privileged: true\n')" || echo "Policy enforcement working as expected"

# Drop enforcement, then run `make sim-policy` to show the privileged pod now gets
# admitted -- demonstrates AIOps catching what policy would normally have blocked.
sim-policy-drop:
	@echo "Dropping Kyverno ClusterPolicy 'disallow-privileged'..."
	kubectl delete clusterpolicy disallow-privileged --ignore-not-found
	@echo "Dropping OPA Gatekeeper constraint 'no-privileged-containers-employee-portal'..."
	kubectl delete noprivilegedcontainers.constraints.gatekeeper.sh no-privileged-containers-employee-portal --ignore-not-found
	@echo ""
	@echo "Policy enforcement gap is live. 'make sim-policy' will now succeed instead of being blocked."
	@echo "Restore: make sim-policy-restore"

sim-policy-restore:
	@echo "Restoring Kyverno policies..."
	kubectl apply -f scripts/security/kyverno/kyverno-policies.yaml
	@echo "Restoring OPA Gatekeeper constraints..."
	kubectl apply -f scripts/security/gatekeeper/gatekeeper-constraints.yaml
	@echo ""
	@echo "Cleaning up sim-privileged pod (if sim-policy was run while enforcement was down)..."
	kubectl delete pod sim-privileged -n employee-portal --ignore-not-found
	@echo "Policy enforcement restored."

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: stop

# ── Documentation ─────────────────────────────────────────────────────────────

docs:
	@echo ""
	@echo "  IPP Platform Documentation"
	@find ../ipp-platform-app/backstage/docs -name "*.md" 2>/dev/null | sort | sed 's/^/    /' || true
	@echo ""
	@echo "  Architecture Decision Records"
	@find . -name "ADR-*.md" | sort | sed 's/^/    /' || true
	@echo ""

# ── Demo-friendly aliases (D1) ────────────────────────────────────────────────
# Additive only — `start`/`stop`/`status` above are unchanged and still work
# exactly as before. These just add a preflight pass and combine existing
# targets under names that read better for "start/reset/check the demo".

preflight:
	@echo "── Preflight checks ─────────────────────────────"
	@command -v docker >/dev/null 2>&1 || { echo "❌ docker not found — install Docker Desktop"; exit 1; }
	@command -v kind >/dev/null 2>&1 || { echo "❌ kind not found — run: make setup"; exit 1; }
	@command -v kubectl >/dev/null 2>&1 || { echo "❌ kubectl not found — run: make setup"; exit 1; }
	@echo "✅ docker, kind, kubectl present"
	@DOCKER_MEM_BYTES=$$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo 0); \
	if [ "$$DOCKER_MEM_BYTES" -gt 0 ] 2>/dev/null; then \
	  DOCKER_MEM_GB=$$(( DOCKER_MEM_BYTES / 1000000000 )); \
	  if [ "$$DOCKER_MEM_GB" -lt 8 ]; then \
	    echo "⚠️  Docker Desktop memory limit is ~$${DOCKER_MEM_GB}GB — this demo (KIND + Backstage + Crossplane + AIOps) wants >= 8GB. Docker Desktop → Settings → Resources → Memory."; \
	  else \
	    echo "✅ Docker memory: ~$${DOCKER_MEM_GB}GB"; \
	  fi; \
	else \
	  echo "⚠️  Could not read Docker memory limit (docker info unreachable — is Docker running?)"; \
	fi
	@for p in 3000 7007 8080 6443; do \
	  if lsof -i :$$p >/dev/null 2>&1; then \
	    echo "⚠️  port $$p is already in use — bootstrap may fail to bind it"; \
	  else \
	    echo "✅ port $$p free"; \
	  fi; \
	done
	@if command -v ollama >/dev/null 2>&1; then \
	  if ollama list 2>/dev/null | grep -q llama3; then \
	    echo "✅ ollama model 'llama3' present"; \
	  else \
	    echo "⚠️  ollama model 'llama3' not pulled — AIOps demo needs it: ollama pull llama3"; \
	  fi; \
	else \
	  echo "⚠️  ollama not installed — AIOps LLM features will be unavailable (run: make setup)"; \
	fi
	@echo "── Preflight checks complete ────────────────────"

demo-up: preflight start
	@echo ""
	@echo "Demo is up. Run 'make demo' for the launch checklist, 'make demo-status' to check health."

demo-reset: stop preflight start
	@echo ""
	@echo "Demo reset complete."

demo-status:
	@$(MAKE) status
	@echo ""
	@$(MAKE) gitops-status
