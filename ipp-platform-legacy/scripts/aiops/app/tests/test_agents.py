"""
Unit tests for worker agents using fallback rules (no LLM required).
"""
import pytest
import asyncio
from unittest.mock import AsyncMock, patch

from app.models import (
    SignalBundle, KubernetesSignals, PrometheusSignals,
    OpenCostSignals, ArgoCDSignals, CrossplaneSignals,
    HubbleSignals, PolicySignals, SpireSignals,
)
from app.fallback_rules import (
    capacity_sre_fallback, finops_fallback, incident_prevention_fallback,
    deployment_health_fallback, secure_shield_fallback,
)


def _make_signals(**overrides) -> SignalBundle:
    defaults = dict(
        kubernetes=KubernetesSignals(available=True),
        prometheus=PrometheusSignals(available=True),
        opencost=OpenCostSignals(available=False),
        argocd=ArgoCDSignals(available=True),
        crossplane=CrossplaneSignals(available=True),
        hubble=HubbleSignals(available=True),
        policy=PolicySignals(available=True),
        spire=SpireSignals(available=True),
    )
    defaults.update(overrides)
    return SignalBundle(**defaults)


class TestCapacitySREAgent:

    def test_healthy_signals(self):
        signals = _make_signals()
        finding = capacity_sre_fallback(signals)
        assert finding.agent == "capacity_sre"
        assert finding.severity in ("info", "low", "medium", "high", "critical")
        assert finding.confidence > 0

    def test_crashloop_detection(self):
        signals = _make_signals(
            kubernetes=KubernetesSignals(
                available=True,
                crashloop_pods=["employee-portal/backend-xyz"],
            )
        )
        finding = capacity_sre_fallback(signals)
        assert finding.severity == "critical"
        assert finding.status == "risk_detected"
        assert any("CrashLoop" in f for f in finding.findings)

    def test_high_restart_detection(self):
        signals = _make_signals(
            kubernetes=KubernetesSignals(
                available=True,
                high_restart_pods=[{"pod": "backend-xyz", "namespace": "employee-portal", "restarts": 25}],
            )
        )
        finding = capacity_sre_fallback(signals)
        assert any("restart" in f.lower() for f in finding.findings)


class TestFinOpsAgent:

    def test_opencost_unavailable(self):
        signals = _make_signals(opencost=OpenCostSignals(available=False))
        finding = finops_fallback(signals)
        assert finding.agent == "finops"
        assert any("unavailable" in f.lower() or "skipped" in f.lower() for f in finding.findings)

    def test_missing_labels_detected(self):
        signals = _make_signals(
            kubernetes=KubernetesSignals(
                available=True,
                pods=[{"name": "backend", "namespace": "employee-portal", "labels": {}}],
            )
        )
        finding = finops_fallback(signals)
        assert any("label" in f.lower() for f in finding.findings)
        assert len(finding.recommendations) > 0


class TestIncidentPreventionAgent:

    def test_crashloop_incident(self):
        signals = _make_signals(
            kubernetes=KubernetesSignals(
                available=True,
                crashloop_pods=["backend-pod-xyz"],
            )
        )
        finding = incident_prevention_fallback(signals)
        assert finding.severity == "critical"
        assert finding.status == "incident_detected"
        assert finding.probable_root_cause is not None

    def test_argocd_outofsync(self):
        signals = _make_signals(
            argocd=ArgoCDSignals(available=True, out_of_sync=["employee-portal"])
        )
        finding = incident_prevention_fallback(signals)
        assert any("OutOfSync" in f for f in finding.findings)
        assert len(finding.recommendations) > 0

    def test_denied_flow_detection(self):
        signals = _make_signals(
            hubble=HubbleSignals(
                available=True,
                denied_flows=[{"source": "backend", "destination": "postgres", "port": "5432"}],
            )
        )
        finding = incident_prevention_fallback(signals)
        assert any("5432" in f or "denied" in f.lower() for f in finding.findings)


class TestDeploymentHealthDoctor:

    def test_healthy(self):
        signals = _make_signals()
        finding = deployment_health_fallback(signals)
        assert finding.agent == "deployment_health_doctor"
        assert "healthy" in finding.status.lower() or len(finding.findings) > 0

    def test_outofsync_detected(self):
        signals = _make_signals(
            argocd=ArgoCDSignals(available=True, out_of_sync=["employee-portal"])
        )
        finding = deployment_health_fallback(signals)
        assert finding.severity == "medium"
        assert any("OutOfSync" in f for f in finding.findings)

    def test_degraded_app_detected(self):
        signals = _make_signals(
            argocd=ArgoCDSignals(available=True, degraded=["employee-portal"])
        )
        finding = deployment_health_fallback(signals)
        assert finding.severity == "high"


class TestSecureShieldAgent:

    def test_no_violations(self):
        signals = _make_signals()
        finding = secure_shield_fallback(signals)
        assert finding.agent == "secure_shield"

    def test_kyverno_violations(self):
        signals = _make_signals(
            policy=PolicySignals(
                available=True,
                kyverno_violations=[
                    {"policy": "require-standard-labels", "resource": "Pod/backend", "namespace": "employee-portal", "message": "missing label owner"}
                ],
            )
        )
        finding = secure_shield_fallback(signals)
        assert finding.severity == "medium"
        assert finding.status == "policy_risk_detected"

    def test_spire_gap_detected(self):
        signals = _make_signals(
            spire=SpireSignals(available=True, workloads_without_identity=["employee-portal/backend"])
        )
        finding = secure_shield_fallback(signals)
        assert any("SPIFFE" in f or "identity" in f.lower() for f in finding.findings)
