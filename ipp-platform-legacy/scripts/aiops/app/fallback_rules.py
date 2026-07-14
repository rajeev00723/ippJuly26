"""
Rule-based fallback analysis.

Used when the local LLM is unavailable. Implements deterministic signal-matching
rules that return the same structured AgentFinding schemas as the LLM agents.
"""
from __future__ import annotations
from typing import List
from .models import (
    AgentFinding, EvidenceItem, AgentRecommendation, SignalBundle
)


def _ev(source: str, detail: str, value: str = "") -> EvidenceItem:
    return EvidenceItem(source=source, detail=detail, value=value or None)


# ── Capacity SRE ──────────────────────────────────────────────────────────────

def capacity_sre_fallback(signals: SignalBundle) -> AgentFinding:
    findings: List[str] = []
    evidence: List[EvidenceItem] = []
    recommendations: List[AgentRecommendation] = []
    severity = "info"

    for item in signals.prometheus.memory_pressure:
        pct = float(item.get("value", 0)) * 100
        pod = item.get("pod", "unknown")
        ns = item.get("namespace", "unknown")
        findings.append(f"High memory: {pod} in {ns} at {pct:.0f}% of limit")
        evidence.append(_ev("prometheus", f"{pod} memory {pct:.0f}%"))
        recommendations.append(AgentRecommendation(
            action=f"Increase memory limit for {pod}",
            risk="low",
            automation="scripts/simulate-crashloop.sh --rollback",
        ))
        severity = "high" if pct >= 90 else "medium"

    for item in signals.kubernetes.crashloop_pods:
        findings.append(f"CrashLoopBackOff detected: {item}")
        evidence.append(_ev("kubernetes", f"Pod {item} in CrashLoopBackOff"))
        recommendations.append(AgentRecommendation(
            action=f"Inspect logs: kubectl logs {item} --previous",
            risk="low",
        ))
        severity = "critical"

    for item in signals.kubernetes.pending_pods:
        findings.append(f"Pod stuck in Pending: {item}")
        evidence.append(_ev("kubernetes", f"Pod {item} Pending"))
        recommendations.append(AgentRecommendation(
            action=f"Check node capacity and PVC availability for {item}",
            risk="low",
        ))
        if severity not in ("critical", "high"):
            severity = "medium"

    for item in signals.kubernetes.high_restart_pods:
        restarts = item.get("restarts", 0)
        pod = item.get("pod", "unknown")
        findings.append(f"High restart count: {pod} restarted {restarts}×")
        evidence.append(_ev("kubernetes", f"{pod} restarts={restarts}"))
        recommendations.append(AgentRecommendation(
            action=f"Investigate restart cause for {pod}",
            risk="low",
        ))
        if severity not in ("critical",):
            severity = "medium" if restarts < 20 else "high"

    if not findings:
        findings.append("No capacity or saturation issues detected.")

    return AgentFinding(
        agent="capacity_sre",
        status="healthy" if not any(s in severity for s in ("medium", "high", "critical")) else "risk_detected",
        severity=severity,
        findings=findings,
        evidence=evidence,
        recommendations=recommendations,
        confidence=0.70,
        llm_used=False,
    )


# ── FinOps ────────────────────────────────────────────────────────────────────

