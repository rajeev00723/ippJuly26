"""
Unit tests for the Karmada collector.

No real cluster or Karmada control plane required.
All Kubernetes client calls are mocked.
"""
from __future__ import annotations

import os
from unittest.mock import MagicMock, patch

import pytest


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_cluster_item(name: str, ready: bool = True, region: str = "us-east-1") -> dict:
    return {
        "metadata": {
            "name": name,
            "labels": {
                "topology.kubernetes.io/region": region,
                "cluster.karmada.io/provider": "AWS EKS",
            },
        },
        "spec": {"syncMode": "Push"},
        "status": {
            "conditions": [{"type": "Ready", "status": "True" if ready else "False"}],
            "nodeSummary": {"totalNum": 3},
            "kubernetesVersion": "v1.28.4",
        },
    }


def _make_policy_item(name: str, namespace: str, cluster_names: list[str]) -> dict:
    return {
        "metadata": {"name": name, "namespace": namespace},
        "spec": {
            "resourceSelectors": [{"apiVersion": "apps/v1", "kind": "Deployment", "name": ""}],
            "placement": {
                "clusterAffinity": {"clusterNames": cluster_names},
            },
        },
    }


def _make_binding_item(name: str, namespace: str, scheduled: bool, clusters: list[str]) -> dict:
    return {
        "metadata": {"name": name, "namespace": namespace},
        "spec": {
            "resource": {"kind": "Deployment", "name": name},
            "schedulerName": "default-scheduler",
        },
        "status": {
            "conditions": [{"type": "Scheduled", "status": "True" if scheduled else "False"}],
            "aggregatedStatus": [{"clusterName": c} for c in clusters],
        },
    }


# ── Feature-flag guard ────────────────────────────────────────────────────────

class TestFeatureFlag:

    def test_disabled_by_default(self, monkeypatch):
        monkeypatch.delenv("KARMADA_ENABLED", raising=False)
        from app.collectors.karmada import _is_enabled
        assert _is_enabled() is False

    def test_enabled_with_true(self, monkeypatch):
        monkeypatch.setenv("KARMADA_ENABLED", "true")
        from app.collectors.karmada import _is_enabled
        assert _is_enabled() is True

    def test_enabled_with_1(self, monkeypatch):
        monkeypatch.setenv("KARMADA_ENABLED", "1")
        from app.collectors.karmada import _is_enabled
        assert _is_enabled() is True

    def test_disabled_with_false(self, monkeypatch):
        monkeypatch.setenv("KARMADA_ENABLED", "false")
        from app.collectors.karmada import _is_enabled
        assert _is_enabled() is False


# ── KarmadaCollector — disabled state ────────────────────────────────────────

class TestCollectorDisabled:

    def _make_disabled_collector(self, monkeypatch):
        monkeypatch.delenv("KARMADA_ENABLED", raising=False)
        # Re-import to get a fresh instance (bypass module-level singleton)
        import importlib
        import app.collectors.karmada as mod
        importlib.reload(mod)
        collector = mod.KarmadaCollector()
        return collector

    def test_not_reachable_when_disabled(self, monkeypatch):
        c = self._make_disabled_collector(monkeypatch)
        assert c.is_reachable() is False

    def test_list_clusters_returns_empty_when_disabled(self, monkeypatch):
        c = self._make_disabled_collector(monkeypatch)
        assert c.list_member_clusters() == []

    def test_list_policies_returns_empty_when_disabled(self, monkeypatch):
        c = self._make_disabled_collector(monkeypatch)
        assert c.list_propagation_policies() == []

    def test_list_bindings_returns_empty_when_disabled(self, monkeypatch):
        c = self._make_disabled_collector(monkeypatch)
        assert c.list_resource_bindings() == []

    def test_collect_all_returns_safe_dict_when_disabled(self, monkeypatch):
        c = self._make_disabled_collector(monkeypatch)
        result = c.collect_all()
        assert result["reachable"] is False
        assert result["clusters"] == []
        assert result["propagationPolicies"] == []
        assert result["clusterPropagationPolicies"] == []
        assert result["resourceBindings"] == []


# ── KarmadaCollector — enabled + mocked API ───────────────────────────────────

