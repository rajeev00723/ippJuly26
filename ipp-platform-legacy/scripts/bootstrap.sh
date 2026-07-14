#!/usr/bin/env bash
# =============================================================================
# IPP — Infrastructure Platform Portal Demo Bootstrap Script
# Target: MacBook Pro Apple Silicon M5 Pro/Max, 48GB RAM, macOS Tahoe
# Runtime: Docker Desktop + KIND
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export REPO_ROOT="${SCRIPT_DIR}"
# Consolidated trees live at the outer-repo root (Wave 0 consolidation):
# portal in ipp-platform-app/backstage, Crossplane sources in ipp-platform-compositions.
export OUTER_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
export CROSSPLANE_DIR="${OUTER_ROOT}/ipp-platform-compositions"
export PATH="${PATH}:/usr/local/bin:/opt/homebrew/bin"

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC}  $*"; }
log_success() { echo -e "${GREEN}[PASS]${NC}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }
log_error()   { echo -e "${RED}[FAIL]${NC}  $*"; }
log_section() { echo -e "\n${BOLD}${CYAN}══════════════════════════════════════${NC}"; echo -e "${BOLD}${CYAN}  $*${NC}"; echo -e "${BOLD}${CYAN}══════════════════════════════════════${NC}"; }
fail()        { log_error "$1"; echo -e "${YELLOW}Action: $2${NC}"; exit 1; }

# kubectl apply -f <url> with retry/backoff — GitHub's raw content CDN intermittently
# returns 429/503 under load, which otherwise aborts the whole bootstrap mid-phase.
kubectl_apply_url_retry() {
  local url="$1"; shift
  local attempt
  for attempt in 1 2 3 4 5; do
    if kubectl apply "$@" -f "${url}"; then
      return 0
    fi
    log_warn "apply from ${url} failed (attempt ${attempt}/5), retrying in $((attempt * 5))s..."
    sleep $((attempt * 5))
  done
  fail "Failed to apply ${url} after 5 attempts" "Check network connectivity to GitHub, or vendor the manifest locally and re-run"
}

# Recover from etcd NOSPACE alarm — call after any "database space exceeded" error
etcd_recover() {
  log_warn "etcd NOSPACE detected — running compact + defrag + alarm disarm..."
  local ETCDCTL
  ETCDCTL=$(docker exec "${KIND_CLUSTER_NAME}-control-plane" find \
    /var/lib/containerd -name etcdctl -type f 2>/dev/null | head -1)
  [[ -z "${ETCDCTL}" ]] && { log_warn "etcdctl not found, skipping recovery"; return; }
  docker exec "${KIND_CLUSTER_NAME}-control-plane" sh -c "
    E='${ETCDCTL}'
    C='--endpoints=https://127.0.0.1:2379 --cacert=/etc/kubernetes/pki/etcd/ca.crt --cert=/etc/kubernetes/pki/etcd/server.crt --key=/etc/kubernetes/pki/etcd/server.key'
    REV=\$(\$E \$C endpoint status --write-out=json 2>/dev/null | python3 -c \"import sys,json; print(json.load(sys.stdin)[0]['Status']['header']['revision'])\" 2>/dev/null || echo '')
    [ -n \"\$REV\" ] && \$E \$C compact \"\$REV\" 2>/dev/null || true
    \$E \$C --command-timeout=120s defrag 2>/dev/null || true
    \$E \$C alarm disarm 2>/dev/null || true
    \$E \$C endpoint status --write-out=table 2>/dev/null || true
  " && log_success "etcd recovered" || log_warn "etcd recovery had errors — continuing anyway"
}

# ── Load .env if present ─────────────────────────────────────────────────────
# .env lives at the outer repo root (see .env.example), not under scripts/ —
# REPO_ROOT here points at scripts/ (used for locating aiops/, employee-portal/
# etc.), so this must use OUTER_ROOT or every root .env value (GITHUB_PAT,
# ANTHROPIC_API_KEY, LANGCHAIN_API_KEY, ARGOCD_ADMIN_PASSWORD, ...) is silently
# never loaded.
if [[ -f "${OUTER_ROOT}/.env" ]]; then
  log_info "Loading .env file..."
  set -a; source "${OUTER_ROOT}/.env"; set +a
fi

export GITHUB_OWNER="${GITHUB_OWNER:-amitabhmanish13}"
export GITHUB_REPO="${GITHUB_REPO:-IPS_app_demo}"
export GITHUB_TOKEN="${GITHUB_TOKEN:-}"
export KIND_CLUSTER_NAME="ipp-local"
export ARGOCD_ADMIN_PASSWORD="${ARGOCD_ADMIN_PASSWORD:-argocd-demo-local-2024}"
export BACKSTAGE_SESSION_SECRET="${BACKSTAGE_SESSION_SECRET:-$(openssl rand -hex 32)}"

# ── Versions ─────────────────────────────────────────────────────────────────
CILIUM_VERSION="1.15.4"
ARGOCD_VERSION="v2.10.1"
UXP_VERSION="2.2.1-up.1"
GATEKEEPER_VERSION="3.15.1"
KYVERNO_VERSION="3.2.0"
PROMETHEUS_STACK_VERSION="58.3.3"
OPENCOST_VERSION="1.38.1"
SPIRE_HELM_VERSION="0.21.0"
INGRESS_NGINX_VERSION="4.10.0"
# v1.3.1 crash-loops on this host's aarch64 software-TCG emulation (no /dev/kvm):
# libvirt's CPU model expansion incorrectly pulls in the x86-only "mpx" feature flag
# regardless of model chosen. v1.8.4 fixes that specific crash, but its admission
# webhook only allows cpu.model: host-passthrough on Arm64, and host-passthrough
# itself requires real KVM — which Apple Silicon Docker Desktop doesn't expose
# (see ipp-platform-compositions/compositions/vmapp-composition.yaml). Net result:
# VMAppClaims still reconcile (Synced/Ready=True) but status.vmReady stays false
# on local KIND on Apple Silicon. See README.md "Known Limitations".
KUBEVIRT_VERSION="v1.8.4"

# ── Banner ────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}"
cat << 'BANNER'
  ╔══════════════════════════════════════════════════════════════╗
  ║     Enterprise Infrastructure  Platform Portal [IPP] Demo    ║
  ║     Backstage · Upbound Crossplane · Argo CD · Cilium · SPIRE║
  ║     OPA · Kyverno · Prometheus · OpenCost · AIOps            ║
  ╚══════════════════════════════════════════════════════════════╝
BANNER
echo -e "${NC}"
echo "  Target: MacBook Pro Apple Silicon (M5 Pro/Max), 48GB RAM"
echo "  Cluster: KIND (ipp-local), Runtime: Docker Desktop"
echo ""

# =============================================================================
# PHASE 1: PRE-FLIGHT CHECKS
# =============================================================================
log_section "Phase 1: Pre-flight Checks"

# macOS check
if [[ "$(uname -s)" != "Darwin" ]]; then
  fail "This demo targets macOS." "Run on a MacBook Pro with macOS Tahoe."
fi
log_success "macOS detected: $(sw_vers -productVersion)"

# Architecture check
ARCH=$(uname -m)
if [[ "$ARCH" != "arm64" ]]; then
  log_warn "Expected arm64, got ${ARCH}. Some images may not be optimized for your architecture."
else
  log_success "Architecture: arm64 (Apple Silicon)"
fi

# Docker check
if ! docker info &>/dev/null; then
  fail "Docker Desktop is not running." \
       "Start Docker Desktop, allocate 32GB memory and 10+ CPUs, then rerun ./bootstrap-demo.sh"
fi

DOCKER_MEM=$(docker info --format '{{.MemTotal}}' 2>/dev/null || echo 0)
DOCKER_MEM_GB=$(echo "${DOCKER_MEM}" | awk '{printf "%.0f", $1/1073741824}')
if (( DOCKER_MEM_GB < 16 )); then
  log_warn "Docker has only ${DOCKER_MEM_GB}GB allocated. Recommend 32GB."
  log_warn "Go to Docker Desktop → Settings → Resources → Memory → 32GB"
else
  log_success "Docker memory: ${DOCKER_MEM_GB}GB"
fi

# Check required tools
check_tool() {
  local tool=$1
  local install_hint=${2:-"brew install ${tool}"}
  if ! command -v "$tool" &>/dev/null; then
    fail "${tool} not found." "Run: ${install_hint}"
  fi
  log_success "${tool}: $(${tool} --version 2>/dev/null | head -1 || echo 'found')"
}

check_tool kubectl "brew install kubernetes-cli"
check_tool kind "brew install kind"
check_tool helm "brew install helm"
check_tool jq "brew install jq"
check_tool docker "Install Docker Desktop"
check_tool node "brew install node"
check_tool yarn "npm install -g yarn"

# Optional tools (warn but don't fail)
for tool in gh yq argocd; do
  if command -v "$tool" &>/dev/null; then
    log_success "${tool}: available"
  else
    log_warn "${tool} not found (optional for some features)"
  fi
done

# =============================================================================
# PHASE 2: KIND CLUSTER
# =============================================================================
log_section "Phase 2: KIND Cluster"

# Auto-detect the correct kindest/node image for the installed KIND version.
# Pin by digest for reproducibility; see scripts/docker/images.env for CVE notes.
# kind >= 0.32: v1.36.1 (~211 unfixed CVEs vs ~942 on v1.32.2)
# kind >= 0.28: v1.32.11 (latest v1.32 patch)
detect_kind_node_image() {
  local kind_ver
  kind_ver=$(kind version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
  local minor
  minor=$(echo "${kind_ver}" | cut -d. -f2)

  if (( minor >= 32 )); then
    echo "kindest/node:v1.36.1@sha256:3489c7674813ba5d8b1a9977baea8a6e553784dab7b84759d1014dbd78f7ebd5"
  elif (( minor >= 28 )); then
    echo "kindest/node:v1.32.11@sha256:5fc52d52a7b9574015299724bd68f183702956aa4a2116ae75a63cb574b35af8"
  elif (( minor >= 25 )); then
    echo "kindest/node:v1.31.4"
  elif (( minor >= 22 )); then
    echo "kindest/node:v1.29.14"
  else
    echo "kindest/node:v1.29.14"
  fi
}

KIND_NODE_IMAGE=$(detect_kind_node_image)
KIND_MINOR=$(kind version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 | cut -d. -f2)
log_info "KIND version: $(kind version 2>/dev/null | head -1)"
log_info "Selected node image: ${KIND_NODE_IMAGE}"

# Patch the kind-config.yaml with the correct node image (handles digest pins)
sed -i.bak "s|image: kindest/node:.*|image: ${KIND_NODE_IMAGE}|g" \
  "${REPO_ROOT}/kind/kind-config.yaml" 2>/dev/null || true

if (( KIND_MINOR < 32 )); then
  log_warn "kind < 0.32 detected — using kindest/node v1.32.11 (fewer CVEs than v1.32.2)."
  log_warn "For best security: brew upgrade kind && kind delete cluster --name ${KIND_CLUSTER_NAME} && rerun bootstrap"
  log_warn "kind >= 0.32 enables kindest/node:v1.36.1 (~70% fewer CVEs than v1.32.2)."
fi

# Check for port 80/443 conflicts (common on macOS)
check_port_conflict() {
  local port=$1
  if lsof -iTCP:"${port}" -sTCP:LISTEN &>/dev/null 2>&1; then
    log_warn "Port ${port} is in use. Ingress-NGINX requires port 80/443."
    log_warn "Stop the process using port ${port} before running bootstrap."
    log_warn "  lsof -iTCP:${port} -sTCP:LISTEN"
  fi
}
check_port_conflict 80
check_port_conflict 443

if kind get clusters 2>/dev/null | grep -q "^${KIND_CLUSTER_NAME}$"; then
  log_success "KIND cluster '${KIND_CLUSTER_NAME}' already exists"
  kubectl cluster-info --context "kind-${KIND_CLUSTER_NAME}" &>/dev/null || {
    log_warn "Cluster exists but kubectl context unreachable. Recreating..."
    kind delete cluster --name "${KIND_CLUSTER_NAME}" 2>/dev/null || true
    # --wait 0s: skip node-readiness wait (nodes are NotReady until Cilium CNI installs)
    kind create cluster --name "${KIND_CLUSTER_NAME}" --config "${REPO_ROOT}/kind/kind-config.yaml" --wait 0s
  }
else
  log_info "Creating KIND cluster '${KIND_CLUSTER_NAME}' with image ${KIND_NODE_IMAGE}..."
  log_info "This takes 3-6 minutes (pulling ~700MB node image on first run)..."
  # --wait 0s: don't wait for node readiness — nodes need Cilium CNI first (installed in Phase 4)
  kind create cluster \
    --name "${KIND_CLUSTER_NAME}" \
    --config "${REPO_ROOT}/kind/kind-config.yaml" \
    --wait 0s || {
      log_error "KIND cluster creation failed."
      echo "  Common fixes:"
      echo "  1. Ensure Docker Desktop has 32GB+ memory allocated"
      echo "  2. Ensure Docker Desktop is fully started (green icon)"
      echo "  3. Check Docker Desktop → Troubleshoot → Clean / Purge data"
      echo "  4. Try: kind delete cluster --name ipp-local && ./bootstrap-demo.sh"
      exit 1
    }
  log_success "KIND cluster created"
fi

kubectl config use-context "kind-${KIND_CLUSTER_NAME}" 2>/dev/null || true
log_success "kubectl context set to: kind-${KIND_CLUSTER_NAME}"

# Retry loop — with --wait 0s the API server may take 10-30s to become reachable
log_info "Verifying Kubernetes API server is reachable (up to 60s)..."
for _i in $(seq 1 30); do
  if kubectl cluster-info 2>/dev/null | grep -qE "control.plane|Kubernetes"; then
    K8S_VER=$(kubectl version -o json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('serverVersion',{}).get('gitVersion',''))" 2>/dev/null || echo "")
    log_success "API server reachable${K8S_VER:+ — Kubernetes ${K8S_VER}}"
    break
  fi
  if [[ $_i -eq 30 ]]; then
    fail "Cannot reach Kubernetes API server after 60s." "Check: kubectl cluster-info --context kind-${KIND_CLUSTER_NAME}"
  fi
  sleep 2
done

log_info "Node status (NotReady is expected before Cilium CNI installs):"
kubectl get nodes

# Pre-register all Helm repos and update once — avoids per-phase repo add+update overhead
log_info "Registering all Helm repos and running a single repo update..."
helm repo add cilium https://helm.cilium.io/ --force-update 2>/dev/null || true
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx --force-update 2>/dev/null || true
helm repo add spiffe https://spiffe.github.io/helm-charts-hardened/ --force-update 2>/dev/null || true
helm repo add upbound https://charts.upbound.io/stable --force-update 2>/dev/null || true
helm repo add gatekeeper https://open-policy-agent.github.io/gatekeeper/charts --force-update 2>/dev/null || true
helm repo add kyverno https://kyverno.github.io/kyverno/ --force-update 2>/dev/null || true
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts --force-update 2>/dev/null || true
helm repo add opencost https://opencost.github.io/opencost-helm-chart --force-update 2>/dev/null || true
helm repo update
log_success "All Helm repos registered and updated"

# Increase etcd quota to 8 GiB and enable automatic compaction.
# Default quota is 2 GiB — a full IPP stack (Crossplane objects, Backstage static
# assets, Prometheus metrics metadata, SPIRE, OPA) fills it within one run.
log_info "Configuring etcd quota (8 GiB) and auto-compaction..."
ETCDCTL_PATH=$(docker exec "${KIND_CLUSTER_NAME}-control-plane" find \
  /var/lib/containerd -name etcdctl -type f 2>/dev/null | head -1)
if [[ -n "${ETCDCTL_PATH}" ]]; then
  # Patch static pod manifest — kubelet auto-restarts etcd when the file changes
  docker exec "${KIND_CLUSTER_NAME}-control-plane" sh -c "
    if ! grep -q 'quota-backend-bytes' /etc/kubernetes/manifests/etcd.yaml; then
      sed -i '/--listen-client-urls/a\\    - --quota-backend-bytes=8589934592' \
        /etc/kubernetes/manifests/etcd.yaml
      echo 'etcd quota set to 8 GiB'
    else
      echo 'etcd quota already configured'
    fi
    if ! grep -q 'auto-compaction' /etc/kubernetes/manifests/etcd.yaml; then
      sed -i '/--listen-client-urls/a\\    - --auto-compaction-retention=1' \
        /etc/kubernetes/manifests/etcd.yaml
      echo 'etcd auto-compaction enabled (1h)'
    fi
  " 2>/dev/null || true
  # Wait for etcd to restart after manifest change (poll up to 30s)
  for _ei in $(seq 1 15); do
    if kubectl get pod -n kube-system -l component=etcd --no-headers 2>/dev/null | grep -q Running; then
      break
    fi
    sleep 2
  done
  log_success "etcd configured: 8 GiB quota + 1h auto-compaction"
else
  log_warn "etcdctl not found — skipping etcd quota configuration"
fi

# =============================================================================
# PHASE 3: /etc/hosts (no cluster dependency)
# =============================================================================
log_section "Phase 3: Configure /etc/hosts"

configure_hosts() {
  local domains=(
    "backstage.ipp.local"
    "argocd.ipp.local"
    "grafana.ipp.local"
    "prometheus.ipp.local"
    "opencost.ipp.local"
    "hubble.ipp.local"
    "aiops.ipp.local"
    "employee.ipp.local"
    "vault.ipp.local"
    "gitea.ipp.local"
    "vmapp.ipp.local"
    "myapp.ipp.local"
  )
  local missing=()
  for d in "${domains[@]}"; do
    grep -q "${d}" /etc/hosts 2>/dev/null || missing+=("${d}")
  done
  if [[ ${#missing[@]} -eq 0 ]]; then
    log_success "/etc/hosts already has all ipp.local entries"
  else
    log_info "Adding missing demo domains to /etc/hosts: ${missing[*]} (requires sudo)..."
    printf '127.0.0.1 %s\n' "${missing[*]}" | sudo tee -a /etc/hosts > /dev/null
    log_success "Added ${#missing[@]} missing domains to /etc/hosts"
  fi
}
configure_hosts

# =============================================================================
# PHASE 4: CILIUM CNI + HUBBLE  (must come BEFORE ingress-nginx)
# Nodes are NotReady without a CNI — install Cilium first, THEN ingress-nginx
# =============================================================================
log_section "Phase 4: Cilium CNI + Hubble"

if helm list -n kube-system 2>/dev/null | grep -q cilium; then
  log_success "Cilium already installed"
else
  KIND_IP=$(docker inspect "${KIND_CLUSTER_NAME}-control-plane" \
    --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo "172.18.0.2")
  log_info "KIND control-plane IP: ${KIND_IP}"

  log_info "Installing Cilium ${CILIUM_VERSION} (3-5 minutes)..."
  helm upgrade --install cilium cilium/cilium \
    --version "${CILIUM_VERSION}" \
    --namespace kube-system \
    --set tunnel=vxlan \
    --set kubeProxyReplacement=disabled \
    --set k8sServiceHost="${KIND_IP}" \
    --set k8sServicePort=6443 \
    --set hubble.enabled=true \
    --set hubble.relay.enabled=true \
    --set hubble.ui.enabled=true \
    --set "hubble.metrics.enabled={dns,drop,tcp,flow,icmp,http}" \
    --set operator.replicas=1 \
    --set image.pullPolicy=IfNotPresent \
    --set ipam.mode=kubernetes \
    --set nodeinit.enabled=true \
    --set mtu=1500 \
    --wait \
    --timeout 10m

  log_info "Waiting for Cilium pods..."
  kubectl -n kube-system wait --for=condition=ready pod -l k8s-app=cilium --timeout=300s
  log_success "Cilium ${CILIUM_VERSION} installed with Hubble"
fi

# Ensure Cilium MTU is 1500 — required for KubeVirt tap device creation.
# KIND's default vxlan MTU (65535) causes "invalid argument" when KubeVirt
# tries to create a tap device with the same MTU as the pod interface.
# Idempotent: patch is a no-op if mtu is already 1500.
log_info "Ensuring Cilium MTU=1500 for KubeVirt tap compatibility..."
CURRENT_MTU=$(kubectl get configmap cilium-config -n kube-system \
  -o jsonpath='{.data.mtu}' 2>/dev/null || echo "")
if [ "${CURRENT_MTU}" != "1500" ]; then
  kubectl patch configmap cilium-config -n kube-system --type merge \
    -p '{"data":{"mtu":"1500"}}' 2>/dev/null || true
  # Restart Cilium pods to apply the new MTU
  kubectl rollout restart daemonset cilium -n kube-system 2>/dev/null || true
  kubectl -n kube-system rollout status daemonset/cilium --timeout=120s 2>/dev/null || true
  log_success "Cilium MTU set to 1500"
else
  log_success "Cilium MTU already 1500"
fi

# Now that Cilium (CNI) is installed, wait for all nodes to be Ready
log_info "Waiting for all nodes to become Ready now that CNI is installed..."
kubectl wait --for=condition=ready node --all --timeout=180s && \
  log_success "All nodes Ready" || \
  log_warn "Some nodes still initializing — continuing anyway"
kubectl get nodes

# Apply Cilium network policies (will be re-applied after employee-portal namespace exists)
log_info "Applying Cilium network policies..."
kubectl apply -f "${REPO_ROOT}/networking/policies/" 2>/dev/null || true
kubectl apply -f "${REPO_ROOT}/networking/hubble/hubble-ui-ingress.yaml" 2>/dev/null || true

# =============================================================================
# PHASE 4b: CILIUM CLUSTERMESH API SERVER (KIND — one-time)
# Enables ClusterMesh on the local KIND cluster so AKS clusters provisioned
# via IPP Backstage can federate their Hubble flows into this Hubble UI.
# Idempotent: helm upgrade is a no-op if values are unchanged.
# =============================================================================
log_section "Phase 4b: Cilium ClusterMesh API Server (KIND)"

KIND_IP=$(docker inspect "${KIND_CLUSTER_NAME}-control-plane" \
  --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' 2>/dev/null || echo "172.18.0.2")

CLUSTERMESH_ENABLED=$(kubectl get configmap cilium-config -n kube-system \
  -o jsonpath='{.data.cluster-name}' 2>/dev/null || echo "")

if [[ "${CLUSTERMESH_ENABLED}" == "kind-ipp" ]]; then
  log_success "ClusterMesh already enabled on KIND (cluster-name=kind-ipp)"
else
  log_info "Enabling ClusterMesh API Server on KIND cluster..."
  helm upgrade cilium cilium/cilium \
    --version "${CILIUM_VERSION}" \
    --namespace kube-system \
    --reuse-values \
    --set cluster.name=kind-ipp \
    --set cluster.id=1 \
    --set clustermesh.useAPIServer=true \
    --set clustermesh.apiserver.replicas=1 \
    --set clustermesh.apiserver.service.type=NodePort \
    --set k8sServiceHost="${KIND_IP}" \
    --set k8sServicePort=6443 \
    --set image.pullPolicy=IfNotPresent \
    --wait \
    --timeout 5m

  log_info "Restarting Cilium agents to pick up new cluster identity..."
  kubectl rollout restart daemonset/cilium -n kube-system
  kubectl -n kube-system rollout status daemonset/cilium --timeout=120s
  log_success "ClusterMesh API Server enabled (cluster-name=kind-ipp, cluster-id=1)"
fi

# Store the KIND kubeconfig as a Secret in crossplane-system so the
# ClusterMesh connect Job (created by the AKS Crossplane Composition)
# can mount it to run `cilium clustermesh connect`.
# Idempotent: --dry-run=client | apply is a no-op if unchanged.
log_info "Storing kind-ipp kubeconfig in crossplane-system for ClusterMesh Jobs..."
kubectl create namespace crossplane-system --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true
KUBECONFIG_B64=$(kubectl config view --raw --minify -o json \
  --context kind-"${KIND_CLUSTER_NAME}" 2>/dev/null \
  | python3 -c "import sys,json,base64; d=json.load(sys.stdin); \
    d['clusters'][0]['cluster']['server']='https://${KIND_IP}:6443'; \
    print(base64.b64encode(json.dumps(d).encode()).decode())" 2>/dev/null || \
  kubectl config view --raw --minify | base64 | tr -d '\n')
kubectl create secret generic kind-ipp-kubeconfig \
  --namespace crossplane-system \
  --from-literal=kubeconfig="$(kubectl config view --raw --minify 2>/dev/null)" \
  --dry-run=client -o yaml | kubectl apply -f -
log_success "kind-ipp-kubeconfig secret ready in crossplane-system"

# Enable clustermesh-config dir + endpoint-sync in cilium-config so that the
# cilium-clustermesh Secret (populated later by setup-clustermesh) is picked up
# automatically by cilium agents without another restart.
log_info "Enabling Cilium clustermesh-config dir in cilium-config..."
kubectl patch configmap cilium-config -n kube-system --type=merge -p '{
  "data": {
    "clustermesh-config": "/var/lib/cilium/clustermesh/",
    "clustermesh-enable-endpoint-sync": "true"
  }
}' 2>/dev/null || true

# =============================================================================
# PHASE 5: INGRESS-NGINX + NAMESPACES
# Install ingress-nginx AFTER nodes are Ready (after Cilium)
# =============================================================================
log_section "Phase 5: Ingress-NGINX + Platform Namespaces"

if helm list -n ingress-nginx 2>/dev/null | grep -q ingress-nginx; then
  log_success "ingress-nginx already installed"
else
  log_info "Installing ingress-nginx ${INGRESS_NGINX_VERSION}..."
  helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
    --namespace ingress-nginx \
    --create-namespace \
    --version "${INGRESS_NGINX_VERSION}" \
    -f "${REPO_ROOT}/kind/ingress-nginx-values.yaml" \
    --wait \
    --timeout 5m || {
      log_warn "ingress-nginx install timed out; retrying without --wait..."
      helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
        --namespace ingress-nginx \
        --create-namespace \
        --version "${INGRESS_NGINX_VERSION}" \
        -f "${REPO_ROOT}/kind/ingress-nginx-values.yaml" \
        --timeout 5m || log_warn "ingress-nginx install failed — check Docker resources"
    }
  log_success "ingress-nginx installed"
fi

# Enable snippet annotations (disabled by default in nginx ingress >= 1.9)
# Required for configuration-snippet / server-snippet ingress annotations to work
kubectl -n ingress-nginx patch configmap ingress-nginx-controller \
  --type merge -p '{"data":{"allow-snippet-annotations":"true"}}' 2>/dev/null || true

# Patch ingress-nginx service with externalIPs so *.ipp.local DNS resolves
# to the control-plane node IP. KIND with disableDefaultCNI doesn't wire up
# hostPort via portmap, so kube-proxy DNAT rules via externalIPs are required.
log_info "Patching ingress-nginx service with externalIPs..."
CONTROL_PLANE_IP=$(kubectl get node "${KIND_CLUSTER_NAME}-control-plane" \
  -o jsonpath='{.status.addresses[?(@.type=="InternalIP")].address}' 2>/dev/null)
if [[ -n "${CONTROL_PLANE_IP}" ]]; then
  kubectl -n ingress-nginx patch svc ingress-nginx-controller \
    --type merge \
    -p "{\"spec\":{\"externalIPs\":[\"${CONTROL_PLANE_IP}\"]}}" 2>/dev/null || true
  log_success "ingress-nginx externalIPs set to ${CONTROL_PLANE_IP}"
else
  log_warn "Could not determine control-plane IP; skipping externalIPs patch"
fi

log_info "Creating platform namespaces..."
kubectl apply -f "${REPO_ROOT}/platform/namespaces/namespaces.yaml" 2>/dev/null || true
kubectl apply -f "${REPO_ROOT}/platform/rbac/platform-rbac.yaml" 2>/dev/null || true
log_success "Namespaces and RBAC configured"

# =============================================================================
# PHASE 6: SPIRE
# =============================================================================
log_section "Phase 6: SPIFFE/SPIRE Identity Platform"

if helm list -n spire 2>/dev/null | grep -q spire; then
  log_success "SPIRE already installed"
else
  # The SPIRE Helm chart creates ClusterSPIFFEID resources during install, but the
  # CRD is only registered by the controller-manager pod at runtime (not in chart crds/).
  # Pre-install the CRD so Helm can apply those resources successfully.
  # v0.5.0 CRDs match the spire-controller-manager:0.5.0 image used by the Helm chart.
  # Vendored locally (scripts/security/spire/crds/) because raw.githubusercontent.com
  # intermittently rate-limits (429) or errors (503), which previously failed silently
  # here (stderr swallowed) and produced a broken helm install downstream.
  log_info "Pre-installing SPIRE controller manager CRDs..."
  SPIRE_CRD_DIR="${REPO_ROOT}/security/spire/crds"
  for crd in clusterspiffeids clusterfederatedtrustdomains clusterstaticentries; do
    local_crd="${SPIRE_CRD_DIR}/spire.spiffe.io_${crd}.yaml"
    if [ -s "${local_crd}" ]; then
      kubectl apply -f "${local_crd}"
    else
      log_warn "Vendored CRD ${crd} not found locally, fetching from GitHub..."
      kubectl_apply_url_retry "https://raw.githubusercontent.com/spiffe/spire-controller-manager/v0.5.0/config/crd/bases/spire.spiffe.io_${crd}.yaml"
    fi
  done
  kubectl wait --for=condition=established crd/clusterspiffeids.spire.spiffe.io --timeout=30s

  log_info "Installing SPIRE ${SPIRE_HELM_VERSION} (trust domain: ipp-platform.local)..."
  helm upgrade --install spire spiffe/spire \
    --namespace spire \
    --create-namespace \
    --version "${SPIRE_HELM_VERSION}" \
    --set global.spire.trustDomain="ipp-platform.local" \
    --set global.spire.clusterName="${KIND_CLUSTER_NAME}" \
    --set spire-server.replicaCount=1 \
    --set spire-agent.enabled=true \
    --set spiffe-csi-driver.enabled=true \
    --set spiffe-oidc-discovery-provider.enabled=false \
    --set spire-server.persistence.size=1Gi \
    --timeout 10m \
    --wait 2>/dev/null || {
      log_warn "SPIRE helm install had issues; trying minimal install..."
      helm upgrade --install spire spiffe/spire \
        --namespace spire \
        --create-namespace \
        --set global.spire.trustDomain="ipp-platform.local" \
        --set spiffe-oidc-discovery-provider.enabled=false \
        --timeout 10m \
        --wait
    }

  log_info "Waiting for SPIRE server..."
  kubectl -n spire wait --for=condition=ready pod -l app.kubernetes.io/name=spire-server --timeout=300s 2>/dev/null || \
    log_warn "SPIRE server still initializing (non-critical for demo flow)"
  log_success "SPIRE installed (trust domain: ipp-platform.local)"
fi

# Apply registration entries
kubectl apply -f "${REPO_ROOT}/security/spire/spire-registrations.yaml" 2>/dev/null || true

# =============================================================================
# PHASE 7: ARGO CD
# =============================================================================
log_section "Phase 7: Argo CD GitOps Engine"

if kubectl -n argocd get deployment argocd-server &>/dev/null; then
  log_success "Argo CD already installed"
else
  log_info "Installing Argo CD ${ARGOCD_VERSION}..."
  kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
  kubectl_apply_url_retry \
    "https://raw.githubusercontent.com/argoproj/argo-cd/${ARGOCD_VERSION}/manifests/install.yaml" \
    -n argocd

  log_info "Waiting for Argo CD server (this takes 2-3 minutes)..."
  # Wait for at least one matching pod to exist before calling kubectl wait
  # (kubectl wait returns "no matching resources found" if called before pods are scheduled)
  argocd_deadline=$((SECONDS + 300))
  until kubectl -n argocd get pod -l app.kubernetes.io/name=argocd-server --no-headers 2>/dev/null | grep -q .; do
    [[ $SECONDS -ge $argocd_deadline ]] && { log_error "Timed out waiting for argocd-server pod to be scheduled"; break; }
    sleep 3
  done
  kubectl -n argocd wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server --timeout=300s

  log_info "Configuring Argo CD (insecure mode for local demo)..."
  kubectl -n argocd patch configmap argocd-cmd-params-cm \
    --type merge -p '{"data":{"server.insecure":"true"}}' 2>/dev/null || true
  kubectl -n argocd rollout restart deployment/argocd-server 2>/dev/null || true
  kubectl -n argocd rollout status deployment/argocd-server --timeout=120s 2>/dev/null || true

  log_info "Creating Argo CD ingress..."
  kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
spec:
  ingressClassName: nginx
  rules:
  - host: argocd.ipp.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80
EOF

  log_success "Argo CD installed"
fi

# Always (re-)apply the Argo CD ingress — idempotent, safe on re-runs.
# The if/else above only runs on first install; re-runs skip it entirely and
# the ingress may be missing. Apply it unconditionally here.
log_info "Ensuring Argo CD ingress exists (idempotent)..."
kubectl apply -f - <<'ARGOCD_INGRESS_EOF'
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "false"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/configuration-snippet: |
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
spec:
  ingressClassName: nginx
  rules:
  - host: argocd.ipp.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: argocd-server
            port:
              number: 80
ARGOCD_INGRESS_EOF
log_success "Argo CD ingress ready"

# Set ArgoCD admin password to the expected demo credential
# Try demo password first (idempotent re-runs). If it fails, try the initial auto-generated one.
if argocd login argocd.ipp.local \
    --username admin --password "${ARGOCD_ADMIN_PASSWORD}" \
    --insecure --grpc-web &>/dev/null; then
  log_success "ArgoCD password already set to demo credential"
else
  ARGOCD_INITIAL_PASS="$(kubectl -n argocd get secret argocd-initial-admin-secret \
    -o jsonpath='{.data.password}' 2>/dev/null | base64 -d 2>/dev/null || true)"
  if [ -n "${ARGOCD_INITIAL_PASS}" ]; then
    log_info "Setting ArgoCD admin password to demo credential..."
    if argocd login argocd.ipp.local \
        --username admin --password "${ARGOCD_INITIAL_PASS}" \
        --insecure --grpc-web &>/dev/null; then
      argocd account update-password \
        --current-password "${ARGOCD_INITIAL_PASS}" \
        --new-password "${ARGOCD_ADMIN_PASSWORD}" \
        --insecure 2>/dev/null && log_success "ArgoCD password set" || log_warn "ArgoCD password update failed"
    else
      log_warn "Could not login to ArgoCD with initial or demo password — skipping password update"
    fi
  else
    log_warn "argocd-initial-admin-secret not found — password may already be set or ArgoCD not ready"
  fi
fi

# Populate ArgoCD token for Backstage proxy
# Enable apiKey capability for admin account (required to generate tokens)
#
# timeout.reconciliation shortens how often the app controller re-resolves
# "HEAD" against the repo-server (default 180s). Without this, a claim
# committed to Gitea right before a demo can sit un-synced for up to 3
# minutes with the Application still reporting stale "Synced" status against
# the previous commit — this setting was previously patched in by hand and
# lost on every cluster restart because argocd-cm is only installed from the
# raw upstream manifest (kubectl apply -f install.yaml above), not from the
# kustomize overlay that declares it. Setting it here makes it durable.
kubectl -n argocd patch configmap argocd-cm --type merge \
  -p '{"data":{"accounts.admin":"apiKey,login","timeout.reconciliation":"30s"}}' 2>/dev/null || true
kubectl -n argocd rollout restart deployment/argocd-repo-server 2>/dev/null || true
kubectl -n argocd rollout status deployment/argocd-repo-server --timeout=120s 2>/dev/null || true
sleep 2
ARGOCD_TOKEN=$(argocd account generate-token --account admin --grpc-web 2>/dev/null || true)
if [[ -n "$ARGOCD_TOKEN" ]]; then
  kubectl -n backstage patch secret backstage-secrets \
    --type merge -p "{\"stringData\":{\"ARGOCD_AUTH_TOKEN\":\"${ARGOCD_TOKEN}\"}}" 2>/dev/null || true
  # Also patch aiops-secrets so the AIOps engine can reach Argo CD (live vs DEMO status)
  kubectl -n aiops patch secret aiops-secrets \
    --type merge -p "{\"stringData\":{\"ARGOCD_AUTH_TOKEN\":\"${ARGOCD_TOKEN}\"}}" 2>/dev/null || true
  log_success "ArgoCD auth token populated for Backstage proxy and AIOps engine"
fi

# Apply ArgoCD projects
kubectl apply -f "${REPO_ROOT}/argocd/projects/" 2>/dev/null || true

# =============================================================================
# PHASE 8: UPBOUND CROSSPLANE
# =============================================================================
log_section "Phase 8: Upbound Crossplane"

if helm list -n crossplane-system 2>/dev/null | grep -q crossplane; then
  log_success "Crossplane already installed"
else
  log_info "Installing Upbound Crossplane (UXP) ${UXP_VERSION}..."
  kubectl create namespace crossplane-system --dry-run=client -o yaml | kubectl apply -f -
  helm upgrade --install crossplane upbound/crossplane \
    --namespace crossplane-system \
    --version "${UXP_VERSION}" \
    --values "${CROSSPLANE_DIR}/install/upbound-crossplane-values.yaml" \
    --wait \
    --timeout 10m

  log_info "Waiting for Crossplane to be ready..."
  kubectl -n crossplane-system wait --for=condition=ready pod -l app=crossplane --timeout=300s
  log_success "Upbound Crossplane (UXP) ${UXP_VERSION} installed"
fi

log_info "Installing Crossplane providers..."
kubectl apply -f "${CROSSPLANE_DIR}/providers/" 2>/dev/null || true

log_info "Applying Crossplane core RBAC supplement (realtime composition support)..."
kubectl apply -f "${CROSSPLANE_DIR}/install/crossplane-core-rbac-supplement.yaml" 2>/dev/null || true

log_info "Waiting for providers to download (2-3 minutes)..."
for provider in crossplane-contrib-provider-kubernetes crossplane-contrib-provider-helm; do
  kubectl wait --for=condition=healthy providers.pkg.crossplane.io/${provider} --timeout=300s 2>/dev/null && \
    log_success "Provider ${provider} healthy" || \
    log_warn "Provider ${provider} still initializing (may complete in background)"
done

# Azure providers (family + containerservice/network/resources) install their own
# CRDs (providerconfigs.azure.upbound.io) asynchronously. Wait for them explicitly —
# applying provider-configs/ before the CRD is registered silently fails and is the
# recurring root cause of AKS claims getting stuck on "ProviderConfig ... not found".
log_info "Waiting for Azure providers to download (can take a few minutes)..."
for provider in provider-family-azure provider-azure-containerservice provider-azure-network provider-azure-resources; do
  kubectl wait --for=condition=healthy providers.pkg.crossplane.io/${provider} --timeout=300s 2>/dev/null && \
    log_success "Provider ${provider} healthy" || \
    log_warn "Provider ${provider} still initializing (may complete in background)"
done

log_info "Applying provider dependency-resolution patches (prevents HEALTHY=False from lock graph conflicts)..."
kubectl apply -f "${CROSSPLANE_DIR}/providers/provider-patches.yaml" 2>/dev/null || true

# Auto-restore Azure credentials from persistent host file (survives cluster restarts)
AZURE_CREDS_FILE="${HOME}/.ipp-demo/azure-creds.json"
if [ -f "${AZURE_CREDS_FILE}" ]; then
  if kubectl get secret azure-creds -n crossplane-system &>/dev/null; then
    log_success "azure-creds secret already present in crossplane-system"
  else
    kubectl create secret generic azure-creds \
      -n crossplane-system \
      --from-file=creds="${AZURE_CREDS_FILE}"
    log_success "azure-creds secret restored from ${AZURE_CREDS_FILE}"
  fi
else
  log_warn "No Azure credentials found at ${AZURE_CREDS_FILE} — AKS provisioning will not work."
  log_warn "Run: make setup-azure-creds   (once, generates and saves creds permanently)"
fi

log_info "Applying provider configs..."
kubectl apply -f "${CROSSPLANE_DIR}/provider-configs/" 2>/dev/null || true

# Verify the Azure ProviderConfig actually landed. If the azure providers were still
# installing when provider-configs/ was applied above, the azure.upbound.io CRD may
# not have been registered yet and the apply for that one file fails silently. Wait
# for the CRD, then retry the apply explicitly instead of leaving AKS claims stuck.
if [ -f "${AZURE_CREDS_FILE}" ]; then
  if ! kubectl get providerconfig.azure.upbound.io default &>/dev/null; then
    log_warn "Azure ProviderConfig 'default' missing after first apply — waiting for CRD and retrying..."
    for i in $(seq 1 30); do
      kubectl get crd providerconfigs.azure.upbound.io &>/dev/null && break
      sleep 5
    done
    kubectl apply -f "${CROSSPLANE_DIR}/provider-configs/azure-provider-config.yaml" 2>/dev/null || true
    if kubectl get providerconfig.azure.upbound.io default &>/dev/null; then
      log_success "Azure ProviderConfig 'default' applied on retry"
    else
      log_error "Azure ProviderConfig 'default' still missing — AKS claims will not reconcile"
    fi
  else
    log_success "Azure ProviderConfig 'default' present"
  fi
fi

log_info "Applying function-patch-and-transform (explicit name required by compositions)..."
kubectl apply -f "${CROSSPLANE_DIR}/kubevirt/function-patch-and-transform.yaml" 2>/dev/null || true
# Wait for the FunctionRevision to become Active before applying compositions
for i in $(seq 1 24); do
  state=$(kubectl get functionrevisions.pkg.crossplane.io -o jsonpath='{.items[?(@.spec.desiredState=="Active")].spec.desiredState}' 2>/dev/null | grep -c Active || true)
  if [ "${state}" -ge 1 ]; then
    log_success "function-patch-and-transform FunctionRevision is Active"
    break
  fi
  sleep 5
done

log_info "Applying XRD and Composition..."
kubectl apply -f "${CROSSPLANE_DIR}/xrd/" 2>/dev/null || true
sleep 3
kubectl apply -f "${CROSSPLANE_DIR}/compositions/" 2>/dev/null || true
log_success "Crossplane XRD and Composition applied"

# =============================================================================
# PHASE 9: OPA GATEKEEPER + KYVERNO
# =============================================================================
log_section "Phase 9: Policy Engines (OPA Gatekeeper + Kyverno)"

# OPA Gatekeeper + Kyverno install in parallel to save ~5 minutes
_install_gatekeeper() {
  if helm list -n gatekeeper-system 2>/dev/null | grep -q gatekeeper; then
    echo "[PASS]  OPA Gatekeeper already installed"
    return
  fi
  echo "[INFO]  Installing OPA Gatekeeper ${GATEKEEPER_VERSION}..."
  helm upgrade --install gatekeeper gatekeeper/gatekeeper \
    --namespace gatekeeper-system \
    --create-namespace \
    --version "${GATEKEEPER_VERSION}" \
    --set replicas=1 \
    --set image.pullPolicy=IfNotPresent \
    --wait \
    --timeout 10m
  echo "[PASS]  OPA Gatekeeper installed"
}

_install_kyverno() {
  if helm list -n kyverno 2>/dev/null | grep -q kyverno; then
    echo "[PASS]  Kyverno already installed"
    return
  fi
  echo "[INFO]  Installing Kyverno ${KYVERNO_VERSION}..."
  helm upgrade --install kyverno kyverno/kyverno \
    --namespace kyverno \
    --create-namespace \
    --version "${KYVERNO_VERSION}" \
    --set replicaCount=1 \
    --set image.pullPolicy=IfNotPresent \
    --wait \
    --timeout 10m
  echo "[PASS]  Kyverno installed"
}

export -f _install_gatekeeper _install_kyverno
export GATEKEEPER_VERSION KYVERNO_VERSION
log_info "Installing OPA Gatekeeper + Kyverno in parallel..."
_install_gatekeeper &
GATEKEEPER_PID=$!
_install_kyverno &
KYVERNO_PID=$!
wait "${GATEKEEPER_PID}" || log_warn "OPA Gatekeeper install had issues"
wait "${KYVERNO_PID}" || log_warn "Kyverno install had issues"
log_success "OPA Gatekeeper + Kyverno install complete"

log_info "Applying Gatekeeper constraints (waiting for webhook to be ready)..."
# Poll until the validating webhook is registered before applying constraints
for i in $(seq 1 12); do
  if kubectl get validatingwebhookconfigurations gatekeeper-validating-webhook-configuration \
      --no-headers 2>/dev/null | grep -q gatekeeper; then
    break
  fi
  log_info "  Waiting for Gatekeeper webhook... (${i}/12)"
  sleep 10
done
# The gatekeeper/ dir mixes ConstraintTemplates with Constraint instances of those
# same templates in one apply. Gatekeeper registers each template's CRD
# asynchronously after the ConstraintTemplate is created, so a single apply pass
# can hit the Constraint CRs before their CRDs exist ("no matches for kind") and
# silently drop them (previously masked by 2>/dev/null || log_warn, with no retry
# — constraints ended up never enforcing on the live cluster). Retry the apply
# so Constraints land once their templates' CRDs are established.
gatekeeper_applied=false
for i in 1 2 3 4 5; do
  if kubectl apply -f "${REPO_ROOT}/security/gatekeeper/"; then
    gatekeeper_applied=true
    break
  fi
  log_warn "Gatekeeper constraints apply failed (attempt ${i}/5), retrying in 10s..."
  sleep 10
done
[[ "${gatekeeper_applied}" == true ]] || fail "Gatekeeper constraints failed to apply after 5 attempts" "Check 'kubectl get constrainttemplates' for CRD establishment, then re-run make start"
log_success "Gatekeeper constraints applied"

kubectl apply -f "${REPO_ROOT}/security/kyverno/" 2>/dev/null || true

# Kyverno cleanup CronJobs use bitnami/kubectl:1.28.5 which is not on Docker Hub.
# Pre-load a compatible image tagged as bitnami/kubectl:1.28.5 to prevent ImagePullBackOff.
if ! docker image inspect bitnami/kubectl:1.28.5 &>/dev/null; then
  log_info "Pre-loading bitnami/kubectl:1.28.5 substitute for Kyverno cleanup jobs..."
  docker pull rancher/kubectl:v1.28.5 2>/dev/null || true
  docker tag rancher/kubectl:v1.28.5 bitnami/kubectl:1.28.5 2>/dev/null || true
fi
kind load docker-image bitnami/kubectl:1.28.5 --name "${KIND_CLUSTER_NAME}" 2>/dev/null || true
# Ensure cleanup CronJobs use IfNotPresent so they don't re-pull
kubectl -n kyverno patch cronjob kyverno-cleanup-admission-reports --type=json \
  -p='[{"op":"replace","path":"/spec/jobTemplate/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]' 2>/dev/null || true
kubectl -n kyverno patch cronjob kyverno-cleanup-cluster-admission-reports --type=json \
  -p='[{"op":"replace","path":"/spec/jobTemplate/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]' 2>/dev/null || true

# =============================================================================
# PHASE 10: PROMETHEUS + GRAFANA
# =============================================================================
log_section "Phase 10: Prometheus + Grafana Observability"

if helm list -n monitoring 2>/dev/null | grep -q kube-prometheus-stack; then
  log_success "kube-prometheus-stack already installed"
else
  log_info "Installing kube-prometheus-stack ${PROMETHEUS_STACK_VERSION} (5-8 minutes)..."
  kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
  helm upgrade --install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --version "${PROMETHEUS_STACK_VERSION}" \
    -f "${REPO_ROOT}/observability/prometheus/prometheus-values.yaml" \
    --wait \
    --timeout 15m
  log_success "kube-prometheus-stack installed"
fi

kubectl apply -f "${REPO_ROOT}/observability/grafana/grafana-ingress.yaml" 2>/dev/null || true
kubectl apply -f "${REPO_ROOT}/observability/dashboards/dashboard-configmap.yaml" 2>/dev/null || true
# Regenerate the full-telemetry ConfigMap from the JSON source to keep them in sync
REPO_ROOT="${REPO_ROOT}" python3 - <<'PYEOF'
import json, sys, pathlib, os
repo = pathlib.Path(os.environ["REPO_ROOT"])
src  = repo / "observability/dashboards/idp-full-telemetry.json"
dst  = repo / "observability/dashboards/idp-full-telemetry-configmap.yaml"
indented = "\n".join("    " + l for l in src.read_text().splitlines())
dst.write_text(
    'apiVersion: v1\nkind: ConfigMap\nmetadata:\n'
    '  name: idp-full-telemetry-dashboard\n'
    '  namespace: monitoring\n'
    '  labels:\n    grafana_dashboard: "1"\n'
    '    app.kubernetes.io/part-of: kube-prometheus-stack\n'
    '  annotations:\n    grafana_folder: "IPP Platform"\n'
    'data:\n  idp-full-telemetry.json: |\n' + indented + '\n'
)
PYEOF
kubectl apply -f "${REPO_ROOT}/observability/dashboards/idp-full-telemetry-configmap.yaml" 2>/dev/null || true

# Prometheus ingress
kubectl apply -f - <<EOF 2>/dev/null || true
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prometheus-ingress
  namespace: monitoring
spec:
  ingressClassName: nginx
  rules:
  - host: prometheus.ipp.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: kube-prometheus-stack-prometheus
            port:
              number: 9090
EOF

# =============================================================================
# PHASE 11: OPENCOST
# =============================================================================
log_section "Phase 11: OpenCost"

if helm list -n opencost 2>/dev/null | grep -q opencost; then
  log_success "OpenCost already installed"
else
  log_info "Installing OpenCost ${OPENCOST_VERSION}..."
  kubectl create namespace opencost --dry-run=client -o yaml | kubectl apply -f -
  helm upgrade --install opencost opencost/opencost \
    --namespace opencost \
    --version "${OPENCOST_VERSION}" \
    -f "${REPO_ROOT}/cost/opencost/opencost-values.yaml" \
    --wait \
    --timeout 10m
  log_success "OpenCost installed"
fi

kubectl apply -f "${REPO_ROOT}/cost/opencost/opencost-ingress.yaml" 2>/dev/null || true

# =============================================================================
# PHASE 11b: VAULT SECRET MANAGEMENT
# =============================================================================
log_section "Phase 11b: Vault Secret Management"

if kubectl -n vault get deployment vault &>/dev/null; then
  log_success "Vault already deployed"
else
  log_info "Deploying Vault dev server..."
  kubectl apply -f "${REPO_ROOT}/security/vault/vault-deployment.yaml" 2>/dev/null || true
  kubectl -n vault wait --for=condition=ready pod -l app=vault --timeout=120s 2>/dev/null || true
  log_success "Vault deployed (dev mode, root token: root)"
fi

# Ensure vault.ipp.local is in /etc/hosts (may need to re-run if added after initial hosts setup)
if ! grep -q "vault.ipp.local" /etc/hosts 2>/dev/null; then
  log_info "Adding vault.ipp.local to /etc/hosts..."
  sudo sed -i.bak 's/\(.*dpcs\.local\)/\1 vault.ipp.local/' /etc/hosts 2>/dev/null || \
    echo "127.0.0.1 vault.ipp.local" | sudo tee -a /etc/hosts > /dev/null
fi

# Start port-forward for localhost:8200 (Vault CLI access)
kubectl -n vault wait --for=condition=ready pod -l app=vault --timeout=60s 2>/dev/null || true
pkill -f "port-forward.*vault.*8200" 2>/dev/null || true
kubectl -n vault port-forward svc/vault 8200:8200 &>/dev/null &
log_success "Vault accessible at http://vault.ipp.local (UI) and http://localhost:8200 (CLI)"

# =============================================================================
# PHASE 11c: KUBEVIRT VIRTUALIZATION
# Installs KubeVirt operator + CR with software emulation for KIND (no nested virt)
# Applies the VMAppClaim XRD + Composition so Backstage templates can provision VMs
# =============================================================================
log_section "Phase 11c: KubeVirt Virtualization"

if kubectl -n kubevirt get kv kubevirt &>/dev/null; then
  log_success "KubeVirt already installed"
else
  log_info "Installing KubeVirt operator ${KUBEVIRT_VERSION}..."
  kubectl_apply_url_retry "https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/kubevirt-operator.yaml"

  log_info "Waiting for KubeVirt operator to be ready..."
  kubectl -n kubevirt wait --for=condition=available --timeout=120s deployment/virt-operator 2>/dev/null || \
    kubectl -n kubevirt rollout status deployment/virt-operator --timeout=120s 2>/dev/null || true

  log_info "Applying KubeVirt CR..."
  kubectl_apply_url_retry "https://github.com/kubevirt/kubevirt/releases/download/${KUBEVIRT_VERSION}/kubevirt-cr.yaml"

  # KIND runs inside Docker — no nested virtualisation available → must use software emulation
  log_info "Enabling software emulation for KIND (no nested virtualisation)..."
  kubectl patch kubevirt kubevirt -n kubevirt --type merge \
    -p '{"spec":{"configuration":{"developerConfiguration":{"useEmulation":true}}}}'

  log_info "Waiting for KubeVirt to become Available (up to 5 min)..."
  kubectl wait kv kubevirt -n kubevirt --for=condition=Available --timeout=300s 2>/dev/null || \
    log_warn "KubeVirt not yet Available — continuing; VMs will work once all virt-* pods are Ready"
  log_success "KubeVirt ${KUBEVIRT_VERSION} installed with software emulation"
fi

log_info "Applying KubeVirt VMApp XRD and Composition for Crossplane..."
kubectl apply -f "${CROSSPLANE_DIR}/kubevirt/xrd.yaml" 2>/dev/null || \
  log_warn "VMApp XRD apply failed — Crossplane may not be ready yet; retry after Phase 15"
# Give the XRD a moment to establish before the Composition references it
sleep 3
kubectl apply -f "${CROSSPLANE_DIR}/kubevirt/composition.yaml" 2>/dev/null || \
  log_warn "VMApp Composition apply failed — will retry after Crossplane providers are healthy"
log_success "KubeVirt Crossplane XRD + Composition applied"

# provider-kubernetes ClusterRole needs permission to manage kubevirt.io resources
log_info "Granting provider-kubernetes permission to manage KubeVirt resources..."
kubectl apply -f - <<'EOF' 2>/dev/null || true
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: crossplane-kubevirt-manager
rules:
  - apiGroups: ["kubevirt.io"]
    resources: ["virtualmachines", "virtualmachineinstances", "virtualmachineinstancemigrations"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  - apiGroups: ["subresources.kubevirt.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: crossplane-kubevirt-manager
subjects:
  - kind: ServiceAccount
    name: provider-kubernetes
    namespace: crossplane-system
roleRef:
  kind: ClusterRole
  name: crossplane-kubevirt-manager
  apiGroup: rbac.authorization.k8s.io
EOF
log_success "KubeVirt RBAC for provider-kubernetes configured"

# Label worker nodes so KubeVirt's cpu-model node-selector can schedule virt-launcher.
# KubeVirt v1.3.x on ARM64 TCG generates cpu-model labels based on the requested
# CPU model; nodes must carry the matching label or virt-launcher pods stay Pending.
# Idempotent: --overwrite is safe to re-run.
log_info "Labeling worker nodes with KubeVirt ARM64 cpu-model labels..."
for NODE in $(kubectl get nodes --no-headers -o custom-columns=NAME:.metadata.name \
  | grep -v control-plane 2>/dev/null); do
  kubectl label node "${NODE}" \
    cpu-model.node.kubevirt.io/cortex-a57=true \
    cpu-model.node.kubevirt.io/max=true \
    cpu-model.node.kubevirt.io/host-model=true \
    --overwrite 2>/dev/null || true
  log_info "  Labeled node: ${NODE}"
done
log_success "Worker nodes labeled for KubeVirt ARM64 cpu-model scheduling"

# Apply the ARM64 mpx-strip DaemonSet — permanent fix for KubeVirt v1.3.x bug
# where x86 Intel MPX feature is incorrectly added to ARM64 domain XML.
# This DaemonSet patches each new virt-launcher container's rootfs automatically.
# Its pods use imagePullPolicy: Never (offline demo), so the image must be on
# the KIND nodes — destroy.sh wipes it between runs. A registry-pulled
# alpine:3.19 manifest list fails `kind load` under Docker's containerd store,
# so build a trivial single-platform local wrapper and load that instead.
log_info "Building/loading ipp-platform/mpx-alpine:3.19 for the mpx-strip DaemonSet..."
if ! docker image inspect ipp-platform/mpx-alpine:3.19 &>/dev/null; then
  printf 'FROM alpine:3.19\n' | docker build --platform linux/arm64 -t ipp-platform/mpx-alpine:3.19 - || \
    log_warn "mpx-alpine build failed — mpx-fix pods will stay in ErrImageNeverPull until it is loaded"
fi
kind load docker-image ipp-platform/mpx-alpine:3.19 --name "${KIND_CLUSTER_NAME}" 2>/dev/null || true
log_info "Applying KubeVirt ARM64 mpx-strip fix DaemonSet..."
kubectl apply -f "${CROSSPLANE_DIR}/kubevirt/arm64-mpx-fix-daemonset.yaml" 2>/dev/null || \
  log_warn "arm64-mpx-fix DaemonSet apply failed — will be applied by ArgoCD on next sync"
log_success "KubeVirt ARM64 mpx-strip DaemonSet applied"

# =============================================================================
# PHASE 12: BUILD & LOAD APPLICATION IMAGES
# =============================================================================
log_section "Phase 12: Build Application Docker Images"

build_and_load() {
  local name=$1
  local context=$2
  local tag="ipp-platform/${name}:latest"

  if docker image inspect "${tag}" &>/dev/null; then
    log_info "Image ${tag} already exists, reloading into KIND..."
  else
    log_info "Building ${tag} (platform: linux/arm64)..."
    docker build --platform linux/arm64 -t "${tag}" "${context}" || {
      log_warn "arm64 build failed for ${name}, trying without platform flag..."
      docker build -t "${tag}" "${context}"
    }
  fi

  log_info "Loading ${tag} into KIND cluster..."
  kind load docker-image "${tag}" --name "${KIND_CLUSTER_NAME}" 2>/dev/null || true
  log_success "Image ${tag} loaded"
}

log_info "Building employee-frontend and employee-backend in parallel..."
build_and_load "employee-frontend" "${REPO_ROOT}/apps/employee-portal/frontend" &
BUILD_FE_PID=$!
build_and_load "employee-backend" "${REPO_ROOT}/apps/employee-portal/backend" &
BUILD_BE_PID=$!
wait "${BUILD_FE_PID}" || log_warn "employee-frontend build/load had issues"
wait "${BUILD_BE_PID}" || log_warn "employee-backend build/load had issues"
# Rollout restart forces pods to use the freshly loaded images (imagePullPolicy: IfNotPresent
# won't pull a new image by tag alone when the node already has the tag cached).
kubectl rollout restart deployment/backend deployment/frontend -n employee-portal 2>/dev/null || true

# =============================================================================
# PHASE 13: DEPLOY EMPLOYEE PORTAL
# =============================================================================
log_section "Phase 13: Deploy Employee Portal Application"

log_info "Creating employee-portal namespace..."
kubectl create namespace employee-portal --dry-run=client -o yaml | kubectl apply -f -

log_info "Applying employee portal manifests..."
# Delete stale postgres PVC so the DB always reinitialises with the correct credentials.
# The postStart lifecycle hook in deployment.yaml also handles stale-PVC cases idempotently,
# but deleting upfront avoids the pg_ctl dance entirely.
if kubectl get pvc postgres-data-postgres-0 -n employee-portal &>/dev/null 2>&1; then
  kubectl scale statefulset postgres -n employee-portal --replicas=0 2>/dev/null || true
  kubectl wait --for=delete pod/postgres-0 -n employee-portal --timeout=30s 2>/dev/null || true
  kubectl delete pvc postgres-data-postgres-0 -n employee-portal 2>/dev/null || true
  log_info "Stale postgres PVC deleted — will reinitialise cleanly."
fi
kubectl apply -f "${REPO_ROOT}/apps/employee-portal/manifests/resource-quota.yaml" 2>/dev/null || true
kubectl apply -f "${REPO_ROOT}/apps/employee-portal/manifests/init-sql-configmap.yaml" 2>/dev/null || true
kubectl apply -f "${REPO_ROOT}/apps/employee-portal/manifests/employee-portal.yaml" 2>/dev/null || true

log_info "Applying security RBAC for employee-portal..."
kubectl apply -f "${REPO_ROOT}/security/rbac/workload-rbac.yaml" 2>/dev/null || true

log_info "Applying Cilium network policies..."
kubectl apply -f "${REPO_ROOT}/networking/policies/employee-portal-netpol.yaml" 2>/dev/null || true

log_info "Waiting for PostgreSQL to be ready..."
kubectl -n employee-portal wait --for=condition=ready pod -l app=postgres --timeout=300s 2>/dev/null || \
  log_warn "PostgreSQL still starting..."

log_info "Waiting for backend..."
kubectl -n employee-portal wait --for=condition=ready pod -l app=backend --timeout=180s 2>/dev/null || \
  log_warn "Backend still starting..."

log_info "Waiting for frontend..."
kubectl -n employee-portal wait --for=condition=ready pod -l app=frontend --timeout=180s 2>/dev/null || \
  log_warn "Frontend still starting..."

log_success "Employee portal deployed"

# =============================================================================
# PHASE 14: AIOPS ENGINE
# =============================================================================
log_section "Phase 14: AIOps Engine"

# etcd accumulates ~2 GB of data by this phase — pre-emptively compact before
# loading more images + manifests to avoid NOSPACE mid-phase
etcd_recover

build_and_load "aiops-engine" "${REPO_ROOT}/aiops"

kubectl create namespace aiops --dry-run=client -o yaml | kubectl apply -f - || {
  etcd_recover
  kubectl create namespace aiops --dry-run=client -o yaml | kubectl apply -f -
}
# Apply new structured manifests (v2 multi-agent system)
kubectl apply -f "${REPO_ROOT}/aiops/manifests/rbac.yaml" 2>/dev/null \
  || kubectl apply -f "${REPO_ROOT}/aiops/manifests/aiops-rbac.yaml" 2>/dev/null || true
kubectl apply -f "${REPO_ROOT}/aiops/manifests/configmap.yaml" 2>/dev/null || true
# Apply secret example only if no real secret exists
kubectl get secret aiops-secrets -n aiops &>/dev/null \
  || kubectl apply -f "${REPO_ROOT}/aiops/manifests/secret-example.yaml" 2>/dev/null || true
# Populate ANTHROPIC_API_KEY from the root .env (sourced above) if provided —
# this switches AIOps agents from local Ollama to Anthropic Claude.
if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
  kubectl -n aiops patch secret aiops-secrets \
    --type merge -p "{\"stringData\":{\"ANTHROPIC_API_KEY\":\"${ANTHROPIC_API_KEY}\"}}" 2>/dev/null || true
  log_info "  ANTHROPIC_API_KEY found in .env — AIOps agents will use Anthropic Claude"
fi
kubectl apply -f "${REPO_ROOT}/aiops/manifests/deployment.yaml" 2>/dev/null \
  || kubectl apply -f "${REPO_ROOT}/aiops/manifests/aiops-deployment.yaml" 2>/dev/null || true
kubectl apply -f "${REPO_ROOT}/aiops/manifests/service.yaml" 2>/dev/null || true
# Force rollout so newly built image is always used (imagePullPolicy: IfNotPresent caches by tag)
kubectl rollout restart deployment/aiops-engine -n aiops 2>/dev/null || true

kubectl -n aiops wait --for=condition=ready pod -l app=aiops-engine --timeout=180s 2>/dev/null || \
  log_warn "AIOps engine still starting (LangGraph deps may take 60s on first run)..."
log_success "AIOps multi-agent engine deployed (Manager + 5 Worker Agents)"
log_info "  LLM: set ANTHROPIC_API_KEY (aiops-secrets) to use Claude, else OLLAMA_BASE_URL + OLLAMA_MODEL, else fallback rules"
log_info "  LangSmith: set LANGCHAIN_API_KEY + LANGCHAIN_TRACING_V2=true to enable tracing"

# =============================================================================
# PHASE 15: CROSSPLANE CLAIM
# =============================================================================
log_section "Phase 15: ThreeTierApp Crossplane Claim"

log_info "Waiting for Crossplane providers to be healthy before applying claim..."
for i in $(seq 1 30); do
  HELM_HEALTHY=$(kubectl get providers.pkg.crossplane.io crossplane-contrib-provider-helm \
    -o jsonpath='{.status.conditions[?(@.type=="Healthy")].status}' 2>/dev/null || echo "False")
  K8S_HEALTHY=$(kubectl get providers.pkg.crossplane.io crossplane-contrib-provider-kubernetes \
    -o jsonpath='{.status.conditions[?(@.type=="Healthy")].status}' 2>/dev/null || echo "False")
  if [[ "$HELM_HEALTHY" == "True" && "$K8S_HEALTHY" == "True" ]]; then
    log_success "Crossplane providers healthy (helm=${HELM_HEALTHY} k8s=${K8S_HEALTHY})"
    break
  fi
  log_info "  Waiting for Crossplane providers... (${i}/30) helm=${HELM_HEALTHY} k8s=${K8S_HEALTHY}"
  sleep 10
done

log_info "Ensuring employee-portal namespace exists..."
kubectl create namespace employee-portal --dry-run=client -o yaml | kubectl apply -f -

log_info "Applying ThreeTierAppClaim for employee-portal demo..."
kubectl apply -f "${CROSSPLANE_DIR}/claims/employee-portal-claim.yaml" 2>/dev/null || \
  log_warn "Crossplane claim application failed — providers may not be ready yet. Run: kubectl apply -f crossplane/claims/"

# The employee-portal postgres StatefulSet is created by this bootstrap (below) with custom
# labels + init-sql volume that differ from the composition spec.  Crossplane will try to
# patch immutable VolumeClaimTemplate labels and fail.  Switch the managed Object to
# ObserveOnly so it reads status without reconciling, avoiding the immutable-field conflict.
log_info "Patching employee-portal postgres Object to ObserveOnly (avoids VCT label conflict)..."
for i in $(seq 1 20); do
  if kubectl get object.kubernetes.crossplane.io employee-portal-postgres-sts &>/dev/null 2>&1; then
    kubectl patch object.kubernetes.crossplane.io employee-portal-postgres-sts \
      --type=merge -p '{"spec":{"managementPolicies":["Observe"]}}' 2>/dev/null && \
      log_success "employee-portal-postgres-sts set to ObserveOnly" && break
  fi
  sleep 6
done

# =============================================================================
# PHASE 16: BACKSTAGE
# =============================================================================
log_section "Phase 16: Backstage IPP Portal"

BACKSTAGE_DIR="${OUTER_ROOT}/ipp-platform-app/backstage"
cd "${BACKSTAGE_DIR}"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
  log_info "Installing Backstage dependencies (this takes 5-10 minutes on first run)..."
  yarn install --network-timeout 600000 2>/dev/null || {
    log_warn "yarn install had issues, retrying..."
    yarn install --network-timeout 600000 || log_warn "yarn install failed — build may be incomplete"
  }
fi

# Build Backstage
log_info "Building Backstage (TypeScript compile + bundle, ~5 minutes)..."
yarn build:all 2>/dev/null || {
  log_warn "Full build had warnings, trying individual packages..."
  yarn --cwd packages/backend build 2>/dev/null || log_warn "Backend build issues (may still work)"
  yarn --cwd packages/app build 2>/dev/null || log_warn "App build issues (may still work)"
}

cd "${REPO_ROOT}"

# Build Backstage Docker image
log_info "Building Backstage Docker image..."
if docker image inspect "ipp-platform/backstage:latest" &>/dev/null; then
  log_info "Backstage image exists, re-building with latest..."
fi
docker build --platform linux/arm64 -t ipp-platform/backstage:latest "${BACKSTAGE_DIR}/" || {
  log_warn "arm64 Backstage build failed, trying without platform..."
  docker build -t ipp-platform/backstage:latest "${BACKSTAGE_DIR}/"
}

log_info "Loading Backstage image into KIND..."
kind load docker-image ipp-platform/backstage:latest --name "${KIND_CLUSTER_NAME}" 2>/dev/null || true
# Force pods to pick up the freshly-loaded image even when the manifest is unchanged
# (imagePullPolicy: IfNotPresent will not re-pull by tag alone once cached on the node).
kubectl rollout restart deployment/backstage -n backstage 2>/dev/null || true

# Create Backstage namespace and secrets
kubectl create namespace backstage --dry-run=client -o yaml | kubectl apply -f -

log_info "Creating Backstage secrets..."
# Get service account token for Kubernetes plugin
kubectl create serviceaccount backstage -n backstage --dry-run=client -o yaml | kubectl apply -f -

K8S_SA_TOKEN=$(kubectl create token backstage -n backstage --duration=87600h 2>/dev/null || echo "")
K8S_CA_DATA=$(kubectl config view --raw -o jsonpath='{.clusters[0].cluster.certificate-authority-data}' 2>/dev/null || echo "")

kubectl create secret generic backstage-secrets \
  --namespace backstage \
  --from-literal=POSTGRES_USER=backstage \
  --from-literal=POSTGRES_PASSWORD=backstage-demo-local-2024 \
  --from-literal=POSTGRES_HOST=backstage-postgres \
  --from-literal=POSTGRES_PORT=5432 \
  --from-literal=BACKSTAGE_SESSION_SECRET="${BACKSTAGE_SESSION_SECRET}" \
  --from-literal=GITHUB_TOKEN="${GITHUB_TOKEN:-}" \
  --from-literal=K8S_SA_TOKEN="${K8S_SA_TOKEN}" \
  --from-literal=K8S_CA_DATA="${K8S_CA_DATA}" \
  --dry-run=client -o yaml | kubectl apply -f -

log_info "Deploying Backstage to KIND..."
# Delete ClusterRoleBindings before apply — Kubernetes forbids updating roleRef in-place
kubectl delete clusterrolebinding backstage-cluster-reader backstage-kubernetes-reader \
  --ignore-not-found 2>/dev/null || true
kubectl apply -f "${BACKSTAGE_DIR}/manifests/backstage-deployment.yaml" 2>/dev/null || true

# Always regenerate backstage-catalog ConfigMap from source files.
# The manifest embeds a static copy that goes stale; source files are authoritative.
kubectl create configmap backstage-catalog \
  --from-file=catalog-info.yaml="${BACKSTAGE_DIR}/catalog/catalog-info.yaml" \
  --from-file=templates-consolidated.yaml="${BACKSTAGE_DIR}/catalog/templates-consolidated.yaml" \
  -n backstage --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true

# Rollout restart ensures pods use the freshly loaded image on re-runs
# (apply alone produces no diff when only the image content changed, not the tag)
kubectl rollout restart deployment/backstage -n backstage 2>/dev/null || true

log_info "Populating Backstage Kubernetes plugin credentials..."
for i in $(seq 1 30); do
  K8S_TOKEN=$(kubectl -n backstage get secret backstage-sa-token -o jsonpath='{.data.token}' 2>/dev/null | base64 -d 2>/dev/null || true)
  [[ -n "$K8S_TOKEN" ]] && break
  sleep 1
done
K8S_CA=$(kubectl -n backstage get secret backstage-sa-token -o jsonpath='{.data.ca\.crt}' 2>/dev/null || true)
if [[ -n "$K8S_TOKEN" ]]; then
  kubectl -n backstage patch secret backstage-secrets \
    --type merge -p "{\"stringData\":{\"K8S_SA_TOKEN\":\"${K8S_TOKEN}\",\"K8S_CA_DATA\":\"${K8S_CA}\"}}" 2>/dev/null || true
  log_success "Kubernetes plugin credentials populated"
else
  log_warn "Could not get K8S service account token — Kubernetes plugin may not show resources"
fi

log_info "Waiting for Backstage PostgreSQL..."
kubectl -n backstage wait --for=condition=ready pod -l app=backstage-postgres --timeout=300s 2>/dev/null || \
  log_warn "Backstage PostgreSQL still starting..."

log_info "Waiting for Backstage (this may take 3-5 minutes for first-time catalog load)..."
kubectl -n backstage wait --for=condition=ready pod -l app=backstage --timeout=600s 2>/dev/null || \
  log_warn "Backstage still starting - check: kubectl -n backstage get pods"

log_success "Backstage deployed"

log_info "Waiting for Backstage catalog to load (may take up to 2 min)..."
for i in $(seq 1 24); do
  USERS=$(kubectl -n backstage exec deploy/backstage -- \
    wget -qO- "http://127.0.0.1:7007/api/catalog/entities?filter=kind%3DUser&limit=10" 2>/dev/null | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo 0)
  if (( USERS >= 1 )); then
    log_success "Backstage catalog ready — ${USERS} users loaded"
    break
  fi
  # First boot against a fresh Postgres can hit the knex migrations-lock race
  # (catalog+scaffolder init core.auth concurrently → duplicate pg_type key) and
  # the backend deadlocks instead of crashing. One restart always clears it
  # because the winning plugin's tables now exist.
  if (( i == 12 )); then
    log_warn "Catalog still not up at halfway mark — restarting Backstage once (knex first-boot race guard)"
    kubectl -n backstage delete pod -l app=backstage 2>/dev/null || true
    kubectl -n backstage wait --for=condition=ready pod -l app=backstage --timeout=300s 2>/dev/null || true
  fi
  log_info "  Waiting for catalog... (${i}/24)"
  sleep 5
done

# =============================================================================
# PHASE 17: ARGO CD APPLICATIONS
# =============================================================================
log_section "Phase 17: Argo CD Applications"

log_info "Configuring Argo CD git repository..."
if [[ -n "${GITHUB_TOKEN}" ]]; then
  kubectl apply -f - <<EOF 2>/dev/null || true
apiVersion: v1
kind: Secret
metadata:
  name: ipp-platform-repo
  namespace: argocd
  labels:
    argocd.argoproj.io/secret-type: repository
stringData:
  type: git
  url: https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}
  password: ${GITHUB_TOKEN}
  username: git
EOF
  log_success "Argo CD repository configured"
fi

log_info "Applying Argo CD applications..."
kubectl apply -f "${REPO_ROOT}/argocd/apps/" 2>/dev/null || true

# =============================================================================
# PHASE 17b: DEMO SEED — vmapp.ipp.local placeholder
# =============================================================================
log_section "Phase 17b: Demo Seed — vmapp placeholder"

log_info "Applying vmapp demo placeholder (ensures vmapp.ipp.local responds before KubeVirt VM boots)..."
kubectl apply -f "${REPO_ROOT}/platform/demo-seed/vmapp-demo-placeholder.yaml" 2>/dev/null && \
  log_success "vmapp.ipp.local placeholder deployed (ipp-platform-seed namespace)" || \
  log_warn "vmapp placeholder apply failed — check platform/demo-seed/vmapp-demo-placeholder.yaml"

# =============================================================================
# PHASE 18: GIT REPOSITORY SETUP
# =============================================================================
log_section "Phase 18: Git Repository Setup"

cd "${REPO_ROOT}"

if [[ ! -d ".git" ]]; then
  log_info "Initializing git repository..."
  git init
  git branch -M main
fi

log_info "Staging all files..."
git add -A 2>/dev/null || true

log_info "Creating commit..."
git commit -m "Initial IPP — Infrastructure Platform Portal demo with real Backstage, persona RBAC, Upbound Crossplane, Argo CD, ThreeTierApp, Cilium, Hubble, SPIRE, OPA, Kyverno, OpenCost, Grafana and AIOps" \
  2>/dev/null || log_info "Nothing new to commit (already committed)"

# Push to GitHub if authenticated
if [[ -n "${GITHUB_TOKEN}" ]]; then
  log_info "Pushing to GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}..."
  git remote remove origin 2>/dev/null || true
  git remote add origin "https://${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git"

  if git push -u origin main --force 2>/dev/null; then
    log_success "Pushed to https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}"
  else
    log_warn "Push failed. Check GITHUB_TOKEN and repository permissions."
    log_info "Manual push: git push -u origin main"
  fi
else
  log_warn "GITHUB_TOKEN not set. Skipping push."
  echo "  Manual push:"
  echo "    export GITHUB_TOKEN=<your-token>"
  echo "    git remote add origin https://\${GITHUB_TOKEN}@github.com/${GITHUB_OWNER}/${GITHUB_REPO}.git"
  echo "    git push -u origin main"
fi

# =============================================================================
# PHASE 19: VALIDATION
# =============================================================================
log_section "Phase 19: Running Validation"

log_info "Running smoke tests..."
"${REPO_ROOT}/validate-demo.sh" 2>/dev/null || \
  log_warn "Some validations failed - platform may still be initializing"

# =============================================================================
# PHASE 19.5: GITOPS STACK (Gitea + IIP Service + ArgoCD ApplicationSet)
# =============================================================================
log_section "Phase 19.5: GitOps Stack — Gitea + IIP Service"

log_info "Deploying Gitea..."
kubectl apply -f "${REPO_ROOT}/gitops/gitea/gitea-deployment.yaml"

log_info "Deploying GitOps init job (creates bot user + token)..."
kubectl apply -f "${REPO_ROOT}/gitops/gitea/gitea-init-job.yaml"

log_info "Configuring ArgoCD ApplicationSet for claims..."
kubectl apply -f "${REPO_ROOT}/gitops/argocd/gitea-repo-secret.yaml"
kubectl apply -f "${REPO_ROOT}/gitops/argocd/claims-appset-local.yaml"

log_info "Building IIP Service image..."
docker build -t ipp-platform/iip-service:latest "${REPO_ROOT}/gitops/iip-service/"
kind load docker-image ipp-platform/iip-service:latest --name ipp-local

log_info "Creating IIP Service conftest policy ConfigMap..."
kubectl create configmap iip-conftest-policy -n ipp-system \
  --from-file="${REPO_ROOT}/gitops/iip-service/policy/claim.rego" \
  --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null || true

log_info "Deploying IIP Service..."
kubectl apply -f "${REPO_ROOT}/gitops/iip-service/deployment.yaml"

log_info "Waiting for Gitea admin user to be created by init job..."
# Create admin user if Gitea is fresh (idempotent)
for i in $(seq 1 30); do
  GITEA_POD=$(kubectl get pod -n gitea -l app=gitea -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
  if [[ -n "${GITEA_POD}" ]]; then
    READY=$(kubectl get pod -n gitea "${GITEA_POD}" -o jsonpath='{.status.containerStatuses[0].ready}' 2>/dev/null)
    if [[ "${READY}" == "true" ]]; then
      # Ensure admin user exists (idempotent)
      kubectl exec -n gitea "${GITEA_POD}" -- \
        su git -s /bin/bash -c "gitea admin user create --username gitea-admin --password admin-demo-2024 --email admin@ipp.local --admin" 2>/dev/null || true
      log_success "Gitea ready"
      break
    fi
  fi
  log_info "  Waiting for Gitea... (${i}/30)"
  sleep 5
done

log_info "Waiting for Gitea init job to complete (creates bot token)..."
kubectl wait --for=condition=complete job/gitea-init -n gitea --timeout=180s 2>/dev/null && \
  log_success "Gitea init job complete — bot token provisioned" || \
  log_warn "Gitea init job timed out — IIP Service may need a manual restart after Gitea is ready"

log_info "Restarting IIP Service to pick up bot token..."
kubectl rollout restart deployment/iip-service -n ipp-system 2>/dev/null || true

log_success "GitOps stack deployed. Gitea: http://gitea.ipp.local  IIP: http://iip.ipp.local"

# =============================================================================
# DONE - PRINT ACCESS INFORMATION
# =============================================================================
log_section "Bootstrap Complete!"

echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  IPP — Infrastructure Platform Portal - Access Information${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Platform URLs:${NC}"
echo "  Backstage IPP:     http://backstage.ipp.local"
echo "  Argo CD:           http://argocd.ipp.local"
echo "  Grafana:           http://grafana.ipp.local"
echo "  Prometheus:        http://prometheus.ipp.local"
echo "  OpenCost:          http://opencost.ipp.local"
echo "  Hubble UI:         http://hubble.ipp.local"
echo "  AIOps Engine:      http://aiops.ipp.local"
echo "  Employee Portal:   http://employee.ipp.local"
echo "  Vault:             http://vault.ipp.local (token: root) / http://localhost:8200"
echo ""
echo -e "${BOLD}Persona URLs (Backstage):${NC}"
echo "  Developer:         http://backstage.ipp.local/developer"
echo "  Platform Eng:      http://backstage.ipp.local/platform"
echo "  Operations:        http://backstage.ipp.local/operations"
echo "  Security:          http://backstage.ipp.local/security"
echo ""
echo -e "${BOLD}Demo Credentials:${NC}"
echo "  Developer:         dev.user"
echo "  Platform Engineer: platform.engineer"
echo "  Operations:        ops.support"
echo "  Security Analyst:  security.analyst"
echo ""
echo -e "${BOLD}Platform Credentials:${NC}"
echo "  Argo CD admin:     ${ARGOCD_ADMIN_PASSWORD}"
echo "  Grafana admin:     grafana-demo-local-2024"
echo ""
echo -e "${BOLD}GitHub Repository:${NC}"
echo "  https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}"
echo ""
echo -e "${BOLD}Useful Commands:${NC}"
echo "  ./validate-demo.sh        # Validate all components"
echo "  ./reset-demo.sh           # Reset demo state"
echo "  ./destroy-demo.sh         # Destroy cluster (keeps source)"
echo "  ./scripts/collect-demo-status.sh  # Check platform status"
echo ""
echo -e "${BOLD}Day 2 Operations:${NC}"
echo "  ./scripts/day2-scale-frontend.sh"
echo "  ./scripts/day2-upgrade-backend.sh"
echo "  ./scripts/simulate-crashloop.sh"
echo "  ./scripts/simulate-network-deny.sh"
echo ""
echo -e "${GREEN}Installation took approximately $((SECONDS / 60)) minutes.${NC}"
echo ""

# Open all platform URLs in the default browser (macOS: open, Linux: xdg-open)
if command -v open &>/dev/null || command -v xdg-open &>/dev/null; then
  BROWSER_CMD="open"
  command -v xdg-open &>/dev/null && BROWSER_CMD="xdg-open"
  log_info "Opening platform URLs in browser..."
  ${BROWSER_CMD} "http://backstage.ipp.local"     2>/dev/null &
  sleep 1
  ${BROWSER_CMD} "http://argocd.ipp.local"        2>/dev/null &
  sleep 1
  ${BROWSER_CMD} "http://grafana.ipp.local"       2>/dev/null &
  sleep 1
  ${BROWSER_CMD} "http://prometheus.ipp.local"    2>/dev/null &
  sleep 1
  ${BROWSER_CMD} "http://opencost.ipp.local"      2>/dev/null &
  sleep 1
  ${BROWSER_CMD} "http://hubble.ipp.local"        2>/dev/null &
  sleep 1
  ${BROWSER_CMD} "http://aiops.ipp.local"         2>/dev/null &
  sleep 1
  ${BROWSER_CMD} "http://employee.ipp.local"      2>/dev/null &
  sleep 1
  ${BROWSER_CMD} "http://vault.ipp.local"         2>/dev/null &
  log_success "All URLs opened in browser"
fi
