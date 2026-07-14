import React from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { StatusChip, MetricCard, DsCard, TH, TD, BackBreadcrumb } from './shared';
import { tokens } from '../../design-system/tokens';

// ─── Design System helpers ─────────────────────────────────────────────────────

const FONT = tokens.font.sans;
const MONO = tokens.font.mono;

// ─── Static demo data ──────────────────────────────────────────────────────────

const providers = [
  { name: 'provider-kubernetes', version: 'v0.12.1', health: 'Healthy', installed: true, packages: 142 },
  { name: 'provider-helm',       version: 'v0.18.4', health: 'Healthy', installed: true, packages: 58  },
];

const crds = [
  {
    name: 'xthretierapps.platform.iip.com',
    established: 'True',
    version: 'v1alpha1',
    scope: 'Cluster',
    claimNames: 'ThreeTierAppClaim',
  },
];

const compositions = [
  {
    name: 'three-tier-app',
    xrd: 'XThreeTierApp',
    revision: '1',
    compositeCount: 2,
    patchSets: 3,
    status: 'Active',
  },
];

const claims = [
  { name: 'employee-portal', kind: 'ThreeTierAppClaim', namespace: 'employee-app', compositeRef: 'xthretierapps/employee-portal-abc12', ready: 'True', synced: 'True', age: '2d' },
  { name: 'demo-app',        kind: 'ThreeTierAppClaim', namespace: 'demo',         compositeRef: 'xthretierapps/demo-app-xyz89',          ready: 'True', synced: 'True', age: '5h' },
];

const reconEvents = [
  { resource: 'XThreeTierApp/employee-portal',              event: 'Successfully reconciled',       time: '30s ago', type: 'Normal' },
  { resource: 'XThreeTierApp/demo-app',                     event: 'Successfully reconciled',       time: '2m ago',  type: 'Normal' },
  { resource: 'ProviderRevision/provider-kubernetes-v0.12.1', event: 'Provider package installed',  time: '3h ago',  type: 'Normal' },
];

