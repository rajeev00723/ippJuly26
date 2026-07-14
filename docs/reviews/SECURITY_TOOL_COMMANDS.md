# Security Tool Commands — IPP_Demoselfservice

## macOS Install Commands

```bash
# Install core security tools
brew install semgrep gitleaks trivy hadolint shellcheck yamllint checkov kube-linter grype syft

# Install Python security tools
pip3 install --user --break-system-packages bandit pip-audit detect-secrets
# Add to PATH:
export PATH="$PATH:$HOME/Library/Python/$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')/bin"

# SonarQube scanner
brew install sonar-scanner
```

---

## Secret Scanning

```bash
# gitleaks — scan all files (no git required)
gitleaks detect --no-git --source . --report-format json --report-path /tmp/gitleaks-report.json

# detect-secrets — baseline scan
detect-secrets scan --all-files \
  --exclude-files '.*node_modules.*|.*\.lock$|.*dist/.*' \
  > .secrets.baseline

# trivy — filesystem secret scan
trivy fs . --scanners secret --severity HIGH,CRITICAL

# Targeted grep for common patterns (never print values — review file:line only)
grep -rn "Basic [A-Za-z0-9+/=]\{20,\}" . --include="*.yaml" --include="*.yml" | grep -v node_modules
grep -rn "password.*=.*['\"][^${\]]\{8,\}['\"]" . --include="*.py" --include="*.ts" | grep -v node_modules | grep -v ".spec."
```

---

## Dependency Vulnerability Scanning

```bash
# Python
cd ipp-platform-legacy/scripts/aiops
pip-audit -r requirements.txt --format json

# Node / Yarn (backstage)
cd ipp-platform-app/backstage
yarn audit --json | grep -E '"type":"auditAdvisory"'

# Filesystem CVE scan (trivy)
trivy fs . --severity HIGH,CRITICAL --exit-code 0 --scanners vuln --ignore-unfixed

# grype
grype dir:. --only-fixed
```

---

## SAST Scanning

```bash
# Semgrep — multi-language SAST
semgrep scan --config=auto --json --output=/tmp/semgrep-report.json \
  --exclude='node_modules,dist,build,.cache,*.lock'

# Semgrep — specific OWASP / secrets rules
semgrep scan --config=p/owasp-top-ten --config=p/secrets \
  --exclude='node_modules,dist,build,.cache,*.lock'

# Python bandit
bandit -r ipp-platform-legacy/scripts/aiops/app/ -f json -o /tmp/bandit-report.json
```

---

## Docker Security

```bash
# hadolint — Dockerfile linting
find . -name "Dockerfile*" -not -path '*/node_modules/*' | xargs -I{} hadolint {}

# trivy — Dockerfile config scan
trivy config . --severity HIGH,CRITICAL
```

---

## Kubernetes / IaC

```bash
# checkov — K8s manifests
checkov -d . --framework kubernetes --compact --quiet

# kube-linter
kube-linter lint ipp-platform-app/backstage/deploy/

# yamllint — YAML syntax
yamllint -d relaxed .

# trivy — K8s config scan
trivy config . --severity HIGH,CRITICAL
```

---

## Shell Scripts

```bash
shellcheck $(find . -name "*.sh" -not -path '*/node_modules/*')
```

---

## SonarQube / SonarCloud

```bash
# Run after setting environment:
export SONAR_HOST_URL=https://sonarcloud.io
export SONAR_TOKEN=<your-sonar-token>

sonar-scanner \
  -Dsonar.projectKey=IPP_Demoselfservice \
  -Dsonar.projectName=IPP_Demoselfservice \
  -Dsonar.host.url=$SONAR_HOST_URL \
  -Dsonar.token=$SONAR_TOKEN

# For SonarCloud (free for public repos):
sonar-scanner \
  -Dsonar.organization=<your-org> \
  -Dsonar.projectKey=IPP_Demoselfservice \
  -Dsonar.host.url=https://sonarcloud.io \
  -Dsonar.token=$SONAR_TOKEN
```

---

## Full Local Security Audit Workflow

```bash
#!/bin/bash
set -e
export PATH="$PATH:$HOME/Library/Python/3.14/bin"
REPO=/Users/amitabhsharan/project/IPP_Demoselfservice
cd "$REPO"

echo "=== Secret Scan ==="
gitleaks detect --no-git --source . --report-format table

echo "=== Python Deps ==="
pip-audit -r ipp-platform-legacy/scripts/aiops/requirements.txt

echo "=== Node Deps ==="
(cd ipp-platform-app/backstage && yarn audit 2>&1 | grep -E "CRITICAL|HIGH" || true)

echo "=== SAST ==="
semgrep scan --config=auto --exclude='node_modules,dist,build,.cache,*.lock' .

echo "=== Python SAST ==="
bandit -r ipp-platform-legacy/scripts/aiops/app/ -ll

echo "=== Dockerfiles ==="
find . -name "Dockerfile*" -not -path '*/node_modules/*' | xargs -I{} hadolint {}

echo "=== K8s Manifests ==="
checkov -d ipp-platform-app/backstage/deploy --framework kubernetes --compact --quiet

echo "=== Shell Scripts ==="
shellcheck ipp-platform-legacy/scripts/bootstrap.sh ipp-platform-legacy/scripts/destroy.sh

echo "=== Trivy ==="
trivy fs . --severity HIGH,CRITICAL --scanners vuln,secret --ignore-unfixed

echo "Done."
```

---

## Recommended CI/CD Security Job (GitHub Actions)

```yaml
name: Security Scan
on: [push, pull_request]
permissions:
  contents: read
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: auto
      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          severity: HIGH,CRITICAL
          exit-code: 0
      - name: SonarCloud Scan
        if: env.SONAR_TOKEN != ''
        uses: SonarSource/sonarcloud-github-action@master
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```
