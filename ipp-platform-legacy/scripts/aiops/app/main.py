"""
IDP AIOps Engine v2 — Multi-Agent Local LLM AIOps System
=========================================================
FastAPI service orchestrating 6 AI agents (1 Manager + 5 Workers)
powered by a local Ollama LLM with rule-based fallback.
"""
from __future__ import annotations
import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse, StreamingResponse

from .config import get_settings
from .llm import get_llm_client, TRACING_STATUS
from .models import (
    AnalysisRequest, ManagerAnalysis, AgentStatusResponse,
    HealthResponse, Signal, SignalsResponse,
    Incident, Recommendation, IncidentsResponse, RecommendationsResponse,
    ChatRequest, ChatResponse, TelemetryStatusResponse,
)
from .graph import run_analysis
from .chat import chat_stream_generator, chat_once, get_conversation_history, get_last_executions, get_last_telemetry

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("aiops-engine")

# ── Config ────────────────────────────────────────────────────────────────────
cfg = get_settings()

AGENT_NAMES = [
    "AIOps Manager Agent",
    "Capacity SRE Agent",
    "FinOps Agent",
    "Incident Prevention & Remediation Agent",
    "Deployment Health Doctor Agent",
    "Secure Shield Agent",
]

AGENT_KEYS = [
    "manager",
    "capacity_sre",
    "finops",
    "incident_prevention_remediation",
    "deployment_health_doctor",
    "secure_shield",
]

# ── In-memory analysis cache ──────────────────────────────────────────────────
_analysis_cache: Dict[str, ManagerAnalysis] = {}
_latest_analysis_id: Optional[str] = None
_cache_ts: float = 0.0


def _store_analysis(analysis: ManagerAnalysis) -> None:
    global _latest_analysis_id, _cache_ts
    _analysis_cache[analysis.analysis_id] = analysis
    _latest_analysis_id = analysis.analysis_id
    _cache_ts = time.monotonic()
    # Keep only the last 20 analyses
    if len(_analysis_cache) > 20:
        oldest = sorted(_analysis_cache.keys())[0]
        del _analysis_cache[oldest]


# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="IDP AIOps Engine",
    version=cfg.app_version,
    description=(
        "Multi-agent AIOps system with local LLM (Ollama), LangGraph orchestration, "
        "and optional LangSmith tracing. 1 Manager + 5 Worker agents."
    ),
)

