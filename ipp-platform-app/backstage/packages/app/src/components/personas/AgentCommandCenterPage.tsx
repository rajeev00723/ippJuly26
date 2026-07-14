import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { BackBreadcrumb } from './shared';
import { tokens } from '../../design-system/tokens';

const FONT = tokens.font.sans;
const MONO = tokens.font.mono;

// Route through the Backstage backend proxy to avoid CORS and work in-cluster
const AIOPS_URL = '/api/proxy/aiops/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface EvidenceItem {
  source: string;
  metric?: string;
  value?: string;
  detail?: string;
  threshold?: string;
  namespace?: string;
  workload?: string;
  severity?: string;
  timestamp?: string;
  dataMode?: 'live' | 'demo' | 'cached' | 'unavailable';
}

interface AgentFinding {
  agent: string;
  status: string;
  severity: string;
  findings: string[];
  probable_root_cause?: string;
  recommendations: Array<{ action: string; risk: string; automation?: string }>;
  evidence: EvidenceItem[];
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
  evidence: EvidenceItem[];
  confidence: number;
  llm_mode: string;
  llm_model: string;
  tracing: string;
  created_at: string;
}

type AgentStatus = 'online' | 'analyzing' | 'waiting' | 'complete' | 'degraded' | 'offline';

interface OrchestrationStep {
  id: string;
  agentKey: string;
  agentName: string;
  status: AgentStatus;
  finding?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'manager' | 'system';
  content: string;
  timestamp: Date;
  analysisId?: string;
  dataMode?: 'live' | 'demo';
}

interface AuditEntry {
  id: string;
  timestamp: Date;
  action: string;
  decision: 'approved' | 'deferred' | 'escalated' | 'analyzed';
  actor: string;
  details?: string;
}

// ─── Agent profiles ────────────────────────────────────────────────────────────

interface AgentProfile {
  key: string;
  name: string;
  shortName: string;
  role: string;
  capabilities: string[];
  dataSources: string[];
  color: string;
}

const AGENT_PROFILES: AgentProfile[] = [
  { key:'capacity_sre',                    name:'Capacity SRE Agent',                          shortName:'Capacity SRE',    role:'Resource & Saturation Analysis',     capabilities:['Pod health','CPU/memory pressure','Scaling risk','OOMKill prediction'],               dataSources:['Prometheus','Kubernetes API'],                    color:'var(--clr-compose)' },
  { key:'finops',                          name:'FinOps Agent',                                shortName:'FinOps',          role:'Cost & Waste Analysis',              capabilities:['Namespace cost attribution','Idle resource detection','Right-sizing signals'],         dataSources:['OpenCost','Kubernetes API'],                      color:'#D40511' },
  { key:'incident_prevention_remediation', name:'Incident Prevention & Remediation Agent',      shortName:'Incident Prev.',  role:'Incident Detection & Runbooks',      capabilities:['CrashLoopBackOff detection','Network denials','Error rate analysis'],                 dataSources:['Kubernetes API','Hubble','Prometheus'],           color:'#dc2626' },
  { key:'deployment_health_doctor',        name:'Deployment Health Doctor Agent',               shortName:'Deploy Health',   role:'GitOps & Rollout Analysis',          capabilities:['Argo CD sync state','Deployment readiness','Drift detection'],                       dataSources:['Argo CD','Kubernetes API','Crossplane'],          color:'#16a34a' },
  { key:'secure_shield',                   name:'Secure Shield Agent',                         shortName:'Secure Shield',   role:'Security Posture & Compliance',      capabilities:['Policy violations','SPIFFE identity gaps','Zero-Trust posture'],                     dataSources:['Kyverno','SPIRE','OPA Gatekeeper','Cilium/Hubble'], color:'#ea580c' },
];

const DEMO_PROMPTS = [
  'Why is the employee-portal application unhealthy?',
  'What is driving today\'s cost increase?',
  'Are there any capacity risks in the cluster?',
  'Check the latest deployment health.',
  'Summarize security posture for production workloads.',
  'Is there any GitOps drift or failed sync?',
  'Which issue has the highest business risk right now?',
  'What should operations investigate next?',
];

// ─── Static fallback ───────────────────────────────────────────────────────────

