import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi, configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import type {
  AppType, Environment, InfraType, ExistingDeployment, InfraRequest, ProvisioningResult,
  ProvisioningStep, InfraDetails, ProvisionTarget, TShirtSize, AzureRegion, TargetAvailability,
} from '../../types';
import { infraOnboardingClient, CLOUD_TYPE_BY_TARGET, setDemoMode } from '../../api/InfraOnboardingClient';
import { PRICING } from '../../api/mockData';
import {
  DemoChip, SectionCard, ProgressStepper, CostPanel, Btn,
  FormField, Input, Select, Slider, CopyBlock, CloudTypeBadge, FONT, MONO,
} from '../shared';

// ── Step types ────────────────────────────────────────────────────────────────

/** Wizard-local target union — 'knative' has no matching claim kind, stays simulated. */
type WizardTarget = ProvisionTarget | 'knative';

interface WizardState {
  appType: AppType;
  appName: string;
  team: string;
  repositoryUrl: string;
  description: string;
  environment: Environment;
  existingDeployment: ExistingDeployment;
  target: WizardTarget;
  size: TShirtSize;
  azureRegion: AzureRegion;
  // Knative (unchanged, still mocked — no matching claim kind today)
  knativeMinScale: number;
  knativeMaxScale: number;
  knativeConcurrency: number;
  knativeMemoryMi: number;
}

const DEFAULT: WizardState = {
  appType: 'greenfield',
  appName: '', team: '', repositoryUrl: 'https://github.com/acme/',
  description: '', environment: 'development', existingDeployment: 'none',
  target: 'kubevirt-vm', size: 'M', azureRegion: 'eastus',
  knativeMinScale: 0, knativeMaxScale: 10, knativeConcurrency: 80, knativeMemoryMi: 256,
};

const SESSION_KEY = 'ipp-onboarding-wizard-v2';

function toInfraType(target: WizardTarget): InfraType {
  if (target === 'kubevirt-vm') return 'vm';
  if (target === 'knative') return 'knative';
  return 'kubernetes';
}

const AZURE_REGIONS: { value: AzureRegion; label: string }[] = [
  { value: 'eastus',        label: 'East US' },
  { value: 'westeurope',    label: 'West Europe' },
  { value: 'southeastasia', label: 'Southeast Asia' },
];
const ENVIRONMENTS: { value: Environment; label: string }[] = [
  { value: 'development', label: 'Development' },
  { value: 'staging',     label: 'Staging' },
  { value: 'production',  label: 'Production' },
];
const EXISTING_DEPLOYMENTS: { value: ExistingDeployment; label: string }[] = [
  { value: 'none',         label: 'None / Unknown' },
  { value: 'on-premise-vm',label: 'On-premise VM' },
  { value: 'other-cloud',  label: 'Other cloud' },
  { value: 'legacy-k8s',   label: 'Legacy Kubernetes' },
];
const SIZES: TShirtSize[] = ['S', 'M', 'L'];

function targetLabel(t: WizardTarget): string {
  if (t === 'kubevirt-vm') return '🖥 Virtual Machine (KubeVirt)';
  if (t === 'local-cluster') return '☸ Local Cluster (kind)';
  if (t === 'aks') return '☁ AKS (Azure)';
  return '⚡ Knative Serverless';
}

function sizeLabel(target: WizardTarget, size: TShirtSize): string {
  if (target === 'aks') return PRICING.aks.size[size].label;
  if (target === 'kubevirt-vm' || target === 'local-cluster') return PRICING.private.size[size].label;
  return size;
}

// ── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// ── Cost hook ────────────────────────────────────────────────────────────────

function useCostForecast(state: WizardState) {
  const [breakdown, setBreakdown] = React.useState<{compute:number;storage:number;networking:number;total:number} | null>(null);
  const [loading, setLoading] = React.useState(false);
  const debounced = useDebounced(state, 300);

  React.useEffect(() => {
    if (debounced.target === 'knative') {
      // [DEMO] Knative cost is representative — base monthly + scale-to-zero savings note.
      const base = PRICING.knative.baseMonthly;
      setBreakdown({ compute: base * 0.6, storage: 0, networking: base * 0.4, total: base });
      setLoading(false);
      return;
    }
    setLoading(true);
    infraOnboardingClient
      .getCostForecast(toInfraType(debounced.target), { target: debounced.target, size: debounced.size })
      .then(b => { setBreakdown(b); setLoading(false); });
  }, [debounced]);

  return { breakdown, loading };
}

