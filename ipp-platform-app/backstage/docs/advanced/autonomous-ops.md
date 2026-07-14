# Autonomous Ops

**Audience:** Platform Engineers  
**Route:** `/autonomous-ops`

---

## Purpose

The Autonomous Ops page surfaces the set of automated remediation runbooks that the AIOps engine can execute on behalf of an operator — with appropriate approval gates — rather than just recommending actions.

In the current demo, runbooks are available for the five simulated incident scenarios. Each runbook is linked from the [Agent Command Center](../aiops/index.md) recommended actions when `automation_available: true` is set in the `RecommendedAction` object.

---

## Available Runbooks

| Runbook | Trigger scenario | Script |
|---|---|---|
| CrashLoop recovery | CrashLoopBackOff detected on a deployment | `scripts/simulate-crashloop.sh --rollback` |
| Network deny recovery | Cilium flow deny event on a known service pair | `scripts/simulate-network-deny.sh --rollback` |
| Cost spike mitigation | Namespace cost > 3× 7-day baseline | `scripts/simulate-cost-spike.sh --rollback` |
| ArgoCD sync | Application OutOfSync | `argocd app sync <app-name>` |
| Policy remediation | Kyverno label violation | GitOps commit (automated via scaffolder) |

---

## Approval Flow

In the demo, runbook execution is a one-click action from the Agent Command Center response card. In a production deployment this would gate on:

1. Slack / PagerDuty approval from an on-call engineer
2. Audit log entry in the platform's audit trail
3. Optional dry-run output before execution

---

## Note on Demo Scope

Autonomous remediation is a forward-looking capability in this demo. The runbook scripts exist and are functional, but end-to-end approval-gated execution from within the Backstage UI is not yet wired up. The AIOps engine returns the script path and a description of the action — execution is currently manual.
