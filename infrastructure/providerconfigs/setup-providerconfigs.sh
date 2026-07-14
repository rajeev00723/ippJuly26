#!/usr/bin/env bash
# Idempotent ProviderConfig setup for IIP E2E validation.
# Sources credentials from ../../.env.local (gitignored).
# Safe to re-run — uses kubectl apply throughout.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env.local"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck source=/dev/null
  source "$ENV_FILE"
else
  echo "ERROR: $ENV_FILE not found. Copy .env.local.example to .env.local and fill in values."
  exit 1
fi

# ── Helper ────────────────────────────────────────────────────────────────────
check_var() {
  local var="$1" label="$2"
  if [[ -z "${!var:-}" ]]; then
    echo "SKIP  [$label] $var is not set — skipping ProviderConfig for $label"
    return 1
  fi
  return 0
}

echo "=== IIP ProviderConfig Setup ==="

# ── provider-kubernetes (in-cluster, already applied by compositions) ──────────
echo "OK    [Kubernetes] Using InjectedIdentity — already applied via compositions/providers"

# ── provider-helm (in-cluster, already applied) ────────────────────────────────
echo "OK    [Helm] Using InjectedIdentity — already applied via compositions/providers"

# ── Azure ─────────────────────────────────────────────────────────────────────
if check_var AZURE_CLIENT_ID "Azure" && \
   check_var AZURE_CLIENT_SECRET "Azure" && \
   check_var AZURE_TENANT_ID "Azure" && \
   check_var AZURE_SUBSCRIPTION_ID "Azure"; then

  AZURE_CREDS_JSON=$(cat <<EOF
{
  "clientId": "${AZURE_CLIENT_ID}",
  "clientSecret": "${AZURE_CLIENT_SECRET}",
  "tenantId": "${AZURE_TENANT_ID}",
  "subscriptionId": "${AZURE_SUBSCRIPTION_ID}",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
EOF
)

  kubectl create secret generic azure-creds \
    --namespace crossplane-system \
    --from-literal=creds="$AZURE_CREDS_JSON" \
    --dry-run=client -o yaml | kubectl apply -f -

  echo "OK    [Azure] Secret azure-creds applied in crossplane-system"
  echo "OK    [Azure] ProviderConfig already applied via compositions/providers/configs/azure-provider-config.yaml"
fi

# ── GCP ───────────────────────────────────────────────────────────────────────
if check_var GCP_PROJECT_ID "GCP" && check_var GCP_SA_KEY_JSON "GCP"; then
  echo "$GCP_SA_KEY_JSON" | base64 -d > /tmp/gcp-sa-key.json

  kubectl create secret generic gcp-creds \
    --namespace crossplane-system \
    --from-file=creds=/tmp/gcp-sa-key.json \
    --dry-run=client -o yaml | kubectl apply -f -

  rm -f /tmp/gcp-sa-key.json

  kubectl apply -f - <<YAML
apiVersion: gcp.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  projectID: ${GCP_PROJECT_ID}
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: gcp-creds
      key: creds
YAML
  echo "OK    [GCP] Secret gcp-creds and ProviderConfig applied"
fi

# ── vSphere ───────────────────────────────────────────────────────────────────
if check_var VSPHERE_SERVER "vSphere" && \
   check_var VSPHERE_USER "vSphere" && \
   check_var VSPHERE_PASSWORD "vSphere"; then

  kubectl create secret generic vsphere-creds \
    --namespace crossplane-system \
    --from-literal=server="${VSPHERE_SERVER}" \
    --from-literal=username="${VSPHERE_USER}" \
    --from-literal=password="${VSPHERE_PASSWORD}" \
    --dry-run=client -o yaml | kubectl apply -f -

  kubectl apply -f - <<YAML
apiVersion: vsphere.upbound.io/v1beta1
kind: ProviderConfig
metadata:
  name: default
spec:
  credentials:
    source: Secret
    secretRef:
      namespace: crossplane-system
      name: vsphere-creds
      key: password
  vsphereServer: ${VSPHERE_SERVER}
  allowUnverifiedSsl: ${VSPHERE_ALLOW_UNVERIFIED_SSL:-true}
YAML
  echo "OK    [vSphere] Secret vsphere-creds and ProviderConfig applied"
fi

# ── Azure provider-family CRD + RBAC bootstrap ────────────────────────────────
# provider-family-azure installs the ProviderConfig and ProviderConfigUsage CRDs
# and creates matching RBAC for each provider pod. If its package revision never
# reaches Healthy (lock DAG conflict with function-patch-and-transform), neither
# happens. We apply both defensively here so AKS claims always reconcile.

echo ""
echo "=== Azure ProviderConfig CRD bootstrap ==="

AZURE_PC_CRD="providerconfigs.azure.upbound.io"
AZURE_PCU_CRD="providerconfigusages.azure.upbound.io"

if ! kubectl get crd "$AZURE_PC_CRD" &>/dev/null; then
  echo "INFO  Applying ProviderConfig CRD from upstream (provider-family-azure fallback)..."
  kubectl apply -f \
    https://raw.githubusercontent.com/upbound/provider-azure/main/package/crds/azure.upbound.io_providerconfigs.yaml \
    2>/dev/null && echo "OK    ProviderConfig CRD applied" || echo "WARN  ProviderConfig CRD apply failed — retry after provider-family-azure is Healthy"
else
  echo "OK    $AZURE_PC_CRD already registered"
fi

if ! kubectl get crd "$AZURE_PCU_CRD" &>/dev/null; then
  echo "INFO  Applying ProviderConfigUsage CRD from upstream..."
  kubectl apply -f \
    https://raw.githubusercontent.com/upbound/provider-azure/main/package/crds/azure.upbound.io_providerconfigusages.yaml \
    2>/dev/null && echo "OK    ProviderConfigUsage CRD applied" || echo "WARN  ProviderConfigUsage CRD apply failed"
else
  echo "OK    $AZURE_PCU_CRD already registered"
fi

# Apply the ProviderConfig now that the CRD is guaranteed to exist
SCRIPT_DIR_ABS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "$SCRIPT_DIR_ABS/../../ipp-platform-compositions/providers/configs/azure-provider-config.yaml" ]]; then
  kubectl apply -f "$SCRIPT_DIR_ABS/../../ipp-platform-compositions/providers/configs/azure-provider-config.yaml" \
    2>/dev/null && echo "OK    azure ProviderConfig applied" || echo "WARN  azure ProviderConfig apply failed"
