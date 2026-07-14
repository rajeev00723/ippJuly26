import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { AppleShell } from '../../design-system/primitives/AppleShell';

const D = {
  red:     '#D40511',
  redDark: '#AA0408',
  yellow:  '#FFCC00',
  dark:    '#1A1A1A',
  surface: '#FFFFFF',
  surface2:'#F7F5EF',
  border:  '#E5E7EB',
  text:    '#1A1A1A',
  muted:   '#6B6B6B',
};

// ─── Demo narrative ──────────────────────────────────────────────────────────

const STORY = [
  {
    badge: 'BEFORE',
    badgeColor: D.red,
    title: 'Days-to-weeks provisioning via three tools',
    body: 'Every infra request flows through IPP (the sole Git writer), fans out to VRA (OpenShift), Terraform (AKS), and Cloudify (Azure VMs) independently, then requires IPP to aggregate status callbacks. No unified control plane. No live portal visibility.',
    tags: ['VRA', 'Terraform', 'Cloudify', 'GitHub Actions'],
  },
  {
    badge: 'AFTER',
    badgeColor: '#1a7a2e',
    title: '~10-minute provisioning via one control plane',
    body: 'IPP still writes to Git — but now a Crossplane Claim YAML instead of three tool configs. Argo CD detects the push and syncs it to Crossplane. Crossplane reconciles ComputeInstance, StorageVolume, and VolumeAttachment. Status flows directly back to IPP via the Kubernetes API. No callbacks. No sprawl.',
    tags: ['Crossplane', 'Argo CD', 'Gitea', 'IPP Service'],
  },
];

// ─── Live demo path ──────────────────────────────────────────────────────────

const DEMO_SCRIPT = [
  {
    num: '01',
    title: 'Land on the Portal',
    action: 'Open backstage.ipp.local — see the IPP landing page. Note the platform health stats, the 5 persona tiles, and the "Before / After" narrative.',
    tags: ['backstage.ipp.local'],
    route: '/',
  },
  {
    num: '02',
    title: 'Log in as Developer',
    action: 'Click Developer → log in as dev.user / Dev@IPP2025. The portal re-themes to the Developer view: Catalog, Create, Onboard App, My Resources.',
    tags: ['dev.user', 'Dev@IPP2025'],
    route: '/developer',
  },
  {
    num: '03',
    title: 'Browse the Service Catalog',
    action: 'Go to Catalog. Show the ThreeTierApp component registered from Crossplane. Open the entity — Kubernetes tab shows live pod status direct from the cluster.',
    tags: ['Catalog', 'Crossplane', 'K8s Plugin'],
    route: '/catalog',
  },
  {
    num: '04',
    title: 'Onboard an App via the Infra Wizard',
    action: 'Go to Onboard an Application. Pick a target — KubeVirt VM, Local Cluster, or AKS — and a size (S/M/L). Confirm. IIP validates, writes the Claim YAML to Gitea, and Argo CD syncs it to Crossplane within seconds.',
    tags: ['IPP Service', 'Gitea', 'Claim YAML'],
    route: '/infra-onboarding',
  },
  {
    num: '05',
    title: 'Watch GitOps in action',
    action: 'Open argocd.ipp.local in another tab. Watch the Application go from OutOfSync → Synced → Healthy as Crossplane reconciles the Managed Resources (ComputeInstance + StorageVolume + VolumeAttachment).',
    tags: ['argocd.ipp.local', 'Argo CD'],
    route: '/gitops',
  },
  {
    num: '06',
    title: 'Switch to Platform Engineer',
    action: 'Log in as platform.engineer / Platform@IPP2025. Show the Crossplane dashboard — XRDs, Compositions, live Claim status, and MR health across the cluster.',
    tags: ['platform.engineer', 'Platform@IPP2025'],
    route: '/crossplane',
  },
  {
    num: '07',
    title: 'Show Observability',
    action: 'Go to Operations → Grafana (grafana.ipp.local). Open the IPP Full Telemetry dashboard. Show Crossplane reconcile latency, pod health, and network flow volume from Hubble.',
    tags: ['grafana.ipp.local', 'Prometheus', 'Hubble'],
    route: '/operations',
  },
  {
    num: '08',
    title: 'AIOps — Trigger & Detect an Incident',
    action: 'Run simulate-crashloop.sh in a terminal. Switch to Agent Command Center. Watch the LangGraph multi-agent system detect the CrashLoopBackOff, root-cause it, and propose a remediation. Accept it to auto-apply.',
    tags: ['AIOps', 'LangGraph', 'Auto-Remediation'],
    route: '/agent-command-center',
  },
  {
    num: '09',
    title: 'Security & Policy',
    action: 'Log in as security.analyst / Security@IPP2025. Show the Security dashboard — OPA/Kyverno policy violations, SPIRE workload identities, Cilium network flows in Hubble UI.',
    tags: ['security.analyst', 'OPA', 'Kyverno', 'SPIRE'],
    route: '/security-posture',
  },
  {
    num: '10',
    title: 'FinOps Showback',
    action: 'Log in as tech.provider / Provider@IPP2025. Show OpenCost per-namespace cost allocation, the FinOps Charge Visibility page, and the cost anomaly signal in the AIOps feed.',
    tags: ['tech.provider', 'OpenCost', 'FinOps'],
    route: '/finops-charge-visibility',
  },
];

