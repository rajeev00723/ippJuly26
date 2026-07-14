# My Resources

**Audience:** Platform Engineers, Developers  
**Route:** `/infra-onboarding/resources`

---

## Purpose

The My Resources page lists all infrastructure resources provisioned by or on behalf of the current persona's team. It provides a live view of Crossplane Claim status without requiring direct `kubectl` access.

---

## Resource List

Each resource card shows:

| Field | Description |
|---|---|
| Name | Crossplane Claim name |
| Kind | Resource type (e.g. `ThreeTierApp`) |
| Namespace | Target namespace |
| Status | Ready / Not Ready / Unknown |
| Age | Time since creation |
| Synced | Argo CD sync status |

---

## Actions

From the resource list, platform engineers can:

- **View details** — drills into the Crossplane Composite Resource (XR) and its composed child resources
- **Scale** — redirect to Day 2 Operations → Scale action
- **Delete** — removes the Claim; Crossplane cascade-deletes composed resources

> **Warning:** Deleting a claim deletes all resources provisioned by that claim, including databases and persistent volumes. This action is not reversible in the demo environment.

---

## Filtering

Resources are filtered by the active persona's team membership. A Platform Engineer sees all resources across all teams. A Developer sees only resources owned by their team.

---

## Related

- [Day 2 Operations](day2-ops.md)
- [Onboard App](onboard-app.md)
