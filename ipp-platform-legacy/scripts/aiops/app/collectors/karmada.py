"""
Karmada multi-cluster data collector.

Connects to the Karmada aggregated API server using the kubernetes Python client.
All methods return empty lists / None on failure — never raise to the caller.

Environment variables (all optional):
  KARMADA_ENABLED       - "true" to activate (default: false)
  KARMADA_KUBECONFIG    - path to karmada-apiserver kubeconfig
                          (default: ~/.kube/karmada-apiserver.config)
  KARMADA_API_URL       - override API server URL (takes precedence over kubeconfig)
  KARMADA_SA_TOKEN      - service-account bearer token (used with KARMADA_API_URL)
  KARMADA_TIMEOUT       - per-request timeout in seconds (default: 5)
"""
from __future__ import annotations

import logging
import os
from typing import Any

logger = logging.getLogger("aiops-engine.collectors.karmada")

# ── Feature flag ──────────────────────────────────────────────────────────────

def _is_enabled() -> bool:
    return os.getenv("KARMADA_ENABLED", "false").lower() in ("1", "true", "yes")


# ── Kubernetes client bootstrap ───────────────────────────────────────────────

def _build_client():
    """
    Return a configured kubernetes.client.ApiClient pointed at the Karmada
    aggregated API server, or None if the feature is disabled / misconfigured.
    """
    if not _is_enabled():
        return None
    try:
        from kubernetes import client as k8s_client, config as k8s_config

        api_url = os.getenv("KARMADA_API_URL", "").strip()
        sa_token = os.getenv("KARMADA_SA_TOKEN", "").strip()
        timeout = float(os.getenv("KARMADA_TIMEOUT", "5"))

        if api_url:
            # Direct URL + optional bearer token (e.g. in-cluster Backstage proxy)
            cfg = k8s_client.Configuration()
            cfg.host = api_url
            cfg.verify_ssl = False
            if sa_token:
                cfg.api_key["authorization"] = f"Bearer {sa_token}"
            cfg.connection_pool_maxsize = 4
            api_client = k8s_client.ApiClient(configuration=cfg)
        else:
            kubeconfig = os.path.expanduser(
                os.getenv(
                    "KARMADA_KUBECONFIG",
                    "~/.kube/karmada-apiserver.config",
                )
            )
            if not os.path.exists(kubeconfig):
                logger.warning(
                    "Karmada kubeconfig not found at %s; Karmada data unavailable",
                    kubeconfig,
                )
                return None
            k8s_config.load_kube_config(config_file=kubeconfig)
            api_client = k8s_client.ApiClient()

        # Attach timeout so it applies to every request made through this client
        api_client.rest_client.pool_manager.connection_pool_kw["timeout"] = timeout
        return api_client
    except Exception as exc:  # noqa: BLE001
        logger.warning("Karmada client init failed: %s", exc)
        return None


# ── Collector class ───────────────────────────────────────────────────────────

