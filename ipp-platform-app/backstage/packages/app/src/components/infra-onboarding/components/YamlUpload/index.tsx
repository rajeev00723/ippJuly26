import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { YamlInfraRequest, ValidationError, InfraRequest } from '../../types';
import { infraOnboardingClient } from '../../api/InfraOnboardingClient';
import { SectionCard, Btn, CostPanel, ProgressStepper, DemoChip, FONT, MONO } from '../shared';

// [DEMO] Example YAML template users can download as a starting point.
const EXAMPLE_YAML = `# infra-request.yaml — Backstage Infra Onboarding Request
apiVersion: platform.demo/v1
kind: InfraRequest
metadata:
  name: my-service                     # required, slug format
  team: platform-engineering           # required
  environment: development             # required: development | staging | production
  repository: https://github.com/org/repo  # required
spec:
  appType: greenfield                  # required: greenfield | brownfield
  description: "Short description"     # optional
  infra:
    type: kubernetes                   # required: kubernetes | vm
    target: local-cluster              # kubevirt-vm | local-cluster | aks
    size: M                            # S | M | L
`;

function validateYaml(parsed: unknown): { errors: ValidationError[]; request: YamlInfraRequest | null } {
  const errors: ValidationError[] = [];
  if (!parsed || typeof parsed !== 'object') {
    return { errors: [{ path: 'root', message: 'Document must be a YAML object' }], request: null };
  }
  const doc = parsed as Record<string, unknown>;
  if (doc.apiVersion !== 'platform.demo/v1') errors.push({ path: 'apiVersion', message: 'must be "platform.demo/v1"' });
  if (doc.kind !== 'InfraRequest') errors.push({ path: 'kind', message: 'must be "InfraRequest"' });

  const meta = doc.metadata as Record<string, unknown> | undefined;
  if (!meta) { errors.push({ path: 'metadata', message: 'required' }); }
  else {
    if (!meta.name || typeof meta.name !== 'string' || !/^[a-z0-9-]+$/.test(meta.name as string))
      errors.push({ path: 'metadata.name', message: 'required, must be a lowercase slug (letters, numbers, hyphens)' });
    if (!meta.team) errors.push({ path: 'metadata.team', message: 'required' });
    if (!['development', 'staging', 'production'].includes(meta.environment as string))
      errors.push({ path: 'metadata.environment', message: 'must be one of: development, staging, production' });
    if (!meta.repository) errors.push({ path: 'metadata.repository', message: 'required' });
  }

  const spec = doc.spec as Record<string, unknown> | undefined;
  if (!spec) { errors.push({ path: 'spec', message: 'required' }); }
  else {
    if (!['greenfield', 'brownfield'].includes(spec.appType as string))
      errors.push({ path: 'spec.appType', message: 'must be one of: greenfield, brownfield' });
    const infra = spec.infra as Record<string, unknown> | undefined;
    if (!infra) { errors.push({ path: 'spec.infra', message: 'required' }); }
    else {
      if (!['kubernetes', 'vm', 'knative'].includes(infra.type as string))
        errors.push({ path: 'spec.infra.type', message: 'must be one of: kubernetes, vm, knative' });
      if (infra.type !== 'knative') {
        if (!['kubevirt-vm', 'local-cluster', 'aks'].includes(infra.target as string))
          errors.push({ path: 'spec.infra.target', message: 'must be one of: kubevirt-vm, local-cluster, aks' });
        if (!['S', 'M', 'L'].includes(infra.size as string))
          errors.push({ path: 'spec.infra.size', message: 'must be one of: S, M, L' });
        if (infra.target === 'aks' && !['eastus', 'westeurope', 'southeastasia'].includes(infra.azureRegion as string))
          errors.push({ path: 'spec.infra.azureRegion', message: 'must be one of: eastus, westeurope, southeastasia (required for aks)' });
      }
    }
  }

  if (errors.length > 0) return { errors, request: null };
  return { errors: [], request: doc as unknown as YamlInfraRequest };
}

