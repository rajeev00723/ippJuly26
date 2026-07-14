"""Argo CD signal collector."""
from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional

import httpx

from ..config import get_settings
from ..models import ArgoCDSignals

logger = logging.getLogger("aiops.collectors.argocd")


class ArgoCDCollector:

    def __init__(self) -> None:
        cfg = get_settings()
        self._url = cfg.argocd_url
        self._timeout = cfg.http_timeout
        token = cfg.argocd_auth_token.strip()
        self._headers = {"Authorization": f"Bearer {token}"} if token else {}

    async def collect(self, namespace: Optional[str] = None) -> ArgoCDSignals:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(
                    f"{self._url}/api/v1/applications",
                    headers=self._headers,
                )
                resp.raise_for_status()
                items = resp.json().get("items") or []

                applications: List[Dict[str, Any]] = []
                out_of_sync: List[str] = []
                degraded: List[str] = []

                for app in items:
                    name = app.get("metadata", {}).get("name", "unknown")
                    sync_status = app.get("status", {}).get("sync", {}).get("status", "Unknown")
                    health_status = app.get("status", {}).get("health", {}).get("status", "Unknown")
                    dest_ns = app.get("spec", {}).get("destination", {}).get("namespace", "")

                    # Filter by namespace if requested
                    if namespace and dest_ns and namespace not in dest_ns:
                        continue

                    applications.append({
                        "name": name,
                        "syncStatus": sync_status,
                        "healthStatus": health_status,
                        "project": app.get("spec", {}).get("project", "default"),
                        "destNamespace": dest_ns,
                    })

                    if sync_status == "OutOfSync":
                        out_of_sync.append(name)
                    if health_status == "Degraded":
                        degraded.append(name)

                return ArgoCDSignals(
                    applications=applications,
                    out_of_sync=out_of_sync,
                    degraded=degraded,
                    available=True,
                )
        except Exception as exc:
            logger.debug("Argo CD collector failed: %s", exc)
            return ArgoCDSignals(available=False)