app.add_middleware(
    CORSMiddleware,
    # Origins are configurable via CORS_ALLOWED_ORIGINS env var (comma-separated).
    # Per RFC 6454, a wildcard "*" cannot be combined with allow_credentials=True.
    allow_origins=[o.strip() for o in cfg.cors_allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)


# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["health"])
async def health():
    """Liveness/readiness probe + LLM status."""
    llm = get_llm_client()
    llm_ok = await llm._check_available()
    return HealthResponse(
        status="healthy",
        version=cfg.app_version,
        timestamp=datetime.utcnow(),
        demo_mode=not llm_ok,
        incidents_detected=len(_analysis_cache),
        agents={k: "ready" for k in AGENT_KEYS},
        llm_mode="local" if llm_ok else "fallback",
        llm_model=llm.model if llm_ok else "rule-based",
        llm_provider=llm.provider if llm_ok else "rule-based",
        tracing=TRACING_STATUS,
    )


# ── Agents ────────────────────────────────────────────────────────────────────

@app.get("/agents", tags=["agents"])
async def list_agents():
    """List all registered agents."""
    return {
        "agents": [
            {"key": key, "name": name, "role": _agent_role(key)}
            for key, name in zip(AGENT_KEYS, AGENT_NAMES)
        ],
        "total": len(AGENT_KEYS),
    }


@app.get("/agents/status", response_model=AgentStatusResponse, tags=["agents"])
async def agents_status():
    """Check LLM availability and agent readiness."""
    llm = get_llm_client()
    llm_ok = await llm._check_available()
    return AgentStatusResponse(
        agents=[
            {"key": k, "name": n, "status": "ready", "mode": "local" if llm_ok else "fallback"}
            for k, n in zip(AGENT_KEYS, AGENT_NAMES)
        ],
        llm_mode="local" if llm_ok else "fallback",
        llm_model=llm.model if llm_ok else "rule-based",
        llm_provider=llm.provider if llm_ok else "rule-based",
        tracing=TRACING_STATUS,
        ollama_reachable=llm_ok,
    )


# ── Analysis ──────────────────────────────────────────────────────────────────

@app.post("/analyze", response_model=ManagerAnalysis, tags=["aiops"])
async def analyze(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Run a full multi-agent analysis.

    Triggers all 5 worker agents in parallel, then synthesizes findings
    via the Manager Agent. Results are cached for subsequent /analysis/{id} calls.
    """
    try:
        analysis = await run_analysis(request)
        _store_analysis(analysis)
        return analysis
    except Exception as exc:
        logger.error("Analysis failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}")


@app.get("/analysis/latest", response_model=ManagerAnalysis, tags=["aiops"])
async def latest_analysis():
    """Return the most recent analysis result, or run a default one."""
    if _latest_analysis_id and _latest_analysis_id in _analysis_cache:
        age = time.monotonic() - _cache_ts
        if age < cfg.analysis_cache_ttl:
            return _analysis_cache[_latest_analysis_id]

    # Auto-run a default analysis
    request = AnalysisRequest(
        scope="cluster",
        question="Provide a comprehensive health summary of the platform.",
        include_security=True,
        include_cost=True,
        include_deployment=True,
    )
    analysis = await run_analysis(request)
    _store_analysis(analysis)
    return analysis


@app.get("/analysis/{analysis_id}", response_model=ManagerAnalysis, tags=["aiops"])
async def get_analysis(analysis_id: str):
    """Retrieve a specific analysis by ID."""
    if analysis_id not in _analysis_cache:
        raise HTTPException(status_code=404, detail=f"Analysis '{analysis_id}' not found")
    return _analysis_cache[analysis_id]


# ── Signals ───────────────────────────────────────────────────────────────────

@app.get("/signals", response_model=SignalsResponse, tags=["aiops"])
async def get_signals():
    """Collect and return raw platform signals."""
    from .collectors import PrometheusCollector
    import httpx

    prom = PrometheusCollector()
    now = datetime.utcnow()
    signals: List[Signal] = []
    demo_mode = False

    queries = {
        "total_pods": "sum(kube_pod_info)",
        "running_pods": 'sum(kube_pod_status_phase{phase="Running"})',
        "pending_pods": 'sum(kube_pod_status_phase{phase="Pending"})',
        "crashloop_containers": 'sum(kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"})',
        "argocd_outofsync": 'sum(argocd_app_info{sync_status="OutOfSync"})',
    }

    for name, query in queries.items():
        result = await prom._query(query)
        if result is None:
            demo_mode = True
            signals.append(Signal(name=name, value=0.0, labels={"demo": "true"}, timestamp=now, source="prometheus"))
        else:
            for series in result:
                signals.append(Signal(
                    name=name,
                    value=float(series["value"][1]) if series.get("value") else 0.0,
                    labels=series.get("metric", {}),
                    timestamp=now,
                    source="prometheus",
                ))

    return SignalsResponse(demo_mode=demo_mode, signals=signals, collected_at=now)


# ── Incidents (backward-compatible) ──────────────────────────────────────────

@app.get("/incidents", response_model=IncidentsResponse, tags=["aiops"])
async def get_incidents():
    """Return incidents from latest analysis or demo data."""
    latest = await latest_analysis()
    incidents = _analysis_to_incidents(latest)
    return IncidentsResponse(
        demo_mode=latest.llm_mode == "fallback",
        total=len(incidents),
        incidents=incidents,
        generated_at=datetime.utcnow(),
    )


@app.get("/recommendations", response_model=RecommendationsResponse, tags=["aiops"])
async def get_recommendations():
    """Return recommendations from latest analysis."""
    latest = await latest_analysis()
    recs = [
        Recommendation(
            id=f"rec-{i}",
            incident_id=None,
            action=ra.action,
            priority="immediate" if ra.priority <= 2 else "soon" if ra.priority <= 4 else "planned",
            command=ra.script,
            description=f"Owner: {ra.owner} | Risk: {ra.risk}",
        )
        for i, ra in enumerate(latest.recommended_actions)
    ]
    return RecommendationsResponse(
        demo_mode=latest.llm_mode == "fallback",
        total=len(recs),
        recommendations=recs,
        generated_at=datetime.utcnow(),
    )


# ── Simulate scenarios ────────────────────────────────────────────────────────

SIMULATION_SCRIPTS: Dict[str, str] = {
    "crashloop": "scripts/simulate-crashloop.sh",
    "network-deny": "scripts/simulate-network-deny.sh",
    "cost-spike": "scripts/simulate-cost-spike.sh",
    "argocd-outofsync": "scripts/simulate-argocd-outofsync.sh",
    "policy-violation": "scripts/simulate-policy-violation.sh",
}


@app.post("/simulate/{incident_type}", tags=["demo"])
async def simulate_incident(incident_type: str):
    """
    Trigger a demo incident scenario.
    Valid types: crashloop, network-deny, cost-spike, argocd-outofsync, policy-violation
    """
    if incident_type not in SIMULATION_SCRIPTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown incident type. Valid: {list(SIMULATION_SCRIPTS.keys())}",
        )

    script = SIMULATION_SCRIPTS[incident_type]
    return {
        "incident_type": incident_type,
        "script": script,
        "message": f"To trigger this scenario, run: ./{script}",
        "rollback": f"./{script} --rollback",
        "analyze": "curl -X POST http://localhost:8000/analyze -H 'Content-Type: application/json' -d '{\"scope\":\"cluster\",\"question\":\"What just happened?\"}'",
    }


# ── Demo data endpoints (backward compatibility) ──────────────────────────────

@app.get("/demo-incidents", response_model=IncidentsResponse, tags=["demo"])
async def demo_incidents():
    """Pre-canned demo incidents for presentation mode."""
    return IncidentsResponse(
        demo_mode=True,
        total=len(_DEMO_INCIDENTS),
        incidents=_DEMO_INCIDENTS,
        generated_at=datetime.utcnow(),
    )


@app.get("/demo-recommendations", response_model=RecommendationsResponse, tags=["demo"])
async def demo_recommendations():
    """Pre-canned demo recommendations."""
    return RecommendationsResponse(
        demo_mode=True,
        total=len(_DEMO_RECOMMENDATIONS),
        recommendations=_DEMO_RECOMMENDATIONS,
        generated_at=datetime.utcnow(),
    )


# ── Chat ─────────────────────────────────────────────────────────────────────

@app.post("/chat", response_model=ChatResponse, tags=["chat"])
async def chat(request: ChatRequest):
    """Non-streaming chat — runs all agents and returns a complete ChatResponse."""
    try:
        return await chat_once(request)
    except Exception as exc:
        logger.error("Chat failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat failed: {exc}")


@app.post("/chat/stream", tags=["chat"])
async def chat_stream(request: ChatRequest):
    """
    Streaming chat via Server-Sent Events (SSE).

    Event types: status | signals | agent_start | agent_result | token | complete | error
    Each event: data: <json>\\n\\n
    """
    return StreamingResponse(
        chat_stream_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


@app.get("/chat/history", tags=["chat"])
async def chat_history(conversation_id: Optional[str] = Query(default=None)):
    """Return conversation history. Pass ?conversation_id= to filter to one conversation."""
    messages = get_conversation_history(conversation_id)
    return {
        "messages": [m.model_dump(mode="json") for m in messages],
        "total": len(messages),
        "conversation_id": conversation_id,
    }


@app.get("/agents/executions", tags=["chat"])
async def agents_executions():
    """Return the last agent execution timeline from the most recent chat."""
    execs = get_last_executions()
    return {
        "executions": [e.model_dump(mode="json") for e in execs],
        "total": len(execs),
    }


@app.get("/telemetry/status", response_model=TelemetryStatusResponse, tags=["chat"])
async def telemetry_status():
    """Return current telemetry source availability (live vs demo vs unavailable)."""
    status = get_last_telemetry()
    if status is not None:
        return status
    # No chat has run yet — return a stub showing all sources as unknown
    from datetime import timezone
    from .models import TelemetrySourceStatus
    sources = [
        TelemetrySourceStatus(source="kubernetes", display_name="Kubernetes API", available=False, data_mode="unavailable"),
        TelemetrySourceStatus(source="prometheus", display_name="Prometheus", available=False, data_mode="unavailable"),
        TelemetrySourceStatus(source="opencost", display_name="OpenCost", available=False, data_mode="unavailable"),
        TelemetrySourceStatus(source="argocd", display_name="Argo CD", available=False, data_mode="unavailable"),
        TelemetrySourceStatus(source="crossplane", display_name="Crossplane", available=False, data_mode="unavailable"),
        TelemetrySourceStatus(source="hubble", display_name="Hubble / Cilium", available=False, data_mode="unavailable"),
        TelemetrySourceStatus(source="policy", display_name="OPA / Kyverno", available=False, data_mode="unavailable"),
        TelemetrySourceStatus(source="spire", display_name="SPIRE", available=False, data_mode="unavailable"),
    ]
    return TelemetryStatusResponse(sources=sources, overall_mode="demo")


# ── /api/aiops/ path aliases (backward-compatible; spec-required prefix) ─────
# Original root-level paths remain unchanged. These aliases let callers use
# the /api/aiops/ prefix specified in the integration contract without any
# breaking changes to existing integrations.

@app.get("/api/aiops/signals",                  tags=["api-aiops-alias"])
async def api_aiops_signals():                  return await get_signals()

@app.post("/api/aiops/analyze",                 tags=["api-aiops-alias"])
async def api_aiops_analyze(r: AnalysisRequest, bt: BackgroundTasks): return await analyze(r, bt)

@app.post("/api/aiops/incidents/analyze",       tags=["api-aiops-alias"])
async def api_aiops_incidents_analyze(r: AnalysisRequest, bt: BackgroundTasks): return await analyze(r, bt)

@app.post("/api/aiops/chat",                    tags=["api-aiops-alias"])
async def api_aiops_chat(r: ChatRequest):       return await chat(r)

@app.post("/api/aiops/chat/stream",             tags=["api-aiops-alias"])
async def api_aiops_chat_stream(r: ChatRequest):return await chat_stream(r)

@app.get("/api/aiops/chat/history",             tags=["api-aiops-alias"])
async def api_aiops_chat_history(conversation_id: Optional[str] = Query(default=None)):
    return await chat_history(conversation_id)

@app.get("/api/aiops/agents/status",            tags=["api-aiops-alias"])
async def api_aiops_agents_status():            return await agents_status()

@app.get("/api/aiops/agents/executions",        tags=["api-aiops-alias"])
async def api_aiops_agents_executions():        return await agents_executions()

@app.get("/api/aiops/recommendations",          tags=["api-aiops-alias"])
async def api_aiops_recommendations():          return await get_recommendations()

@app.get("/api/aiops/evidence",                 tags=["api-aiops-alias"])
async def api_aiops_evidence():
    latest = await latest_analysis()
    return {"evidence": [e.model_dump(mode="json") for e in latest.evidence], "total": len(latest.evidence)}

@app.get("/api/aiops/telemetry/status",         tags=["api-aiops-alias"])
async def api_aiops_telemetry_status():         return await telemetry_status()

@app.get("/ready",                              tags=["health"])
async def ready():
    """Kubernetes readiness probe."""
    return {"status": "ready"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _agent_role(key: str) -> str:
    roles = {
        "manager": "Correlates all findings and produces final recommendations",
        "capacity_sre": "CPU, memory, pod restarts, saturation analysis",
        "finops": "Cost allocation, waste, label governance",
        "incident_prevention_remediation": "Active incidents, network denials, Argo CD drift",
        "deployment_health_doctor": "Deployment health, rollout status, Crossplane readiness",
        "secure_shield": "Policy violations, SPIFFE identity, network security",
    }
    return roles.get(key, "")


def _analysis_to_incidents(analysis: ManagerAnalysis) -> List[Incident]:
    """Convert ManagerAnalysis into legacy Incident objects for backward compatibility."""
    incidents = []
    if analysis.severity in ("high", "critical") and analysis.probable_root_cause:
        incidents.append(Incident(
            id=analysis.analysis_id,
            title=analysis.summary[:120],
            severity=analysis.severity,
            category="multi-signal",
            probable_cause=analysis.probable_root_cause,
            recommended_action=analysis.recommended_actions[0].action if analysis.recommended_actions else "See /analysis/latest",
            evidence=[e.detail or e.value or "" for e in analysis.evidence if e.detail or e.value],
            detected_at=analysis.created_at,
            namespace=None,
            workload=None,
        ))

    # Add per-agent incidents for findings marked high/critical
    for agent_key, finding in analysis.worker_findings.items():
        if finding.severity in ("high", "critical") and finding.findings:
            for i, finding_text in enumerate(finding.findings[:2]):
                incidents.append(Incident(
                    id=f"{analysis.analysis_id}-{agent_key}-{i}",
                    title=finding_text[:120],
                    severity=finding.severity,
                    category=agent_key.replace("_", "-"),
                    probable_cause=finding.probable_root_cause or finding_text,
                    recommended_action=finding.recommendations[0].action if finding.recommendations else "See /analysis/latest",
                    evidence=[e.detail or e.value or "" for e in finding.evidence[:3] if e.detail or e.value],
                    detected_at=analysis.created_at,
                    namespace=None,
                    workload=None,
                ))

    return incidents or [Incident(
        id="no-incidents",
        title="No active incidents detected",
        severity="info",
        category="health",
        probable_cause="Platform operating normally",
        recommended_action="Continue monitoring",
        evidence=[],
        detected_at=datetime.utcnow(),
    )]


# ── Static demo data ──────────────────────────────────────────────────────────

_DEMO_INCIDENTS: List[Incident] = [
    Incident(
        id="demo-crash-backend",
        title="CrashLoopBackOff: backend in employee-portal",
        severity="critical",
        category="network",
        probable_cause=(
            "Cilium network policy is blocking TCP 5432 (PostgreSQL) from the backend pod. "
            "Backend fails to connect to the database on startup and exits, triggering CrashLoopBackOff."
        ),
        recommended_action="Run: scripts/simulate-network-deny.sh --rollback",
        evidence=[
            "kube_pod_container_status_waiting_reason{reason='CrashLoopBackOff'} = 1",
            "Hubble: DENIED backend→postgres TCP 5432",
            "kubectl logs employee-backend: 'dial tcp: connection refused'",
        ],
        detected_at=datetime.utcnow() - timedelta(minutes=12),
        namespace="employee-portal",
        workload="employee-backend",
    ),
    Incident(
        id="demo-highmem-backend",
        title="High memory: backend at 89% of limit",
        severity="high",
        category="resource",
        probable_cause="Backend memory usage is at 89% (445Mi/500Mi). OOMKill risk within 2–3 hours.",
        recommended_action="Increase memory limit to 768Mi via GitOps Helm values patch",
        evidence=[
            "container_memory_working_set_bytes = 445Mi",
            "kube_pod_container_resource_limits{resource='memory'} = 500Mi",
            "Utilisation: 89% (threshold: 90%)",
        ],
        detected_at=datetime.utcnow() - timedelta(minutes=45),
        namespace="employee-portal",
        workload="employee-backend",
    ),
]

_DEMO_RECOMMENDATIONS: List[Recommendation] = [
    Recommendation(
        id="rec-demo-network",
        incident_id="demo-crash-backend",
        action="Rollback restrictive Cilium network policy",
        priority="immediate",
        command="scripts/simulate-network-deny.sh --rollback",
        description="Apply CiliumNetworkPolicy egress rule allowing backend→postgres TCP 5432",
    ),
    Recommendation(
        id="rec-demo-memory",
        incident_id="demo-highmem-backend",
        action="Increase backend memory limit to 768Mi",
        priority="immediate",
        command="kubectl set resources deployment backend -n employee-portal --limits=memory=768Mi",
        description="Short-term fix to prevent OOMKill. Long-term: investigate memory leak.",
    ),
]