def finops_fallback(signals: SignalBundle) -> AgentFinding:
    findings: List[str] = []
    evidence: List[EvidenceItem] = []
    recommendations: List[AgentRecommendation] = []

    if signals.opencost.available:
        for wl in signals.opencost.workload_costs:
            if wl.get("cpuEfficiency", 1.0) < 0.3:
                name = wl.get("name", "unknown")
                findings.append(f"Low CPU efficiency on {name}: consider right-sizing")
                evidence.append(_ev("opencost", f"{name} CPU efficiency low", str(wl.get("cpuEfficiency"))))
                recommendations.append(AgentRecommendation(
                    action=f"Right-size CPU request for {name} after 24h VPA observation",
                    risk="low",
                ))
        if not signals.opencost.workload_costs:
            findings.append("OpenCost data available but no workload cost entries returned.")
    else:
        findings.append("OpenCost unavailable; cost analysis skipped.")
        evidence.append(_ev("opencost", "Service unreachable"))

    # Check for missing cost labels
    for pod_info in signals.kubernetes.pods:
        labels = pod_info.get("labels", {})
        if not labels.get("cost-center") or not labels.get("owner"):
            pod = pod_info.get("name", "unknown")
            ns = pod_info.get("namespace", "unknown")
            findings.append(f"Missing cost labels on {pod} in {ns}")
            recommendations.append(AgentRecommendation(
                action=f"Add cost-center and owner labels to {pod} via GitOps",
                risk="low",
            ))
            break  # Report once

    if not findings:
        findings.append("No cost optimization opportunities detected.")

    return AgentFinding(
        agent="finops",
        status="optimization_available" if len(recommendations) > 0 else "healthy",
        severity="low",
        findings=findings,
        evidence=evidence,
        recommendations=recommendations,
        confidence=0.65,
        llm_used=False,
    )


# ── Incident Prevention & Remediation ─────────────────────────────────────────

def incident_prevention_fallback(signals: SignalBundle) -> AgentFinding:
    findings: List[str] = []
    evidence: List[EvidenceItem] = []
    recommendations: List[AgentRecommendation] = []
    severity = "info"
    root_cause = None

    for pod in signals.kubernetes.crashloop_pods:
        findings.append(f"CrashLoopBackOff: {pod} needs immediate investigation")
        evidence.append(_ev("kubernetes", f"Pod {pod} CrashLoopBackOff"))
        severity = "critical"
        root_cause = "Container repeatedly failing on startup. Likely causes: missing config, OOMKill, or blocked dependency."

    for flow in signals.hubble.denied_flows:
        src = flow.get("source", "?")
        dst = flow.get("destination", "?")
        port = flow.get("port", "?")
        findings.append(f"Cilium denied flow: {src} → {dst}:{port}")
        evidence.append(_ev("hubble", f"Denied {src}→{dst}:{port}"))
        recommendations.append(AgentRecommendation(
            action=f"Review CiliumNetworkPolicy for {src}→{dst} on port {port}",
            risk="medium",
            automation="scripts/simulate-network-deny.sh --rollback",
        ))
        if severity not in ("critical",):
            severity = "high"
        if not root_cause:
            root_cause = f"Network policy blocking {src}→{dst}:{port}"

    for app in signals.argocd.out_of_sync:
        findings.append(f"Argo CD OutOfSync: {app} — cluster drifted from Git")
        evidence.append(_ev("argocd", f"{app} sync=OutOfSync"))
        recommendations.append(AgentRecommendation(
            action=f"Run: argocd app sync {app}",
            risk="low",
            automation=f"scripts/simulate-argocd-outofsync.sh --rollback",
        ))
        if severity == "info":
            severity = "medium"

    for xr in signals.crossplane.not_ready:
        findings.append(f"Crossplane composite resource not ready: {xr}")
        evidence.append(_ev("crossplane", f"{xr} ready=False"))
        recommendations.append(AgentRecommendation(
            action=f"Check: kubectl describe {xr}",
            risk="low",
        ))
        if severity == "info":
            severity = "medium"

    if not findings:
        findings.append("No active incidents detected.")

    return AgentFinding(
        agent="incident_prevention_remediation",
        status="incident_detected" if severity in ("critical", "high") else (
            "risk_detected" if severity == "medium" else "healthy"
        ),
        severity=severity,
        findings=findings,
        probable_root_cause=root_cause,
        evidence=evidence,
        recommendations=recommendations,
        confidence=0.75,
        llm_used=False,
    )


# ── Deployment Health Doctor ───────────────────────────────────────────────────