// ── Target preflight hook ─────────────────────────────────────────────────────

function useTargetAvailability() {
  const [availability, setAvailability] = React.useState<Record<ProvisionTarget, TargetAvailability> | null>(null);
  React.useEffect(() => {
    infraOnboardingClient.getTargetAvailability().then(setAvailability);
  }, []);
  return availability;
}

// ── Step 1 — App Type ─────────────────────────────────────────────────────────

const Step1: React.FC<{ state: WizardState; update: (p: Partial<WizardState>) => void }> = ({ state, update }) => (
  <SectionCard title="What kind of application are you onboarding?">
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
      {(['greenfield', 'brownfield'] as AppType[]).map(type => (
        <button
          key={type}
          onClick={() => update({ appType: type })}
          style={{
            padding: 20, border: `2px solid ${state.appType === type ? 'var(--ds-focus)' : 'var(--ds-hairline)'}`,
            borderRadius: 14, background: state.appType === type ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface)',
            cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s, background 0.15s',
          }}
        >
          <p style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-primary)', textTransform: 'capitalize' }}>
            {type}
          </p>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
            {type === 'greenfield'
              ? 'Starting a brand-new service — creates a git repository scaffold'
              : 'Onboarding an existing service — links to an existing git repository'}
          </p>
        </button>
      ))}
    </div>
  </SectionCard>
);

// ── Step 2 — App Details ──────────────────────────────────────────────────────

