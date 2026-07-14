"""
AIOps Interactive Chat Orchestrator
====================================
Wraps the multi-agent analysis graph with:
  - Conversation history management
  - SSE (Server-Sent Events) streaming support
  - No-fluff operational LLM narrative generation
  - Per-agent execution timeline tracking
  - Telemetry source availability reporting
  - Graceful fallback when LLM unavailable
"""
from __future__ import annotations
import asyncio
import json
import logging
import time
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import AsyncIterator, Dict, List, Optional, Tuple

from .config import get_settings
from .llm import get_llm_client, TRACING_STATUS
from .models import (
    AgentExecution, AgentFinding, AnalysisRequest, ChatMessageRecord,
    ChatRequest, ChatResponse, EvidenceItem, RecommendedAction,
    SignalBundle, TelemetrySourceStatus, TelemetryStatusResponse,
)

logger = logging.getLogger("aiops.chat")

_CHAT_PROMPT_PATH = Path(__file__).parent / "prompts" / "chat.md"

# Hard timeouts — prevent SSE stream from hanging forever when cluster is unreachable
_SIGNAL_COLLECTION_TIMEOUT = 10.0   # seconds for all 10 collectors combined (each gets 4s individually in graph.py)
# Agents run concurrently, so this bounds the slowest single agent, not the sum.
# Cloud LLM calls (Anthropic) take longer per-call than the local 8B Ollama model
# this was originally tuned for, especially with the deeper causal-chain
# reasoning the prompts now ask for — too tight a timeout here silently drops
# an agent to rule-based fallback even though the real call would have succeeded.
_AGENT_TASK_TIMEOUT = 35.0          # seconds per worker agent
_LLM_NARRATIVE_TIMEOUT = 55.0       # total budget for LLM streaming narrative

AGENT_DISPLAY_NAMES: Dict[str, str] = {
    "capacity_sre": "Capacity SRE Agent",
    "finops": "FinOps Agent",
    "incident_prevention_remediation": "Incident Prevention & Remediation Agent",
    "deployment_health_doctor": "Deployment Health Doctor Agent",
    "secure_shield": "Secure Shield Agent",
}

AGENT_SIGNALS: Dict[str, List[str]] = {
    "capacity_sre": ["Prometheus", "Kubernetes API"],
    "finops": ["OpenCost", "Kubernetes API"],
    "incident_prevention_remediation": ["Kubernetes API", "Hubble", "Argo CD"],
    "deployment_health_doctor": ["Argo CD", "Kubernetes API", "Crossplane"],
    "secure_shield": ["Kyverno", "OPA Gatekeeper", "SPIRE", "Hubble"],
}

# ─── In-memory conversation history ──────────────────────────────────────────

_conversations: Dict[str, List[ChatMessageRecord]] = defaultdict(list)
_executions: List[AgentExecution] = []
_last_telemetry: Optional[TelemetryStatusResponse] = None
_cfg = None


def _get_cfg():
    global _cfg
    if _cfg is None:
        _cfg = get_settings()
    return _cfg


def _load_chat_prompt() -> str:
    if _CHAT_PROMPT_PATH.exists():
        return _CHAT_PROMPT_PATH.read_text()
    return (
        "You are the AIOps Manager Agent. Give concise, operational, evidence-based answers. "
        "No filler language. Lead with the most critical finding. Reference specific resource names."
    )


