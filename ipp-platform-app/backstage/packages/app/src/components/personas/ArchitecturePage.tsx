import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { AppleShell } from '../../design-system/primitives/AppleShell';

const D = {
  red:        '#D40511',
  redDark:    '#AA0408',
  yellow:     '#FFCC00',
  dark:       '#1A1A1A',
  surface:    '#FFFFFF',
  surface2:   '#F7F5EF',
  border:     '#E5E7EB',
  text:       '#1A1A1A',
  muted:      '#6B6B6B',
  dim:        'rgba(26,26,26,0.12)',
  yellowDark: '#E6B800',
};

// ─── SVG diagram strings (marker IDs prefixed per diagram to avoid DOM conflicts) ────

const CURRENT_FLOW_SVG = `
<svg viewBox="0 0 520 960" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:520px;display:block;margin:0 auto">
  <rect x="0" y="0" width="520" height="960" fill="#fafafa" rx="6"/>
  <rect x="10" y="10" width="500" height="100" rx="6" fill="#fff7e0" stroke="#FFCC00" stroke-width="2"/>
  <text x="260" y="29" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">DEVELOPER</text>
  <rect x="160" y="36" width="200" height="62" rx="8" fill="#FFCC00" stroke="#e6b800" stroke-width="1.5"/>
  <text x="260" y="58" text-anchor="middle" font-size="13" font-weight="700" fill="#323232">👤 Developer</text>
  <text x="260" y="76" text-anchor="middle" font-size="10" fill="#555">Submits infrastructure request</text>
  <text x="260" y="91" text-anchor="middle" font-size="9" fill="#888">via IPP self-service UI</text>
  <line x1="260" y1="110" x2="260" y2="148" stroke="#323232" stroke-width="2" marker-end="url(#cur-ad)"/>
  <text x="275" y="133" font-size="10" fill="#888">UI request</text>
  <rect x="10" y="150" width="500" height="88" rx="6" fill="#e8f4fd" stroke="#5b9bd5" stroke-width="1.5"/>
  <text x="260" y="169" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">PORTAL LAYER</text>
  <rect x="130" y="175" width="260" height="52" rx="8" fill="#5b9bd5" stroke="#4a87c0" stroke-width="1.5"/>
  <text x="260" y="195" text-anchor="middle" font-size="13" font-weight="700" fill="white">🖥 IPP — Infrastructure Platform Portal</text>
  <text x="260" y="212" text-anchor="middle" font-size="10" fill="#d6eaf8">(Backstage) Self-service UI · Software Catalog</text>
  <line x1="260" y1="238" x2="260" y2="276" stroke="#323232" stroke-width="2" marker-end="url(#cur-ad)"/>
  <text x="275" y="261" font-size="10" fill="#888">trigger</text>
  <rect x="10" y="278" width="500" height="92" rx="6" fill="#fff0e0" stroke="#D40511" stroke-width="2"/>
  <text x="260" y="297" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">ORCHESTRATION LAYER</text>
  <rect x="80" y="303" width="360" height="55" rx="8" fill="#D40511" stroke="#b00410" stroke-width="1.5"/>
  <text x="260" y="325" text-anchor="middle" font-size="13" font-weight="700" fill="white">⚙ IIP — Infrastructure Interface Platform</text>
  <text x="260" y="342" text-anchor="middle" font-size="10" fill="#ffcccc">Sole Git writer · Validates · Orchestrates · Aggregates status</text>
  <line x1="260" y1="370" x2="260" y2="408" stroke="#323232" stroke-width="2" marker-end="url(#cur-ad)"/>
  <text x="275" y="393" font-size="10" fill="#888">writes config</text>
  <rect x="10" y="410" width="500" height="82" rx="6" fill="#f0f0f0" stroke="#888" stroke-width="1.5"/>
  <text x="260" y="429" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">SOURCE CONTROL</text>
  <rect x="180" y="435" width="200" height="46" rx="8" fill="#323232"/>
  <text x="260" y="454" text-anchor="middle" font-size="13" font-weight="700" fill="white">📁 Git Repository</text>
  <text x="260" y="470" text-anchor="middle" font-size="10" fill="#ccc">Infrastructure config files</text>
  <line x1="260" y1="492" x2="260" y2="530" stroke="#323232" stroke-width="2" marker-end="url(#cur-ad)"/>
  <text x="275" y="515" font-size="10" fill="#888">on push</text>
  <rect x="10" y="532" width="500" height="82" rx="6" fill="#f5f0ff" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="260" y="551" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">CI / CD LAYER</text>
  <rect x="160" y="557" width="200" height="46" rx="8" fill="#8b5cf6"/>
  <text x="260" y="576" text-anchor="middle" font-size="13" font-weight="700" fill="white">⚡ GitHub Actions</text>
  <text x="260" y="592" text-anchor="middle" font-size="10" fill="#e8d5ff">Reads config, fans out to tools</text>
  <line x1="260" y1="614" x2="260" y2="652" stroke="#323232" stroke-width="2" marker-end="url(#cur-ad)"/>
  <text x="275" y="637" font-size="10" fill="#888">dispatches</text>
  <rect x="10" y="654" width="500" height="114" rx="6" fill="#fff8f8" stroke="#D40511" stroke-width="1.5" stroke-dasharray="6,3"/>
  <text x="260" y="673" text-anchor="middle" font-size="10" fill="#D40511" font-weight="700" letter-spacing="0.5">THREE SEPARATE TOOLS — NO UNIFIED CONTROL PLANE ⚠</text>
  <rect x="18"  y="678" width="152" height="78" rx="6" fill="#e8f4fd" stroke="#5b9bd5" stroke-width="1.5"/>
  <text x="94"  y="698" text-anchor="middle" font-size="11" font-weight="700" fill="#323232">VRA</text>
  <text x="94"  y="712" text-anchor="middle" font-size="9"  fill="#555">vRealize Automation</text>
  <text x="94"  y="726" text-anchor="middle" font-size="9"  fill="#5b9bd5" font-weight="600">OpenShift workloads</text>
  <text x="94"  y="742" text-anchor="middle" font-size="9"  fill="#888">K8s via vRA APIs</text>
  <rect x="184" y="678" width="152" height="78" rx="6" fill="#e8f8e8" stroke="#2d8a3e" stroke-width="1.5"/>
  <text x="260" y="698" text-anchor="middle" font-size="11" font-weight="700" fill="#323232">Terraform</text>
  <text x="260" y="712" text-anchor="middle" font-size="9"  fill="#555">HashiCorp</text>
  <text x="260" y="726" text-anchor="middle" font-size="9"  fill="#2d8a3e" font-weight="600">AKS clusters</text>
  <text x="260" y="742" text-anchor="middle" font-size="9"  fill="#888">Azure Kubernetes Service</text>
  <rect x="350" y="678" width="152" height="78" rx="6" fill="#fff4e0" stroke="#e07c00" stroke-width="1.5"/>
  <text x="426" y="698" text-anchor="middle" font-size="11" font-weight="700" fill="#323232">Cloudify</text>
  <text x="426" y="712" text-anchor="middle" font-size="9"  fill="#555">Blueprints</text>
  <text x="426" y="726" text-anchor="middle" font-size="9"  fill="#e07c00" font-weight="600">Azure VMs</text>
  <text x="426" y="742" text-anchor="middle" font-size="9"  fill="#888">Virtual machines</text>
  <line x1="260" y1="768" x2="260" y2="804" stroke="#D40511" stroke-width="2" stroke-dasharray="5,3" marker-end="url(#cur-ar)"/>
  <text x="275" y="790" font-size="10" fill="#D40511">status callbacks</text>
  <rect x="10" y="806" width="500" height="54" rx="6" fill="#fff0e0" stroke="#D40511" stroke-width="2"/>
  <rect x="120" y="814" width="260" height="38" rx="6" fill="#D40511"/>
  <text x="260" y="829" text-anchor="middle" font-size="12" font-weight="700" fill="white">⚙ IIP aggregates results</text>
  <text x="260" y="845" text-anchor="middle" font-size="10" fill="#ffcccc">Pushes details → IPP (Backstage)</text>
  <line x1="260" y1="860" x2="260" y2="888" stroke="#323232" stroke-width="2" marker-end="url(#cur-ad)"/>
  <rect x="100" y="890" width="320" height="56" rx="8" fill="#FFCC00" stroke="#e6b800" stroke-width="2"/>
  <text x="260" y="910" text-anchor="middle" font-size="12" font-weight="700" fill="#323232">👤 Developer receives</text>
  <text x="260" y="926" text-anchor="middle" font-size="10" fill="#555">IP, hostname, creds → app git config</text>
  <text x="260" y="942" text-anchor="middle" font-size="9" fill="#888" font-style="italic">⏱ Wait: days to weeks</text>
  <defs>
    <marker id="cur-ad" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#323232"/></marker>
    <marker id="cur-ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#D40511"/></marker>
  </defs>
</svg>`;

