import React from 'react';
import { useLocation } from 'react-router-dom';
import type { InfraResource, TShirtSize } from '../../types';
import { infraOnboardingClient } from '../../api/InfraOnboardingClient';
import { PRICING } from '../../api/mockData';
import { DemoChip, SectionCard, Btn, Select, FONT, MONO } from '../shared';

const SIZE_OPTIONS: { value: TShirtSize; label: string }[] = [
  { value: 'S', label: 'Small' },
  { value: 'M', label: 'Medium' },
  { value: 'L', label: 'Large' },
];

// ── Scale operation progress ──────────────────────────────────────────────────

const ScaleProgress: React.FC<{ steps: string[]; current: number; done: boolean }> = ({ steps, current, done }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
    {steps.map((label, i) => (
      <React.Fragment key={label}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, fontFamily: FONT,
            background: done && i <= current ? 'var(--ds-success)' : i === current ? 'var(--ds-focus)' : i < current ? 'var(--ds-success)' : 'var(--ds-surface-alt)',
            color: (i <= current || done) ? '#fff' : 'var(--ds-text-tertiary)',
            transition: 'all 0.3s',
          }}>
            {i < current || done ? '✓' : i === current ? '…' : i + 1}
          </div>
          <span style={{ fontSize: 12, fontFamily: FONT, color: i <= current ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)', fontWeight: i === current ? 600 : 400 }}>
            {label}
          </span>
        </div>
        {i < steps.length - 1 && (
          <div style={{ flex: 1, height: 1, background: i < current ? 'var(--ds-success)' : 'var(--ds-hairline)' }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ── K8s Day 2 Controls ────────────────────────────────────────────────────────

const K8sDay2: React.FC<{ resource: InfraResource; onUpdate: (r: InfraResource) => void }> = ({ resource, onUpdate }) => {
  const [nodeCount, setNodeCount] = React.useState(resource.nodeCount ?? 3);
  const [scaling, setScaling] = React.useState(false);
  const [scaleStep, setScaleStep] = React.useState(-1);
  const [scaleDone, setScaleDone] = React.useState(false);
  const SCALE_STEPS = ['Validating', 'Scaling', 'Complete'];

  const calcCost = (n: number) => {
    const rates = resource.provisionTarget === 'aks' ? PRICING.aks : PRICING.private;
    const rate = rates.size[resource.size ?? 'M'].hourly;
    return Math.round((rate * 730 + rates.networkingPerNode) * n * 100) / 100;
  };
  const newCost = calcCost(nodeCount);
  const delta = newCost - resource.monthlyCost;

  const applyScale = async () => {
    setScaling(true);
    setScaleDone(false);
    for (let i = 0; i < SCALE_STEPS.length; i++) {
      setScaleStep(i);
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
    }
    await infraOnboardingClient.scaleResource(resource.id, { nodeCount });
    setScaleDone(true);
    setScaling(false);
    onUpdate({ ...resource, nodeCount, monthlyCost: newCost });
  };

  return (
    <SectionCard title={`DAY 2 OPERATIONS: ${resource.name}`} demo>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>Current Node Count</p>
          <span style={{ fontSize: 24, fontWeight: 700, fontFamily: MONO, color: 'var(--ds-text-primary)' }}>{resource.nodeCount}</span>
        </div>

        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>Scale Nodes</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Btn onClick={() => setNodeCount(n => Math.max(1, n - 1))} variant="secondary" style={{ padding: '6px 14px', fontSize: 18 }}>−</Btn>
            <span style={{ fontSize: 20, fontWeight: 700, fontFamily: MONO, minWidth: 32, textAlign: 'center', color: 'var(--ds-text-primary)' }}>{nodeCount}</span>
            <Btn onClick={() => setNodeCount(n => Math.min(20, n + 1))} variant="secondary" style={{ padding: '6px 14px', fontSize: 18 }}>+</Btn>
            <span style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>(1–20)</span>
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--ds-surface-alt)', borderRadius: 10 }}>
          <CostDeltaRow label="New Estimated Cost" value={`$${newCost.toFixed(2)} / month`} />
          <CostDeltaRow label="Current Cost" value={`$${resource.monthlyCost.toFixed(2)} / month`} />
          <div style={{ borderTop: '1px solid var(--ds-hairline)', margin: '8px 0' }} />
          <CostDeltaRow
            label="Cost Delta"
            value={`${delta >= 0 ? '+' : ''}$${delta.toFixed(2)} / month ${delta >= 0 ? '▲' : '▼'}`}
            color={delta > 0 ? 'var(--ds-warn)' : delta < 0 ? 'var(--ds-success)' : 'var(--ds-text-primary)'}
          />
        </div>

        {scaling && <ScaleProgress steps={SCALE_STEPS} current={scaleStep} done={scaleDone} />}
        {scaleDone && (
          <p style={{ margin: 0, fontSize: 13, fontFamily: FONT, color: 'var(--ds-success)' }}>✅ Scale operation complete</p>
        )}

        {!scaling && nodeCount !== resource.nodeCount && (
          <Btn onClick={applyScale}>Apply Scale Change</Btn>
        )}

        {/* Advanced section */}
        <div style={{ borderTop: '1px solid var(--ds-hairline)', paddingTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, fontFamily: FONT, color: 'var(--ds-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Advanced
            </p>
          </div>
          <AdvancedRow label="Node Size Upgrade">
            <Select value={resource.size ?? 'M'} onChange={() => {}} options={SIZE_OPTIONS} />
          </AdvancedRow>
          <AdvancedRow label="Schedule Scale">
            <Btn variant="secondary" style={{ fontSize: 12 }}>Set schedule…</Btn>
          </AdvancedRow>
        </div>
      </div>
    </SectionCard>
  );
};

// ── VM Day 2 Controls ────────────────────────────────────────────────────────

const VmDay2: React.FC<{ resource: InfraResource; onUpdate: (r: InfraResource) => void }> = ({ resource, onUpdate }) => {
  // A VMAppClaim is always exactly one VM — there's no "count" to scale, only size
  // (cpuCores/memoryMi/diskGi, keyed off the T-shirt size).
  const [size, setSize] = React.useState<TShirtSize>(resource.size ?? 'M');
  const [scaling, setScaling] = React.useState(false);
  const [scaleStep, setScaleStep] = React.useState(-1);
  const [scaleDone, setScaleDone] = React.useState(false);
  const SCALE_STEPS = ['Validating', 'Resizing', 'Complete'];

  const calcCost = (s: TShirtSize) => {
    const rate = PRICING.private.size[s].hourly;
    return Math.round((rate * 730 + PRICING.private.networkingPerNode) * 100) / 100;
  };
  const newCost = calcCost(size);
  const delta = newCost - resource.monthlyCost;

  const applyScale = async () => {
    setScaling(true);
    setScaleDone(false);
    for (let i = 0; i < SCALE_STEPS.length; i++) {
      setScaleStep(i);
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
    }
    await infraOnboardingClient.scaleResource(resource.id, {});
    setScaleDone(true);
    setScaling(false);
    onUpdate({ ...resource, size, monthlyCost: newCost });
  };

  return (
    <SectionCard title={`DAY 2 OPERATIONS: ${resource.name}`} demo>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
            Current Size: <strong>{resource.size ?? 'M'}</strong>
          </p>
        </div>

        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>Resize VM</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {SIZE_OPTIONS.map(o => (
              <Btn
                key={o.value}
                onClick={() => setSize(o.value)}
                variant={size === o.value ? 'primary' : 'secondary'}
                style={{ fontSize: 13, padding: '6px 16px' }}
              >
                {o.label}
              </Btn>
            ))}
          </div>
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--ds-surface-alt)', borderRadius: 10 }}>
          <CostDeltaRow label="New Estimated Cost" value={`$${newCost.toFixed(2)} / month`} />
          <CostDeltaRow label="Current Cost" value={`$${resource.monthlyCost.toFixed(2)} / month`} />
          <div style={{ borderTop: '1px solid var(--ds-hairline)', margin: '8px 0' }} />
          <CostDeltaRow
            label="Cost Delta"
            value={`${delta >= 0 ? '+' : ''}$${delta.toFixed(2)} / month ${delta >= 0 ? '▲' : '▼'}`}
            color={delta > 0 ? 'var(--ds-warn)' : delta < 0 ? 'var(--ds-success)' : 'var(--ds-text-primary)'}
          />
        </div>

        {scaling && <ScaleProgress steps={SCALE_STEPS} current={scaleStep} done={scaleDone} />}
        {scaleDone && <p style={{ margin: 0, fontSize: 13, fontFamily: FONT, color: 'var(--ds-success)' }}>✅ Resize operation complete</p>}
        {!scaling && size !== (resource.size ?? 'M') && <Btn onClick={applyScale}>Apply Resize</Btn>}

        <div style={{ borderTop: '1px solid var(--ds-hairline)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <AdvancedRow label="Restart VM">
            <Btn variant="secondary" style={{ fontSize: 12 }}>Restart</Btn>
          </AdvancedRow>
          <AdvancedRow label="Snapshot">
            <Btn variant="secondary" style={{ fontSize: 12 }}>Create Snapshot</Btn>
          </AdvancedRow>
        </div>
      </div>
    </SectionCard>
  );
};

const CostDeltaRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
    <span style={{ fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>{label}</span>
    <span style={{ fontSize: 12, fontFamily: MONO, fontWeight: 600, color: color ?? 'var(--ds-text-primary)' }}>{value}</span>
  </div>
);

const AdvancedRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>{label}:</span>
      <DemoChip style={{ fontSize: 9 }} />
      <span style={{ fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: FONT, cursor: 'help' }}
        title="Available in enterprise deployment">ⓘ</span>
    </div>
    {children}
  </div>
);

// ── Condensed resource list ───────────────────────────────────────────────────

const ResourceListItem: React.FC<{ resource: InfraResource; selected: boolean; onClick: () => void }> = ({ resource, selected, onClick }) => (
  <button
    onClick={onClick}
    style={{
      width: '100%', padding: '12px 14px', textAlign: 'left', cursor: 'pointer',
      border: `1.5px solid ${selected ? 'var(--ds-focus)' : 'var(--ds-hairline)'}`,
      borderRadius: 10, background: selected ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface)',
      transition: 'all 0.15s',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ fontSize: 13, fontWeight: 600, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>{resource.name}</span>
      <span style={{ fontSize: 11, fontFamily: FONT, color: resource.status === 'running' ? 'var(--ds-success)' : 'var(--ds-warn)' }}>
        {resource.status === 'running' ? '✅' : '⚠'} {resource.status}
      </span>
    </div>
    <span style={{ fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>
      {resource.infraType === 'kubernetes' ? '☸' : '🖥'} {resource.infraType}
      {' · '}
      <span style={{ textTransform: 'capitalize' }}>{resource.environment}</span>
    </span>
  </button>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const Day2OpsPage: React.FC = () => {
  const location = useLocation();
  const preSelected = new URLSearchParams(location.search).get('resource');
  const [resources, setResources] = React.useState<InfraResource[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selected, setSelected] = React.useState<string | null>(preSelected);

  React.useEffect(() => {
    infraOnboardingClient.getResources().then(r => {
      setResources(r);
      if (!selected && r.length > 0) setSelected(r[0].id);
      setLoading(false);
    });
  }, []);

  const selectedResource = resources.find(r => r.id === selected) ?? null;

  const handleUpdate = (updated: InfraResource) => {
    setResources(rs => rs.map(r => r.id === updated.id ? updated : r));
  };

  return (
    <div style={{ fontFamily: FONT }}>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
        Scale, restart, and manage your provisioned infrastructure resources.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Left panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 600, fontFamily: FONT, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Your Resources
          </p>
          {loading ? (
            [1, 2].map(i => <div key={i} style={{ height: 72, borderRadius: 10, background: 'var(--ds-surface-alt)' }} />)
          ) : (
            resources.map(r => (
              <ResourceListItem key={r.id} resource={r} selected={r.id === selected} onClick={() => setSelected(r.id)} />
            ))
          )}
        </div>

        {/* Right panel */}
        <div>
          {!selectedResource && !loading && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>
              Select a resource to manage
            </div>
          )}
          {selectedResource && selectedResource.infraType === 'kubernetes' && (
            <K8sDay2 resource={selectedResource} onUpdate={handleUpdate} />
          )}
          {selectedResource && selectedResource.infraType === 'vm' && (
            <VmDay2 resource={selectedResource} onUpdate={handleUpdate} />
          )}
        </div>
      </div>
    </div>
  );
};
