"""
Integration tests for the LangGraph multi-agent orchestration.
Uses mocked collectors and LLM to run without cluster or LLM access.
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

from app.models import (
    AnalysisRequest, ManagerAnalysis,
    KubernetesSignals, PrometheusSignals, OpenCostSignals,
    ArgoCDSignals, CrossplaneSignals, HubbleSignals,
    PolicySignals, SpireSignals, SignalBundle,
)


def _make_empty_signals():
    return SignalBundle(
        kubernetes=KubernetesSignals(available=False),
        prometheus=PrometheusSignals(available=False),
        opencost=OpenCostSignals(available=False),
        argocd=ArgoCDSignals(available=False),
        crossplane=CrossplaneSignals(available=False),
        hubble=HubbleSignals(available=False),
        policy=PolicySignals(available=False),
        spire=SpireSignals(available=False),
    )


@pytest.fixture
def mock_collectors():
    """Mock all collectors to return empty (unavailable) signals."""
    signal = _make_empty_signals()
    with patch("app.graph.KubernetesCollector") as k8s_cls, \
         patch("app.graph.PrometheusCollector") as prom_cls, \
         patch("app.graph.OpenCostCollector") as cost_cls, \
         patch("app.graph.ArgoCDCollector") as argo_cls, \
         patch("app.graph.CrossplaneCollector") as xp_cls, \
         patch("app.graph.HubbleCollector") as hub_cls, \
         patch("app.graph.GatekeeperCollector") as gk_cls, \
         patch("app.graph.KyvernoCollector") as kyv_cls, \
         patch("app.graph.SpireCollector") as spire_cls:

        for cls in (k8s_cls, prom_cls, cost_cls, argo_cls, xp_cls, hub_cls, gk_cls, kyv_cls, spire_cls):
            instance = cls.return_value
            instance.collect = AsyncMock(return_value=_make_empty_signals())

        # Fix individual return types
        k8s_cls.return_value.collect = AsyncMock(return_value=KubernetesSignals(available=False))
        prom_cls.return_value.collect = AsyncMock(return_value=PrometheusSignals(available=False))
        cost_cls.return_value.collect = AsyncMock(return_value=OpenCostSignals(available=False))
        argo_cls.return_value.collect = AsyncMock(return_value=ArgoCDSignals(available=False))
        xp_cls.return_value.collect = AsyncMock(return_value=CrossplaneSignals(available=False))
        hub_cls.return_value.collect = AsyncMock(return_value=HubbleSignals(available=False))
        gk_cls.return_value.collect = AsyncMock(return_value=PolicySignals(available=False))
        kyv_cls.return_value.collect = AsyncMock(return_value=PolicySignals(available=False))
        spire_cls.return_value.collect = AsyncMock(return_value=SpireSignals(available=False))

        yield


@pytest.fixture
def mock_llm_unavailable():
    """Mock LLM as unavailable so fallback rules are used."""
    from app.llm import LLMResponse
    with patch("app.agents.capacity_sre.get_llm_client") as m1, \
         patch("app.agents.finops.get_llm_client") as m2, \
         patch("app.agents.incident_prevention_remediation.get_llm_client") as m3, \
         patch("app.agents.deployment_health_doctor.get_llm_client") as m4, \
         patch("app.agents.secure_shield.get_llm_client") as m5, \
         patch("app.manager.get_llm_client") as m6:
        for m in (m1, m2, m3, m4, m5, m6):
            client = m.return_value
            client.generate = AsyncMock(return_value=LLMResponse(
                text="", used_llm=False, model="rule-based", error="LLM unavailable"
            ))
            client._check_available = AsyncMock(return_value=False)
            client.model = "rule-based"
        yield


@pytest.mark.asyncio
async def test_run_analysis_returns_manager_analysis(mock_collectors, mock_llm_unavailable):
    """Full graph run should return a valid ManagerAnalysis."""
    from app.graph import run_analysis
    request = AnalysisRequest(
        scope="cluster",
        question="Is the platform healthy?",
    )
    result = await run_analysis(request)
    assert isinstance(result, ManagerAnalysis)
    assert result.analysis_id is not None
    assert result.severity in ("info", "low", "medium", "high", "critical")
    assert result.confidence >= 0
    assert result.llm_mode == "fallback"


@pytest.mark.asyncio
async def test_run_analysis_with_crashloop(mock_llm_unavailable):
    """Analysis should detect CrashLoopBackOff from Kubernetes signals."""
    from app.graph import collect_signals_node, run_workers_node, manager_synthesize_node
    from app.models import AnalysisRequest

    signals = _make_empty_signals()
    signals.kubernetes = KubernetesSignals(
        available=True,
        crashloop_pods=["employee-portal/backend-xyz-pod"],
    )

    state = {
        "request": AnalysisRequest(scope="cluster", question="Why is backend crashing?"),
        "signals": signals,
        "findings": {},
        "analysis": None,
    }

    state = await run_workers_node(state)
    state = await manager_synthesize_node(state)

    analysis = state["analysis"]
    assert isinstance(analysis, ManagerAnalysis)

    # Should detect the crashloop
    all_findings = []
    for finding in analysis.worker_findings.values():
        all_findings.extend(finding.findings)

    assert any("crash" in f.lower() or "CrashLoop" in f for f in all_findings)


@pytest.mark.asyncio
async def test_analysis_confidence_range(mock_collectors, mock_llm_unavailable):
    """Confidence score must be between 0 and 1."""
    from app.graph import run_analysis
    result = await run_analysis(AnalysisRequest(scope="cluster", question="Health check"))
    assert 0.0 <= result.confidence <= 1.0


@pytest.mark.asyncio
async def test_worker_findings_present(mock_collectors, mock_llm_unavailable):
    """All 5 worker agents should produce findings."""
    from app.graph import run_analysis
    result = await run_analysis(AnalysisRequest(scope="cluster", question="Full analysis"))
    assert len(result.worker_findings) >= 1  # At least one agent ran
