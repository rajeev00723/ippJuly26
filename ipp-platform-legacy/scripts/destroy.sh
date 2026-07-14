#!/usr/bin/env bash
# =============================================================================
# IPP — Infrastructure Platform Portal Demo Destroy Script
# Deletes KIND cluster and cleans runtime artifacts.
# Source code is preserved.
# =============================================================================
set -uo pipefail

export PATH="${PATH}:/usr/local/bin:/opt/homebrew/bin"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BOLD='\033[1m'; NC='\033[0m'

log_info()    { echo -e "\033[0;34m[INFO]\033[0m  $*"; }
log_success() { echo -e "${GREEN}[DONE]${NC}  $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}  $*"; }

KIND_CLUSTER_NAME="ipp-local"
AUTO_YES="${1:-}"

echo ""
echo -e "${BOLD}${RED}IPP — Infrastructure Platform Portal Demo — Destroy${NC}"
echo ""
echo "This will:"
echo "  - Delete KIND cluster '${KIND_CLUSTER_NAME}' and ALL Kubernetes resources"
echo "  - Remove demo Docker images from local Docker"
echo "  - Remove KIND-related kubeconfig entries"
echo ""
echo "This will NOT:"
echo "  - Delete source code in this directory"
echo "  - Delete Helm repos"
echo "  - Delete any files outside this repo"
echo ""

if [[ "${AUTO_YES}" != "--yes" && "${AUTO_YES}" != "-y" ]]; then
  read -r -p "Are you sure you want to destroy the demo cluster? [y/N] " CONFIRM
  if [[ "${CONFIRM}" != "y" && "${CONFIRM}" != "Y" ]]; then
    echo "Aborted."
    exit 0
  fi
fi

echo ""

# Delete KIND cluster
if kind get clusters 2>/dev/null | grep -q "^${KIND_CLUSTER_NAME}$"; then
  log_info "Deleting KIND cluster '${KIND_CLUSTER_NAME}'..."
  kind delete cluster --name "${KIND_CLUSTER_NAME}"
  log_success "KIND cluster '${KIND_CLUSTER_NAME}' deleted"
else
  log_info "KIND cluster '${KIND_CLUSTER_NAME}' not found (already deleted)"
fi

# Remove demo Docker images
log_info "Removing demo Docker images..."
for img in \
  "ipp-platform/employee-frontend:latest" \
  "ipp-platform/employee-backend:latest" \
  "ipp-platform/aiops-engine:latest" \
  "ipp-platform/backstage:latest"; do
  if docker image inspect "${img}" &>/dev/null; then
    docker rmi "${img}" 2>/dev/null && log_success "Removed: ${img}" || log_warn "Could not remove: ${img}"
  fi
done

# Clean kubeconfig
log_info "Cleaning kubeconfig..."
kubectl config delete-context "kind-${KIND_CLUSTER_NAME}" 2>/dev/null && \
  log_success "Removed kubeconfig context" || true
kubectl config delete-cluster "kind-${KIND_CLUSTER_NAME}" 2>/dev/null || true
kubectl config delete-user "kind-${KIND_CLUSTER_NAME}" 2>/dev/null || true

# Remove /etc/hosts entries (optional)
if grep -q "ipp.local" /etc/hosts 2>/dev/null; then
  log_info "Removing ipp.local entries from /etc/hosts (requires sudo)..."
  sudo sed -i.bak '/ipp.local/d' /etc/hosts 2>/dev/null && \
    log_success "Removed /etc/hosts entries" || \
    log_warn "Could not modify /etc/hosts — manually remove lines with 'ipp.local'"
fi

echo ""
echo -e "${GREEN}${BOLD}Destroy complete.${NC}"
echo ""
echo "Source code is preserved in this directory."
echo "To recreate the demo: ./bootstrap-demo.sh"
echo ""
