"""
Shared LLM response parsing helpers — tolerant of extra/missing fields
so that any valid JSON from the LLM produces a usable AgentFinding.
"""
from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional

from ..models import AgentFinding, EvidenceItem, AgentRecommendation

logger = logging.getLogger("aiops.agents.parse")

_EVIDENCE_KEYS = {"source", "metric", "query", "value", "detail"}
_REC_KEYS = {"action", "risk", "automation", "owner"}


def _safe_evidence(raw: Any) -> Optional[EvidenceItem]:
    if not isinstance(raw, dict):
        return None
    # Flatten any non-schema keys into 'detail'
    known = {k: str(v) for k, v in raw.items() if k in _EVIDENCE_KEYS and v is not None}
    extra = {k: v for k, v in raw.items() if k not in _EVIDENCE_KEYS}
    if extra and not known.get("detail"):
        known["detail"] = "; ".join(f"{k}={v}" for k, v in extra.items())[:300]
    if "source" not in known:
        known["source"] = "llm"
    try:
        return EvidenceItem(**known)
    except Exception as exc:
        logger.debug("Evidence item skipped: %s — %s", raw, exc)
        return None


def _safe_recommendation(raw: Any) -> Optional[AgentRecommendation]:
    if not isinstance(raw, dict):
        return None
    action = str(raw.get("action") or raw.get("recommendation") or "")
    if not action:
        return None
    return AgentRecommendation(
        action=action[:500],
        risk=str(raw.get("risk", "low")),
        automation=str(raw["automation"]) if raw.get("automation") else None,
        owner=str(raw.get("owner", "operations")),
    )


def parse_agent_finding(agent_key: str, parsed: Dict[str, Any], llm_resp_text: str = "") -> AgentFinding:
    """
    Build an AgentFinding from raw LLM JSON, ignoring unknown fields
    and coercing types so pydantic doesn't reject the output.
    """
    evidence = [e for e in (_safe_evidence(e) for e in parsed.get("evidence", [])) if e]
    recommendations = [r for r in (_safe_recommendation(r) for r in parsed.get("recommendations", [])) if r]

    findings = parsed.get("findings", [])
    if not isinstance(findings, list):
        findings = [str(findings)]
    findings = [str(f) for f in findings if f]

    try:
        confidence = float(parsed.get("confidence", 0.75))
    except (TypeError, ValueError):
        confidence = 0.75

    return AgentFinding(
        agent=agent_key,
        status=str(parsed.get("status", "healthy")),
        severity=str(parsed.get("severity", "info")),
        findings=findings,
        probable_root_cause=str(parsed["probable_root_cause"]) if parsed.get("probable_root_cause") else None,
        evidence=evidence,
        recommendations=recommendations,
        confidence=confidence,
        llm_used=True,
    )