def deployment_health_fallback(signals: SignalBundle) -> AgentFinding:
    findings: List[str] = []
    evidence: List[EvidenceItem] = []
    recommendations: List[AgentRecommendation] = []
    severity = "info"

    for app in signals.argocd.out_of_sync:
        findings.append(f"Argo CD app {app} is OutOfSync")
        evidence.append(_ev("argocd", f"{app} OutOfSync"))
        recommendations.append(AgentRecommendation(
            action=f"Sync application: argocd app sync {app}",
            risk="low",
        ))
        severity = "medium"

    for app in signals.argocd.degraded:
        findings.append(f"Argo CD app {app} is Degraded")
        evidence.append(_ev("argocd", f"{app} health=Degraded"))
        recommendations.append(AgentRecommendation(
            action=f"Investigate: argocd app get {app} --hard-refresh",
            risk="low",
        ))
        severity = "high"

    for dep in signals.kubernetes.deployments:
        unavailable = dep.get("unavailableReplicas", 0)
        name = dep.get("name", "unknown")
        ns = dep.get("namespace", "unknown")
        if unavailable and int(unavailable) > 0:
            findings.append(f"Deployment {name}/{ns} has {unavailable} unavailable replicas")
            evidence.append(_ev("kubernetes", f"{name} unavailableReplicas={unavailable}"))
            recommendations.append(AgentRecommendation(
                action=f"Check rollout: kubectl rollout status deployment/{name} -n {ns}",
                risk="low",
            ))
            severity = "high" if severity != "critical" else severity

    for xr in signals.crossplane.not_ready:
        findings.append(f"Crossplane resource {xr} not ready — provisioning may be incomplete")
        evidence.append(_ev("crossplane", f"{xr} ready=False"))
        if severity == "info":
            severity = "medium"

    if not findings:
        findings.append("All deployments and GitOps applications appear healthy.")

    return AgentFinding(
        agent="deployment_health_doctor",
        status="degraded" if severity in ("high", "critical") else (
            "risk_detected" if severity == "medium" else "healthy"
        ),
        severity=severity,
        findings=findings,
        evidence=evidence,
        recommendations=recommendations,
        confidence=0.75,
        llm_used=False,
    )


# ── Secure Shield ─────────────────────────────────────────────────────────────

def secure_shield_fallback(signals: SignalBundle) -> AgentFinding:
    findings: List[str] = []
    evidence: List[EvidenceItem] = []
    recommendations: List[AgentRecommendation] = []
    severity = "info"

    for v in signals.policy.gatekeeper_violations:
        constraint = v.get("constraint", "unknown")
        resource = v.get("resource", "unknown")
        findings.append(f"OPA Gatekeeper violation: {constraint} on {resource}")
        evidence.append(_ev("gatekeeper", f"{constraint} violated by {resource}"))
        recommendations.append(AgentRecommendation(
            action=f"Remediate {constraint} violation on {resource} via GitOps patch",
            risk="low",
        ))
        severity = "medium"

    seen_violations: set = set()
    for v in signals.policy.kyverno_violations:
        policy = v.get("policy", "unknown")
        resource = v.get("resource", "unknown")
        vkey = f"{policy}:{resource}"
        if vkey in seen_violations:
            continue
        seen_violations.add(vkey)
        findings.append(f"Kyverno policy violation: {policy} on {resource}")
        evidence.append(_ev("kyverno", f"{policy} failed for {resource}"))
        recommendations.append(AgentRecommendation(
            action=f"Fix {policy} violation on {resource}",
            risk="low",
            automation="scripts/simulate-policy-violation.sh --rollback",
        ))
        severity = "medium"

    for flow in signals.hubble.denied_flows:
        src = flow.get("source", "?")
        dst = flow.get("destination", "?")
        port = flow.get("port", "?")
        findings.append(f"Unexpected denied network flow: {src} → {dst}:{port}")
        evidence.append(_ev("hubble", f"Denied {src}→{dst}:{port}"))
        if severity not in ("high", "critical"):
            severity = "medium"

    for wl in signals.spire.workloads_without_identity:
        findings.append(f"Workload missing SPIFFE identity: {wl}")
        evidence.append(_ev("spire", f"{wl} has no registration entry"))
        recommendations.append(AgentRecommendation(
            action=f"Register SPIRE entry for {wl}",
            risk="medium",
        ))
        if severity == "info":
            severity = "medium"

    if not findings:
        findings.append("No security policy violations or identity gaps detected.")

    return AgentFinding(
        agent="secure_shield",
        status="policy_risk_detected" if findings and severity != "info" else "healthy",
        severity=severity,
        findings=findings,
        evidence=evidence,
        recommendations=recommendations,
        confidence=0.72,
        llm_used=False,
    )


