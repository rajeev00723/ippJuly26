# Settings

**Audience:** Platform Engineers  
**Route:** `/settings`

---

## Purpose

The Settings page provides Backstage's built-in user profile and feature-flag controls.

---

## Available Settings

### User Profile

Displays the currently active persona session: display name, email, and group memberships. This is a read-only view driven by the demo persona session, not a real identity provider.

### Feature Flags

Optional platform features can be toggled here or via `app-config.local.yaml`:

| Flag | Config key | Effect when enabled |
|---|---|---|
| Karmada multi-cluster | `karmada.enabled: true` | Shows the Karmada nav item; connects to a Karmada control plane |
| Knative serverless | `knative.demoEnabled: true` | Surfaces Knative runtime option in onboarding, the `/knative` dashboard, scale-to-zero card in FinOps, and Knative signal in AIOps |

To enable a feature flag locally without modifying `app-config.yaml`:

```yaml
# backstage/app-config.local.yaml
knative:
  demoEnabled: true
```

Restart Backstage after changing feature flags.

---

## Theme

Backstage supports light and dark mode. Use the theme toggle in the Settings page or in the top navigation bar.
