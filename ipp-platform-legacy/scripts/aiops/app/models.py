"""
Pydantic models for the AIOps multi-agent system.
Extends the original simple models with full agent schemas.
"""
from __future__ import annotations
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid


# ─── Evidence & Findings ────────────────────────────────────────────────────

class EvidenceItem(BaseModel):
    source: str
    metric: Optional[str] = None
    query: Optional[str] = None
    value: Optional[str] = None
    detail: Optional[str] = None


class AgentRecommendation(BaseModel):
    action: str
    risk: str = "low"                     # low | medium | high
    automation: Optional[str] = None      # path to runbook/script
    owner: Optional[str] = None


class AgentFinding(BaseModel):
    agent: str
    status: str                           # healthy | risk_detected | incident_detected | degraded | policy_risk_detected | optimization_available | unavailable
    severity: str = "info"               # info | low | medium | high | critical
    findings: List[str] = Field(default_factory=list)
    probable_root_cause: Optional[str] = None
    evidence: List[EvidenceItem] = Field(default_factory=list)
    recommendations: List[AgentRecommendation] = Field(default_factory=list)
    confidence: float = 0.0
    llm_used: bool = False
    error: Optional[str] = None


# ─── Signal Bundle ────────────────────────────────────────────────────────────

class KubernetesSignals(BaseModel):
    pods: List[Dict[str, Any]] = Field(default_factory=list)
    deployments: List[Dict[str, Any]] = Field(default_factory=list)
    events: List[Dict[str, Any]] = Field(default_factory=list)
    namespaces: List[str] = Field(default_factory=list)
    crashloop_pods: List[str] = Field(default_factory=list)
    pending_pods: List[str] = Field(default_factory=list)
    high_restart_pods: List[Dict[str, Any]] = Field(default_factory=list)
    available: bool = False


class PrometheusSignals(BaseModel):
    memory_pressure: List[Dict[str, Any]] = Field(default_factory=list)
    cpu_saturation: List[Dict[str, Any]] = Field(default_factory=list)
    pod_restarts: List[Dict[str, Any]] = Field(default_factory=list)
    crashloop_containers: List[Dict[str, Any]] = Field(default_factory=list)
    available: bool = False


class OpenCostSignals(BaseModel):
    namespace_costs: Dict[str, Any] = Field(default_factory=dict)
    workload_costs: List[Dict[str, Any]] = Field(default_factory=list)
    total_monthly_estimate: float = 0.0
    available: bool = False


class ArgoCDSignals(BaseModel):
    applications: List[Dict[str, Any]] = Field(default_factory=list)
    out_of_sync: List[str] = Field(default_factory=list)
    degraded: List[str] = Field(default_factory=list)
    available: bool = False


class CrossplaneSignals(BaseModel):
    providers: List[Dict[str, Any]] = Field(default_factory=list)
    compositions: List[Dict[str, Any]] = Field(default_factory=list)
    composite_resources: List[Dict[str, Any]] = Field(default_factory=list)
    not_ready: List[str] = Field(default_factory=list)
    available: bool = False


class HubbleSignals(BaseModel):
    denied_flows: List[Dict[str, Any]] = Field(default_factory=list)
    network_policies: List[Dict[str, Any]] = Field(default_factory=list)
    available: bool = False
    extra: Dict[str, Any] = Field(default_factory=dict)


class PolicySignals(BaseModel):
    gatekeeper_violations: List[Dict[str, Any]] = Field(default_factory=list)
    kyverno_violations: List[Dict[str, Any]] = Field(default_factory=list)
    available: bool = False


class SpireSignals(BaseModel):
    entries: List[Dict[str, Any]] = Field(default_factory=list)
    workloads_without_identity: List[str] = Field(default_factory=list)
    available: bool = False


class KnativeSignals(BaseModel):
    """Live Knative Serving telemetry — services, revisions, and scale-to-zero events."""
    services: List[Dict[str, Any]] = Field(default_factory=list)
    revisions: List[Dict[str, Any]] = Field(default_factory=list)
    scaled_to_zero: List[str] = Field(default_factory=list)
    available: bool = False


class SignalBundle(BaseModel):
    collected_at: datetime = Field(default_factory=datetime.utcnow)
    namespace: Optional[str] = None
    scope: str = "cluster"
    kubernetes: KubernetesSignals = Field(default_factory=KubernetesSignals)
    prometheus: PrometheusSignals = Field(default_factory=PrometheusSignals)
    opencost: OpenCostSignals = Field(default_factory=OpenCostSignals)
    argocd: ArgoCDSignals = Field(default_factory=ArgoCDSignals)
    crossplane: CrossplaneSignals = Field(default_factory=CrossplaneSignals)
    hubble: HubbleSignals = Field(default_factory=HubbleSignals)
    policy: PolicySignals = Field(default_factory=PolicySignals)
    spire: SpireSignals = Field(default_factory=SpireSignals)
    knative: KnativeSignals = Field(default_factory=KnativeSignals)


