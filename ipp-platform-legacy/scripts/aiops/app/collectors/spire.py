"""SPIRE signal collector."""
from __future__ import annotations
import asyncio
import logging
from typing import Any, Dict, List, Optional

from ..models import SpireSignals

logger = logging.getLogger("aiops.collectors.spire")

# Named ClusterSPIFFEIDs that the platform team explicitly manages.
# A gap is detected when the named policy is absent (deleted/misconfigured),
# regardless of catch-all ClusterSPIFFEIDs that auto-register running pods.
EXPECTED_CLUSTER_SPIFFE_IDS = [
    "employee-portal-frontend",
    "employee-portal-backend",
    "backstage-backstage",
    "platform-aiops-engine",
]


def _fetch_cluster_spiffe_ids() -> List[str]:
    """Return names of existing ClusterSPIFFEID resources."""
    try:
        from kubernetes import client, config as k8s_config
        try:
            k8s_config.load_incluster_config()
        except Exception:
            k8s_config.load_kube_config()
        custom = client.CustomObjectsApi()
        items = custom.list_cluster_custom_object(
            "spire.spiffe.io", "v1alpha1", "clusterspiffeids"
        ).get("items", [])
        return [i.get("metadata", {}).get("name", "") for i in items]
    except Exception as exc:
        logger.debug("ClusterSPIFFEID list failed: %s", exc)
        return []


def _fetch_spire_entries() -> List[Dict[str, Any]]:
    """Fetch SPIRE registration entries via kubernetes SPIRE server pod."""
    entries = []
    try:
        from kubernetes import client, config as k8s_config, stream
        try:
            k8s_config.load_incluster_config()
        except Exception:
            k8s_config.load_kube_config()

        core_v1 = client.CoreV1Api()
        pods = core_v1.list_namespaced_pod(
            "spire",
            label_selector="app.kubernetes.io/name=server,app.kubernetes.io/instance=spire"
        ).items
        if not pods:
            return entries

        pod_name = pods[0].metadata.name
        exec_resp = stream.stream(
            core_v1.connect_get_namespaced_pod_exec,
            pod_name,
            "spire",
            container="spire-server",
            command=["/opt/spire/bin/spire-server", "entry", "show", "-output", "json"],
            stderr=True, stdin=False, stdout=True, tty=False,
            _preload_content=False,
        )
        output = ""
        while exec_resp.is_open():
            exec_resp.update(timeout=5)
            if exec_resp.peek_stdout():
                output += exec_resp.read_stdout()
            if exec_resp.peek_stderr():
                exec_resp.read_stderr()
        exec_resp.close()

        import json
        data = json.loads(output) if output.strip() else {}
        for entry in data.get("entries", []):
            raw = entry.get("spiffe_id", {})
            trust_domain = raw.get("trust_domain", "idp-demo.local")
            path = raw.get("path", "")
            entries.append({
                "spiffe_id": f"spiffe://{trust_domain}{path}",
                "selectors": entry.get("selectors", []),
            })
    except Exception as exc:
        logger.debug("SPIRE entry fetch failed: %s", exc)
    return entries


class SpireCollector:

    async def collect(self, namespace: Optional[str] = None) -> SpireSignals:
        try:
            existing_cids, entries = await asyncio.gather(
                asyncio.get_event_loop().run_in_executor(None, _fetch_cluster_spiffe_ids),
                asyncio.get_event_loop().run_in_executor(None, _fetch_spire_entries),
            )

            # Detect gaps: named ClusterSPIFFEIDs that should exist but don't
            workloads_without_identity: List[str] = []
            for expected in EXPECTED_CLUSTER_SPIFFE_IDS:
                if expected not in existing_cids:
                    # Convert "employee-portal-frontend" → "employee-portal/frontend"
                    parts = expected.rsplit("-", 1)
                    label = f"{parts[0]}/{parts[1]}" if len(parts) == 2 else expected
                    workloads_without_identity.append(label)

            return SpireSignals(
                entries=entries,
                workloads_without_identity=workloads_without_identity,
                available=True,
            )
        except Exception as exc:
            logger.debug("SPIRE collector failed: %s", exc)
            return SpireSignals(available=False)
