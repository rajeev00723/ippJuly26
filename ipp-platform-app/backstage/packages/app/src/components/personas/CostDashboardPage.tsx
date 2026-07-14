import React from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { MetricCard, DsCard, TH, TD, BackBreadcrumb } from './shared';

import { tokens as _fTokens, dhl } from '../../design-system/tokens';
const FONT = _fTokens.font.sans;
const MONO = "'SF Mono',ui-monospace,'JetBrains Mono',Menlo,monospace";

// ─── Data ──────────────────────────────────────────────────────────────────────

const namespaceCosts = [
  { namespace:'employee-app',      daily:4.75,  monthly:142.50, cpu:'$89.20',  memory:'$42.10', storage:'$11.20', trend:'up'   },
  { namespace:'aiops',             daily:1.27,  monthly:38.20,  cpu:'$25.10',  memory:'$10.60', storage:'$2.50',  trend:'flat' },
  { namespace:'monitoring',        daily:0.76,  monthly:22.80,  cpu:'$14.20',  memory:'$7.10',  storage:'$1.50',  trend:'down' },
  { namespace:'crossplane-system', daily:0.40,  monthly:12.10,  cpu:'$8.00',   memory:'$3.50',  storage:'$0.60',  trend:'flat' },
  { namespace:'argocd',            daily:0.28,  monthly:8.40,   cpu:'$5.50',   memory:'$2.50',  storage:'$0.40',  trend:'flat' },
  { namespace:'backstage',         daily:0.23,  monthly:7.00,   cpu:'$4.40',   memory:'$2.00',  storage:'$0.60',  trend:'flat' },
];

const totalMonthly = namespaceCosts.reduce((acc, n) => acc + n.monthly, 0);
const totalDaily   = namespaceCosts.reduce((acc, n) => acc + n.daily,   0);