const FUTURE_FLOW_SVG = `
<svg viewBox="0 0 560 1170" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:560px;display:block;margin:0 auto">
  <rect x="0" y="0" width="560" height="1170" fill="#fafafa" rx="6"/>
  <rect x="10" y="10" width="540" height="92" rx="6" fill="#fff7e0" stroke="#FFCC00" stroke-width="2"/>
  <text x="280" y="29" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">DEVELOPER</text>
  <rect x="180" y="35" width="200" height="55" rx="8" fill="#FFCC00" stroke="#e6b800" stroke-width="1.5"/>
  <text x="280" y="57" text-anchor="middle" font-size="13" font-weight="700" fill="#323232">👤 Developer</text>
  <text x="280" y="74" text-anchor="middle" font-size="10" fill="#555">Submits Claim via IPP self-service UI</text>
  <line x1="280" y1="102" x2="280" y2="140" stroke="#323232" stroke-width="2" marker-end="url(#fut-fd)"/>
  <text x="295" y="125" font-size="10" fill="#888">UI request</text>
  <rect x="10" y="142" width="540" height="88" rx="6" fill="#e8f4fd" stroke="#5b9bd5" stroke-width="1.5"/>
  <text x="280" y="161" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">PORTAL LAYER</text>
  <rect x="120" y="167" width="320" height="52" rx="8" fill="#5b9bd5"/>
  <text x="280" y="188" text-anchor="middle" font-size="13" font-weight="700" fill="white">🖥 IPP — Infrastructure Platform Portal</text>
  <text x="280" y="206" text-anchor="middle" font-size="10" fill="#d6eaf8">(Backstage) Generates Claim YAML · Triggers IIP</text>
  <line x1="280" y1="230" x2="280" y2="263" stroke="#323232" stroke-width="2" marker-end="url(#fut-fd)"/>
  <text x="295" y="250" font-size="10" fill="#888">trigger</text>
  <rect x="10" y="265" width="540" height="90" rx="6" fill="#fff0e0" stroke="#D40511" stroke-width="2"/>
  <text x="280" y="284" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">ORCHESTRATION LAYER</text>
  <rect x="80" y="290" width="400" height="54" rx="8" fill="#D40511" stroke="#b00410" stroke-width="1.5"/>
  <text x="280" y="312" text-anchor="middle" font-size="13" font-weight="700" fill="white">⚙ IIP — Infrastructure Interface Platform</text>
  <text x="280" y="329" text-anchor="middle" font-size="10" fill="#ffcccc">Sole Git writer · Validates · Writes Claim YAML to Git</text>
  <line x1="280" y1="355" x2="280" y2="388" stroke="#323232" stroke-width="2" marker-end="url(#fut-fd)"/>
  <text x="295" y="375" font-size="10" fill="#D40511" font-weight="600">git push Claim YAML</text>
  <rect x="10" y="390" width="540" height="82" rx="6" fill="#f0f0f0" stroke="#888" stroke-width="1.5"/>
  <text x="280" y="409" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">SOURCE CONTROL</text>
  <rect x="175" y="415" width="210" height="46" rx="8" fill="#323232"/>
  <text x="280" y="434" text-anchor="middle" font-size="13" font-weight="700" fill="white">📁 Git — Claim YAML</text>
  <text x="280" y="450" text-anchor="middle" font-size="10" fill="#ccc">PrivateCloudVM claim committed by IIP</text>
  <line x1="280" y1="472" x2="280" y2="510" stroke="#323232" stroke-width="2" marker-end="url(#fut-fd)"/>
  <text x="295" y="495" font-size="10" fill="#888">watches repo</text>
  <rect x="10" y="512" width="540" height="82" rx="6" fill="#f5f0ff" stroke="#8b5cf6" stroke-width="1.5"/>
  <text x="280" y="531" text-anchor="middle" font-size="10" fill="#888" font-weight="600" letter-spacing="0.5">GITOPS ENGINE</text>
  <rect x="170" y="537" width="220" height="46" rx="8" fill="#8b5cf6"/>
  <text x="280" y="556" text-anchor="middle" font-size="13" font-weight="700" fill="white">🔄 Argo CD</text>
  <text x="280" y="572" text-anchor="middle" font-size="10" fill="#e8d5ff">Syncs Claim manifest → Crossplane cluster</text>
  <line x1="280" y1="594" x2="280" y2="632" stroke="#323232" stroke-width="2" marker-end="url(#fut-fd)"/>
  <text x="295" y="617" font-size="10" fill="#888">applies Claim</text>
  <rect x="10" y="634" width="540" height="318" rx="8" fill="#fff8f0" stroke="#D40511" stroke-width="2.5"/>
  <rect x="10" y="634" width="540" height="28" rx="8" fill="#D40511"/>
  <rect x="10" y="652" width="540" height="10" fill="#D40511"/>
  <text x="280" y="652" text-anchor="middle" font-size="12" font-weight="700" fill="white" letter-spacing="0.5">⚙  CROSSPLANE CONTROL PLANE</text>
  <rect x="20" y="668" width="160" height="70" rx="6" fill="white" stroke="#D40511" stroke-width="1.5"/>
  <text x="100" y="686" text-anchor="middle" font-size="10" font-weight="700" fill="#D40511">XRD</text>
  <text x="100" y="700" text-anchor="middle" font-size="9.5" fill="#555">CompositeResourceDefinition</text>
  <text x="100" y="714" text-anchor="middle" font-size="9" fill="#888">Developer-facing API</text>
  <text x="100" y="727" text-anchor="middle" font-size="9" fill="#888">e.g. PrivateCloudVM</text>
  <rect x="200" y="668" width="160" height="70" rx="6" fill="white" stroke="#D40511" stroke-width="1.5"/>
  <text x="280" y="686" text-anchor="middle" font-size="10" font-weight="700" fill="#D40511">Composition</text>
  <text x="280" y="700" text-anchor="middle" font-size="9.5" fill="#555">Recipe / template</text>
  <text x="280" y="714" text-anchor="middle" font-size="9" fill="#888">Maps Claim → Managed Resources</text>
  <text x="280" y="727" text-anchor="middle" font-size="9" fill="#888">ComputeInstance + StorageVolume</text>
  <rect x="380" y="668" width="160" height="70" rx="6" fill="white" stroke="#D40511" stroke-width="1.5"/>
  <text x="460" y="686" text-anchor="middle" font-size="10" font-weight="700" fill="#D40511">Claim → XR</text>
  <text x="460" y="700" text-anchor="middle" font-size="9.5" fill="#555">Developer request object</text>
  <text x="460" y="714" text-anchor="middle" font-size="9" fill="#888">XR = internal Crossplane</text>
  <text x="460" y="727" text-anchor="middle" font-size="9" fill="#888">object that owns all MRs</text>
  <line x1="180" y1="703" x2="198" y2="703" stroke="#D40511" stroke-width="1.5" marker-end="url(#fut-fr)"/>
  <line x1="360" y1="703" x2="378" y2="703" stroke="#D40511" stroke-width="1.5" marker-end="url(#fut-fr)"/>
  <line x1="280" y1="738" x2="280" y2="762" stroke="#D40511" stroke-width="1.5" marker-end="url(#fut-fr)"/>
  <rect x="20" y="762" width="520" height="60" rx="6" fill="#fff0e0" stroke="#e07c00" stroke-width="1.5"/>
  <text x="280" y="781" text-anchor="middle" font-size="10" font-weight="700" fill="#e07c00">Provider + ProviderConfig</text>
  <text x="140" y="797" text-anchor="middle" font-size="9" fill="#888">Provider = private cloud controller package</text>
  <text x="410" y="797" text-anchor="middle" font-size="9" fill="#888">ProviderConfig = endpoint + credentials + tenant/datacenter</text>
  <text x="280" y="812" text-anchor="middle" font-size="9" fill="#888">Reconciliation loop · auth · API calls to private cloud</text>
  <line x1="280" y1="822" x2="280" y2="844" stroke="#e07c00" stroke-width="1.5" marker-end="url(#fut-fo)"/>
  <rect x="20" y="844" width="520" height="96" rx="6" fill="#fff8e0" stroke="#FFCC00" stroke-width="2"/>
  <text x="280" y="863" text-anchor="middle" font-size="10" font-weight="700" fill="#b8860b">Managed Resources — reconciled to READY</text>
  <rect x="28"  y="869" width="158" height="60" rx="5" fill="white" stroke="#FFCC00" stroke-width="1.5"/>
  <text x="107" y="888" text-anchor="middle" font-size="10" font-weight="600" fill="#323232">ComputeInstance</text>
  <text x="107" y="903" text-anchor="middle" font-size="9" fill="#888">VM in private cloud</text>
  <text x="107" y="917" text-anchor="middle" font-size="9" fill="#888">CPU · RAM · disk</text>
  <rect x="201" y="869" width="158" height="60" rx="5" fill="white" stroke="#FFCC00" stroke-width="1.5"/>
  <text x="280" y="888" text-anchor="middle" font-size="10" font-weight="600" fill="#323232">StorageVolume</text>
  <text x="280" y="903" text-anchor="middle" font-size="9" fill="#888">Block / NFS volume</text>
  <text x="280" y="917" text-anchor="middle" font-size="9" fill="#888">attached to instance</text>
  <rect x="374" y="869" width="158" height="60" rx="5" fill="white" stroke="#FFCC00" stroke-width="1.5"/>
  <text x="453" y="888" text-anchor="middle" font-size="10" font-weight="600" fill="#323232">VolumeAttachment</text>
  <text x="453" y="903" text-anchor="middle" font-size="9" fill="#888">Binds volume to VM</text>
  <text x="453" y="917" text-anchor="middle" font-size="9" fill="#888">mount point</text>
  <line x1="280" y1="952" x2="280" y2="990" stroke="#1a7a2e" stroke-width="2.5" marker-end="url(#fut-fg)"/>
  <text x="295" y="975" font-size="10" fill="#1a7a2e" font-weight="600">Status — direct return ✓</text>
  <rect x="10" y="992" width="540" height="80" rx="6" fill="#e8f8ee" stroke="#1a7a2e" stroke-width="2"/>
  <text x="280" y="1012" text-anchor="middle" font-size="10" fill="#1a7a2e" font-weight="700" letter-spacing="0.5">CROSSPLANE STATUS — READY</text>
  <text x="280" y="1029" text-anchor="middle" font-size="11" fill="#323232" font-weight="600">IP address · Hostname · Resource IDs · Readiness · Connection details</text>
  <text x="280" y="1046" text-anchor="middle" font-size="10" fill="#555">Written to XR status → IPP reads via Kubernetes API — no GitHub Actions callback</text>
  <text x="280" y="1062" text-anchor="middle" font-size="10" fill="#888">Developer sees live status in IPP portal immediately</text>
  <line x1="280" y1="1072" x2="280" y2="1100" stroke="#323232" stroke-width="2" marker-end="url(#fut-fd)"/>
  <rect x="100" y="1102" width="360" height="56" rx="8" fill="#FFCC00" stroke="#e6b800" stroke-width="2"/>
  <text x="280" y="1122" text-anchor="middle" font-size="13" font-weight="700" fill="#323232">👤 Developer receives</text>
  <text x="280" y="1140" text-anchor="middle" font-size="10" fill="#555">IP, hostname, IDs → app git config</text>
  <text x="280" y="1156" text-anchor="middle" font-size="9" fill="#1a7a2e" font-style="italic" font-weight="600">⏱ ~10 minutes ✓</text>
  <defs>
    <marker id="fut-fd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#323232"/></marker>
    <marker id="fut-fr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#D40511"/></marker>
    <marker id="fut-fg" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#1a7a2e"/></marker>
    <marker id="fut-fo" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e07c00"/></marker>
  </defs>
</svg>`;

