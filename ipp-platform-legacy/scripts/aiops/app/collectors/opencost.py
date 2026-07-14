"""OpenCost signal collector."""
from __future__ import annotations
import logging
from typing import Any, Dict, List, Optional

import httpx

from ..config import get_settings
from ..models import OpenCostSignals

logger = logging.getLogger("aiops.collectors.opencost")


class OpenCostCollector:

    def __init__(self) -> None:
        cfg = get_settings()
        self._url = cfg.opencost_url
        self._timeout = cfg.http_timeout

    async def collect(self, namespace: Optional[str] = None) -> OpenCostSignals:
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                params = {
                    "window": "1d",
                    "aggregate": "namespace",
                    "includeIdle": "false",
                }
                if namespace:
                    params["filter"] = f'namespace:"{namespace}"'

                resp = await client.get(f"{self._url}/model/allocation", params=params)
                resp.raise_for_status()
                data = resp.json()

                allocations = data.get("data", [{}])[0] if data.get("data") else {}
                ns_costs: Dict[str, Any] = {}
                total = 0.0

                for ns_name, alloc in allocations.items():
                    cost = alloc.get("totalCost", 0.0)
                    ns_costs[ns_name] = {
                        "totalCost": cost,
                        "cpuCost": alloc.get("cpuCost", 0.0),
                        "memoryCost": alloc.get("memoryCost", 0.0),
                        "cpuEfficiency": alloc.get("cpuEfficiency", 1.0),
                        "memoryEfficiency": alloc.get("memoryEfficiency", 1.0),
                    }
                    total += cost

                # Also fetch workload-level data
                workload_params = dict(params)
                workload_params["aggregate"] = "controller"
                resp2 = await client.get(f"{self._url}/model/allocation", params=workload_params)
                workload_data = []
                if resp2.status_code == 200:
                    wl_alloc = resp2.json().get("data", [{}])[0] if resp2.json().get("data") else {}
                    for wl_name, wl in wl_alloc.items():
                        workload_data.append({
                            "name": wl_name,
                            "totalCost": wl.get("totalCost", 0.0),
                            "cpuEfficiency": wl.get("cpuEfficiency", 1.0),
                            "memoryEfficiency": wl.get("memoryEfficiency", 1.0),
                        })

                return OpenCostSignals(
                    namespace_costs=ns_costs,
                    workload_costs=workload_data,
                    total_monthly_estimate=total * 30,
                    available=True,
                )
        except Exception as exc:
            logger.debug("OpenCost unavailable: %s", exc)
            return OpenCostSignals(available=False)
