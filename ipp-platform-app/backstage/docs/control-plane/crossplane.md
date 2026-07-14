# Crossplane

**Audience:** Platform Engineers  
**Route:** `/crossplane`

---

## What Crossplane Does

Crossplane is the infrastructure abstraction layer. It extends the Kubernetes API with Custom Resource Definitions (CRDs) that represent platform capabilities — namespaces, databases, network policies — as Kubernetes objects. Platform engineers define **Composite Resource Definitions (XRDs)** and **Compositions** that translate a developer's high-level claim into the specific Kubernetes resources needed to run a workload.

---

## Key Concepts

| Concept | Description |
|---|---|
| **XRD** (Composite Resource Definition) | Defines the schema for a platform capability (e.g. `ThreeTierApp`) |
| **Composition** | Maps an XRD to concrete Kubernetes resources |
| **Claim** | A developer-facing request for a capability (namespace-scoped) |
| **Composite Resource (XR)** | The cluster-scoped object Crossplane reconciles |
| **Provider** | Crossplane plugin that knows how to manage a target system (e.g. `provider-kubernetes`) |

---

## Demo: ThreeTierApp

The demo platform ships with a `ThreeTierApp` XRD. When a developer submits the **Three-Tier Enterprise App** template, the scaffolder creates a claim like:

```yaml
apiVersion: platform.dpcs.local/v1alpha1
kind: ThreeTierApp
metadata:
  name: employee-portal
  namespace: employee-app
spec:
  frontend:
    image: registry.dpcs.local/employee-frontend:v1.2.0
    replicas: 2
  backend:
    image: registry.dpcs.local/employee-backend:v1.2.0
    replicas: 2
  database:
    storageSize: 5Gi
```

Crossplane reconciles this into: a `Namespace`, two `Deployments`, two `Services`, a `PersistentVolumeClaim`, and `CiliumNetworkPolicy` objects.

---

## Crossplane Page in IPP

The `/crossplane` page shows:

- **Providers** — health status of all installed Crossplane providers
- **Composite Resource Claims** — list of active claims with reconciliation status (Ready / Not Ready)
- **Events** — recent reconciliation events and errors

**Healthy state:** All providers show `HealthCondition: Healthy: true` and all claims show `Synced: True, Ready: True`.

---

## Troubleshooting

```bash
# Check provider health
kubectl get providers

# Describe a stuck provider
kubectl describe provider provider-kubernetes

# Force re-reconcile a claim
kubectl annotate threetierapp employee-portal \
  crossplane.io/paused=true --overwrite
kubectl annotate threetierapp employee-portal \
  crossplane.io/paused- --overwrite
```

See [Troubleshooting](../troubleshooting.md) for more.