// Server-side validation (O5) — IIP re-parses and re-validates the raw
// descriptor text with yaml.safe_load, independent of whatever ran in the
// browser. Falls back to the client-side validateYaml() above only if IIP
// itself is unreachable (offline demo), never to skip validation.
async function validateBrownfieldServerSide(
  rawText: string,
  clientParsed: unknown,
): Promise<{ errors: ValidationError[]; request: YamlInfraRequest | null; serverValidated: boolean }> {
  try {
    const res = await fetch('/api/proxy/iip/api/onboard/brownfield', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptor: rawText }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { errors: [{ path: 'root', message: 'IIP rejected the descriptor' }], request: null, serverValidated: true };
    }
    if (!data.valid) {
      const errors: ValidationError[] = (data.errors ?? []).map((message: string) => ({ path: 'server', message }));
      return { errors, request: null, serverValidated: true };
    }
    // Server returned a normalized InfraRequest-shaped object; wrap it into
    // the YamlInfraRequest shape the preview UI expects.
    const r = data.request;
    const wrapped: YamlInfraRequest = {
      apiVersion: 'platform.demo/v1',
      kind: 'InfraRequest',
      metadata: {
        name: r.details.appName,
        team: r.details.team,
        environment: r.details.environment,
        repository: r.details.repositoryUrl,
      },
      spec: {
        appType: r.appType,
        description: r.details.description,
        infra: { type: r.infraType, target: r.target, size: r.size, azureRegion: r.azureRegion },
      },
    };
    return { errors: [], request: wrapped, serverValidated: true };
  } catch {
    // IIP unreachable — fall back to client-side validation of the already-parsed doc.
    const { errors, request } = validateYaml(clientParsed);
    return { errors, request, serverValidated: false };
  }
}

function toInfraRequest(yaml: YamlInfraRequest): InfraRequest {
  return {
    appType: yaml.spec.appType,
    details: {
      appName: yaml.metadata.name,
      team: yaml.metadata.team,
      repositoryUrl: yaml.metadata.repository,
      description: yaml.spec.description ?? '',
      environment: yaml.metadata.environment,
    },
    infraType: yaml.spec.infra.type,
    target: yaml.spec.infra.target,
    size: yaml.spec.infra.size,
    azureRegion: yaml.spec.infra.azureRegion,
    knative: yaml.spec.infra.knative,
  };
}

