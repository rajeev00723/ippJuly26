"""FinOps Agent — cost allocation, idle resources, label governance, spend anomalies."""
from __future__ import annotations
import json
import logging
from pathlib import Path

from ..llm import get_llm_client
from ..fallback_rules import finops_fallback
from ..models import AgentFinding, SignalBundle
from ..redaction import redact_dict
from ._parse import parse_agent_finding

logger = logging.getLogger("aiops.agents.finops")

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "finops.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text() if _PROMPT_PATH.exists() else \
        "You are the FinOps Agent. Analyse cost signals and return JSON."


def _build_user_content(signals: SignalBundle) -> str:
    # Pods missing required cost labels (sample — don't send thousands)
    missing_labels = []
    seen_ns: set = set()
    for pod in signals.kubernetes.pods:
        ns = pod.get("namespace", "")
        if ns in seen_ns:
            continue
        labels = pod.get("labels", {})
        missing = [k for k in ("cost-center", "owner", "environment") if not labels.get(k)]
        if missing:
            missing_labels.append({"namespace": ns, "missing_labels": missing})
            seen_ns.add(ns)

    # Knative scale-to-zero cost signal
    knative_data: dict = {"available": False}
    if signals.knative.available:
        total_svc = len(signals.knative.services)
        scaled_to_zero = len(signals.knative.scaled_to_zero)
        idle_pct = round(scaled_to_zero / max(total_svc, 1) * 100, 1) if total_svc > 0 else 0
        knative_data = {
            "available": True,
            "total_services": total_svc,
            "total_revisions": len(signals.knative.revisions),
            "scaled_to_zero_revisions": scaled_to_zero,
            "idle_revision_pct": idle_pct,
            # Representative cost saving (scale-to-zero removes idle compute)
            "estimated_monthly_saving_usd": round(idle_pct / 100 * 48.60, 2),
            "note": (
                "Knative scale-to-zero eliminates idle compute cost. "
                f"{scaled_to_zero}/{total_svc} services currently at zero replicas."
            ),
        }

    data = {
        "opencost": {
            "available": signals.opencost.available,
            "total_monthly_estimate_usd": signals.opencost.total_monthly_estimate,
            "top_namespace_costs": dict(list(signals.opencost.namespace_costs.items())[:10]),
            "top_workload_costs": signals.opencost.workload_costs[:8],
        },
        "label_governance": {
            "namespaces_missing_cost_labels": missing_labels[:10],
        },
        "knative_serverless": knative_data,
    }
    return json.dumps(redact_dict(data), indent=2)


class FinOpsAgent:

    async def analyze(self, signals: SignalBundle) -> AgentFinding:
        llm = get_llm_client()
        resp = await llm.generate(_load_prompt(), _build_user_content(signals))

        if not resp.used_llm:
            logger.info("FinOps fallback: %s", resp.error or "LLM unavailable")
            return finops_fallback(signals)

        parsed = llm.extract_json(resp.text)
        if not parsed:
            logger.warning("FinOps: unparseable LLM output: %s…", resp.text[:200])
            return finops_fallback(signals)

        try:
            return parse_agent_finding("finops", parsed, resp.text)
        except Exception as exc:
            logger.warning("FinOps: parse error: %s — falling back", exc)
            return finops_fallback(signals)