// ─── Personas ────────────────────────────────────────────────────────────────

const PERSONAS = [
  {
    icon: '👩‍💻',
    name: 'Developer',
    user: 'dev.user',
    pass: 'Dev@IPP2025',
    route: '/developer',
    color: '#5b9bd5',
    access: 'Catalog · Create (IPP Claim) · Onboard App · My Resources · AIOps Chat',
  },
  {
    icon: '⚙️',
    name: 'Platform Engineer',
    user: 'platform.engineer',
    pass: 'Platform@IPP2025',
    route: '/platform',
    color: D.red,
    access: 'Crossplane XRDs · Compositions · GitOps · Day 2 Ops · Full cluster admin',
  },
  {
    icon: '🔧',
    name: 'Operations',
    user: 'ops.support',
    pass: 'Ops@IPP2025',
    route: '/operations',
    color: '#8b5cf6',
    access: 'Grafana · Prometheus · Argo CD · AIOps incident response · Autonomous Ops',
  },
  {
    icon: '🔒',
    name: 'Security Analyst',
    user: 'security.analyst',
    pass: 'Security@IPP2025',
    route: '/security-posture',
    color: '#1a7a2e',
    access: 'OPA / Kyverno policies · SPIRE identities · Cilium / Hubble · Vault secrets',
  },
  {
    icon: '☁️',
    name: 'Infrastructure Provider',
    user: 'tech.provider',
    pass: 'Provider@IPP2025',
    route: '/provider',
    color: '#e07c00',
    access: 'OpenCost · FinOps Charge Visibility · Private cloud composition management',
  },
];

// ─── Capability tiles ────────────────────────────────────────────────────────