def _sse(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


def _build_chat_user_content(question: str, findings: Dict[str, AgentFinding]) -> str:
    """
    Summarise all worker findings into a compact prompt for the chat LLM.
    Boilerplate "all healthy" findings are collapsed to a single marker and
    their (empty-value) recommendations/evidence are dropped — this keeps the
    model's attention on real signals and cuts input tokens on the common
    mostly-healthy-cluster case.
    """
    agent_data = {}
    for name, finding in findings.items():
        real_findings = [f for f in finding.findings if f.lower() not in _NOISE_FINDINGS_CHAT][:5]
        agent_data[name] = {
            "status": finding.status,
            "severity": finding.severity,
            "findings": real_findings or ["healthy — no issues"],
            "probable_root_cause": finding.probable_root_cause if real_findings else None,
            "recommendations": [r.model_dump() for r in finding.recommendations[:3]] if real_findings else [],
            "evidence": [e.model_dump() for e in finding.evidence[:5]] if real_findings else [],
            "confidence": finding.confidence,
        }
    return json.dumps({"question": question, "worker_findings": agent_data}, indent=2)


def _question_agent_priority(question: str) -> List[str]:
    """
    Map the user's question to an ordered list of agent names to lead the response.
    Returns a preference ordering; agents not listed are appended at the end.
    """
    q = question.lower()
    # Return ONLY the domain-specific agents as preferred so the context prefix fires
    # when those agents are healthy. Other agents are appended as remainder.
    # Security / identity / SPIRE / policy
    if any(k in q for k in ("spire", "identity", "spiffe", "certificate", "mtls", "gap")):
        return ["secure_shield"]
    if any(k in q for k in ("security", "policy", "kyverno", "opa", "gatekeeper", "shield", "violation")):
        return ["secure_shield", "incident_prevention_remediation"]
    # Cost / FinOps / namespace spend
    if any(k in q for k in ("cost", "spend", "budget", "billing", "finops", "fin ops", "expensive", "right-siz", "rightsiz", "efficiency")):
        return ["finops"]
    # Argo CD / sync / git / deploy
    if any(k in q for k in ("argocd", "argo cd", "argo", "sync", "gitops", "outofsync", "in sync")):
        return ["deployment_health_doctor", "incident_prevention_remediation"]
    if any(k in q for k in ("deploy", "rollout", "release", "git")):
        return ["deployment_health_doctor"]
    # Network / Cilium / connectivity
    if any(k in q for k in ("network", "cilium", "hubble", "denied", "flow", "egress", "connectivity", "block")):
        return ["incident_prevention_remediation", "secure_shield"]
    # CrashLoop / restart / pod issues
    if any(k in q for k in ("crash", "loop", "restart", "oom", "pending", "stuck", "pod", "container")):
        return ["capacity_sre", "incident_prevention_remediation"]
    if any(k in q for k in ("memory", "cpu", "capacity", "saturation")):
        return ["capacity_sre"]
    # "Fix first" / triage — all agents but ordered by severity (default behaviour)
    if any(k in q for k in ("fix first", "priorit", "what should", "triage", "immediate", "urgent", "critical")):
        return []
    # Employee-portal specific — only the deployment/incident agents
    if any(k in q for k in ("employee", "portal", "backend", "frontend", "auth", "stable")):
        return ["deployment_health_doctor", "incident_prevention_remediation"]
    # Default: severity-first (platform health / general)
    return []


_NOISE_FINDINGS_CHAT = frozenset({
    "no capacity or saturation issues detected.",
    "all deployments and gitops applications appear healthy.",
    "no security policy violations or identity gaps detected.",
    "no cost optimization opportunities detected.",
    "no active incidents detected.",
    "opencost unavailable; cost analysis skipped.",
})


def _deterministic_narrative(question: str, findings: Dict[str, AgentFinding]) -> str:
    """
    Produce a question-aware operational narrative following the chat.md format:
    <one-sentence lead> → Evidence → Impacted services → Recommended actions → Confidence/Severity
    """
    sev_order = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1}

    preferred = _question_agent_priority(question)
    remaining = sorted(
        [n for n in findings if n not in preferred],
        key=lambda n: sev_order.get(findings[n].severity, 0),
        reverse=True,
    )
    ordered_names = preferred + remaining

    top_findings: List[Tuple[str, AgentFinding]] = [
        (n, findings[n]) for n in ordered_names
        if n in findings and findings[n].findings
    ]

    # ── Collect all real (non-noise) findings across every agent ─────────────
    sev_order_val = sev_order
    max_sev = max(
        (f.severity for _, f in top_findings),
        key=lambda s: sev_order_val.get(s, 0),
        default="info",
    )
    all_real: List[Tuple[str, str]] = []  # (agent_name, finding_text)
    for name, finding in top_findings:
        for txt in finding.findings:
            if txt.lower() not in _NOISE_FINDINGS_CHAT:
                all_real.append((name, txt))

    # ── Healthy platform ──────────────────────────────────────────────────────
    if not all_real:
        return (
            "All platform subsystems are operating normally — no incidents, policy violations, "
            "or capacity pressure detected across the monitored cluster."
        )

    # ── Resolve question topic → keywords that mark on-topic findings ──────────
    q_lower = question.lower()
    _TOPIC_KW: Dict[str, tuple] = {
        "spire":    ("spire", "spiffe", "identity", "svid", "workload missing"),
        "spiffe":   ("spire", "spiffe", "identity", "svid"),
        "identity": ("spire", "spiffe", "identity", "svid", "workload missing"),
        "gap":      ("spire", "spiffe", "identity", "svid", "workload missing"),
        "mtls":     ("spire", "spiffe", "mtls", "tls", "certificate"),
        "argocd":   ("argocd", "argo", "outofsync", "sync", "gitops"),
        "argo":     ("argocd", "argo", "outofsync", "sync"),
        "sync":     ("argocd", "argo", "outofsync", "sync"),
        "network":  ("denied", "flow", "cilium", "hubble", "network polic"),
        "cilium":   ("denied", "flow", "cilium", "hubble"),
        "hubble":   ("denied", "flow", "cilium", "hubble"),
        "employee": ("employee", "portal", "frontend", "backend"),
        "portal":   ("employee", "portal", "frontend", "backend"),
        "crash":    ("crashloop", "crashloopbackoff", "crash"),
        "loop":     ("crashloop", "crashloopbackoff"),
        "memory":   ("memory", "oom", "limit"),
        "cost":     ("cost", "efficiency", "rightsiz", "opencost"),
        "kyverno":  ("kyverno", "policy violation", "opa", "gatekeeper"),
        "policy":   ("kyverno", "policy violation", "opa", "gatekeeper"),
        "violation":("kyverno", "policy violation", "opa", "gatekeeper"),
    }
    topic_kw: tuple = ()
    for k, kw in _TOPIC_KW.items():
        if k in q_lower:
            topic_kw = kw
            break

    # ── Filter preferred findings to those ON-TOPIC for the question ─────────
    preferred_real = [(n, txt) for n, txt in all_real if n in preferred]
    if topic_kw:
        topic_preferred = [(n, txt) for n, txt in preferred_real
                           if any(kw in txt.lower() for kw in topic_kw)]
    else:
        topic_preferred = preferred_real
    has_on_topic_issues = bool(topic_preferred)

    context_prefix = ""
    if preferred and not has_on_topic_issues:
        # The specific domain asked about has no issues — say so directly
        if any(k in q_lower for k in ("spire", "identity", "spiffe", "gap", "mtls")):
            context_prefix = "No SPIRE identity gaps detected — all monitored workloads have valid SPIFFE SVIDs."
        elif any(k in q_lower for k in ("employee", "portal", "backend", "frontend", "stable")):
            context_prefix = "The employee portal is operating normally — all deployments are available and Argo CD applications are in sync."
        elif any(k in q_lower for k in ("argocd", "argo", "sync", "outofsync", "in sync")):
            context_prefix = "All Argo CD applications are in sync and deployments are healthy."
        elif any(k in q_lower for k in ("network", "cilium", "hubble", "flow", "denied")):
            context_prefix = "No denied network flows detected. Cilium network policies are operating as expected."
        elif any(k in q_lower for k in ("crash", "loop", "crashloop")):
            context_prefix = "No CrashLoopBackOff pods detected."
        elif any(k in q_lower for k in ("cost", "spend", "finops")):
            context_prefix = "No anomalous cost spikes detected."

    # ── Lead: use only on-topic findings when they exist ─────────────────────
    # When the user asked about a specific domain that HAS issues, lead with
    # those issues only — don't mix unrelated findings into the opening sentence.
    if topic_kw and topic_preferred:
        lead_pool = topic_preferred  # on-topic only for the lead sentence
        extra_pool = [(n, t) for n, t in all_real if (n, t) not in topic_preferred]
    else:
        lead_pool = all_real
        extra_pool = []

    # ── Lead sentence: synthesise the 1-2 most critical findings ────────────
    top_items = lead_pool[:3]
    if len(top_items) == 1:
        lead = top_items[0][1]
    elif len(top_items) == 2:
        lead = f"{top_items[0][1]}; additionally, {top_items[1][1].lower()}"
    else:
        lead = (
            f"{top_items[0][1]}, while {top_items[1][1].lower()}"
            f" and {top_items[2][1].lower()}"
        )

    # ── When domain is healthy: return a concise all-clear + brief note of other issues ──
    if context_prefix:
        unrelated_count = len([t for _, t in all_real
                                if not any(kw in t.lower() for kw in (topic_kw or ("__none__",)))])
        if unrelated_count == 0:
            # Perfectly clean — just the good news
            lines: List[str] = [context_prefix]
            lines.append(f"\nConfidence: High\nSeverity: Info")
            return "\n".join(lines)
        # Otherwise: clean answer + brief summary of unrelated issues (no full detail dump)
        unrelated_top = [t for _, t in all_real
                         if not any(kw in t.lower() for kw in (topic_kw or ("__none__",)))][:3]
        unrelated_str = "; ".join(t.lower() for t in unrelated_top[:2])
        if unrelated_count > 2:
            unrelated_str += f" (+ {unrelated_count - 2} more)"
        lines = [f"{context_prefix}\n\nUnrelated platform issues ({unrelated_count} total): {unrelated_str}"]
        avg_conf = sum(f.confidence for _, f in top_findings) / max(len(top_findings), 1)
        conf_label = "High" if avg_conf >= 0.80 else "Medium"
        lines.append(f"\nConfidence: {conf_label}\nSeverity: {max_sev.capitalize()}")
        return "\n".join(lines)

    # ── Full-detail path: the asked domain HAS real issues ────────────────────
    top_agent_name, top_finding = top_findings[0]
    root_cause = top_finding.probable_root_cause
    lines = []
    if root_cause and root_cause.lower() not in top_items[0][1].lower():
        lines.append(f"{top_items[0][1]}\n\nRoot cause: {root_cause}")
    else:
        lead = (
            top_items[0][1] if len(top_items) == 1
            else (f"{top_items[0][1]}; additionally, {top_items[1][1].lower()}"
                  if len(top_items) == 2
                  else f"{top_items[0][1]}, while {top_items[1][1].lower()} and {top_items[2][1].lower()}")
        )
        lines.append(lead)

    # ── Secondary findings from primary agent ────────────────────────────────
    primary_extra = [
        txt for txt in top_finding.findings[1:]
        if txt.lower() not in _NOISE_FINDINGS_CHAT
        and txt not in {r[1] for r in top_items}
    ]
    if primary_extra:
        lines.append("\n" + "\n".join(f"- {f}" for f in primary_extra[:3]))

    # ── Evidence — topic-relevant items first, then supporting ───────────────
    seen_ev: set = set()
    ev_topic: List[str] = []    # on-topic evidence (e.g. spire: ... for SPIRE questions)
    ev_other: List[str] = []    # supporting evidence from other sources

    ev_agents = (
        [(n, f) for n, f in top_findings if n in preferred][:3] or top_findings[:3]
        if topic_kw else top_findings[:3]
    )
    for _, finding in ev_agents:
        for ev in finding.evidence:
            detail = ev.detail or ev.value or ""
            key = f"{ev.source}:{detail}"
            if key not in seen_ev and detail:
                seen_ev.add(key)
                line = f"- {ev.source}: {detail}"
                if topic_kw and any(kw in ev.source.lower() or kw in detail.lower() for kw in topic_kw):
                    ev_topic.append(line)
                else:
                    ev_other.append(line)

    all_ev = ev_topic + ev_other   # topic evidence leads
    if all_ev:
        lines.append("\nEvidence:\n" + "\n".join(all_ev[:8]))

    # ── Additional findings: extra on-topic then cross-agent ────────────────
    shown_set = {r[1] for r in top_items} | {txt for txt in top_finding.findings}
    other: List[str] = []
    # Extra on-topic findings first (from same agent, beyond the lead)
    for _, txt in lead_pool[3:]:
        if txt.lower() not in _NOISE_FINDINGS_CHAT and txt not in shown_set and txt not in other:
            other.append(txt)
    # Then unrelated findings from other agents (brief — don't dominate)
    for n, txt in (extra_pool if extra_pool else [(n, t) for na, ag in top_findings[1:4] for t in ag.findings[:2] for n in [na]]):
        if txt.lower() not in _NOISE_FINDINGS_CHAT and txt not in shown_set and txt not in other:
            other.append(txt)
    if other:
        lines.append("\nAdditional findings:\n" + "\n".join(f"- {o}" for o in other[:4]))

    # ── Impacted services — extract from finding text only (not evidence detail) ─
    # Restrict to well-known platform service names to avoid listing every pod.
    _SVC_PATTERNS = (
        "employee-portal", "employee/portal", "employee/backend", "employee/frontend",
        "backstage", "aiops", "argocd", "crossplane", "kyverno", "gatekeeper",
        "cilium", "spire", "ingress-nginx",
    )
    services: set = set()
    for _, finding in top_findings[:3]:
        for txt in finding.findings[:5] + [finding.probable_root_cause or ""]:
            for pat in _SVC_PATTERNS:
                if pat in txt.lower():
                    services.add(pat.replace("/", "-"))
            # Also capture "namespace/workload" patterns that are short and specific
            for token in txt.split():
                tok = token.strip(".,:/()[]")
                if "/" in tok and 4 < len(tok) < 50 and tok.count("/") == 1:
                    ns, name = tok.split("/", 1)
                    if len(ns) > 2 and len(name) > 2 and not any(c.isdigit() for c in ns[:2]):
                        services.add(tok)
    if services:
        lines.append(f"\nImpacted services: {', '.join(sorted(services))}")

    # ── Recommendations — topic-relevant first, then supporting ─────────────
    seen_recs: set = set()
    recs_topic: List[str] = []
    recs_other: List[str] = []
    for _, finding in top_findings[:4]:
        for rec in finding.recommendations:
            key = rec.action[:60]
            if key not in seen_recs:
                seen_recs.add(key)
                if topic_kw and any(kw in rec.action.lower() for kw in topic_kw):
                    recs_topic.append(rec.action)
                else:
                    recs_other.append(rec.action)
    all_recs = recs_topic + recs_other   # topic recommendations lead
    if all_recs:
        lines.append("\nRecommended actions:\n" + "\n".join(
            f"{i+1}. {r}" for i, r in enumerate(all_recs[:5])
        ))

    # ── Confidence / Severity ─────────────────────────────────────────────────
    avg_conf = sum(f.confidence for _, f in top_findings) / max(len(top_findings), 1)
    conf_label = "High" if avg_conf >= 0.80 else "Medium" if avg_conf >= 0.65 else "Low"
    lines.append(f"\nConfidence: {conf_label}\nSeverity: {max_sev.capitalize()}")

    return "\n".join(lines)


