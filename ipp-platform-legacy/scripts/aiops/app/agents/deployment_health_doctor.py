"""Deployment Health Doctor — Argo CD sync state, rollout health, Crossplane readiness."""
from __future__ import annotations
import json
import logging
from pathlib import Path

from ..llm import get_llm_client
from ..fallback_rules import deployment_health_fallback
from ..models import AgentFinding, SignalBundle
from ..redaction import redact_dict
from ._parse import parse_agent_finding

logger = logging.getLogger("aiops.agents.deployment_health_doctor")

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "deployment_health_doctor.md"


def _load_prompt() -> str:
    return _PROMPT_PATH.read_text() if _PROMPT_PATH.exists() else \
        "You are the Deployment Health Doctor. Analyse deployment health and return JSON."


def _build_user_content(signals: SignalBundle) -> str:
    data = {
        "argocd": {
            "applications": [
                {k: v for k, v in app.items() if k in
                 ("name", "project", "syncStatus", "healthStatus", "revision", "namespace")}
                for app in signals.argocd.applications
            ],
            "out_of_sync_apps": signals.argocd.out_of_sync,
            "degraded_apps": signals.argocd.degraded,
        },
        "kubernetes_deployments": [
            {k: v for k, v in d.items() if k in
             ("name", "namespace", "replicas", "availableReplicas",
              "unavailableReplicas", "conditions")}
            for d in signals.kubernetes.deployments
        ],
        "crossplane": {
            "providers": [
                {k: v for k, v in p.items() if k in ("name", "installed", "healthy", "version")}
                for p in signals.crossplane.providers
            ],
            "composite_resources": [
                {k: v for k, v in r.items() if k in ("name", "kind", "namespace", "ready", "synced")}
                for r in signals.crossplane.composite_resources[:10]
            ],
            "not_ready": signals.crossplane.not_ready,
        },
    }
    return json.dumps(redact_dict(data), indent=2)


class DeploymentHealthDoctorAgent:

    async def analyze(self, signals: SignalBundle) -> AgentFinding:
        llm = get_llm_client()
        resp = await llm.generate(_load_prompt(), _build_user_content(signals))

        if not resp.used_llm:
            logger.info("Deployment Health Doctor fallback: %s", resp.error or "LLM unavailable")
            return deployment_health_fallback(signals)

        parsed = llm.extract_json(resp.text)
        if not parsed:
            logger.warning("Deployment Health Doctor: unparseable LLM output: %s…", resp.text[:200])
            return deployment_health_fallback(signals)

        try:
            return parse_agent_finding("deployment_health_doctor", parsed, resp.text)
        except Exception as exc:
            logger.warning("Deployment Health Doctor: parse error: %s — falling back", exc)
            return deployment_health_fallback(signals)
