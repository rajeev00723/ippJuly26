import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppleShell } from '../../design-system/primitives/AppleShell';

const D = {
  red:     '#D40511',
  yellow:  '#FFCC00',
  dark:    '#1A1A1A',
  surface: '#FFFFFF',
  surface2:'#F7F5EF',
  border:  '#E5E7EB',
  text:    '#1A1A1A',
  muted:   '#6B6B6B',
};

const C = {
  infra:    '#22c55e', infraBg: 'rgba(34,197,94,.09)',    infraTx: '#15803D',
  network:  '#3b82f6', networkBg:'rgba(59,130,246,.09)',  networkTx:'#1D4ED8',
  security: '#a855f7', securityBg:'rgba(168,85,247,.09)', securityTx:'#7E22CE',
  platform: '#eab308', platformBg:'rgba(234,179,8,.10)',  platformTx:'#92400E',
  observe:  '#06b6d4', observeBg: 'rgba(6,182,212,.09)',  observeTx:'#0E7490',
  app:      '#f97316', appBg:    'rgba(249,115,22,.09)',  appTx:   '#C2410C',
  portal:   '#10b981', portalBg: 'rgba(16,185,129,.09)', portalTx:'#065F46',
  gitops:   '#8b5cf6', gitopsBg: 'rgba(139,92,246,.09)', gitopsTx:'#5B21B6',
};

const TABS = ['Bootstrap Flow', 'Architecture Stack', 'Demo Script', 'Personas & Creds'];

const PHASES = [
  { num:'1',    color:C.infra,    label:'Pre-flight',        items:['macOS + arm64 verified','Docker Desktop ≥ 32 GB','kubectl / kind / helm','jq / node / yarn'] },
  { num:'2',    color:C.infra,    label:'KIND Cluster',      items:['Create cluster: ipp-local','kindest/node:v1.32','etcd quota 8 GiB','Auto-compaction 1h'] },
  { num:'3',    color:C.infra,    label:'/etc/hosts',        items:['backstage.ipp.local','argocd / grafana','prometheus / opencost','hubble / aiops / vault','gitea.ipp.local'] },
  { num:'4',    color:C.network,  label:'Cilium + Hubble',   items:['Cilium (vxlan)','Hubble relay + UI','DNS / drop / flow visibility','MTU 1500 (KubeVirt compat)'] },
  { num:'5',    color:C.network,  label:'Ingress + RBAC',    items:['ingress-nginx','externalIPs patch','Platform namespaces','Platform RBAC'] },
  { num:'6',    color:C.security, label:'SPIRE / SPIFFE',    items:['SPIRE server + agent','Trust: ipp-demo.local','SPIFFE CSI driver','Workload registrations'] },
  { num:'7',    color:C.platform, label:'Argo CD',           items:['Argo CD v2.10+','argocd.ipp.local','Admin pw: argocd-demo-local-2024','API token → Backstage'] },
  { num:'8',    color:C.platform, label:'Upbound Crossplane',items:['UXP / Crossplane','provider-kubernetes','provider-helm','XRDs + Compositions'] },
  { num:'9',    color:C.security, label:'Policy Engines',    items:['OPA Gatekeeper','Kyverno','Constraint templates','Kyverno policies'] },
  { num:'10',   color:C.observe,  label:'Prometheus + Grafana',items:['kube-prometheus-stack','grafana.ipp.local','prometheus.ipp.local','IPP Full Telemetry dashboard'] },
  { num:'11',   color:C.observe,  label:'OpenCost',          items:['OpenCost','opencost.ipp.local','Per-namespace cost allocation'] },
  { num:'11b',  color:C.security, label:'Vault Secrets',     items:['HashiCorp Vault dev mode','vault.ipp.local','Root token: root','ExternalSecrets sync'] },
  { num:'11c',  color:C.app,      label:'KubeVirt',          items:['KubeVirt software emulation','VMI = Managed Resource','VMApp XRD + Composition','ARM64 mpx-strip fix'] },
  { num:'12',   color:C.app,      label:'App Images',        items:['employee-frontend arm64','employee-backend arm64','kind load → ipp-local'] },
  { num:'13',   color:C.app,      label:'Employee Portal',   items:['Frontend + Backend','PostgreSQL','employee.ipp.local','Cilium network policy'] },
  { num:'14',   color:C.app,      label:'AIOps Engine',      items:['LangGraph multi-agent','Manager + 5 Workers','aiops.ipp.local','Ollama / LangSmith backend'] },
  { num:'15',   color:C.platform, label:'Crossplane Claims', items:['ThreeTierAppClaim applied','employee-portal claim','Provider health checks'] },
  { num:'16',   color:C.portal,   label:'Backstage IPP',     items:['TypeScript build + bundle','backstage:latest image','backstage.ipp.local','Catalog + all plugins'] },
  { num:'17',   color:C.platform, label:'Argo CD Apps',      items:['Argo CD projects created','App manifests applied','Gitea repo wired','ApplicationSet configured'] },
  { num:'18–19',color:C.infra,    label:'Git + Validation',  items:['Gitea push: claims repo','validate-demo.sh smoke tests','All components green'] },
  { num:'19.5', color:C.gitops,   label:'GitOps Stack ✦',    items:['Gitea server deployed','Bot user + token created','IPP Service image built','Claims ApplicationSet live','conftest OPA policy wired'] },
];

