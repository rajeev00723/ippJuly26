import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { dhl, tokens } from '../../design-system/tokens';
import { MetricCard, DsCard, BackBreadcrumb } from './shared';

const FONT = tokens.font.sans;

// ─── Data ──────────────────────────────────────────────────────────────────────

const pillars = [
  {
    name:'Network Segmentation',
    score:95,
    description:'Cilium network policies enforced on all namespaces',
    checks:[
      { name:'Default-deny policy in all app namespaces', status:'pass' },
      { name:'mTLS enforced between all services',        status:'pass' },
      { name:'Ingress restricted to authorized sources',  status:'pass' },
      { name:'No NodePort services exposed',              status:'pass' },
      { name:'Hubble flow audit enabled',                 status:'pass' },
    ],
  },
  {
    name:'Identity & Authentication',
    score:100,
    description:'SPIFFE/SPIRE workload identity for all pods',
    checks:[
      { name:'All workloads have SPIFFE identity',    status:'pass' },
      { name:'Service account tokens auto-rotated',  status:'pass' },
      { name:'OIDC integration enabled',             status:'pass' },
      { name:'No default service accounts used',     status:'pass' },
    ],
  },
  {
    name:'Policy Enforcement',
    score:88,
    description:'OPA Gatekeeper policies enforced in all namespaces',
    checks:[
      { name:'Resource limits required on all pods',     status:'pass'    },
      { name:'No privileged containers allowed',         status:'pass'    },
      { name:'Image pull policy enforced',               status:'pass'    },
      { name:'Non-root containers required',             status:'warning' },
      { name:'Read-only root filesystem required',       status:'warning' },
    ],
  },
  {
    name:'RBAC Hygiene',
    score:82,
    description:'Least-privilege access control for all service accounts',
    checks:[
      { name:'No wildcard permissions in production',  status:'pass'    },
      { name:'cluster-admin not bound to regular users',status:'pass'   },
      { name:'Developer SA scoped to namespace',        status:'warning' },
      { name:'Regular RBAC review process',            status:'pass'    },
    ],
  },
  {
    name:'Secrets Management',
    score:90,
    description:'External Secrets Operator with Vault backend',
    checks:[
      { name:'No secrets hardcoded in manifests',      status:'pass'    },
      { name:'Secrets rotated every 30 days',          status:'pass'    },
      { name:'Encryption at rest enabled',             status:'pass'    },
      { name:'Audit logging for secret access',        status:'pass'    },
      { name:'Secret scanning in CI/CD pipeline',      status:'warning' },
    ],
  },
];

const overallScore = Math.round(pillars.reduce((acc, p) => acc + p.score, 0) / pillars.length);

