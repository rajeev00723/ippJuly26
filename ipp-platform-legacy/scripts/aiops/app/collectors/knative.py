"""
Knative Serving data collector.

Queries serving.knative.dev/v1 custom resources (services, revisions) from the
local cluster using the kubernetes Python client.  All methods are safe to call
regardless of cluster reachability — they return empty-safe structures on failure.

Environment variables (all optional):
  KNATIVE_ENABLED    - "true" to enable live collection (default: auto-detect via CRD probe)
  K8S_SA_TOKEN       - service-account bearer token (uses in-cluster config if absent)
  K8S_API_URL        - override API server URL (e.g. https://kubernetes.default.svc)
  KNATIVE_TIMEOUT    - per-request timeout in seconds (default: 5)
"""
from __future__ import annotations

import asyncio
import logging
import os
from typing import Any

from ..models import KnativeSignals

logger = logging.getLogger("aiops-engine.collectors.knative")

# ── Kubernetes client bootstrap ───────────────────────────────────────────────

def _build_client():
    """
    Return a configured kubernetes.client.ApiClient or None if unavailable.
    Tries in-cluster config first, then falls back to KUBECONFIG / env vars.
    """
    try:
        from kubernetes import client as k8s_client, config as k8s_config

        timeout = float(os.getenv("KNATIVE_TIMEOUT", "5"))
        api_url = os.getenv("K8S_API_URL", "").strip()
        sa_token = os.getenv("K8S_SA_TOKEN", "").strip()

        if api_url:
            cfg = k8s_client.Configuration()
            cfg.host = api_url
            cfg.verify_ssl = False
            if sa_token:
                cfg.api_key["authorization"] = f"Bearer {sa_token}"
                cfg.api_key_prefix["authorization"] = ""
            api_client = k8s_client.ApiClient(configuration=cfg)
        else:
            try:
                k8s_config.load_incluster_config()
            except k8s_config.ConfigException:
                k8s_config.load_kube_config()
            api_client = k8s_client.ApiClient()

        # Attach timeout to the underlying connection pool
        try:
            api_client.rest_client.pool_manager.connection_pool_kw["timeout"] = timeout
        except Exception:
            pass

        return api_client
    except Exception as exc:
        logger.debug("Knative k8s client init skipped: %s", exc)
        return None


# ── Collector class ───────────────────────────────────────────────────────────

class KnativeCollector:
    """
    Collect Knative Serving telemetry (services + revisions) from the cluster.

    Usage::
        signals = await KnativeCollector().collect()
    """

    _GROUP = "serving.knative.dev"
    _VERSION = "v1"

    def __init__(self) -> None:
        self._client = _build_client()

    def _custom_objects_api(self):
        if self._client is None:
            return None
        try:
            from kubernetes import client as k8s_client
            return k8s_client.CustomObjectsApi(self._client)
        except Exception as exc:
            logger.debug("CustomObjectsApi init failed: %s", exc)
            return None

    def _list_cluster(self, plural: str) -> list[Any]:
        api = self._custom_objects_api()
        if api is None:
            return []
        try:
            resp = api.list_cluster_custom_object(self._GROUP, self._VERSION, plural)
            return resp.get("items", [])
        except Exception as exc:
            logger.debug("Knative list %s failed: %s", plural, exc)
            return []

    def _is_ready(self, item: dict) -> bool:
        conditions = item.get("status", {}).get("conditions", [])
        ready = next((c for c in conditions if c.get("type") == "Ready"), None)
        return ready.get("status") == "True" if ready else False

    def _parse_services(self, items: list[dict]) -> list[dict]:
        result = []
        for item in items:
            meta = item.get("metadata", {})
            status = item.get("status", {})
            result.append({
                "name": meta.get("name", "unknown"),
                "namespace": meta.get("namespace", "default"),
                "ready": self._is_ready(item),
                "url": status.get("url", ""),
                "latestReadyRevision": status.get("latestReadyRevisionName", ""),
                "latestCreatedRevision": status.get("latestCreatedRevisionName", ""),
                "observedGeneration": status.get("observedGeneration", 0),
                "labels": meta.get("labels", {}),
            })
        return result

    def _parse_revisions(self, items: list[dict]) -> list[dict]:
        result = []
        scaled_to_zero = []
        for item in items:
            meta = item.get("metadata", {})
            status = item.get("status", {})
            actual_replicas = status.get("actualReplicas", 0) or 0
            desired_replicas = status.get("desiredReplicas", 0) or 0
            name = meta.get("name", "unknown")
            if actual_replicas == 0:
                scaled_to_zero.append(name)
            result.append({
                "name": name,
                "namespace": meta.get("namespace", "default"),
                "service": meta.get("labels", {}).get("serving.knative.dev/service", ""),
                "ready": self._is_ready(item),
                "actualReplicas": actual_replicas,
                "desiredReplicas": desired_replicas,
                "scaledToZero": actual_replicas == 0,
                "creationTimestamp": meta.get("creationTimestamp", ""),
                "labels": meta.get("labels", {}),
            })
        return result, scaled_to_zero  # type: ignore[return-value]

    async def collect(self, _namespace: str | None = None) -> KnativeSignals:
        """
        Collect Knative Serving signals. Runs k8s API calls in a thread executor
        so the async event loop is not blocked by synchronous k8s client calls.
        """
        loop = asyncio.get_event_loop()

        try:
            svc_items, rev_items = await asyncio.gather(
                loop.run_in_executor(None, lambda: self._list_cluster("services")),
                loop.run_in_executor(None, lambda: self._list_cluster("revisions")),
                return_exceptions=True,
            )

            if isinstance(svc_items, Exception):
                logger.warning("Knative services fetch error: %s", svc_items)
                svc_items = []
            if isinstance(rev_items, Exception):
                logger.warning("Knative revisions fetch error: %s", rev_items)
                rev_items = []

            services = self._parse_services(svc_items)
            revisions_parsed, scaled_to_zero = self._parse_revisions(rev_items)

            available = len(services) > 0 or len(revisions_parsed) > 0

            if available:
                logger.info(
                    "Knative live: %d services, %d revisions, %d scaled-to-zero",
                    len(services), len(revisions_parsed), len(scaled_to_zero),
                )
            else:
                logger.debug("Knative: no resources found (Knative may not be installed)")

            return KnativeSignals(
                services=services,
                revisions=revisions_parsed,
                scaled_to_zero=scaled_to_zero,
                available=available,
            )

        except Exception as exc:
            logger.warning("KnativeCollector.collect raised: %s", exc)
            return KnativeSignals()
