"""
LangGraph multi-agent orchestration graph.

Graph nodes:
  collect_signals → run_workers (parallel) → manager_synthesize

The graph runs all 5 worker agents in parallel using asyncio.gather,
then synthesizes findings with the Manager Agent.

LangSmith tracing is automatically active when LANGCHAIN_TRACING_V2=true
and LANGCHAIN_API_KEY is set (configured in llm.py).
"""
from __future__ import annotations
import asyncio
import logging
from typing import Any, Optional

from .models import (
    AnalysisRequest, SignalBundle, AgentFinding, ManagerAnalysis,
    RecommendedAction, EvidenceItem,
)

logger = logging.getLogger("aiops.graph")

# ── Try to import LangGraph; fall back to a simple sequential runner ──────────
try:
    from langgraph.graph import StateGraph, END
    from typing import TypedDict
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False
    logger.info("langgraph not installed; using sequential runner")


# ── State definition ──────────────────────────────────────────────────────────

class _GraphState(dict):
    """Simple dict-based state, compatible with LangGraph StateGraph."""
    pass


# ── Signal collection node ────────────────────────────────────────────────────

async def collect_signals_node(state: dict) -> dict:
    """Collect signals from all platform sources in parallel.

    Each collector gets its own 4-second asyncio timeout so that slow/blocking
    collectors (Hubble exec, SPIRE exec) never hold up fast ones
    (Prometheus, Kubernetes, OpenCost).
    """
    from .collectors import (
        KubernetesCollector, PrometheusCollector, OpenCostCollector,
        ArgoCDCollector, CrossplaneCollector, HubbleCollector,
        GatekeeperCollector, KyvernoCollector, SpireCollector,
        KnativeCollector,
    )

    request: AnalysisRequest = state["request"]
    ns = request.namespace

    _PER_COLLECTOR_TIMEOUT = 8.0

    async def _safe_collect(coro):
        try:
            return await asyncio.wait_for(coro, timeout=_PER_COLLECTOR_TIMEOUT)
        except (asyncio.TimeoutError, Exception) as exc:
            logger.debug("Collector timed out or failed: %s", exc)
            return exc

    k8s, prom, cost, argo, xplane, hubble, gk, kyv, spire, knative = await asyncio.gather(
        _safe_collect(KubernetesCollector().collect(ns)),
        _safe_collect(PrometheusCollector().collect(ns)),
        _safe_collect(OpenCostCollector().collect(ns)),
        _safe_collect(ArgoCDCollector().collect(ns)),
        _safe_collect(CrossplaneCollector().collect(ns)),
        _safe_collect(HubbleCollector().collect(ns)),
        _safe_collect(GatekeeperCollector().collect(ns)),
        _safe_collect(KyvernoCollector().collect(ns)),
        _safe_collect(SpireCollector().collect(ns)),
        _safe_collect(KnativeCollector().collect(ns)),
        return_exceptions=True,
    )

    def _safe(result, default):
        return result if not isinstance(result, Exception) else default

    from .models import (
        KubernetesSignals, PrometheusSignals, OpenCostSignals, ArgoCDSignals,
        CrossplaneSignals, HubbleSignals, PolicySignals, SpireSignals, KnativeSignals,
    )

    signals = SignalBundle(
        namespace=ns,
        scope=request.scope,
        kubernetes=_safe(k8s, KubernetesSignals()),
        prometheus=_safe(prom, PrometheusSignals()),
        opencost=_safe(cost, OpenCostSignals()),
        argocd=_safe(argo, ArgoCDSignals()),
        crossplane=_safe(xplane, CrossplaneSignals()),
        hubble=_safe(hubble, HubbleSignals()),
        policy=_merge_policy(
            _safe(gk, PolicySignals()),
            _safe(kyv, PolicySignals()),
        ),
        spire=_safe(spire, SpireSignals()),
        knative=_safe(knative, KnativeSignals()),
    )

    return {**state, "signals": signals}