const REFERENCE_ARCH_SVG = `
<svg viewBox="0 0 900 740" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:900px;display:block;margin:0 auto">
  <rect x="0" y="0" width="900" height="118" rx="6" fill="#fff7e0" stroke="#FFCC00" stroke-width="2"/>
  <rect x="0" y="0" width="140" height="118" rx="6" fill="#FFCC00"/>
  <rect x="130" y="0" width="10" height="118" fill="#FFCC00"/>
  <text x="70" y="52" text-anchor="middle" font-size="11" font-weight="700" fill="#323232" transform="rotate(-90,70,52)">DEVELOPER LAYER</text>
  <rect x="155" y="10" width="185" height="98" rx="6" fill="white" stroke="#5b9bd5" stroke-width="2"/>
  <text x="247" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#5b9bd5">🖥 IPP (Backstage)</text>
  <text x="247" y="46" text-anchor="middle" font-size="9.5" fill="#555">Infrastructure Platform Portal</text>
  <text x="247" y="61" text-anchor="middle" font-size="9" fill="#888">Self-service Claim UI</text>
  <text x="247" y="75" text-anchor="middle" font-size="9" fill="#888">Software Catalog · TechDocs</text>
  <text x="247" y="89" text-anchor="middle" font-size="9" fill="#888">Service Templates · Scorecards</text>
  <text x="247" y="103" text-anchor="middle" font-size="9" fill="#888">Live infra status via K8s API</text>
  <rect x="354" y="10" width="185" height="98" rx="6" fill="white" stroke="#D40511" stroke-width="2"/>
  <text x="446" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#D40511">⚙ IIP</text>
  <text x="446" y="46" text-anchor="middle" font-size="9.5" fill="#555">Infrastructure Interface Platform</text>
  <text x="446" y="61" text-anchor="middle" font-size="9" fill="#888">Sole Git writer</text>
  <text x="446" y="75" text-anchor="middle" font-size="9" fill="#888">Request validation</text>
  <text x="446" y="89" text-anchor="middle" font-size="9" fill="#888">Quota &amp; tenant management</text>
  <text x="446" y="103" text-anchor="middle" font-size="9" fill="#888">Platform health &amp; cost view</text>
  <rect x="553" y="10" width="160" height="98" rx="6" fill="white" stroke="#D40511" stroke-width="2"/>
  <text x="633" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#D40511">🧪 Try-Out Lab</text>
  <text x="633" y="46" text-anchor="middle" font-size="9.5" fill="#555">Guided sandbox</text>
  <text x="633" y="61" text-anchor="middle" font-size="9" fill="#888">12 exercises: Beginner→Advanced</text>
  <text x="633" y="75" text-anchor="middle" font-size="9" fill="#888">Pre-configured Claims</text>
  <text x="633" y="89" text-anchor="middle" font-size="9" fill="#888">Full GitOps round-trip</text>
  <text x="633" y="103" text-anchor="middle" font-size="9" fill="#888">Live Grafana dashboards</text>
  <rect x="727" y="10" width="163" height="98" rx="6" fill="white" stroke="#323232" stroke-width="2"/>
  <text x="808" y="30" text-anchor="middle" font-size="11" font-weight="700" fill="#323232">⌨ CLI / kubectl</text>
  <text x="808" y="46" text-anchor="middle" font-size="9.5" fill="#555">Advanced developer access</text>
  <text x="808" y="61" text-anchor="middle" font-size="9" fill="#888">kubectl apply -f claim.yaml</text>
  <text x="808" y="75" text-anchor="middle" font-size="9" fill="#888">kubectl get managed</text>
  <text x="808" y="89" text-anchor="middle" font-size="9" fill="#888">crossplane trace / beta trace</text>
  <text x="808" y="103" text-anchor="middle" font-size="9" fill="#888">kubectl describe xr</text>
  <line x1="450" y1="118" x2="450" y2="140" stroke="#323232" stroke-width="2" marker-end="url(#ref-ra)"/>
  <rect x="0" y="140" width="900" height="118" rx="6" fill="#f5f0ff" stroke="#8b5cf6" stroke-width="2"/>
  <rect x="0" y="140" width="140" height="118" rx="6" fill="#8b5cf6"/>
  <rect x="130" y="140" width="10" height="118" fill="#8b5cf6"/>
  <text x="70" y="195" text-anchor="middle" font-size="11" font-weight="700" fill="white" transform="rotate(-90,70,195)">GITOPS LAYER</text>
  <rect x="155" y="150" width="210" height="98" rx="6" fill="white" stroke="#323232" stroke-width="2"/>
  <text x="260" y="170" text-anchor="middle" font-size="11" font-weight="700" fill="#323232">📁 Git Repository</text>
  <text x="260" y="186" text-anchor="middle" font-size="9.5" fill="#555">Infrastructure-as-Code (GitOps)</text>
  <text x="260" y="201" text-anchor="middle" font-size="9" fill="#888">Claim YAMLs (committed by IIP)</text>
  <text x="260" y="215" text-anchor="middle" font-size="9" fill="#888">XRDs, Compositions, Providers</text>
  <text x="260" y="229" text-anchor="middle" font-size="9" fill="#888">Argo Applications · Policy manifests</text>
  <text x="260" y="244" text-anchor="middle" font-size="9" fill="#888">Immutable audit trail (NIS2)</text>
  <rect x="379" y="150" width="210" height="98" rx="6" fill="white" stroke="#8b5cf6" stroke-width="2"/>
  <text x="484" y="170" text-anchor="middle" font-size="11" font-weight="700" fill="#8b5cf6">🔄 Argo CD</text>
  <text x="484" y="186" text-anchor="middle" font-size="9.5" fill="#555">GitOps engine</text>
  <text x="484" y="201" text-anchor="middle" font-size="9" fill="#888">Watches Git, syncs Claims</text>
  <text x="484" y="215" text-anchor="middle" font-size="9" fill="#888">ApplicationSets (multi-cluster)</text>
  <text x="484" y="229" text-anchor="middle" font-size="9" fill="#888">Drift detection &amp; auto-heal</text>
  <text x="484" y="244" text-anchor="middle" font-size="9" fill="#888">Slack / email notifications</text>
  <rect x="603" y="150" width="287" height="98" rx="6" fill="white" stroke="#555" stroke-width="1.5"/>
  <text x="746" y="170" text-anchor="middle" font-size="11" font-weight="700" fill="#323232">🔔 Notifications &amp; Audit</text>
  <text x="746" y="186" text-anchor="middle" font-size="9.5" fill="#555">Argo CD Notifications → Slack / email</text>
  <text x="746" y="201" text-anchor="middle" font-size="9" fill="#888">Sync success / failure alerts</text>
  <text x="746" y="215" text-anchor="middle" font-size="9" fill="#888">Git commit audit trail (NIS2 compliant)</text>
  <text x="746" y="229" text-anchor="middle" font-size="9" fill="#888">RBAC: who committed, who approved</text>
  <text x="746" y="244" text-anchor="middle" font-size="9" fill="#888">Immutable Git history = audit log</text>
  <line x1="450" y1="258" x2="450" y2="278" stroke="#323232" stroke-width="2" marker-end="url(#ref-ra)"/>
  <rect x="0" y="278" width="900" height="140" rx="6" fill="#fff8f0" stroke="#D40511" stroke-width="2.5"/>
  <rect x="0" y="278" width="140" height="140" rx="6" fill="#D40511"/>
  <rect x="130" y="278" width="10" height="140" fill="#D40511"/>
  <text x="70" y="345" text-anchor="middle" font-size="11" font-weight="700" fill="white" transform="rotate(-90,70,345)">PLATFORM CONTROL</text>
  <rect x="155" y="288" width="225" height="118" rx="6" fill="white" stroke="#D40511" stroke-width="2.5"/>
  <text x="267" y="308" text-anchor="middle" font-size="11" font-weight="700" fill="#D40511">⚙ Crossplane</text>
  <text x="267" y="324" text-anchor="middle" font-size="9.5" fill="#555">Kubernetes-native control plane</text>
  <text x="267" y="340" text-anchor="middle" font-size="9" fill="#888">XRD → developer-facing API</text>
  <text x="267" y="354" text-anchor="middle" font-size="9" fill="#888">Composition → recipe for MRs</text>
  <text x="267" y="368" text-anchor="middle" font-size="9" fill="#888">Claim → XR → owns MRs</text>
  <text x="267" y="382" text-anchor="middle" font-size="9" fill="#888">ComputeInstance + StorageVolume</text>
  <text x="267" y="396" text-anchor="middle" font-size="9" fill="#888">+ VolumeAttachment</text>
  <rect x="394" y="288" width="200" height="118" rx="6" fill="white" stroke="#1a7a2e" stroke-width="2"/>
  <text x="494" y="308" text-anchor="middle" font-size="11" font-weight="700" fill="#1a7a2e">🛡 OPA / Kyverno</text>
  <text x="494" y="324" text-anchor="middle" font-size="9.5" fill="#555">Policy-as-Code enforcement</text>
  <text x="494" y="340" text-anchor="middle" font-size="9" fill="#888">Admission webhooks on Claims</text>
  <text x="494" y="354" text-anchor="middle" font-size="9" fill="#888">Resource quota guardrails</text>
  <text x="494" y="368" text-anchor="middle" font-size="9" fill="#888">Naming &amp; label conventions</text>
  <text x="494" y="382" text-anchor="middle" font-size="9" fill="#888">NIS2 / compliance rules</text>
  <text x="494" y="396" text-anchor="middle" font-size="9" fill="#888">Deny non-compliant Claims</text>
  <rect x="608" y="288" width="200" height="118" rx="6" fill="white" stroke="#e07c00" stroke-width="2"/>
  <text x="708" y="308" text-anchor="middle" font-size="11" font-weight="700" fill="#e07c00">🌐 Cilium eBPF</text>
  <text x="708" y="324" text-anchor="middle" font-size="9.5" fill="#555">Zero-trust network policy</text>
  <text x="708" y="340" text-anchor="middle" font-size="9" fill="#888">eBPF pod microsegmentation</text>
  <text x="708" y="354" text-anchor="middle" font-size="9" fill="#888">East-West traffic encryption</text>
  <text x="708" y="368" text-anchor="middle" font-size="9" fill="#888">Hubble flow visibility</text>
  <text x="708" y="382" text-anchor="middle" font-size="9" fill="#888">L3/L4/L7 network policies</text>
  <text x="708" y="396" text-anchor="middle" font-size="9" fill="#888">Service mesh without sidecar</text>
  <rect x="822" y="288" width="68" height="118" rx="6" fill="white" stroke="#D40511" stroke-width="1.5"/>
  <text x="856" y="350" text-anchor="middle" font-size="9" font-weight="700" fill="#D40511" transform="rotate(-90,856,350)">Provider + ProviderConfig</text>
  <line x1="450" y1="418" x2="450" y2="438" stroke="#323232" stroke-width="2" marker-end="url(#ref-ra)"/>
  <rect x="0" y="438" width="900" height="128" rx="6" fill="#e8f4fd" stroke="#5b9bd5" stroke-width="2"/>
  <rect x="0" y="438" width="140" height="128" rx="6" fill="#5b9bd5"/>
  <rect x="130" y="438" width="10" height="128" fill="#5b9bd5"/>
  <text x="70" y="498" text-anchor="middle" font-size="11" font-weight="700" fill="white" transform="rotate(-90,70,498)">TARGET INFRA</text>
  <rect x="155" y="448" width="215" height="106" rx="6" fill="white" stroke="#326de6" stroke-width="2"/>
  <text x="262" y="468" text-anchor="middle" font-size="11" font-weight="700" fill="#326de6">☸ Kubernetes CAPI</text>
  <text x="262" y="484" text-anchor="middle" font-size="9.5" fill="#555">Cluster API — on-prem K8s</text>
  <text x="262" y="500" text-anchor="middle" font-size="9" fill="#888">Lifecycle: create, upgrade, delete</text>
  <text x="262" y="514" text-anchor="middle" font-size="9" fill="#888">Worker nodes via ComputeInstance</text>
  <text x="262" y="528" text-anchor="middle" font-size="9" fill="#888">StorageVolume for PVs</text>
  <text x="262" y="542" text-anchor="middle" font-size="9" fill="#888">OpenShift clusters (VRA target)</text>
  <rect x="384" y="448" width="215" height="106" rx="6" fill="white" stroke="#8b5cf6" stroke-width="2"/>
  <text x="491" y="468" text-anchor="middle" font-size="11" font-weight="700" fill="#8b5cf6">🖥 KubeVirt / VMs</text>
  <text x="491" y="484" text-anchor="middle" font-size="9.5" fill="#555">VM workloads on K8s</text>
  <text x="491" y="500" text-anchor="middle" font-size="9" fill="#888">VMI objects = Managed Resources</text>
  <text x="491" y="514" text-anchor="middle" font-size="9" fill="#888">Live migration support</text>
  <text x="491" y="528" text-anchor="middle" font-size="9" fill="#888">CDI data volumes</text>
  <text x="491" y="542" text-anchor="middle" font-size="9" fill="#888">Private cloud VMs (Cloudify target)</text>
  <rect x="613" y="448" width="277" height="106" rx="6" fill="white" stroke="#0078d4" stroke-width="2"/>
  <text x="751" y="468" text-anchor="middle" font-size="11" font-weight="700" fill="#0078d4">☁ AKS — Azure Kubernetes</text>
  <text x="751" y="484" text-anchor="middle" font-size="9.5" fill="#555">Managed K8s on Azure</text>
  <text x="751" y="500" text-anchor="middle" font-size="9" fill="#888">Terraform now / Crossplane Azure Provider future</text>
  <text x="751" y="514" text-anchor="middle" font-size="9" fill="#888">Azure VMs via VolumeAttachment</text>
  <text x="751" y="528" text-anchor="middle" font-size="9" fill="#888">Node pools, autoscaling, AAD integration</text>
  <text x="751" y="542" text-anchor="middle" font-size="9" fill="#888">Cloudify target for Azure VMs today</text>
  <line x1="450" y1="566" x2="450" y2="586" stroke="#323232" stroke-width="2" marker-end="url(#ref-ra)"/>
  <rect x="0" y="586" width="900" height="144" rx="6" fill="#f0faf0" stroke="#1a7a2e" stroke-width="2"/>
  <rect x="0" y="586" width="140" height="144" rx="6" fill="#1a7a2e"/>
  <rect x="130" y="586" width="10" height="144" fill="#1a7a2e"/>
  <text x="70" y="658" text-anchor="middle" font-size="10" font-weight="700" fill="white" transform="rotate(-90,70,658)">OBSERVABILITY &amp; SECURITY</text>
  <rect x="155" y="596" width="170" height="122" rx="6" fill="white" stroke="#1a7a2e" stroke-width="1.5"/>
  <text x="240" y="616" text-anchor="middle" font-size="11" font-weight="700" fill="#1a7a2e">🔍 Hubble</text>
  <text x="240" y="632" text-anchor="middle" font-size="9.5" fill="#555">Network flow visibility</text>
  <text x="240" y="647" text-anchor="middle" font-size="9" fill="#888">Real-time L4/L7 flows</text>
  <text x="240" y="661" text-anchor="middle" font-size="9" fill="#888">Service map &amp; topology</text>
  <text x="240" y="675" text-anchor="middle" font-size="9" fill="#888">Policy verdict tracing</text>
  <text x="240" y="689" text-anchor="middle" font-size="9" fill="#888">Drop reason analysis</text>
  <text x="240" y="703" text-anchor="middle" font-size="9" fill="#888">Grafana integration</text>
  <text x="240" y="717" text-anchor="middle" font-size="9" fill="#888">eBPF-based, no sidecar</text>
  <rect x="339" y="596" width="170" height="122" rx="6" fill="white" stroke="#e07c00" stroke-width="1.5"/>
  <text x="424" y="616" text-anchor="middle" font-size="11" font-weight="700" fill="#e07c00">📊 Grafana</text>
  <text x="424" y="632" text-anchor="middle" font-size="9.5" fill="#555">Unified metrics dashboards</text>
  <text x="424" y="647" text-anchor="middle" font-size="9" fill="#888">Platform health overview</text>
  <text x="424" y="661" text-anchor="middle" font-size="9" fill="#888">Managed Resource status</text>
  <text x="424" y="675" text-anchor="middle" font-size="9" fill="#888">Crossplane reconcile latency</text>
  <text x="424" y="689" text-anchor="middle" font-size="9" fill="#888">Prometheus data source</text>
  <text x="424" y="703" text-anchor="middle" font-size="9" fill="#888">Alerting: PagerDuty / Slack</text>
  <text x="424" y="717" text-anchor="middle" font-size="9" fill="#888">SLA / MTTR tracking</text>
  <rect x="523" y="596" width="175" height="122" rx="6" fill="white" stroke="#D40511" stroke-width="1.5"/>
  <text x="610" y="616" text-anchor="middle" font-size="11" font-weight="700" fill="#D40511">🤖 AIOps</text>
  <text x="610" y="632" text-anchor="middle" font-size="9.5" fill="#555">Intelligent operations</text>
  <text x="610" y="647" text-anchor="middle" font-size="9" fill="#888">Anomaly detection on MRs</text>
  <text x="610" y="661" text-anchor="middle" font-size="9" fill="#888">Predictive resource scaling</text>
  <text x="610" y="675" text-anchor="middle" font-size="9" fill="#888">MTTR reduction automation</text>
  <text x="610" y="689" text-anchor="middle" font-size="9" fill="#888">Incident correlation</text>
  <text x="610" y="703" text-anchor="middle" font-size="9" fill="#888">Cost optimisation signals</text>
  <text x="610" y="717" text-anchor="middle" font-size="9" fill="#888">Runbook automation triggers</text>
  <rect x="712" y="596" width="178" height="122" rx="6" fill="white" stroke="#323232" stroke-width="1.5"/>
  <text x="801" y="616" text-anchor="middle" font-size="11" font-weight="700" fill="#323232">🔒 NIS2 / Security</text>
  <text x="801" y="632" text-anchor="middle" font-size="9.5" fill="#555">Compliance &amp; audit layer</text>
  <text x="801" y="647" text-anchor="middle" font-size="9" fill="#888">Immutable Git audit trail</text>
  <text x="801" y="661" text-anchor="middle" font-size="9" fill="#888">OPA/Kyverno policy reports</text>
  <text x="801" y="675" text-anchor="middle" font-size="9" fill="#888">Cilium network audit logs</text>
  <text x="801" y="689" text-anchor="middle" font-size="9" fill="#888">RBAC enforced per persona</text>
  <text x="801" y="703" text-anchor="middle" font-size="9" fill="#888">Vault / ExternalSecrets</text>
  <text x="801" y="717" text-anchor="middle" font-size="9" fill="#888">NIS2 Art. 21 controls mapped</text>
  <defs>
    <marker id="ref-ra" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#323232"/></marker>
  </defs>
</svg>`;

