"""
API endpoint tests using FastAPI TestClient.
No cluster or LLM required — uses mocked graph execution.
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.models import ManagerAnalysis, AgentFinding


def _make_mock_analysis() -> ManagerAnalysis:
    from app.models import RecommendedAction, EvidenceItem
    return ManagerAnalysis(
        analysis_id="test-analysis-001",
        summary="Test: platform health nominal.",
        severity="info",
        business_impact="No user impact.",
        probable_root_cause="None detected.",
        recommended_actions=[
            RecommendedAction(priority=1, action="Continue monitoring", owner="operations", risk="low")
        ],
        worker_findings={
            "capacity_sre": AgentFinding(agent="capacity_sre", status="healthy", severity="info",
                                         findings=["No issues"], confidence=0.7),
        },
        evidence=[EvidenceItem(source="prometheus", detail="All metrics nominal")],
        confidence=0.75,
        llm_mode="fallback",
        llm_model="rule-based",
        tracing="disabled",
    )


@pytest.fixture
def client():
    """Create a TestClient with mocked graph execution."""
    mock_analysis = _make_mock_analysis()
    with patch("app.main.run_analysis", new_callable=AsyncMock, return_value=mock_analysis), \
         patch("app.main.get_llm_client") as mock_llm:
        mock_llm.return_value._check_available = AsyncMock(return_value=False)
        mock_llm.return_value.model = "rule-based"
        from app.main import app
        yield TestClient(app)


class TestHealthEndpoint:

    def test_health_returns_200(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_contains_required_fields(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert "status" in data
        assert "version" in data
        assert data["status"] == "healthy"

    def test_health_contains_llm_mode(self, client):
        resp = client.get("/health")
        data = resp.json()
        assert "llm_mode" in data
        assert "tracing" in data


class TestAgentsEndpoints:

    def test_list_agents(self, client):
        resp = client.get("/agents")
        assert resp.status_code == 200
        data = resp.json()
        assert "agents" in data
        assert data["total"] == 6

    def test_agents_contain_all_names(self, client):
        resp = client.get("/agents")
        keys = {a["key"] for a in resp.json()["agents"]}
        expected = {"manager", "capacity_sre", "finops", "incident_prevention_remediation",
                    "deployment_health_doctor", "secure_shield"}
        assert keys == expected

    def test_agents_status(self, client):
        resp = client.get("/agents/status")
        assert resp.status_code == 200
        data = resp.json()
        assert "llm_mode" in data
        assert "ollama_reachable" in data


class TestAnalyzeEndpoint:

    def test_analyze_returns_200(self, client):
        resp = client.post("/analyze", json={
            "scope": "employee-portal",
            "namespace": "employee-portal",
            "question": "Is the platform healthy?",
        })
        assert resp.status_code == 200

    def test_analyze_returns_manager_analysis(self, client):
        resp = client.post("/analyze", json={
            "scope": "cluster",
            "question": "Health check",
        })
        data = resp.json()
        assert "analysis_id" in data
        assert "summary" in data
        assert "severity" in data
        assert "recommended_actions" in data
        assert "worker_findings" in data
        assert "confidence" in data
        assert "llm_mode" in data

    def test_analyze_confidence_range(self, client):
        resp = client.post("/analyze", json={"scope": "cluster", "question": "test"})
        data = resp.json()
        assert 0.0 <= data["confidence"] <= 1.0


class TestSignalsEndpoint:

    def test_signals_returns_200(self, client):
        with patch("app.main.PrometheusCollector"):
            resp = client.get("/signals")
        assert resp.status_code == 200

    def test_signals_shape(self, client):
        with patch("app.main.PrometheusCollector") as mock_prom:
            mock_prom.return_value._query = AsyncMock(return_value=None)
            resp = client.get("/signals")
        data = resp.json()
        assert "signals" in data
        assert "demo_mode" in data


class TestDemoEndpoints:

    def test_demo_incidents(self, client):
        resp = client.get("/demo-incidents")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert len(data["incidents"]) >= 1

    def test_demo_recommendations(self, client):
        resp = client.get("/demo-recommendations")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1

    def test_simulate_crashloop(self, client):
        resp = client.post("/simulate/crashloop")
        assert resp.status_code == 200
        data = resp.json()
        assert "rollback" in data
        assert "analyze" in data

    def test_simulate_invalid_type(self, client):
        resp = client.post("/simulate/invalid-type")
        assert resp.status_code == 400