export const YamlUpload: React.FC = () => {
  const navigate = useNavigate();
  const [dragging, setDragging] = React.useState(false);
  const [parsed, setParsed] = React.useState<YamlInfraRequest | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<ValidationError[]>([]);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [cost, setCost] = React.useState<{ compute: number; storage: number; networking: number; total: number } | null>(null);
  const [costLoading, setCostLoading] = React.useState(false);
  const [provisionSteps, setProvisionSteps] = React.useState<any[]>([]);
  const [provisionStatus, setProvisionStatus] = React.useState<string>('');
  const [provisioning, setProvisioning] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [serverValidated, setServerValidated] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setParseError(null);
    setValidationErrors([]);
    setParsed(null);
    setCost(null);
    setDone(false);
    const text = await file.text();
    let doc: unknown;
    try {
      // Dynamic import of yaml to keep bundle clean.
      const yaml = await import('yaml' as any);
      doc = yaml.parse(text);
    } catch (e: any) {
      setParseError(`YAML parse error: ${e.message}`);
      return;
    }
    // Server-side re-validation (O5) — never trust the client-parsed doc alone;
    // IIP re-parses the raw text with yaml.safe_load and enforces the same
    // schema. Falls back to client-only validation if IIP is unreachable.
    const { errors, request, serverValidated: fromServer } = await validateBrownfieldServerSide(text, doc);
    setServerValidated(fromServer);
    if (errors.length > 0) { setValidationErrors(errors); return; }
    if (!request) return;
    setParsed(request);
    setCostLoading(true);
    const breakdown = await infraOnboardingClient.getCostForecast(request.spec.infra.type, {
      target: request.spec.infra.target,
      size: request.spec.infra.size,
    });
    setCost(breakdown);
    setCostLoading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDownloadExample = () => {
    const blob = new Blob([EXAMPLE_YAML], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'infra-request.yaml'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleProvision = async () => {
    if (!parsed) return;
    setProvisioning(true);
    const request = toInfraRequest(parsed);
    const { claimName } = await infraOnboardingClient.provision(request);
    let active = true;
    const poll = async () => {
      while (active) {
        const result = await infraOnboardingClient.getProvisioningStatus(claimName);
        setProvisionSteps(result.steps);
        setProvisionStatus(result.status);
        if (result.status === 'complete') { setDone(true); break; }
        if (result.status === 'failed') break;
        await new Promise(r => setTimeout(r, 400));
      }
    };
    poll();
  };

  return (
    <div style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Btn onClick={handleDownloadExample} variant="secondary" style={{ fontSize: 13 }}>
          ⬇ Download Example YAML
        </Btn>
      </div>

      {/* Drop zone */}
      {!parsed && !provisioning && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--ds-focus)' : 'var(--ds-hairline)'}`,
            borderRadius: 14,
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface)',
            transition: 'all 0.15s',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--ds-text-primary)', fontFamily: FONT }}>
            Drop your infra-request.yaml here
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
            or click to browse — accepts .yaml, .yml
          </p>
          <input ref={fileRef} type="file" accept=".yaml,.yml" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div style={{ padding: '12px 16px', background: 'color-mix(in srgb, var(--ds-error) 10%, transparent)', borderRadius: 8 }}>
          <p style={{ margin: 0, fontSize: 13, fontFamily: MONO, color: 'var(--ds-error)' }}>{parseError}</p>
        </div>
      )}

      {/* Validation errors */}
      {validationErrors.length > 0 && (
        <SectionCard title="Validation Errors">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {validationErrors.map((e, i) => (
              <div key={i} style={{ fontSize: 13, fontFamily: MONO, color: 'var(--ds-error)' }}>
                ❌ <strong>{e.path}</strong> — {e.message}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn onClick={() => { setParsed(null); setValidationErrors([]); }} variant="secondary" style={{ fontSize: 13 }}>
              ↩ Try again
            </Btn>
          </div>
        </SectionCard>
      )}

      {/* Preview after valid parse */}
      {parsed && !provisioning && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
          <SectionCard title="Parsed Request — Preview">
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 8 }}>
              {serverValidated
                ? 'Validated server-side by IIP. Review before provisioning.'
                : <>Validated client-side only <DemoChip style={{ fontSize: 9 }} /> — IIP was unreachable, so this skipped server-side re-validation.</>}
            </p>
            {[
              ['App Name',    parsed.metadata.name],
              ['Team',        parsed.metadata.team],
              ['Environment', parsed.metadata.environment],
              ['Repository',  parsed.metadata.repository],
              ['App Type',    parsed.spec.appType],
              ['Infra Type',  parsed.spec.infra.type],
              ...(parsed.spec.infra.target ? [
                ['Target', parsed.spec.infra.target],
                ['Size',   parsed.spec.infra.size ?? 'M'],
                ...(parsed.spec.infra.azureRegion ? [['Region', parsed.spec.infra.azureRegion]] : []),
              ] : []),
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--ds-hairline)' }}>
                <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>{k}</span>
                <span style={{ fontSize: 13, fontFamily: MONO, color: 'var(--ds-text-primary)' }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <Btn onClick={handleProvision}>Confirm & Provision</Btn>
              <Btn onClick={() => setParsed(null)} variant="secondary">↩ Re-upload</Btn>
            </div>
          </SectionCard>
          <CostPanel breakdown={cost} loading={costLoading} />
        </div>
      )}

      {/* Provisioning */}
      {provisioning && !done && (
        <SectionCard title="Provisioning Infrastructure" demo>
          <ProgressStepper steps={provisionSteps} />
        </SectionCard>
      )}

      {done && (
        <div style={{ padding: '20px', background: 'color-mix(in srgb, var(--ds-success) 10%, transparent)', borderRadius: 14, border: '1px solid var(--ds-success)' }}>
          <p style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-success)' }}>
            ✅ Infrastructure Provisioned Successfully!
          </p>
          <Btn onClick={() => navigate('/infra-onboarding/resources')} variant="secondary">
            View in My Resources →
          </Btn>
        </div>
      )}
    </div>
  );
};