def _extract_impacted_services(narrative: str, findings: Dict[str, AgentFinding]) -> List[str]:
    """Extract service names from narrative or finding text."""
    services: List[str] = []
    for line in narrative.split("\n"):
        if "impacted services:" in line.lower():
            rest = line.split(":", 1)[-1].strip()
            if rest and rest.lower() not in ("none", "under investigation"):
                services = [s.strip() for s in rest.split(",") if s.strip()]
            break
    if not services:
        # fallback: scan findings for workload names
        seen = set()
        for _, f in findings.items():
            for txt in f.findings:
                for token in txt.split():
                    clean = token.strip(".,:/-()")
                    if len(clean) > 4 and ("-" in clean or clean.islower()):
                        if clean not in seen:
                            seen.add(clean)
                            services.append(clean)
                if len(services) >= 4:
                    break
    return services[:5]


def _telemetry_from_signals(signals: SignalBundle) -> TelemetryStatusResponse:
    """Build telemetry status from collected signals."""
    sources = [
        TelemetrySourceStatus(
            source="kubernetes", display_name="Kubernetes API",
            available=signals.kubernetes.available,
            data_mode="live" if signals.kubernetes.available else "demo",
        ),
        TelemetrySourceStatus(
            source="prometheus", display_name="Prometheus",
            available=signals.prometheus.available,
            data_mode="live" if signals.prometheus.available else "demo",
        ),
        TelemetrySourceStatus(
            source="argocd", display_name="Argo CD",
            available=signals.argocd.available,
            data_mode="live" if signals.argocd.available else "demo",
        ),
        TelemetrySourceStatus(
            source="opencost", display_name="OpenCost",
            available=signals.opencost.available,
            data_mode="live" if signals.opencost.available else "demo",
        ),
        TelemetrySourceStatus(
            source="hubble", display_name="Hubble / Cilium",
            available=signals.hubble.available,
            data_mode="live" if signals.hubble.available else "demo",
        ),
        TelemetrySourceStatus(
            source="crossplane", display_name="Crossplane",
            available=signals.crossplane.available,
            data_mode="live" if signals.crossplane.available else "demo",
        ),
        TelemetrySourceStatus(
            source="policy", display_name="OPA / Kyverno",
            available=signals.policy.available,
            data_mode="live" if signals.policy.available else "demo",
        ),
        TelemetrySourceStatus(
            source="spire", display_name="SPIRE",
            available=signals.spire.available,
            data_mode="live" if signals.spire.available else "demo",
        ),
    ]
    live_count = sum(1 for s in sources if s.available)
    if live_count == len(sources):
        overall = "live"
    elif live_count > 0:
        overall = "partial"
    else:
        overall = "demo"
    return TelemetryStatusResponse(sources=sources, overall_mode=overall)