const CAPABILITIES = [
  { icon: '🖥', name: 'Backstage IPP',        tag: 'Self-service Portal', desc: 'Service Catalog, Software Templates, Infra Onboarding, entity live status from K8s.', route: '/catalog' },
  { icon: '⚙️', name: 'IPP Service',           tag: 'Sole Git Writer',     desc: 'Validates Claims, writes Claim YAML to Gitea, enforces quota — the only process that touches Git.', route: '/gitops' },
  { icon: '♻️', name: 'Crossplane',            tag: 'Control Plane',       desc: 'XRD → Composition → Claim → XR → Managed Resources. One API for all infra types.', route: '/crossplane' },
  { icon: '🔄', name: 'Argo CD + Gitea',       tag: 'GitOps Engine',       desc: 'Gitea is the on-cluster Git server. Argo CD watches it, syncs Claims, and auto-heals drift.', route: '/gitops' },
  { icon: '🤖', name: 'AIOps LangGraph',       tag: 'Autonomous Ops',      desc: 'Multi-agent system (Manager + 5 Workers). Detects anomalies, root-causes incidents, proposes and executes remediations.', route: '/agent-command-center' },
  { icon: '📊', name: 'Grafana + Prometheus',  tag: 'Observability',       desc: 'IPP Full Telemetry dashboard, Crossplane reconcile latency, pod health, Hubble flow volume.', route: '/operations' },
  { icon: '🌐', name: 'Cilium + Hubble',       tag: 'Zero-Trust Network',  desc: 'eBPF pod microsegmentation, L3/L4/L7 policies, live flow topology. No sidecars.', route: '/security-posture' },
  { icon: '🛡️', name: 'OPA / Kyverno',         tag: 'Policy-as-Code',      desc: 'Admission webhooks enforce resource quotas, naming conventions, NIS2 compliance rules on every Claim.', route: '/security-posture' },
  { icon: '🔐', name: 'SPIRE / SPIFFE',        tag: 'Workload Identity',   desc: 'Short-lived X.509 SVIDs issued per workload. mTLS everywhere. No secrets in env vars.', route: '/security-posture' },
  { icon: '💰', name: 'OpenCost',              tag: 'FinOps',              desc: 'Per-namespace cost allocation, team showback, anomaly detection signals fed to AIOps.', route: '/finops-charge-visibility' },
  { icon: '💻', name: 'KubeVirt',             tag: 'VM Workloads',        desc: 'Virtual machines on Kubernetes. VMI objects as Crossplane Managed Resources via Composition.', route: '/crossplane' },
  { icon: '🔑', name: 'HashiCorp Vault',       tag: 'Secrets',             desc: 'Dev-mode Vault running in-cluster. ExternalSecrets syncs secrets into workload namespaces.', route: '/security-posture' },
];

// ─── Quick-fire stats ────────────────────────────────────────────────────────

const STATS = [
  { value: '19+',   label: 'Bootstrap Phases' },
  { value: '~10m',  label: 'Provision Time (AFTER)' },
  { value: '5',     label: 'Demo Personas' },
  { value: '12',    label: 'Platform Components' },
  { value: '1',     label: 'Control Plane (Crossplane)' },
  { value: '100%',  label: 'GitOps — every change in Git' },
];

// ─── Component ───────────────────────────────────────────────────────────────

