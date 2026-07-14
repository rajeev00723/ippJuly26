"""Kyverno signal collector."""
from __future__ import annotations
import asyncio
import logging
from typing import Any, Dict, List, Optional

from ..models import PolicySignals

logger = logging.getLogger("aiops.collectors.kyverno")


def _fetch_policy_reports(namespace: Optional[str]) -> List[Dict[str, Any]]:
    violations: List[Dict[str, Any]] = []
    try:
        from kubernetes import client, config as k8s_config
        try:
            k8s_config.load_incluster_config()
        except Exception:
            k8s_config.load_kube_config()

        custom = client.CustomObjectsApi()

        if namespace:
            reports = custom.list_namespaced_custom_object(
                "wgpolicyk8s.io", "v1alpha2", namespace, "policyreports"
            ).get("items", [])
        else:
            reports = custom.list_cluster_custom_object(
                "wgpolicyk8s.io", "v1alpha2", "policyreports"
            ).get("items", []) + custom.list_cluster_custom_object(
                "wgpolicyk8s.io", "v1alpha2", "clusterpolicyreports"
            ).get("items", [])

        for report in reports:
            ns = report.get("metadata", {}).get("namespace", "")
            for result in report.get("results") or []:
                if result.get("result") in ("fail", "error"):
                    resource = result.get("resources", [{}])[0] if result.get("resources") else {}
                    violations.append({
                        "policy": result.get("policy", "unknown"),
                        "rule": result.get("rule", ""),
                        "resource": f"{resource.get('kind', '')}/{resource.get('name', '')}",
                        "namespace": resource.get("namespace", ns),
                        "message": result.get("message", ""),
                        "severity": result.get("severity", "medium"),
                    })
    except Exception as exc:
        logger.debug("Kyverno collector failed: %s", exc)
    return violations


class KyvernoCollector:

    async def collect(self, namespace: Optional[str] = None) -> PolicySignals:
        try:
            violations = await asyncio.get_event_loop().run_in_executor(
                None, _fetch_policy_reports, namespace
            )
            return PolicySignals(kyverno_violations=violations, available=bool(violations is not None))
        except Exception as exc:
            logger.debug("Kyverno collector error: %s", exc)
            return PolicySignals(available=False)
