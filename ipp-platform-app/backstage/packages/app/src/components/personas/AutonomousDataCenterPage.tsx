/**
 * Agentic Operated Autonomous Self Service Private Cloud
 * Visual layer rebuilt with Apple design system — no MUI, no makeStyles.
 * Content organized into tabs to fit 1440x900 without vertical scroll.
 */
import React, { useState } from 'react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { tokens as ds } from '../../design-system/tokens';
import { BackBreadcrumb } from './shared';

const f = ds.font.sans;
const mono = ds.font.mono;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface KpiMetric    { value: string; label: string; subtext: string; color: string; }
interface IntentTemplate { id: string; label: string; intent: string; tier: string; placement: string; sla: string; compliance: string[]; estimatedTime: string; cost: string; }
interface PlacementOption { id: string; label: string; subtitle: string; color: string; icon: string; bestFor: string[]; constraints: string[]; costProfile: string; score: number; }
interface AutonomyStep { phase: string; description: string; actor: string; tools: string[]; color: string; }
interface AgentCard    { name: string; role: string; status: string; statusColor: string; signals: string[]; recommendation: string; autonomy: 'Full' | 'Supervised' | 'Approval Required'; approvalBoundary: string; }
interface RiskControl  { category: string; color: string; icon: string; controls: Array<{ name: string; status: 'Active' | 'Monitoring' | 'Review' }>; }
interface RoadmapPhase { phase: string; title: string; quarter: string; color: string; items: string[]; status: 'Completed' | 'In Progress' | 'Planned' | 'Future'; }

// ─── Data ──────────────────────────────────────────────────────────────────────

const KPI_METRICS: KpiMetric[] = [
  { value: '< 30 min', label: 'Intent to Runtime',    subtext: 'p95 provisioning latency',      color: ds.color.css.focus },
  { value: '98.7%',    label: 'Compliance Adherence', subtext: 'across all workloads',           color: ds.color.success },
  { value: '62%',      label: 'Auto-Remediated',      subtext: 'incidents in last 30 days',      color: ds.color.css.focus },
  { value: '3',        label: 'Capacity Risks',        subtext: 'flagged proactively',            color: ds.color.warn },
  { value: '$42K',     label: 'Monthly Optimization', subtext: 'identified by FinOps agent',     color: ds.color.error },
];

const INTENT_TEMPLATES: IntentTemplate[] = [
  { id: 'ecom-scale',    label: 'E-Commerce Scale-Out',    intent: 'Deploy checkout microservice with 99.99% SLA, PCI-DSS compliance, auto-scaling 10–200 replicas', tier: 'Production', placement: 'Private K8s (primary) + Public AKS (burst)', sla: '99.99% uptime · < 50ms p99', compliance: ['PCI-DSS', 'SOC 2'], estimatedTime: '18 min', cost: '$1,240/mo estimated' },
  { id: 'ml-training',   label: 'ML Training Job',         intent: 'Run GPU-accelerated model training on 10TB dataset, spot-tolerant, complete within 6 hours',       tier: 'Batch',      placement: 'KubeVirt GPU pool',                        sla: 'Best-effort · fault-tolerant', compliance: ['Internal'], estimatedTime: '7 min', cost: '$310 per run (spot)' },
  { id: 'edge-iot',      label: 'Edge IoT Processing',     intent: 'Deploy real-time sensor aggregation at 12 edge sites, < 5ms local latency, offline-resilient',     tier: 'Edge',       placement: 'Edge Clusters (12 sites)',                  sla: '< 5ms local · offline capable', compliance: ['ISO 27001'], estimatedTime: '24 min', cost: '$88/site/mo' },
  { id: 'legacy-lift',   label: 'Legacy App Lift & Shift', intent: 'Migrate Oracle-backed Java EE app to managed VM, preserve existing networking and compliance posture', tier: 'Production', placement: 'Traditional VM (managed)',                  sla: '99.9% uptime · 4hr RTO', compliance: ['SOC 2', 'HIPAA'], estimatedTime: '41 min', cost: '$2,100/mo estimated' },
];