const ARCH_LAYERS = [
  {
    label: 'Portal', color: C.portal,
    components: [
      { icon:'🧩', name:'Backstage IPP', sub:'backstage.ipp.local · 5 Personas · Catalog · Templates · Onboarding', color: C.portalBg, border: C.portal, tx: C.portalTx },
      { icon:'🔌', name:'Plugins', sub:'Kubernetes · Argo CD · Crossplane · OpenCost · AIOps · Security · Infra Onboarding', color: C.portalBg, border: C.portal, tx: C.portalTx },
    ],
  },
  {
    label: 'GitOps', color: C.gitops,
    components: [
      { icon:'🐱', name:'Gitea (on-cluster Git)', sub:'gitea.ipp.local · ipp-automation-bot · claims repo = GitOps source', color: C.gitopsBg, border: C.gitops, tx: C.gitopsTx },
      { icon:'⚙️', name:'IPP Service (Sole Git Writer)', sub:'Validates Claim · writes YAML to Gitea · conftest OPA policy', color: C.gitopsBg, border: C.gitops, tx: C.gitopsTx },
      { icon:'🔄', name:'Argo CD', sub:'argocd.ipp.local · ApplicationSet · watches Gitea · syncs Claims', color: C.gitopsBg, border: C.gitops, tx: C.gitopsTx },
    ],
  },
  {
    label: 'Platform', color: C.platform,
    components: [
      { icon:'♻️', name:'Upbound Crossplane', sub:'XRDs · Compositions · Claims → XR → MRs (ComputeInstance + StorageVolume + VolumeAttachment)', color: C.platformBg, border: C.platform, tx: C.platformTx },
      { icon:'🧪', name:'KubeVirt', sub:'VMI = Managed Resource · Crossplane Composition · software emulation arm64', color: C.platformBg, border: C.platform, tx: C.platformTx },
    ],
  },
  {
    label: 'Apps', color: C.app,
    components: [
      { icon:'👤', name:'Employee Portal', sub:'Frontend + Backend + PostgreSQL · employee.ipp.local', color: C.appBg, border: C.app, tx: C.appTx },
      { icon:'🤖', name:'AIOps Engine', sub:'LangGraph · Manager + 5 Workers · aiops.ipp.local · Ollama backend', color: C.appBg, border: C.app, tx: C.appTx },
    ],
  },
  {
    label: 'Observe', color: C.observe,
    components: [
      { icon:'📊', name:'Prometheus', sub:'kube-prometheus-stack · prometheus.ipp.local', color: C.observeBg, border: C.observe, tx: C.observeTx },
      { icon:'📈', name:'Grafana', sub:'IPP Full Telemetry dashboard · grafana.ipp.local', color: C.observeBg, border: C.observe, tx: C.observeTx },
      { icon:'💰', name:'OpenCost', sub:'Cost allocation per namespace · opencost.ipp.local', color: C.observeBg, border: C.observe, tx: C.observeTx },
    ],
  },
  {
    label: 'Security', color: C.security,
    components: [
      { icon:'🔐', name:'SPIRE / SPIFFE', sub:'Workload X.509 SVIDs · trust: ipp-demo.local · CSI driver', color: C.securityBg, border: C.security, tx: C.securityTx },
      { icon:'⚖️', name:'OPA Gatekeeper', sub:'Admission constraints · conftest in IPP Service', color: C.securityBg, border: C.security, tx: C.securityTx },
      { icon:'🛡️', name:'Kyverno', sub:'Policy engine · NIS2 compliance rules', color: C.securityBg, border: C.security, tx: C.securityTx },
      { icon:'🔑', name:'HashiCorp Vault', sub:'Dev mode · vault.ipp.local · root token: root', color: C.securityBg, border: C.security, tx: C.securityTx },
    ],
  },
  {
    label: 'Network', color: C.network,
    components: [
      { icon:'🌐', name:'Cilium CNI', sub:'vxlan · MTU 1500 · eBPF L3/L4/L7 policies · zero-trust', color: C.networkBg, border: C.network, tx: C.networkTx },
      { icon:'🔭', name:'Hubble', sub:'Flow observability · service map · hubble.ipp.local', color: C.networkBg, border: C.network, tx: C.networkTx },
      { icon:'🚦', name:'Ingress-NGINX', sub:'externalIPs patch · *.ipp.local routing', color: C.networkBg, border: C.network, tx: C.networkTx },
    ],
  },
  {
    label: 'Infra', color: C.infra,
    components: [
      { icon:'☸️', name:'KIND Nodes (k8s v1.32)', sub:'1 control-plane + 2 workers · cluster: ipp-local', color: C.infraBg, border: C.infra, tx: C.infraTx },
      { icon:'🗄️', name:'etcd', sub:'8 GiB quota · 1h auto-compaction', color: C.infraBg, border: C.infra, tx: C.infraTx },
      { icon:'📦', name:'Namespaces + RBAC', sub:'backstage · argocd · monitoring · spire · crossplane-system · gitea · ipp-system', color: C.infraBg, border: C.infra, tx: C.infraTx },
    ],
  },
];

