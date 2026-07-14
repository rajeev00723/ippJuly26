# Day 2 Operations

**Audience:** Platform Engineers, Operations Support  
**Route:** `/infra-onboarding/day2`

---

## Purpose

Day 2 Ops covers the lifecycle management actions that occur after initial provisioning: scaling, restarting, snapshotting, and decommissioning workloads. These actions are surfaced as guided forms rather than raw `kubectl` commands.

---

## Available Actions

### Scale

Adjust the replica count for a deployment without editing Git directly. The scale action:
1. Updates the `replicas` field in the Crossplane Claim spec
2. Commits the change to Git
3. Argo CD picks up the change and reconciles the deployment

> **Note:** Direct `kubectl scale` bypasses GitOps and will be reverted by Argo CD on the next sync. Always scale through this interface or via Git.

### Restart

Issues a rolling restart (`kubectl rollout restart`) to the selected deployment. Useful when a workload is stuck in a non-crash state that a fresh pod start can resolve.

### Snapshot

Triggers a database snapshot for the selected PostgreSQL instance. In the demo this runs a `pg_dump` via a Kubernetes Job.

### Decommission

Initiates a controlled decommission workflow:
1. Scales deployment to 0 replicas
2. Creates a final database snapshot
3. Deletes the Crossplane Claim (cascades to all composed resources)
4. Archives the Argo CD Application

---

## AIOps Integration

If Day 2 Ops actions are triggered in response to an AIOps recommendation, paste the runbook script from the Agent Command Center into the **Runbook** tab on this page. The platform will execute it with the appropriate service-account permissions.
