"""
Secure Shield Agent

Analyzes OPA Gatekeeper violations, Kyverno policy reports, Cilium denied
flows, SPIFFE identity gaps, RBAC misconfigurations, and security posture.
"""
from __future__ import annotations
import json
import logging
from pathlib import Path

from ..llm import get_llm_client
from ..fallback_rules import secure_shield_fallback
from ..models import AgentFinding, SignalBundle
from ..redaction import redact_dict
from ._parse import parse_agent_finding

logger = logging.getLogger("aiops.agents.secure_shield")

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "secure_shield.md"


def _load_prompt() -> str:
    if _PROMPT_PATH.exists():
        return _PROMPT_PATH.read_text()
    return "You are the Secure Shield Agent. Analyze security posture and return structured JSON."


def _filter_noise(flows: list) -> list:
    """Remove expected ICMPv6/protocol drops that are not security events."""
    return [
        f for f in flows
        if "UNSUPPORTED_L3_PROTOCOL" not in f.get("drop_reason", "")
        and "RouterSolicitation" not in f.get("drop_reason", "")
    ]


def _build_user_content(signals: SignalBundle) -> str:
    real_denied = _filter_noise(signals.hubble.denied_flows)
    # Summarise by source→dest for the LLM (avoid data explosion)
    flow_summary: dict = {}
    for f in real_denied:
        key = f"{f.get('source', '?')} -> {f.get('destination', '?')}:{f.get('port', '?')}"
        flow_summary[key] = flow_summary.get(key, 0) + 1

    data = {
        "policy": {
            "gatekeeper_violations": signals.policy.gatekeeper_violations[:15],
            "kyverno_violations": signals.policy.kyverno_violations[:15],
        },
        "hubble": {
            "deny_rate_sample": signals.hubble.extra.get("deny_rate_sample", 0),
            "denied_count": signals.hubble.extra.get("denied_count", 0),
            "policy_count": signals.hubble.extra.get("policy_count", 0),
            "denied_flow_pairs": flow_summary,      # {src->dst:port: count}
            "cilium_network_policies": signals.hubble.network_policies,
        },
        "spire": {
            "registered_entry_count": len(signals.spire.entries),
            "workloads_without_spiffe_identity": signals.spire.workloads_without_identity,
        },
    }
    return json.dumps(redact_dict(data), indent=2)


class SecureShieldAgent:

    async def analyze(self, signals: SignalBundle) -> AgentFinding:
        llm = get_llm_client()
        system_prompt = _load_prompt()
        user_content = _build_user_content(signals)

        resp = await llm.generate(system_prompt, user_content)

        if not resp.used_llm:
            logger.info("Secure Shield using fallback rules (%s)", resp.error or "LLM unavailable")
            return secure_shield_fallback(signals)

        parsed = llm.extract_json(resp.text)
        if not parsed:
            logger.warning("Secure Shield: LLM returned unparseable JSON, using fallback")
            return secure_shield_fallback(signals)

        try:
            return parse_agent_finding("secure_shield", parsed, resp.text)
        except Exception as exc:
            logger.warning("Secure Shield: parse error: %s — falling back", exc)
            return secure_shield_fallback(signals)