# ── Question → agent topic routing ───────────────────────────────────────────

_NOISE_FINDINGS = frozenset({
    "no capacity or saturation issues detected.",
    "all deployments and gitops applications appear healthy.",
    "no security policy violations or identity gaps detected.",
    "no cost optimization opportunities detected.",
    "no active incidents detected.",
})

_TOPIC_AGENTS = {
    "security":   ["secure_shield", "incident_prevention_remediation"],
    "spire":      ["secure_shield"],
    "identity":   ["secure_shield"],
    "spiffe":     ["secure_shield"],
    "gaps":       ["secure_shield"],
    "zero-trust": ["secure_shield", "incident_prevention_remediation"],
    "policy":     ["secure_shield"],
    "kyverno":    ["secure_shield"],
    "opa":        ["secure_shield"],
    "cost":       ["finops"],
    "spend":      ["finops"],
    "budget":     ["finops"],
    "namespace":  ["finops"],
    "efficiency": ["finops"],
    "rightsiz":   ["finops"],
    "right-siz":  ["finops"],
    "employee":   ["deployment_health_doctor", "incident_prevention_remediation"],
    "portal":     ["deployment_health_doctor", "incident_prevention_remediation"],
    "frontend":   ["deployment_health_doctor", "incident_prevention_remediation"],
    "backend":    ["deployment_health_doctor", "incident_prevention_remediation"],
    "stable":     ["deployment_health_doctor", "incident_prevention_remediation"],
    "argocd":     ["deployment_health_doctor", "incident_prevention_remediation"],
    "argo cd":    ["deployment_health_doctor", "incident_prevention_remediation"],
    "sync":       ["deployment_health_doctor", "incident_prevention_remediation"],
    "deploy":     ["deployment_health_doctor"],
    "rollout":    ["deployment_health_doctor"],
    "network":    ["incident_prevention_remediation", "secure_shield"],
    "cilium":     ["incident_prevention_remediation", "secure_shield"],
    "hubble":     ["incident_prevention_remediation", "secure_shield"],
    "denied":     ["incident_prevention_remediation"],
    "crash":      ["capacity_sre", "incident_prevention_remediation"],
    "loop":       ["capacity_sre", "incident_prevention_remediation"],
    "restart":    ["capacity_sre"],
    "pending":    ["capacity_sre"],
    "memory":     ["capacity_sre"],
    "cpu":        ["capacity_sre"],
    "capacity":   ["capacity_sre"],
}


def _preferred_agents_for_question(question: str) -> list[str]:
    """Return ordered list of most-relevant agent names for the given question."""
    q = question.lower()
    seen: set[str] = set()
    preferred: list[str] = []
    for keyword, agents in _TOPIC_AGENTS.items():
        if keyword in q:
            for a in agents:
                if a not in seen:
                    seen.add(a)
                    preferred.append(a)
    return preferred


# ── Manager Synthesis ─────────────────────────────────────────────────────────