# ─── SSE streaming generator ──────────────────────────────────────────────────

async def chat_stream_generator(request: ChatRequest) -> AsyncIterator[str]:
    """
    Full multi-agent chat execution as a Server-Sent Events stream.

    SSE event types:
      status       — progress update {message, phase}
      signals      — telemetry collection result {sources, overall_mode}
      agent_start  — {agent, display_name, signals_queried}
      agent_result — {agent, severity, status, finding_summary, duration_ms}
      token        — streaming LLM token {text}
      complete     — final full ChatResponse {result}
      error        — {message}
    """
    conv_id = request.conversation_id or f"conv-{uuid.uuid4().hex[:8]}"
    executions: List[AgentExecution] = []
    global _last_telemetry

    try:
        # ── Phase 1: Acknowledge ──────────────────────────────────────────────
        yield _sse({
            "type": "status",
            "phase": "start",
            "message": "Manager Agent received request.",
            "conversation_id": conv_id,
        })

        # Record user message
        user_msg = ChatMessageRecord(
            conversation_id=conv_id,
            role="user",
            content=request.question,
        )
        _conversations[conv_id].append(user_msg)

        # ── Phase 2: Collect signals ──────────────────────────────────────────
        yield _sse({"type": "status", "phase": "collecting", "message": "Collecting platform signals…"})

        from .graph import collect_signals_node
        analysis_req = AnalysisRequest(
            scope=request.scope,
            namespace=request.namespace,
            question=request.question,
            include_security=request.include_security,
            include_cost=request.include_cost,
            include_deployment=request.include_deployment,
        )
        state: dict = {
            "request": analysis_req,
            "signals": None,
            "findings": {},
            "analysis": None,
        }

        t0 = time.monotonic()
        try:
            state = await asyncio.wait_for(
                collect_signals_node(state), timeout=_SIGNAL_COLLECTION_TIMEOUT
            )
        except asyncio.TimeoutError:
            logger.warning(
                "Signal collection timed out after %.0fs — continuing with empty signals",
                _SIGNAL_COLLECTION_TIMEOUT,
            )
            yield _sse({
                "type": "status",
                "phase": "collecting",
                "message": "Signal collection timed out — using rule-based fallback data…",
            })
            from .models import (
                KubernetesSignals, PrometheusSignals, OpenCostSignals,
                ArgoCDSignals, CrossplaneSignals, HubbleSignals,
                PolicySignals, SpireSignals,
            )
            state = {**state, "signals": SignalBundle(
                namespace=analysis_req.namespace,
                scope=analysis_req.scope,
                kubernetes=KubernetesSignals(),
                prometheus=PrometheusSignals(),
                opencost=OpenCostSignals(),
                argocd=ArgoCDSignals(),
                crossplane=CrossplaneSignals(),
                hubble=HubbleSignals(),
                policy=PolicySignals(),
                spire=SpireSignals(),
            )}
        signals: SignalBundle = state["signals"]
        collect_ms = (time.monotonic() - t0) * 1000

        telemetry_status = _telemetry_from_signals(signals)
        _last_telemetry = telemetry_status
        available_sources = [s.source for s in telemetry_status.sources if s.available]

        yield _sse({
            "type": "signals",
            "sources": [s.model_dump() for s in telemetry_status.sources],
            "overall_mode": telemetry_status.overall_mode,
            "collect_ms": round(collect_ms),
        })

        # ── Phase 3: Worker agents (parallel, results streamed as they land) ─
        yield _sse({"type": "status", "phase": "agents", "message": "Delegating to specialist agents…"})

        from .agents import (
            CapacitySREAgent, FinOpsAgent, IncidentPreventionRemediationAgent,
            DeploymentHealthDoctorAgent, SecureShieldAgent,
        )

        active_agents = [
            ("capacity_sre", CapacitySREAgent()),
            ("finops", FinOpsAgent()) if request.include_cost else None,
            ("incident_prevention_remediation", IncidentPreventionRemediationAgent()),
            ("deployment_health_doctor", DeploymentHealthDoctorAgent()) if request.include_deployment else None,
            ("secure_shield", SecureShieldAgent()) if request.include_security else None,
        ]
        active_agents = [(n, a) for n, a in active_agents if a is not None]

        # Emit start events for all agents
        for name, _ in active_agents:
            exec_rec = AgentExecution(
                agent=name,
                display_name=AGENT_DISPLAY_NAMES.get(name, name),
                status="running",
                started_at=datetime.utcnow(),
                signals_queried=AGENT_SIGNALS.get(name, []),
            )
            executions.append(exec_rec)
            yield _sse({
                "type": "agent_start",
                "agent": name,
                "display_name": exec_rec.display_name,
                "signals_queried": exec_rec.signals_queried,
            })

        # Run agents and yield results as each completes
        async def _run_one(name: str, agent) -> Tuple[str, AgentFinding]:
            return name, await asyncio.wait_for(
                agent.analyze(signals), timeout=_AGENT_TASK_TIMEOUT
            )

        findings: Dict[str, AgentFinding] = {}
        tasks = [asyncio.create_task(_run_one(n, a)) for n, a in active_agents]

        for task in asyncio.as_completed(tasks):
            try:
                name, finding = await task
            except asyncio.TimeoutError:
                logger.warning("Agent task timed out after %.0fs", _AGENT_TASK_TIMEOUT)
                continue
            except Exception as exc:
                logger.error("Agent task error: %s", exc)
                continue

            findings[name] = finding

            # Update execution record
            for ex in executions:
                if ex.agent == name:
                    ex.status = "complete"
                    ex.completed_at = datetime.utcnow()
                    ex.severity = finding.severity
                    ex.finding_summary = finding.findings[0][:100] if finding.findings else None
                    if ex.started_at:
                        ex.duration_ms = (ex.completed_at - ex.started_at).total_seconds() * 1000
                    break

            yield _sse({
                "type": "agent_result",
                "agent": name,
                "display_name": AGENT_DISPLAY_NAMES.get(name, name),
                "severity": finding.severity,
                "status": finding.status,
                "finding_summary": finding.findings[0][:120] if finding.findings else "",
                "confidence": finding.confidence,
                "evidence_count": len(finding.evidence),
            })

        # ── Phase 4: LLM narrative generation (streaming) ────────────────────
        yield _sse({"type": "status", "phase": "synthesizing", "message": "Manager Agent synthesizing findings…"})

        llm = get_llm_client()
        chat_system_prompt = _load_chat_prompt()
        chat_user_content = _build_chat_user_content(request.question, findings)

        narrative_tokens: List[str] = []
        llm_used = False

        # Cap total LLM streaming at _LLM_NARRATIVE_TIMEOUT.  If Ollama starts
        # but hangs between tokens (model cold-start, GPU queue), this unblocks
        # the stream and falls through to the deterministic narrative below.
        try:
            async with asyncio.timeout(_LLM_NARRATIVE_TIMEOUT):
                async for token in llm.generate_stream(chat_system_prompt, chat_user_content):
                    narrative_tokens.append(token)
                    llm_used = True
                    yield _sse({"type": "token", "text": token})
        except asyncio.TimeoutError:
            logger.warning(
                "LLM narrative timed out after %.0fs — falling back to deterministic narrative",
                _LLM_NARRATIVE_TIMEOUT,
            )

        # ── Phase 5: Build structured result ─────────────────────────────────
        narrative = "".join(narrative_tokens).strip()
        if not narrative:
            narrative = _deterministic_narrative(request.question, findings)

        # Extract structured fields from agent findings
        sev_order = {"critical": 5, "high": 4, "medium": 3, "low": 2, "info": 1}
        max_sev = max(
            (f.severity for f in findings.values()),
            key=lambda s: sev_order.get(s, 0),
            default="info",
        )
        avg_conf = (
            sum(f.confidence for f in findings.values()) / len(findings)
            if findings else 0.0
        )

        all_evidence: List[EvidenceItem] = []
        seen_ev: set = set()
        for f in findings.values():
            for e in f.evidence:
                key = f"{e.source}:{e.detail or e.value}"
                if key not in seen_ev:
                    seen_ev.add(key)
                    all_evidence.append(e)

        # Gather recommended actions from all agents, deduplicated
        all_recs: List[RecommendedAction] = []
        seen_actions: set = set()
        priority = 1
        from .manager import ManagerAgent
        from .fallback_rules import manager_fallback_synthesis
        synth = manager_fallback_synthesis(request.question, findings)
        for ra in synth.get("recommended_actions", []):
            key = ra.get("action", "")[:60]
            if key not in seen_actions:
                seen_actions.add(key)
                all_recs.append(RecommendedAction(
                    priority=priority,
                    action=ra.get("action", ""),
                    owner=ra.get("owner", "operations"),
                    automation_available=bool(ra.get("automation_available", False)),
                    script=ra.get("script"),
                    risk=ra.get("risk", "low"),
                ))
                priority += 1

        impacted_services = _extract_impacted_services(narrative, findings)
        data_mode = "live" if telemetry_status.overall_mode in ("live", "partial") else "demo"

        chat_resp = ChatResponse(
            conversation_id=conv_id,
            question=request.question,
            manager_summary=narrative,
            agent_findings=findings,
            evidence=all_evidence[:10],
            recommended_actions=all_recs[:6],
            confidence=avg_conf,
            severity=max_sev,
            impacted_services=impacted_services,
            telemetry_sources=available_sources,
            execution_timeline=executions,
            llm_mode="local" if llm_used else "fallback",
            llm_model=llm.model if llm_used else "rule-based",
            llm_provider=llm.provider if llm_used else "rule-based",
            data_mode=data_mode,
        )

        # Store manager response in history
        manager_msg = ChatMessageRecord(
            conversation_id=conv_id,
            role="manager",
            content=narrative,
            data_mode=data_mode,
            analysis_id=chat_resp.message_id,
        )
        _conversations[conv_id].append(manager_msg)

        # Store executions globally for /agents/executions endpoint
        global _executions
        _executions = executions

        yield _sse({
            "type": "complete",
            "result": chat_resp.model_dump(mode="json"),
        })

    except Exception as exc:
        logger.error("Chat stream error: %s", exc, exc_info=True)
        yield _sse({"type": "error", "message": str(exc)})