function TrendArrow({ trend }: { trend: string }) {
  if (trend === 'up')
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', color:'var(--ds-error)', fontWeight:700, fontSize:'12px' }}>
        <span aria-hidden="true">▲</span>
        <span style={{ fontWeight:500 }}>rising</span>
      </span>
    );
  if (trend === 'down')
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:'3px', color:'var(--ds-success)', fontWeight:700, fontSize:'12px' }}>
        <span aria-hidden="true">▼</span>
        <span style={{ fontWeight:500 }}>falling</span>
      </span>
    );
  return <span style={{ color:'var(--ds-text-tertiary)', fontSize:'12px' }}>→ stable</span>;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const CostDashboardPage = () => (
  <AppleShell title="Cost Dashboard">
    <div style={{ fontFamily:FONT, background:'var(--ds-bg)', minHeight:'100%', overflow:'hidden' }}>

      <BackBreadcrumb label="Operations Dashboard" to="/operations" />
      <p style={{ margin:'0 0 20px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>
        Per-namespace cost attribution, spend trends, and FinOps anomaly signals — OpenCost · ACME Corp
      </p>

      {/* KPI Grid — cost-per-dev first for executive impact */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' }}>
        <MetricCard label="Cost per Developer"  value="$37"                            sub="6 engineers / month"      accentColor="var(--ds-success)" />
        <MetricCard label="Monthly Estimate"    value={`$${Math.round(totalMonthly)}`} sub="idp-demo-cluster total"   accentColor={dhl.yellow} />
        <MetricCard label="Daily Spend"         value={`$${totalDaily.toFixed(2)}`}    sub="Last 24 hours"            accentColor="var(--clr-compose)" />
        <MetricCard label="Namespaces"          value={namespaceCosts.length}          sub="Tracked by OpenCost"      accentColor="var(--ds-warn)" />
      </div>

      {/* 2-col: Table + Cost Share */}
      <div style={{ display:'grid', gridTemplateColumns:'8fr 4fr', gap:'16px', marginBottom:'20px' }}>
        <DsCard
          title="Namespace Cost Breakdown"
          subtitle="Monthly cost allocation by Kubernetes namespace"
        >
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'10px' }}>
            <a href="http://localhost:9090" target="_blank" rel="noopener noreferrer"
              style={{ padding:'6px 14px', borderRadius:'980px', border:'1px solid var(--ds-hairline)', fontSize:'12px', fontWeight:600, color:'var(--ds-text-primary)', textDecoration:'none', fontFamily:FONT }}>
              ↗ Open OpenCost UI
            </a>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Namespace','CPU Cost','Memory Cost','Storage Cost','Monthly Total','Daily','Trend'].map(h=><TH key={h}>{h}</TH>)}</tr>
            </thead>
            <tbody>
              {namespaceCosts.map(ns => (
                <tr key={ns.namespace}>
                  <TD><span style={{ fontFamily:MONO, fontSize:'12px' }}>{ns.namespace}</span></TD>
                  <TD>{ns.cpu}</TD>
                  <TD>{ns.memory}</TD>
                  <TD>{ns.storage}</TD>
                  <TD><span style={{ fontWeight:700 }}>${ns.monthly.toFixed(2)}</span></TD>
                  <TD>${ns.daily.toFixed(2)}</TD>
                  <TD><TrendArrow trend={ns.trend} /></TD>
                </tr>
              ))}
              <tr style={{ background:'var(--ds-surface-alt)' }}>
                <td style={{ padding:'10px 12px', fontWeight:700, fontSize:'13px', fontFamily:FONT }} colSpan={4}>Total</td>
                <td style={{ padding:'10px 12px', fontWeight:700, fontSize:'13px', fontFamily:FONT }}>${totalMonthly.toFixed(2)}</td>
                <td style={{ padding:'10px 12px', fontWeight:700, fontSize:'13px', fontFamily:FONT }}>${totalDaily.toFixed(2)}</td>
                <td style={{ padding:'10px 12px' }} />
              </tr>
            </tbody>
          </table>
        </DsCard>

        <DsCard title="Cost Share" subtitle="Percentage of cluster cost per namespace">
          {namespaceCosts.map(ns => {
            const pct = (ns.monthly / totalMonthly) * 100;
            const barColor = pct > 30 ? 'var(--ds-warn)' : 'var(--ds-focus)';
            return (
              <div key={ns.namespace} style={{ marginBottom:'14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                  <span style={{ fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:MONO }}>{ns.namespace}</span>
                  <span style={{ fontSize:'12px', fontWeight:600, color: pct > 30 ? 'var(--ds-warn)' : 'var(--ds-text-secondary)', fontFamily:FONT }}>{pct.toFixed(1)}%</span>
                </div>
                <div style={{ height:'8px', borderRadius:'4px', background:'var(--ds-hairline)', overflow:'hidden' }}>
                  <div style={{ width:`${pct}%`, height:'100%', background:barColor, borderRadius:'4px', transition:'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </DsCard>
      </div>

      {/* 2-col: Projections + Optimization */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
        <DsCard title="Cost Projections" subtitle="Forecasted spend based on current usage">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Period','Estimated Cost','vs Last Period'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {[
                { period:'This Month (remaining)', cost:`$${(totalMonthly*0.55).toFixed(2)}`,  change:'+2%' },
                { period:'Next Month (projected)',  cost:`$${(totalMonthly*1.02).toFixed(2)}`,  change:'+2%' },
                { period:'Q3 2024 (projected)',     cost:`$${(totalMonthly*3.1).toFixed(2)}`,   change:'+5%' },
                { period:'Annual Run Rate',         cost:`$${(totalMonthly*12.5).toFixed(2)}`,  change:'+3%' },
              ].map(row=>(
                <tr key={row.period}>
                  <TD>{row.period}</TD>
                  <TD><span style={{ fontWeight:700 }}>{row.cost}</span></TD>
                  <TD>
                    <span style={{ padding:'3px 10px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                      background: row.change.startsWith('+')?'var(--ds-chip-warn-bg)':'var(--ds-chip-success-bg)',
                      color: row.change.startsWith('+')?'var(--ds-chip-warn-text)':'var(--ds-chip-success-text)' }}>
                      {row.change}
                    </span>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </DsCard>

        <DsCard title="Cost Optimization Opportunities" subtitle="AI-identified savings recommendations">
          {[
            { tip:'Right-size employee-backend pods',                 saving:'$18/mo', priority:'High',   detail:'CPU requests 4x actual usage',                       left:'var(--ds-error)' },
            { tip:'Enable cluster autoscaler off-hours scaling',       saving:'$35/mo', priority:'Medium', detail:'Scale down after 7pm on dev cluster',                 left:'var(--ds-warn)' },
            { tip:'Use spot instances for monitoring stack',           saving:'$12/mo', priority:'Low',    detail:'Prometheus/Grafana tolerates interruptions',           left:'var(--ds-success)' },
          ].map((t,idx) => (
            <div key={idx} style={{ marginBottom:'12px', padding:'14px', border:'1px solid var(--ds-hairline)', borderRadius:'12px', borderLeft:`4px solid ${t.left}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px' }}>
                <p style={{ margin:0, fontWeight:700, fontSize:'13px', fontFamily:FONT, color:'var(--ds-text-primary)' }}>{t.tip}</p>
                <span style={{ padding:'3px 10px', borderRadius:'980px', fontSize:'11px', fontWeight:700, background:'var(--ds-chip-info-bg)', color:'var(--ds-chip-info-text)', fontFamily:FONT, whiteSpace:'nowrap', marginLeft:'8px' }}>Save {t.saving}</span>
              </div>
              <p style={{ margin:'0 0 6px', fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{t.detail}</p>
              <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                background: t.priority==='High'?'var(--ds-chip-error-bg)': t.priority==='Medium'?'var(--ds-chip-warn-bg)':'var(--ds-chip-success-bg)',
                color: t.priority==='High'?'var(--ds-chip-error-text)': t.priority==='Medium'?'var(--ds-chip-warn-text)':'var(--ds-chip-success-text)' }}>{t.priority}</span>
            </div>
          ))}
        </DsCard>
      </div>

    </div>
  </AppleShell>
);
