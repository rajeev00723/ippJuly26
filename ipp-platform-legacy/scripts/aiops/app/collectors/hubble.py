"""
Hubble signal collector.

Gets real denied/dropped network flows by exec-ing `hubble observe` inside
a cilium-agent pod (the only reliable way from a KIND/in-cluster context
where the Hubble relay speaks gRPC, not HTTP).

Falls back to listing CiliumNetworkPolicies when exec is unavailable.
"""
from __future__ import annotations
import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from ..models import HubbleSignals

logger = logging.getLogger("aiops.collectors.hubble")

# How many flows to fetch — enough for meaningful analysis without overload
_FLOW_LIMIT = 100


class HubbleCollector:

    async def collect(self, namespace: Optional[str] = None) -> HubbleSignals:
        denied_flows, allowed_sample = await asyncio.gather(
            self._fetch_denied_flows(namespace),
            self._fetch_allowed_sample(namespace),
        )
        network_policies = await self._fetch_cilium_policies(namespace)

        # Compute a simple deny-rate metric for the LLM
        total_sampled = len(denied_flows) + len(allowed_sample)
        deny_rate = round(len(denied_flows) / total_sampled, 3) if total_sampled else 0.0

        return HubbleSignals(
            denied_flows=denied_flows,
            network_policies=network_policies,
            available=bool(denied_flows is not None),
            # Extra context we pass as custom metadata
            extra={
                "deny_rate_sample": deny_rate,
                "allowed_sample_count": len(allowed_sample),
                "denied_count": len(denied_flows),
                "policy_count": len(network_policies),
            },
        )

    # ── internal helpers ──────────────────────────────────────────────────────

    # IPv6 multicast / link-local prefixes that are expected-denied and generate noise
    _MULTICAST_PREFIXES = ("ff02::", "ff01::", "ff00::", "fe80::", "224.", "239.")

    def _is_noise_flow(self, flow: Dict[str, Any]) -> bool:
        """Return True for expected-denied flows that have no security significance."""
        dst = flow.get("destination", "")
        for prefix in self._MULTICAST_PREFIXES:
            if prefix in dst:
                return True
        # Also filter kube-system to kube-system health probes
        src_ns = flow.get("source_namespace", "")
        dst_ns = flow.get("destination_namespace", "")
        if src_ns == dst_ns == "kube-system":
            return True
        return False

    async def _fetch_denied_flows(self, namespace: Optional[str]) -> List[Dict[str, Any]]:
        """Run hubble observe inside a cilium-agent pod and parse NDJSON."""
        try:
            cmd = await self._hubble_cmd(namespace, verdict="DROPPED")
            raw = await self._exec_in_cilium(cmd)
            flows = self._parse_flows(raw)
            return [f for f in flows if not self._is_noise_flow(f)]
        except Exception as exc:
            logger.debug("Denied flow fetch failed: %s", exc)
            return []

    async def _fetch_allowed_sample(self, namespace: Optional[str]) -> List[Dict[str, Any]]:
        """Small sample of allowed flows to compute deny-rate."""
        try:
            cmd = await self._hubble_cmd(namespace, verdict="FORWARDED", limit=20)
            raw = await self._exec_in_cilium(cmd)
            return self._parse_flows(raw)
        except Exception as exc:
            logger.debug("Allowed flow fetch failed: %s", exc)
            return []

    async def _hubble_cmd(self, namespace: Optional[str], verdict: str, limit: int = _FLOW_LIMIT) -> str:
        ns_flag = f"--namespace {namespace}" if namespace else ""
        return (
            f"hubble observe --verdict {verdict} --last {limit} "
            f"{ns_flag} --output json"
        )

    async def _exec_in_cilium(self, cmd: str) -> str:
        """
        kubectl exec into the first cilium-agent pod and run `cmd`.
        Returns stdout as a string.
        """
        def _find_cilium_pod() -> str:
            from kubernetes import client, config as k8s_config
            try:
                k8s_config.load_incluster_config()
            except Exception:
                k8s_config.load_kube_config()
            v1 = client.CoreV1Api()
            pods = v1.list_namespaced_pod(
                "kube-system",
                label_selector="k8s-app=cilium",
                field_selector="status.phase=Running",
            )
            if not pods.items:
                raise RuntimeError("No running cilium-agent pods found")
            return pods.items[0].metadata.name

        def _do_exec(pod_name: str) -> str:
            from kubernetes import client, config as k8s_config
            from kubernetes.stream import stream
            try:
                k8s_config.load_incluster_config()
            except Exception:
                k8s_config.load_kube_config()
            v1 = client.CoreV1Api()
            resp = stream(
                v1.connect_get_namespaced_pod_exec,
                pod_name,
                "kube-system",
                container="cilium-agent",
                command=cmd.split(),
                stderr=False,
                stdin=False,
                stdout=True,
                tty=False,
            )
            return resp

        loop = asyncio.get_event_loop()
        pod_name = await loop.run_in_executor(None, _find_cilium_pod)
        return await loop.run_in_executor(None, _do_exec, pod_name)

    def _parse_flows(self, raw: str) -> List[Dict[str, Any]]:
        """Parse NDJSON from hubble observe --output json."""
        results = []
        for line in raw.splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                flow = obj.get("flow", obj)  # some versions wrap in {"flow": ...}

                src = flow.get("source", {})
                dst = flow.get("destination", {})
                l4 = flow.get("l4", {})
                ip = flow.get("IP", flow.get("ip", {}))

                # Extract readable workload names from labels
                src_wl = self._workload_from_labels(src.get("labels", []))
                dst_wl = self._workload_from_labels(dst.get("labels", []))
                src_ns = src.get("namespace", "")
                dst_ns = dst.get("namespace", "")

                # Get port from L4 info
                port = self._extract_port(l4)

                results.append({
                    "source": f"{src_ns}/{src_wl}" if src_ns else src_wl or ip.get("source", "unknown"),
                    "source_namespace": src_ns,
                    "source_workload": src_wl,
                    "destination": f"{dst_ns}/{dst_wl}" if dst_ns else dst_wl or ip.get("destination", "unknown"),
                    "destination_namespace": dst_ns,
                    "destination_workload": dst_wl,
                    "port": port,
                    "protocol": next(iter(l4.keys()), "unknown"),
                    "verdict": flow.get("verdict", "DROPPED"),
                    "drop_reason": flow.get("drop_reason_desc", flow.get("Summary", "")),
                    "direction": flow.get("traffic_direction", ""),
                    "node": flow.get("node_name", ""),
                    "time": flow.get("time", ""),
                })
            except (json.JSONDecodeError, KeyError, TypeError) as exc:
                logger.debug("Skipping unparseable flow line: %s — %s", line[:60], exc)
        return results

    def _workload_from_labels(self, labels: List[str]) -> str:
        """Extract a meaningful workload name from Cilium label list."""
        for label in labels:
            for prefix in ("k8s:app=", "k8s:app.kubernetes.io/name=", "k8s:io.kubernetes.pod.namespace="):
                if label.startswith(prefix):
                    return label[len(prefix):]
        for label in labels:
            if label.startswith("k8s:") and "=" in label:
                k, v = label[4:].split("=", 1)
                if k not in ("io.cilium.k8s", "io.kubernetes") and len(v) < 40:
                    return v
        return ""

    def _extract_port(self, l4: dict) -> str:
        for proto in ("TCP", "UDP"):
            if proto in l4:
                return str(l4[proto].get("destination_port", "?"))
        return "?"

    async def _fetch_cilium_policies(self, namespace: Optional[str]) -> List[Dict[str, Any]]:
        """Fetch CiliumNetworkPolicies from the Kubernetes API."""
        try:
            def _do():
                from kubernetes import client, config as k8s_config
                try:
                    k8s_config.load_incluster_config()
                except Exception:
                    k8s_config.load_kube_config()
                custom = client.CustomObjectsApi()
                if namespace:
                    items = custom.list_namespaced_custom_object(
                        "cilium.io", "v2", namespace, "ciliumnetworkpolicies"
                    ).get("items", [])
                else:
                    items = custom.list_cluster_custom_object(
                        "cilium.io", "v2", "ciliumnetworkpolicies"
                    ).get("items", [])
                return [
                    {
                        "name": p.get("metadata", {}).get("name", "unknown"),
                        "namespace": p.get("metadata", {}).get("namespace", ""),
                        "spec_summary": str(p.get("spec", {}))[:200],
                    }
                    for p in items
                ]
            return await asyncio.get_event_loop().run_in_executor(None, _do)
        except Exception as exc:
            logger.debug("CiliumNetworkPolicy fetch failed: %s", exc)
            return []
