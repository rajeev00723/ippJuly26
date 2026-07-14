# AIOps Agent Command Center

**Audience:** Platform Engineers, Operations Support, Security Analysts  
**Route:** `/aiops-chat`

---

## Overview

The Manager Agent Command Center is IPP's flagship demo feature. It is a conversational interface backed by a LangGraph multi-agent system that:

1. Collects raw telemetry from all platform sources in parallel.
2. Routes signals to five specialist worker agents running in parallel.
3. Has a Manager Agent correlate and synthesise all worker findings.
4. Returns a single, structured natural-language response with findings, root causes, recommended actions, and a confidence/severity score.

The entire cycle — signal collection, parallel agent analysis, LLM synthesis — completes in under 10 seconds for most queries.

---

## How to Use It

1. Open **Agent Command Center** from the left nav (Control Plane section).
2. Type a question or click one of the **suggested prompts** below the input field.
3. The UI shows a per-agent status stream as workers complete.
4. The final answer appears with the Manager Agent's synthesised response.

### Example Prompts

| Question | Primary agents invoked |
|---|---|
| "Why is the employee-portal application unhealthy?" | Incident Prevention, Deployment Health Doctor, Capacity SRE |
| "What is driving today's cost increase?" | FinOps, Capacity SRE |
| "Are there any capacity risks in the cluster?" | Capacity SRE, Deployment Health Doctor |
| "Are any security policies violated?" | Secure Shield, Incident Prevention |
| "What should I do right now?" | All five agents |

---

## Data Mode Indicator

Each response is tagged **LIVE** or **DEMO**:

- **LIVE** — data was fetched from a running cluster component in real time.
- **DEMO** — the cluster component was unreachable; the engine returned pre-scripted simulation data to keep the demo functional.

The data mode indicator appears next to the response header and on individual evidence items.

---

## In This Section

| Page | Description |
|---|---|
| [Manager Agent](manager-agent.md) | How the Manager Agent orchestrates and synthesises |
| [Worker Agents](worker-agents.md) | The five specialist agents and their responsibilities |
| [Telemetry Sources](telemetry-sources.md) | Data sources, collectors, and LIVE/DEMO/N/A tags |
| [Example Walkthrough](example-walkthrough.md) | Step-by-step trace of a real query |
| [Confidence & Severity Scoring](scoring.md) | How scores are computed and what they mean |
