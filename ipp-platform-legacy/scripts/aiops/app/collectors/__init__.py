"""Signal collectors package."""
from .kubernetes import KubernetesCollector
from .prometheus import PrometheusCollector
from .opencost import OpenCostCollector
from .argocd import ArgoCDCollector
from .crossplane import CrossplaneCollector
from .hubble import HubbleCollector
from .gatekeeper import GatekeeperCollector
from .kyverno import KyvernoCollector
from .spire import SpireCollector
from .knative import KnativeCollector

__all__ = [
    "KubernetesCollector",
    "PrometheusCollector",
    "OpenCostCollector",
    "ArgoCDCollector",
    "CrossplaneCollector",
    "HubbleCollector",
    "GatekeeperCollector",
    "KyvernoCollector",
    "SpireCollector",
    "KnativeCollector",
]
