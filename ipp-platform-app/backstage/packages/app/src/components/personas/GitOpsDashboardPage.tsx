import React from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { StatusChip, MetricCard, DsCard, TH, TD, BackBreadcrumb } from './shared';
import { tokens } from '../../design-system/tokens';

const FONT = tokens.font.sans;
const MONO = tokens.font.mono;

// ─── Static demo data ──────────────────────────────────────────────────────────

const argoApplications = [
  { name:'employee-portal',      project:'default',  syncStatus:'Synced', healthStatus:'Healthy', revision:'a1b2c3d', lastSync:'2m ago',  repo:'IPS_app_demo', path:'apps/employee-portal',     cluster:'idp-demo-cluster', namespace:'employee-portal'    },
  { name:'crossplane-claims',    project:'default',  syncStatus:'Synced', healthStatus:'Healthy', revision:'d4e5f6a', lastSync:'10m ago', repo:'IPS_app_demo', path:'crossplane/claims',         cluster:'idp-demo-cluster', namespace:'crossplane-system'  },
  { name:'backstage',            project:'platform', syncStatus:'Synced', healthStatus:'Healthy', revision:'b7c8d9e', lastSync:'1h ago',  repo:'IPS_app_demo', path:'apps/backstage',            cluster:'idp-demo-cluster', namespace:'backstage'          },
  { name:'monitoring-stack',     project:'platform', syncStatus:'Synced', healthStatus:'Healthy', revision:'f0a1b2c', lastSync:'3h ago',  repo:'IPS_app_demo', path:'platform/monitoring',       cluster:'idp-demo-cluster', namespace:'monitoring'         },
  { name:'cilium-policies',      project:'platform', syncStatus:'Synced', healthStatus:'Healthy', revision:'c3d4e5f', lastSync:'1h ago',  repo:'IPS_app_demo', path:'networking/cilium',          cluster:'idp-demo-cluster', namespace:'kube-system'        },
  { name:'crossplane-providers', project:'platform', syncStatus:'Synced', healthStatus:'Healthy', revision:'e6f7a8b', lastSync:'4h ago',  repo:'IPS_app_demo', path:'crossplane/providers',      cluster:'idp-demo-cluster', namespace:'crossplane-system'  },
];

const recentCommits = [
  { hash:'a1b2c3d', message:'feat: scaffold employee-portal via IPP Backstage template',             author:'platform-bot',       time:'2m ago'  },
  { hash:'d4e5f6a', message:'chore: update crossplane claims — scale backend to 3 replicas',          author:'platform.engineer',  time:'10m ago' },
  { hash:'b7c8d9e', message:'fix: backstage app-config — update database host reference',              author:'platform.engineer',  time:'1h ago'  },
  { hash:'f0a1b2c', message:'feat: add Grafana dashboards for AIOps agent findings',                  author:'ops.support',        time:'3h ago'  },
  { hash:'c3d4e5f', message:'security: tighten Cilium egress policy for employee-portal',              author:'security.analyst',   time:'1h ago'  },
];

const DELIVERY_STEPS = [
  { label:'Git commit' },
  { label:'Argo CD detects delta' },
  { label:'Sync triggered' },
  { label:'K8s apply' },
  { label:'Health checked' },
  { label:'AIOps monitors' },
];