class TestCollectorEnabled:

    def _make_enabled_collector_with_mock(self, monkeypatch, api_mock):
        monkeypatch.setenv("KARMADA_ENABLED", "true")
        monkeypatch.setenv("KARMADA_API_URL", "http://karmada-test:5443")
        import importlib
        import app.collectors.karmada as mod

        # Patch kubernetes client so no real connection is attempted
        with patch.dict("sys.modules", {
            "kubernetes": MagicMock(),
            "kubernetes.client": MagicMock(),
            "kubernetes.config": MagicMock(),
        }):
            importlib.reload(mod)
            collector = mod.KarmadaCollector()
            collector._client = MagicMock()  # pretend client exists
            collector._custom_objects_api = lambda: api_mock
        return collector

    def test_list_member_clusters_parses_items(self, monkeypatch):
        api_mock = MagicMock()
        api_mock.list_cluster_custom_object.return_value = {
            "items": [
                _make_cluster_item("cluster-us-east-1", ready=True, region="us-east-1"),
                _make_cluster_item("cluster-eu-west-1", ready=False, region="eu-west-1"),
            ]
        }
        c = self._make_enabled_collector_with_mock(monkeypatch, api_mock)
        clusters = c.list_member_clusters()
        assert len(clusters) == 2
        assert clusters[0]["name"] == "cluster-us-east-1"
        assert clusters[0]["status"] == "Ready"
        assert clusters[0]["region"] == "us-east-1"
        assert clusters[1]["status"] == "NotReady"

    def test_list_propagation_policies_parses_items(self, monkeypatch):
        api_mock = MagicMock()
        api_mock.list_cluster_custom_object.return_value = {
            "items": [
                _make_policy_item("my-policy", "my-ns", ["cluster-a", "cluster-b"]),
            ]
        }
        c = self._make_enabled_collector_with_mock(monkeypatch, api_mock)
        policies = c.list_propagation_policies()
        assert len(policies) == 1
        assert policies[0]["name"] == "my-policy"
        assert policies[0]["namespace"] == "my-ns"
        assert "cluster-a" in policies[0]["targetClusters"]

    def test_list_resource_bindings_scheduled(self, monkeypatch):
        api_mock = MagicMock()
        api_mock.list_cluster_custom_object.return_value = {
            "items": [
                _make_binding_item("my-binding", "my-ns", scheduled=True, clusters=["cluster-a"]),
            ]
        }
        c = self._make_enabled_collector_with_mock(monkeypatch, api_mock)
        bindings = c.list_resource_bindings()
        assert len(bindings) == 1
        assert bindings[0]["phase"] == "Scheduled"
        assert "cluster-a" in bindings[0]["clusters"]

    def test_list_resource_bindings_pending(self, monkeypatch):
        api_mock = MagicMock()
        api_mock.list_cluster_custom_object.return_value = {
            "items": [
                _make_binding_item("unscheduled", "ns", scheduled=False, clusters=[]),
            ]
        }
        c = self._make_enabled_collector_with_mock(monkeypatch, api_mock)
        bindings = c.list_resource_bindings()
        assert bindings[0]["phase"] == "Pending"

    def test_collect_all_reachable(self, monkeypatch):
        api_mock = MagicMock()
        api_mock.list_cluster_custom_object.return_value = {
            "items": [_make_cluster_item("c1", ready=True)]
        }
        c = self._make_enabled_collector_with_mock(monkeypatch, api_mock)
        # Make is_reachable return True
        c.is_reachable = lambda: True
        result = c.collect_all()
        assert result["reachable"] is True
        assert isinstance(result["clusters"], list)


# ── Graceful degradation: API errors never propagate ─────────────────────────

class TestGracefulDegradation:

    def test_api_exception_returns_empty_list(self, monkeypatch):
        monkeypatch.setenv("KARMADA_ENABLED", "true")
        import importlib
        import app.collectors.karmada as mod
        importlib.reload(mod)

        api_mock = MagicMock()
        api_mock.list_cluster_custom_object.side_effect = Exception("connection refused")

        collector = mod.KarmadaCollector()
        collector._client = MagicMock()
        collector._custom_objects_api = lambda: api_mock

        # Must not raise; must return []
        result = collector.list_member_clusters()
        assert result == []

    def test_collect_all_unreachable_returns_safe_dict(self, monkeypatch):
        monkeypatch.setenv("KARMADA_ENABLED", "true")
        import importlib
        import app.collectors.karmada as mod
        importlib.reload(mod)

        collector = mod.KarmadaCollector()
        collector._client = MagicMock()
        collector.is_reachable = lambda: False

        result = collector.collect_all()
        assert result["reachable"] is False
        assert result["clusters"] == []


# ── Smoke test: existing AIOps /health endpoint still returns 200 ─────────────

class TestExistingAIOpsHealthSmoke:
    """
    Verifies the primary AIOps health endpoint is unaffected by the Karmada
    collector being imported into the same process.
    """

    def test_health_endpoint_unaffected(self):
        from unittest.mock import AsyncMock
        from fastapi.testclient import TestClient

        with patch("app.main.run_analysis", new_callable=AsyncMock) as mock_run, \
             patch("app.main.get_llm_client") as mock_llm:
            mock_llm.return_value._check_available = AsyncMock(return_value=False)
            mock_llm.return_value.model = "rule-based"
            mock_run.return_value = None
            from app.main import app
            client = TestClient(app)
            resp = client.get("/health")

        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "version" in data