const Step2: React.FC<{ state: WizardState; update: (p: Partial<WizardState>) => void; errors: Record<string,string> }> = ({ state, update, errors }) => (
  <SectionCard title="Application Details">
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
      <FormField label="App Name" required error={errors.appName}>
        <Input
          value={state.appName}
          onChange={v => update({ appName: v.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
          placeholder="my-service"
          error={!!errors.appName}
        />
        <span style={{ fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>
          Lowercase letters, numbers, and hyphens only
        </span>
      </FormField>
      <FormField label="Team / Squad" required error={errors.team}>
        <Input value={state.team} onChange={v => update({ team: v })} placeholder="platform-engineering" error={!!errors.team} />
      </FormField>
      <FormField label="Repository URL" required error={errors.repositoryUrl}>
        <Input
          value={state.repositoryUrl}
          onChange={v => update({ repositoryUrl: v })}
          placeholder={state.appType === 'brownfield' ? 'https://github.com/org/existing-repo' : 'https://github.com/acme/new-service'}
          error={!!errors.repositoryUrl}
        />
      </FormField>
      <FormField label="Description">
        <Input value={state.description} onChange={v => update({ description: v })} placeholder="Brief description of what this service does" />
      </FormField>
      <FormField label="Environment" required>
        <Select value={state.environment} onChange={v => update({ environment: v as Environment })} options={ENVIRONMENTS} />
      </FormField>
      {state.appType === 'brownfield' && (
        <FormField label="Existing Deployment Target">
          <Select
            value={state.existingDeployment}
            onChange={v => update({ existingDeployment: v as ExistingDeployment })}
            options={EXISTING_DEPLOYMENTS}
          />
        </FormField>
      )}
    </div>
  </SectionCard>
);

// ── Step 3 — Target Selector ───────────────────────────────────────────────────

interface Step3Props {
  state: WizardState;
  update: (p: Partial<WizardState>) => void;
  knativeDemoEnabled: boolean;
}

const Step3: React.FC<Step3Props> = ({ state, update, knativeDemoEnabled }) => {
  const { breakdown, loading } = useCostForecast(state);
  const availability = useTargetAvailability();
  const targetOptions: WizardTarget[] = knativeDemoEnabled
    ? ['kubevirt-vm', 'local-cluster', 'aks', 'knative']
    : ['kubevirt-vm', 'local-cluster', 'aks'];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
      <SectionCard title="Deployment Target">
        {/* Target selector */}
        <div style={{ display: 'grid', gridTemplateColumns: knativeDemoEnabled ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
          {targetOptions.map(t => {
            const avail = t !== 'knative' ? availability?.[t] : undefined;
            const disabled = t !== 'knative' && availability != null && avail?.available === false;
            return (
              <button
                key={t}
                onClick={() => !disabled && update({ target: t })}
                disabled={disabled}
                title={avail?.reason}
                style={{
                  padding: '12px 10px', border: `2px solid ${state.target === t ? 'var(--ds-focus)' : 'var(--ds-hairline)'}`,
                  borderRadius: 10, background: disabled ? 'var(--ds-surface-alt)' : state.target === t ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface)',
                  cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600, fontFamily: FONT,
                  color: disabled ? 'var(--ds-text-tertiary)' : 'var(--ds-text-primary)',
                  opacity: disabled ? 0.6 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {targetLabel(t)}
                {t !== 'knative' && (
                  <div style={{ marginTop: 4 }}>
                    <CloudTypeBadge cloudType={CLOUD_TYPE_BY_TARGET[t]} style={{ fontSize: 9 }} />
                  </div>
                )}
                {disabled && (
                  <div style={{ fontSize: 10, color: 'var(--ds-warn)', marginTop: 4 }}>Unavailable</div>
                )}
              </button>
            );
          })}
        </div>
        {availability?.[state.target as ProvisionTarget] && (
          <p style={{ margin: '0 0 16px', fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>
            ⓘ {availability[state.target as ProvisionTarget].reason}
          </p>
        )}

        {state.target !== 'knative' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <FormField label="Size">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {SIZES.map(s => (
                  <button key={s} onClick={() => update({ size: s })} style={{
                    padding: '8px 4px', border: `1.5px solid ${state.size === s ? 'var(--ds-focus)' : 'var(--ds-hairline)'}`,
                    borderRadius: 8, background: state.size === s ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface)',
                    cursor: 'pointer', fontSize: 12, fontFamily: FONT, fontWeight: state.size === s ? 700 : 400,
                    color: state.size === s ? 'var(--ds-chip-info-text)' : 'var(--ds-text-primary)',
                    transition: 'all 0.15s', textAlign: 'center',
                  }}>
                    <div style={{ marginBottom: 2 }}>{s}</div>
                    <div style={{ fontSize: 10, color: 'var(--ds-text-tertiary)', fontWeight: 400 }}>
                      {sizeLabel(state.target, s)}
                    </div>
                  </button>
                ))}
              </div>
            </FormField>
            {state.target === 'aks' && (
              <FormField label="Azure Region">
                <Select value={state.azureRegion} onChange={v => update({ azureRegion: v as AzureRegion })} options={AZURE_REGIONS} />
              </FormField>
            )}
          </div>
        )}

        {state.target === 'knative' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: 'var(--ds-chip-info-bg)', border: '1px solid var(--ds-chip-info-border)',
              fontSize: 12, fontFamily: FONT, color: 'var(--ds-text-primary)',
            }}>
              <strong>Scale-to-zero serverless runtime.</strong> Your service starts at 0 replicas and scales on demand. Cost is proportional to actual traffic — idle time is free. Representative pricing shown.
            </div>
            <FormField label="Min Replicas (0 = scale-to-zero)">
              <Slider value={state.knativeMinScale} min={0} max={5} onChange={v => update({ knativeMinScale: v })} />
            </FormField>
            <FormField label="Max Replicas">
              <Slider value={state.knativeMaxScale} min={1} max={50} onChange={v => update({ knativeMaxScale: v })} />
            </FormField>
            <FormField label="Target Concurrency (requests/pod)">
              <Slider value={state.knativeConcurrency} min={1} max={500} onChange={v => update({ knativeConcurrency: v })} />
            </FormField>
            <FormField label="Memory Limit (MiB)">
              <Slider value={state.knativeMemoryMi} min={64} max={2048} onChange={v => update({ knativeMemoryMi: v })} />
            </FormField>
          </div>
        )}
      </SectionCard>
      <CostPanel breakdown={breakdown} loading={loading} title={state.target === 'knative' ? 'Estimated Monthly Cost' : undefined} />
    </div>
  );
};

// ── Step 4 — Review ───────────────────────────────────────────────────────────

const Step4: React.FC<{ state: WizardState; cost: { compute: number; storage: number; networking: number; total: number } | null }> = ({ state, cost }) => (
  <SectionCard title="Review & Confirm">
    <ReviewRow label="App Name"    value={state.appName || '—'} />
    <ReviewRow label="Team"        value={state.team || '—'} />
    <ReviewRow label="Repository"  value={state.repositoryUrl} mono />
    <ReviewRow label="Environment" value={state.environment} capitalize />
    <ReviewRow label="App Type"    value={state.appType} capitalize />
    <div style={{ borderTop: '1px solid var(--ds-hairline)', margin: '10px 0' }} />
    <ReviewRow label="Deployment Target" value={targetLabel(state.target)} />
    {state.target !== 'knative' && (
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '2px 0 6px' }}>
        <CloudTypeBadge cloudType={CLOUD_TYPE_BY_TARGET[state.target]} />
      </div>
    )}
    {state.target !== 'knative' && (
      <>
        <ReviewRow label="Size" value={`${state.size} — ${sizeLabel(state.target, state.size)}`} />
        {state.target === 'aks' && <ReviewRow label="Azure Region" value={state.azureRegion} mono />}
      </>
    )}
    {state.target === 'knative' && (
      <>
        <ReviewRow label="Min Replicas"   value={`${state.knativeMinScale} (scale-to-zero)`} />
        <ReviewRow label="Max Replicas"   value={`${state.knativeMaxScale}`} />
        <ReviewRow label="Concurrency"    value={`${state.knativeConcurrency} req/pod`} />
        <ReviewRow label="Memory"         value={`${state.knativeMemoryMi} MiB`} />
      </>
    )}
    {cost && (
      <>
        <div style={{ borderTop: '1px solid var(--ds-hairline)', margin: '10px 0' }} />
        <ReviewRow label="Cost Forecast" value={`$${cost.total.toFixed(2)} / month`} bold />
      </>
    )}
    <div style={{
      marginTop: 16, padding: '10px 14px',
      background: 'var(--ds-chip-warn-bg)',
      borderRadius: 8, fontSize: 13, fontFamily: FONT, color: 'var(--ds-warn)',
    }}>
      ⚠ Provisioning will begin immediately upon confirmation.
    </div>
  </SectionCard>
);

const ReviewRow: React.FC<{ label: string; value: string; mono?: boolean; bold?: boolean; capitalize?: boolean }> = ({ label, value, mono, bold, capitalize }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--ds-hairline)' }}>
    <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>{label}</span>
    <span style={{ fontSize: 13, fontFamily: mono ? MONO : FONT, fontWeight: bold ? 700 : 500, color: 'var(--ds-text-primary)', textTransform: capitalize ? 'capitalize' : 'none' }}>
      {value}
    </span>
  </div>
);

// ── Step 5 — Provisioning Progress ────────────────────────────────────────────

const Step5: React.FC<{
  steps: ProvisioningStep[];
  status: string;
  simulated: boolean;
  errorMessage?: string;
  onRetry: () => void;
}> = ({ steps, status, simulated, errorMessage, onRetry }) => (
  <SectionCard title="Provisioning Infrastructure" demo={simulated}>
    <ProgressStepper steps={steps as any} />
    {status === 'failed' && (
      <div style={{ marginTop: 16, padding: '12px 16px', background: 'color-mix(in srgb, var(--ds-error) 10%, transparent)', borderRadius: 8 }}>
        <p style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--ds-error)', fontFamily: FONT }}>
          Provisioning failed
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
          {errorMessage ?? (simulated
            ? 'This is a simulated error (add ?simulateError=true to trigger).'
            : 'See the Argo CD condition message above for details.')}
        </p>
        <Btn onClick={onRetry} variant="secondary">↻ Retry Provisioning</Btn>
      </div>
    )}
  </SectionCard>
);

