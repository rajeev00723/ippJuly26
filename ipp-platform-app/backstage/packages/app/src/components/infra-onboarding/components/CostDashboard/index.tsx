import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { InfraResource, CostDataPoint, ResourceStatus } from '../../types';
import { infraOnboardingClient } from '../../api/InfraOnboardingClient';
import { generateCostTimeSeries } from '../../api/mockData';
import { DemoChip, CloudTypeBadge, FONT, MONO } from '../shared';

const STATUS_ICON: Record<ResourceStatus, string> = {
  running: '✅', stopped: '⏹', provisioning: '⏳', error: '❌',
};
const STATUS_COLOR: Record<ResourceStatus, string> = {
  running: 'var(--ds-success)', stopped: 'var(--ds-text-tertiary)',
  provisioning: 'var(--ds-warn)', error: 'var(--ds-error)',
};

// ── SVG Line Chart ─────────────────────────────────────────────────────────────

const LineChart: React.FC<{ data: CostDataPoint[] }> = ({ data }) => {
  const W = 700, H = 180, PAD = { top: 16, right: 16, bottom: 36, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const allValues = data.flatMap(d => [d.forecasted, d.actual]);
  const minVal = Math.min(...allValues) * 0.97;
  const maxVal = Math.max(...allValues) * 1.03;

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * innerW;
  const yScale = (v: number) => PAD.top + (1 - (v - minVal) / (maxVal - minVal)) * innerH;

  const toPath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`).join(' ');

  const forecastPath = toPath(data.map(d => d.forecasted));
  const actualPath = toPath(data.map(d => d.actual));

  const yTicks = [minVal, (minVal + maxVal) / 2, maxVal].map(v => Math.round(v));
  const xTicks = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* Y-axis ticks */}
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)} stroke="var(--ds-hairline)" strokeWidth={1} />
          <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize={10} fill="var(--ds-text-tertiary)" fontFamily={MONO}>
            ${v}
          </text>
        </g>
      ))}

      {/* X-axis ticks */}
      {xTicks.map(i => (
        <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--ds-text-tertiary)" fontFamily={FONT}>
          {data[i]?.date?.slice(5) ?? ''}
        </text>
      ))}

      {/* Lines */}
      <path d={forecastPath} fill="none" stroke="var(--ds-focus)" strokeWidth={2} strokeDasharray="6 4" />
      <path d={actualPath}   fill="none" stroke="var(--ds-success)" strokeWidth={2} />
    </svg>
  );
};

// ── Summary Card ──────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div style={{
    background: 'var(--ds-surface)', border: '1px solid var(--ds-hairline)',
    borderRadius: 14, padding: '16px 20px', boxShadow: 'var(--ds-shadow-resting)',
  }}>
    <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: FONT, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
    <p style={{ margin: 0, fontSize: 24, fontWeight: 700, fontFamily: MONO, color: 'var(--ds-text-primary)' }}>{value}</p>
    {sub && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>{sub}</p>}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

export const CostDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [resources, setResources] = React.useState<InfraResource[]>([]);
  const [timeSeries] = React.useState<CostDataPoint[]>(() => generateCostTimeSeries(30));
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    infraOnboardingClient.getResources().then(r => {
      setResources(r);
      setLoading(false);
    });
  }, []);

  const totalForecast = resources.reduce((s, r) => s + r.forecastCost, 0);
  const totalActual   = resources.reduce((s, r) => s + r.monthlyCost, 0);

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Page-level DEMO banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        padding: '10px 16px', background: 'var(--ds-chip-warn-bg)',
        border: '1px solid var(--ds-warn)', borderRadius: 10,
      }}>
        <DemoChip />
        <span style={{ fontSize: 13, color: 'var(--ds-warn)', fontFamily: FONT, fontWeight: 600 }}>
          Representative Data — All figures are simulated for demo purposes
        </span>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <SummaryCard label="Total Forecasted This Month" value={`$${totalForecast.toFixed(0)}`} sub="Across all resources" />
        <SummaryCard label="Total Actual (MTD)"          value={`$${totalActual.toFixed(0)}`}   sub="Month-to-date charges" />
        <SummaryCard label="Resources Provisioned"       value={String(resources.length)}        sub="Active environments" />
      </div>

      {/* Line chart */}
      <div style={{
        background: 'var(--ds-surface)', border: '1px solid var(--ds-hairline)',
        borderRadius: 16, padding: '20px', boxShadow: 'var(--ds-shadow-resting)', marginBottom: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>
            Forecasted vs Actual Cost — Last 30 Days
          </p>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <LegendItem color="var(--ds-focus)" dashed label="Forecasted" />
            <LegendItem color="var(--ds-success)" label="Actual" />
            <DemoChip />
          </div>
        </div>
        <LineChart data={timeSeries} />
      </div>

      {/* Resource breakdown table */}
      <div style={{
        background: 'var(--ds-surface)', border: '1px solid var(--ds-hairline)',
        borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--ds-shadow-resting)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--ds-hairline)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>Resource Breakdown</p>
          <DemoChip />
        </div>
        {loading ? (
          <div style={{ padding: 24 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 40, marginBottom: 8, borderRadius: 6, background: 'var(--ds-surface-alt)' }} />
            ))}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Resource', 'Type', 'Environment', 'Forecast', 'Actual MTD', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ds-text-tertiary)', fontFamily: FONT, borderBottom: '1px solid var(--ds-hairline)', background: 'var(--ds-surface)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resources.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--ds-hairline)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: FONT, fontWeight: 600, color: 'var(--ds-text-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.name}
                      {r.cloudType && <CloudTypeBadge cloudType={r.cloudType} />}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 980, fontFamily: FONT, fontWeight: 600, fontSize: 11,
                      background: r.infraType === 'kubernetes' ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface-alt)',
                      color: r.infraType === 'kubernetes' ? 'var(--ds-chip-info-text)' : 'var(--ds-text-secondary)',
                    }}>
                      {r.infraType === 'kubernetes' ? 'K8s' : 'VM'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: FONT, color: 'var(--ds-text-secondary)', textTransform: 'capitalize' }}>
                    {r.environment}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: MONO, color: 'var(--ds-text-primary)' }}>
                    ${r.forecastCost.toFixed(0)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontFamily: MONO, color: 'var(--ds-text-primary)' }}>
                    ${r.monthlyCost.toFixed(0)}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: FONT, color: STATUS_COLOR[r.status] }}>
                    {STATUS_ICON[r.status]} {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => navigate(`/infra-onboarding/day2?resource=${r.id}`)}
                      style={{ fontSize: 12, fontFamily: FONT, color: 'var(--ds-chip-info-text)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                    >
                      Day 2 Ops →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const LegendItem: React.FC<{ color: string; dashed?: boolean; label: string }> = ({ color, dashed, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <svg width={20} height={10}>
      <line x1={0} y1={5} x2={20} y2={5} stroke={color} strokeWidth={2} strokeDasharray={dashed ? '4 3' : undefined} />
    </svg>
    <span style={{ fontSize: 12, fontFamily: FONT, color: 'var(--ds-text-secondary)' }}>{label}</span>
  </div>
);