# ─── Non-streaming chat ────────────────────────────────────────────────────────

async def chat_once(request: ChatRequest) -> ChatResponse:
    """Non-streaming version — collects full SSE stream and returns final result."""
    final: Optional[ChatResponse] = None
    async for event_str in chat_stream_generator(request):
        if not event_str.startswith("data: "):
            continue
        try:
            evt = json.loads(event_str[6:])
            if evt.get("type") == "complete":
                result_dict = evt.get("result", {})
                # Rebuild ChatResponse from dict
                from .models import ChatResponse as CR
                final = CR.model_validate(result_dict)
        except Exception:
            pass
    if final is None:
        # Minimal fallback
        return ChatResponse(
            conversation_id=request.conversation_id or f"conv-{uuid.uuid4().hex[:8]}",
            question=request.question,
            manager_summary="Analysis failed — please retry.",
            severity="info",
            confidence=0.0,
            data_mode="demo",
        )
    return final


# ─── History / status accessors ───────────────────────────────────────────────

def get_conversation_history(conversation_id: Optional[str] = None) -> List[ChatMessageRecord]:
    if conversation_id:
        return _conversations.get(conversation_id, [])
    # Return all messages across all conversations, most recent first
    all_msgs: List[ChatMessageRecord] = []
    for msgs in _conversations.values():
        all_msgs.extend(msgs)
    all_msgs.sort(key=lambda m: m.timestamp, reverse=True)
    cfg = _get_cfg()
    return all_msgs[:cfg.chat_history_max]


def get_last_executions() -> List[AgentExecution]:
    return _executions


def get_last_telemetry() -> Optional[TelemetryStatusResponse]:
    return _last_telemetry


async def probe_telemetry() -> None:
    """Run a lightweight signal collection to warm up _last_telemetry on startup."""
    global _last_telemetry
    from .graph import collect_signals_node
    from .models import AnalysisRequest
    try:
        state = await collect_signals_node({
            "request": AnalysisRequest(scope="cluster", question="startup probe"),
            "signals": None,
            "findings": {},
            "analysis": None,
        })
        signals = state.get("signals")
        if signals:
            _last_telemetry = _telemetry_from_signals(signals)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Startup telemetry probe failed: %s", exc)
