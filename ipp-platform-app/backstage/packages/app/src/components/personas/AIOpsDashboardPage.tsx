import React, { useState, useEffect, useCallback } from 'react';
import { useApi, configApiRef } from '@backstage/core-plugin-api';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { MetricCard, UnavailableBanner, DsCard, TH, TD, BackBreadcrumb } from './shared';
import { tokens, dhl } from '../../design-system/tokens';

const FONT = tokens.font.sans;
const MONO = tokens.font.mono;

// Route through the Backstage backend proxy to avoid CORS and work in-cluster
const AIOPS_URL = '/api/proxy/aiops/api';

function severityColor(sev: string): string {
  const m: Record<string,string> = { critical:'var(--ds-error)', high:'#ea580c', medium:'var(--ds-warn)', low:'var(--ds-chip-info-text)', info:'var(--ds-text-tertiary)' };
  return m[sev] || 'var(--ds-text-tertiary)';
}

function SevChip({ severity }: { severity: string }) {
  const bg: Record<string,string> = { critical:'var(--ds-chip-error-bg)', high:'var(--ds-chip-warn-bg)', medium:'var(--ds-chip-warn-bg)', low:'var(--ds-chip-info-bg)', info:'var(--ds-surface-alt)' };
  const color = severityColor(severity);
  return <span style={{ padding:'3px 10px', borderRadius:'980px', fontSize:'11px', fontWeight:700, background: bg[severity]||'var(--ds-surface-alt)', color, border:`1px solid ${color}40`, fontFamily:FONT }}>{severity.toUpperCase()}</span>;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AgentFinding {
  agent: string;
  status: string;
  severity: string;
  findings: string[];
  probable_root_cause?: string;
  recommendations: Array<{ action: string; risk: string; automation?: string }>;
  evidence: Array<{ source: string; detail?: string; value?: string }>;
  confidence: number;
  llm_used: boolean;
}

interface RecommendedAction {
  priority: number;
  action: string;
  owner: string;
  automation_available: boolean;
  script?: string;
  risk: string;
}

interface ManagerAnalysis {
  analysis_id: string;
  summary: string;
  severity: string;
  business_impact: string;
  probable_root_cause: string;
  recommended_actions: RecommendedAction[];
  worker_findings: Record<string, AgentFinding>;
  evidence: Array<{ source: string; detail?: string; value?: string }>;
  confidence: number;
  llm_mode: string;
  llm_model: string;
  llm_provider?: string;
  tracing: string;
  created_at: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: 'Anthropic Claude',
  ollama: 'Ollama (local)',
  'rule-based': 'Rule-based (offline)',
};

// ─── Static fallback data ──────────────────────────────────────────────────────

const STATIC_ANALYSIS: ManagerAnalysis = {
  analysis_id: 'demo-analysis-001',
  summary: 'Backend instability detected: CrashLoopBackOff combined with denied database traffic. Immediate action required.',
  severity: 'high',
  business_impact: 'Employee portal users may experience partial outage on add/delete operations.',
  probable_root_cause: 'Cilium network policy blocking backend-to-postgres TCP 5432 traffic.',
  recommended_actions: [
    { priority:1, action:'Rollback restrictive Cilium network policy via GitOps', owner:'operations', automation_available:true, script:'scripts/simulate-network-deny.sh --rollback', risk:'low' },
    { priority:2, action:'Review CiliumNetworkPolicy to preserve least-privilege while allowing backend-to-postgres', owner:'security', automation_available:false, risk:'medium' },
    { priority:3, action:'Increase backend memory limit from 512Mi to 768Mi', owner:'operations', automation_available:true, script:'scripts/simulate-crashloop.sh --rollback', risk:'low' },
  ],
  worker_findings: {
    capacity_sre: { agent:'capacity_sre', status:'risk_detected', severity:'high', findings:['Backend memory at 89% of limit — OOMKill risk within 2–3 hours','Container restart count: 8 in last 30 minutes'], recommendations:[{ action:'Increase memory limit to 768Mi', risk:'low' }], evidence:[{ source:'prometheus', detail:'memory_working_set_bytes = 445Mi (limit: 500Mi)' }], confidence:0.82, llm_used:false },
    finops: { agent:'finops', status:'optimization_available', severity:'low', findings:['employee-portal backend CPU efficiency: 32% — right-sizing opportunity','Missing cost-center label on 2 workloads'], recommendations:[{ action:'Right-size CPU after 24h observation', risk:'low' }], evidence:[{ source:'opencost', detail:'cpuEfficiency=0.32' }], confidence:0.72, llm_used:false },
    incident_prevention_remediation: { agent:'incident_prevention_remediation', status:'incident_detected', severity:'critical', findings:['CrashLoopBackOff: employee-backend — 8 restarts in 30 minutes','Hubble flow DENIED: backend→postgres TCP 5432'], probable_root_cause:'Network policy blocking backend-to-database traffic', recommendations:[{ action:'Apply CiliumNetworkPolicy egress rule for TCP 5432', risk:'low', automation:'scripts/simulate-network-deny.sh --rollback' }], evidence:[{ source:'kubernetes', detail:'CrashLoopBackOff: 8 restarts' },{ source:'hubble', detail:'DENIED backend→postgres:5432' }], confidence:0.88, llm_used:false },
    deployment_health_doctor: { agent:'deployment_health_doctor', status:'degraded', severity:'medium', findings:['Deployment employee-backend: 0/2 replicas available','ArgoCD app employee-portal: OutOfSync'], recommendations:[{ action:'Run: argocd app sync employee-portal', risk:'low' }], evidence:[{ source:'kubernetes', detail:'unavailableReplicas=2' },{ source:'argocd', detail:'syncStatus=OutOfSync' }], confidence:0.80, llm_used:false },
    secure_shield: { agent:'secure_shield', status:'policy_risk_detected', severity:'medium', findings:['Kyverno: require-standard-labels failed for employee-backend','SPIFFE identity missing for employee-portal/backend'], recommendations:[{ action:'Add missing owner and cost-center labels via GitOps', risk:'low' }], evidence:[{ source:'kyverno', detail:'require-standard-labels: FAIL' },{ source:'spire', detail:'No SPIFFE ID for employee-portal/backend' }], confidence:0.76, llm_used:false },
  },
  evidence:[{ source:'hubble', detail:'Denied backend→postgres TCP 5432 flow' },{ source:'kubernetes', detail:'Backend CrashLoopBackOff, restart count 8' }],
  confidence:0.85,
  llm_mode:'fallback',
  llm_model:'rule-based',
  llm_provider:'rule-based',
  tracing:'disabled',
  created_at: new Date().toISOString(),
};

const AGENT_NAMES: Record<string,string> = {
  capacity_sre:'Capacity SRE Agent',
  finops:'FinOps Agent',
  incident_prevention_remediation:'Incident Prevention & Remediation Agent',
  deployment_health_doctor:'Deployment Health Doctor Agent',
  secure_shield:'Secure Shield Agent',
};

const PLATFORM_LINKS = [
  { label:'Grafana',    url:'http://grafana.dpcs.local',    desc:'Metrics & alerting' },
  { label:'Hubble UI',  url:'http://hubble.dpcs.local',     desc:'Network flow visualization' },
  { label:'Argo CD',    url:'http://argocd.dpcs.local',     desc:'GitOps sync status' },
  { label:'Prometheus', url:'http://prometheus.dpcs.local', desc:'Raw metrics & PromQL' },
  { label:'OpenCost',   url:'http://opencost.dpcs.local',   desc:'Cost attribution' },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export const AIOpsDashboardPage = () => {
  const configApi = useApi(configApiRef);
  const knativeDemoEnabled = React.useMemo(() => {
    try { return configApi.getOptionalBoolean('knative.demoEnabled') ?? false; }
    catch { return false; }
  }, [configApi]);

  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ManagerAnalysis>(STATIC_ANALYSIS);
  const [demoMode, setDemoMode] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const fetchLatestAnalysis = useCallback(async () => {
    try {
      const resp = await fetch(`${AIOPS_URL}/analysis/latest`);
      if (resp.ok) {
        const data = await resp.json();
        setAnalysis(data);
        setDemoMode(false);
        setLastError(null);
      }
    } catch { setDemoMode(true); }
  }, []);

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true);
    setLastError(null);
    try {
      const resp = await fetch(`${AIOPS_URL}/analyze`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ scope:'cluster', question:'Provide a comprehensive health, security, cost, and deployment analysis.', include_security:true, include_cost:true, include_deployment:true }),
      });
      if (resp.ok) { const data = await resp.json(); setAnalysis(data); setDemoMode(false); }
      else { setLastError('Analysis request failed. AIOps engine may be unavailable.'); }
    } catch { setLastError('Cannot reach AIOps engine. Showing demo data.'); setDemoMode(true); }
    finally { setAnalyzing(false); }
  }, []);

  useEffect(() => {
    const init = async () => { await fetchLatestAnalysis(); setLoading(false); };
    init();
  }, [fetchLatestAnalysis]);

  const workerFindings = Object.entries(analysis.worker_findings || {});
  const highFindings = workerFindings.filter(([,f]) => ['critical','high'].includes(f.severity));
  const allRecs = analysis.recommended_actions || [];

  if (loading) {
    return (
      <AppleShell title="AIOps Dashboard">
        <BackBreadcrumb label="Operations Dashboard" to="/operations" />
        <div style={{ display:'flex', flexDirection:'column', gap:'16px', fontFamily:FONT }}>
          {[1,2,3].map(n => (
            <div key={n} style={{ height:'80px', borderRadius:'18px', background:'var(--ds-surface-alt)', border:'1px solid var(--ds-hairline)', animation:'pulse 1.5s ease-in-out infinite' }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }`}</style>
        </div>
      </AppleShell>
    );
  }

  return (
    <AppleShell title="AIOps Dashboard">
      <div style={{ fontFamily:FONT, background:'var(--ds-bg)', minHeight:'100%', overflow:'hidden' }}>

        <BackBreadcrumb label="Operations Dashboard" to="/operations" />
        <p style={{ margin:'0 0 16px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>
          5-agent AIOps analysis — incident detection, capacity, FinOps, security, and deployment health
        </p>

        {/* Banners */}
        {demoMode && (
          <UnavailableBanner
            service="AIOps Engine"
            reason="Showing representative cluster data. The AIOps engine is unreachable via the backend proxy. Verify the engine is running and then click Run Analysis."
            command="kubectl port-forward -n aiops svc/aiops-engine 8000:8000"
          />
        )}
        {lastError && (
          <div style={{ marginBottom:'12px', padding:'10px 14px', background:'var(--ds-chip-error-bg)', border:'1px solid var(--ds-chip-error-border)', borderRadius:'8px', fontSize:'12px', color:'var(--ds-chip-error-text)', fontFamily:FONT }}>
            {lastError}
          </div>
        )}

        {/* Controls */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            style={{ padding:'8px 18px', borderRadius:'980px', fontSize:'13px', fontWeight:600, fontFamily:FONT, background:'#1A1A1A', color:'#fff', border:'none', cursor:analyzing?'not-allowed':'pointer', opacity:analyzing?0.6:1 }}
          >
            {analyzing ? 'Analyzing…' : 'Run Analysis'}
          </button>
          <span style={{ padding:'3px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
            background: analysis.llm_mode!=='local' ? 'var(--ds-chip-neutral-bg)' : analysis.llm_provider==='anthropic' ? 'var(--clr-compose-bg)' : 'var(--ds-chip-success-bg)',
            color: analysis.llm_mode!=='local' ? 'var(--ds-chip-neutral-text)' : analysis.llm_provider==='anthropic' ? 'var(--clr-compose)' : 'var(--ds-chip-success-text)',
            border: `1px solid ${analysis.llm_mode!=='local' ? 'var(--ds-chip-neutral-border)' : analysis.llm_provider==='anthropic' ? 'var(--clr-compose-border)' : 'var(--ds-chip-success-border)'}` }}>
            {analysis.llm_mode==='local' ? (analysis.llm_provider==='anthropic' ? `✦ Claude: ${analysis.llm_model}` : `LLM: ${analysis.llm_model}`) : 'Analysis engine (offline)'}
          </span>
          <span style={{ fontSize:'11px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>Tracing: {analysis.tracing}</span>
          <span style={{ fontSize:'11px', color:'var(--ds-text-tertiary)', marginLeft:'auto', fontFamily:MONO }}>{analysis.analysis_id} · {new Date(analysis.created_at).toLocaleTimeString()}</span>
        </div>

        {/* KPI Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'24px' }}>
          <MetricCard label="Overall Severity"      value={analysis.severity.toUpperCase()} sub={`${(analysis.confidence*100).toFixed(0)}% confidence`} accentColor={severityColor(analysis.severity)} />
          <MetricCard label="High/Critical Issues"  value={highFindings.length}              sub="Across all agents"   accentColor={highFindings.length>0?'var(--ds-error)':'var(--ds-success)'} />
          <MetricCard label="Actions"              value={allRecs.length}                   sub={`${allRecs.filter(r=>r.automation_available).length} automatable`} accentColor={dhl.yellow} />
          <MetricCard label="Worker Agents"        value={workerFindings.length}            sub="All 5 reporting"     accentColor="var(--clr-compose)" />
        </div>

        {/* Manager Summary */}
        <DsCard title="Manager Agent Summary" subtitle="AIOps Manager correlates all worker findings" style={{ marginBottom:'20px' }}>
          <div style={{ background:'var(--ds-chip-info-bg)', border:'1px solid var(--ds-chip-info-border)', borderRadius:'10px', padding:'16px', marginBottom:'16px' }}>
            <p style={{ margin:'0 0 10px', fontWeight:600, fontSize:'14px', color:'var(--ds-text-primary)', fontFamily:FONT }}>{analysis.summary}</p>
            <div style={{ display:'flex', gap:'24px' }}>
              <div>
                <p style={{ margin:'0 0 2px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:FONT }}>Business Impact</p>
                <p style={{ margin:0, fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{analysis.business_impact}</p>
              </div>
              <div>
                <p style={{ margin:'0 0 2px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:FONT }}>Probable Root Cause</p>
                <p style={{ margin:0, fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{analysis.probable_root_cause}</p>
              </div>
            </div>
          </div>
          <p style={{ margin:'0 0 8px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>Recommended Actions</p>
          {allRecs.map((ra,i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'8px 0', borderBottom:'1px solid var(--ds-hairline)' }}>
              <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT, flexShrink:0,
                background: ra.priority===1?'var(--ds-chip-error-bg)': ra.priority===2?'var(--ds-chip-warn-bg)':'var(--ds-surface-alt)',
                color: ra.priority===1?'var(--ds-chip-error-text)': ra.priority===2?'var(--ds-chip-warn-text)':'var(--ds-text-secondary)' }}>P{ra.priority}</span>
              <div style={{ flex:1 }}>
                <p style={{ margin:0, fontWeight:500, fontSize:'13px', fontFamily:FONT, color:'var(--ds-text-primary)' }}>{ra.action}</p>
                <div style={{ display:'flex', gap:'8px', marginTop:'4px', flexWrap:'wrap' }}>
                  <span style={{ fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Owner: {ra.owner}</span>
                  {ra.automation_available && ra.script && <span style={{ fontFamily:MONO, color:'var(--ds-chip-info-text)', fontSize:'11px' }}>{ra.script}</span>}
                </div>
              </div>
              <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT, flexShrink:0,
                background: ra.risk==='high'?'var(--ds-chip-error-bg)': ra.risk==='medium'?'var(--ds-chip-warn-bg)':'var(--ds-chip-success-bg)',
                color: ra.risk==='high'?'var(--ds-chip-error-text)': ra.risk==='medium'?'var(--ds-chip-warn-text)':'var(--ds-chip-success-text)' }}>Risk: {ra.risk}</span>
            </div>
          ))}
        </DsCard>

        {/* Worker Agent Findings table */}
        <DsCard title="Worker Agent Findings" subtitle="Structured findings from all 5 specialized agents" style={{ marginBottom:'20px' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['Agent','Status','Severity','Top Finding','Confidence','LLM'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
            <tbody>
              {workerFindings.map(([key,finding]) => (
                <tr key={key}>
                  <TD><span style={{ fontWeight:600, fontSize:'13px' }}>{AGENT_NAMES[key]||key}</span></TD>
                  <TD>
                    <span style={{ padding:'3px 10px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                      background: finding.status==='healthy'?'var(--ds-chip-success-bg)':'var(--ds-chip-warn-bg)',
                      color: finding.status==='healthy'?'var(--ds-chip-success-text)':'var(--ds-chip-warn-text)' }}>{finding.status}</span>
                  </TD>
                  <TD><SevChip severity={finding.severity} /></TD>
                  <TD><span style={{ fontSize:'12px', color:'var(--ds-text-secondary)' }}>{finding.findings[0]?.substring(0,80)||'—'}</span></TD>
                  <TD>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'var(--ds-hairline)', overflow:'hidden' }}>
                        <div style={{ width:`${finding.confidence*100}%`, height:'100%', background:'var(--ds-focus)', borderRadius:'2px' }} />
                      </div>
                      <span style={{ fontSize:'11px', color:'var(--ds-text-secondary)', fontFamily:MONO }}>{(finding.confidence*100).toFixed(0)}%</span>
                    </div>
                  </TD>
                  <TD>
                    <span style={{ padding:'3px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                      background: finding.llm_used?'var(--ds-chip-success-bg)':'var(--ds-surface-alt)',
                      color: finding.llm_used?'var(--ds-chip-success-text)':'var(--ds-text-tertiary)' }}>{finding.llm_used?'LLM':'Rules'}</span>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </DsCard>

        {/* Per-Agent Detail Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px' }}>
          {workerFindings.map(([key,finding]) => (
            <DsCard
              key={key}
              title={AGENT_NAMES[key]||key}
              subtitle={`${finding.status} · severity: ${finding.severity} · confidence: ${(finding.confidence*100).toFixed(0)}%`}
            >
              {finding.findings.map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', marginBottom:'6px', gap:'6px' }}>
                  <span style={{ color:severityColor(finding.severity), fontSize:'13px', flexShrink:0, marginTop:'1px' }}>●</span>
                  <span style={{ fontSize:'12px', color:'var(--ds-text-secondary)', lineHeight:1.5, fontFamily:FONT }}>{f}</span>
                </div>
              ))}
              {finding.probable_root_cause && (
                <div style={{ marginTop:'8px', padding:'8px 12px', background:'var(--ds-chip-warn-bg)', borderRadius:'6px', border:'1px solid var(--ds-chip-warn-border)' }}>
                  <span style={{ fontSize:'12px', color:'var(--ds-chip-warn-text)', fontWeight:600, fontFamily:FONT }}>Root cause: {finding.probable_root_cause}</span>
                </div>
              )}
              {finding.recommendations.length>0 && (
                <div style={{ marginTop:'8px' }}>
                  <p style={{ margin:'0 0 4px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:FONT }}>Recommendations</p>
                  {finding.recommendations.slice(0,2).map((r,i) => (
                    <p key={i} style={{ margin:'0 0 2px', fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>→ {r.action}</p>
                  ))}
                </div>
              )}
              {finding.evidence.length>0 && (
                <div style={{ marginTop:'8px' }}>
                  {finding.evidence.slice(0,2).map((e,i) => (
                    <div key={i} style={{ background:'var(--ds-surface-alt)', borderRadius:'6px', padding:'4px 8px', marginBottom:'3px', fontFamily:MONO, fontSize:'11px' }}>
                      <span style={{ color:'var(--ds-text-secondary)' }}>[{e.source}]</span> {e.detail||e.value||''}
                    </div>
                  ))}
                </div>
              )}
            </DsCard>
          ))}
        </div>

        {/* 2-col: Evidence Timeline + Agent/Signal Status */}
        <div style={{ display:'grid', gridTemplateColumns:'7fr 5fr', gap:'16px' }}>
          <DsCard title="Evidence Timeline" subtitle="Signals contributing to the analysis">
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr>{['Source','Evidence'].map(h=><TH key={h}>{h}</TH>)}</tr></thead>
              <tbody>
                {(analysis.evidence||[]).map((ev,i) => (
                  <tr key={i}>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)' }}>
                      <span style={{ fontFamily:MONO, fontSize:'11px', fontWeight:700, padding:'2px 6px', borderRadius:'4px', background:'var(--ds-surface-alt)', color:'var(--ds-text-secondary)' }}>{ev.source}</span>
                    </td>
                    <TD><span style={{ fontFamily:MONO, fontSize:'12px', color:'var(--ds-text-secondary)' }}>{ev.detail||ev.value||'—'}</span></TD>
                  </tr>
                ))}
              </tbody>
            </table>
          </DsCard>

          <DsCard title="Agent & Signal Status" subtitle="LLM mode, tracing, and source availability">
            <p style={{ margin:'0 0 6px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>LLM Configuration</p>
            {[
              { label:'Provider', value:PROVIDER_LABELS[analysis.llm_provider||'ollama']||analysis.llm_provider||'Ollama (local)' },
              { label:'Model',    value:analysis.llm_model },
              { label:'Mode',     value:analysis.llm_mode },
              { label:'LangSmith Tracing', value:analysis.tracing },
            ].map(({label,value}) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{label}</span>
                <span style={{ fontSize:'12px', fontWeight:600, fontFamily:MONO }}>{value}</span>
              </div>
            ))}
            <div style={{ borderTop:'1px solid var(--ds-hairline)', margin:'12px 0 8px' }} />
            <p style={{ margin:'0 0 8px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>Platform Tools</p>
            {PLATFORM_LINKS.map(link => (
              <div key={link.label} style={{ display:'flex', alignItems:'flex-start', gap:'6px', marginBottom:'8px' }}>
                <span style={{ fontSize:'11px', color:'var(--ds-text-tertiary)', marginTop:'2px' }}>↗</span>
                <div>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--ds-text-primary)', fontSize:'13px', fontWeight:600, textDecoration:'none', fontFamily:FONT }}>{link.label}</a>
                  <p style={{ margin:'1px 0 0', fontSize:'11px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>{link.desc}</p>
                </div>
              </div>
            ))}
          </DsCard>
        </div>


        {/* Knative runtime signal — only when knative.demoEnabled=true */}
        {knativeDemoEnabled && (
          <DsCard title="Knative Runtime Signal" subtitle="Representative — scale-to-zero event detection (ENABLE_KNATIVE_DEMO=true)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Cold-start p99', value: '~320ms', note: 'notification-svc', color: 'var(--ds-warn)' },
                { label: 'Scale-to-zero events', value: '18', note: 'Last 24 h', color: 'var(--ds-success)' },
                { label: 'Idle cost saved (rep.)', value: '$30.10/mo', note: '62% vs always-on', color: 'var(--ds-chip-info-text)' },
              ].map(({ label, value, note, color }) => (
                <div key={label} style={{
                  padding: '10px 14px', borderRadius: 10,
                  background: 'var(--ds-surface-alt)', border: '1px solid var(--ds-hairline)',
                }}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 700, color: 'var(--ds-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT }}>
                    {label}
                  </p>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: MONO, color }}>{value}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: FONT }}>{note}</p>
                </div>
              ))}
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 8,
              background: 'var(--ds-chip-info-bg)', border: '1px solid var(--ds-chip-info-border)',
              fontSize: 12, fontFamily: FONT, color: 'var(--ds-text-primary)',
            }}>
              <strong>AIOps observation (representative):</strong> notification-svc cold-started 3× in the last hour after scale-to-zero. P99 latency spike to 320ms — within SLO. No anomaly. Scale-to-zero cost saving confirmed. <a href="/knative" style={{ color: 'var(--ds-chip-info-text)', textDecoration: 'none', fontWeight: 600 }}>View Knative dashboard →</a>
            </div>
          </DsCard>
        )}

      </div>
    </AppleShell>
  );
};