const SEQ_CURRENT_SVG = `
<svg viewBox="0 0 920 720" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
  <rect x="20"  y="10" width="100" height="46" rx="5" fill="#FFCC00" stroke="#e6b800" stroke-width="2"/>
  <text x="70"  y="28" text-anchor="middle" font-size="10" font-weight="700" fill="#323232">👤 Developer</text>
  <rect x="142" y="10" width="116" height="46" rx="5" fill="#5b9bd5" stroke="#4a87c0" stroke-width="2"/>
  <text x="200" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">🖥 IPP</text>
  <text x="200" y="42" text-anchor="middle" font-size="8"  fill="#d6eaf8">Backstage Portal</text>
  <rect x="290" y="10" width="120" height="46" rx="5" fill="#D40511" stroke="#b00410" stroke-width="2"/>
  <text x="350" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">⚙ IIP</text>
  <text x="350" y="42" text-anchor="middle" font-size="8"  fill="#ffcccc">sole Git writer</text>
  <rect x="430" y="10" width="120" height="46" rx="5" fill="#323232" stroke="#1a1a1a" stroke-width="2"/>
  <text x="490" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">📁 Git</text>
  <text x="490" y="42" text-anchor="middle" font-size="8"  fill="#ccc">Repository</text>
  <rect x="567" y="10" width="126" height="46" rx="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>
  <text x="630" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">⚡ GitHub Actions</text>
  <text x="630" y="42" text-anchor="middle" font-size="8"  fill="#e8d5ff">CI / CD</text>
  <rect x="732" y="10" width="136" height="46" rx="5" fill="#fff0e0" stroke="#D40511" stroke-width="1.5" stroke-dasharray="5,3"/>
  <text x="800" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="#D40511">VRA / TF / Cloudify</text>
  <text x="800" y="42" text-anchor="middle" font-size="8"  fill="#888">3 separate tools</text>
  <line x1="70"  y1="56" x2="70"  y2="700" stroke="#323232" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="200" y1="56" x2="200" y2="700" stroke="#5b9bd5" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="350" y1="56" x2="350" y2="700" stroke="#D40511" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="490" y1="56" x2="490" y2="700" stroke="#888"    stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="630" y1="56" x2="630" y2="700" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="800" y1="56" x2="800" y2="700" stroke="#D40511" stroke-width="1" stroke-dasharray="4,4"/>
  <rect x="343" y="100" width="14" height="340" fill="#D40511" opacity="0.25" rx="2"/>
  <rect x="193" y="100" width="14" height="460" fill="#5b9bd5" opacity="0.2" rx="2"/>
  <line x1="70" y1="100" x2="193" y2="100" stroke="#323232" stroke-width="1.8" marker-end="url(#sc-sq)"/>
  <text x="130" y="94" text-anchor="middle" font-size="10" fill="#323232" font-weight="600">1. Submit infra request</text>
  <line x1="207" y1="130" x2="342" y2="130" stroke="#323232" stroke-width="1.8" marker-end="url(#sc-sq)"/>
  <text x="274" y="124" text-anchor="middle" font-size="10" fill="#323232">2. Forward request</text>
  <path d="M350,155 Q380,155 380,168 Q380,181 357,181" stroke="#D40511" stroke-width="1.5" fill="none" marker-end="url(#sc-sqr)"/>
  <text x="395" y="162" font-size="9.5" fill="#D40511" font-weight="600">3. Validate request</text>
  <text x="395" y="175" font-size="9"   fill="#888">Check quota, policy</text>
  <line x1="357" y1="210" x2="483" y2="210" stroke="#D40511" stroke-width="2.5" marker-end="url(#sc-sqr)"/>
  <rect x="363" y="196" width="118" height="18" rx="3" fill="#fff0e0"/>
  <text x="422" y="208" text-anchor="middle" font-size="9.5" fill="#D40511" font-weight="700">4. git push config</text>
  <text x="422" y="223" text-anchor="middle" font-size="8.5" fill="#888">(IIP = sole Git writer)</text>
  <line x1="490" y1="250" x2="623" y2="250" stroke="#8b5cf6" stroke-width="1.8" marker-end="url(#sc-sqp)"/>
  <text x="556" y="244" text-anchor="middle" font-size="10" fill="#8b5cf6" font-weight="600">5. on-push webhook</text>
  <line x1="637" y1="285" x2="793" y2="285" stroke="#8b5cf6" stroke-width="1.5" marker-end="url(#sc-sqp)"/>
  <text x="715" y="279" text-anchor="middle" font-size="9.5" fill="#8b5cf6">6a. dispatch → VRA (OpenShift)</text>
  <line x1="637" y1="308" x2="793" y2="308" stroke="#8b5cf6" stroke-width="1.5" marker-end="url(#sc-sqp)"/>
  <text x="715" y="302" text-anchor="middle" font-size="9.5" fill="#8b5cf6">6b. dispatch → Terraform (AKS)</text>
  <line x1="637" y1="331" x2="793" y2="331" stroke="#8b5cf6" stroke-width="1.5" marker-end="url(#sc-sqp)"/>
  <text x="715" y="325" text-anchor="middle" font-size="9.5" fill="#8b5cf6">6c. dispatch → Cloudify (Azure VMs)</text>
  <path d="M800,355 Q840,355 840,375 Q840,395 814,395" stroke="#D40511" stroke-width="1.5" fill="none" marker-end="url(#sc-sqr)"/>
  <text x="845" y="363" font-size="9.5" fill="#D40511" font-weight="600">7. Provision resources</text>
  <text x="845" y="377" font-size="9"   fill="#888">independently, no</text>
  <text x="845" y="389" font-size="9"   fill="#888">shared control plane</text>
  <line x1="793" y1="425" x2="364" y2="425" stroke="#D40511" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#sc-sqrd)"/>
  <text x="578" y="419" text-anchor="middle" font-size="9.5" fill="#D40511">8a. VRA status callback</text>
  <line x1="793" y1="448" x2="364" y2="448" stroke="#D40511" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#sc-sqrd)"/>
  <text x="578" y="442" text-anchor="middle" font-size="9.5" fill="#D40511">8b. Terraform status callback</text>
  <line x1="793" y1="471" x2="364" y2="471" stroke="#D40511" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#sc-sqrd)"/>
  <text x="578" y="465" text-anchor="middle" font-size="9.5" fill="#D40511">8c. Cloudify status callback</text>
  <path d="M350,495 Q382,495 382,509 Q382,523 357,523" stroke="#D40511" stroke-width="1.5" fill="none" marker-end="url(#sc-sqr)"/>
  <text x="388" y="502" font-size="9.5" fill="#D40511" font-weight="600">9. Aggregate results</text>
  <line x1="343" y1="545" x2="214" y2="545" stroke="#323232" stroke-width="1.8" stroke-dasharray="4,3" marker-end="url(#sc-sqd)"/>
  <text x="278" y="539" text-anchor="middle" font-size="10" fill="#323232">10. Push status → IPP</text>
  <line x1="193" y1="578" x2="84" y2="578" stroke="#323232" stroke-width="1.8" stroke-dasharray="4,3" marker-end="url(#sc-sqd)"/>
  <text x="136" y="572" text-anchor="middle" font-size="10" fill="#323232">11. Infra details: IP, hostname, creds</text>
  <path d="M70,605 Q38,605 38,618 Q38,631 56,631" stroke="#323232" stroke-width="1.5" fill="none" marker-end="url(#sc-sq)"/>
  <text x="18" y="611" font-size="9" fill="#888" text-anchor="start">12. → app git config</text>
  <rect x="14" y="645" width="890" height="46" rx="4" fill="#fff8f8" stroke="#D40511" stroke-width="1.5" stroke-dasharray="4,3"/>
  <text x="460" y="664" text-anchor="middle" font-size="11" fill="#D40511" font-weight="700">⚠  End-to-end wait: days to weeks</text>
  <text x="460" y="681" text-anchor="middle" font-size="9.5" fill="#888">Multiple async hand-offs · No unified status · Three tool runbooks · IIP aggregates callbacks manually</text>
  <defs>
    <marker id="sc-sq"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#323232"/></marker>
    <marker id="sc-sqd"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#323232"/></marker>
    <marker id="sc-sqr"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#D40511"/></marker>
    <marker id="sc-sqrd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#D40511"/></marker>
    <marker id="sc-sqp"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#8b5cf6"/></marker>
  </defs>
</svg>`;

