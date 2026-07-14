# Conftest — Pre-merge Claim Validation

[Conftest](https://www.conftest.dev/) runs OPA policies against claim YAML files before they are merged into `ipp-platform-claims`. This catches missing annotations, wrong environments, and malformed values without requiring a running cluster.

## Policies

| File | What it checks |
|---|---|
| `policy/claim_annotations.rego` | All 5 required `ipp.dhl.com/*` annotations are present and non-empty; email format; environment value; directory/annotation env mismatch |

## Running Locally

```bash
# Install conftest (macOS)
brew install conftest

# Validate a single claim
conftest test \
  ipp-platform-claims/appbox/dev/bu-demo/claim-threetierapp-demo-dev-001.yaml \
  --policy ipp-platform-policies/conftest/policy/

# Validate all claims at once
find ipp-platform-claims -name '*.yaml' -not -name 'CLAIM_TEMPLATE.yaml' | \
  xargs conftest test --policy ipp-platform-policies/conftest/policy/
```

## CI Integration

The `claim-watcher.yml` workflow in `ipp-platform-legacy/github-actions/workflows/` runs this automatically on every PR to `ipp-platform-claims`. The `@ipp-automation-bot` will not merge a PR with Conftest failures.

## Adding New Policies

1. Add a `.rego` file to `policy/`
2. Use `package ipp.claims`
3. Define `deny[msg]` rules for hard failures, `warn[msg]` for advisory checks
4. Test locally before opening a PR to this repo