const PLACEMENT_OPTIONS: PlacementOption[] = [
  { id: 'private-k8s',   label: 'Private K8s',      subtitle: 'On-prem Kubernetes',           color: ds.color.css.focus,   icon: '⎈', bestFor: ['Production workloads','Data sovereignty','Low-latency internal services'], constraints: ['Capacity limited to physical nodes','No elastic burst'], costProfile: 'Fixed infrastructure', score: 92 },
  { id: 'public-aks',    label: 'Public AKS',        subtitle: 'Azure Kubernetes Service',     color: ds.color.css.focus,   icon: '☁', bestFor: ['Elastic burst demand','Geo-distributed services','Managed control plane'], constraints: ['Egress cost for data-intensive','Compliance review required'], costProfile: 'Pay-per-use + reserved', score: 78 },
  { id: 'kubevirt',      label: 'KubeVirt',          subtitle: 'VM workloads on K8s',          color: ds.color.css.focus,   icon: '◻', bestFor: ['GPU workloads','Legacy OS requirements','Mixed VM + container'], constraints: ['Requires bare-metal nodes','Higher scheduling overhead'], costProfile: 'Resource-based', score: 65 },
  { id: 'traditional-vm',label: 'Traditional VM',    subtitle: 'vSphere / managed VMs',       color: ds.color.warn,    icon: '▣', bestFor: ['Lift & shift migrations','Stateful enterprise apps','HIPAA/PCI isolation'], constraints: ['Slower provisioning','Less cloud-native tooling'], costProfile: 'Reserved capacity', score: 54 },
  { id: 'edge',          label: 'Edge Cluster',       subtitle: 'Multi-site edge nodes',        color: ds.color.success, icon: '⬡', bestFor: ['IoT / real-time processing','Offline resilience','Local data gravity'], constraints: ['Limited resource pool per site','Manual site onboarding'], costProfile: 'Fixed per-site', score: 88 },
];

const AUTONOMY_STEPS: AutonomyStep[] = [
  { phase: 'Observe', description: 'Continuous telemetry collection across compute, network, cost, and compliance signals', actor: 'Telemetry Agents', tools: ['Prometheus','OpenTelemetry','Falco'], color: ds.color.css.focus },
  { phase: 'Reason',  description: 'Manager LLM synthesizes signals, identifies patterns, generates hypotheses',            actor: 'Manager Agent',   tools: ['LLM Inference','Vector Store','Policy Engine'], color: ds.color.css.focus },
  { phase: 'Decide',  description: 'Constraint-weighted decision ranking across placement, cost, compliance, and SLA',      actor: 'Decision Engine', tools: ['OPA','Kyverno','FinOps API'], color: ds.color.error },
  { phase: 'Act',     description: 'Autonomous execution via Crossplane + Argo CD within approved blast-radius boundaries', actor: 'Worker Agents',   tools: ['Crossplane','Argo CD','Helm'], color: ds.color.warn },
  { phase: 'Verify',  description: 'Post-action validation of health, compliance posture, SLA adherence, and cost impact',  actor: 'Validation Agent',tools: ['Grafana','OPA Audit','OpenCost'], color: ds.color.success },
  { phase: 'Learn',   description: 'Feedback loop updates agent memory, refines placement models, improves future decisions', actor: 'Learning Agent', tools: ['Memory Store','RAG Pipeline','Drift Detector'], color: ds.color.warn },
];