const SEQ_FUTURE_SVG = `
<svg viewBox="0 0 980 760" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block">
  <rect x="12"  y="10" width="100" height="46" rx="5" fill="#FFCC00" stroke="#e6b800" stroke-width="2"/>
  <text x="62"  y="28" text-anchor="middle" font-size="10" font-weight="700" fill="#323232">👤 Developer</text>
  <rect x="124" y="10" width="116" height="46" rx="5" fill="#5b9bd5" stroke="#4a87c0" stroke-width="2"/>
  <text x="182" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">🖥 IPP</text>
  <text x="182" y="42" text-anchor="middle" font-size="8"  fill="#d6eaf8">Backstage Portal</text>
  <rect x="252" y="10" width="120" height="46" rx="5" fill="#D40511" stroke="#b00410" stroke-width="2"/>
  <text x="312" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">⚙ IIP</text>
  <text x="312" y="42" text-anchor="middle" font-size="8"  fill="#ffcccc">sole Git writer</text>
  <rect x="372" y="10" width="120" height="46" rx="5" fill="#323232" stroke="#1a1a1a" stroke-width="2"/>
  <text x="432" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">📁 Git</text>
  <text x="432" y="42" text-anchor="middle" font-size="8"  fill="#ccc">Claim YAML</text>
  <rect x="485" y="10" width="114" height="46" rx="5" fill="#8b5cf6" stroke="#7c3aed" stroke-width="2"/>
  <text x="542" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">🔄 Argo CD</text>
  <text x="542" y="42" text-anchor="middle" font-size="8"  fill="#e8d5ff">GitOps engine</text>
  <rect x="602" y="10" width="140" height="46" rx="5" fill="#D40511" stroke="#b00410" stroke-width="2"/>
  <text x="672" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="white">⚙ Crossplane</text>
  <text x="672" y="42" text-anchor="middle" font-size="8"  fill="#ffcccc">Control Plane</text>
  <rect x="752" y="10" width="120" height="46" rx="5" fill="#fff0e0" stroke="#e07c00" stroke-width="2"/>
  <text x="812" y="27" text-anchor="middle" font-size="10" font-weight="700" fill="#e07c00">Provider</text>
  <text x="812" y="42" text-anchor="middle" font-size="8"  fill="#888">+ ProviderConfig</text>
  <line x1="62"  y1="56" x2="62"  y2="740" stroke="#323232" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="182" y1="56" x2="182" y2="740" stroke="#5b9bd5" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="312" y1="56" x2="312" y2="740" stroke="#D40511" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="432" y1="56" x2="432" y2="740" stroke="#888"    stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="542" y1="56" x2="542" y2="740" stroke="#8b5cf6" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="672" y1="56" x2="672" y2="740" stroke="#D40511" stroke-width="1" stroke-dasharray="4,4"/>
  <line x1="812" y1="56" x2="812" y2="740" stroke="#e07c00" stroke-width="1" stroke-dasharray="4,4"/>
  <rect x="175" y="100" width="14" height="490" fill="#5b9bd5" opacity="0.2" rx="2"/>
  <rect x="305" y="130" width="14" height="140" fill="#D40511" opacity="0.25" rx="2"/>
  <rect x="665" y="300" width="14" height="220" fill="#D40511" opacity="0.25" rx="2"/>
  <rect x="805" y="380" width="14" height="140" fill="#e07c00" opacity="0.25" rx="2"/>
  <line x1="62" y1="100" x2="175" y2="100" stroke="#323232" stroke-width="1.8" marker-end="url(#sf-fs)"/>
  <text x="118" y="93" text-anchor="middle" font-size="10" fill="#323232" font-weight="600">1. Submit Claim via IPP UI</text>
  <line x1="189" y1="132" x2="304" y2="132" stroke="#323232" stroke-width="1.8" marker-end="url(#sf-fs)"/>
  <text x="246" y="126" text-anchor="middle" font-size="10" fill="#323232">2. Trigger (Claim YAML)</text>
  <path d="M312,158 Q345,158 345,171 Q345,184 319,184" stroke="#D40511" stroke-width="1.5" fill="none" marker-end="url(#sf-fsr)"/>
  <text x="350" y="164" font-size="9.5" fill="#D40511" font-weight="600">3. Validate + generate Claim YAML</text>
  <text x="350" y="178" font-size="9"   fill="#888">Check quota, policy, namespace</text>
  <line x1="319" y1="212" x2="425" y2="212" stroke="#D40511" stroke-width="2.5" marker-end="url(#sf-fsr)"/>
  <rect x="324" y="198" width="100" height="18" rx="3" fill="#fff0e0"/>
  <text x="372" y="210" text-anchor="middle" font-size="9.5" fill="#D40511" font-weight="700">4. git push Claim YAML</text>
  <text x="372" y="226" text-anchor="middle" font-size="8.5" fill="#888">(IIP = sole Git writer)</text>
  <line x1="432" y1="254" x2="535" y2="254" stroke="#8b5cf6" stroke-width="1.8" marker-end="url(#sf-fsp)"/>
  <text x="484" y="248" text-anchor="middle" font-size="10" fill="#8b5cf6" font-weight="600">5. detect push (watch)</text>
  <line x1="549" y1="285" x2="664" y2="285" stroke="#8b5cf6" stroke-width="1.8" marker-end="url(#sf-fsp)"/>
  <text x="606" y="279" text-anchor="middle" font-size="10" fill="#8b5cf6" font-weight="600">6. apply Claim manifest</text>
  <path d="M672,310 Q715,310 715,325 Q715,340 679,340" stroke="#D40511" stroke-width="1.5" fill="none" marker-end="url(#sf-fsr)"/>
  <text x="720" y="315" font-size="9.5" fill="#D40511" font-weight="600">7. XRD validates Claim</text>
  <text x="720" y="329" font-size="9"   fill="#888">Composition renders XR</text>
  <text x="720" y="342" font-size="9"   fill="#888">XR owns all MRs</text>
  <line x1="679" y1="368" x2="804" y2="368" stroke="#e07c00" stroke-width="1.8" marker-end="url(#sf-fso)"/>
  <text x="742" y="361" text-anchor="middle" font-size="10" fill="#e07c00" font-weight="600">8. create Managed Resources</text>
  <path d="M812,392 Q856,392 856,408 Q856,424 819,424" stroke="#e07c00" stroke-width="1.5" fill="none" marker-end="url(#sf-fso)"/>
  <text x="860" y="398" font-size="9.5" fill="#e07c00" font-weight="600">9. Provision MRs</text>
  <text x="860" y="412" font-size="9"   fill="#888">ComputeInstance</text>
  <text x="860" y="425" font-size="9"   fill="#888">StorageVolume</text>
  <text x="860" y="438" font-size="9"   fill="#888">VolumeAttachment</text>
  <line x1="804" y1="462" x2="686" y2="462" stroke="#e07c00" stroke-width="1.8" stroke-dasharray="4,3" marker-end="url(#sf-fsod)"/>
  <text x="746" y="456" text-anchor="middle" font-size="10" fill="#e07c00">10. READY · update XR status</text>
  <text x="746" y="470" text-anchor="middle" font-size="8.5" fill="#888">IP · hostname · IDs · readiness · conn. details</text>
  <line x1="665" y1="500" x2="196" y2="500" stroke="#1a7a2e" stroke-width="2" stroke-dasharray="4,3" marker-end="url(#sf-fsg)"/>
  <text x="430" y="494" text-anchor="middle" font-size="10" fill="#1a7a2e" font-weight="700">11. status via Kubernetes API (direct — no callback loop)</text>
  <line x1="175" y1="535" x2="76" y2="535" stroke="#323232" stroke-width="1.8" stroke-dasharray="4,3" marker-end="url(#sf-fsd)"/>
  <text x="120" y="528" text-anchor="middle" font-size="10" fill="#323232">12. Infra READY: IP, hostname, IDs</text>
  <path d="M62,560 Q30,560 30,573 Q30,586 48,586" stroke="#323232" stroke-width="1.5" fill="none" marker-end="url(#sf-fs)"/>
  <text x="10" y="566" font-size="9" fill="#888">13. → app git config</text>
  <rect x="14" y="600" width="950" height="48" rx="4" fill="#e8f8ee" stroke="#1a7a2e" stroke-width="1.5"/>
  <text x="490" y="620" text-anchor="middle" font-size="11" fill="#1a7a2e" font-weight="700">✅  End-to-end: ~10 minutes · One control plane · Direct status · No callback loop</text>
  <text x="490" y="638" text-anchor="middle" font-size="9.5" fill="#555">IIP = sole Git writer (preserved) · Argo CD replaces GitHub Actions · Crossplane reconciles all MRs autonomously</text>
  <rect x="14" y="658" width="950" height="36" rx="4" fill="#fff0e0" stroke="#D40511" stroke-width="1.5"/>
  <text x="490" y="671" text-anchor="middle" font-size="9.5" fill="#D40511" font-weight="700">Key difference vs. current:</text>
  <text x="490" y="685" text-anchor="middle" font-size="9.5" fill="#555">IIP writes a Claim YAML (step 4) instead of tool-specific configs · Argo CD + Crossplane replace GitHub Actions + 3-tool fan-out</text>
  <defs>
    <marker id="sf-fs"   markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#323232"/></marker>
    <marker id="sf-fsd"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#323232"/></marker>
    <marker id="sf-fsr"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#D40511"/></marker>
    <marker id="sf-fsp"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#8b5cf6"/></marker>
    <marker id="sf-fso"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e07c00"/></marker>
    <marker id="sf-fsod" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#e07c00"/></marker>
    <marker id="sf-fsg"  markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#1a7a2e"/></marker>
  </defs>
</svg>`;

