# Getting Started

**Audience:** All personas  
**Prerequisites:** Demo cluster running (`./bootstrap-demo.sh` completed), `/etc/hosts` entries added

---

## 1. Access the Portal

Open `http://backstage.dpcs.local` in your browser.

> **Local setup:** The bootstrap script prints the KIND node IP. Add it to `/etc/hosts`:
> ```
> <KIND_IP>  backstage.dpcs.local argocd.dpcs.local grafana.dpcs.local \
>            prometheus.dpcs.local opencost.dpcs.local hubble.dpcs.local \
>            aiops.dpcs.local employee.dpcs.local
> ```

---

## 2. Log In as a Persona

The landing page shows four persona cards. Click a card and enter the credentials shown in the login modal.

| Persona | User ID | Password |
|---|---|---|
| Developer | `dev.user` | `Dev@IDP2025` |
| Platform Engineer | `platform.engineer` | `Platform@IDP2025` |
| Operations Support | `ops.support` | `Ops@IDP2025` |
| Security Analyst | `security.analyst` | `Security@IDP2025` |
| Tech Provider | `tech.provider` | `Provider@IDP2025` |

To switch persona: click **Log out** in the session banner on the landing page, then select a different card.

---

## 3. Navigating the Portal

### Home

The Home page (`/`) displays a summary dashboard tailored to your active persona — pending approvals, cluster health widgets, or cost snapshots depending on your role.

### Catalog

The Software Catalog (`/catalog`) lists all registered components, systems, APIs, and resources. Use the **Kind** and **Owner** filters to narrow results.

Key entities in the demo:

| Entity | Kind | Description |
|---|---|---|
| `idp-demo-backstage` | Component | The IPP portal itself |
| `employee-portal` | Component | Demo frontend web application |
| `employee-backend` | Component | Demo REST API service |
| `employee-database` | Component | PostgreSQL managed by Crossplane |
| `aiops-engine` | Component | LangGraph AIOps service |

### Create

The Create page (`/create`) lists Backstage software templates. The flagship template is **Three-Tier Enterprise App** — fill in the form and the scaffolder generates a Crossplane Claim, Kubernetes manifests, and an Argo CD Application, then opens a pull request.

### Marketplace

The Marketplace (`/marketplace`) lists platform capabilities and internal service offerings available for self-service consumption.

### Docs

You are here. The Docs section (`/docs`) renders TechDocs pages for any catalog entity that has a `backstage.io/techdocs-ref` annotation.

---

## 4. Quick Tour by Persona

### Developer
1. Log in as `dev.user`
2. Browse the Catalog → open `employee-portal` → view the **Dependencies** tab
3. Go to **Create** → select **Three-Tier Enterprise App** → fill the form and submit
4. Watch the scaffolder create an Argo CD Application

### Platform Engineer
1. Log in as `platform.engineer`
2. Open **Crossplane** → review composite resource claims
3. Open **GitOps** → check Argo CD sync status
4. Open **Agent Command Center** → ask a question about cluster health

### Operations Support
1. Log in as `ops.support`
2. Open **Operations** → review pod and node health
3. Open **Agent Command Center** → ask "Are there any capacity risks in the cluster?"
4. Open **Cost** → review namespace spend

### Security Analyst
1. Log in as `security.analyst`
2. Open **Security** → review policy violations
3. Open **Agent Command Center** → ask "Are any security policies violated?"
