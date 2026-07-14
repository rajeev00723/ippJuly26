# Confidence & Severity Scoring

---

## Severity

Severity is a categorical label applied by each worker agent and then by the Manager Agent to the overall synthesised response.

| Value | Meaning |
|---|---|
| `critical` | Immediate service impact; data loss or complete outage likely |
| `high` | Significant risk; action required within hours |
| `medium` | Notable issue; action recommended within the sprint |
| `low` | Minor issue or informational observation |
| `healthy` | No issues detected |

**Worker agent severity** reflects the worst finding within that agent's domain.

**Manager Agent severity** is typically the maximum severity across all worker agents, with one exception: if the Manager Agent's LLM synthesis determines that findings from multiple agents are symptoms of a single root cause (rather than independent issues), it may lower the overall severity because the blast radius is bounded.

---

## Confidence

Confidence is a `float` in the range `0.0–1.0`. It represents the system's certainty that its findings accurately reflect the actual cluster state.

### What lowers confidence

| Factor | Effect |
|---|---|
| A collector timed out → DEMO data used | −0.05 to −0.15 per source |
| LLM was not available (fallback rules used) | −0.10 |
| Conflicting signals from different agents | −0.05 to −0.10 |
| Low metric sample count from Prometheus | −0.05 |

### What raises confidence

| Factor | Effect |
|---|---|
| Multiple independent sources corroborate the same finding | +0.05 to +0.15 |
| All collectors returned LIVE data | Baseline is higher |
| LLM synthesis with parseable structured output | No penalty |

### Interpreting scores

| Range | Interpretation |
|---|---|
| 0.85–1.00 | High confidence — act on recommendations |
| 0.70–0.84 | Moderate confidence — verify key findings before acting |
| 0.50–0.69 | Low confidence — some or most data is from DEMO fallback; treat as directional guidance only |
| < 0.50 | Very low — most collectors unavailable; findings are illustrative |

---

## Example

For the [security policy query walkthrough](example-walkthrough.md):

- Kyverno returned LIVE data: baseline confidence ~0.90
- SPIRE timed out (DEMO data): −0.08
- Hubble returned LIVE data, corroborating the Cilium deny findings: +0.05
- LLM synthesis succeeded: no penalty

**Final confidence: 0.87** — reported as 87% in the UI.
