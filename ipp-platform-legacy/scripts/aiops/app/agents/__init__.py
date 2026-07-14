"""Worker agents package."""
from .capacity_sre import CapacitySREAgent
from .finops import FinOpsAgent
from .incident_prevention_remediation import IncidentPreventionRemediationAgent
from .deployment_health_doctor import DeploymentHealthDoctorAgent
from .secure_shield import SecureShieldAgent

__all__ = [
    "CapacitySREAgent",
    "FinOpsAgent",
    "IncidentPreventionRemediationAgent",
    "DeploymentHealthDoctorAgent",
    "SecureShieldAgent",
]

AGENT_REGISTRY = {
    "capacity_sre": CapacitySREAgent,
    "finops": FinOpsAgent,
    "incident_prevention_remediation": IncidentPreventionRemediationAgent,
    "deployment_health_doctor": DeploymentHealthDoctorAgent,
    "secure_shield": SecureShieldAgent,
}
