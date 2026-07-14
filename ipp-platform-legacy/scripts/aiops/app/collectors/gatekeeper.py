"""OPA Gatekeeper signal collector."""
from __future__ import annotations
import asyncio
import logging
from typing import Any, Dict, List, Optional

from ..models import PolicySignals

logger = logging.getLogger("aiops.collectors.gatekeeper")


def _fetch_violations() -> List[Dict[str, Any]]:
    """Enumerate constraint CRDs and collect violations."""
    violations: List[Dict[str, Any]] = []
    try:
        from kubernetes import client, config as k8s_config
        try:
            k8s_config.load_incluster_config()
        except Exception:
            k8s_config.load_kube_config()

        custom = client.CustomObjectsApi()

        # List all constraint templates to discover constraint kinds
        templates = custom.list_cluster_custom_object(
            "templates.gatekeeper.sh", "v1beta1", "constrainttemplates"
        ).get("items", [])

        for tmpl in templates:
            kind = tmpl.get("spec", {}).get("crd", {}).get("spec", {}).get("names", {}).get("kind", "")
            if not kind:
                continue
            plural = kind.lower() + "s"
            try:
                constraints = custom.list_cluster_custom_object(
                    "constraints.gatekeeper.sh", "v1beta1", plural
                ).get("items", [])
                for constraint in constraints:
                    c_name = constraint.get("metadata", {}).get("name", "unknown")
                    viol_list = constraint.get("status", {}).get("violations") or []
                    for v in viol_list[:5]:   # max 5 violations per constraint
                        violations.append({
                            "constraint": f"{kind}/{c_name}",
                            "resource": f"{v.get('kind', '')}/{v.get('name', '')}",
                            "namespace": v.get("namespace", ""),
                            "message": v.get("message", ""),
                        })
            except Exception:
                continue
    except Exception as exc:
        logger.debug("Gatekeeper collector failed: %s", exc)
    return violations


class GatekeeperCollector:

    async def collect(self, namespace: Optional[str] = None) -> PolicySignals:
        """Returns a partial PolicySignals with gatekeeper_violations populated."""
        try:
            violations = await asyncio.get_event_loop().run_in_executor(None, _fetch_violations)
            if namespace:
                violations = [v for v in violations if not v.get("namespace") or v.get("namespace") == namespace]
            return PolicySignals(gatekeeper_violations=violations, available=True)
        except Exception as exc:
            logger.debug("Gatekeeper collector error: %s", exc)
            return PolicySignals(available=False)
