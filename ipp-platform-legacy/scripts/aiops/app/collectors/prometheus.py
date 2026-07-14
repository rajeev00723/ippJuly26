"""Prometheus signal collector."""
from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional

import httpx

from ..config import get_settings
from ..models import PrometheusSignals

logger = logging.getLogger("aiops.collectors.prometheus")


class PrometheusCollector:

    def __init__(self) -> None:
        cfg = get_settings()
        self._url = cfg.prometheus_url
        self._timeout = cfg.http_timeout

    async def _query(self, q: str) -> Optional[List[Dict[str, Any]]]:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(f"{self._url}/api/v1/query", params={"query": q})
                resp.raise_for_status()
                data = resp.json()
                if data.get("status") == "success":
                    return data["data"]["result"]
        except Exception as exc:
            logger.debug("Prometheus query failed (%s): %s", q[:40], exc)
        return None

    async def collect(self, namespace: Optional[str] = None) -> PrometheusSignals:
        ns_filter = '{namespace="' + namespace + '"}' if namespace else ""
        ns_label = ',namespace="' + namespace + '"' if namespace else ""

        mem_query = (
            "sum by (namespace, pod, container) ("
            "  container_memory_working_set_bytes{container!='',container!='POD'" + ns_label + "}"
            ") / sum by (namespace, pod, container) ("
            "  kube_pod_container_resource_limits{resource='memory',container!=''" + ns_label + "}"
            ") > 0.80"
        )
        cpu_query = (
            "sum by (namespace, pod, container) ("
            "  rate(container_cpu_usage_seconds_total{container!='',container!='POD'" + ns_label + "}[5m])"
            ") / sum by (namespace, pod, container) ("
            "  kube_pod_container_resource_limits{resource='cpu',container!=''" + ns_label + "}"
            ") > 0.80"
        )
        restart_query = (
            "sum by (namespace, pod, container) ("
            "  kube_pod_container_status_restarts_total" + ns_filter +
            ") > 5"
        )
        crash_query = (
            'kube_pod_container_status_waiting_reason{reason="CrashLoopBackOff"' + ns_label + "}"
        )

        mem_raw, cpu_raw, restart_raw, crash_raw = await _gather_safe(
            self._query(mem_query),
            self._query(cpu_query),
            self._query(restart_query),
            self._query(crash_query),
        )

        if all(r is None for r in (mem_raw, cpu_raw, restart_raw, crash_raw)):
            return PrometheusSignals(available=False)

        def _parse(results, extra_keys=None):
            out = []
            for item in (results or []):
                m = dict(item.get("metric", {}))
                m["value"] = float(item["value"][1]) if item.get("value") else 0.0
                if extra_keys:
                    m.update(extra_keys)
                out.append(m)
            return out

        return PrometheusSignals(
            memory_pressure=_parse(mem_raw),
            cpu_saturation=_parse(cpu_raw),
            pod_restarts=_parse(restart_raw),
            crashloop_containers=_parse(crash_raw),
            available=True,
        )


async def _gather_safe(*coros):
    import asyncio
    results = await asyncio.gather(*coros, return_exceptions=True)
    return [r if not isinstance(r, Exception) else None for r in results]
