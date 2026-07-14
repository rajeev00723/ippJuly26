"""
Kubernetes signal collector.
Uses the in-cluster service account when running in Kubernetes,
or ~/.kube/config when running locally.
All calls are wrapped to never raise — returns empty data on failure.
"""
from __future__ import annotations
import asyncio
import logging
from typing import Any, Dict, List

from ..models import KubernetesSignals

logger = logging.getLogger("aiops.collectors.kubernetes")


def _k8s_client():
    """Lazy-import and configure the kubernetes client."""
    from kubernetes import client, config as k8s_config
    try:
        k8s_config.load_incluster_config()
    except Exception:
        try:
            k8s_config.load_kube_config()
        except Exception:
            return None, None
    return client.CoreV1Api(), client.AppsV1Api()


async def _run(fn, *args, **kwargs):
    """Run a synchronous kubernetes API call in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: fn(*args, **kwargs))


class KubernetesCollector:

    async def collect(self, namespace: str | None = None) -> KubernetesSignals:
        try:
            core_v1, apps_v1 = await asyncio.get_event_loop().run_in_executor(
                None, _k8s_client
            )
            if core_v1 is None:
                logger.debug("Kubernetes client unavailable")
                return KubernetesSignals(available=False)

            pods_raw, deps_raw, events_raw = await asyncio.gather(
                _run(self._list_pods, core_v1, namespace),
                _run(self._list_deployments, apps_v1, namespace),
                _run(self._list_events, core_v1, namespace),
                return_exceptions=True,
            )

            pods = pods_raw if isinstance(pods_raw, list) else []
            deployments = deps_raw if isinstance(deps_raw, list) else []
            events = events_raw if isinstance(events_raw, list) else []

            crashloop_pods = [
                p["name"] for p in pods
                if p.get("reason") == "CrashLoopBackOff"
            ]
            pending_pods = [
                p["name"] for p in pods if p.get("phase") == "Pending"
            ]
            high_restart_pods = [
                {"pod": p["name"], "namespace": p["namespace"], "restarts": p.get("restarts", 0)}
                for p in pods
                if p.get("restarts", 0) > 5
            ]
            namespaces = list({p["namespace"] for p in pods if p.get("namespace")})

            return KubernetesSignals(
                pods=pods,
                deployments=deployments,
                events=events,
                namespaces=namespaces,
                crashloop_pods=crashloop_pods,
                pending_pods=pending_pods,
                high_restart_pods=high_restart_pods,
                available=True,
            )
        except Exception as exc:
            logger.warning("Kubernetes collector failed: %s", exc)
            return KubernetesSignals(available=False)

    def _list_pods(self, core_v1, namespace: str | None) -> List[Dict[str, Any]]:
        from kubernetes.client.exceptions import ApiException
        try:
            if namespace:
                items = core_v1.list_namespaced_pod(namespace, limit=500).items
            else:
                items = core_v1.list_pod_for_all_namespaces(limit=500).items

            result = []
            for pod in items:
                restarts = 0
                reason = None
                if pod.status and pod.status.container_statuses:
                    for cs in pod.status.container_statuses:
                        restarts += cs.restart_count or 0
                        if cs.state and cs.state.waiting:
                            reason = cs.state.waiting.reason
                result.append({
                    "name": pod.metadata.name,
                    "namespace": pod.metadata.namespace,
                    "phase": pod.status.phase if pod.status else "Unknown",
                    "reason": reason,
                    "restarts": restarts,
                    "labels": pod.metadata.labels or {},
                })
            return result
        except ApiException as exc:
            logger.debug("Pod list failed: %s", exc)
            return []

    def _list_deployments(self, apps_v1, namespace: str | None) -> List[Dict[str, Any]]:
        from kubernetes.client.exceptions import ApiException
        try:
            if namespace:
                items = apps_v1.list_namespaced_deployment(namespace, limit=200).items
            else:
                items = apps_v1.list_deployment_for_all_namespaces(limit=200).items

            result = []
            for dep in items:
                status = dep.status or {}
                result.append({
                    "name": dep.metadata.name,
                    "namespace": dep.metadata.namespace,
                    "replicas": status.replicas or 0,
                    "availableReplicas": status.available_replicas or 0,
                    "unavailableReplicas": status.unavailable_replicas or 0,
                    "readyReplicas": status.ready_replicas or 0,
                })
            return result
        except ApiException as exc:
            logger.debug("Deployment list failed: %s", exc)
            return []

    def _list_events(self, core_v1, namespace: str | None) -> List[Dict[str, Any]]:
        from kubernetes.client.exceptions import ApiException
        try:
            if namespace:
                items = core_v1.list_namespaced_event(namespace, limit=100).items
            else:
                items = core_v1.list_event_for_all_namespaces(limit=100).items

            result = []
            for ev in items[-50:]:   # last 50 events
                result.append({
                    "type": ev.type,
                    "reason": ev.reason,
                    "message": ev.message,
                    "namespace": ev.metadata.namespace,
                    "object": f"{ev.involved_object.kind}/{ev.involved_object.name}",
                    "count": ev.count or 1,
                })
            return result
        except ApiException as exc:
            logger.debug("Event list failed: %s", exc)
            return []