# ─── Analysis Request / Response ─────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    scope: str = "cluster"
    namespace: Optional[str] = None
    question: str = "Analyze the platform health and recommend actions."
    include_security: bool = True
    include_cost: bool = True
    include_deployment: bool = True


class RecommendedAction(BaseModel):
    priority: int
    action: str
    owner: str = "operations"
    automation_available: bool = False
    script: Optional[str] = None
    risk: str = "low"


class ManagerAnalysis(BaseModel):
    analysis_id: str = Field(default_factory=lambda: f"analysis-{uuid.uuid4().hex[:8]}")
    summary: str = ""
    severity: str = "info"
    business_impact: str = ""
    probable_root_cause: str = ""
    recommended_actions: List[RecommendedAction] = Field(default_factory=list)
    worker_findings: Dict[str, AgentFinding] = Field(default_factory=dict)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    confidence: float = 0.0
    llm_mode: str = "fallback"
    llm_model: str = "rule-based"
    llm_provider: str = "rule-based"
    tracing: str = "disabled"
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Chat models ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    scope: str = "cluster"
    namespace: Optional[str] = None
    include_security: bool = True
    include_cost: bool = True
    include_deployment: bool = True


class AgentExecution(BaseModel):
    agent: str
    display_name: str
    status: str = "pending"          # pending | running | complete | failed | skipped
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
    severity: Optional[str] = None
    finding_summary: Optional[str] = None
    signals_queried: List[str] = Field(default_factory=list)
    error: Optional[str] = None


class TelemetrySourceStatus(BaseModel):
    source: str
    display_name: str
    available: bool
    data_mode: str                   # live | demo | unavailable
    latency_ms: Optional[float] = None
    error: Optional[str] = None


class TelemetryStatusResponse(BaseModel):
    sources: List[TelemetrySourceStatus]
    overall_mode: str                # live | partial | demo
    checked_at: datetime = Field(default_factory=datetime.utcnow)


class ChatMessageRecord(BaseModel):
    message_id: str = Field(default_factory=lambda: f"msg-{uuid.uuid4().hex[:8]}")
    conversation_id: str
    role: str                        # user | manager | system
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data_mode: Optional[str] = None  # live | demo
    analysis_id: Optional[str] = None


class ChatResponse(BaseModel):
    conversation_id: str
    message_id: str = Field(default_factory=lambda: f"msg-{uuid.uuid4().hex[:8]}")
    question: str
    manager_summary: str             # human-readable operational narrative (no-fluff)
    agent_findings: Dict[str, AgentFinding] = Field(default_factory=dict)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    recommended_actions: List[RecommendedAction] = Field(default_factory=list)
    confidence: float = 0.0
    severity: str = "info"
    impacted_services: List[str] = Field(default_factory=list)
    telemetry_sources: List[str] = Field(default_factory=list)
    execution_timeline: List[AgentExecution] = Field(default_factory=list)
    llm_mode: str = "fallback"
    llm_model: str = "rule-based"
    llm_provider: str = "rule-based"
    data_mode: str = "demo"          # live | demo
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ─── Legacy models (kept for backward compatibility) ─────────────────────────

class Incident(BaseModel):
    id: str
    title: str
    severity: str
    category: str
    probable_cause: str
    recommended_action: str
    evidence: List[str]
    detected_at: datetime
    namespace: Optional[str] = None
    workload: Optional[str] = None
    resolved: bool = False


class Recommendation(BaseModel):
    id: str
    incident_id: Optional[str] = None
    action: str
    priority: str
    command: Optional[str] = None
    description: str


class Signal(BaseModel):
    name: str
    value: float
    labels: dict
    timestamp: datetime
    source: str


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    demo_mode: bool = False
    incidents_detected: int = 0
    agents: Dict[str, str] = Field(default_factory=dict)
    llm_mode: str = "fallback"
    llm_model: str = "rule-based"
    llm_provider: str = "rule-based"
    tracing: str = "disabled"


class AgentStatusResponse(BaseModel):
    agents: List[Dict[str, str]]
    llm_mode: str
    llm_model: str
    llm_provider: str = "rule-based"
    tracing: str
    ollama_reachable: bool


class SignalsResponse(BaseModel):
    demo_mode: bool
    signals: List[Signal]
    collected_at: datetime


class IncidentsResponse(BaseModel):
    demo_mode: bool
    total: int
    incidents: List[Incident]
    generated_at: datetime


class RecommendationsResponse(BaseModel):
    demo_mode: bool
    total: int
    recommendations: List[Recommendation]
    generated_at: datetime