const AGENT_CARDS: AgentCard[] = [
  { name: 'CapacityPlanner',      role: 'Proactive capacity forecasting & reservation',      status: 'Active',     statusColor: ds.color.success, signals: ['CPU utilization trending +18% WoW','Memory headroom < 15% on prod-2','Upcoming campaign spike (Friday)'], recommendation: 'Pre-provision 6 nodes on prod-2 cluster by Thursday 18:00 UTC', autonomy: 'Supervised', approvalBoundary: 'Requires Ops lead approval for node additions > 4' },
  { name: 'ComplianceGuardian',   role: 'Continuous policy enforcement & drift detection',   status: 'Monitoring', statusColor: ds.color.css.focus,   signals: ['2 pods missing network policy label','Image scan: 1 critical CVE in staging','PCI namespace egress rule drifted'], recommendation: 'Auto-patch image + label pods; escalate egress drift for human review', autonomy: 'Full', approvalBoundary: 'Auto-remediates policy drift; escalates on egress/firewall changes' },
  { name: 'FinOpsOptimizer',      role: 'Cost attribution, rightsizing & waste elimination', status: 'Active',     statusColor: ds.color.success, signals: ['$42K monthly waste identified','17 oversized deployments','3 idle namespaces (14+ days)'], recommendation: 'Rightsize 17 deployments (-$28K/mo); archive idle namespaces (-$14K/mo)', autonomy: 'Supervised', approvalBoundary: 'Notifies team lead; auto-executes after 48hr no-objection window' },
  { name: 'IncidentResponder',    role: 'Automated triage, remediation & escalation',        status: 'Active',     statusColor: ds.color.success, signals: ['checkout-svc P95 latency spike: 820ms','DB connection pool at 94%','3 restarts in last 15 min'], recommendation: 'Scale DB connection pool +40%, restart checkout-svc with new limits', autonomy: 'Full', approvalBoundary: 'Full autonomy within SLA bounds; pages on-call if SLA breached' },
  { name: 'PlacementAdvisor',     role: 'Workload-to-infrastructure placement optimization', status: 'Active',     statusColor: ds.color.success, signals: ['5 new workload intents queued','Edge-site-7 has 42% spare capacity','AKS spot pool 34% cheaper today'], recommendation: 'Route 3 batch jobs to spot pool; assign IoT workload to edge-site-7', autonomy: 'Supervised', approvalBoundary: 'Requires placement approval for prod workloads; auto-places dev/staging' },
  { name: 'SecuritySentinel',     role: 'Runtime threat detection & SPIFFE identity management', status: 'Monitoring', statusColor: ds.color.css.focus, signals: ['Anomalous egress: analytics-svc → unknown IP','SVID rotation overdue: 2 workloads','Falco rule triggered: privilege escalation attempt'], recommendation: 'Block anomalous egress (auto); alert SOC on privilege attempt; renew SVIDs', autonomy: 'Approval Required', approvalBoundary: 'Network blocks require SOC approval; SVID rotation is autonomous' },
];

const RISK_CONTROLS: RiskControl[] = [
  { category: 'Blast Radius Governance', color: ds.color.error, icon: '⊘', controls: [{ name: 'Max 4-node auto-provision per action', status: 'Active' },{ name: 'Namespace quota enforcement (OPA)', status: 'Active' },{ name: 'Production rollback gates (Argo)', status: 'Active' },{ name: 'Cross-cluster action rate limiting', status: 'Monitoring' }] },
  { category: 'Compliance Guardrails',   color: ds.color.css.focus, icon: '⧉', controls: [{ name: 'Kyverno admission policies (34 active)', status: 'Active' },{ name: 'OPA Gatekeeper constraint library', status: 'Active' },{ name: 'SPIFFE/SPIRE identity verification', status: 'Active' },{ name: 'PCI-DSS namespace isolation audit', status: 'Active' }] },
  { category: 'Human Approval Gates',    color: ds.color.css.focus, icon: '◈', controls: [{ name: 'Ops lead: node additions > 4', status: 'Active' },{ name: 'SOC: network egress rule changes', status: 'Active' },{ name: 'Platform: cross-environment migrations', status: 'Active' },{ name: '48hr no-objection: cost actions > $10K', status: 'Monitoring' }] },
  { category: 'Audit & Observability',   color: ds.color.success,icon: '⊞', controls: [{ name: 'Immutable audit log (all agent actions)', status: 'Active' },{ name: 'Grafana agent action dashboard', status: 'Active' },{ name: 'Weekly compliance posture report', status: 'Active' },{ name: 'Anomaly detection on agent behavior', status: 'Review' }] },
];

