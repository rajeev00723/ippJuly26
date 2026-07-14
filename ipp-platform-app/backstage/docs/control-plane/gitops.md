# GitOps (Argo CD)

**Audience:** Platform Engineers, Operations Support  
**Route:** `/gitops`

---

## What GitOps Does on IPP

Argo CD is the GitOps engine. Every infrastructure and application resource on the platform has a declarative source-of-truth in the `argocd/` directory of the repository. Argo CD watches Git and reconciles the cluster to match that state continuously.

**Key property:** No manual `kubectl apply`. Any change to the cluster must go through Git. This makes deployments auditable, reversible, and consistent across environments.

---

## Argo CD Applications

| Application | Source path | Target namespace | Sync policy |
|---|---|---|---|
| `backstage` | `backstage/manifests/` | `backstage` | Automated |
| `employee-portal` | `argocd/apps/employee-portal/` | `employee-app` | Automated |
| `crossplane` | `crossplane/` | `crossplane-system` | Automated |
| `observability` | `observability/` | `monitoring` | Automated |
| `security` | `security/` | `kyverno` / `spire-system` | Automated |

---

## GitOps Page in IPP

The `/gitops` page embeds the Argo CD application list view. For each application it shows:

- **Sync status** — Synced / OutOfSync / Unknown
- **Health status** — Healthy / Degraded / Progressing / Missing
- **Last synced** — timestamp of last successful sync
- **Revision** — Git commit hash of the currently deployed revision

Click an application to drill into the resource tree.

---

## Triggering a Sync

```bash
# Via Argo CD CLI
argocd app sync employee-portal

# Via kubectl (force refresh)
kubectl annotate application employee-portal \
  -n argocd argocd.argoproj.io/refresh=hard --overwrite
```

From the IPP portal: open `/gitops`, find the application, and click **Sync**.

---

## Demo Scenario: OutOfSync State

```bash
# Simulate drift
./scripts/simulate-argocd-outofsync.sh
```

The `employee-portal` application enters OutOfSync. The [Deployment Health Doctor Agent](../aiops/worker-agents.md#deployment-health-doctor-agent) detects this within the next AIOps query cycle and surfaces it with a recommended sync action.

---

## Access Argo CD Directly

`http://argocd.dpcs.local` — credentials managed via the `argocd-initial-admin-secret` in the `argocd` namespace.

```bash
kubectl get secret argocd-initial-admin-secret -n argocd \
  -o jsonpath='{.data.password}' | base64 -d
```
