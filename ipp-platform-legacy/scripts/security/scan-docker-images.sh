#!/usr/bin/env bash
# Scan platform Docker images for vulnerabilities with trivy.
# Usage: ./scan-docker-images.sh [--build]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
LEGACY_SCRIPTS="${REPO_ROOT}/ipp-platform-legacy/scripts"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if ! command -v trivy &>/dev/null; then
  echo "${RED}trivy not found. Install: brew install trivy${NC}"
  exit 1
fi

BUILD=false
if [[ "${1:-}" == "--build" ]]; then
  BUILD=true
fi

scan_image() {
  local label="$1"
  local image="$2"
  echo ""
  echo "━━━ ${label}: ${image} ━━━"
  trivy image \
    --severity CRITICAL,HIGH,MEDIUM \
    --ignore-unfixed \
    --exit-code 0 \
    "${image}" 2>/dev/null | tail -20
}

scan_dockerfile() {
  local label="$1"
  local path="$2"
  echo ""
  echo "━━━ Dockerfile: ${label} ━━━"
  trivy config --severity HIGH,CRITICAL --exit-code 0 "${path}" 2>/dev/null | tail -15
}

echo "IPP Platform — Docker vulnerability scan"
echo "Repo: ${REPO_ROOT}"

# KIND node images (local cluster runtime)
scan_image "KIND node (current default v1.32.11)" "kindest/node:v1.32.11"
scan_image "KIND node (recommended v1.36.1, kind>=0.32)" "kindest/node:v1.36.1"

# Third-party images used in manifests
scan_image "PostgreSQL" "postgres:16-alpine"

if [[ "${BUILD}" == true ]]; then
  echo ""
  echo "${YELLOW}Building application images before scan...${NC}"
  docker build -t ipp-platform/scan-backstage "${LEGACY_SCRIPTS}/backstage/" || true
  docker build -t ipp-platform/scan-employee-backend \
    "${LEGACY_SCRIPTS}/apps/employee-portal/backend/" || true
  docker build -t ipp-platform/scan-employee-frontend \
    "${LEGACY_SCRIPTS}/apps/employee-portal/frontend/" || true
  docker build -t ipp-platform/scan-aiops "${LEGACY_SCRIPTS}/aiops/" || true

  scan_image "Backstage" "ipp-platform/scan-backstage"
  scan_image "Employee backend" "ipp-platform/scan-employee-backend"
  scan_image "Employee frontend" "ipp-platform/scan-employee-frontend"
  scan_image "AIOps" "ipp-platform/scan-aiops"
else
  echo ""
  echo "${YELLOW}Skipping app image scan (pass --build to build and scan custom images)${NC}"
fi

scan_dockerfile "backstage" "${LEGACY_SCRIPTS}/backstage/Dockerfile"
scan_dockerfile "employee-backend" "${LEGACY_SCRIPTS}/apps/employee-portal/backend/Dockerfile"
scan_dockerfile "employee-frontend" "${LEGACY_SCRIPTS}/apps/employee-portal/frontend/Dockerfile"
scan_dockerfile "aiops" "${LEGACY_SCRIPTS}/aiops/Dockerfile"

echo ""
echo "${GREEN}Scan complete.${NC}"
echo "Recommendations:"
echo "  1. brew upgrade kind   # target kind >= 0.32.0"
echo "  2. kind delete cluster --name ipp-local && make start   # recreates cluster with patched node image"
echo "  3. kindest/node is LOCAL-DEV ONLY — never deploy to production clouds"