const DEMO_STEPS = [
  { num:'01', title:'Land on the Portal',              tags:['backstage.ipp.local'],        route:'/',           action:'Open backstage.ipp.local — show the landing page: platform health stats, 5 persona tiles, Before/After narrative.' },
  { num:'02', title:'Log in as Developer',             tags:['dev.user','Dev@IPP2025'],      route:'/developer',  action:'Click Developer → login as dev.user / Dev@IPP2025. Portal re-themes: Catalog, Create, Onboard App, My Resources.' },
  { num:'03', title:'Browse the Service Catalog',      tags:['Catalog','K8s Plugin'],        route:'/catalog',    action:'Open Catalog → ThreeTierApp entity → Kubernetes tab. Show live pod status pulled from the cluster via the K8s Backstage plugin.' },
  { num:'04', title:'Onboard an App via the Infra Wizard', tags:['IPP Service','Claim YAML'], route:'/infra-onboarding', action:'Onboard an Application → pick a target (KubeVirt VM / Local Cluster / AKS) → size (S/M/L) → confirm. IIP validates the Claim, runs conftest OPA policy, then pushes the Claim YAML to Gitea as ipp-automation-bot. (The scaffolder template at Create → "ThreeTierApp" is the alternate path for full-stack app requests.)' },
  { num:'05', title:'Watch Argo CD Sync the Claim',    tags:['argocd.ipp.local','Gitea'],    route:'/gitops',     action:'Open argocd.ipp.local (admin / argocd-demo-local-2024). Watch the ApplicationSet-generated App go OutOfSync → Synced → Healthy as Crossplane picks up the Claim.' },
  { num:'06', title:'Platform Engineer: Crossplane',   tags:['XRD','Compositions','MRs'],   route:'/crossplane', action:'Switch to platform.engineer / Platform@IPP2025. Open Crossplane → show XRDs, Compositions, live Claim status, Managed Resource health: ComputeInstance, StorageVolume, VolumeAttachment — all READY.' },
  { num:'07', title:'Observability: Grafana + Hubble (KIND + AKS)', tags:['grafana.ipp.local','hubble.ipp.local','AKS Hubble UI'],  route:'/operations', action:'Operations persona → open grafana.ipp.local (admin / grafana-demo-local-2024). Show IPP Full Telemetry dashboard. Open hubble.ipp.local for live eBPF flows on KIND. For AKS: get the Hubble UI public IP — kubectl get svc hubble-ui -n kube-system --kubeconfig ~/.kube/<cluster>.yaml -o jsonpath=\'{.status.loadBalancer.ingress[0].ip}\' — then open http://<IP> for the AKS service map.' },
  { num:'08', title:'AIOps — Auto-Remediate Incident', tags:['AIOps','LangGraph'],           route:'/aiops',      action:'Run simulate-crashloop.sh. Watch the LangGraph multi-agent system (Manager + 5 Workers) detect the CrashLoopBackOff, root-cause it, and apply remediation on approval.' },
  { num:'09', title:'Security: Policy + Identity',     tags:['OPA','SPIRE','Cilium'],        route:'/security',   action:'Log in as security.analyst / Security@IPP2025. Security dashboard → OPA/Kyverno policy reports, SPIRE workload SVIDs, Cilium network policy verdicts.' },
  { num:'10', title:'FinOps Showback',                 tags:['OpenCost','FinOps'],           route:'/finops',     action:'Log in as tech.provider / Provider@IPP2025. Show FinOps Charge Visibility → per-team cost allocation from OpenCost, spend forecast, cost anomaly signal.' },
];

