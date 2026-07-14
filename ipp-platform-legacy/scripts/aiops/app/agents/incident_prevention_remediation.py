"""
Incident Prevention & Remediation Agent

Correlates CrashLoops, probe failures, network denials, Argo CD OutOfSync,
Crossplane failures, and produces safe, GitOps-first remediation plans.
"""
from __future__ import annotations
import json
import logging
from pathlib import Path

from ..llm import get_llm_client
from ..fallback_rules import incident_prevention_fallback
from ..models import AgentFinding, SignalBundle
from ..redaction import redact_dict
from ._parse import parse_agent_finding

logger = logging.getLogger("aiops.agents.incident_prevention_remediation")

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "incident_prevention_remediation.md"


def _load_prompt() -> str:
    if _PROMPT_PATH.exists():
        return _PROMPT_PATH.read_text()
    return "You are the Incident Prevention & Remediation Agent. Analyze incidents and return structured JSON."


def _filter_hubble_noise(flows: list) -> list:
    """Remove expected protocol drops (ICMPv6 router solicitations, etc.) that are not incidents."""
    filtered = []
    for f in flows:
        drop = f.get("drop_reason", "").lower()
        proto = f.get("protocol", "").lower()
        # Skip ICMPv6 multicast drops — these are normal in Kubernetes
        if "unsupported_l3_protocol" in drop and "icmpv6" in proto.lower():
            continue
        if "RouterSolicitation" in f.get("drop_reason", ""):
            continue
        filtered.append(f)
    return filtered


def _build_user_content(signals: SignalBundle) -> str:
    real_denied = _filter_hubble_noise(signals.hubble.denied_flows)
    data = {
        "kubernetes": {
            "crashloop_pods": signals.kubernetes.crashloop_pods,
            "pending_pods": signals.kubernetes.pending_pods,
            "recent_warning_events": [
                {k: v for k, v in ev.items() if k in ("type", "reason", "message", "namespace", "object")}
                for ev in signals.kubernetes.events
                if ev.get("type") == "Warning"
            ][:15],
        },
        "argocd": {
            "out_of_sync_apps": signals.argocd.out_of_sync,
            "degraded_apps": signals.argocd.degraded,
            "all_apps": [
                {k: v for k, v in a.items() if k in ("name", "syncStatus", "healthStatus", "project")}
                for a in signals.argocd.applications
            ],
        },
        "crossplane": {
            "not_ready_resources": signals.crossplane.not_ready,
        },
        "hubble_real_denied_flows": real_denied[:20],
        "hubble_summary": signals.hubble.extra,
    }
    return json.dumps(redact_dict(data), indent=2)


class IncidentPreventionRemediationAgent:

    async def analyze(self, signals: SignalBundle) -> AgentFinding:
        llm = get_llm_client()
        system_prompt = _load_prompt()
        user_content = _build_user_content(signals)

        resp = await llm.generate(system_prompt, user_content)

        if not resp.used_llm:
            logger.info("Incident agent using fallback rules (%s)", resp.error or "LLM unavailable")
            return incident_prevention_fallback(signals)

        parsed = llm.extract_json(resp.text)
        if not parsed:
            logger.warning("Incident agent: LLM returned unparseable JSON, using fallback")
            return incident_prevention_fallback(signals)

        try:
            return parse_agent_finding("incident_prevention_remediation", parsed, resp.text)
        except Exception as exc:
            logger.warning("Incident agent: parse error: %s — falling back", exc)
            return incident_prevention_fallback(signals)
