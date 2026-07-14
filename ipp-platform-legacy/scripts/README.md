# IPP Legacy Scripts

Operational shell scripts for bootstrapping and tearing down the IPP demo environment. These scripts are **progressively deprecated** as Argo CD ApplicationSets and Crossplane Compositions take over each responsibility.

## Scripts

### `bootstrap.sh`

Bootstraps the full IPP platform on a local KIND cluster (`ipp-local`) or AKS (`--target cloud`).

```bash
# Local KIND (default)
./scripts/bootstrap.sh

# AKS (requires az login + kubeconfig)
./scripts/bootstrap.sh --target cloud
```

**What it does (KIND path):**
1. Validates prerequisites (kind, kubectl, helm, docker, ollama)
2. Creates KIND cluster `ipp-local` with `deploy/overlays/local/kind-config.yaml`
3. Installs ingress-nginx, Cilium CNI, cert-manager
4. Installs Upbound Crossplane via Helm (`bootstrap/crossplane/upbound-crossplane-values.yaml`)
5. Installs Argo CD via Kustomize (`bootstrap/argocd/`)
6. Applies `root-app.yaml` — hands off to Argo CD App-of-Apps
7. Waits for all ApplicationSets to sync
8. Builds and loads Backstage + AIOps Docker images
9. Prints access URLs

**Hosts file entries required** (add manually or script appends with sudo):
```
127.0.0.1  backstage.ipp.local
127.0.0.1  argocd.ipp.local
127.0.0.1  grafana.ipp.local
127.0.0.1  hubble.ipp.local
127.0.0.1  employee.ipp.local
127.0.0.1  opencost.ipp.local
127.0.0.1  aiops.ipp.local
```

### `destroy.sh`

Tears down the KIND cluster and cleans local Docker images.

```bash
./scripts/destroy.sh         # Interactive confirm
./scripts/destroy.sh --yes   # Non-interactive
```

---

## Deprecation Timeline

Each script section below will be retired as the corresponding GitOps component reaches stable:

| Script Section | Replacement | Status |
|---|---|---|
| ArgoCD install | `ipp-platform-control/bootstrap/argocd/` | Parallel — script still applies kustomize |
| Crossplane install | `ipp-platform-control/bootstrap/crossplane/` | Parallel — script still installs via Helm |
| Namespace creation | `ipp-platform-control/clusters/mgmt-cluster/namespaces.yaml` | Parallel — script still applies |
| App deployment | `ipp-platform-control/clusters/mgmt-cluster/applicationsets/app-appset.yaml` | In progress |
| Claim submission | `ipp-platform-claims/` + Argo CD | Planned |

When all sections are replaced, this repo is archived (read-only).