// ─── Static data ─────────────────────────────────────────────────────────────

const CURRENT_LEGEND = [
  {
    title: 'Terminology',
    items: [
      { color: '#5b9bd5', label: 'IPP — Infrastructure Platform Portal', detail: 'Backstage instance; developer self-service UI. Receives requests, displays status.' },
      { color: '#D40511', label: 'IIP — Infrastructure Interface Platform', detail: 'Sole Git writer. Validates requests, writes config to Git, aggregates callbacks.' },
    ],
  },
  {
    title: 'Key Pain Points',
    items: [
      { color: '#D40511', label: 'IIP bottleneck', detail: 'Single point of failure and delay; all requests serialised through IIP.' },
      { color: '#8b5cf6', label: 'Three-tool sprawl', detail: 'VRA, Terraform, Cloudify each with separate state, APIs, runbooks.' },
      { color: '#e07c00', label: 'Days-to-weeks wait', detail: 'Multiple hand-offs add unacceptable lead time.' },
      { color: '#5b9bd5', label: 'No unified status', detail: 'Developer must poll IIP; no live portal visibility.' },
    ],
  },
  {
    title: 'Flow Steps',
    items: [
      { detail: '1. Developer submits request in IPP (Backstage)' },
      { detail: '2. IIP validates and writes config to Git (sole Git writer)' },
      { detail: '3. GitHub Actions triggers on push, fans out to tools' },
      { detail: '4. VRA / Terraform / Cloudify provisions independently' },
      { detail: '5. Tools callback status to IIP' },
      { detail: '6. IIP pushes details to IPP; developer receives IP, hostname, creds' },
    ],
  },
];