const PERSONAS = [
  { icon:'👩‍💻', name:'Developer',                user:'dev.user',           pass:'Dev@IPP2025',       route:'/developer',  color: C.network,   access:'Catalog · Create (IPP Claim) · Onboard App · My Resources · AIOps Chat' },
  { icon:'⚙️',  name:'Platform Engineer',         user:'platform.engineer',  pass:'Platform@IPP2025',  route:'/platform',   color: D.red,       access:'Crossplane XRDs · Compositions · GitOps · Day 2 Ops · Full cluster admin' },
  { icon:'🔧',  name:'Operations',                user:'ops.support',        pass:'Ops@IPP2025',       route:'/operations', color: C.gitops,    access:'Grafana · Prometheus · Argo CD · AIOps incident response · Autonomous Ops' },
  { icon:'🔒',  name:'Security Analyst',          user:'security.analyst',   pass:'Security@IPP2025',  route:'/security',   color: '#1a7a2e',   access:'OPA / Kyverno · SPIRE identities · Cilium / Hubble flows · Vault secrets' },
  { icon:'☁️',  name:'Infrastructure Provider',   user:'tech.provider',      pass:'Provider@IPP2025',  route:'/provider',   color: '#e07c00',   access:'OpenCost · FinOps Charge Visibility · Private cloud Composition management' },
];