function CheckMark({ status }: { status: string }) {
  if (status === 'pass')    return <CheckCircle2  size={15} strokeWidth={2} color="var(--ds-success)" />;
  if (status === 'warning') return <AlertTriangle size={15} strokeWidth={2} color="var(--ds-warn)" />;
  return                           <XCircle       size={15} strokeWidth={2} color="var(--ds-error)" />;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export const SecurityPosturePage = () => {
  const excellent = pillars.filter(p => p.score>=90).length;
  const good      = pillars.filter(p => p.score>=75 && p.score<90).length;
  const needsWork = pillars.filter(p => p.score<75).length;

  return (
    <AppleShell title="Security Posture">
      <div style={{ fontFamily:FONT, background:'var(--ds-bg)', minHeight:'100%', overflow:'hidden' }}>

        <BackBreadcrumb label="Security Dashboard" to="/security" />
        <p style={{ margin:'0 0 20px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>
          SPIRE workload identities, Cilium network posture, OPA + Kyverno policy enforcement — ACME Corp
        </p>

        {/* KPI Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' }}>
          <MetricCard label="Zero Trust Score"   value={`${overallScore}/100`} sub={overallScore>=90?'Excellent':overallScore>=75?'Good':'Needs Improvement'} accentColor={dhl.yellow} />
          <MetricCard label="Pillars Excellent"  value={excellent}             sub="Score ≥ 90"   accentColor={dhl.yellow} />
          <MetricCard label="Pillars Good"       value={good}                  sub="Score 75–89"  accentColor="var(--ds-warn)" />
          <MetricCard label="Pillars Need Work"  value={needsWork}             sub="Score < 75"   accentColor={needsWork>0?'var(--ds-error)':'var(--ds-text-tertiary)'} />
        </div>

        {/* 2-col: Score Circle + Pillar Bars */}
        <div style={{ display:'grid', gridTemplateColumns:'3fr 5fr', gap:'16px', marginBottom:'20px' }}>
          <DsCard title="Overall Zero Trust Score" subtitle="Composite score across all zero-trust pillars">
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'16px 0' }}>
              <div style={{ width:'120px', height:'120px', borderRadius:'50%', border:`8px solid ${dhl.yellow}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <span style={{ fontSize:'2.5rem', fontWeight:900, color:'var(--ds-text-primary)', fontFamily:FONT, lineHeight:1 }}>{overallScore}</span>
                <span style={{ fontSize:'12px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>/100</span>
              </div>
              <span style={{ padding:'4px 14px', borderRadius:'980px', fontSize:'13px', fontWeight:700, background:'rgba(255,204,0,0.12)', color:'var(--ds-text-primary)', fontFamily:FONT, marginBottom:'8px' }}>
                {overallScore>=90?'Excellent':overallScore>=75?'Good':'Needs Improvement'}
              </span>
              <p style={{ margin:0, fontSize:'13px', color:'var(--ds-text-secondary)', textAlign:'center', fontFamily:FONT }}>
                {excellent} pillars excellent · {good} good · {needsWork} needs work
              </p>
            </div>
          </DsCard>

          <DsCard title="Zero Trust Pillars" subtitle="Score breakdown by security domain">
            {pillars.map(pillar => (
              <div key={pillar.name} style={{ marginBottom:'16px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                  <span style={{ fontWeight:600, fontSize:'13px', color:'var(--ds-text-primary)', fontFamily:FONT }}>{pillar.name}</span>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                    <span style={{ fontSize:'13px', color:'var(--ds-text-primary)', fontFamily:FONT }}>{pillar.score}%</span>
                    <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                      background: pillar.score>=90?'rgba(255,204,0,0.12)': pillar.score>=80?'var(--ds-chip-success-bg)':'var(--ds-surface-alt)',
                      color: pillar.score>=90?'var(--ds-success)': pillar.score>=80?'var(--ds-chip-success-text)':'var(--ds-text-tertiary)' }}>
                      {pillar.score>=90?'Excellent': pillar.score>=80?'Good':'Fair'}
                    </span>
                  </div>
                </div>
                <div style={{ height:'8px', borderRadius:'4px', background:'var(--ds-hairline)', overflow:'hidden', marginBottom:'2px' }}>
                  <div style={{ width:`${pillar.score}%`, height:'100%', background: pillar.score>=90?'var(--ds-success)':'var(--ds-warn)', borderRadius:'4px' }} />
                </div>
                <span style={{ fontSize:'11px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>{pillar.description}</span>
              </div>
            ))}
          </DsCard>
        </div>

        {/* Per-Pillar Detail Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          {pillars.map(pillar => (
            <DsCard
              key={pillar.name}
              title={pillar.name}
              subtitle={`Score: ${pillar.score}/100 — ${pillar.description}`}
            >
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding:'6px 12px', textAlign:'left', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ds-text-tertiary)', fontFamily:FONT, borderBottom:'1px solid var(--ds-hairline)', width:'40px' }}>Status</th>
                    <th style={{ padding:'6px 12px', textAlign:'left', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ds-text-tertiary)', fontFamily:FONT, borderBottom:'1px solid var(--ds-hairline)' }}>Check</th>
                  </tr>
                </thead>
                <tbody>
                  {pillar.checks.map((check,idx) => (
                    <tr key={idx}>
                      <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)', textAlign:'center' }}>
                        <CheckMark status={check.status} />
                      </td>
                      <td style={{ padding:'10px 12px', fontSize:'13px', fontFamily:FONT, borderBottom:'1px solid var(--ds-hairline)', color: check.status==='pass'?'var(--ds-text-primary)':'var(--ds-text-secondary)' }}>
                        {check.name}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </DsCard>
          ))}
        </div>

      </div>
    </AppleShell>
  );
};
