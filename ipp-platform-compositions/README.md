# ipp-platform-compositions

**Purpose**: Crossplane XRDs (Composite Resource Definitions), Compositions, Provider configs, and the OCI package descriptor for the IPP platform package. This repo defines the infrastructure API surface that tenants consume via claims.

**Owner**: `@ipp-platform-ops`

**Argo CD Watch Scope**: Watched by `compositions-appset.yaml` in `ipp-platform-control`. Changes here are reconciled by Crossplane on the management cluster.

---

## Repository Structure

```
ipp-platform-compositions/
├── apis/
│   ├── cluster/
│   │   └── xrd-xippcluster.yaml       ← XIPPCluster (AKS/KIND cluster provisioning)
│   ├── vm/
│   │   └── xrd-xippvm.yaml            ← XIPPVirtualMachine (KubeVirt)
│   └── appbox/
│       └── xrd-xippappbox.yaml        ← XIPPAppBox (three-tier app)
├── compositions/
│   ├── cluster/
│   │   ├── composition-aks-azure.yaml
│   │   └── composition-kind-local.yaml
│   ├── appbox/
│   │   └── composition-threetierapp.yaml
│   └── kubevirt/
│       └── composition-kubevirt-vm.yaml
├── functions/
│   └── function-patch-and-transform/
│       └── function-patch-and-transform.yaml
├── providers/
│   ├── provider-azure.yaml
│   ├── provider-helm.yaml
│   ├── provider-kubernetes.yaml
│   ├── provider-patches.yaml
│   └── configs/
│       ├── azure-provider-config.yaml
│       ├── helm-provider-config.yaml
│       └── kubernetes-provider-config.yaml
├── install/
│   └── upbound-crossplane-values.yaml
└── crossplane.yaml                    ← OCI package descriptor
```

---

## XRD Naming Convention

All XRDs follow the `XIPP*` prefix pattern and carry `ipp.dhl.com/` annotations:

| XRD Kind | Claim Kind | Scope |
|---|---|---|
| `XIPPCluster` | `IPPCluster` | Namespaced |
| `XIPPAppBox` | `IPPAppBox` | Namespaced |
| `XIPPVirtualMachine` | `IPPVirtualMachine` | Namespaced |

---

## Required Claim Annotations

All claims against these XRDs must carry:

```yaml
annotations:
  ipp.dhl.com/request-id: ""
  ipp.dhl.com/business-unit: ""
  ipp.dhl.com/cost-center: ""
  ipp.dhl.com/environment: ""
  ipp.dhl.com/requested-by: ""
```

---

## Branch Protection

- Branch: `main`
- PR required with at least 1 approval from `@ipp-platform-ops`
- No force-push to `main`
