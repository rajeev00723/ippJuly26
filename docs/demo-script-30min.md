# IPP Platform — 30-Minute Team Demo Script

**Audience:** internal team (engineering)
**Goal:** show the platform end-to-end — self-service infra, GitOps, security/cost posture, and the new Claude-powered AIOps — and land the "AIOps just got a lot smarter" story.
**Total runtime:** 30 min (28 min content + 2 min buffer)

---

## Before you start (do this ~10 min before the team joins)

```bash
cd ipp-platform-legacy
make validate          # confirm cluster + all components are green
make aiops-llm-status   # confirm AIOps is on Claude (or flip it — see below)
```

Open these tabs in advance so you're not waiting on page loads mid-demo:

| Tab | URL |
|---|---|
| Backstage home | http://backstage.ipp.local |
| AIOps Dashboard | http://backstage.ipp.local/aiops |
| AIOps Chat | http://backstage.ipp.local/aiops-chat |
| Argo CD | http://argocd.ipp.local |
| Grafana | http://grafana.ipp.local |
| OpenCost | http://opencost.ipp.local |
| Hubble | http://hubble.ipp.local |

Have a terminal ready in the repo root (`ipp-platform-legacy/`) for the `make sim-*` commands — that's what makes the AIOps section feel live instead of canned.

**Decide up front:** demo AIOps on Claude (richer narrative, ~10-30s per answer) or Ollama (faster, more clipped). Recommendation: **Claude** — it's the new thing your team hasn't seen yet, and 30-60s per analysis is fine for a live demo, especially since the UI streams progress the whole time (see 6a below).

---

## Minute-by-minute

### 0–2 min — Framing (talk, no clicking)
- One sentence on what IPP is: a Backstage-based Internal Developer Platform — developers request infra through a self-service portal, GitOps (Argo CD + Crossplane) provisions it, and a multi-agent AIOps layer watches the whole stack.
- Name the five things you'll show: **self-service provisioning → GitOps → security/cost posture → live incident → AI diagnosis**.

### 2–7 min — Developer self-service (Backstage catalog)
Open **Backstage home** (http://backstage.ipp.local).
- **Catalog**: show the `employee-portal` (ThreeTierApp) component already registered — components, APIs, ownership all visible.
- **Marketplace / Create**: show the self-service template for provisioning new infra (Crossplane claim via a Backstage scaffolder template) — don't necessarily run it live unless you have time; walking through the form is enough to make the point: *"a developer never touches kubectl or a cloud console."*
- **Onboard App** (`/infra-onboarding`): show the infra-onboarding flow — this is the "requesting" side of self-service.

Talking point: *"Everything you're about to see downstream — GitOps sync, security policy, cost attribution — starts from this one request."*

### 7–12 min — GitOps in action (Crossplane + Argo CD)
Open **GitOps Dashboard** (`/gitops`) then **Argo CD** (http://argocd.ipp.local).
- Show the `employee-portal` Argo CD Application: **Synced / Healthy**, and the resource tree (Deployment, Service, Ingress).
- Open **Crossplane Dashboard** (`/crossplane`) — show the live Claim → Composition → managed resources chain for the ThreeTierApp.
- Talking point: *"The claim we could submit from Onboard App a minute ago becomes a Git commit → Argo CD picks it up → Crossplane reconciles the actual infra. No one is running `kubectl apply` by hand."*

### 12–17 min — Security & cost posture
Quick tour, ~2.5 min each:
- **Security Posture** (`/security-posture`) or **Security** persona (`/security`): SPIRE/SPIFFE identity coverage, OPA Gatekeeper + Kyverno policy compliance, Hubble/Cilium network flow visibility.
- **Cost Dashboard** (`/cost`) or **FinOps Charge Visibility** (`/finops-charge-visibility`): OpenCost-driven per-namespace spend, efficiency scores, right-sizing opportunities.
- Talking point: *"Zero-trust identity, policy enforcement, and cost attribution are first-class, not bolted on afterward."*

### 17–26 min — AIOps, powered by Claude (the centerpiece — give this the most time)

**17–19 min — Trigger a real problem.** In your terminal:
```bash
make sim-crash      # forces employee-portal backend into CrashLoopBackOff
# or: make sim-netdeny   (denies backend→postgres traffic via NetworkPolicy)
```
Let it run for ~20-30s so Prometheus/Kubernetes signals actually reflect it.

**19–23 min — AIOps Dashboard** (`/aiops`)
- Click **Run Analysis**. While it runs, narrate: 5 specialist agents (Capacity SRE, FinOps, Incident Prevention & Remediation, Deployment Health Doctor, Secure Shield) collect real signals in parallel from Prometheus, Kubernetes, Argo CD, Hubble, OpenCost, SPIRE, Kyverno/OPA.
- Point out the **"✦ Claude: claude-sonnet-5"** badge — this is new since the last demo; previously this ran on a local Ollama model.
- Read the **Manager Agent Summary**: call out that it's not just listing findings — it's correlating them into one causal chain (e.g. "network policy blocking X → CrashLoop → Argo CD drift" as one incident, not three).
- Show the **Business Impact** and **Recommended Actions** — quantified, resource-specific, ranked by priority.

**23–25 min — AIOps Chat** (`/aiops-chat`)
- Ask a live question, e.g. *"What is the current platform health?"* or *"Any network policy violations right now?"*
- While it streams, narrate the same 5-agent + manager pipeline, now as a conversational interface.
- Call out the **"Predicted trajectory"** line at the end of the response — this is Claude reasoning forward from the evidence ("at 8 restarts and climbing, expect near-total unavailability within the next restart cycle"), grounded strictly in real numbers, not invented.

**25–26 min — The provider toggle** (this is the thing your team will ask about)
```bash
make aiops-use-local     # instant switch to local Ollama, no rebuild
make aiops-llm-status    # confirm
make aiops-use-claude    # switch back
```
Talking point: *"The Anthropic key stays configured permanently — this is a live flag, not a redeploy. Use local when you want zero API cost / fully offline; use Claude when you want the deeper synthesis quality you just saw."*

**Cleanup** (do this before Q&A or right after, so the cluster is clean for next time):
```bash
kubectl set image deployment/backend backend=ipp-platform/employee-backend:latest -n employee-portal   # undo sim-crash
# or: kubectl delete networkpolicy sim-deny-all -n employee-portal   # undo sim-netdeny
```

### 26–28 min — One more page, your choice
Pick whichever is most relevant to who's in the room:
- **Agent Command Center** (`/agent-command-center`) — cross-agent execution view.
- **Autonomous Data Center** / **Karmada** / **Knative** (`/autonomous-datacenter`, `/karmada`, `/knative`) — multi-cluster/serverless story if your audience cares about that roadmap.

### 28–30 min — Wrap-up & Q&A
- Recap in one breath: *self-service → GitOps → policy/cost guardrails → AI that actually explains root cause instead of just alerting.*
- Open the floor.

---

## Fallback / troubleshooting notes
- If `make sim-crash` doesn't show up in the AIOps analysis fast enough, give it 30-60s — Prometheus scrape interval + agent signal collection isn't instant.
- If Claude responses feel slow in front of the room, that's expected (~30-60s round trip across 5 parallel agent calls + narrative synthesis) — the UI's live status/agent-completion stream is there specifically so it doesn't feel like a dead wait. Narrate through it.
- If Anthropic is unreachable for any reason, the platform automatically falls back to rule-based synthesis — nothing breaks, the demo just loses the causal-chain narrative quality. `make aiops-llm-status` tells you which mode you're in before you start.