export const GettingStartedPage = () => {
  const navigate = useNavigate();
  const [scriptOpen, setScriptOpen] = useState(true);

  return (
    <AppleShell title="Getting Started">
      <div>
        <style>{`
          .gs-page { width:100%; padding-bottom:56px; font-family:'Inter','Helvetica Neue',sans-serif; }

          /* hero */
          .gs-hero { background:${D.yellow}; border-bottom:4px solid ${D.red}; border-radius:12px; padding:48px 40px; margin-bottom:32px; }
          .gs-hero__eye   { color:${D.redDark}; font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; margin-bottom:12px; }
          .gs-hero__title { font-size:clamp(28px,4vw,48px); font-weight:700; color:${D.dark}; margin:0 0 14px; }
          .gs-hero__body  { font-size:16px; color:#444; max-width:660px; line-height:1.6; margin:0 0 28px; }
          .gs-hero__cta   { display:flex; gap:12px; flex-wrap:wrap; }

          /* buttons */
          .gs-btn-p { background:${D.red}; color:#fff; font-weight:700; border:none; border-radius:6px; padding:12px 24px; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; gap:8px; transition:background .2s; }
          .gs-btn-p:hover { background:${D.redDark}; }
          .gs-btn-s { background:transparent; color:${D.dark}; font-weight:700; border:1px solid ${D.dark}; border-radius:6px; padding:12px 24px; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; gap:8px; transition:background .2s; }
          .gs-btn-s:hover { background:rgba(26,26,26,.08); }

          /* section label */
          .gs-label { color:${D.red}; font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; margin-bottom:20px; display:flex; align-items:center; gap:8px; }
          .gs-label::after { content:''; flex:1; height:1px; background:rgba(212,5,17,.2); }

          /* stats row */
          .gs-stats { display:grid; grid-template-columns:repeat(6,1fr); gap:10px; margin-bottom:36px; }
          @media(max-width:900px){ .gs-stats { grid-template-columns:repeat(3,1fr); } }
          @media(max-width:540px){ .gs-stats { grid-template-columns:repeat(2,1fr); } }
          .gs-stat { background:${D.surface}; border:1px solid ${D.border}; border-radius:8px; padding:18px 14px; text-align:center; }
          .gs-stat__val { font-size:24px; font-weight:800; color:${D.red}; font-family:'JetBrains Mono',monospace; line-height:1; margin-bottom:6px; }
          .gs-stat__lbl { font-size:11px; color:${D.muted}; line-height:1.4; }

          /* story cards */
          .gs-story { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:36px; }
          @media(max-width:680px){ .gs-story { grid-template-columns:1fr; } }
          .gs-story-card { background:${D.surface}; border:1px solid ${D.border}; border-radius:10px; padding:24px; }
          .gs-story-card__badge { display:inline-block; font-size:10px; font-weight:700; padding:2px 10px; border-radius:3px; color:#fff; margin-bottom:14px; letter-spacing:.06em; }
          .gs-story-card__title { font-size:15px; font-weight:700; color:${D.text}; margin:0 0 10px; }
          .gs-story-card__body  { font-size:13px; color:${D.muted}; line-height:1.65; margin:0 0 14px; }
          .gs-tags { display:flex; flex-wrap:wrap; gap:5px; }
          .gs-tag  { font-size:11px; font-weight:600; padding:2px 10px; border-radius:999px; background:rgba(212,5,17,.1); color:${D.red}; border:1px solid rgba(212,5,17,.2); }

          /* demo script accordion */
          .gs-accord { background:${D.surface}; border:1px solid ${D.border}; border-radius:10px; margin-bottom:36px; overflow:hidden; }
          .gs-accord__hdr { display:flex; align-items:center; justify-content:space-between; padding:18px 24px; cursor:pointer; user-select:none; }
          .gs-accord__hdr:hover { background:rgba(255,204,0,.07); }
          .gs-accord__ttl { font-size:15px; font-weight:700; color:${D.text}; margin:0; }
          .gs-accord__chev { color:${D.muted}; transition:transform .2s; }
          .gs-accord__chev.open { transform:rotate(180deg); }
          .gs-accord__body { max-height:0; overflow:hidden; transition:max-height .35s ease; }
          .gs-accord__body.open { max-height:9999px; }
          .gs-accord__inner { border-top:1px solid ${D.border}; padding:24px; display:flex; flex-direction:column; gap:10px; }

          .gs-step { display:flex; gap:16px; align-items:flex-start; background:${D.surface2}; border:1px solid ${D.border}; border-radius:8px; padding:16px 18px; cursor:pointer; transition:border-color .15s; }
          .gs-step:hover { border-color:${D.red}; }
          .gs-step__num { font-size:22px; font-weight:900; color:${D.red}; opacity:.35; font-family:'JetBrains Mono',monospace; line-height:1; flex-shrink:0; width:36px; }
          .gs-step__main { flex:1; }
          .gs-step__title  { font-size:14px; font-weight:700; color:${D.text}; margin:0 0 5px; }
          .gs-step__action { font-size:12.5px; color:${D.muted}; line-height:1.6; margin:0 0 8px; }

          /* personas */
          .gs-personas { display:grid; grid-template-columns:repeat(5,1fr); gap:10px; margin-bottom:36px; }
          @media(max-width:900px){ .gs-personas { grid-template-columns:repeat(3,1fr); } }
          @media(max-width:560px){ .gs-personas { grid-template-columns:repeat(2,1fr); } }
          .gs-persona { background:${D.surface}; border:1px solid ${D.border}; border-radius:10px; padding:20px 14px; cursor:pointer; transition:border-color .15s; }
          .gs-persona:hover { border-color:${D.red}; }
          .gs-persona__icon { font-size:28px; margin-bottom:10px; }
          .gs-persona__name { font-size:13px; font-weight:700; color:${D.text}; margin-bottom:4px; }
          .gs-persona__cred { font-size:10px; font-family:'JetBrains Mono',monospace; margin-bottom:8px; }
          .gs-persona__access { font-size:11px; color:${D.muted}; line-height:1.55; }

          /* capabilities */
          .gs-caps { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:36px; }
          @media(max-width:900px){ .gs-caps { grid-template-columns:repeat(2,1fr); } }
          @media(max-width:500px){ .gs-caps { grid-template-columns:1fr; } }
          .gs-cap { background:${D.surface}; border:1px solid ${D.border}; border-radius:8px; padding:18px; cursor:pointer; transition:border-color .15s; display:flex; flex-direction:column; gap:8px; }
          .gs-cap:hover { border-color:${D.red}; }
          .gs-cap__head { display:flex; align-items:center; gap:8px; }
          .gs-cap__icon { font-size:20px; }
          .gs-cap__name { font-size:13px; font-weight:700; color:${D.text}; }
          .gs-cap__tag  { font-size:10px; font-weight:600; color:${D.red}; text-transform:uppercase; letter-spacing:.07em; }
          .gs-cap__desc { font-size:12px; color:${D.muted}; line-height:1.6; margin:0; }

          /* live urls */
          .gs-urls { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:8px; margin-bottom:36px; }
          .gs-url  { background:${D.surface}; border:1px solid ${D.border}; border-radius:8px; padding:11px 15px; display:flex; align-items:center; gap:10px; }
          .gs-url__dot  { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
          .gs-url__name { font-size:12px; font-weight:600; color:${D.text}; }
          .gs-url__addr { font-size:10.5px; color:${D.muted}; font-family:'JetBrains Mono',monospace; margin-top:2px; }

          /* cta */
          .gs-cta { display:flex; gap:12px; flex-wrap:wrap; }
        `}</style>

        <div className="gs-page">

          {/* ── Hero ── */}
          <div className="gs-hero">
            <div className="gs-hero__eye">DHL · Infrastructure Interface Platform — Demo Guide</div>
            <h1 className="gs-hero__title">Getting Started with IPP</h1>
            <p className="gs-hero__body">
              This demo runs entirely on a KIND cluster on macOS Apple Silicon. It shows the full GitOps-native private-cloud provisioning flow — from a developer filling a form in Backstage, through IPP writing a Crossplane Claim to Gitea, to Argo CD and Crossplane reconciling real Managed Resources in ~10 minutes.
            </p>
            <div className="gs-hero__cta">
              <button type="button" className="gs-btn-p" onClick={() => navigate('/try-out')}>
                Try the Lab <ArrowRight size={14} strokeWidth={2} />
              </button>
              <button type="button" className="gs-btn-s" onClick={() => navigate('/architecture')}>
                Architecture Diagrams <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* ── Stats ── */}
          <div className="gs-stats">
            {STATS.map(s => (
              <div key={s.label} className="gs-stat">
                <div className="gs-stat__val">{s.value}</div>
                <div className="gs-stat__lbl">{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Before / After ── */}
          <div className="gs-label">The Problem This Demo Solves</div>
          <div className="gs-story">
            {STORY.map(s => (
              <div key={s.badge} className="gs-story-card">
                <span className="gs-story-card__badge" style={{ background: s.badgeColor }}>{s.badge}</span>
                <h3 className="gs-story-card__title">{s.title}</h3>
                <p className="gs-story-card__body">{s.body}</p>
                <div className="gs-tags">
                  {s.tags.map(t => <span key={t} className="gs-tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>

          {/* ── Demo Script ── */}
          <div className="gs-accord">
            <div
              className="gs-accord__hdr"
              onClick={() => setScriptOpen(o => !o)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setScriptOpen(o => !o)}
              aria-expanded={scriptOpen}
            >
              <h3 className="gs-accord__ttl">10-Step Demo Script — Click Any Step to Navigate</h3>
              <ChevronDown size={18} strokeWidth={2} className={`gs-accord__chev${scriptOpen ? ' open' : ''}`} />
            </div>
            <div className={`gs-accord__body${scriptOpen ? ' open' : ''}`}>
              <div className="gs-accord__inner">
                {DEMO_SCRIPT.map(step => (
                  <div
                    key={step.num}
                    className="gs-step"
                    onClick={() => navigate(step.route)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && navigate(step.route)}
                  >
                    <div className="gs-step__num">{step.num}</div>
                    <div className="gs-step__main">
                      <div className="gs-step__title">{step.title}</div>
                      <p className="gs-step__action">{step.action}</p>
                      <div className="gs-tags">
                        {step.tags.map(t => <span key={t} className="gs-tag">{t}</span>)}
                      </div>
                    </div>
                    <ArrowRight size={16} strokeWidth={2} style={{ color: D.muted, flexShrink: 0, marginTop: 2 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Personas ── */}
          <div className="gs-label">5 Demo Personas — Click to Switch</div>
          <div className="gs-personas">
            {PERSONAS.map(p => (
              <div
                key={p.name}
                className="gs-persona"
                style={{ borderTop: `3px solid ${p.color}` }}
                onClick={() => navigate(p.route)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(p.route)}
              >
                <div className="gs-persona__icon">{p.icon}</div>
                <div className="gs-persona__name">{p.name}</div>
                <div className="gs-persona__cred" style={{ color: p.color }}>{p.user} · {p.pass}</div>
                <div className="gs-persona__access">{p.access}</div>
              </div>
            ))}
          </div>

          {/* ── Capabilities ── */}
          <div className="gs-label">Platform Capabilities — What You Can Show</div>
          <div className="gs-caps">
            {CAPABILITIES.map(c => (
              <div
                key={c.name}
                className="gs-cap"
                onClick={() => navigate(c.route)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && navigate(c.route)}
              >
                <div className="gs-cap__head">
                  <span className="gs-cap__icon">{c.icon}</span>
                  <span className="gs-cap__name">{c.name}</span>
                </div>
                <div className="gs-cap__tag">{c.tag}</div>
                <p className="gs-cap__desc">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* ── Live URLs ── */}
          <div className="gs-label">Live Platform URLs</div>
          <div className="gs-urls">
            {[
              { color: '#10b981', name: 'Backstage IPP',   addr: 'http://backstage.ipp.local' },
              { color: '#8b5cf6', name: 'Argo CD',         addr: 'http://argocd.ipp.local' },
              { color: '#06b6d4', name: 'Grafana',         addr: 'http://grafana.ipp.local' },
              { color: '#06b6d4', name: 'Prometheus',      addr: 'http://prometheus.ipp.local' },
              { color: '#06b6d4', name: 'OpenCost',        addr: 'http://opencost.ipp.local' },
              { color: '#3b82f6', name: 'Hubble UI',       addr: 'http://hubble.ipp.local' },
              { color: '#f97316', name: 'AIOps Engine',    addr: 'http://aiops.ipp.local' },
              { color: '#f97316', name: 'Employee Portal', addr: 'http://employee.ipp.local' },
              { color: '#a855f7', name: 'Vault',           addr: 'http://vault.ipp.local' },
              { color: '#10b981', name: 'Gitea',           addr: 'http://gitea.ipp.local' },
            ].map(u => (
              <div key={u.addr} className="gs-url">
                <div className="gs-url__dot" style={{ background: u.color }} />
                <div>
                  <div className="gs-url__name">{u.name}</div>
                  <div className="gs-url__addr">{u.addr}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ── CTA ── */}
          <div className="gs-cta">
            <button type="button" className="gs-btn-p" onClick={() => navigate('/try-out')}>
              Open Try-Out Lab <ArrowRight size={14} strokeWidth={2} />
            </button>
            <button type="button" className="gs-btn-s" onClick={() => navigate('/architecture')}>
              View Architecture <ArrowRight size={14} strokeWidth={2} />
            </button>
            <button type="button" className="gs-btn-s" onClick={() => navigate('/agent-command-center')}>
              AIOps Agent <ArrowRight size={14} strokeWidth={2} />
            </button>
          </div>

        </div>
      </div>
    </AppleShell>
  );
};