const PLATFORM_LINKS = [
  { label:'Argo CD UI',  url:'http://argocd.dpcs.local',  desc:'Manage apps, sync, and view diffs' },
  { label:'GitHub Repo', url:'https://github.com/amitabhmanish13/backstage-crossplane-gitops-demo', desc:'Source of truth — all cluster state as code' },
  { label:'Grafana',     url:'http://grafana.dpcs.local', desc:'Deployment metrics and alerting' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export const GitOpsDashboardPage = () => {
  const synced = argoApplications.filter(a => a.syncStatus === 'Synced').length;
  const healthy = argoApplications.filter(a => a.healthStatus === 'Healthy').length;
  const outOfSync = argoApplications.length - synced;

  return (
    <AppleShell title="GitOps Dashboard">
      <div style={{ fontFamily:FONT, background:'var(--ds-bg)', minHeight:'100%', overflow:'hidden' }}>

        <BackBreadcrumb label="Developer Dashboard" to="/developer" />
        <p style={{ margin:'0 0 20px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>
          Argo CD application sync state, GitOps health, and deployment pipeline status
        </p>

        {/* KPI Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'20px' }}>
          <MetricCard label="Managed Apps"  value={argoApplications.length} sub="Argo CD applications" />
          <MetricCard label="Synced"        value={synced}                  sub="Desired = live state" />
          <MetricCard label="Healthy"       value={healthy}                 sub="All replicas available" />
          <MetricCard label="Out of Sync"   value={outOfSync}               sub={outOfSync===0?'No drift detected':'Needs attention'} />
        </div>

        {/* Delivery pipeline — sequential step indicator */}
        <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'14px', padding:'14px 18px', marginBottom:'20px', boxShadow:'var(--ds-shadow-resting)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
            <span style={{ fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.07em', fontSize:'11px', fontFamily:FONT }}>Delivery pipeline</span>
            <span style={{ fontSize:'11px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>avg. &lt;30s end-to-end</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'0' }}>
            {DELIVERY_STEPS.map((step, i, arr) => (
              <React.Fragment key={step.label}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', flex:1, gap:'6px' }}>
                  <div style={{
                    width:'28px', height:'28px', borderRadius:'50%',
                    background:'#1A1A1A', color:'#fff',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'11px', fontWeight:700, fontFamily:FONT, flexShrink:0,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize:'11px', fontWeight:500, color:'var(--ds-text-secondary)', fontFamily:FONT, textAlign:'center', lineHeight:1.3 }}>
                    {step.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ height:'2px', flex:'0 0 20px', background:'var(--ds-focus)', opacity:0.3, marginBottom:'16px' }} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Argo CD Applications Table */}
        <DsCard
          title="Argo CD Applications"
          subtitle="All managed applications — sync and health status across the idp-demo cluster"
          style={{ marginBottom:'20px', overflow:'hidden' }}
        >
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Application','Project','Path','Namespace','Sync','Health','Revision','Last Sync'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
              <tbody>
                {argoApplications.map(app=>(
                  <tr key={app.name}>
                    <TD><span style={{ fontWeight:700 }}>{app.name}</span></TD>
                    <TD>
                      <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                        background: app.project==='platform'?'var(--ds-chip-info-bg)':'var(--ds-chip-success-bg)',
                        color: app.project==='platform'?'var(--clr-compose)':'var(--ds-chip-success-text)',
                        border: `1px solid ${app.project==='platform'?'var(--ds-chip-info-border)':'var(--ds-chip-success-border)'}` }}>
                        {app.project}
                      </span>
                    </TD>
                    <TD><span style={{ fontFamily:MONO, fontSize:'12px', color:'var(--ds-text-secondary)' }}>{app.path}</span></TD>
                    <TD useMono>{app.namespace}</TD>
                    <TD><StatusChip status={app.syncStatus} /></TD>
                    <TD><StatusChip status={app.healthStatus} /></TD>
                    <TD><span style={{ fontFamily:MONO, fontSize:'12px', color:'var(--ds-text-secondary)' }}>{app.revision}</span></TD>
                    <TD><span style={{ color:'var(--ds-text-tertiary)', whiteSpace:'nowrap', fontSize:'12px' }}>{app.lastSync}</span></TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DsCard>

        {/* 2-col: Commits + Links */}
        <div style={{ display:'grid', gridTemplateColumns:'7fr 5fr', gap:'16px' }}>
          <DsCard title="Recent Git Activity" subtitle="Source of truth — amitabhmanish13/IPS_app_demo">
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Commit','Message','Author','Time'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
              <tbody>
                {recentCommits.map(commit=>(
                  <tr key={commit.hash}>
                    <TD><span style={{ fontFamily:MONO, color:'var(--ds-chip-info-text)', fontWeight:700, fontSize:'12px' }}>{commit.hash}</span></TD>
                    <TD><span style={{ color:'var(--ds-text-secondary)', fontSize:'13px' }}>{commit.message}</span></TD>
                    <TD><span style={{ fontFamily:MONO, color:'var(--ds-text-secondary)', fontSize:'12px' }}>{commit.author}</span></TD>
                    <TD><span style={{ color:'var(--ds-text-tertiary)', whiteSpace:'nowrap', fontSize:'12px' }}>{commit.time}</span></TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </DsCard>

          <DsCard title="GitOps Tools & Demo Guide" subtitle="External tooling and demo storyline for GitOps persona">
            <p style={{ margin:'0 0 8px', fontSize:'11px', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>Platform Links</p>
            {PLATFORM_LINKS.map(link=>(
              <div key={link.label} style={{ display:'flex', alignItems:'flex-start', gap:'8px', marginBottom:'12px' }}>
                <span style={{ fontSize:'11px', color:'var(--ds-text-tertiary)', marginTop:'2px' }}>↗</span>
                <div>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--ds-text-primary)', fontSize:'13px', textDecoration:'none', fontWeight:600, fontFamily:FONT }}>{link.label}</a>
                  <p style={{ margin:'2px 0 0', fontSize:'12px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>{link.desc}</p>
                </div>
              </div>
            ))}
            <div style={{ background:'var(--ds-chip-info-bg)', border:'1px solid var(--ds-chip-info-border)', borderRadius:'10px', padding:'12px 14px', marginTop:'8px' }}>
              <p style={{ margin:'0 0 6px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-secondary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>Demo Storyline — GitOps</p>
              <p style={{ margin:0, fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT, lineHeight:1.7 }}>
                <strong>Show:</strong> All 6 Argo CD apps are synced — this is the GitOps control loop in action.
                Point to the git commits: every change — infrastructure, network policy, app code — goes through Git.
                No manual <code style={{ fontFamily:MONO, fontSize:'11px' }}>kubectl apply</code>.
                Open <em>Argo CD UI</em> to show the live diff between desired and current state.
                Navigate to <strong>/crossplane</strong> to show the provisioning side, or <strong>/operations</strong> to show AIOps monitoring the delivery.
              </p>
            </div>
          </DsCard>
        </div>

      </div>
    </AppleShell>
  );
};