def _merge_policy(gk: Any, kyv: Any) -> Any:
    from .models import PolicySignals
    return PolicySignals(
        gatekeeper_violations=getattr(gk, "gatekeeper_violations", []),
        kyverno_violations=getattr(kyv, "kyverno_violations", []),
        available=getattr(gk, "available", False) or getattr(kyv, "available", False),
    )


# ── Worker agents node (runs all 5 in parallel) ───────────────────────────────

async def run_workers_node(state: dict) -> dict:
    """Run all 5 worker agents in parallel against the signal bundle."""
    from .agents import (
        CapacitySREAgent, FinOpsAgent, IncidentPreventionRemediationAgent,
        DeploymentHealthDoctorAgent, SecureShieldAgent,
    )
    from .fallback_rules import (
        capacity_sre_fallback, finops_fallback,
        incident_prevention_fallback, deployment_health_fallback, secure_shield_fallback,
    )

    signals: SignalBundle = state["signals"]
    request: AnalysisRequest = state["request"]

    agents = [
        ("capacity_sre", CapacitySREAgent()),
        ("finops", FinOpsAgent()) if request.include_cost else None,
        ("incident_prevention_remediation", IncidentPreventionRemediationAgent()),
        ("deployment_health_doctor", DeploymentHealthDoctorAgent()) if request.include_deployment else None,
        ("secure_shield", SecureShieldAgent()) if request.include_security else None,
    ]
    active_agents = [(name, agent) for name, agent in agents if agent is not None]

    tasks = [agent.analyze(signals) for _, agent in active_agents]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    findings: dict[str, AgentFinding] = {}
    for (name, _), result in zip(active_agents, results):
        if isinstance(result, Exception):
            logger.error("Agent %s raised exception: %s", name, result)
            findings[name] = AgentFinding(
                agent=name, status="unavailable", severity="info",
                findings=[f"Agent {name} failed with error: {result}"],
                confidence=0.0, error=str(result),
            )
        else:
            findings[name] = result

    return {**state, "findings": findings}


# ── Manager synthesis node ────────────────────────────────────────────────────

async def manager_synthesize_node(state: dict) -> dict:
    """Manager agent correlates all worker findings and produces final analysis."""
    from .manager import ManagerAgent
    manager = ManagerAgent()
    analysis = await manager.synthesize(
        request=state["request"],
        signals=state["signals"],
        findings=state["findings"],
    )
    return {**state, "analysis": analysis}


# ── Graph builder ─────────────────────────────────────────────────────────────

def build_graph():
    """Build and compile the LangGraph StateGraph (if available)."""
    if not LANGGRAPH_AVAILABLE:
        return None

    try:
        graph = StateGraph(dict)
        graph.add_node("collect_signals", collect_signals_node)
        graph.add_node("run_workers", run_workers_node)
        graph.add_node("manager_synthesize", manager_synthesize_node)

        graph.set_entry_point("collect_signals")
        graph.add_edge("collect_signals", "run_workers")
        graph.add_edge("run_workers", "manager_synthesize")
        graph.add_edge("manager_synthesize", END)

        return graph.compile()
    except Exception as exc:
        logger.warning("LangGraph compile failed: %s — using sequential runner", exc)
        return None


_compiled_graph = None


def get_graph():
    global _compiled_graph
    if _compiled_graph is None:
        _compiled_graph = build_graph()
    return _compiled_graph


# ── Main entry point ──────────────────────────────────────────────────────────

async def run_analysis(request: AnalysisRequest) -> ManagerAnalysis:
    """
    Execute the full multi-agent analysis graph.

    Tries LangGraph first; falls back to sequential execution if unavailable.
    """
    initial_state: dict = {
        "request": request,
        "signals": None,
        "findings": {},
        "analysis": None,
    }

    graph = get_graph()

    if graph is not None:
        try:
            final_state = await graph.ainvoke(initial_state)
            return final_state["analysis"]
        except Exception as exc:
            logger.warning("LangGraph execution failed: %s — falling back to sequential", exc)

    # Sequential fallback
    state = await collect_signals_node(initial_state)
    state = await run_workers_node(state)
    state = await manager_synthesize_node(state)
    return state["analysis"]