const STATIC_ANALYSIS: ManagerAnalysis = {
  analysis_id:'demo-analysis-001',
  summary:'Backend instability detected: CrashLoopBackOff combined with denied database traffic. Immediate action required.',
  severity:'high',
  business_impact:'Employee portal users may experience partial outage on add/delete operations.',
  probable_root_cause:'Cilium network policy blocking backend-to-postgres TCP 5432 traffic.',
  recommended_actions:[
    { priority:1, action:'Rollback restrictive Cilium network policy via GitOps', owner:'operations', automation_available:true, script:'scripts/simulate-network-deny.sh --rollback', risk:'low' },
    { priority:2, action:'Review CiliumNetworkPolicy to preserve least-privilege while allowing backend-to-postgres', owner:'security', automation_available:false, risk:'medium' },
    { priority:3, action:'Increase backend memory limit from 512Mi to 768Mi', owner:'operations', automation_available:true, script:'scripts/simulate-crashloop.sh --rollback', risk:'low' },
  ],
  worker_findings:{
    capacity_sre:{ agent:'capacity_sre', status:'risk_detected', severity:'high', findings:['Backend memory at 89% of limit — OOMKill risk within 2–3 hours','Container restart count: 8 in last 30 minutes'], recommendations:[{ action:'Increase memory limit to 768Mi', risk:'low' }], evidence:[{ source:'prometheus', detail:'memory_working_set_bytes = 445Mi (limit: 500Mi)', dataMode:'demo' }], confidence:0.82, llm_used:false },
    finops:{ agent:'finops', status:'optimization_available', severity:'low', findings:['employee-portal backend CPU efficiency: 32% — right-sizing opportunity','Missing cost-center label on 2 workloads'], recommendations:[{ action:'Right-size CPU after 24h observation', risk:'low' }], evidence:[{ source:'opencost', detail:'cpuEfficiency=0.32', dataMode:'demo' }], confidence:0.72, llm_used:false },
    incident_prevention_remediation:{ agent:'incident_prevention_remediation', status:'incident_detected', severity:'critical', findings:['CrashLoopBackOff: employee-backend — 8 restarts in 30 minutes','Hubble flow DENIED: backend→postgres TCP 5432'], probable_root_cause:'Network policy blocking backend-to-database traffic', recommendations:[{ action:'Apply CiliumNetworkPolicy egress rule for TCP 5432', risk:'low', automation:'scripts/simulate-network-deny.sh --rollback' }], evidence:[{ source:'kubernetes', detail:'CrashLoopBackOff: 8 restarts', dataMode:'demo' },{ source:'hubble', detail:'DENIED backend→postgres:5432', dataMode:'demo' }], confidence:0.88, llm_used:false },
    deployment_health_doctor:{ agent:'deployment_health_doctor', status:'degraded', severity:'medium', findings:['Deployment employee-backend: 0/2 replicas available','ArgoCD app employee-portal: OutOfSync'], recommendations:[{ action:'Run: argocd app sync employee-portal', risk:'low' }], evidence:[{ source:'kubernetes', detail:'unavailableReplicas=2', dataMode:'demo' },{ source:'argocd', detail:'syncStatus=OutOfSync', dataMode:'demo' }], confidence:0.80, llm_used:false },
    secure_shield:{ agent:'secure_shield', status:'policy_risk_detected', severity:'medium', findings:['Kyverno: require-standard-labels failed for employee-backend','SPIFFE identity missing for employee-portal/backend'], recommendations:[{ action:'Add missing owner and cost-center labels via GitOps', risk:'low' }], evidence:[{ source:'kyverno', detail:'require-standard-labels: FAIL', dataMode:'demo' },{ source:'spire', detail:'No SPIFFE ID for employee-portal/backend', dataMode:'demo' }], confidence:0.76, llm_used:false },
  },
  evidence:[
    { source:'hubble', detail:'Denied backend→postgres TCP 5432 flow', dataMode:'demo' },
    { source:'kubernetes', detail:'Backend CrashLoopBackOff, restart count 8', dataMode:'demo' },
    { source:'prometheus', detail:'memory_working_set_bytes = 445Mi / 500Mi limit', dataMode:'demo' },
    { source:'argocd', detail:'employee-portal: OutOfSync', dataMode:'demo' },
  ],
  confidence:0.85,
  llm_mode:'fallback',
  llm_model:'rule-based',
  tracing:'disabled',
  created_at:new Date().toISOString(),
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function severityColor(sev: string): string {
  const m: Record<string,string> = { critical:'var(--ds-error)', high:'#ea580c', medium:'var(--ds-warn)', low:'var(--ds-focus)', info:'var(--ds-text-tertiary)' };
  return m[sev]||'var(--ds-text-tertiary)';
}

function agentStatusColor(status: string): { bg:string; color:string; border:string } {
  if (status==='healthy') return { bg:'var(--ds-chip-success-bg)', color:'var(--ds-chip-success-text)', border:'var(--ds-chip-success-border)' };
  if (status==='incident_detected') return { bg:'var(--ds-chip-error-bg)', color:'var(--ds-chip-error-text)', border:'var(--ds-chip-error-border)' };
  if (['risk_detected','degraded','policy_risk_detected'].includes(status)) return { bg:'var(--ds-chip-warn-bg)', color:'var(--ds-chip-warn-text)', border:'var(--ds-chip-warn-border)' };
  if (status==='optimization_available') return { bg:'var(--ds-chip-info-bg)', color:'var(--ds-chip-info-text)', border:'var(--ds-chip-info-border)' };
  return { bg:'var(--ds-surface-alt)', color:'var(--ds-text-tertiary)', border:'var(--ds-hairline)' };
}

function agentStatusLabel(status: string): string {
  const m: Record<string,string> = { healthy:'Healthy', risk_detected:'Risk Detected', incident_detected:'Incident Detected', degraded:'Degraded', policy_risk_detected:'Policy Risk', optimization_available:'Optimisation', unavailable:'Unavailable' };
  return m[status]||status;
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: AgentStatus }) {
  const colors: Record<AgentStatus, string> = { online:'var(--ds-success)', analyzing:'var(--ds-focus)', waiting:'var(--ds-text-tertiary)', complete:'var(--ds-success)', degraded:'var(--ds-warn)', offline:'var(--ds-text-tertiary)' };
  return <span style={{ display:'inline-block', width:'8px', height:'8px', borderRadius:'50%', background:colors[status]||'var(--ds-text-tertiary)', boxShadow: status==='analyzing'?`0 0 0 3px ${colors.analyzing}40`:'none' }} />;
}

