"""Capacity SRE Agent — CPU/memory saturation, restarts, CrashLoops, pending pods."""
from __future__ import annotations
import json
import logging
from pathlib import Path

from ..llm import get_llm_client
from ..fallback_rules import capacity_sre_fallback
from ..models import AgentFinding, SignalBundle
from ..redaction import redact_dict
from ._parse import parse_agent_finding

logger = logging.getLogger("aiops.agents.capacity_sre")

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "capacity_sre.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text() if _PROMPT_PATH.exists() else \
        "You are the Capacity SRE Agent. Analyse capacity signals and return JSON."


def _build_user_content(signals: SignalBundle) -> str:
    data = {
        "kubernetes": {
            "crashloop_pods": signals.kubernetes.crashloop_pods,
            "pending_pods": signals.kubernetes.pending_pods,
            "high_restart_pods": signals.kubernetes.high_restart_pods[:10],
            "deployments_with_unavailable_replicas": [
                {k: v for k, v in d.items() if k in
                 ("name", "namespace", "replicas", "availableReplicas", "unavailableReplicas")}
                for d in signals.kubernetes.deployments
                if d.get("unavailableReplicas", 0) and int(d.get("unavailableReplicas", 0)) > 0
            ],
        },
        "prometheus": {
            "memory_pressure": [
                {k: v for k, v in m.items() if k in ("namespace", "pod", "container", "value")}
                for m in signals.prometheus.memory_pressure[:15]
            ],
            "cpu_saturation": [
                {k: v for k, v in m.items() if k in ("namespace", "pod", "container", "value")}
                for m in signals.prometheus.cpu_saturation[:15]
            ],
            "pod_restarts_above_threshold": [
                {k: v for k, v in m.items() if k in ("namespace", "pod", "container", "value")}
                for m in signals.prometheus.pod_restarts[:10]
            ],
            "crashloop_containers": signals.prometheus.crashloop_containers[:10],
        },
    }
    return json.dumps(redact_dict(data), indent=2)


class CapacitySREAgent:

    async def analyze(self, signals: SignalBundle) -> AgentFinding:
        llm = get_llm_client()
        resp = await llm.generate(_load_prompt(), _build_user_content(signals))

        if not resp.used_llm:
            logger.info("Capacity SRE fallback: %s", resp.error or "LLM unavailable")
            return capacity_sre_fallback(signals)

        parsed = llm.extract_json(resp.text)
        if not parsed:
            logger.warning("Capacity SRE: unparseable LLM output: %s…", resp.text[:200])
            return capacity_sre_fallback(signals)

        try:
            return parse_agent_finding("capacity_sre", parsed, resp.text)
        except Exception as exc:
            logger.warning("Capacity SRE: parse error: %s — falling back", exc)
            return capacity_sre_fallback(signals)