const CREDS = [
  { system:'Argo CD',           user:'admin',         pass:'argocd-demo-local-2024',   note:'argocd.ipp.local' },
  { system:'Grafana',           user:'admin',         pass:'grafana-demo-local-2024',  note:'grafana.ipp.local' },
  { system:'Gitea',             user:'gitea-admin',   pass:'admin-demo-2024',          note:'gitea.ipp.local · ipp-automation-bot writes Claims' },
  { system:'HashiCorp Vault',   user:'—',             pass:'root',                     note:'vault.ipp.local · dev mode' },
];

const URLS = [
  { name:'Backstage IPP',    url:'http://backstage.ipp.local',  color: C.portal  },
  { name:'Argo CD',          url:'http://argocd.ipp.local',     color: C.gitops  },
  { name:'Gitea',            url:'http://gitea.ipp.local',      color: C.gitops  },
  { name:'Grafana',          url:'http://grafana.ipp.local',    color: C.observe },
  { name:'Prometheus',       url:'http://prometheus.ipp.local', color: C.observe },
  { name:'OpenCost',         url:'http://opencost.ipp.local',   color: C.observe },
  { name:'Hubble UI',        url:'http://hubble.ipp.local',     color: C.network },
  { name:'AIOps Engine',     url:'http://aiops.ipp.local',      color: C.app     },
  { name:'Employee Portal',  url:'http://employee.ipp.local',   color: C.app     },
  { name:'Vault',            url:'http://vault.ipp.local',      color: C.security },
];

const LEGEND_ITEMS = [
  { color: C.infra,    label: 'Infrastructure' },
  { color: C.network,  label: 'Networking' },
  { color: C.security, label: 'Security' },
  { color: C.platform, label: 'Platform' },
  { color: C.observe,  label: 'Observability' },
  { color: C.app,      label: 'Applications' },
  { color: C.portal,   label: 'IPP Portal' },
  { color: C.gitops,   label: 'GitOps / IPP Service' },
];

const s: Record<string, React.CSSProperties> = {
  page:      { padding: '32px 40px 64px' },
  hero:      { background: D.yellow, borderRadius: 12, padding: '28px 36px 24px', marginBottom: 32, position: 'relative', overflow: 'hidden' },
  heroEye:   { fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: D.red, marginBottom: 6 },
  heroH1:    { fontSize: 26, fontWeight: 800, color: D.dark, marginBottom: 6 },
  heroSub:   { fontSize: 13, color: '#444', lineHeight: 1.6 },
  badges:    { display:'flex', flexWrap:'wrap', gap: 6, marginTop: 14 },
  badge:     { display:'inline-flex', alignItems:'center', gap: 5, background:'rgba(212,5,17,.1)', border:'1px solid rgba(212,5,17,.25)', color: D.red, padding:'3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 },
  tabBar:    { display:'flex', gap: 4, marginBottom: 28, borderBottom:`1px solid ${D.border}` },
  tab:       { padding:'9px 18px', fontSize: 13, fontWeight: 600, border:'none', background:'none', cursor:'pointer', borderBottom:'2px solid transparent', color: D.muted, transition:'all .15s' },
  tabActive: { color: D.red, borderBottomColor: D.red },
  secTitle:  { fontSize: 11, fontWeight: 700, textTransform:'uppercase', letterSpacing:'1.8px', color: D.red, marginBottom: 16, display:'flex', alignItems:'center', gap: 10 },
  card:      { background: D.surface, border:`1px solid ${D.border}`, borderRadius: 10, padding: '14px 16px' },
  grid4:     { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(170px, 1fr))', gap: 10 },
  chip:      { fontSize: 10, fontWeight: 600, padding:'2px 8px', borderRadius:999, background:'rgba(212,5,17,.1)', color: D.red, border:'1px solid rgba(212,5,17,.2)' },
  mono:      { fontFamily:"'SF Mono','Fira Code',monospace", fontSize: 11 },
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ ...s.secTitle, marginTop: 36 }}>
      {children}
      <div style={{ flex:1, height:1, background:'rgba(212,5,17,.18)' }} />
    </div>
  );
}