const FUTURE_LEGEND = [
  {
    title: 'What changes vs. Current?',
    items: [
      { color: '#D40511', label: 'IIP still sole Git writer', detail: 'Same role — but now writes a Crossplane Claim YAML instead of VRA / Terraform / Cloudify configs.' },
      { color: '#8b5cf6', label: 'Argo CD replaces GitHub Actions', detail: 'Watches Git, syncs Claim to Crossplane cluster — no fan-out dispatch to three tools.' },
      { color: '#1a7a2e', label: 'Direct status — no callback loop', detail: 'Crossplane writes status to XR; IPP reads via K8s API. No IIP aggregation step needed.' },
    ],
  },
  {
    title: 'Crossplane Concepts',
    items: [
      { color: '#D40511', label: 'XRD', detail: 'Developer-facing API, e.g. PrivateCloudVM.' },
      { color: '#D40511', label: 'Composition', detail: 'Recipe mapping XRD → Managed Resources.' },
      { color: '#D40511', label: 'Claim → XR', detail: 'Developer request; XR internally owns all MRs.' },
      { color: '#e07c00', label: 'Provider', detail: 'Private cloud controller package.' },
      { color: '#e07c00', label: 'ProviderConfig', detail: 'Endpoint + credentials + tenant/datacenter.' },
      { color: '#FFCC00', label: 'MRs', detail: 'ComputeInstance + StorageVolume + VolumeAttachment.' },
      { color: '#1a7a2e', label: 'Status', detail: 'IP, hostname, resource IDs, readiness, connection details.' },
    ],
  },
  {
    title: 'Key Improvements',
    items: [
      { detail: '✅ IIP role preserved — still sole Git writer' },
      { detail: '✅ One control plane — no tool sprawl' },
      { detail: '✅ ~10-minute provisioning (vs. days/weeks)' },
      { detail: '✅ Direct status return — no callback loop' },
      { detail: '✅ GitOps-native — every change in Git' },
      { detail: '✅ Policy-as-Code — OPA/Kyverno governance' },
    ],
  },
];

const REF_LEGEND = [
  { color: '#FFCC00', label: 'Developer Layer', detail: 'IPP (Backstage) · IIP · Lab · CLI' },
  { color: '#8b5cf6', label: 'GitOps Layer',    detail: 'Git + Argo CD + ApplicationSets' },
  { color: '#D40511', label: 'Platform Control', detail: 'Crossplane + OPA/Kyverno + Cilium eBPF' },
  { color: '#5b9bd5', label: 'Target Infra',    detail: 'K8s CAPI + KubeVirt + AKS Azure' },
  { color: '#1a7a2e', label: 'Observability & Security', detail: 'Hubble + Grafana + AIOps + NIS2' },
];

const GLOSSARY = [
  { abbr: 'IPP', def: 'Infrastructure Platform Portal (Backstage · developer self-service UI)' },
  { abbr: 'IIP', def: 'Infrastructure Interface Platform (orchestration layer · sole Git writer)' },
  { abbr: 'XRD', def: 'developer-facing Crossplane API · XR = internal composite resource' },
  { abbr: 'MRs', def: 'ComputeInstance + StorageVolume + VolumeAttachment' },
];

