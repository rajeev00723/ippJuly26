# IPP Claim Annotation Policy
# Enforced by Conftest in the IIP Service before committing to ipp-platform-claims.
# All five ipp.dhl.com/* annotations are mandatory on every claim submitted.
#
# Run locally before opening a PR:
#   conftest test <path-to-claim.yaml> --policy ipp-platform-policies/conftest/policy/
#
# Conftest version: >= 0.46.0
package ipp.claims

import rego.v1

# Required annotations on every IPP claim resource
required_annotations := {
    "ipp.dhl.com/request-id",
    "ipp.dhl.com/business-unit",
    "ipp.dhl.com/cost-center",
    "ipp.dhl.com/environment",
    "ipp.dhl.com/requested-by",
}

# Recognised IPP claim kinds
ipp_claim_kinds := {
    "IPPAppBoxClaim",
    "IPPClusterClaim",
    "IPPVirtualMachineClaim",
    "IPPDatabaseClaim",
    "IPPNetworkClaim",
    # legacy platform.iip.com kinds used by existing Backstage templates
    "VMAppClaim",
    "ThreeTierAppClaim",
    "KindClusterClaim",
    "AKSClusterClaim",
}

# ── Rules ────────────────────────────────────────────────────────────────────

# Only validate IPP claim resources — skip other YAML in the repo
is_ipp_claim if {
    input.kind in ipp_claim_kinds
}

# DENY: missing required annotations
deny contains msg if {
    is_ipp_claim
    provided := {k | input.metadata.annotations[k]}
    missing := required_annotations - provided
    count(missing) > 0
    msg := sprintf(
        "%s/%s is missing required annotations: %v. All ipp.dhl.com/* annotations must be present.",
        [input.kind, input.metadata.name, missing],
    )
}

# DENY: request-id must be non-empty
deny contains msg if {
    is_ipp_claim
    rid := input.metadata.annotations["ipp.dhl.com/request-id"]
    count(trim_space(rid)) == 0
    msg := sprintf(
        "%s/%s: ipp.dhl.com/request-id is present but empty. Set a valid request ID (e.g. IPP-REQ-DEMO-001).",
        [input.kind, input.metadata.name],
    )
}

# DENY: requested-by must look like an email address
deny contains msg if {
    is_ipp_claim
    email := input.metadata.annotations["ipp.dhl.com/requested-by"]
    not contains(email, "@")
    msg := sprintf(
        "%s/%s: ipp.dhl.com/requested-by '%v' does not look like an email address.",
        [input.kind, input.metadata.name, email],
    )
}

# DENY: environment annotation must match allowed values
deny contains msg if {
    is_ipp_claim
    env := input.metadata.annotations["ipp.dhl.com/environment"]
    not env in {"dev", "staging", "prod"}
    msg := sprintf(
        "%s/%s: ipp.dhl.com/environment '%v' is not valid. Must be one of: dev, staging, prod.",
        [input.kind, input.metadata.name, env],
    )
}

# DENY: file must not be placed in the wrong environment directory
deny contains msg if {
    is_ipp_claim
    env_annotation := input.metadata.annotations["ipp.dhl.com/environment"]
    path := input.__rego_input_files__[_]
    path_parts := split(path, "/")
    count(path_parts) >= 3
    path_env := path_parts[count(path_parts) - 3]
    path_env in {"dev", "staging", "prod"}
    path_env != env_annotation
    msg := sprintf(
        "%s/%s: annotation ipp.dhl.com/environment '%v' does not match directory environment '%v'.",
        [input.kind, input.metadata.name, env_annotation, path_env],
    )
}

# WARN: cost-center should follow CC-XXXX format (advisory only)
warn contains msg if {
    is_ipp_claim
    cc := input.metadata.annotations["ipp.dhl.com/cost-center"]
    not startswith(cc, "CC-")
    msg := sprintf(
        "%s/%s: ipp.dhl.com/cost-center '%v' does not follow the CC-XXXX convention. Verify with FinOps.",
        [input.kind, input.metadata.name, cc],
    )
}