function PhaseCard({ phase }: { phase: typeof PHASES[0] }) {
  return (
    <div style={{ ...s.card, borderTop:`2px solid ${phase.color}`, display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color: D.muted }}>Phase {phase.num}</div>
      <div style={{ fontSize:12, fontWeight:700, color: D.dark, lineHeight:1.3 }}>{phase.label}</div>
      <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:3 }}>
        {phase.items.map((it, i) => (
          <li key={i} style={{ fontSize:10.5, color: D.muted, display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:phase.color, flexShrink:0, display:'inline-block' }} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ArchLayer({ layer }: { layer: typeof ARCH_LAYERS[0] }) {
  return (
    <div style={{ display:'flex', alignItems:'stretch', gap:8, marginBottom:8 }}>
      <div style={{ writingMode:'vertical-rl', textOrientation:'mixed', transform:'rotate(180deg)', fontSize:9, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color: D.muted, minWidth:26, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {layer.label}
      </div>
      <div style={{ flex:1, display:'flex', gap:8, flexWrap:'wrap' }}>
        {layer.components.map((c, i) => (
          <div key={i} style={{ flex:1, minWidth:140, background:c.color, border:`1px solid ${c.border}`, borderRadius:8, padding:'10px 12px', display:'flex', gap:8 }}>
            <span style={{ fontSize:18, lineHeight:1, flexShrink:0, marginTop:1 }}>{c.icon}</span>
            <div>
              <div style={{ fontSize:11.5, fontWeight:700, color:c.tx, lineHeight:1.3 }}>{c.name}</div>
              <div style={{ fontSize:10, color:c.tx, opacity:.65, marginTop:2, lineHeight:1.4 }}>{c.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DemoFlowPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(0);

  return (
    <AppleShell>
      <div style={s.page}>

        {/* ── Hero ── */}
        <div style={s.hero}>
          <div style={s.heroEye}>DHL · Infrastructure Interface Platform</div>
          <h1 style={s.heroH1}>Demo Flow &amp; Architecture</h1>
          <p style={s.heroSub}>KIND Cluster <strong>ipp-local</strong> · Kubernetes v1.32 · macOS Apple Silicon · All services at *.ipp.local</p>
          <div style={s.badges}>
            {['19.5 Phases','Backstage IPP','IPP Service (Sole Git Writer)','Upbound Crossplane','Argo CD','Gitea','Cilium + Hubble','SPIRE / SPIFFE','OPA / Kyverno','Prometheus + Grafana','OpenCost','AIOps LangGraph','KubeVirt','HashiCorp Vault'].map(b => (
              <span key={b} style={s.badge}>{b}</span>
            ))}
          </div>
        </div>

        {/* ── Before / After ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:8 }}>
          {[
            { badge:'BEFORE', bc:'#D40511', title:'Days-to-weeks provisioning via three tools', body:'IPP writes tool-specific configs to Git. GitHub Actions fans out to VRA (OpenShift), Terraform (AKS), and Cloudify (Azure VMs) independently. No unified control plane. IPP must aggregate status callbacks from each tool.', tags:['VRA','Terraform','Cloudify','GitHub Actions','IPP callbacks'] },
            { badge:'AFTER · Crossplane', bc:'#1a7a2e', title:'~10-minute provisioning via one control plane', body:'IPP still writes to Git — but now a Crossplane Claim YAML to Gitea. Argo CD watches Gitea and syncs the Claim to Crossplane. Crossplane reconciles ComputeInstance + StorageVolume + VolumeAttachment. Status flows directly back via the Kubernetes API.', tags:['Crossplane XRD','Claim YAML','Argo CD','Gitea','IPP Service','Direct status'] },
          ].map(c => (
            <div key={c.badge} style={{ ...s.card }}>
              <span style={{ display:'inline-block', fontSize:10, fontWeight:700, padding:'2px 10px', borderRadius:3, color:'#fff', background:c.bc, marginBottom:10, letterSpacing:'.06em' }}>{c.badge}</span>
              <div style={{ fontSize:14, fontWeight:700, color: D.dark, marginBottom:8 }}>{c.title}</div>
              <p style={{ fontSize:12, color: D.muted, lineHeight:1.65, marginBottom:10 }}>{c.body}</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {c.tags.map(t => <span key={t} style={s.chip}>{t}</span>)}
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={s.tabBar}>
          {TABS.map((t, i) => (
            <button key={t} style={{ ...s.tab, ...(activeTab===i ? s.tabActive : {}) }} onClick={() => setActiveTab(i)}>{t}</button>
          ))}
        </div>

        {/* ── Tab 0: Bootstrap Flow ── */}
        {activeTab === 0 && (
          <div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:14, marginBottom:16 }}>
              {LEGEND_ITEMS.map(l => (
                <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color: D.muted }}>
                  <span style={{ width:10, height:10, borderRadius:2, background:l.color, flexShrink:0, display:'inline-block' }} />
                  {l.label}
                </div>
              ))}
            </div>
            <div style={s.grid4}>
              {PHASES.map(p => <PhaseCard key={p.num} phase={p} />)}
            </div>

            <SectionTitle>Platform Access URLs</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:8 }}>
              {URLS.map(u => (
                <div key={u.name} style={{ ...s.card, display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:u.color, flexShrink:0, display:'inline-block' }} />
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color: D.dark }}>{u.name}</div>
                    <div style={{ ...s.mono, color: D.muted, marginTop:2 }}>{u.url}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Tab 1: Architecture Stack ── */}
        {activeTab === 1 && (
          <div>
            <div style={{ background: D.surface, border:`1px solid ${D.border}`, borderRadius:14, padding:28 }}>
              <div style={{ border:`1.5px dashed ${D.border}`, borderRadius:12, padding:18 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color: D.muted, marginBottom:14 }}>
                  macOS Apple Silicon (M5 Pro/Max · 48 GB RAM) · Docker Desktop
                </div>
                <div style={{ border:`1.5px dashed ${D.border}`, borderRadius:10, padding:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1, color: D.red, marginBottom:14 }}>
                    KIND Cluster: ipp-local · Kubernetes v1.32 · etcd 8 GiB · 1 control-plane + 2 workers
                  </div>
                  {ARCH_LAYERS.map((layer, i) => (
                    <React.Fragment key={layer.label}>
                      <ArchLayer layer={layer} />
                      {i < ARCH_LAYERS.length - 1 && (
                        <div style={{ borderLeft:`1.5px solid ${D.border}`, marginLeft:38, height:10, marginBottom:8 }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab 2: Demo Script ── */}
        {activeTab === 2 && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {DEMO_STEPS.map(step => (
              <div
                key={step.num}
                onClick={() => navigate(step.route)}
                style={{ ...s.card, display:'flex', alignItems:'flex-start', gap:14, cursor:'pointer', transition:'box-shadow .15s' }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow='0 0 0 2px rgba(212,5,17,.25)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow='')}
              >
                <div style={{ fontSize:22, fontWeight:900, color: D.red, opacity:.35, fontFamily:"'SF Mono',monospace", lineHeight:1, flexShrink:0, width:36 }}>{step.num}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color: D.dark, marginBottom:4 }}>{step.title}</div>
                  <div style={{ fontSize:12, color: D.muted, lineHeight:1.65, marginBottom:8 }}>{step.action}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                    {step.tags.map(t => <span key={t} style={s.chip}>{t}</span>)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Tab 3: Personas & Creds ── */}
        {activeTab === 3 && (
          <div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10, marginBottom:28 }}>
              {PERSONAS.map(p => (
                <div
                  key={p.name}
                  onClick={() => navigate(p.route)}
                  style={{ ...s.card, borderTop:`3px solid ${p.color}`, textAlign:'center', cursor:'pointer', transition:'box-shadow .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow=`0 0 0 2px ${p.color}55`)}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow='')}
                >
                  <div style={{ fontSize:28, marginBottom:8 }}>{p.icon}</div>
                  <div style={{ fontSize:12, fontWeight:700, color: D.dark }}>{p.name}</div>
                  <div style={{ ...s.mono, color: D.muted, marginTop:4 }}>{p.user}</div>
                  <div style={{ ...s.mono, color: D.muted }}>{p.pass}</div>
                  <div style={{ fontSize:10.5, color: D.muted, marginTop:10, lineHeight:1.6 }}>{p.access}</div>
                </div>
              ))}
            </div>

            <SectionTitle>System Credentials</SectionTitle>
            <table style={{ width:'100%', borderCollapse:'collapse', background: D.surface, border:`1px solid ${D.border}`, borderRadius:8, overflow:'hidden' }}>
              <thead>
                <tr>
                  {['System','Username','Password / Token','Notes'].map(h => (
                    <th key={h} style={{ background: D.surface2, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color: D.muted, padding:'10px 14px', textAlign:'left', borderBottom:`1px solid ${D.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CREDS.map((c, i) => (
                  <tr key={c.system} style={{ borderBottom: i < CREDS.length-1 ? `1px solid ${D.border}` : 'none' }}>
                    <td style={{ padding:'10px 14px', fontSize:12, color: D.dark }}>{c.system}</td>
                    <td style={{ padding:'10px 14px' }}><code style={{ ...s.mono, color: D.red, background:'rgba(212,5,17,.07)', padding:'1px 6px', borderRadius:3 }}>{c.user}</code></td>
                    <td style={{ padding:'10px 14px' }}><code style={{ ...s.mono, color: D.red, background:'rgba(212,5,17,.07)', padding:'1px 6px', borderRadius:3 }}>{c.pass}</code></td>
                    <td style={{ padding:'10px 14px', fontSize:11, color: D.muted }}>{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <SectionTitle>Day-2 Operations Scripts</SectionTitle>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:8 }}>
              {[
                { icon:'📋', name:'validate-demo.sh',      desc:'Smoke-test all platform components' },
                { icon:'🔁', name:'reset-demo.sh',         desc:'Reset demo state to clean baseline' },
                { icon:'💣', name:'destroy.sh',            desc:'Delete KIND cluster (make stop)' },
                { icon:'📊', name:'make validate',         desc:'Platform health check (kubectl + argocd)' },
                { icon:'📈', name:'make scale-up',         desc:'Scale employee portal frontend to 3 replicas' },
                { icon:'🚀', name:'make update-backstage', desc:'Rebuild + redeploy Backstage (idempotent)' },
                { icon:'💥', name:'simulate-crashloop.sh', desc:'Trigger CrashLoopBackOff for AIOps detection demo' },
                { icon:'🚫', name:'simulate-network-deny.sh', desc:'Trigger Cilium policy deny for Hubble flow demo' },
                { icon:'🗄️', name:'make gitops-setup',    desc:'Deploy / re-deploy Gitea + IPP Service + ApplicationSet' },
                { icon:'📡', name:'make gitops-status',   desc:'Show Gitea + IPP Service + Argo CD claims status' },
              ].map(sc => (
                <div key={sc.name} style={{ ...s.card, display:'flex', alignItems:'flex-start', gap:10 }}>
                  <span style={{ fontSize:16, flexShrink:0, marginTop:1 }}>{sc.icon}</span>
                  <div>
                    <div style={{ ...s.mono, fontSize:11, fontWeight:600, color: D.dark }}>{sc.name}</div>
                    <div style={{ fontSize:10.5, color: D.muted, marginTop:2 }}>{sc.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppleShell>
  );
}