def manager_fallback_synthesis(
    request_question: str,
    findings: dict,
) -> dict:
    """
    Produce a question-aware manager-level summary from worker findings without an LLM.
    Prioritises agents most relevant to the question, then falls back to severity order.
    Returns a dict matching ManagerAnalysis fields.
    """
    severity_order = {"critical": 4, "high": 3, "medium": 2, "low": 1, "info": 0}

    # Order agents: topic-preferred first, then remainder by severity
    preferred = _preferred_agents_for_question(request_question)
    all_agents = list(findings.keys())
    remainder = sorted(
        [a for a in all_agents if a not in preferred],
        key=lambda a: severity_order.get(
            findings[a].severity if isinstance(findings[a], AgentFinding) else "info", 0
        ),
        reverse=True,
    )
    ordered_agents = preferred + remainder

    max_sev = "info"
    all_findings: list[str] = []
    _seen_findings: set = set()
    all_recs: list[dict] = []
    all_evidence: list[dict] = []

    for agent_name in ordered_agents:
        finding = findings.get(agent_name)
        if not isinstance(finding, AgentFinding):
            continue
        sev = finding.severity
        if severity_order.get(sev, 0) > severity_order.get(max_sev, 0):
            max_sev = sev
        for f in finding.findings:
            if f not in _seen_findings:
                _seen_findings.add(f)
                all_findings.append(f)
        seen_ev_keys: set = set()
        for ev in finding.evidence:
            ev_key = f"{ev.source}:{ev.detail or ev.value}"
            if ev_key not in seen_ev_keys:
                seen_ev_keys.add(ev_key)
                all_evidence.append(ev.model_dump())
        for i, rec in enumerate(finding.recommendations):
            all_recs.append({
                "priority": i + 1,
                "action": rec.action,
                "owner": rec.owner or "operations",
                "automation_available": bool(rec.automation),
                "script": rec.automation,
                "risk": rec.risk,
            })

    # Deduplicate recommendations preserving order
    seen: set[str] = set()
    deduped_recs: list[dict] = []
    for rec in all_recs:
        key = rec["action"][:60]
        if key not in seen:
            seen.add(key)
            deduped_recs.append(rec)
    for i, rec in enumerate(deduped_recs):
        rec["priority"] = i + 1

    critical_findings_raw = [f for f in all_findings if f.lower() not in _NOISE_FINDINGS]
    q_lower = request_question.lower()

    # Re-sort so topic-relevant findings from preferred agents lead the summary
    _TOPIC_KEYWORDS: dict = {
        "spire": ("spire", "spiffe", "identity"),
        "spiffe": ("spire", "spiffe", "identity"),
        "identity": ("spire", "spiffe", "identity"),
        "gaps": ("spire", "spiffe", "identity"),
        "network": ("denied", "flow", "cilium", "hubble", "network"),
        "cilium": ("denied", "flow", "cilium", "hubble"),
        "hubble": ("denied", "flow", "cilium", "hubble"),
        "argocd": ("argocd", "argo", "sync", "outofsync"),
        "sync": ("argocd", "argo", "sync", "outofsync"),
        "security": ("kyverno", "policy", "violation", "gatekeeper"),
        "policy": ("kyverno", "policy", "violation", "gatekeeper"),
        "cost": ("cost", "efficiency", "cpu", "rightsiz"),
        "crash": ("crashloop", "crash", "backoff", "restart"),
        "loop": ("crashloop", "crash", "backoff", "restart"),
        "memory": ("memory", "oom"),
        "cpu": ("cpu", "throttl"),
    }
    topic_kw: tuple = ()
    for k, kw in _TOPIC_KEYWORDS.items():
        if k in q_lower:
            topic_kw = kw
            break

    if topic_kw and preferred:
        topic_first = [f for f in critical_findings_raw
                       if any(kw in f.lower() for kw in topic_kw)]
        topic_rest = [f for f in critical_findings_raw
                      if f not in topic_first]
        critical_findings = topic_first + topic_rest
    else:
        critical_findings = critical_findings_raw

    # Check whether the preferred (topic-relevant) agents have any real findings
    preferred_findings = [
        f for a in preferred
        for f in (findings.get(a).findings if isinstance(findings.get(a), AgentFinding) else [])
        if f.lower() not in _NOISE_FINDINGS
    ]
    if not critical_findings:
        summary = (
            "All monitored platform subsystems are operating normally — "
            "no capacity pressure, policy violations, deployment drift, or active incidents detected."
        )
        root_cause = None
        impact = "No user-facing impact. Platform is healthy."
    else:
        # When the specific domain asked about is healthy but other issues exist, acknowledge it
        # Also handle when preferred agent has findings but none are topic-specific
        spire_specific = any("spire" in f.lower() or "spiffe" in f.lower() or "identity" in f.lower()
                             for f in preferred_findings)
        context_prefix = ""
        if preferred and critical_findings and (
            not preferred_findings
            or (any(k in q_lower for k in ("spire", "spiffe", "identity", "gaps")) and not spire_specific)
        ):
            if any(k in q_lower for k in ("employee", "portal", "backend", "frontend")):
                context_prefix = "The employee portal is operating normally."
            elif any(k in q_lower for k in ("argocd", "argo", "sync", "deploy", "rollout")):
                context_prefix = "All Argo CD applications are in sync and deployments are healthy."
            elif any(k in q_lower for k in ("spire", "identity", "spiffe", "certificate", "gaps")):
                context_prefix = "No SPIRE identity gaps or missing workload registrations detected."
            elif any(k in q_lower for k in ("network", "cilium", "hubble", "flow")):
                context_prefix = "No significant denied network flows detected."
            elif any(k in q_lower for k in ("security", "policy", "kyverno", "opa")):
                context_prefix = "No active security enforcement failures."

        # Build a synthesised summary from the top 2-3 distinct findings
        top_findings_list = critical_findings[:3]
        if len(top_findings_list) == 1:
            core_summary = top_findings_list[0]
        elif len(top_findings_list) == 2:
            core_summary = f"{top_findings_list[0]}. Additionally: {top_findings_list[1].lower()}"
        else:
            core_summary = (
                f"{top_findings_list[0]}. "
                f"Secondary concerns: {top_findings_list[1].lower()} "
                f"and {top_findings_list[2].lower()}"
            )
        summary = f"{context_prefix} Unrelated: {core_summary.lower()}" if context_prefix else core_summary

        # Root cause: prefer an agent with an explicit probable_root_cause
        root_cause = None
        for agent_name in ordered_agents:
            finding = findings.get(agent_name)
            if isinstance(finding, AgentFinding) and finding.probable_root_cause:
                root_cause = finding.probable_root_cause
                break
        if not root_cause:
            root_cause = critical_findings[0]

        # Business impact: specific to severity and affected components
        affected = []
        for f in critical_findings[:5]:
            for token in f.replace(",", " ").replace(":", " ").split():
                tok = token.strip(".,:/()[]")
                if any(k in tok.lower() for k in
                       ("employee", "backend", "frontend", "postgres", "portal",
                        "provider", "argocd", "kyverno", "gatekeeper", "cilium")) and len(tok) > 4:
                    affected.append(tok)
        affected_str = ", ".join(list(dict.fromkeys(affected))[:4]) if affected else "platform components"

        if max_sev == "critical":
            impact = f"Active service disruption affecting {affected_str}. Immediate action required."
        elif max_sev == "high":
            impact = f"Elevated risk of user-facing degradation on {affected_str}. Remediate within the hour."
        elif max_sev == "medium":
            impact = f"Platform health degraded on {affected_str} — no immediate outage, but instability risk is rising."
        else:
            impact = f"Minor optimisation opportunities on {affected_str}. No immediate user impact."

    return {
        "summary": summary,
        "severity": max_sev,
        "business_impact": impact,
        "probable_root_cause": root_cause,
        "recommended_actions": deduped_recs[:8],
        "evidence": all_evidence,
        "confidence": 0.72,
    }