// ── Step 6 — Success ──────────────────────────────────────────────────────────

const Step6: React.FC<{
  result: InfraDetails;
  state: WizardState;
  forecast: number;
  actual: number;
  simulated: boolean;
}> = ({ result, state, forecast, actual, simulated }) => {
  const navigate = useNavigate();
  const configYaml = generateConfigYaml(result, state);
  const handleDownload = () => {
    const blob = new Blob([configYaml], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.environment}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 32 }}>✅</span>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>
            Infrastructure Provisioned Successfully!
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
            {simulated ? 'Simulated result — IIP was unreachable or this is a Knative request.' : 'Claim committed via IIP. Argo CD has synced the resource.'}
          </p>
        </div>
      </div>

      <SectionCard title="Provisioned Details" demo={simulated}>
        <DetailRow label="Claim Name" value={result.claimName} mono />
        {result.target && <DetailRow label="Target" value={targetLabel(result.target)} />}
        {result.size && <DetailRow label="Size" value={result.size} />}
        {result.azureRegion && <DetailRow label="Region" value={result.azureRegion} mono />}
        {!simulated && result.argoCDUrl && (
          <div style={{ marginTop: 12 }}>
            <Btn onClick={() => window.open(result.argoCDUrl, '_blank', 'noopener')} variant="secondary" style={{ fontSize: 13 }}>
              View in Argo CD ↗
            </Btn>
          </div>
        )}
      </SectionCard>

      {/* Actual Cost */}
      <div style={{ padding: '14px 18px', background: 'var(--ds-surface-alt)', border: '1px solid var(--ds-hairline)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 14, fontFamily: FONT, color: 'var(--ds-text-primary)', fontWeight: 600 }}>
            💰 Actual Monthly Charge: <span style={{ fontFamily: MONO }}>${actual.toFixed(2)} / month</span>
          </span>
          <DemoChip />
        </div>
        <div style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: FONT, marginTop: 4 }}>
          (Forecast was: ${forecast.toFixed(2)} / month)
        </div>
      </div>

      <SectionCard title="Next Steps">
        <ol style={{ margin: '0 0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <li style={{ fontSize: 13, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>Copy the config below into your repo</li>
          <li style={{ fontSize: 13, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>
            Commit to: <code style={{ fontFamily: MONO, fontSize: 12, background: 'var(--ds-surface-alt)', padding: '1px 5px', borderRadius: 4 }}>
              /config/infra/{state.environment}.yaml
            </code>
          </li>
          <li style={{ fontSize: 13, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>Trigger your CI pipeline to deploy</li>
        </ol>
      </SectionCard>

      <SectionCard title="Config Snippet for Git">
        <CopyBlock code={configYaml} />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Btn onClick={handleDownload} variant="secondary" style={{ fontSize: 13 }}>⬇ Download as YAML</Btn>
          <Btn onClick={() => navigate('/infra-onboarding/resources')} variant="secondary" style={{ fontSize: 13 }}>
            View in My Resources →
          </Btn>
        </div>
      </SectionCard>
    </div>
  );
};

const DetailRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--ds-hairline)' }}>
    <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>{label}:</span>
    <span style={{ fontSize: 13, fontFamily: mono ? MONO : FONT, color: 'var(--ds-text-primary)' }}>{value}</span>
  </div>
);

function generateConfigYaml(result: InfraDetails, state: WizardState): string {
  return `# config/infra/${state.environment}.yaml
# Generated by Platform Engineering — Infra Onboarding
# Commit this file to your repository root and trigger CI
infra:
  type: ${state.target === 'knative' ? 'knative' : toInfraType(state.target)}
  target: ${state.target}
  claimName: ${result.claimName}
${result.size ? `  size: ${result.size}\n` : ''}${result.azureRegion ? `  region: ${result.azureRegion}\n` : ''}`;
}

// ── Main Wizard ───────────────────────────────────────────────────────────────

const STEP_LABELS = [
  'App Type', 'App Details', 'Infrastructure', 'Review', 'Provisioning', 'Complete',
];

function validateStep2(state: WizardState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!state.appName) errors.appName = 'App name is required';
  else if (!/^[a-z0-9-]+$/.test(state.appName)) errors.appName = 'Must be lowercase letters, numbers, and hyphens only';
  if (!state.team) errors.team = 'Team name is required';
  if (!state.repositoryUrl) errors.repositoryUrl = 'Repository URL is required';
  return errors;
}

interface PersistedSession {
  step: number;
  state: WizardState;
  claimName: string | null;
}

function loadSession(): PersistedSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const OnboardingWizard: React.FC = () => {
  const configApi = useApi(configApiRef);
  const identityApi = useApi(identityApiRef);
  const knativeDemoEnabled = React.useMemo(() => {
    try { return configApi.getOptionalBoolean('knative.demoEnabled') ?? false; }
    catch { return false; }
  }, [configApi]);
  React.useEffect(() => {
    try { setDemoMode(configApi.getOptionalBoolean('infraOnboarding.demoMode') ?? false); }
    catch { setDemoMode(false); }
  }, [configApi]);

  const persisted = React.useMemo(loadSession, []);
  const [step, setStep] = React.useState(persisted?.step ?? 0);
  const [state, setState] = React.useState<WizardState>(persisted?.state ?? DEFAULT);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [claimName, setClaimName] = React.useState<string | null>(persisted?.claimName ?? null);
  const [provisionResult, setProvisionResult] = React.useState<ProvisioningResult | null>(null);
  const [costCache, setCostCache] = React.useState<{ compute: number; storage: number; networking: number; total: number } | null>(null);

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));

  // D3: persist wizard state + active claim so an accidental refresh mid-demo doesn't lose progress.
  React.useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ step, state, claimName }));
    } catch {
      // sessionStorage unavailable (private browsing etc.) — non-fatal, just no persistence.
    }
  }, [step, state, claimName]);

  // Poll provisioning status when on step 5 (index 4).
  React.useEffect(() => {
    if (step !== 4 || !claimName) return;
    let active = true;
    const poll = async () => {
      while (active) {
        const result = await infraOnboardingClient.getProvisioningStatus(claimName);
        if (!active) break;
        setProvisionResult(result);
        if (result.status === 'complete') { setStep(5); break; }
        if (result.status === 'failed') break;
        await new Promise(r => setTimeout(r, 1500));
      }
    };
    poll();
    return () => { active = false; };
  }, [step, claimName]);

  const handleNext = async () => {
    if (step === 1) {
      const errs = validateStep2(state);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setErrors({});
    }
    if (step === 2) {
      if (state.target === 'knative') {
        const base = PRICING.knative.baseMonthly;
        setCostCache({ compute: base * 0.6, storage: 0, networking: base * 0.4, total: base });
      } else {
        const cost = await infraOnboardingClient.getCostForecast(toInfraType(state.target), { target: state.target, size: state.size });
        setCostCache(cost);
      }
    }
    if (step === 3) {
      let requestedBy = 'guest@ipp.local';
      try {
        const profile = await identityApi.getProfileInfo();
        requestedBy = profile.email || requestedBy;
      } catch {
        // identity unavailable (e.g. guest session) — fall back to the default.
      }
      const request: InfraRequest = {
        appType: state.appType,
        details: {
          appName: state.appName,
          team: state.team,
          repositoryUrl: state.repositoryUrl,
          description: state.description,
          environment: state.environment,
          existingDeployment: state.existingDeployment,
          requestedBy,
        },
        infraType: toInfraType(state.target),
        ...(state.target === 'knative'
          ? { knative: { minScale: state.knativeMinScale, maxScale: state.knativeMaxScale, concurrency: state.knativeConcurrency, memoryMi: state.knativeMemoryMi } }
          : { target: state.target, size: state.size, ...(state.target === 'aks' ? { azureRegion: state.azureRegion } : {}) }),
      };
      const { claimName: cn } = await infraOnboardingClient.provision(request);
      setClaimName(cn);
      setProvisionResult(null);
      setStep(4);
      return;
    }
    setStep(s => Math.min(s + 1, 5));
  };

  const handleRetry = async () => {
    // Re-run provisioning with the same data by resetting to step 3.
    setStep(3);
  };

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Step bar */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--ds-surface)', border: '1px solid var(--ds-hairline)', borderRadius: 12, overflow: 'hidden' }}>
        {STEP_LABELS.map((label, i) => (
          <div key={i} style={{
            flex: 1, padding: '10px 8px', textAlign: 'center', fontSize: 12, fontFamily: FONT,
            fontWeight: i === step ? 700 : 400,
            color: i < step ? 'var(--ds-success)' : i === step ? 'var(--ds-chip-info-text)' : 'var(--ds-text-tertiary)',
            background: i === step ? 'var(--ds-chip-info-bg)' : 'transparent',
            borderRight: i < 5 ? '1px solid var(--ds-hairline)' : 'none',
            transition: 'all 0.2s',
          }}>
            <span style={{ display: 'block', fontSize: 10, marginBottom: 2 }}>{i < step ? '✓' : i + 1}</span>
            {label}
          </div>
        ))}
      </div>

      {/* Steps */}
      {step === 0 && <Step1 state={state} update={update} />}
      {step === 1 && <Step2 state={state} update={update} errors={errors} />}
      {step === 2 && <Step3 state={state} update={update} knativeDemoEnabled={knativeDemoEnabled} />}
      {step === 3 && <Step4 state={state} cost={costCache} />}
      {step === 4 && provisionResult && (
        <Step5
          steps={provisionResult.steps}
          status={provisionResult.status}
          simulated={provisionResult.simulated ?? false}
          errorMessage={provisionResult.errorMessage}
          onRetry={handleRetry}
        />
      )}
      {step === 5 && provisionResult?.result && (
        <Step6
          result={provisionResult.result}
          state={state}
          forecast={provisionResult.forecastCost ?? costCache?.total ?? 0}
          actual={provisionResult.actualCost ?? 0}
          simulated={provisionResult.simulated ?? false}
        />
      )}

      {/* Nav buttons */}
      {step < 4 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <Btn onClick={() => setStep(s => Math.max(s - 1, 0))} variant="secondary" disabled={step === 0}>
            ← Back
          </Btn>
          <Btn onClick={handleNext}>
            {step === 3 ? 'Confirm & Provision' : 'Next →'}
          </Btn>
        </div>
      )}
    </div>
  );
};
