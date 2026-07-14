/**
 * AIOps Interactive Manager Agent Chat
 * SSE streaming, per-agent execution status, evidence panel, severity badges.
 * Falls back to animated demo mode when the AIOps engine is unreachable.
 *
 * Visual layer: Apple design system (no MUI, no makeStyles).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  GitBranch, Zap, DollarSign, Bug, Heart, ShieldCheck,
  Send, CheckCircle2, XCircle, AlertTriangle, Clock,
  RotateCcw, Info, BarChart2, Database, ChevronDown, Circle, Lightbulb,
  TrendingUp, Shield, RefreshCw,
} from 'lucide-react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { tokens } from '../../design-system/tokens';
import { BackBreadcrumb } from './shared';

const AIOPS_API_BASE = '/api/proxy/aiops/api';
const f = tokens.font.sans;
const mono = tokens.font.mono;

// ─── Types ───────────────────────────────────────────────────────────────────

interface AgentExecution {
  agent: string;
  display_name: string;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
  duration_ms?: number;
  severity?: string;
  finding_summary?: string;
  signals_queried?: string[];
  error?: string;
}

interface EvidenceItem {
  source: string;
  metric?: string;
  value?: string;
  detail?: string;
}

interface RecommendedAction {
  priority: number;
  action: string;
  owner?: string;
  automation_available?: boolean;
  script?: string;
  risk?: string;
}

interface TelemetrySource {
  source: string;
  display_name: string;
  available: boolean;
  data_mode: 'live' | 'demo' | 'unavailable';
  latency_ms?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'manager';
  content: string;
  isStreaming?: boolean;
  severity?: string;
  confidence?: number;
  impacted_services?: string[];
  evidence?: EvidenceItem[];
  recommended_actions?: RecommendedAction[];
  agent_findings?: Record<string, { status: string; severity: string; findings: string[] }>;
  data_mode?: 'live' | 'demo';
  llm_model?: string;
  evidenceOpen?: boolean;
  timestamp: Date;
}

interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEMO_PROMPTS = [
  'What is the current platform health?',
  'Is the employee-portal stable?',
  'Any network policy violations right now?',
  'What is our highest cost namespace?',
  'Show me all CrashLoopBackOff pods',
  'Are all Argo CD apps in sync?',
  'Any SPIRE identity gaps?',
  'What should I fix first?',
];

const AGENT_META: Record<string, { icon: React.ReactElement; color: string; role: string }> = {
  capacity_sre:                     { icon: <Zap size={13} strokeWidth={1.5} />,         color: 'var(--ds-chip-info-text)', role: 'CPU · Memory · Saturation' },
  finops:                           { icon: <DollarSign size={13} strokeWidth={1.5} />,  color: 'var(--ds-success)', role: 'Cost · Waste · Efficiency' },
  incident_prevention_remediation:  { icon: <Bug size={13} strokeWidth={1.5} />,         color: 'var(--ds-error)', role: 'Incidents · Network · Remediation' },
  deployment_health_doctor:         { icon: <Heart size={13} strokeWidth={1.5} />,       color: 'var(--ds-warn)', role: 'GitOps · Argo CD · Deployments' },
  secure_shield:                    { icon: <ShieldCheck size={13} strokeWidth={1.5} />, color: '#8b5cf6', role: 'Policies · SPIRE · Compliance' },
};

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  capacity_sre:                    'Capacity SRE',
  finops:                          'FinOps',
  incident_prevention_remediation: 'Incident Prevention & Remediation',
  deployment_health_doctor:        'Deployment Health Doctor',
  secure_shield:                   'Secure Shield',
};

const SEVERITY_COLORS: Record<string, { bg: string; color: string }> = {
  critical: { bg: 'var(--ds-chip-error-bg)', color: 'var(--ds-error)' },
  high:     { bg: 'var(--ds-chip-warn-bg)', color: 'var(--ds-warn)' },
  medium:   { bg: 'var(--ds-chip-warn-bg)', color: 'var(--ds-warn)' },
  low:      { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-success)' },
  info:     { bg: tokens.color.surfaceAlt, color: 'var(--ds-text-tertiary)' },
};

const DATA_MODE_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  live:        { bg: 'var(--ds-chip-success-bg)', color: 'var(--ds-success)', label: 'LIVE' },
  partial:     { bg: 'var(--ds-chip-warn-bg)', color: 'var(--ds-warn)',    label: 'PARTIAL' },
  demo:        { bg: 'var(--ds-chip-warn-bg)', color: 'var(--ds-warn)',    label: 'DEMO' },
  unavailable: { bg: tokens.color.surfaceAlt, color: 'var(--ds-text-tertiary)', label: 'N/A' },
};

const INVESTIGATION_CARDS = [
  { icon: <Zap size={14} strokeWidth={1.5} color={'var(--ds-error)'} />,    q: 'What is the current platform health?',    desc: 'Full-spectrum health check across all services.' },
  { icon: <Bug size={14} strokeWidth={1.5} color={'var(--ds-warn)'} />,     q: 'Is the employee-portal stable?',           desc: 'Deployment status, pod health, and network.' },
  { icon: <DollarSign size={14} strokeWidth={1.5} color={'var(--ds-success)'} />, q: 'What is our highest cost namespace?', desc: 'Identify cost outliers and right-sizing opportunities.' },
  { icon: <RefreshCw size={14} strokeWidth={1.5} color="var(--ds-chip-info-text)" />,         q: 'Are all Argo CD apps in sync?',            desc: 'Detect GitOps drift and deployment failures.' },
  { icon: <Shield size={14} strokeWidth={1.5} color="#8b5cf6" />,            q: 'Are any security policies violated?',      desc: 'Kyverno policies, SPIRE identity gaps, network denials.' },
  { icon: <TrendingUp size={14} strokeWidth={1.5} color="var(--ds-chip-info-text)" />,        q: 'What should I fix first?',                 desc: 'Prioritized action list by severity and blast radius.' },
];

const INITIAL_AGENT_EXECUTIONS: AgentExecution[] = Object.keys(AGENT_META).map(key => ({
  agent: key,
  display_name: AGENT_DISPLAY_NAMES[key],
  status: 'pending',
}));

const DEMO_TELEMETRY_SOURCES: TelemetrySource[] = [
  { source: 'kubernetes', display_name: 'Kubernetes API',  available: true, data_mode: 'demo', latency_ms: 18 },
  { source: 'prometheus', display_name: 'Prometheus',      available: true, data_mode: 'demo', latency_ms: 42 },
  { source: 'argocd',     display_name: 'Argo CD',         available: true, data_mode: 'demo', latency_ms: 35 },
  { source: 'hubble',     display_name: 'Hubble / Cilium', available: true, data_mode: 'demo', latency_ms: 28 },
  { source: 'opencost',   display_name: 'OpenCost',        available: true, data_mode: 'demo', latency_ms: 56 },
  { source: 'kyverno',    display_name: 'Kyverno',         available: true, data_mode: 'demo', latency_ms: 22 },
  { source: 'spire',      display_name: 'SPIRE',           available: true, data_mode: 'demo', latency_ms: 31 },
];

interface DemoResponseData {
  content: string;
  severity: string;
  confidence: number;
  impacted_services: string[];
  evidence: EvidenceItem[];
  recommended_actions: RecommendedAction[];
  agentExecutions: AgentExecution[];
}

const DEMO_RESPONSES: Record<string, DemoResponseData> = {
  'What is the current platform health?': {
    content: `Platform health: MEDIUM severity.\n\n5 of 6 Argo CD applications are synchronized. The employee-portal backend is experiencing instability — 8 CrashLoopBackOff restarts in the last 30 minutes. Root cause: a Cilium NetworkPolicy is denying egress traffic from the backend to postgres on TCP 5432.\n\nMemory pressure is building (445Mi of 500Mi limit — 89%). Kyverno compliance holds at 92% across 36 policy checks. FinOps identifies a $0.14/hr right-sizing opportunity on the backend CPU (currently at 32% efficiency).\n\nRecommended immediate action: rollback the restrictive CiliumNetworkPolicy via GitOps. This will restore backend-to-postgres connectivity and allow the CrashLoop to self-heal within ~2 minutes.`,
    severity: 'medium', confidence: 0.87, impacted_services: ['employee-portal/backend', 'employee-portal/postgres'],
    evidence: [
      { source: 'kubernetes', detail: 'CrashLoopBackOff: employee-backend — 8 restarts in 30m' },
      { source: 'hubble',     detail: 'DENIED: backend→postgres TCP 5432 (42 blocked flows)' },
      { source: 'prometheus', detail: 'memory_working_set = 445Mi / 500Mi limit (89%)' },
      { source: 'argocd',     detail: '5/6 apps synced; employee-portal: OutOfSync' },
      { source: 'kyverno',    detail: 'Compliance score: 92% across 36 policy checks' },
    ],
    recommended_actions: [
      { priority: 1, action: 'Rollback restrictive CiliumNetworkPolicy via GitOps', owner: 'operations', automation_available: true, script: 'scripts/simulate-network-deny.sh --rollback', risk: 'low' },
      { priority: 2, action: 'Increase backend memory limit from 512Mi to 768Mi',    owner: 'operations', automation_available: true, risk: 'low' },
      { priority: 3, action: 'Sync employee-portal in Argo CD',                       owner: 'operations', automation_available: true, script: 'argocd app sync employee-portal', risk: 'low' },
    ],
    agentExecutions: [
      { agent: 'capacity_sre',                    display_name: 'Capacity SRE',                        status: 'complete', severity: 'high',     duration_ms: 847,  finding_summary: 'Memory at 89% of limit — OOMKill risk in 2–3h' },
      { agent: 'finops',                          display_name: 'FinOps',                              status: 'complete', severity: 'low',      duration_ms: 623,  finding_summary: 'CPU efficiency 32% — right-sizing opportunity ($0.14/hr)' },
      { agent: 'incident_prevention_remediation', display_name: 'Incident Prevention & Remediation', status: 'complete', severity: 'critical', duration_ms: 1124, finding_summary: 'CrashLoopBackOff + 42 DENIED network flows detected' },
      { agent: 'deployment_health_doctor',        display_name: 'Deployment Health Doctor',           status: 'complete', severity: 'medium',   duration_ms: 735,  finding_summary: '0/2 backend replicas available; Argo CD OutOfSync' },
      { agent: 'secure_shield',                   display_name: 'Secure Shield',                      status: 'complete', severity: 'medium',   duration_ms: 512,  finding_summary: 'Kyverno labels policy failing; SPIFFE ID missing for backend' },
    ],
  },
  'Is the employee-portal stable?': {
    content: `Employee-portal stability: CRITICAL.\n\nThe backend deployment is currently unavailable — 0 of 2 replicas are running. Root cause identified: a CiliumNetworkPolicy blocks egress from employee-backend to postgres on port 5432. Without database access the backend exits immediately, triggering an unrecoverable CrashLoop.\n\nThe frontend and auth-service are healthy. Argo CD shows the backend app as OutOfSync with 1 progressing resource.\n\nEstimated time to restore: under 3 minutes via GitOps rollback of the network policy.`,
    severity: 'critical', confidence: 0.94, impacted_services: ['employee-portal/backend', 'employee-portal/postgres'],
    evidence: [
      { source: 'kubernetes', detail: 'employee-backend: 0/2 replicas Ready — CrashLoopBackOff' },
      { source: 'hubble',     detail: '42 DENIED flows: employee-backend → postgres:5432' },
      { source: 'argocd',     detail: 'employee-portal: OutOfSync — 1 Progressing resource' },
    ],
    recommended_actions: [
      { priority: 1, action: 'Rollback CiliumNetworkPolicy to last known-good version', owner: 'operations', automation_available: true, risk: 'low' },
      { priority: 2, action: 'Force-sync employee-portal in Argo CD after rollback',    owner: 'operations', risk: 'low' },
    ],
    agentExecutions: [
      { agent: 'capacity_sre',                    display_name: 'Capacity SRE',                        status: 'complete', severity: 'low',      duration_ms: 412, finding_summary: 'Frontend resources nominal; backend pods absent' },
      { agent: 'finops',                          display_name: 'FinOps',                              status: 'complete', severity: 'low',      duration_ms: 318, finding_summary: 'No cost anomalies — backend not running' },
      { agent: 'incident_prevention_remediation', display_name: 'Incident Prevention & Remediation', status: 'complete', severity: 'critical', duration_ms: 987, finding_summary: '0/2 backend replicas; 42 DENIED flows to postgres' },
      { agent: 'deployment_health_doctor',        display_name: 'Deployment Health Doctor',           status: 'complete', severity: 'critical', duration_ms: 654, finding_summary: 'employee-portal OutOfSync — backend deployment failed' },
      { agent: 'secure_shield',                   display_name: 'Secure Shield',                      status: 'complete', severity: 'medium',   duration_ms: 445, finding_summary: 'SPIFFE ID missing for crashed backend pods' },
    ],
  },
  'Any network policy violations right now?': {
    content: `Network policy violations detected: HIGH severity.\n\n42 active flow denials recorded by Hubble/Cilium in the last 15 minutes. The primary violation: employee-backend is blocked from reaching postgres on TCP 5432 — a CiliumNetworkPolicy applied 47 minutes ago introduced an overly restrictive egress rule that did not account for the database endpoint.\n\nAdditionally, 3 cross-namespace flows from monitoring to the employee-portal namespace are being silently dropped. These are non-critical but worth cleaning up to avoid observability gaps.\n\nNo lateral movement or suspicious source IPs detected.`,
    severity: 'high', confidence: 0.91, impacted_services: ['employee-portal/backend', 'employee-portal/postgres'],
    evidence: [
      { source: 'hubble',     detail: '42 DENIED: employee-backend → postgres:5432 (egress block)' },
      { source: 'hubble',     detail: '3 DENIED: monitoring → employee-portal (cross-namespace)' },
      { source: 'kubernetes', detail: 'CiliumNetworkPolicy modified 47m ago — commit: a3f8c2d' },
    ],
    recommended_actions: [
      { priority: 1, action: 'Rollback CiliumNetworkPolicy to allow egress to postgres:5432', owner: 'operations', automation_available: true, risk: 'low' },
      { priority: 2, action: 'Update monitoring namespace egress policy to allow scrape traffic', owner: 'platform', risk: 'low' },
    ],
    agentExecutions: [
      { agent: 'capacity_sre',                    display_name: 'Capacity SRE',                        status: 'complete', severity: 'low',  duration_ms: 380,  finding_summary: 'No resource exhaustion from network denials' },
      { agent: 'finops',                          display_name: 'FinOps',                              status: 'complete', severity: 'low',  duration_ms: 295,  finding_summary: 'No cost impact from policy violations' },
      { agent: 'incident_prevention_remediation', display_name: 'Incident Prevention & Remediation', status: 'complete', severity: 'high', duration_ms: 1043, finding_summary: '42 denied flows to postgres; backend in CrashLoop' },
      { agent: 'deployment_health_doctor',        display_name: 'Deployment Health Doctor',           status: 'complete', severity: 'medium', duration_ms: 612, finding_summary: 'Deployment failure correlates with policy change at T-47m' },
      { agent: 'secure_shield',                   display_name: 'Secure Shield',                      status: 'complete', severity: 'low',  duration_ms: 489,  finding_summary: 'Policy change traced to GitOps commit a3f8c2d — no external actor' },
    ],
  },
  'What is our highest cost namespace?': {
    content: `Cost analysis complete: highest spend is in the production namespace.\n\nTop namespaces by monthly run-rate:\n1. production — $847/month (42% of total)\n2. employee-portal — $312/month (15%)\n3. monitoring — $198/month (10%)\n\nThe production namespace has a $0.14/hr CPU over-provisioning opportunity on the backend workload — current CPU request is 1000m at 32% average utilization. Right-sizing to 400m would save ~$101/month with minimal risk.\n\nOpenCost data is representative (DEMO mode). Connect OpenCost to the cluster for live cost attribution.`,
    severity: 'low', confidence: 0.82, impacted_services: ['production/backend', 'employee-portal/backend'],
    evidence: [
      { source: 'opencost',   detail: 'production namespace: $847/month — 42% of total spend' },
      { source: 'opencost',   detail: 'employee-portal: $312/month — backend CPU at 32% utilization' },
      { source: 'prometheus', detail: 'CPU avg utilization: backend=32%, frontend=61%, auth=78%' },
    ],
    recommended_actions: [
      { priority: 1, action: 'Right-size backend CPU request from 1000m to 400m (save $101/mo)', owner: 'finops',    automation_available: true, risk: 'low' },
      { priority: 2, action: 'Review monitoring namespace — Prometheus retention may be over-allocated', owner: 'platform', risk: 'low' },
    ],
    agentExecutions: [
      { agent: 'capacity_sre',                    display_name: 'Capacity SRE',                        status: 'complete', severity: 'low',  duration_ms: 556, finding_summary: 'backend CPU 32% avg — right-sizing opportunity confirmed' },
      { agent: 'finops',                          display_name: 'FinOps',                              status: 'complete', severity: 'low',  duration_ms: 891, finding_summary: 'Top spend: production ($847/mo), employee-portal ($312/mo)' },
      { agent: 'incident_prevention_remediation', display_name: 'Incident Prevention & Remediation', status: 'complete', severity: 'info', duration_ms: 398, finding_summary: 'No active incidents correlated with cost anomalies' },
      { agent: 'deployment_health_doctor',        display_name: 'Deployment Health Doctor',           status: 'complete', severity: 'low',  duration_ms: 445, finding_summary: 'All production deployments healthy' },
      { agent: 'secure_shield',                   display_name: 'Secure Shield',                      status: 'complete', severity: 'info', duration_ms: 312, finding_summary: 'No policy violations in production namespace' },
    ],
  },
  'Show me all CrashLoopBackOff pods': {
    content: `CrashLoopBackOff pods detected: 1 affected pod.\n\nemployee-portal/employee-backend-7d9f4b-xkp2q\n— Restarts: 8 in the last 30 minutes\n— Last exit code: 1 (application crash)\n— Root cause: database connection refused — Cilium egress deny on postgres:5432\n— Time in CrashLoop: ~47 minutes\n\nNo other CrashLoopBackOff pods across the cluster. All other deployments have healthy replica sets.\n\nRemediation: fix the CiliumNetworkPolicy egress rule to allow postgres traffic.`,
    severity: 'high', confidence: 0.96, impacted_services: ['employee-portal/backend'],
    evidence: [
      { source: 'kubernetes', detail: 'employee-backend-7d9f4b-xkp2q: 8 restarts, exit code 1' },
      { source: 'kubernetes', detail: 'Last log: "dial tcp postgres:5432: i/o timeout"' },
      { source: 'hubble',     detail: 'Egress deny confirmed on flow backend→postgres:5432' },
    ],
    recommended_actions: [
      { priority: 1, action: 'Fix CiliumNetworkPolicy to allow employee-backend egress to postgres:5432', owner: 'operations', automation_available: true, risk: 'low' },
      { priority: 2, action: 'Delete crashing pod after policy fix to trigger clean restart',             owner: 'operations', risk: 'low' },
    ],
    agentExecutions: [
      { agent: 'capacity_sre',                    display_name: 'Capacity SRE',                        status: 'complete', severity: 'medium', duration_ms: 467,  finding_summary: '8 restarts consuming excess memory on node' },
      { agent: 'finops',                          display_name: 'FinOps',                              status: 'complete', severity: 'low',    duration_ms: 289,  finding_summary: 'Crashing pod has minimal cost impact' },
      { agent: 'incident_prevention_remediation', display_name: 'Incident Prevention & Remediation', status: 'complete', severity: 'high',   duration_ms: 1087, finding_summary: '1 CrashLoopBackOff pod — network deny root cause confirmed' },
      { agent: 'deployment_health_doctor',        display_name: 'Deployment Health Doctor',           status: 'complete', severity: 'high',   duration_ms: 778,  finding_summary: 'backend ReplicaSet: 0/2 available — deployment degraded' },
      { agent: 'secure_shield',                   display_name: 'Secure Shield',                      status: 'complete', severity: 'low',    duration_ms: 356,  finding_summary: 'No security policy violations attributed to crash' },
    ],
  },
  'Are all Argo CD apps in sync?': {
    content: `Argo CD sync status: 5 of 6 applications are synced.\n\nOut of sync: employee-portal\n— Status: OutOfSync / Progressing\n— Reason: backend deployment has 0/2 available replicas due to active CrashLoopBackOff\n— Last sync attempt: 12 minutes ago\n— Auto-sync: enabled (waiting for healthy state)\n\nHealthy and synced:\n• three-tier-app ✓\n• monitoring-stack ✓\n• crossplane-system ✓\n• security-policies ✓\n• cert-manager ✓\n\nRecommendation: fix the underlying network policy issue first, then trigger a manual sync of employee-portal.`,
    severity: 'medium', confidence: 0.93, impacted_services: ['employee-portal'],
    evidence: [
      { source: 'argocd',     detail: 'employee-portal: OutOfSync — Progressing for 12m' },
      { source: 'argocd',     detail: '5/6 apps healthy and synced' },
      { source: 'kubernetes', detail: 'backend Deployment: 0/2 replicas available' },
    ],
    recommended_actions: [
      { priority: 1, action: 'Fix CiliumNetworkPolicy root cause (network deny on postgres)', owner: 'operations', risk: 'low' },
      { priority: 2, action: 'Run: argocd app sync employee-portal --force',                 owner: 'operations', risk: 'low' },
    ],
    agentExecutions: [
      { agent: 'capacity_sre',                    display_name: 'Capacity SRE',                        status: 'complete', severity: 'low',    duration_ms: 398, finding_summary: 'Resource state consistent with sync failures' },
      { agent: 'finops',                          display_name: 'FinOps',                              status: 'complete', severity: 'info',   duration_ms: 267, finding_summary: 'No cost anomalies from sync failures' },
      { agent: 'incident_prevention_remediation', display_name: 'Incident Prevention & Remediation', status: 'complete', severity: 'medium', duration_ms: 843, finding_summary: 'Sync failure caused by CrashLoop — network deny root cause' },
      { agent: 'deployment_health_doctor',        display_name: 'Deployment Health Doctor',           status: 'complete', severity: 'medium', duration_ms: 921, finding_summary: '5/6 apps synced; employee-portal OutOfSync 12m' },
      { agent: 'secure_shield',                   display_name: 'Secure Shield',                      status: 'complete', severity: 'info',   duration_ms: 334, finding_summary: 'No security drift detected in synced apps' },
    ],
  },
  'Any SPIRE identity gaps?': {
    content: `SPIRE identity analysis: 1 gap detected.\n\nThe employee-portal backend pod does not have an active SPIFFE identity. This is expected given the pod is in CrashLoopBackOff — SPIRE cannot issue a SVID to a non-running workload.\n\nAll other production workloads have valid SPIFFE IDs with TTLs greater than 6 hours:\n• three-tier-app components: valid SVIDs ✓\n• crossplane-system: valid SVIDs ✓\n• monitoring-stack: valid SVIDs ✓\n\nKyverno compliance: 92% (33/36 policies passing). 3 failing checks relate to missing required labels on the crashing backend pod.\n\nOnce the backend CrashLoop is resolved, SPIRE will automatically issue an SVID within 30 seconds.`,
    severity: 'medium', confidence: 0.88, impacted_services: ['employee-portal/backend'],
    evidence: [
      { source: 'spire',      detail: 'No active SVID for employee-backend (pod not running)' },
      { source: 'kyverno',    detail: 'Compliance: 92% — 3 failing label checks on backend pod' },
      { source: 'kubernetes', detail: 'Backend pod status: CrashLoopBackOff — SPIRE cannot attest' },
    ],
    recommended_actions: [
      { priority: 1, action: 'Resolve backend CrashLoopBackOff — SPIFFE ID will self-heal', owner: 'operations', risk: 'low' },
      { priority: 2, action: 'Add required Kyverno labels to backend Deployment manifest',  owner: 'platform',   risk: 'low' },
    ],
    agentExecutions: [
      { agent: 'capacity_sre',                    display_name: 'Capacity SRE',                        status: 'complete', severity: 'low',    duration_ms: 389, finding_summary: 'No capacity issues from identity gaps' },
      { agent: 'finops',                          display_name: 'FinOps',                              status: 'complete', severity: 'info',   duration_ms: 256, finding_summary: 'No cost impact from SPIRE gaps' },
      { agent: 'incident_prevention_remediation', display_name: 'Incident Prevention & Remediation', status: 'complete', severity: 'medium', duration_ms: 712, finding_summary: 'Backend crash prevents SPIFFE attestation' },
      { agent: 'deployment_health_doctor',        display_name: 'Deployment Health Doctor',           status: 'complete', severity: 'medium', duration_ms: 589, finding_summary: 'Backend deployment failure cascades to identity gap' },
      { agent: 'secure_shield',                   display_name: 'Secure Shield',                      status: 'complete', severity: 'medium', duration_ms: 934, finding_summary: '1 SVID missing; Kyverno 92% compliant (3 label violations)' },
    ],
  },
  'What should I fix first?': {
    content: `Priority action plan — ranked by severity and blast radius:\n\n1. [CRITICAL] Fix CiliumNetworkPolicy egress rule blocking postgres:5432\n   Impact: restores employee-portal backend, stops CrashLoopBackOff, unblocks SPIRE identity issuance, enables Argo CD sync.\n   Time to fix: ~3 minutes via GitOps rollback.\n   Command: scripts/simulate-network-deny.sh --rollback\n\n2. [HIGH] Increase backend memory limit from 512Mi to 768Mi\n   Impact: prevents OOMKill as memory approaches 89% of limit.\n   Risk: low — live-apply via kubectl or GitOps.\n\n3. [MEDIUM] Sync employee-portal in Argo CD after network fix\n   Impact: clears OutOfSync state, restores deployment health dashboard.\n\n4. [LOW] Right-size backend CPU from 1000m to 400m\n   Impact: saves ~$101/month — schedule during next maintenance window.\n\nFix #1 resolves 4 of the 5 active findings automatically.`,
    severity: 'high', confidence: 0.91, impacted_services: ['employee-portal/backend', 'employee-portal/postgres'],
    evidence: [
      { source: 'incident_prevention_remediation', detail: 'CrashLoopBackOff + 42 denied flows — root cause: NetworkPolicy' },
      { source: 'capacity_sre',                    detail: 'Memory 89% of limit — OOMKill risk within 2–3h' },
      { source: 'deployment_health_doctor',        detail: 'Argo CD OutOfSync — blocked by backend crash' },
      { source: 'finops',                          detail: 'CPU right-sizing saves $101/month — low risk' },
    ],
    recommended_actions: [
      { priority: 1, action: 'Rollback CiliumNetworkPolicy (resolves 4 of 5 findings)', owner: 'operations', automation_available: true, script: 'scripts/simulate-network-deny.sh --rollback', risk: 'low' },
      { priority: 2, action: 'Increase backend memory limit to 768Mi',                  owner: 'operations', automation_available: true, risk: 'low' },
      { priority: 3, action: 'Sync employee-portal in Argo CD post-fix',                owner: 'operations', risk: 'low' },
      { priority: 4, action: 'Right-size backend CPU to 400m (next maintenance window)', owner: 'finops',    risk: 'low' },
    ],
    agentExecutions: [
      { agent: 'capacity_sre',                    display_name: 'Capacity SRE',                        status: 'complete', severity: 'high',     duration_ms: 847,  finding_summary: 'Memory at 89% limit — OOMKill risk in 2–3h' },
      { agent: 'finops',                          display_name: 'FinOps',                              status: 'complete', severity: 'low',      duration_ms: 623,  finding_summary: 'CPU right-sizing: $101/month savings available' },
      { agent: 'incident_prevention_remediation', display_name: 'Incident Prevention & Remediation', status: 'complete', severity: 'critical', duration_ms: 1124, finding_summary: 'CrashLoopBackOff + 42 denied flows — NetworkPolicy root cause' },
      { agent: 'deployment_health_doctor',        display_name: 'Deployment Health Doctor',           status: 'complete', severity: 'medium',   duration_ms: 735,  finding_summary: 'Argo CD OutOfSync — blocked by backend crash' },
      { agent: 'secure_shield',                   display_name: 'Secure Shield',                      status: 'complete', severity: 'medium',   duration_ms: 512,  finding_summary: 'SPIFFE ID gap + 3 Kyverno label violations' },
    ],
  },
};

function getDemoResponse(question: string): DemoResponseData {
  const exact = DEMO_RESPONSES[question];
  if (exact) return exact;
  const q = question.toLowerCase();
  for (const [key, val] of Object.entries(DEMO_RESPONSES)) {
    const words = key.toLowerCase().split(' ').filter(w => w.length > 4);
    if (words.some(w => q.includes(w))) return val;
  }
  return DEMO_RESPONSES['What is the current platform health?'];
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// ─── Small presentational components ─────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const s = (severity || 'info').toLowerCase();
  const c = SEVERITY_COLORS[s] || SEVERITY_COLORS.info;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.06em', textTransform: 'uppercase', background: c.bg, color: c.color, fontFamily: f }}>
      {s}
    </span>
  );
}

function DataModeBadge({ mode }: { mode: string }) {
  const m = (mode || 'demo').toLowerCase();
  const st = DATA_MODE_STYLE[m] || DATA_MODE_STYLE.demo;
  return (
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', background: st.bg, color: st.color, fontFamily: f }}>
      {st.label}
    </span>
  );
}

function AgentStatusIcon({ status, severity }: { status: string; severity?: string }) {
  const sev = (severity || 'info').toLowerCase();
  if (status === 'running') return <Spinner />;
  if (status === 'pending') return <Clock size={13} strokeWidth={1.5} color={'var(--ds-text-tertiary)'} />;
  if (status === 'failed')  return <XCircle size={13} strokeWidth={1.5} color={'var(--ds-error)'} />;
  if (status === 'skipped') return <Info size={13} strokeWidth={1.5} color={'var(--ds-text-tertiary)'} />;
  if (sev === 'critical' || sev === 'high') return <AlertTriangle size={13} strokeWidth={1.5} color={sev === 'critical' ? 'var(--ds-error)' : 'var(--ds-warn)'} />;
  return <CheckCircle2 size={13} strokeWidth={1.5} color={'var(--ds-success)'} />;
}

function TelemetryDot({ mode }: { mode: string }) {
  const m = (mode || 'unavailable').toLowerCase();
  const color = m === 'live' ? 'var(--ds-success)' : m === 'demo' ? 'var(--ds-warn)' : 'var(--ds-text-tertiary)';
  return <Circle size={7} fill={color} color={color} />;
}

function Spinner({ size = 13, color = 'var(--ds-focus)' }: { size?: number; color?: string }) {
  return (
    <span style={{ display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <style>{`@keyframes ds-spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{
        width: size, height: size, borderRadius: '50%',
        border: `2px solid ${tokens.color.hairline}`,
        borderTopColor: color,
        animation: 'ds-spin 0.7s linear infinite',
        display: 'block',
      }} />
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AIOpsInteractiveChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const demoAbortRef = useRef<boolean>(false);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fires if no LLM token arrives within 12 s of the "synthesizing" phase —
  // catches Ollama model cold-start hangs without waiting the full 45 s.
  const synthDeadlineRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Ready');
  const [agentExecutions, setAgentExecutions] = useState<AgentExecution[]>(INITIAL_AGENT_EXECUTIONS);
  const [telemetrySources, setTelemetrySources] = useState<TelemetrySource[]>(DEMO_TELEMETRY_SOURCES);
  const [overallMode, setOverallMode] = useState<'live' | 'partial' | 'demo'>('demo');
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [llmProvider, setLlmProvider] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Probe the engine on mount so the banner reflects actual reachability immediately.
  useEffect(() => {
    let cancelled = false;
    fetch(`${AIOPS_API_BASE}/health`, { method: 'GET' })
      .then(r => { if (!cancelled && r.ok) setIsDemoMode(false); })
      .catch(() => { if (!cancelled) setIsDemoMode(true); });
    return () => { cancelled = true; };
  }, []);

  const updateAgentExecution = useCallback((updated: Partial<AgentExecution> & { agent: string }) => {
    setAgentExecutions(prev => {
      const idx = prev.findIndex(e => e.agent === updated.agent);
      if (idx === -1) return [...prev, updated as AgentExecution];
      const next = [...prev];
      next[idx] = { ...next[idx], ...updated };
      return next;
    });
  }, []);

  const simulateDemoMode = useCallback(async (question: string, managerMsgId: string) => {
    demoAbortRef.current = false;
    const demo = getDemoResponse(question);
    setTelemetrySources(DEMO_TELEMETRY_SOURCES);
    setOverallMode('demo');
    setStatusText('Collecting signals…');
    await sleep(500);
    if (demoAbortRef.current) return;
    setStatusText('Running agents…');
    for (const key of Object.keys(AGENT_META)) {
      if (demoAbortRef.current) return;
      updateAgentExecution({ agent: key, display_name: AGENT_DISPLAY_NAMES[key], status: 'running' });
      const agentData = demo.agentExecutions.find(a => a.agent === key);
      await sleep(agentData?.duration_ms ? Math.min(agentData.duration_ms * 0.4, 600) : 350);
      if (demoAbortRef.current) return;
      updateAgentExecution({ agent: key, display_name: AGENT_DISPLAY_NAMES[key], status: 'complete', severity: agentData?.severity, duration_ms: agentData?.duration_ms, finding_summary: agentData?.finding_summary });
    }
    setStatusText('Synthesizing…');
    await sleep(400);
    if (demoAbortRef.current) return;
    const content = demo.content;
    for (let i = 0; i < content.length; i += 4) {
      if (demoAbortRef.current) return;
      const token = content.slice(i, i + 4);
      setMessages(prev => prev.map(m => m.id === managerMsgId ? { ...m, content: m.content + token } : m));
      await sleep(12);
    }
    if (demoAbortRef.current) return;
    setMessages(prev => prev.map(m => m.id === managerMsgId ? { ...m, isStreaming: false, severity: demo.severity, confidence: demo.confidence, impacted_services: demo.impacted_services, evidence: demo.evidence, recommended_actions: demo.recommended_actions, data_mode: 'demo', llm_model: 'llama3.1:8b (simulated)', evidenceOpen: false } : m));
    setStatusText('Ready');
    setIsStreaming(false);
    setIsDemoMode(true);
  }, [updateAgentExecution]);

  const handleSend = useCallback(async (question?: string) => {
    const q = (question ?? inputValue).trim();
    if (!q || isStreaming) return;
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    if (synthDeadlineRef.current) { clearTimeout(synthDeadlineRef.current); synthDeadlineRef.current = null; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    demoAbortRef.current = false;
    setIsDemoMode(false); // reset stale demo state; will be re-set if this attempt also fails
    const abortCtrl = abortRef.current;
    // 45 s hard cap (down from 90 s) — backend LLM budget is 40 s so this
    // gives a small grace window before we declare the stream dead.
    streamTimeoutRef.current = setTimeout(() => { abortCtrl.abort(); }, 45_000);
    const userMsgId = `user-${Date.now()}`;
    const managerMsgId = `mgr-${Date.now()}`;
    setInputValue('');
    setIsStreaming(true);
    setStatusText('Collecting signals…');
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: q, timestamp: new Date() }]);
    setMessages(prev => [...prev, { id: managerMsgId, role: 'manager', content: '', isStreaming: true, timestamp: new Date(), evidenceOpen: false }]);
    setAgentExecutions(Object.keys(AGENT_META).map(key => ({ agent: key, display_name: AGENT_DISPLAY_NAMES[key], status: 'pending' })));
    const payload = { question: q, conversation_id: conversationId, scope: 'cluster', include_security: true, include_cost: true, include_deployment: true };
    let timeoutFired = false;
    const fallbackTimeout = setTimeout(() => { timeoutFired = true; abortRef.current?.abort(); }, 30_000);
    try {
      const resp = await fetch(`${AIOPS_API_BASE}/chat/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: abortRef.current.signal });
      clearTimeout(fallbackTimeout);
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      // Backend sends flat SSE events: { type, message, phase, ... } — not wrapped in { type, data }
      const processEvent = (evt: Record<string, unknown>) => {
        const type = evt.type as string;
        if (type === 'status') {
          setStatusText((evt.message as string) || 'Working…');
          // Arm a 12 s first-token deadline when the synthesizing phase starts.
          // Covers Ollama model cold-start hangs without waiting the full 45 s.
          if ((evt.phase as string) === 'synthesizing') {
            if (synthDeadlineRef.current) clearTimeout(synthDeadlineRef.current);
            synthDeadlineRef.current = setTimeout(() => {
              synthDeadlineRef.current = null;
              abortRef.current?.abort();
            }, 12_000);
          }
        }
        else if (type === 'signals') {
          const sources = evt.sources as TelemetrySource[] | undefined;
          const mode = evt.overall_mode as 'live' | 'partial' | 'demo' | undefined;
          if (sources) setTelemetrySources(sources);
          if (mode) setOverallMode(mode);
          setStatusText('Running agents…');
        } else if (type === 'agent_start') { updateAgentExecution({ agent: evt.agent as string, display_name: evt.display_name as string, status: 'running' }); }
        else if (type === 'agent_result') { updateAgentExecution({ agent: evt.agent as string, display_name: evt.display_name as string, status: 'complete', duration_ms: evt.duration_ms as number | undefined, severity: evt.severity as string | undefined, finding_summary: evt.finding_summary as string | undefined, signals_queried: evt.signals_queried as string[] | undefined }); setStatusText('Synthesizing…'); }
        else if (type === 'token') {
          // First token — cancel the synth deadline, LLM is responsive
          if (synthDeadlineRef.current) { clearTimeout(synthDeadlineRef.current); synthDeadlineRef.current = null; }
          const token = evt.text as string; if (token) setMessages(prev => prev.map(m => m.id === managerMsgId ? { ...m, content: m.content + token } : m));
        }
        else if (type === 'complete') {
          if (streamTimeoutRef.current) { clearTimeout(streamTimeoutRef.current); streamTimeoutRef.current = null; }
          if (synthDeadlineRef.current) { clearTimeout(synthDeadlineRef.current); synthDeadlineRef.current = null; }
          const chatResp = (evt.result || evt) as { conversation_id?: string; manager_summary?: string; severity?: string; confidence?: number; impacted_services?: string[]; evidence?: EvidenceItem[]; recommended_actions?: RecommendedAction[]; agent_findings?: Record<string, { status: string; severity: string; findings: string[] }>; data_mode?: 'live' | 'demo'; llm_model?: string; llm_provider?: string; execution_timeline?: AgentExecution[] };
          const cid = chatResp.conversation_id;
          if (cid) setConversationId(cid);
          if (chatResp.execution_timeline) setAgentExecutions(chatResp.execution_timeline);
          if (chatResp.llm_provider) setLlmProvider(chatResp.llm_provider);
          setMessages(prev => prev.map(m => m.id === managerMsgId ? { ...m, isStreaming: false, content: chatResp.manager_summary || m.content, severity: chatResp.severity, confidence: chatResp.confidence, impacted_services: chatResp.impacted_services, evidence: chatResp.evidence, recommended_actions: chatResp.recommended_actions, agent_findings: chatResp.agent_findings, data_mode: chatResp.data_mode, llm_model: chatResp.llm_model, evidenceOpen: false } : m));
          setStatusText('Ready');
          setIsStreaming(false);
        } else if (type === 'error') {
          if (streamTimeoutRef.current) { clearTimeout(streamTimeoutRef.current); streamTimeoutRef.current = null; }
          if (synthDeadlineRef.current) { clearTimeout(synthDeadlineRef.current); synthDeadlineRef.current = null; }
          setMessages(prev => prev.map(m => m.id === managerMsgId ? { ...m, isStreaming: false, content: `Error: ${evt.message || 'Unknown error'}` } : m));
          setStatusText('Error — ready');
          setIsStreaming(false);
        }
      };
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try { const parsed = JSON.parse(jsonStr) as Record<string, unknown>; processEvent(parsed); } catch { /* skip malformed lines */ }
        }
      }
      // Stream closed without a 'complete' event — ensure UI is not left hanging
      setIsStreaming(false);
      setStatusText('Ready');
    } catch (err: unknown) {
      if (streamTimeoutRef.current) { clearTimeout(streamTimeoutRef.current); streamTimeoutRef.current = null; }
      if (synthDeadlineRef.current) { clearTimeout(synthDeadlineRef.current); synthDeadlineRef.current = null; }
      clearTimeout(fallbackTimeout);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      if (isAbort && !timeoutFired) { /* user cancel */ } else { await simulateDemoMode(q, managerMsgId); }
    }
  }, [inputValue, isStreaming, conversationId, updateAgentExecution, simulateDemoMode]);

  const toggleEvidence = (id: string) => setMessages(prev => prev.map(m => m.id === id ? { ...m, evidenceOpen: !m.evidenceOpen } : m));
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const handleClear = () => {
    if (streamTimeoutRef.current) { clearTimeout(streamTimeoutRef.current); streamTimeoutRef.current = null; }
    if (synthDeadlineRef.current) { clearTimeout(synthDeadlineRef.current); synthDeadlineRef.current = null; }
    abortRef.current?.abort();
    demoAbortRef.current = true;
    setMessages([]); setConversationId(null); setAgentExecutions(INITIAL_AGENT_EXECUTIONS);
    setTelemetrySources(DEMO_TELEMETRY_SOURCES); setIsStreaming(false); setStatusText('Ready');
    setIsDemoMode(false); setOverallMode('demo');
  };
  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <AppleShell title="Manager Agent" noPadding>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: f }}>

        {/* ── Back nav ── */}
        <div style={{ padding: '6px 24px 0', flexShrink: 0 }}>
          <BackBreadcrumb label="AIOps Dashboard" to="/aiops" style={{ marginBottom: 0 }} />
        </div>

        {/* ── Sub-header ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', borderBottom: `1px solid ${tokens.color.hairline}`, background: tokens.color.surface, flexShrink: 0, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: tokens.color.surfaceAlt, border: `1px solid ${tokens.color.hairline}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <GitBranch size={16} strokeWidth={1.5} color={'var(--ds-text-primary)'} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ds-text-primary)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>Manager Agent Command Center</p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-tertiary)', lineHeight: 1.4 }}>Ask operational questions across capacity, incidents, deployments, security, and cost.</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {[
              llmProvider === 'anthropic' ? '✦ Claude' : llmProvider === 'ollama' ? 'Local LLM' : 'LLM',
              'LangGraph',
              '5 Worker Agents',
            ].map(label => (
              <span key={label} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: tokens.radius.button,
                background: llmProvider === 'anthropic' && label.startsWith('✦') ? 'var(--clr-compose-bg)' : tokens.color.surfaceAlt,
                border: `1px solid ${llmProvider === 'anthropic' && label.startsWith('✦') ? 'var(--clr-compose-border)' : tokens.color.hairline}`,
                color: llmProvider === 'anthropic' && label.startsWith('✦') ? 'var(--clr-compose)' : 'var(--ds-text-secondary)', fontFamily: f }}>
                {label}
              </span>
            ))}
            <DataModeBadge mode={overallMode} />
            <button onClick={handleClear} title="Clear conversation" style={{ width: 28, height: 28, border: `1px solid ${tokens.color.hairline}`, borderRadius: 6, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ds-text-tertiary)' }}>
              <RotateCcw size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Demo mode notice ── */}
        {isDemoMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 24px', background: 'var(--ds-chip-warn-bg)', borderBottom: `1px solid ${tokens.color.hairline}`, fontSize: 12, color: 'var(--ds-warn)', flexShrink: 0 }}>
            <Lightbulb size={13} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            <span><strong>Representative data</strong> — AIOps engine unreachable. Responses use simulated cluster signals. To connect: <code style={{ fontFamily: mono, background: 'var(--ds-hairline)', padding: '1px 5px', borderRadius: 3 }}>kubectl port-forward -n aiops svc/aiops-engine 8000:8000</code></span>
          </div>
        )}

        {/* ── Main body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: chat */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: '0 0 68%', borderRight: `1px solid ${tokens.color.hairline}`, minWidth: 0 }}>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.length === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ textAlign: 'center', padding: '8px 16px' }}>
                    <p style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--ds-text-primary)', letterSpacing: '-0.01em' }}>Investigate your platform with AI</p>
                    <p style={{ margin: 0, fontSize: 14, color: 'var(--ds-text-secondary)', lineHeight: 1.6, maxWidth: 480, marginInline: 'auto' }}>
                      The Manager Agent coordinates 5 specialist workers — Capacity SRE, FinOps, Incident Prevention, Deployment Health, and Secure Shield — to synthesize operational answers in seconds.
                    </p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {INVESTIGATION_CARDS.map(card => (
                      <div key={card.q} onClick={() => !isStreaming && handleSend(card.q)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') !isStreaming && handleSend(card.q); }}
                        style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.hairline}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', transition: `box-shadow ${tokens.motion.duration} ${tokens.motion.standard}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = tokens.shadow.hover; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                      >
                        <div style={{ marginBottom: 6 }}>{card.icon}</div>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--ds-text-primary)', lineHeight: 1.3 }}>{card.q}</p>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-tertiary)', lineHeight: 1.5 }}>{card.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 600, color: 'var(--ds-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: f }}>Worker Agents Available</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {Object.entries(AGENT_META).map(([key, meta]) => (
                        <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, padding: '3px 9px', borderRadius: tokens.radius.button, background: tokens.color.surfaceAlt, border: `1px solid ${tokens.color.hairline}`, color: 'var(--ds-text-secondary)', fontFamily: f }}>
                          {React.cloneElement(meta.icon as React.ReactElement<{ size?: number; color?: string }>, { size: 11, color: meta.color })}
                          {AGENT_DISPLAY_NAMES[key]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map(msg => msg.role === 'user' ? (
                <div key={msg.id} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <div>
                    <div style={{ maxWidth: 480, background: 'var(--ds-text-primary)', borderRadius: '12px 12px 2px 12px', padding: '10px 14px', color: '#fff', fontSize: 14, lineHeight: 1.6, fontFamily: f }}>
                      {msg.content}
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--ds-text-tertiary)', textAlign: 'right', fontFamily: f }}>{formatTime(msg.timestamp)}</p>
                  </div>
                </div>
              ) : (
                <div key={msg.id} style={{ alignSelf: 'flex-start', width: '100%' }}>
                  <div style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.hairline}`, borderRadius: 12, padding: '14px 16px', boxShadow: tokens.shadow.resting }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: tokens.color.surfaceAlt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <GitBranch size={12} strokeWidth={1.5} color={'var(--ds-focus)'} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--ds-chip-info-text)', fontWeight: 700, letterSpacing: '0.02em', fontFamily: f }}>Manager Agent</span>
                      {msg.severity && !msg.isStreaming && <SeverityBadge severity={msg.severity} />}
                      {msg.data_mode && !msg.isStreaming && <DataModeBadge mode={msg.data_mode} />}
                      {msg.confidence !== undefined && !msg.isStreaming && (
                        <span style={{ fontSize: 11, color: 'var(--ds-text-tertiary)', marginLeft: 'auto', fontFamily: f }}>{Math.round((msg.confidence ?? 0) * 100)}% confidence</span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--ds-text-tertiary)', marginLeft: msg.confidence !== undefined ? 0 : 'auto', fontFamily: f }}>{formatTime(msg.timestamp)}</span>
                    </div>

                    {msg.isStreaming && !msg.content && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Spinner />
                        <span style={{ fontSize: 12, color: 'var(--ds-text-tertiary)', fontStyle: 'italic', fontFamily: f }}>{statusText}</span>
                      </div>
                    )}

                    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: 'var(--ds-text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: f }}>
                      {msg.content || (msg.isStreaming ? '' : '—')}
                      {msg.isStreaming && msg.content && (
                        <span style={{ display: 'inline-block', width: 2, height: '1em', background: 'var(--ds-focus)', marginLeft: 2, verticalAlign: 'text-bottom', animation: 'ds-blink 1s step-end infinite' }}>
                          <style>{`@keyframes ds-blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
                        </span>
                      )}
                    </p>

                    {!msg.isStreaming && msg.impacted_services && msg.impacted_services.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 10 }}>
                        {msg.impacted_services.map((svc, i) => (
                          <span key={i} style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: tokens.radius.button, background: 'var(--ds-chip-info-bg)', color: 'var(--ds-chip-info-text)', fontFamily: f }}>{svc}</span>
                        ))}
                      </div>
                    )}

                    {!msg.isStreaming && msg.recommended_actions && msg.recommended_actions.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: 'var(--ds-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: f }}>Recommended Actions</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {msg.recommended_actions.slice(0, 4).map((ra, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--ds-text-secondary)', lineHeight: 1.5, padding: '6px 10px', background: tokens.color.surfaceAlt, borderRadius: 8, border: `1px solid ${tokens.color.hairline}`, fontFamily: f }}>
                              <span style={{ color: 'var(--ds-warn)', fontWeight: 700, flexShrink: 0, fontFamily: mono, fontSize: 11, marginTop: 1 }}>{ra.priority}.</span>
                              <span style={{ flex: 1 }}>{ra.action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {!msg.isStreaming && msg.evidence && msg.evidence.length > 0 && (
                      <>
                        <button onClick={() => toggleEvidence(msg.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: 'var(--ds-text-tertiary)', fontSize: 12, marginTop: 10, background: 'none', border: 'none', padding: 0, fontFamily: f }}>
                          <ChevronDown size={14} strokeWidth={1.5} style={{ transform: msg.evidenceOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                          {msg.evidenceOpen ? 'Hide telemetry evidence' : `Show telemetry evidence (${msg.evidence.length} sources)`}
                        </button>
                        {msg.evidenceOpen && (
                          <div style={{ marginTop: 6, background: tokens.color.surfaceAlt, borderRadius: 8, padding: '10px 12px', border: `1px solid ${tokens.color.hairline}` }}>
                            {msg.evidence.map((ev, i) => (
                              <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.5, color: 'var(--ds-text-secondary)', padding: '2px 0', fontFamily: mono }}>
                                <span style={{ color: 'var(--ds-chip-info-text)', fontWeight: 600, flexShrink: 0 }}>{ev.source}:</span>
                                <span>{ev.detail || ev.value || ev.metric || '—'}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {!msg.isStreaming && msg.llm_model && (
                      <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: f }}>via {msg.llm_model}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div style={{ padding: '12px 20px 16px', borderTop: `1px solid ${tokens.color.hairline}`, background: tokens.color.surface, flexShrink: 0 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                {DEMO_PROMPTS.map(p => (
                  <button key={p} onClick={() => handleSend(p)} disabled={isStreaming}
                    style={{ fontSize: 11, fontWeight: 500, padding: '4px 10px', borderRadius: tokens.radius.button, background: 'transparent', border: `1px solid ${tokens.color.hairline}`, color: 'var(--ds-text-secondary)', cursor: 'pointer', fontFamily: f, opacity: isStreaming ? 0.5 : 1 }}>
                    {p}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <textarea
                  ref={inputRef}
                  rows={2}
                  placeholder="Ask about incidents, capacity, cost, security, deployments, or platform health… (Enter to send)"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  style={{ flex: 1, resize: 'none', border: `1px solid ${tokens.color.hairline}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: f, color: 'var(--ds-text-primary)', background: tokens.color.surfaceAlt, outline: 'none', lineHeight: 1.5 }}
                />
                <button onClick={() => handleSend()} disabled={!inputValue.trim() || isStreaming}
                  style={{ width: 36, height: 36, borderRadius: 10, background: inputValue.trim() && !isStreaming ? 'var(--ds-text-primary)' : tokens.color.surfaceAlt, border: `1px solid ${tokens.color.hairline}`, cursor: inputValue.trim() && !isStreaming ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isStreaming ? <Spinner size={16} /> : <Send size={16} strokeWidth={1.5} color={inputValue.trim() ? '#fff' : 'var(--ds-text-tertiary)'} />}
                </button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: f }}>
                <span>Enter to send · Shift+Enter for new line</span>
                {conversationId && <span>conv: {conversationId}</span>}
              </div>
              {isStreaming && (
                <div style={{ marginTop: 6, height: 2, background: tokens.color.surfaceAlt, borderRadius: 1, overflow: 'hidden' }}>
                  <style>{`@keyframes ds-progress { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }`}</style>
                  <div style={{ height: '100%', width: '40%', background: 'var(--ds-focus)', animation: 'ds-progress 1.2s ease-in-out infinite' }} />
                </div>
              )}
            </div>
          </div>

          {/* Right: agent intelligence */}
          <div style={{ flex: '0 0 32%', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 16, gap: 12, background: tokens.color.background }}>

            {/* Agent panel */}
            <div style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.hairline}`, borderRadius: 12, padding: '12px 14px', boxShadow: tokens.shadow.resting }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--ds-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, fontFamily: f }}>
                <BarChart2 size={12} strokeWidth={1.5} /> Worker Agent Status
              </p>
              {agentExecutions.map(exec => {
                const meta = AGENT_META[exec.agent];
                const isReady = exec.status === 'pending' && !isStreaming;
                return (
                  <div key={exec.agent} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: `1px solid ${tokens.color.hairline}` }}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: `${meta?.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {meta?.icon ? React.cloneElement(meta.icon as React.ReactElement<{ size?: number; color?: string; strokeWidth?: number }>, { size: 12, color: meta.color, strokeWidth: 1.5 }) : <Zap size={12} strokeWidth={1.5} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontSize: 12, color: 'var(--ds-text-primary)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: f }}>{exec.display_name}</span>
                        {exec.duration_ms && exec.status === 'complete' && <span style={{ fontSize: 10, color: 'var(--ds-text-tertiary)', fontFamily: mono, flexShrink: 0 }}>{Math.round(exec.duration_ms)}ms</span>}
                        <AgentStatusIcon status={exec.status} severity={exec.severity} />
                      </div>
                      {isReady && meta?.role && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ds-text-tertiary)', fontFamily: f }}>{meta.role}</p>}
                      {exec.finding_summary && exec.status === 'complete' && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ds-text-secondary)', lineHeight: 1.4, fontFamily: f }}>{exec.finding_summary.slice(0, 90)}{exec.finding_summary.length > 90 ? '…' : ''}</p>}
                      {exec.status === 'running' && <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ds-chip-info-text)', fontStyle: 'italic', fontFamily: f }}>Analyzing…</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Telemetry panel */}
            <div style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.hairline}`, borderRadius: 12, padding: '12px 14px', boxShadow: tokens.shadow.resting }}>
              <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--ds-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, fontFamily: f }}>
                <Database size={12} strokeWidth={1.5} /> Telemetry Sources
              </p>
              {telemetrySources.map(src => (
                <div key={src.source} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
                  <TelemetryDot mode={src.data_mode} />
                  <span style={{ fontSize: 12, color: 'var(--ds-text-primary)', flex: 1, fontFamily: f }}>{src.display_name}</span>
                  <span style={{ fontSize: 10, fontFamily: mono, fontWeight: 600, color: src.data_mode === 'live' ? 'var(--ds-success)' : src.data_mode === 'demo' ? 'var(--ds-warn)' : 'var(--ds-text-tertiary)' }}>
                    {src.data_mode.toUpperCase()}{src.latency_ms !== undefined ? ` · ${Math.round(src.latency_ms)}ms` : ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{ background: tokens.color.surface, border: `1px solid ${tokens.color.hairline}`, borderRadius: 12, padding: '10px 14px', boxShadow: tokens.shadow.resting }}>
              <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--ds-text-tertiary)', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: f }}>Data Legend</p>
              {[
                { color: 'var(--ds-success)', label: 'LIVE', desc: 'Real cluster data' },
                { color: 'var(--ds-warn)',    label: 'DEMO', desc: 'Representative / simulated' },
                { color: 'var(--ds-text-tertiary)', label: 'N/A', desc: 'Source unreachable' },
              ].map(({ color, label, desc }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Circle size={7} fill={color} color={color} />
                  <span style={{ fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: f }}><span style={{ color, fontWeight: 700 }}>{label}</span> — {desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div style={{ padding: '5px 24px', borderTop: `1px solid ${tokens.color.hairline}`, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ds-text-tertiary)', background: tokens.color.surface, flexShrink: 0, fontFamily: f }}>
          <Circle size={7} fill={isStreaming ? 'var(--ds-focus)' : 'var(--ds-success)'} color={isStreaming ? 'var(--ds-focus)' : 'var(--ds-success)'} />
          <span style={{ fontWeight: 500 }}>{statusText}</span>
          {isDemoMode && !isStreaming && <span style={{ color: 'var(--ds-warn)' }}>· representative data</span>}
          {isStreaming && <span style={{ color: 'var(--ds-chip-info-text)' }}>· {statusText}</span>}
        </div>
      </div>
    </AppleShell>
  );
}
