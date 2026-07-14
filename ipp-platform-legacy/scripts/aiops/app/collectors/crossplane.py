"""Crossplane signal collector via Kubernetes API."""
from __future__ import annotations
import asyncio
import logging
from typing import Any, Dict, List, Optional

from ..models import CrossplaneSignals

logger = logging.getLogger("aiops.collectors.crossplane")


def _k8s_custom():
    from kubernetes import client, config as k8s_config
    try:
        k8s_config.load_incluster_config()
    except Exception:
        try:
            k8s_config.load_kube_config()
        except Exception:
            return None
    return client.CustomObjectsApi()


def _list_crossplane_resources(custom_api) -> tuple[list, list, list, list]:
    """Returns (providers, compositions, composite_resources, not_ready)."""
    providers = []
    compositions = []
    composite_resources = []
    not_ready = []

    # Providers
    try:
        items = custom_api.list_cluster_custom_object(
            "pkg.crossplane.io", "v1", "providers"
        ).get("items", [])
        for p in items:
            name = p.get("metadata", {}).get("name", "unknown")
            conditions = p.get("status", {}).get("conditions", [])
            ready = next((c["status"] for c in conditions if c.get("type") == "Healthy"), "Unknown")
            providers.append({"name": name, "healthy": ready == "True"})
            if ready != "True":
                not_ready.append(f"provider/{name}")
    except Exception as exc:
        logger.debug("Crossplane providers unavailable: %s", exc)

    # Compositions
    try:
        items = custom_api.list_cluster_custom_object(
            "apiextensions.crossplane.io", "v1", "compositions"
        ).get("items", [])
        for c in items:
            compositions.append({
                "name": c.get("metadata", {}).get("name", "unknown"),
                "xrd": c.get("spec", {}).get("compositeTypeRef", {}).get("kind", ""),
            })
    except Exception as exc:
        logger.debug("Crossplane compositions unavailable: %s", exc)

    # XRDs (to enumerate composite resources)
    try:
        xrds = custom_api.list_cluster_custom_object(
            "apiextensions.crossplane.io", "v1", "compositeresourcedefinitions"
        ).get("items", [])
        for xrd in xrds:
            group = xrd.get("spec", {}).get("group", "")
            kind = xrd.get("spec", {}).get("names", {}).get("kind", "")
            plural = xrd.get("spec", {}).get("names", {}).get("plural", "")
            if not (group and plural):
                continue
            try:
                xrs = custom_api.list_cluster_custom_object(group, "v1alpha1", plural).get("items", [])
                for xr in xrs:
                    xr_name = xr.get("metadata", {}).get("name", "unknown")
                    conditions = xr.get("status", {}).get("conditions", [])
                    ready = next((c["status"] for c in conditions if c.get("type") == "Ready"), "Unknown")
                    composite_resources.append({
                        "name": xr_name,
                        "kind": kind,
                        "ready": ready,
                    })
                    if ready != "True":
                        not_ready.append(f"{kind}/{xr_name}")
            except Exception:
                pass
    except Exception as exc:
        logger.debug("Crossplane composite resources unavailable: %s", exc)

    return providers, compositions, composite_resources, not_ready


class CrossplaneCollector:

    async def collect(self, namespace: Optional[str] = None) -> CrossplaneSignals:
        try:
            custom_api = await asyncio.get_event_loop().run_in_executor(None, _k8s_custom)
            if custom_api is None:
                return CrossplaneSignals(available=False)

            providers, compositions, composite_resources, not_ready = await asyncio.get_event_loop().run_in_executor(
                None, _list_crossplane_resources, custom_api
            )

            return CrossplaneSignals(
                providers=providers,
                compositions=compositions,
                composite_resources=composite_resources,
                not_ready=not_ready,
                available=True,
            )
        except Exception as exc:
            logger.debug("Crossplane collector failed: %s", exc)
            return CrossplaneSignals(available=False)