fi

# Apply RBAC and restart provider pods so they pick up the newly registered CRDs.
# The ClusterRole is namespace-independent; ClusterRoleBindings target the provider
# service accounts by name (stable across restarts, tied to the provider revision hash).
echo ""
echo "=== Azure provider RBAC ==="
kubectl apply -f "$SCRIPT_DIR_ABS/azure-provider-rbac.yaml" \
  2>/dev/null && echo "OK    ClusterRole applied" || echo "WARN  ClusterRole apply failed"

# Bind the ClusterRole to every provider-azure-* service account in crossplane-system
for sa in $(kubectl get serviceaccounts -n crossplane-system \
              --no-headers -o custom-columns=NAME:.metadata.name 2>/dev/null \
              | grep "^provider-azure"); do
  crb_name="crossplane:provider:${sa}-providerconfig"
  kubectl create clusterrolebinding "$crb_name" \
    --clusterrole=crossplane:provider:azure-providerconfig-access \
    --serviceaccount="crossplane-system:${sa}" \
    --dry-run=client -o yaml | kubectl apply -f - 2>/dev/null \
    && echo "OK    ClusterRoleBinding $crb_name" || true
done

# Restart the provider pods so they detect the newly registered CRDs via their informers.
# (Informers cache at startup — a pod running before the CRD existed will never see it.)
echo ""
echo "=== Restarting Azure provider deployments ==="
for deploy in $(kubectl get deployments -n crossplane-system --no-headers \
                  -o custom-columns=NAME:.metadata.name 2>/dev/null \
                  | grep "^provider-azure"); do
  kubectl rollout restart "deployment/$deploy" -n crossplane-system 2>/dev/null \
    && echo "OK    Restarted $deploy" || true
done

echo ""
echo "=== Provider Health ==="
kubectl get providers 2>/dev/null || echo "(no Provider CRs — Upbound Apollo installs providers via pods)"
echo ""
echo "=== ProviderConfigs ==="
kubectl get providerconfigs.kubernetes.crossplane.io 2>/dev/null && true
kubectl get providerconfigs.helm.crossplane.io 2>/dev/null && true
kubectl get providerconfigs.azure.upbound.io 2>/dev/null && true
kubectl get providerconfigs.gcp.upbound.io 2>/dev/null && true

echo ""
echo "Done."
