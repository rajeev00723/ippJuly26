"""
AIOps Manager Agent

Receives all worker findings, correlates them, deduplicates recommendations,
ranks risks, and produces the final ManagerAnalysis.
Uses local LLM for synthesis when available; falls back to rule-based logic.
"""
from __future__ import annotations
import json
import logging
from pathlib import Path

from .llm import get_llm_client, TRACING_STATUS
from .fallback_rules import manager_fallback_synthesis, _NOISE_FINDINGS
from .models import (
    AgentFinding, AnalysisRequest, ManagerAnalysis,
    RecommendedAction, EvidenceItem, SignalBundle,
)
from .redaction import redact_dict

logger = logging.getLogger("aiops.manager")

_PROMPT_PATH = Path(__file__).parent / "prompts" / "manager.md"


def _load_prompt() -> str:
    if _PROMPT_PATH.exists():
        return _PROMPT_PATH.read_text()
    return "You are the AIOps Manager Agent. Synthesize worker findings and return structured JSON."


def _build_synthesis_prompt(
    question: str,
    findings: dict[str, AgentFinding],
) -> str:
    """
    Build the user content for manager LLM synthesis.
    Boilerplate "all healthy" findings are collapsed and their empty
    recommendations dropped — keeps the model focused on real signals and
    cuts input tokens on the common mostly-healthy-cluster case.
    """
    worker_data = {}
    for name, finding in findings.items():
        real_findings = [f for f in finding.findings if f.lower() not in _NOISE_FINDINGS]
        worker_data[name] = {
            "status": finding.status,
            "severity": finding.severity,
            "findings": real_findings or ["healthy — no issues"],
            "probable_root_cause": finding.probable_root_cause if real_findings else None,
            "recommendations": [r.model_dump() for r in finding.recommendations[:5]] if real_findings else [],
            "confidence": finding.confidence,
        }

    return json.dumps({
        "question": question,
        "worker_findings": worker_data,
    }, indent=2)


class ManagerAgent:

    async def synthesize(
        self,
        request: AnalysisRequest,
        signals: SignalBundle,
        findings: dict[str, AgentFinding],
    ) -> ManagerAnalysis:
        """Synthesize all worker findings into a final ManagerAnalysis."""
        llm = get_llm_client()
        system_prompt = _load_prompt()
        user_content = _build_synthesis_prompt(request.question, findings)

        resp = await llm.generate(system_prompt, user_content)

        if not resp.used_llm:
            logger.info("Manager using fallback synthesis (%s)", resp.error or "LLM unavailable")
            return self._build_from_fallback(request, findings, signals)

        parsed = llm.extract_json(resp.text)
        if not parsed:
            logger.warning("Manager: LLM returned unparseable JSON, using fallback")
            return self._build_from_fallback(request, findings, signals)

        try:
            raw_actions = parsed.get("recommended_actions", [])
            actions = []
            for i, ra in enumerate(raw_actions):
                if not isinstance(ra, dict):
                    continue
                try:
                    actions.append(RecommendedAction(
                        priority=int(ra.get("priority", i + 1)),
                        action=str(ra.get("action") or ra.get("recommendation") or "")[:500],
                        owner=str(ra.get("owner", "operations")),
                        automation_available=bool(ra.get("automation_available", False)),
                        script=str(ra["script"]) if ra.get("script") else None,
                        risk=str(ra.get("risk", "low")),
                    ))
                except Exception:
                    pass

            # Lenient evidence parsing
            evidence = []
            for e in parsed.get("evidence", []):
                if not isinstance(e, dict):
                    continue
                try:
                    known = {k: str(v) for k, v in e.items()
                             if k in ("source", "metric", "query", "value", "detail") and v}
                    extra = {k: v for k, v in e.items()
                             if k not in ("source", "metric", "query", "value", "detail")}
                    if extra and not known.get("detail"):
                        known["detail"] = "; ".join(f"{k}={v}" for k, v in extra.items())[:200]
                    if "source" not in known:
                        known["source"] = "manager"
                    evidence.append(EvidenceItem(**known))
                except Exception:
                    pass

            return ManagerAnalysis(
                summary=str(parsed.get("summary", "")),
                severity=str(parsed.get("severity", "info")),
                business_impact=str(parsed.get("business_impact", "")),
                probable_root_cause=str(parsed.get("probable_root_cause", "") or ""),
                recommended_actions=actions,
                worker_findings=findings,
                evidence=evidence,
                confidence=float(parsed.get("confidence", 0.70)),
                llm_mode="local",
                llm_model=resp.model,
                llm_provider=llm.provider,
                tracing=TRACING_STATUS,
            )
        except Exception as exc:
            logger.warning("Manager: failed to parse LLM output: %s — %s", exc, resp.text[:300])
            return self._build_from_fallback(request, findings, signals)

    def _build_from_fallback(
        self,
        request: AnalysisRequest,
        findings: dict[str, AgentFinding],
        signals: SignalBundle,
    ) -> ManagerAnalysis:
        """Build ManagerAnalysis using deterministic rule-based synthesis."""
        synthesis = manager_fallback_synthesis(request.question, findings)

        actions = [
            RecommendedAction(**ra) for ra in synthesis.get("recommended_actions", [])
            if isinstance(ra, dict)
        ]
        evidence = [
            EvidenceItem(**ev) for ev in synthesis.get("evidence", [])
            if isinstance(ev, dict)
        ]

        return ManagerAnalysis(
            summary=synthesis["summary"],
            severity=synthesis["severity"],
            business_impact=synthesis["business_impact"],
            probable_root_cause=synthesis["probable_root_cause"],
            recommended_actions=actions,
            worker_findings=findings,
            evidence=evidence,
            confidence=synthesis["confidence"],
            llm_mode="fallback",
            llm_model="rule-based",
            llm_provider="rule-based",
            tracing=TRACING_STATUS,
        )