const ROADMAP_PHASES: RoadmapPhase[] = [
  { phase: 'Phase 1', title: 'Autonomous Remediation',             quarter: 'Q1 2025', color: ds.color.success, status: 'Completed',   items: ['Incident auto-triage and escalation','Policy drift auto-remediation','Cost anomaly alerting','SSE streaming agent chat'] },
  { phase: 'Phase 2', title: 'Intent-Based Provisioning',          quarter: 'Q2 2025', color: ds.color.css.focus,   status: 'In Progress', items: ['Natural-language workload intents','Automated placement decisions','Multi-cluster Crossplane orchestration','Integrated FinOps cost attribution'] },
  { phase: 'Phase 3', title: 'Predictive Operations',              quarter: 'Q3 2025', color: ds.color.css.focus,   status: 'Planned',     items: ['ML-driven capacity forecasting','Proactive security posture management','Cross-cloud arbitrage engine','Self-healing SLA contracts'] },
  { phase: 'Phase 4', title: 'Agentic Operated Autonomous Self Service Private Cloud', quarter: 'Q4 2025', color: ds.color.error, status: 'Future', items: ['Zero-touch infrastructure lifecycle','Autonomous compliance certification','AI-negotiated cloud contracts','Full closed-loop without human gates'] },
];

// ─── Style helpers (all use CSS vars for dark-mode compatibility) ─────────────

const card: React.CSSProperties = {
  background: 'var(--ds-surface)',
  border: '1px solid var(--ds-hairline)',
  borderRadius: ds.radius.card,
  padding: 16,
  boxShadow: 'var(--ds-shadow-resting)',
};
const eyebrow: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: 'var(--ds-text-tertiary)', margin: 0, fontFamily: f,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 15, fontWeight: 600, color: 'var(--ds-text-primary)', margin: 0, fontFamily: f,
};

function statusChipStyle(status: 'Active' | 'Monitoring' | 'Review'): React.CSSProperties {
  if (status === 'Active')     return { background: 'var(--ds-chip-success-bg)', color: 'var(--ds-success)' };
  if (status === 'Monitoring') return { background: 'var(--ds-chip-info-bg)',    color: 'var(--ds-chip-info-text)'   };
  return                              { background: 'var(--ds-chip-warn-bg)',     color: 'var(--ds-warn)'    };
}
function roadmapStatusStyle(status: RoadmapPhase['status']): React.CSSProperties {
  if (status === 'Completed')   return { background: 'var(--ds-chip-success-bg)', color: 'var(--ds-success)' };
  if (status === 'In Progress') return { background: 'var(--ds-chip-info-bg)',    color: 'var(--ds-chip-info-text)'   };
  if (status === 'Planned')     return { background: 'var(--ds-chip-info-bg)',    color: 'var(--ds-chip-info-text)'   };
  return                               { background: 'var(--ds-surface-alt)',      color: 'var(--ds-text-tertiary)' };
}
function autonomyColor(a: AgentCard['autonomy']): string {
  if (a === 'Full')      return 'var(--ds-success)';
  if (a === 'Supervised') return 'var(--ds-focus)';
  return 'var(--ds-warn)';
}

// ─── Tab types ────────────────────────────────────────────────────────────────
type Tab = 'overview' | 'intent' | 'agents' | 'controls';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',  label: 'Overview' },
  { id: 'intent',    label: 'Intent Simulator' },
  { id: 'agents',    label: 'Agents' },
  { id: 'controls',  label: 'Controls & Roadmap' },
];

// ─── Tab panels ──────────────────────────────────────────────────────────────

function OverviewTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
        {KPI_METRICS.map(m => (
          <div key={m.label} style={{ ...card, textAlign: 'center', padding: '14px 10px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: m.color, letterSpacing: '-0.02em', fontFamily: f }}>{m.value}</p>
            <p style={{ ...eyebrow, marginBottom: 2 }}>{m.label}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: f }}>{m.subtext}</p>
          </div>
        ))}
      </div>

      {/* Operating model + principles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1, minHeight: 0 }}>
        {/* Model flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {[
            { label: 'Intent Layer',       color: ds.color.css.focus,   title: 'Natural Language Intent',   desc: 'Engineers express workload requirements in plain language — SLA, compliance, placement constraints, cost ceilings.', tags: ['Backstage UI','CLI','GitOps YAML'] },
            { label: 'Reasoning Layer',    color: ds.color.css.focus,   title: 'Manager Agent (LLM)',        desc: 'Interprets intent, decomposes into sub-tasks, selects placement strategy, and orchestrates worker agents with guardrails.', tags: ['LLM Inference','OPA Policy Check','Cost Estimation'] },
            { label: 'Execution Layer',    color: ds.color.warn,    title: 'Worker Agents + IaC',        desc: 'Specialized agents execute Crossplane claims, Argo CD apps, Helm releases, network policies, and SPIFFE identity.', tags: ['Crossplane','Argo CD','Cilium','SPIRE'] },
            { label: 'Verification Layer', color: ds.color.success, title: 'Autonomous Validation',      desc: 'Post-action health checks, compliance audit, SLA validation, cost attribution. Failures trigger auto-rollback.', tags: ['Grafana','Kyverno Audit','OpenCost'] },
          ].map((layer, i) => (
            <div key={i} style={{ ...card, padding: '10px 14px', borderLeft: `3px solid ${layer.color}` }}>
              <p style={{ ...eyebrow, color: layer.color, marginBottom: 2 }}>{layer.label}</p>
              <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: f }}>{layer.title}</p>
              <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--ds-text-secondary)', lineHeight: 1.5, fontFamily: f }}>{layer.desc}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {layer.tags.map(t => <span key={t} style={{ fontSize: 10, fontFamily: mono, background: 'var(--ds-surface-alt)', border: '1px solid var(--ds-hairline)', borderRadius: 4, padding: '1px 6px', color: 'var(--ds-text-tertiary)' }}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* Principles + Autonomy cycle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          <div style={{ ...card, padding: '12px 14px' }}>
            <p style={{ ...sectionTitle, marginBottom: 10 }}>Architecture Principles</p>
            {[
              { title: 'Intent over imperative',   desc: 'Declare the "what" and "why" — agents decide the "how"' },
              { title: 'Policy as guardrail',       desc: 'OPA + Kyverno enforce compliance before any action executes' },
              { title: 'Blast radius control',      desc: 'Every autonomous action has a defined scope boundary and rollback path' },
              { title: 'Human escalation paths',   desc: 'Approval gates on high-risk actions; audit trail on everything' },
              { title: 'Closed-loop learning',      desc: 'Agent memory improves placement and remediation accuracy over time' },
              { title: 'Cost awareness built in',  desc: 'FinOps signals are first-class inputs to every placement decision' },
            ].map((p, i) => (
              <div key={i} style={{ marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: f }}>{p.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-secondary)', lineHeight: 1.4, fontFamily: f }}>{p.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ background: 'var(--ds-chip-warn-bg)', border: '1px solid var(--ds-hairline)', borderRadius: 10, padding: '8px 12px', fontSize: 12, color: 'var(--ds-warn)', fontFamily: f }}>
            ⚠ Representative demo data — all metrics, agent signals, and recommendations are illustrative examples for demonstration purposes.
          </div>
        </div>
      </div>
    </div>
  );
}

function IntentTab({ selectedIntent, setSelectedIntent }: { selectedIntent: IntentTemplate; setSelectedIntent: (t: IntentTemplate) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto' }}>
      {/* Intent templates */}
      <div>
        <p style={{ ...eyebrow, marginBottom: 8 }}>Workload Intent Templates</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
          {INTENT_TEMPLATES.map(t => (
            <div key={t.id} onClick={() => setSelectedIntent(t)} role="button" tabIndex={0}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedIntent(t); }}
              style={{ ...card, cursor: 'pointer', padding: '12px 14px', border: `1.5px solid ${selectedIntent.id === t.id ? 'var(--ds-focus)' : 'var(--ds-hairline)'}`, background: selectedIntent.id === t.id ? 'var(--ds-chip-info-bg)' : 'var(--ds-surface)' }}>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: f }}>{t.label}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-tertiary)', lineHeight: 1.4, fontFamily: f, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{t.intent}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Decision output */}
      <div style={{ ...card }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <p style={{ ...sectionTitle }}>Autonomous Decision Output</p>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: ds.radius.button, background: 'var(--ds-chip-success-bg)', color: 'var(--ds-success)', fontFamily: f }}>Placement Resolved</span>
        </div>
        <div style={{ background: 'var(--ds-surface-alt)', borderRadius: 8, padding: '8px 12px', fontFamily: mono, fontSize: 12, color: 'var(--ds-text-secondary)', lineHeight: 1.6, marginBottom: 12 }}>
          "{selectedIntent.intent}"
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          {[
            { label: 'Workload Tier',              value: selectedIntent.tier },
            { label: 'Recommended Placement',      value: selectedIntent.placement },
            { label: 'SLA Guarantee',              value: selectedIntent.sla },
            { label: 'Est. Provisioning Time',     value: selectedIntent.estimatedTime, color: ds.color.success },
            { label: 'Cost Estimate',              value: selectedIntent.cost },
          ].map(field => (
            <div key={field.label}>
              <p style={{ ...eyebrow, marginBottom: 4 }}>{field.label}</p>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: field.color ?? 'var(--ds-text-primary)', fontFamily: f }}>{field.value}</p>
            </div>
          ))}
          <div>
            <p style={{ ...eyebrow, marginBottom: 4 }}>Compliance Frameworks</p>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {selectedIntent.compliance.map(c => <span key={c} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--ds-chip-info-bg)', color: 'var(--ds-chip-info-text)', fontFamily: f }}>{c}</span>)}
            </div>
          </div>
        </div>
      </div>

      {/* Placement matrix */}
      <div>
        <p style={{ ...eyebrow, marginBottom: 8 }}>Placement Decision Matrix</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {PLACEMENT_OPTIONS.map(opt => (
            <div key={opt.id} style={{ ...card, padding: '12px 12px', borderTop: `3px solid ${opt.color}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{opt.icon}</span>
                <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: f }}>{opt.label}</p>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: f }}>{opt.subtitle}</p>
              </div>
              <div>
                <p style={{ ...eyebrow, marginBottom: 4 }}>Best for</p>
                {opt.bestFor.map(b => <p key={b} style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-secondary)', lineHeight: 1.4, fontFamily: f }}>› {b}</p>)}
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, height: 4, background: 'var(--ds-surface-alt)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${opt.score}%`, height: '100%', background: opt.color, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: opt.color, fontFamily: f }}>{opt.score}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Autonomy cycle */}
      <div>
        <p style={{ ...eyebrow, marginBottom: 8 }}>Closed-Loop Autonomy Cycle</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
          {AUTONOMY_STEPS.map((step, i) => (
            <div key={step.phase} style={{ ...card, padding: '12px 10px', borderTop: `3px solid ${step.color}`, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: `${step.color}18`, color: step.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 11, fontWeight: 800, fontFamily: f }}>{i + 1}</div>
              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: f }}>{step.phase}</p>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: 'var(--ds-text-secondary)', lineHeight: 1.4, fontFamily: f }}>{step.description}</p>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: step.color, fontFamily: f }}>{step.actor}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
                {step.tools.map(t => <span key={t} style={{ fontSize: 9, fontFamily: mono, background: 'var(--ds-surface-alt)', borderRadius: 3, padding: '1px 4px', color: 'var(--ds-text-tertiary)' }}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentsTab() {
  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
        {AGENT_CARDS.map(agent => (
          <div key={agent.name} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
              <div>
                <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: mono }}>{agent.name}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-secondary)', lineHeight: 1.4, fontFamily: f }}>{agent.role}</p>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: agent.statusColor, flexShrink: 0, marginTop: 6 }} />
            </div>
            <div>
              <p style={{ ...eyebrow, marginBottom: 4 }}>Active Signals</p>
              {agent.signals.map(s => <p key={s} style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-secondary)', lineHeight: 1.5, padding: '3px 0', borderBottom: '1px solid var(--ds-hairline)', fontFamily: f }}>› {s}</p>)}
            </div>
            <div>
              <p style={{ ...eyebrow, marginBottom: 4 }}>Recommendation</p>
              <p style={{ margin: 0, background: 'var(--ds-surface-alt)', borderRadius: 8, padding: '8px 10px', fontSize: 12, color: 'var(--ds-text-secondary)', lineHeight: 1.5, fontStyle: 'italic', fontFamily: f }}>{agent.recommendation}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ ...eyebrow, marginBottom: 0 }}>Autonomy Level</p>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: `${autonomyColor(agent.autonomy)}18`, color: autonomyColor(agent.autonomy), fontFamily: f }}>{agent.autonomy}</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--ds-text-tertiary)', lineHeight: 1.4, borderTop: '1px solid var(--ds-hairline)', paddingTop: 8, fontFamily: f }}>{agent.approvalBoundary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ControlsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%', overflowY: 'auto' }}>
      {/* Risk controls */}
      <div>
        <p style={{ ...eyebrow, marginBottom: 8 }}>Risk and Control Layer</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {RISK_CONTROLS.map(rc => (
            <div key={rc.category} style={{ ...card, padding: '14px', borderTop: `3px solid ${rc.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{rc.icon}</span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: f }}>{rc.category}</p>
              </div>
              {rc.controls.map(ctrl => (
                <div key={ctrl.name} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--ds-hairline)' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-secondary)', lineHeight: 1.4, flex: 1, fontFamily: f }}>{ctrl.name}</p>
                  <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: f, ...statusChipStyle(ctrl.status) }}>{ctrl.status}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Roadmap */}
      <div>
        <p style={{ ...eyebrow, marginBottom: 8 }}>Autonomy Roadmap</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {ROADMAP_PHASES.map(phase => (
            <div key={phase.phase} style={{ ...card, borderTop: `4px solid ${phase.color}` }}>
              <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: phase.color, fontFamily: f }}>{phase.phase}</p>
              <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: f }}>{phase.title}</p>
              <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ds-text-tertiary)', fontFamily: f }}>{phase.quarter}</p>
              {phase.items.map(item => (
                <p key={item} style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-secondary)', lineHeight: 1.5, padding: '3px 0 3px 14px', position: 'relative', fontFamily: f }}>
                  <span style={{ position: 'absolute', left: 0, color: 'var(--ds-text-tertiary)', fontSize: 10 }}>→</span>
                  {item}
                </p>
              ))}
              <div style={{ marginTop: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, fontFamily: f, ...roadmapStatusStyle(phase.status) }}>{phase.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export const AutonomousDataCenterPage = () => {
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedIntent, setSelectedIntent] = useState<IntentTemplate>(INTENT_TEMPLATES[0]);

  return (
    <AppleShell title="Autonomous Self Service">
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: f }}>

        <BackBreadcrumb label="Operations Dashboard" to="/operations" />
        {/* Header */}
        <div style={{ flexShrink: 0, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <p style={{ ...eyebrow, color: ds.color.css.focus, margin: 0 }}>Agentic Operations</p>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: ds.radius.button, background: `${ds.color.success}18`, color: ds.color.success, fontFamily: f, letterSpacing: '0.06em' }}>● LIVE</span>
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: ds.type.h2Size, fontWeight: 700, color: 'var(--ds-text-primary)', letterSpacing: '-0.02em', lineHeight: 1.2, fontFamily: f }}>
            Agentic Operated Autonomous Self Service Private Cloud
          </h1>
          <p style={{ margin: '0 0 12px', fontSize: 14, color: 'var(--ds-text-secondary)', fontFamily: f, lineHeight: 1.5 }}>
            From human-driven tickets to intent-based automation — agentic AI manages placement, compliance, cost, and remediation across the entire infrastructure lifecycle.
          </p>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ padding: '6px 14px', border: 'none', borderRadius: ds.radius.inner, fontSize: 13, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--ds-text-primary)' : 'var(--ds-text-secondary)', background: tab === t.id ? 'var(--ds-surface-alt)' : 'transparent', cursor: 'pointer', fontFamily: f, transition: `background ${ds.motion.duration} ${ds.motion.standard}` }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div key={tab} className="ds-tab-panel" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {tab === 'overview'  && <OverviewTab />}
          {tab === 'intent'    && <IntentTab selectedIntent={selectedIntent} setSelectedIntent={setSelectedIntent} />}
          {tab === 'agents'    && <AgentsTab />}
          {tab === 'controls'  && <ControlsTab />}
        </div>
      </div>
    </AppleShell>
  );
};