function WorkerAgentCard({ profile, finding, orchestrationStatus }: { profile: AgentProfile; finding?: AgentFinding; orchestrationStatus: AgentStatus }) {
  const sc = finding ? agentStatusColor(finding.status) : { bg:'var(--ds-surface-alt)', color:'var(--ds-text-tertiary)', border:'var(--ds-hairline)' };
  return (
    <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'8px', padding:'16px', borderTop:`3px solid ${profile.color}`, boxShadow:'0 1px 2px var(--ds-surface-alt)' }}>
      <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:`${profile.color}18`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'8px' }}>
        <span style={{ fontSize:'18px', color:profile.color, fontWeight:700 }}>⬡</span>
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'4px' }}>
        <div style={{ flex:1 }}>
          <p style={{ margin:0, fontWeight:700, fontSize:'13px', color:'var(--ds-text-primary)', fontFamily:FONT, lineHeight:1.2 }}>{profile.shortName}</p>
          <p style={{ margin:'2px 0 0', fontSize:'11px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{profile.role}</p>
        </div>
        <StatusDot status={orchestrationStatus} />
      </div>
      {finding && (
        <div style={{ marginBottom:'8px' }}>
          <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>
            {agentStatusLabel(finding.status)}
          </span>
        </div>
      )}
      {finding?.findings[0] && (
        <p style={{ margin:'0 0 8px', fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT, lineHeight:1.5 }}>
          {finding.findings[0].substring(0,90)}
        </p>
      )}
      {orchestrationStatus==='analyzing' && (
        <div style={{ marginBottom:'6px' }}>
          <div style={{ height:'3px', borderRadius:'2px', background:'var(--ds-hairline)', overflow:'hidden' }}>
            <div style={{ width:'60%', height:'100%', background:'var(--ds-focus)', animation:'none' }} />
          </div>
          <p style={{ margin:'2px 0 0', fontSize:'11px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Analyzing…</p>
        </div>
      )}
      {finding && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'2px' }}>
            <span style={{ fontSize:'10px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>Confidence</span>
            <span style={{ fontSize:'10px', fontWeight:700, color:'var(--ds-text-secondary)', fontFamily:MONO }}>{(finding.confidence*100).toFixed(0)}%</span>
          </div>
          <div style={{ height:'4px', borderRadius:'2px', background:'var(--ds-hairline)', overflow:'hidden' }}>
            <div style={{ width:`${finding.confidence*100}%`, height:'100%', background:profile.color, borderRadius:'2px' }} />
          </div>
        </div>
      )}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginTop:'8px' }}>
        {profile.dataSources.map(ds=>(
          <span key={ds} style={{ padding:'1px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:600, background:'var(--ds-surface-alt)', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>{ds}</span>
        ))}
      </div>
    </div>
  );
}

function ConsultationTimeline({ steps }: { steps: OrchestrationStep[] }) {
  if (steps.length===0) {
    return (
      <div style={{ padding:'24px', textAlign:'center', color:'var(--ds-text-tertiary)' }}>
        <p style={{ margin:0, fontSize:'13px', fontFamily:FONT }}>Submit a question to see the agent consultation timeline.</p>
      </div>
    );
  }
  const statusColor: Record<AgentStatus,string> = { online:'var(--ds-success)', analyzing:'var(--ds-focus)', waiting:'var(--ds-text-tertiary)', complete:'var(--ds-success)', degraded:'var(--ds-warn)', offline:'var(--ds-text-tertiary)' };
  return (
    <div>
      {steps.map(step => (
        <div key={step.id} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'8px 0', borderBottom:'1px solid var(--ds-hairline)' }}>
          <span style={{ width:'10px', height:'10px', borderRadius:'50%', background:statusColor[step.status]||'var(--ds-text-tertiary)', flexShrink:0, marginTop:'4px' }} />
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontWeight:700, fontSize:'13px', color:'var(--ds-text-primary)', fontFamily:FONT }}>{step.agentName}</span>
              <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'10px', fontWeight:700, fontFamily:FONT,
                background: step.status==='complete'?'var(--ds-chip-success-bg)': step.status==='analyzing'?'var(--ds-chip-info-bg)':'var(--ds-surface-alt)',
                color: step.status==='complete'?'var(--ds-chip-success-text)': step.status==='analyzing'?'var(--ds-chip-info-text)':'var(--ds-text-tertiary)' }}>
                {step.status==='analyzing'?'Analyzing…': step.status==='complete'?'Done':step.status}
              </span>
            </div>
            {step.finding && <p style={{ margin:'2px 0 0', fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT, lineHeight:1.4 }}>{step.finding}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTrailPanel({ entries }: { entries: AuditEntry[] }) {
  const decisionColors: Record<string,{ bg:string; color:string }> = {
    approved:  { bg:'var(--ds-chip-success-bg)', color:'var(--ds-chip-success-text)' },
    deferred:  { bg:'var(--ds-chip-warn-bg)', color:'var(--ds-chip-warn-text)' },
    escalated: { bg:'var(--ds-chip-error-bg)', color:'var(--ds-chip-error-text)' },
    analyzed:  { bg:'var(--ds-chip-info-bg)', color:'var(--ds-chip-info-text)' },
  };
  if (entries.length===0) {
    return <p style={{ margin:0, fontSize:'13px', color:'var(--ds-text-tertiary)', fontFamily:FONT, padding:'16px 0' }}>No decisions recorded yet.</p>;
  }
  return (
    <div style={{ maxHeight:'220px', overflowY:'auto' }}>
      {[...entries].reverse().map(entry => {
        const dc = decisionColors[entry.decision]||decisionColors.analyzed;
        return (
          <div key={entry.id} style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'8px 0', borderBottom:'1px solid var(--ds-hairline)' }}>
            <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'10px', fontWeight:700, fontFamily:FONT, background:dc.bg, color:dc.color, whiteSpace:'nowrap', flexShrink:0 }}>
              {entry.decision.toUpperCase()}
            </span>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontWeight:600, fontSize:'12px', color:'var(--ds-text-primary)', fontFamily:FONT }}>{entry.action}</p>
              <p style={{ margin:'2px 0 0', fontSize:'11px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>{entry.timestamp.toLocaleTimeString()} · {entry.actor}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RemediationApprovalPanel({ analysis, onDecision }: { analysis: ManagerAnalysis; onDecision: (decision:'approved'|'deferred'|'escalated', action:RecommendedAction) => void }) {
  const [approvedIds, setApprovedIds] = useState<Set<number>>(new Set());
  const automatable = (analysis.recommended_actions||[]).filter(r=>r.automation_available);
  if (automatable.length===0) {
    return (
      <div style={{ padding:'14px', background:'var(--ds-chip-warn-bg)', border:'1px solid var(--ds-chip-warn-border)', borderRadius:'10px' }}>
        <p style={{ margin:0, fontSize:'13px', color:'var(--ds-chip-warn-text)', fontWeight:600, fontFamily:FONT }}>No automated remediation available. Review recommended actions manually.</p>
      </div>
    );
  }
  return (
    <div style={{ border:'1px solid var(--ds-chip-warn-border)', borderRadius:'10px', padding:'16px', background:'var(--ds-chip-warn-bg)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
        <span style={{ fontSize:'14px' }}>⚠</span>
        <p style={{ margin:0, fontWeight:700, fontSize:'14px', color:'var(--ds-chip-warn-text)', fontFamily:FONT }}>Human Approval Required</p>
        <span style={{ padding:'2px 8px', borderRadius:'6px', fontSize:'11px', fontWeight:700, background:'var(--ds-chip-warn-bg)', color:'var(--ds-chip-warn-text)', border:'1px solid var(--ds-chip-warn-border)', fontFamily:FONT }}>Governance Gate</span>
      </div>
      <p style={{ margin:'0 0 12px', fontSize:'12px', color:'var(--ds-chip-warn-text)', fontFamily:FONT, lineHeight:1.5 }}>
        The following actions have automation available. Review each and approve, defer, or escalate. All decisions are logged to the audit trail.
      </p>
      {automatable.map((ra,i) => (
        <div key={i} style={{ marginBottom:'10px', padding:'12px', background:'var(--ds-surface)', border:'1px solid var(--ds-chip-warn-border)', borderRadius:'8px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
            <div>
              <p style={{ margin:0, fontWeight:600, fontSize:'13px', color:'var(--ds-text-primary)', fontFamily:FONT }}>{ra.action}</p>
              {ra.script && <p style={{ margin:'2px 0 0', fontSize:'11px', fontFamily:MONO, color:'var(--ds-text-secondary)' }}>{ra.script}</p>}
            </div>
            <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
              background: ra.risk==='high'?'var(--ds-chip-error-bg)': ra.risk==='medium'?'var(--ds-chip-warn-bg)':'var(--ds-chip-success-bg)',
              color: ra.risk==='high'?'var(--ds-chip-error-text)': ra.risk==='medium'?'var(--ds-chip-warn-text)':'var(--ds-chip-success-text)' }}>Risk: {ra.risk}</span>
          </div>
          {approvedIds.has(i) ? (
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              <span style={{ color:'var(--ds-success)' }}>✓</span>
              <span style={{ fontSize:'12px', color:'var(--ds-success)', fontWeight:700, fontFamily:FONT }}>Decision recorded in audit trail</span>
            </div>
          ) : (
            <div style={{ display:'flex', gap:'6px' }}>
              {(['approved','deferred','escalated'] as const).map(dec => (
                <button key={dec}
                  onClick={() => { setApprovedIds(s => new Set([...s,i])); onDecision(dec, ra); }}
                  style={{ padding:'4px 12px', borderRadius:'980px', fontSize:'12px', fontWeight:600, fontFamily:FONT, border:'1px solid var(--ds-hairline)', cursor:'pointer',
                    background: dec==='approved'?'#1A1A1A': dec==='escalated'?'#fff': '#fff',
                    color: dec==='approved'?'#fff': dec==='escalated'?'var(--ds-error)':'#1d1d1f',
                    borderColor: dec==='escalated'?'var(--ds-error)':'var(--ds-hairline)' }}>
                  {dec.charAt(0).toUpperCase()+dec.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChatPanel({ messages, isAnalyzing, onSend }: { messages: ChatMessage[]; isAnalyzing: boolean; onSend: (text:string)=>void }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || isAnalyzing) return;
    onSend(t);
    setInput('');
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'380px' }}>
      <div style={{ flex:1, overflowY:'auto', padding:'12px', background:'var(--ds-surface-alt)', borderRadius:'10px 10px 0 0', border:'1px solid var(--ds-hairline)', borderBottom:'none' }}>
        {messages.length===0 && (
          <div style={{ textAlign:'center', paddingTop:'24px', color:'var(--ds-text-tertiary)' }}>
            <p style={{ margin:'6px 0 0', fontSize:'13px', fontFamily:FONT }}>Ask the Manager Agent a question about platform health, cost, security, or deployments.</p>
          </div>
        )}
        {messages.map(msg => {
          if (msg.role==='system') return (
            <div key={msg.id} style={{ background:'var(--ds-surface-alt)', borderRadius:'6px', padding:'6px 12px', marginBottom:'6px', fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{msg.content}</div>
          );
          if (msg.role==='user') return (
            <div key={msg.id} style={{ display:'flex', justifyContent:'flex-end', marginBottom:'8px' }}>
              <div style={{ maxWidth:'80%', background:'#1A1A1A', color:'#fff', borderRadius:'12px 12px 2px 12px', padding:'8px 12px', fontSize:'13px', fontFamily:FONT }}>{msg.content}</div>
            </div>
          );
          return (
            <div key={msg.id} style={{ marginBottom:'8px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'4px' }}>
                <div style={{ width:'16px', height:'16px', background:'#1e3a5f', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:'9px', color:'#93c5fd' }}>⬡</span>
                </div>
                <span style={{ fontSize:'11px', fontWeight:700, color:'var(--ds-text-secondary)', fontFamily:FONT }}>Manager Agent</span>
                {msg.dataMode==='demo' && <span style={{ fontSize:'10px', fontWeight:700, color:'var(--ds-chip-warn-text)', background:'var(--ds-chip-warn-bg)', border:'1px solid var(--ds-chip-warn-border)', borderRadius:'3px', padding:'0 4px', fontFamily:FONT }}>DEMO</span>}
                <span style={{ fontSize:'11px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>{msg.timestamp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
              </div>
              <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'2px 12px 12px 12px', padding:'8px 12px', fontSize:'13px', fontFamily:FONT, color:'var(--ds-text-primary)', lineHeight:1.6, whiteSpace:'pre-wrap' }}>
                {msg.content}
              </div>
            </div>
          );
        })}
        {isAnalyzing && (
          <div style={{ background:'var(--ds-surface-alt)', borderRadius:'6px', padding:'6px 12px', marginBottom:'6px', fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>
            Consulting specialist agents…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display:'flex', gap:'8px', padding:'8px', background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'0 0 10px 10px' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key==='Enter' && !e.shiftKey && handleSend()}
          placeholder="Ask Manager Agent about platform health, costs, incidents…"
          disabled={isAnalyzing}
          style={{ flex:1, padding:'8px 12px', fontSize:'13px', fontFamily:FONT, border:'1px solid var(--ds-hairline)', borderRadius:'8px', outline:'none', background:'var(--ds-surface-alt)', color:'var(--ds-text-primary)' }}
        />
        <button
          onClick={handleSend}
          disabled={isAnalyzing || !input.trim()}
          style={{ padding:'8px 14px', borderRadius:'8px', background:'#1A1A1A', color:'#fff', border:'none', cursor: (isAnalyzing||!input.trim())?'not-allowed':'pointer', fontSize:'13px', fontFamily:FONT, fontWeight:600, opacity: (isAnalyzing||!input.trim())?0.5:1 }}
        >→</button>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export const AgentCommandCenterPage = () => {
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ManagerAnalysis>(STATIC_ANALYSIS);
  const [isDemo, setIsDemo] = useState(true);
  const [agentStatuses, setAgentStatuses] = useState<Array<{key:string;name:string;status:string;mode:string}>>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [orchestrationSteps, setOrchestrationSteps] = useState<OrchestrationStep[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const analysisRef = useRef<ManagerAnalysis>(STATIC_ANALYSIS);

  const addAuditEntry = useCallback((action:string, decision:AuditEntry['decision'], details?:string) => {
    setAuditEntries(prev => [...prev, { id:`audit-${Date.now()}`, timestamp:new Date(), action, decision, actor:'ops.support (guest)', details }]);
  }, []);

  const addMessage = useCallback((msg: Omit<ChatMessage,'id'|'timestamp'>) => {
    setChatMessages(prev => [...prev, { ...msg, id:`msg-${Date.now()}-${Math.random()}`, timestamp:new Date() }]);
  }, []);

  const fetchLatestAnalysis = useCallback(async () => {
    try {
      const resp = await fetch(`${AIOPS_URL}/analysis/latest`);
      if (resp.ok) { const data = await resp.json(); setAnalysis(data); analysisRef.current=data; setIsDemo(false); return true; }
    } catch { /* backend unavailable */ }
    return false;
  }, []);

  const fetchAgentStatuses = useCallback(async () => {
    try {
      const resp = await fetch(`${AIOPS_URL}/agents/status`);
      if (resp.ok) { const data = await resp.json(); setAgentStatuses(data.agents||[]); }
    } catch { /* ignore */ }
  }, []);

  const animateOrchestration = useCallback((question: string) => {
    const steps: OrchestrationStep[] = [
      { id:'manager-receive', agentKey:'manager', agentName:'Manager Agent', status:'analyzing' },
      ...AGENT_PROFILES.map(p => ({ id:`step-${p.key}`, agentKey:p.key, agentName:p.name, status:'waiting' as AgentStatus })),
    ];
    setOrchestrationSteps(steps);
    AGENT_PROFILES.forEach((p,i) => {
      setTimeout(() => {
        setOrchestrationSteps(prev => prev.map(s => s.agentKey===p.key?{...s,status:'analyzing'}:s));
      }, 400+i*350);
    });
  }, []);

  const finalizeOrchestration = useCallback((result: ManagerAnalysis) => {
    const workerFindings = result.worker_findings||{};
    setOrchestrationSteps(prev => prev.map(s => {
      if (s.agentKey==='manager') return { ...s, status:'complete', finding:`Confidence: ${(result.confidence*100).toFixed(0)}% · Severity: ${result.severity}` };
      const f = workerFindings[s.agentKey];
      if (f) return { ...s, status:'complete', finding:f.findings[0]?.substring(0,70) };
      return { ...s, status:'complete' };
    }));
  }, []);

  const runAnalysis = useCallback(async (question: string) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    addMessage({ role:'user', content:question });
    addMessage({ role:'system', content:`Manager Agent received: "${question.substring(0,60)}${question.length>60?'…':''}"` });
    animateOrchestration(question);

    let result: ManagerAnalysis = STATIC_ANALYSIS;
    let usedDemo = true;
    try {
      const resp = await fetch(`${AIOPS_URL}/analyze`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ scope:'cluster', question, include_security:true, include_cost:true, include_deployment:true }),
      });
      if (resp.ok) { result = await resp.json(); usedDemo = false; setIsDemo(false); }
    } catch { /* fall back */ }

    setAnalysis(result); analysisRef.current=result; setIsDemo(usedDemo);
    const managerResponse = [result.summary, `\nRoot cause: ${result.probable_root_cause}`, `\nBusiness impact: ${result.business_impact}`, result.recommended_actions.length>0?`\nTop action: ${result.recommended_actions[0].action}`:''].filter(Boolean).join('');
    finalizeOrchestration(result);
    addMessage({ role:'manager', content:managerResponse, analysisId:result.analysis_id, dataMode:usedDemo?'demo':'live' });
    addAuditEntry(`Analysis: ${question.substring(0,60)}`, 'analyzed', `${result.analysis_id} · severity: ${result.severity} · confidence: ${(result.confidence*100).toFixed(0)}%`);
    setIsAnalyzing(false);
  }, [isAnalyzing, addMessage, addAuditEntry, animateOrchestration, finalizeOrchestration]);

  const handleApprovalDecision = useCallback((decision:'approved'|'deferred'|'escalated', action:RecommendedAction) => {
    addAuditEntry(action.action, decision, `Owner: ${action.owner} · Risk: ${action.risk}`);
  }, [addAuditEntry]);

  useEffect(() => {
    const init = async () => {
      const [live] = await Promise.all([fetchLatestAnalysis(), fetchAgentStatuses()]);
      if (!live) { addMessage({ role:'system', content:'AIOps engine unreachable — showing demo data. Start backend: kubectl port-forward svc/aiops-engine 8000:8000 -n aiops' }); }
      setLoading(false);
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const workerFindings = analysis.worker_findings||{};
  const highCount = Object.values(workerFindings).filter(f=>['critical','high'].includes(f.severity)).length;
  const avgConfidence = Object.values(workerFindings).length>0 ? Object.values(workerFindings).reduce((s,f)=>s+f.confidence,0)/Object.values(workerFindings).length : analysis.confidence;
  const workerCardStatus = (key:string): AgentStatus => { const step=orchestrationSteps.find(s=>s.agentKey===key); if (!step) return 'online'; return step.status; };
  const allRecs = analysis.recommended_actions||[];

  if (loading) {
    return (
      <AppleShell title="AIOps Agent Command Center">
        <BackBreadcrumb label="AIOps Dashboard" to="/aiops" />
        <div style={{ display:'flex', flexDirection:'column', gap:'16px', fontFamily:FONT }}>
          {[1,2,3,4].map(n => (
            <div key={n} style={{ height:'72px', borderRadius:'18px', background:'var(--ds-surface-alt)', border:'1px solid var(--ds-hairline)', animation:'pulse 1.5s ease-in-out infinite', animationDelay:`${n * 0.1}s` }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }`}</style>
        </div>
      </AppleShell>
    );
  }

  return (
    <AppleShell title="AIOps Agent Command Center">
      <div style={{ fontFamily:FONT, background:'var(--ds-bg)', minHeight:'100%', overflow:'hidden' }}>

        <BackBreadcrumb label="AIOps Dashboard" to="/aiops" />
        <p style={{ margin:'0 0 16px', fontSize:'13px', color:'var(--ds-text-secondary)' }}>
          Autonomous incident analysis — 1 Manager + 5 Specialist Agents · Evidence-based · Human-in-the-loop approval
        </p>

        {/* Demo banner */}
        {isDemo && (
          <div style={{ marginBottom:'12px', padding:'10px 14px', background:'var(--ds-chip-warn-bg)', border:'1px solid var(--ds-chip-warn-border)', borderRadius:'8px', fontSize:'12px', color:'var(--ds-chip-warn-text)', fontFamily:FONT }}>
            <strong>Demo data</strong> — AIOps engine unreachable. Signals shown are representative demo data, not live cluster state.{' '}
            Run: <code style={{ fontFamily:MONO, fontSize:'11px' }}>kubectl port-forward svc/aiops-engine 8000:8000 -n aiops</code>
          </div>
        )}

        {/* Manager Agent Hero */}
        <div style={{ background:'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', borderRadius:'14px', padding:'20px 24px', marginBottom:'20px', color:'#fff' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'16px' }}>
            <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:'24px' }}>⬡</span>
            </div>
            <div style={{ flex:1 }}>
              <p style={{ margin:0, fontWeight:800, fontSize:'18px', color:'#f8fafc', fontFamily:FONT, lineHeight:1.2 }}>AIOps Manager Agent</p>
              <p style={{ margin:'2px 0 0', fontSize:'13px', color:'#94a3b8', fontFamily:FONT }}>Orchestrates 5 specialist agents · Synthesizes platform signals · Requires human approval for remediation</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'6px', justifyContent:'flex-end', marginBottom:'4px' }}>
                <StatusDot status={isAnalyzing?'analyzing':'online'} />
                <span style={{ fontSize:'12px', color:'#e2e8f0', fontWeight:600, fontFamily:FONT }}>{isAnalyzing?'Analyzing':'Online'}</span>
              </div>
              <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', background: analysis.llm_mode==='local'?'rgba(52,211,153,0.15)':'rgba(251,191,36,0.15)', border:`1px solid ${analysis.llm_mode==='local'?'rgba(52,211,153,0.4)':'rgba(251,191,36,0.4)'}`, borderRadius:'6px', padding:'3px 10px' }}>
                <span style={{ fontSize:'11px', fontWeight:700, color: analysis.llm_mode==='local'?'#34d399':'#fbbf24', fontFamily:FONT }}>
                  {analysis.llm_mode==='local'?`LLM: ${analysis.llm_model}`:'Mode: Rule-Based Fallback'}
                </span>
              </div>
              {isDemo && <p style={{ margin:'4px 0 0', fontSize:'10px', color:'#fbbf24', fontWeight:700, fontFamily:FONT }}>DEMO DATA</p>}
            </div>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
            {AGENT_PROFILES.map(p => (
              <div key={p.key} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', padding:'3px 10px', display:'flex', alignItems:'center', gap:'5px' }}>
                <StatusDot status={isAnalyzing?'analyzing':'online'} />
                <span style={{ fontSize:'11px', color:'#cbd5e1', fontFamily:FONT }}>{p.shortName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px', marginBottom:'20px' }}>
          {[
            { label:'Platform Severity', value:analysis.severity.toUpperCase(), sub:'Overall assessment',    color:severityColor(analysis.severity) },
            { label:'High/Critical Findings', value:highCount,                  sub:'Across all agents',    color:highCount>0?'var(--ds-error)':'var(--ds-success)' },
            { label:'Avg Confidence',    value:`${(avgConfidence*100).toFixed(0)}%`, sub:'Worker agent average', color:'var(--clr-compose)' },
            { label:'Signals Analyzed',  value:analysis.evidence?.length||0,    sub:'Evidence items',       color:'#D40511' },
          ].map(m => (
            <div key={m.label} style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'18px', padding:'18px', boxShadow:'0 1px 2px var(--ds-surface-alt),0 8px 24px var(--ds-surface-alt)', borderTop:`3px solid ${m.color}` }}>
              <p style={{ margin:0, fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>{m.label}</p>
              <p style={{ margin:'6px 0 3px', fontSize:'24px', fontWeight:700, letterSpacing:'-0.02em', color:m.color, fontFamily:FONT, lineHeight:1.1 }}>{m.value}</p>
              <p style={{ margin:0, fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Demo Prompt Shortcuts */}
        <div style={{ marginBottom:'20px' }}>
          <p style={{ margin:'0 0 6px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>Demo Prompt Shortcuts — click to send to Manager Agent</p>
          <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
            {DEMO_PROMPTS.map(p => (
              <button key={p}
                onClick={() => !isAnalyzing && runAnalysis(p)}
                disabled={isAnalyzing}
                style={{ padding:'4px 10px', borderRadius:'980px', fontSize:'12px', fontWeight:500, fontFamily:FONT, border:'1px solid var(--ds-hairline)', background:'var(--ds-surface)', color:'var(--ds-text-primary)', cursor:isAnalyzing?'not-allowed':'pointer', opacity:isAnalyzing?0.5:1 }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Chat + Timeline / Worker Agents */}
        <div style={{ display:'grid', gridTemplateColumns:'5fr 7fr', gap:'16px', marginBottom:'20px' }}>
          <div>
            <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'18px', padding:'20px', boxShadow:'0 1px 2px var(--ds-surface-alt),0 8px 24px var(--ds-surface-alt)', marginBottom:'16px' }}>
              <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:600, color:'var(--ds-text-primary)', fontFamily:FONT }}>Manager Agent Chat</p>
              <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Natural-language interface · routes questions to specialist agents</p>
              <ChatPanel messages={chatMessages} isAnalyzing={isAnalyzing} onSend={runAnalysis} />
            </div>
            <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'18px', padding:'20px', boxShadow:'0 1px 2px var(--ds-surface-alt),0 8px 24px var(--ds-surface-alt)' }}>
              <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:600, color:'var(--ds-text-primary)', fontFamily:FONT }}>Agent Consultation Timeline</p>
              <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Which agents were consulted and what they found</p>
              <ConsultationTimeline steps={orchestrationSteps} />
            </div>
          </div>

          <div>
            <p style={{ margin:'0 0 10px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>Specialist Worker Agents — {AGENT_PROFILES.length} Active</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'16px' }}>
              {AGENT_PROFILES.map(profile => (
                <WorkerAgentCard key={profile.key} profile={profile} finding={workerFindings[profile.key]} orchestrationStatus={workerCardStatus(profile.key)} />
              ))}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
              <button
                onClick={() => runAnalysis('Provide a comprehensive health, security, cost, and deployment analysis.')}
                disabled={isAnalyzing}
                style={{ padding:'8px 18px', borderRadius:'980px', fontSize:'13px', fontWeight:700, fontFamily:FONT, background:'#1A1A1A', color:'#fff', border:'none', cursor:isAnalyzing?'not-allowed':'pointer', opacity:isAnalyzing?0.6:1 }}>
                {isAnalyzing?'Analyzing…':'Run Full Analysis'}
              </button>
              <span style={{ fontSize:'11px', color:'var(--ds-text-tertiary)', marginLeft:'auto', fontFamily:MONO }}>{analysis.analysis_id} · {new Date(analysis.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* Evidence + Signal/LLM Status */}
        <div style={{ display:'grid', gridTemplateColumns:'7fr 5fr', gap:'16px', marginBottom:'20px' }}>
          <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'18px', padding:'20px', boxShadow:'0 1px 2px var(--ds-surface-alt),0 8px 24px var(--ds-surface-alt)' }}>
            <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:600, color:'var(--ds-text-primary)', fontFamily:FONT }}>Evidence Panel</p>
            <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Platform signals contributing to the analysis — source, signal, data mode</p>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Source','Signal','Data Mode'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ds-text-tertiary)', fontFamily:FONT, borderBottom:'1px solid var(--ds-hairline)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(analysis.evidence||[]).map((ev,i) => (
                  <tr key={i}>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)', width:'90px' }}>
                      <span style={{ fontFamily:MONO, fontSize:'10px', fontWeight:700, padding:'2px 6px', borderRadius:'4px', background:'var(--ds-surface-alt)', color:'var(--ds-text-secondary)' }}>{ev.source.toUpperCase()}</span>
                    </td>
                    <td style={{ padding:'10px 12px', fontSize:'12px', fontFamily:MONO, color:'var(--ds-text-secondary)', borderBottom:'1px solid var(--ds-hairline)' }}>{ev.detail||ev.value||'—'}</td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)', width:'80px' }}>
                      {ev.dataMode && ev.dataMode!=='unavailable' && (
                        <span style={{ padding:'2px 6px', borderRadius:'4px', fontSize:'10px', fontWeight:700, fontFamily:FONT,
                          background: ev.dataMode==='live'?'var(--ds-chip-success-bg)': ev.dataMode==='demo'?'var(--ds-chip-warn-bg)':'var(--ds-chip-info-bg)',
                          color: ev.dataMode==='live'?'var(--ds-chip-success-text)': ev.dataMode==='demo'?'var(--ds-chip-warn-text)':'var(--ds-chip-info-text)' }}>
                          {ev.dataMode.toUpperCase()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'18px', padding:'20px', boxShadow:'0 1px 2px var(--ds-surface-alt),0 8px 24px var(--ds-surface-alt)' }}>
            <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:600, color:'var(--ds-text-primary)', fontFamily:FONT }}>Signal & Agent Status</p>
            <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>LLM mode, tracing, data source availability</p>
            <p style={{ margin:'0 0 6px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>LLM Configuration</p>
            {[
              { label:'Provider', value:'Ollama (local)' },
              { label:'Model',    value:analysis.llm_model },
              { label:'Mode',     value:analysis.llm_mode },
              { label:'Tracing',  value:analysis.tracing },
            ].map(({label,value}) => (
              <div key={label} style={{ display:'flex', justifyContent:'space-between', marginBottom:'6px' }}>
                <span style={{ fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>{label}</span>
                <span style={{ fontSize:'12px', fontWeight:600, fontFamily:MONO }}>{value}</span>
              </div>
            ))}
            <div style={{ borderTop:'1px solid var(--ds-hairline)', margin:'12px 0 8px' }} />
            <p style={{ margin:'0 0 8px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>Data Sources</p>
            {['Kubernetes API','Prometheus','Hubble','Argo CD','OpenCost','Kyverno / OPA','SPIRE'].map(source => (
              <div key={source} style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'6px' }}>
                <span style={{ width:'8px', height:'8px', borderRadius:'50%', background: isDemo?'var(--ds-text-tertiary)':'var(--ds-success)', flexShrink:0 }} />
                <span style={{ fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT, flex:1 }}>{source}</span>
                <span style={{ padding:'1px 5px', borderRadius:'4px', fontSize:'10px', fontWeight:700, fontFamily:FONT,
                  background: isDemo?'var(--ds-chip-warn-bg)':'var(--ds-chip-success-bg)',
                  color: isDemo?'var(--ds-chip-warn-text)':'var(--ds-chip-success-text)' }}>
                  {isDemo?'DEMO':'LIVE'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation + Remediation Approval */}
        <div style={{ display:'grid', gridTemplateColumns:'8fr 4fr', gap:'16px', marginBottom:'20px' }}>
          <div style={{ background:'var(--ds-chip-info-bg)', border:'1px solid var(--ds-chip-info-border)', borderRadius:'18px', padding:'20px', boxShadow:'0 1px 2px var(--ds-surface-alt)' }}>
            <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:600, color:'var(--ds-text-primary)', fontFamily:FONT }}>Manager Agent Recommendation</p>
            <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Evidence-based · structured · requires human approval for remediation</p>
            <p style={{ margin:'0 0 10px', fontWeight:800, fontSize:'15px', color:'#1e3a5f', fontFamily:FONT }}>{analysis.summary}</p>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px', flexWrap:'wrap' }}>
              <span style={{ padding:'3px 10px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                background: analysis.severity==='critical'?'var(--ds-chip-error-bg)': analysis.severity==='high'?'var(--ds-chip-warn-bg)': analysis.severity==='medium'?'var(--ds-chip-warn-bg)':'var(--ds-chip-info-bg)',
                color:severityColor(analysis.severity) }}>{analysis.severity.toUpperCase()}</span>
              <span style={{ fontSize:'12px', color:'var(--ds-text-tertiary)', fontFamily:FONT }}>Confidence: <strong>{(analysis.confidence*100).toFixed(0)}%</strong></span>
              {isDemo && <span style={{ fontSize:'10px', fontWeight:700, color:'var(--ds-chip-warn-text)', background:'var(--ds-chip-warn-bg)', border:'1px solid var(--ds-chip-warn-border)', borderRadius:'4px', padding:'1px 6px', fontFamily:FONT }}>DEMO DATA</span>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px' }}>
              <div style={{ background:'var(--ds-chip-warn-bg)', border:'1px solid var(--ds-chip-warn-border)', borderRadius:'8px', padding:'10px 12px' }}>
                <p style={{ margin:'0 0 4px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:FONT }}>Probable Root Cause</p>
                <p style={{ margin:0, fontSize:'13px', color:'var(--ds-chip-warn-text)', fontWeight:500, fontFamily:FONT }}>{analysis.probable_root_cause}</p>
              </div>
              <div style={{ background:'var(--ds-chip-error-bg)', border:'1px solid var(--ds-chip-error-border)', borderRadius:'8px', padding:'10px 12px' }}>
                <p style={{ margin:'0 0 4px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', fontFamily:FONT }}>Business Impact</p>
                <p style={{ margin:0, fontSize:'13px', color:'var(--ds-chip-error-text)', fontWeight:500, fontFamily:FONT }}>{analysis.business_impact}</p>
              </div>
            </div>
            <p style={{ margin:'0 0 8px', fontSize:'11px', fontWeight:700, color:'var(--ds-text-tertiary)', textTransform:'uppercase', letterSpacing:'0.06em', fontFamily:FONT }}>Recommended Actions</p>
            {allRecs.map((ra,i) => (
              <div key={i} style={{ display:'flex', alignItems:'flex-start', marginBottom:'8px', gap:'8px' }}>
                <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT, flexShrink:0,
                  background: ra.priority===1?'var(--ds-chip-error-bg)': ra.priority===2?'var(--ds-chip-warn-bg)':'var(--ds-surface-alt)',
                  color: ra.priority===1?'var(--ds-chip-error-text)': ra.priority===2?'var(--ds-chip-warn-text)':'var(--ds-text-secondary)' }}>P{ra.priority}</span>
                <div style={{ flex:1 }}>
                  <p style={{ margin:0, fontWeight:500, fontSize:'13px', fontFamily:FONT, color:'var(--ds-text-primary)' }}>{ra.action}</p>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginTop:'2px', flexWrap:'wrap' }}>
                    <span style={{ fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Owner: <strong>{ra.owner}</strong></span>
                    {ra.automation_available && ra.script && <span style={{ fontFamily:MONO, color:'var(--ds-chip-info-text)', fontSize:'11px' }}>{ra.script}</span>}
                    <span style={{ padding:'2px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                      background: ra.risk==='high'?'var(--ds-chip-error-bg)': ra.risk==='medium'?'var(--ds-chip-warn-bg)':'var(--ds-chip-success-bg)',
                      color: ra.risk==='high'?'var(--ds-chip-error-text)': ra.risk==='medium'?'var(--ds-chip-warn-text)':'var(--ds-chip-success-text)' }}>Risk: {ra.risk}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'18px', padding:'20px', boxShadow:'0 1px 2px var(--ds-surface-alt),0 8px 24px var(--ds-surface-alt)' }}>
            <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:600, color:'var(--ds-text-primary)', fontFamily:FONT }}>Remediation Approval</p>
            <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Human-in-control governance gate</p>
            <RemediationApprovalPanel analysis={analysis} onDecision={handleApprovalDecision} />
          </div>
        </div>

        {/* Worker Agent Detail Table */}
        <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'18px', padding:'20px', boxShadow:'0 1px 2px var(--ds-surface-alt),0 8px 24px var(--ds-surface-alt)', marginBottom:'20px' }}>
          <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:600, color:'var(--ds-text-primary)', fontFamily:FONT }}>Worker Agent Detailed Findings</p>
          <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Full findings, root cause, evidence, and recommendations per agent</p>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>{['Agent','Status','Severity','Primary Finding','Confidence','LLM Mode'].map(h=>(
                <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontSize:'11px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--ds-text-tertiary)', fontFamily:FONT, borderBottom:'1px solid var(--ds-hairline)', whiteSpace:'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {AGENT_PROFILES.map(profile => {
                const finding = workerFindings[profile.key];
                if (!finding) return null;
                const sc = agentStatusColor(finding.status);
                return (
                  <tr key={profile.key}>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        <span style={{ color:profile.color, fontSize:'14px' }}>⬡</span>
                        <span style={{ fontWeight:700, fontSize:'13px', fontFamily:FONT }}>{profile.shortName}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)' }}>
                      <span style={{ padding:'3px 10px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT, background:sc.bg, color:sc.color, border:`1px solid ${sc.border}` }}>{agentStatusLabel(finding.status)}</span>
                    </td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)' }}>
                      <span style={{ padding:'3px 10px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT, color:severityColor(finding.severity), background:severityColor(finding.severity)+'18' }}>{finding.severity.toUpperCase()}</span>
                    </td>
                    <td style={{ padding:'10px 12px', fontSize:'12px', color:'var(--ds-text-secondary)', fontFamily:FONT, borderBottom:'1px solid var(--ds-hairline)' }}>{finding.findings[0]?.substring(0,90)||'—'}</td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <div style={{ width:'40px', height:'4px', borderRadius:'2px', background:'var(--ds-hairline)', overflow:'hidden' }}>
                          <div style={{ width:`${finding.confidence*100}%`, height:'100%', background:'var(--ds-focus)' }} />
                        </div>
                        <span style={{ fontSize:'11px', color:'var(--ds-text-secondary)', fontFamily:MONO }}>{(finding.confidence*100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 12px', borderBottom:'1px solid var(--ds-hairline)' }}>
                      <span style={{ padding:'3px 8px', borderRadius:'980px', fontSize:'11px', fontWeight:700, fontFamily:FONT,
                        background: finding.llm_used?'var(--ds-chip-success-bg)':'var(--ds-surface-alt)',
                        color: finding.llm_used?'var(--ds-chip-success-text)':'var(--ds-text-tertiary)' }}>{finding.llm_used?'LLM':'Rules'}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Audit Trail */}
        <div style={{ background:'var(--ds-surface)', border:'1px solid var(--ds-hairline)', borderRadius:'18px', padding:'20px', boxShadow:'0 1px 2px var(--ds-surface-alt),0 8px 24px var(--ds-surface-alt)' }}>
          <p style={{ margin:'0 0 4px', fontSize:'15px', fontWeight:600, color:'var(--ds-text-primary)', fontFamily:FONT }}>Decision Audit Trail</p>
          <p style={{ margin:'0 0 12px', fontSize:'13px', color:'var(--ds-text-secondary)', fontFamily:FONT }}>Timestamped record of analyses and remediation decisions — explainable, auditable</p>
          <AuditTrailPanel entries={auditEntries} />
        </div>

      </div>
    </AppleShell>
  );
};