const COMPOSITION_RESOURCES = [
  { kind: 'Namespace',    desc: 'Isolated team namespace with resource quota' },
  { kind: 'Deployment',   desc: 'Frontend React app (2 replicas, rolling update)' },
  { kind: 'Deployment',   desc: 'Backend Go API (2 replicas, rolling update)' },
  { kind: 'StatefulSet',  desc: 'PostgreSQL 16 database (1 replica, PVC)' },
  { kind: 'Service',      desc: 'ClusterIP services for each tier' },
  { kind: 'Ingress',      desc: 'NGINX ingress with hostname routing' },
  { kind: 'NetworkPolicy',desc: 'Cilium zero-trust isolation policy' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export const CrossplaneDashboardPage = () => (
  <AppleShell title="Crossplane Control Plane">
    <div style={{ fontFamily:FONT, background:'var(--ds-bg)', minHeight:'100%', overflow:'hidden' }}>

      <BackBreadcrumb label="Platform Engineering" to="/platform" />
      {/* Subtitle */}
      <p style={{ margin:'0 0 20px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>
        XRD composition status, provider health, active claims, and reconciliation state
      </p>

      {/* KPI Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' }}>
        <MetricCard label="Providers"     value={providers.length}    sub="All healthy" />
        <MetricCard label="XRDs"          value={crds.length}         sub="Platform API extensions" />
        <MetricCard label="Compositions"  value={compositions.length} sub="Infrastructure templates" />
        <MetricCard label="Active Claims" value={claims.length}       sub="Developer-provisioned" />
      </div>

      {/* Composition Concept */}
      <DsCard
        title="Composition — What One XRD Provisions"
        subtitle="XThreeTierApp: a single developer claim creates all of these Kubernetes resources automatically"
        style={{ marginBottom:'20px' }}
      >
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'12px' }}>
          {COMPOSITION_RESOURCES.map((r, i) => (
            <div key={i} style={{ background:'var(--ds-surface-alt)', borderRadius:'10px', padding:'12px' }}>
              <span style={{ display:'inline-block', fontFamily:MONO, fontWeight:700, fontSize:'12px', background:'var(--ds-chip-info-bg)', color:'var(--ds-chip-info-text)', border:'1px solid var(--ds-chip-info-border)', borderRadius:'4px', padding:'1px 6px', marginBottom:'6px' }}>{r.kind}</span>
              <p style={{ margin:0, fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT, lineHeight:1.45 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ background:'var(--ds-chip-info-bg)', border:'1px solid var(--ds-chip-info-border)', borderRadius:'8px', padding:'10px 14px' }}>
          <p style={{ margin:0, fontSize:'12px', color:'var(--ds-chip-info-text)', fontFamily:FONT, lineHeight:1.6 }}>
            <strong>Key insight:</strong> A developer submits one <code style={{ fontFamily:MONO, fontSize:'11px' }}>ThreeTierAppClaim</code> YAML.
            Crossplane's composition reconciler creates all 7 resource types above — automatically, consistently, and with zero platform tickets.
          </p>
        </div>
      </DsCard>

      {/* 2-col: Providers + XRDs */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        <DsCard title="Crossplane Providers" subtitle="Control plane provider packages — health and installed CRD count">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Provider','Version','Health','CRDs'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {providers.map(p=>(
                <tr key={p.name}>
                  <TD><span style={{ fontFamily:MONO, fontWeight:600, fontSize:'12px' }}>{p.name}</span></TD>
                  <TD useMono>{p.version}</TD>
                  <TD><StatusChip status={p.health} /></TD>
                  <TD><span style={{ fontFamily:MONO, fontWeight:600 }}>{p.packages}</span></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </DsCard>

        <DsCard title="Composite Resource Definitions (XRDs)" subtitle="Platform API extensions — abstract infrastructure as simple developer claims">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['XRD Name','Version','Scope','Claim Kind','Established'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {crds.map(crd=>(
                <tr key={crd.name}>
                  <TD><span style={{ fontFamily:MONO, fontWeight:600, fontSize:'11px' }}>{crd.name}</span></TD>
                  <TD useMono>{crd.version}</TD>
                  <TD><span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:600, background:'var(--ds-surface-alt)', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{crd.scope}</span></TD>
                  <TD><span style={{ fontFamily:MONO, fontWeight:600, color:'var(--clr-compose)', fontSize:'12px' }}>{crd.claimNames}</span></TD>
                  <TD><StatusChip status={crd.established} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </DsCard>
      </div>

      {/* 2-col: Compositions + Claims */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'16px' }}>
        <DsCard title="Compositions" subtitle="Infrastructure templates — maps XRD → set of managed Kubernetes resources">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Composition','XRD','Revision','Composites','Patch Sets','Status'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {compositions.map(c=>(
                <tr key={c.name}>
                  <TD><span style={{ fontWeight:600 }}>{c.name}</span></TD>
                  <TD><span style={{ fontFamily:MONO, color:'var(--clr-compose)', fontWeight:600, fontSize:'12px' }}>{c.xrd}</span></TD>
                  <TD useMono>v{c.revision}</TD>
                  <TD><span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, background: c.compositeCount>0?'var(--ds-chip-info-bg)':'var(--ds-surface-alt)', color: c.compositeCount>0?'var(--ds-chip-info-text)':'var(--ds-text-secondary)', fontFamily:FONT }}>{c.compositeCount}</span></TD>
                  <TD><span style={{ fontFamily:MONO, color:'var(--ds-text-secondary)', fontSize:'12px' }}>{c.patchSets}</span></TD>
                  <TD><StatusChip status={c.status} /></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </DsCard>

        <DsCard title="Active Claims" subtitle="ThreeTierAppClaim instances submitted by developers via Backstage">
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Claim','Kind','Namespace','Ready','Synced','Age'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {claims.map(claim=>(
                <tr key={claim.name}>
                  <TD><span style={{ fontWeight:600 }}>{claim.name}</span></TD>
                  <TD><span style={{ fontFamily:MONO, color:'var(--clr-compose)', fontSize:'12px' }}>{claim.kind}</span></TD>
                  <TD useMono>{claim.namespace}</TD>
                  <TD><StatusChip status={claim.ready} /></TD>
                  <TD><StatusChip status={claim.synced} /></TD>
                  <TD><span style={{ color:'var(--ds-text-tertiary)', fontSize:'12px' }}>{claim.age}</span></TD>
                </tr>
              ))}
            </tbody>
          </table>
        </DsCard>
      </div>

      {/* Reconciliation Events */}
      <DsCard title="Reconciliation Events" subtitle="Recent Crossplane controller activity — continuous desired-state enforcement">
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'12px' }}>
          <thead><tr>{['Resource','Event','Type','Time'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
          <tbody>
            {reconEvents.map((e,i)=>(
              <tr key={i}>
                <TD><span style={{ fontFamily:MONO, fontWeight:600, fontSize:'12px' }}>{e.resource}</span></TD>
                <TD><span style={{ color:'var(--ds-text-secondary)', fontSize:'13px' }}>{e.event}</span></TD>
                <TD>
                  <span style={{ padding:'3px 10px', borderRadius:'980px', fontSize:'12px', fontWeight:600, fontFamily:FONT,
                    background: e.type==='Normal'?'var(--ds-chip-success-bg)':'var(--ds-chip-warn-bg)',
                    color: e.type==='Normal'?'var(--ds-chip-success-text)':'var(--ds-chip-warn-text)',
                    border: `1px solid ${e.type==='Normal'?'var(--ds-chip-success-border)':'var(--ds-chip-warn-border)'}` }}>
                    {e.type}
                  </span>
                </TD>
                <TD><span style={{ color:'var(--ds-text-tertiary)', whiteSpace:'nowrap', fontSize:'12px' }}>{e.time}</span></TD>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ background:'var(--ds-chip-info-bg)', border:'1px solid var(--ds-chip-info-border)', borderRadius:'10px', padding:'14px 18px' }}>
          <p style={{ margin:'0 0 6px', fontSize:'11px', fontWeight:700, color:'var(--clr-compose)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>Demo Storyline — Platform Engineer (Crossplane)</p>
          <p style={{ margin:0, fontSize:'12px', color:'var(--ds-chip-info-text)', fontFamily:FONT, lineHeight:1.7 }}>
            <strong>Show:</strong> Both providers are healthy — Crossplane can provision Kubernetes resources and Helm charts.
            Point to the XRD: <em>one YAML definition is the entire platform abstraction</em>.
            Show an active claim — this is what a developer submitted in &lt;90s via Backstage.
            The reconciliation events prove the control loop is continuously enforcing desired state.
            Navigate to <strong>/platform</strong> to see Argo CD sync status alongside.
          </p>
        </div>
      </DsCard>

    </div>
  </AppleShell>
);