const PRINCIPLES = [
  {
    num: '01',
    title: 'Everything is Declarative',
    detail: "No imperative scripts. Every resource — cloud, Kubernetes, policy — is declared in Git and reconciled continuously by the control plane. Inspired by Crossplane's API-first model.",
  },
  {
    num: '02',
    title: 'Zero-Trust by Default',
    detail: 'Workloads receive no implicit trust. Cilium enforces L3/L4/L7 policy at the eBPF layer. SPIRE issues short-lived X.509 SVIDs. No secrets in environment variables.',
  },
  {
    num: '03',
    title: 'GitOps as the Audit Trail',
    detail: 'Every change to infrastructure or workloads passes through a pull request. Argo CD events and Crossplane reconcile logs feed the central SIEM. Compliance evidence is generated automatically.',
  },
  {
    num: '04',
    title: 'Self-Healing by Design',
    detail: 'The platform continuously reconciles actual state toward desired state. Drift — whether from manual changes, cloud events, or failures — is automatically corrected without human intervention.',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export const ArchitecturePage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState(0);
  const [activeSubTab, setActiveSubTab] = useState(0);

  const TABS = [
    { label: 'Current Flow',          badge: 'BEFORE',            badgeGreen: false },
    { label: 'Future Flow',           badge: 'AFTER · Crossplane', badgeGreen: true  },
    { label: 'Reference Architecture', badge: null },
    { label: 'Sequence Diagrams',     badge: null },
  ];

  return (
    <AppleShell title="Architecture">
      <div>
        <style>{`
          /* ── tokens ── */
          .ad-page { width:100%; padding-bottom:48px; font-family:'Inter','Helvetica Neue',sans-serif; }

          /* ── hero ── */
          .ad-hero { background:${D.yellow}; border-bottom:4px solid ${D.red}; border-radius:12px; padding:48px 40px; margin-bottom:24px; }
          .ad-hero__eyebrow { color:${D.redDark}; font-size:11px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; margin-bottom:12px; }
          .ad-hero__title   { font-size:clamp(28px,4vw,48px); font-weight:700; color:${D.dark}; margin:0 0 16px; }
          .ad-hero__body    { font-size:16px; color:#444; max-width:640px; line-height:1.6; margin:0; }

          /* ── glossary ── */
          .ad-glossary { display:flex; gap:10px; flex-wrap:wrap; padding:14px 0 20px; border-bottom:1px solid ${D.border}; margin-bottom:0; }
          .ad-gpill    { background:${D.surface}; border:1px solid ${D.border}; border-radius:20px; padding:5px 14px; font-size:11px; color:${D.muted}; }
          .ad-gpill strong { color:${D.red}; }

          /* ── tab bar ── */
          .ad-tab-bar { display:flex; gap:2px; border-bottom:2px solid ${D.border}; margin-bottom:24px; overflow-x:auto; }
          .ad-tab {
            padding:12px 20px; font-size:13px; font-weight:600; color:${D.muted};
            border:none; background:transparent; cursor:pointer;
            border-bottom:3px solid transparent; margin-bottom:-2px;
            white-space:nowrap; transition:color .15s, border-color .15s;
            display:flex; align-items:center; gap:8px;
          }
          .ad-tab:hover { color:${D.dark}; }
          .ad-tab.active { color:${D.dark}; border-bottom-color:${D.red}; }
          .ad-tab-badge {
            font-size:10px; font-weight:700; padding:2px 7px; border-radius:3px;
            letter-spacing:.05em;
          }
          .ad-tab-badge--red   { background:${D.red}; color:#fff; }
          .ad-tab-badge--green { background:#1a7a2e; color:#fff; }

          /* ── panel ── */
          .ad-panel { display:none; }
          .ad-panel.active { display:block; }

          .ad-panel-title    { font-size:20px; font-weight:700; color:${D.dark}; margin-bottom:6px; }
          .ad-panel-subtitle { font-size:13px; color:${D.muted}; max-width:840px; line-height:1.6; margin-bottom:24px; }

          /* ── flow layout ── */
          .ad-flow { display:flex; gap:24px; align-items:flex-start; flex-wrap:wrap; }
          .ad-flow__svg { flex:1; min-width:300px; background:${D.surface}; border:1px solid ${D.border}; border-radius:8px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow-x:auto; }
          .ad-flow__legend { width:260px; flex-shrink:0; display:flex; flex-direction:column; gap:14px; }

          .ad-legend-card { background:${D.surface}; border:1px solid ${D.border}; border-radius:8px; padding:16px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
          .ad-legend-card h3 { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:${D.muted}; margin-bottom:10px; padding-bottom:7px; border-bottom:2px solid ${D.yellow}; }
          .ad-legend-item { display:flex; align-items:flex-start; gap:9px; margin-bottom:9px; font-size:11.5px; line-height:1.4; color:${D.text}; }
          .ad-legend-dot  { width:12px; height:12px; border-radius:2px; flex-shrink:0; margin-top:2px; }
          .ad-legend-item strong { display:block; font-weight:600; }

          /* ── ref arch ── */
          .ad-ref-wrap { background:${D.surface}; border:1px solid ${D.border}; border-radius:8px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow-x:auto; margin-bottom:16px; }
          .ad-ref-legend { display:flex; flex-wrap:wrap; gap:10px; }
          .ad-ref-pill   { display:flex; align-items:center; gap:8px; background:${D.surface}; border:1px solid ${D.border}; border-radius:6px; padding:7px 14px; font-size:11px; }
          .ad-ref-dot    { width:12px; height:12px; border-radius:2px; flex-shrink:0; }

          /* ── sub-tabs ── */
          .ad-sub-bar { display:flex; gap:8px; margin-bottom:20px; }
          .ad-sub-tab {
            padding:7px 18px; cursor:pointer; font-size:12px; font-weight:600;
            border-radius:4px; border:2px solid ${D.border}; color:${D.muted}; background:${D.surface};
            transition:all .15s;
          }
          .ad-sub-tab:hover { border-color:${D.dark}; color:${D.dark}; }
          .ad-sub-tab.active { background:${D.dark}; color:#fff; border-color:${D.dark}; }
          .ad-sub-panel { display:none; }
          .ad-sub-panel.active { display:block; }
          .ad-seq-wrap { background:${D.surface}; border:1px solid ${D.border}; border-radius:8px; padding:20px; box-shadow:0 2px 8px rgba(0,0,0,.06); overflow-x:auto; }

          /* ── section label ── */
          .ad-section-label {
            color:${D.red}; font-size:11px; font-weight:700; letter-spacing:.12em;
            text-transform:uppercase; margin-bottom:20px;
            display:flex; align-items:center; gap:8px;
          }
          .ad-section-label::after { content:''; flex:1; height:1px; background:rgba(212,5,17,.2); }

          /* ── principles ── */
          .ad-principles { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:32px; }
          @media (max-width:640px) { .ad-principles { grid-template-columns:1fr; } }
          .ad-principle { background:${D.surface}; border:1px solid ${D.border}; border-radius:8px; padding:24px; }
          .ad-principle__num    { font-size:32px; font-weight:900; color:${D.red}; opacity:.3; line-height:1; margin-bottom:8px; font-family:'JetBrains Mono',monospace; }
          .ad-principle__title  { font-size:15px; font-weight:700; color:${D.text}; margin:0 0 8px; }
          .ad-principle__detail { font-size:13px; color:${D.muted}; line-height:1.65; margin:0; }

          /* ── cta ── */
          .ad-cta { display:flex; gap:12px; flex-wrap:wrap; }
          .ad-btn-primary {
            background:${D.red}; color:#fff; font-weight:700; border:none; border-radius:6px;
            padding:12px 24px; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; gap:8px; transition:background .2s;
          }
          .ad-btn-primary:hover { background:${D.redDark}; }
          .ad-btn-secondary {
            background:transparent; color:${D.dark}; font-weight:700; border:1px solid ${D.dark};
            border-radius:6px; padding:12px 24px; cursor:pointer; font-size:14px; display:inline-flex; align-items:center; gap:8px; transition:background .2s;
          }
          .ad-btn-secondary:hover { background:rgba(26,26,26,.08); }
        `}</style>

        <div className="ad-page">

          {/* ── Hero ── */}
          <div className="ad-hero">
            <div className="ad-hero__eyebrow">DHL · IPP Architecture Diagrams</div>
            <h1 className="ad-hero__title">Architecture</h1>
            <p className="ad-hero__body">
              Four views: the current provisioning flow (before Crossplane), the future GitOps-native flow, a full reference architecture, and UML sequence diagrams for both flows.
            </p>
          </div>

          {/* ── Glossary ── */}
          <div className="ad-glossary">
            {GLOSSARY.map(g => (
              <div key={g.abbr} className="ad-gpill">
                <strong>{g.abbr}</strong> = {g.def}
              </div>
            ))}
          </div>

          {/* ── Tab bar ── */}
          <div className="ad-tab-bar" style={{ marginTop: 20 }}>
            {TABS.map((t, i) => (
              <button
                key={t.label}
                type="button"
                className={`ad-tab${activeTab === i ? ' active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {t.label}
                {t.badge && (
                  <span className={`ad-tab-badge ${t.badgeGreen ? 'ad-tab-badge--green' : 'ad-tab-badge--red'}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ══ Tab 0 — Current Flow ══ */}
          <div className={`ad-panel${activeTab === 0 ? ' active' : ''}`}>
            <div className="ad-panel-title">
              Current Infrastructure Provisioning Flow&nbsp;
              <span className="ad-tab-badge ad-tab-badge--red" style={{ fontSize: 12, verticalAlign: 'middle' }}>BEFORE</span>
            </div>
            <p className="ad-panel-subtitle">
              Developer request mediated by IIP as sole Git writer — three separate orchestration tools, no unified control plane, days-to-weeks provisioning.
            </p>
            <div className="ad-flow">
              <div className="ad-flow__svg">
                <div dangerouslySetInnerHTML={{ __html: CURRENT_FLOW_SVG }} />
              </div>
              <div className="ad-flow__legend">
                {CURRENT_LEGEND.map(card => (
                  <div key={card.title} className="ad-legend-card">
                    <h3>{card.title}</h3>
                    {card.items.map((item, idx) => (
                      <div key={idx} className="ad-legend-item">
                        {item.color && <div className="ad-legend-dot" style={{ background: item.color }} />}
                        <span>
                          {item.label && <strong>{item.label}</strong>}
                          {item.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ Tab 1 — Future Flow ══ */}
          <div className={`ad-panel${activeTab === 1 ? ' active' : ''}`}>
            <div className="ad-panel-title">
              Future Infrastructure Provisioning Flow&nbsp;
              <span className="ad-tab-badge ad-tab-badge--green" style={{ fontSize: 12, verticalAlign: 'middle' }}>AFTER · Crossplane</span>
            </div>
            <p className="ad-panel-subtitle">
              IIP remains sole Git writer — but now commits a Crossplane Claim YAML instead of three-tool configs. Argo CD syncs it, Crossplane reconciles, status returns directly to IPP. ~10-minute provisioning.
            </p>
            <div className="ad-flow">
              <div className="ad-flow__svg">
                <div dangerouslySetInnerHTML={{ __html: FUTURE_FLOW_SVG }} />
              </div>
              <div className="ad-flow__legend">
                {FUTURE_LEGEND.map(card => (
                  <div key={card.title} className="ad-legend-card">
                    <h3>{card.title}</h3>
                    {card.items.map((item, idx) => (
                      <div key={idx} className="ad-legend-item">
                        {item.color && <div className="ad-legend-dot" style={{ background: item.color }} />}
                        <span>
                          {item.label && <strong>{item.label}</strong>}
                          {item.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ══ Tab 2 — Reference Architecture ══ */}
          <div className={`ad-panel${activeTab === 2 ? ' active' : ''}`}>
            <div className="ad-panel-title">Overall Reference Architecture</div>
            <p className="ad-panel-subtitle">
              Five layered horizontal bands — from developer tooling (IPP / IIP) through GitOps, platform control, target infrastructure, and observability &amp; security.
            </p>
            <div className="ad-ref-wrap">
              <div dangerouslySetInnerHTML={{ __html: REFERENCE_ARCH_SVG }} />
            </div>
            <div className="ad-ref-legend">
              {REF_LEGEND.map(l => (
                <div key={l.label} className="ad-ref-pill">
                  <div className="ad-ref-dot" style={{ background: l.color }} />
                  <span><strong>{l.label}</strong> — {l.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ══ Tab 3 — Sequence Diagrams ══ */}
          <div className={`ad-panel${activeTab === 3 ? ' active' : ''}`}>
            <div className="ad-panel-title">Sequence Diagrams</div>
            <p className="ad-panel-subtitle">
              UML-style message sequence for current and future flows — technically validated step-by-step interaction between all systems.
            </p>

            <div className="ad-sub-bar">
              {['Current Flow (BEFORE)', 'Future Flow (AFTER · Crossplane)'].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  className={`ad-sub-tab${activeSubTab === i ? ' active' : ''}`}
                  onClick={() => setActiveSubTab(i as 0 | 1)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className={`ad-sub-panel${activeSubTab === 0 ? ' active' : ''}`}>
              <div className="ad-seq-wrap">
                <div dangerouslySetInnerHTML={{ __html: SEQ_CURRENT_SVG }} />
              </div>
            </div>
            <div className={`ad-sub-panel${activeSubTab === 1 ? ' active' : ''}`}>
              <div className="ad-seq-wrap">
                <div dangerouslySetInnerHTML={{ __html: SEQ_FUTURE_SVG }} />
              </div>
            </div>
          </div>

          {/* ── Spacer between tabs and principles ── */}
          <div style={{ height: 40 }} />

          {/* ── Architecture Principles ── */}
          <div className="ad-section-label">Architecture Principles</div>
          <div className="ad-principles">
            {PRINCIPLES.map(p => (
              <div key={p.num} className="ad-principle">
                <div className="ad-principle__num">{p.num}</div>
                <h3 className="ad-principle__title">{p.title}</h3>
                <p className="ad-principle__detail">{p.detail}</p>
              </div>
            ))}
          </div>

          {/* ── CTA ── */}
          <div className="ad-cta">
            <button type="button" className="ad-btn-primary" onClick={() => navigate('/try-out')}>
              Try It Out <ArrowRight size={13} strokeWidth={2} />
            </button>
            <button type="button" className="ad-btn-secondary" onClick={() => navigate('/how-it-works')}>
              How It Works <ArrowRight size={13} strokeWidth={2} />
            </button>
          </div>

        </div>
      </div>
    </AppleShell>
  );
};