class KarmadaCollector:
    """
    Thin wrapper around the Karmada API server's custom resource endpoints.
    Each public method is safe to call regardless of cluster reachability.
    """

    # Karmada API group versions
    _CLUSTER_GROUP = "cluster.karmada.io"
    _CLUSTER_VERSION = "v1alpha1"
    _POLICY_GROUP = "policy.karmada.io"
    _POLICY_VERSION = "v1alpha1"
    _WORK_GROUP = "work.karmada.io"
    _WORK_VERSION = "v1alpha2"

    def __init__(self) -> None:
        self._client = _build_client()

    # ── Internal helper ───────────────────────────────────────────────────────

    def _custom_objects_api(self):
        if self._client is None:
            return None
        try:
            from kubernetes import client as k8s_client
            return k8s_client.CustomObjectsApi(self._client)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not create CustomObjectsApi: %s", exc)
            return None

    def _safe_list_cluster_custom_object(
        self, group: str, version: str, plural: str
    ) -> list[Any]:
        api = self._custom_objects_api()
        if api is None:
            return []
        try:
            resp = api.list_cluster_custom_object(group, version, plural)
            return resp.get("items", [])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Karmada list %s/%s/%s failed: %s", group, version, plural, exc)
            return []

    def _safe_list_namespaced_custom_object(
        self, group: str, version: str, plural: str, namespace: str = ""
    ) -> list[Any]:
        api = self._custom_objects_api()
        if api is None:
            return []
        try:
            if namespace:
                resp = api.list_namespaced_custom_object(group, version, namespace, plural)
            else:
                resp = api.list_cluster_custom_object(group, version, plural)
            return resp.get("items", [])
        except Exception as exc:  # noqa: BLE001
            logger.warning("Karmada list %s/%s/%s (ns=%s) failed: %s", group, version, plural, namespace, exc)
            return []

    # ── Public API ────────────────────────────────────────────────────────────

    def is_reachable(self) -> bool:
        """Quick connectivity probe — tries to list member clusters."""
        if self._client is None:
            return False
        api = self._custom_objects_api()
        if api is None:
            return False
        try:
            api.list_cluster_custom_object(
                self._CLUSTER_GROUP, self._CLUSTER_VERSION, "clusters",
                limit=1,
            )
            return True
        except Exception:  # noqa: BLE001
            return False

    def list_member_clusters(self) -> list[dict[str, Any]]:
        """
        Return list of member clusters with name, region, status, syncMode,
        nodeCount, and kubernetesVersion.
        """
        items = self._safe_list_cluster_custom_object(
            self._CLUSTER_GROUP, self._CLUSTER_VERSION, "clusters"
        )
        result = []
        for item in items:
            meta = item.get("metadata", {})
            spec = item.get("spec", {})
            status = item.get("status", {})
            labels = meta.get("labels", {})
            conditions = status.get("conditions", [])
            ready = next(
                (c["status"] == "True" for c in conditions if c.get("type") == "Ready"),
                False,
            )
            result.append({
                "name": meta.get("name", "unknown"),
                "region": labels.get("topology.kubernetes.io/region", "unknown"),
                "status": "Ready" if ready else "NotReady",
                "syncMode": spec.get("syncMode", "Push"),
                "provider": labels.get("cluster.karmada.io/provider", "Kubernetes"),
                "nodeCount": status.get("nodeSummary", {}).get("totalNum", 0),
                "kubernetesVersion": status.get("kubernetesVersion", "unknown"),
                "taints": spec.get("taints", []),
            })
        return result

    def list_propagation_policies(self, namespace: str = "") -> list[dict[str, Any]]:
        """
        Return PropagationPolicies (namespace-scoped).
        Pass namespace="" to list across all namespaces.
        """
        items = self._safe_list_namespaced_custom_object(
            self._POLICY_GROUP, self._POLICY_VERSION, "propagationpolicies", namespace
        )
        result = []
        for item in items:
            meta = item.get("metadata", {})
            spec = item.get("spec", {})
            placement = spec.get("placement", {})
            cluster_names = (
                placement.get("clusterAffinity", {}).get("clusterNames", [])
                or placement.get("clusterNames", [])
            )
            selectors = spec.get("resourceSelectors", [])
            result.append({
                "name": meta.get("name", "unknown"),
                "namespace": meta.get("namespace", "default"),
                "targetClusters": cluster_names,
                "resourceSelectors": [
                    {"apiVersion": s.get("apiVersion", ""), "kind": s.get("kind", ""), "name": s.get("name", "")}
                    for s in selectors
                ],
                "placementType": "ClusterAffinity" if placement.get("clusterAffinity") else "TargetClusters",
            })
        return result

    def list_cluster_propagation_policies(self) -> list[dict[str, Any]]:
        """Return ClusterPropagationPolicies (cluster-scoped)."""
        items = self._safe_list_cluster_custom_object(
            self._POLICY_GROUP, self._POLICY_VERSION, "clusterpropagationpolicies"
        )
        result = []
        for item in items:
            meta = item.get("metadata", {})
            spec = item.get("spec", {})
            placement = spec.get("placement", {})
            cluster_names = (
                placement.get("clusterAffinity", {}).get("clusterNames", [])
                or placement.get("clusterNames", [])
            )
            selectors = spec.get("resourceSelectors", [])
            result.append({
                "name": meta.get("name", "unknown"),
                "targetClusters": cluster_names,
                "resourceSelectors": [s.get("kind", "") for s in selectors],
                "placementType": "ClusterAffinity" if placement.get("clusterAffinity") else "TargetClusters",
            })
        return result

    def list_resource_bindings(self, namespace: str = "") -> list[dict[str, Any]]:
        """
        Return ResourceBindings showing scheduler output per namespace.
        Pass namespace="" to list across all namespaces.
        """
        items = self._safe_list_namespaced_custom_object(
            self._WORK_GROUP, self._WORK_VERSION, "resourcebindings", namespace
        )
        result = []
        for item in items:
            meta = item.get("metadata", {})
            spec = item.get("spec", {})
            status = item.get("status", {})
            res = spec.get("resource", {})
            conditions = status.get("conditions", [])
            scheduled = next(
                (c["status"] == "True" for c in conditions if c.get("type") == "Scheduled"),
                False,
            )
            clusters = [
                agg.get("clusterName", "unknown")
                for agg in status.get("aggregatedStatus", [])
            ]
            result.append({
                "name": meta.get("name", "unknown"),
                "namespace": meta.get("namespace", "default"),
                "resource": f"{res.get('kind', 'Resource')}/{res.get('name', meta.get('name', 'unknown'))}",
                "schedulerName": spec.get("schedulerName", "default-scheduler"),
                "phase": "Scheduled" if scheduled else "Pending",
                "clusters": clusters,
            })
        return result

    def collect_all(self) -> dict[str, Any]:
        """
        Collect all Karmada data in one call.
        Returns an empty-safe dict even when Karmada is unreachable.
        """
        reachable = self.is_reachable()
        if not reachable:
            logger.info("Karmada is not reachable; returning empty data")
            return {
                "reachable": False,
                "clusters": [],
                "propagationPolicies": [],
                "clusterPropagationPolicies": [],
                "resourceBindings": [],
            }
        return {
            "reachable": True,
            "clusters": self.list_member_clusters(),
            "propagationPolicies": self.list_propagation_policies(),
            "clusterPropagationPolicies": self.list_cluster_propagation_policies(),
            "resourceBindings": self.list_resource_bindings(),
        }


# ── Module-level singleton (lazy, safe to import always) ─────────────────────

_collector: KarmadaCollector | None = None


def get_karmada_collector() -> KarmadaCollector:
    global _collector
    if _collector is None:
        _collector = KarmadaCollector()
    return _collector
