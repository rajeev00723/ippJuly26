"""
Unit tests for IIP's pure server-side logic: claim path derivation, manifest
enrichment, and brownfield descriptor validation. No network/git calls — the
Gitea/ArgoCD-facing functions (commit_file, gitea(), etc.) are exercised only
via the live-cluster verification in the wave commits, not here.
"""
import main


def make_request(**overrides):
    defaults = dict(
        manifest={"kind": "VMAppClaim", "metadata": {"name": "my-app"},
                   "spec": {"parameters": {"owner": {"team": "platform-eng"}}}},
        requestedBy="dev@ipp.local",
        costCenter="demo-001",
        requestId="REQ-TEST-1",
        businessUnit="bu-demo",
        environment="dev",
    )
    defaults.update(overrides)
    return main.ProvisionRequest(**defaults)


# ── claim_path ────────────────────────────────────────────────────────────

def test_claim_path_kubevirt_vm():
    assert main.claim_path("VMAppClaim", "my-app", "dev", "bu-demo") == \
        "vms/dev/bu-demo/claim-my-app.yaml"


def test_claim_path_local_cluster():
    assert main.claim_path("KindClusterClaim", "my-cluster", "staging", "platform-eng") == \
        "clusters/staging/platform-eng/claim-my-cluster.yaml"


def test_claim_path_aks():
    assert main.claim_path("AKSClusterClaim", "my-aks", "prod", "platform-eng") == \
        "clusters/prod/platform-eng/claim-my-aks.yaml"


def test_claim_path_slugifies_underscores():
    assert main.claim_path("VMAppClaim", "My_App", "dev", "bu-demo") == \
        "vms/dev/bu-demo/claim-my-app.yaml"


def test_claim_path_unknown_kind_falls_back_to_appbox():
    assert main.claim_path("SomeUnknownClaim", "x", "dev", "bu-demo") == \
        "appbox/dev/bu-demo/claim-x.yaml"


# ── enrich_manifest ───────────────────────────────────────────────────────

def test_enrich_manifest_adds_required_annotations():
    req = make_request()
    enriched = main.enrich_manifest(req.manifest, req)
    ann = enriched["metadata"]["annotations"]
    assert ann["ipp.dhl.com/business-unit"] == "bu-demo"
    assert ann["ipp.dhl.com/cost-center"] == "demo-001"
    assert ann["ipp.dhl.com/environment"] == "dev"
    assert ann["ipp.dhl.com/requested-by"] == "dev@ipp.local"
    assert ann["ipp.dhl.com/request-id"] == "REQ-TEST-1"


def test_enrich_manifest_derives_owner_from_spec_parameters():
    req = make_request()
    enriched = main.enrich_manifest(req.manifest, req)
    assert enriched["metadata"]["labels"]["owner"] == "platform-eng"


def test_enrich_manifest_falls_back_to_business_unit_for_owner():
    req = make_request(manifest={"kind": "KindClusterClaim", "metadata": {"name": "c"}, "spec": {"parameters": {}}})
    enriched = main.enrich_manifest(req.manifest, req)
    assert enriched["metadata"]["labels"]["owner"] == "bu-demo"


def test_enrich_manifest_does_not_mutate_input():
    req = make_request()
    original = dict(req.manifest)
    main.enrich_manifest(req.manifest, req)
    assert req.manifest.get("metadata", {}).get("annotations") is None or \
        original["metadata"] == req.manifest["metadata"]


# ── brownfield descriptor validation (O5) ───────────────────────────────────

VALID_DESCRIPTOR_KUBEVIRT = """
apiVersion: platform.demo/v1
kind: InfraRequest
metadata:
  name: legacy-app
  team: platform-eng
  environment: development
  repository: https://github.com/acme/legacy-app
spec:
  appType: brownfield
  infra:
    type: vm
    target: kubevirt-vm
    size: M
"""

VALID_DESCRIPTOR_AKS = """
apiVersion: platform.demo/v1
kind: InfraRequest
metadata:
  name: cloud-app
  team: platform-eng
  environment: production
  repository: https://github.com/acme/cloud-app
spec:
  appType: greenfield
  infra:
    type: kubernetes
    target: aks
    size: L
    azureRegion: eastus
"""

VALID_DESCRIPTOR_LOCAL_CLUSTER = """
apiVersion: platform.demo/v1
kind: InfraRequest
metadata:
  name: internal-tool
  team: data-platform
  environment: staging
  repository: https://github.com/acme/internal-tool
spec:
  appType: greenfield
  infra:
    type: kubernetes
    target: local-cluster
    size: S
"""


def test_brownfield_valid_kubevirt_vm():
    doc = main.yaml.safe_load(VALID_DESCRIPTOR_KUBEVIRT)
    errors, normalized = main._validate_brownfield_doc(doc)
    assert errors == []
    assert normalized["target"] == "kubevirt-vm"
    assert normalized["size"] == "M"
    assert normalized["lifecycle"] == "migrated"


def test_brownfield_valid_aks_requires_region():
    doc = main.yaml.safe_load(VALID_DESCRIPTOR_AKS)
    errors, normalized = main._validate_brownfield_doc(doc)
    assert errors == []
    assert normalized["target"] == "aks"
    assert normalized["azureRegion"] == "eastus"
    assert normalized["lifecycle"] == "production"


def test_brownfield_valid_local_cluster():
    doc = main.yaml.safe_load(VALID_DESCRIPTOR_LOCAL_CLUSTER)
    errors, normalized = main._validate_brownfield_doc(doc)
    assert errors == []
    assert normalized["target"] == "local-cluster"
    assert normalized["size"] == "S"


def test_brownfield_rejects_bad_target_and_size():
    doc = main.yaml.safe_load(VALID_DESCRIPTOR_KUBEVIRT.replace("kubevirt-vm", "aws-ec2").replace("size: M", "size: XL"))
    errors, normalized = main._validate_brownfield_doc(doc)
    assert normalized is None
    assert any("target" in e for e in errors)
    assert any("size" in e for e in errors)


def test_brownfield_aks_without_region_is_rejected():
    doc = main.yaml.safe_load(VALID_DESCRIPTOR_AKS.replace("  azureRegion: eastus\n", ""))
    errors, normalized = main._validate_brownfield_doc(doc)
    assert normalized is None
    assert any("azureRegion" in e for e in errors)


def test_brownfield_rejects_non_mapping_document():
    errors, normalized = main._validate_brownfield_doc(["not", "a", "mapping"])
    assert normalized is None
    assert errors == ["Document must be a YAML mapping"]


def test_brownfield_rejects_bad_slug_name():
    doc = main.yaml.safe_load(VALID_DESCRIPTOR_KUBEVIRT.replace("legacy-app", "Legacy App!"))
    errors, normalized = main._validate_brownfield_doc(doc)
    assert normalized is None
    assert any("metadata.name" in e for e in errors)
