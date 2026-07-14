import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Code2,
  Eye,
  GitBranch,
  Layers,
  Network,
  Search,
  Server,
  Shield,
  User,
  Zap,
} from 'lucide-react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { tokens } from '../../design-system/tokens';

const EXECUTIVE_VALUES = [
  {
    title: 'Provision Faster',
    description:
      'Developers request compliant environments through golden paths instead of waiting across multiple infrastructure tickets and team handoffs.',
    icon: <Zap size={18} strokeWidth={1.8} />,
    accent: 'var(--landing-red)',
    accentBg: 'var(--landing-red-soft)',
  },
  {
    title: 'Govern by Design',
    description:
      'Security, policy, and compliance checks are embedded before resources are created, so control becomes part of delivery rather than a late-stage review.',
    icon: <Shield size={18} strokeWidth={1.8} />,
    accent: 'var(--landing-gold-strong)',
    accentBg: 'var(--landing-gold-soft)',
  },
  {
    title: 'Operate with Visibility',
    description:
      'Operations teams can see workload health, network behavior, incident signals, and cost context through one connected operating model.',
    icon: <Eye size={18} strokeWidth={1.8} />,
    accent: 'var(--landing-blue)',
    accentBg: 'var(--landing-blue-soft)',
  },
  {
    title: 'Scale Without Complexity',
    description:
      'Platform teams expose reusable paths while the platform absorbs the orchestration, policy wiring, and runtime complexity behind the scenes.',
    icon: <Layers size={18} strokeWidth={1.8} />,
    accent: 'var(--landing-green)',
    accentBg: 'var(--landing-green-soft)',
  },
] as const;

const PERSONAS = [
  {
    label: 'Developer',
    shortLabel: 'DEV',
    wants: 'A compliant application environment quickly.',
    gets: 'Template-driven self-service through Backstage with reusable golden paths.',
    hidden: 'Cluster provisioning, GitOps wiring, policies, network controls, and deployment plumbing.',
  },
  {
    label: 'Platform Engineer',
    shortLabel: 'PLT',
    wants: 'Standardized, reusable platform patterns.',
    gets: 'Backstage templates, Crossplane blueprints, and GitOps-controlled delivery.',
    hidden: 'Manual coordination, one-off builds, and repeated environment assembly.',
  },
  {
    label: 'Security / Compliance',
    shortLabel: 'SEC',
    wants: 'Controls applied consistently and audibly.',
    gets: 'OPA/Kyverno guardrails, Cilium policy, workload identity, and traceable enforcement.',
    hidden: 'Manual reviews, inconsistent enforcement, and policy drift.',
  },
  {
    label: 'Operations / SRE',
    shortLabel: 'OPS',
    wants: 'Fast diagnosis and stable operations.',
    gets: 'Prometheus, Grafana, Hubble, and AIOps signals connected to the same platform workflow.',
    hidden: 'Log hunting across disconnected tools and delayed incident context.',
  },
  {
    label: 'FinOps / Service Owner',
    shortLabel: 'FIN',
    wants: 'Cost visibility before and after deployment.',
    gets: 'OpenCost showback, ownership metadata, and forecast-aware provisioning choices.',
    hidden: 'Manual cost mapping after resources already exist.',
  },
  {
    label: 'Technology Leader',
    shortLabel: 'LDR',
    wants: 'Speed with control across modernization programs.',
    gets: 'A scalable operating model for governed self-service private cloud and hybrid delivery.',
    hidden: 'Silo-by-silo friction, opaque delivery delays, and fragmented accountability.',
  },
] as const;

const ARCHITECTURE_LAYERS = [
  {
    title: 'Personas and Entry Point',
    subtitle: 'One front door for the people who consume, govern, and operate the platform.',
    items: ['Developers', 'Platform Engineers', 'Operations', 'Security', 'FinOps', 'Leaders'],
  },
  {
    title: 'IPP — Infrastructure Platform Portal Experience',
    subtitle: 'Backstage provides the self-service experience, service context, and reusable paths.',
    items: ['Backstage', 'Software Catalog', 'Templates / Scaffolder', 'TechDocs', 'Persona views'],
  },
  {
    title: 'Platform Orchestration and Control',
    subtitle: 'Intent is converted into version-controlled, policy-aware platform actions.',
    items: ['Crossplane Compositions', 'GitOps Repository', 'Argo CD', 'Policy-as-Code', 'CI/CD integration'],
  },
  {
    title: 'Runtime and Infrastructure',
    subtitle: 'Standardized targets support applications, virtual machines, event-driven services, and hybrid footprints.',
    items: ['Kubernetes / OpenShift', 'KubeVirt', 'Knative', 'Private Cloud', 'Hybrid Cloud targets'],
  },
  {
    title: 'Security, Network, Observability, and Cost',
    subtitle: 'Guardrails and signals stay attached to the platform rather than bolted on afterward.',
    items: ['Cilium', 'Hubble', 'OPA / Kyverno', 'Prometheus', 'Grafana', 'OpenCost', 'AIOps insights'],
  },
  {
    title: 'Business and Engineering Outcomes',
    subtitle: 'The result is a simpler front-end experience backed by a more controlled operating model.',
    items: ['Faster provisioning', 'Standardized environments', 'Secure-by-design deployment', 'Observable workloads', 'Cost transparency', 'Reduced friction'],
  },
] as const;

const LAYER_FLOW_LABELS = [
  'Request',
  'Generate',
  'Commit',
  'Reconcile / Provision',
  'Secure / Observe / Optimize',
] as const;

const PLATFORM_FLOW = [
  {
    step: '01',
    title: 'Choose a golden path',
    description: 'A team starts with a reusable path that reflects the platform standard for the workload they need.',
    mapping: 'Backstage catalog and templates',
    icon: <Search size={18} strokeWidth={1.8} />,
  },
  {
    step: '02',
    title: 'Enter workload requirements',
    description: 'The user declares what the application or service needs instead of manually assembling infrastructure components.',
    mapping: 'Template inputs and service metadata',
    icon: <Code2 size={18} strokeWidth={1.8} />,
  },
  {
    step: '03',
    title: 'Generate GitOps intent',
    description: 'The platform turns inputs into version-controlled desired state so the request is auditable, reviewable, and repeatable.',
    mapping: 'Backstage Scaffolder → Git → Argo CD',
    icon: <GitBranch size={18} strokeWidth={1.8} />,
  },
  {
    step: '04',
    title: 'Apply guardrails',
    description: 'Security, policy, and compliance rules are evaluated before the platform carries the request into runtime.',
    mapping: 'OPA / Kyverno, Cilium policy, approval logic',
    icon: <Shield size={18} strokeWidth={1.8} />,
  },
  {
    step: '05',
    title: 'Provision and reconcile',
    description: 'Reusable infrastructure blueprints translate the request into a consistent environment across Kubernetes, OpenShift, KubeVirt, or Knative.',
    mapping: 'Crossplane, Kubernetes-native controllers, OpenShift',
    icon: <Server size={18} strokeWidth={1.8} />,
  },
  {
    step: '06',
    title: 'Operate with signals',
    description: 'Health, network, cost, and incident intelligence stay attached to the service throughout day-2 operations.',
    mapping: 'Prometheus, Grafana, Hubble, OpenCost, AIOps',
    icon: <Bot size={18} strokeWidth={1.8} />,
  },
] as const;

const VALUE_PILLARS = [
  {
    title: 'Speed',
    description: 'Reduce waiting time by shifting common infrastructure requests into governed self-service.',
  },
  {
    title: 'Control',
    description: 'Embed policy, security, and standard architecture patterns into reusable templates and blueprints.',
  },
  {
    title: 'Reliability',
    description: 'Use GitOps reconciliation, observability, and standardized deployment paths to reduce drift and variance.',
  },
  {
    title: 'Transparency',
    description: 'Expose status, cost, ownership, health, and operational signals across the platform lifecycle.',
  },
] as const;

const DEMO_CARDS = [
  {
    title: 'Start Developer Journey',
    description: 'Show how a team enters through a simple self-service experience instead of opening tickets.',
    route: '/developer',
    icon: <Code2 size={18} strokeWidth={1.8} />,
    category: 'Persona journey',
  },
  {
    title: 'View Platform Engineering Console',
    description: 'Open the control plane view for reusable blueprints, GitOps coordination, and operational standards.',
    route: '/platform',
    icon: <Layers size={18} strokeWidth={1.8} />,
    category: 'Persona journey',
  },
  {
    title: 'Explore GitOps Flow',
    description: 'Follow how desired state moves from Git into reconciliation and deployment visibility.',
    route: '/gitops',
    icon: <GitBranch size={18} strokeWidth={1.8} />,
    category: 'Control plane',
  },
  {
    title: 'View Crossplane Provisioning',
    description: 'Show how one request becomes a governed, repeatable environment blueprint behind the portal.',
    route: '/crossplane',
    icon: <Server size={18} strokeWidth={1.8} />,
    category: 'Control plane',
  },
  {
    title: 'Explore Knative Workloads',
    description: 'Demonstrate event-driven and scale-to-zero workloads as part of the same platform operating model.',
    route: '/knative',
    icon: <Zap size={18} strokeWidth={1.8} />,
    category: 'Runtime',
  },
  {
    title: 'View Private Cloud Fulfillment',
    description: 'Show how requests are fulfilled, tracked, and governed for the private cloud service provider experience.',
    route: '/provider',
    icon: <Network size={18} strokeWidth={1.8} />,
    category: 'Runtime',
  },
  {
    title: 'View Security and Network Posture',
    description: 'Open the zero-trust view covering policy, workload identity, Cilium controls, and Hubble visibility.',
    route: '/security-posture',
    icon: <Shield size={18} strokeWidth={1.8} />,
    category: 'Governance',
  },
  {
    title: 'Open Observability Dashboard',
    description: 'Move into the runtime operations view with incidents, workload health, and connected telemetry.',
    route: '/operations',
    icon: <Activity size={18} strokeWidth={1.8} />,
    category: 'Operations',
  },
  {
    title: 'View Cost and FinOps',
    description: 'Show ownership, showback, optimization signals, and forecast-aware platform economics.',
    route: '/finops-charge-visibility',
    icon: <BarChart3 size={18} strokeWidth={1.8} />,
    category: 'Operations',
  },
  {
    title: 'Explore AIOps Assistant',
    description: 'Enter the agent-assisted operating model built on top of platform telemetry and policy context.',
    route: '/agent-command-center',
    icon: <Bot size={18} strokeWidth={1.8} />,
    category: 'Operations',
  },
] as const;

const STORY_CHIPS = [
  'One portal front door',
  'Golden paths, not ticket chains',
  'Git as the source of truth',
  'Policy before provision',
  'Agent-assisted operations',
] as const;

const surfaceCardStyle = {
  background: 'var(--landing-surface)',
  border: '1px solid var(--landing-hairline)',
  borderRadius: '24px',
  boxShadow: 'var(--landing-shadow)',
} as const;

export const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const palette = theme.palette;
  const nav = (palette as any).navigation;
  const isDark = (palette as any).mode === 'dark' || (palette as any).type === 'dark';

  const rootVars = {
    '--landing-bg': palette.background.default,
    '--landing-surface': palette.background.paper,
    '--landing-surface-alt': nav?.navItem?.hoverBackground ?? (isDark ? '#2c2c2e' : '#f5f5f7'),
    '--landing-text': palette.text.primary,
    '--landing-subtext': palette.text.secondary,
    '--landing-hairline': palette.divider,
    '--landing-shadow': tokens.shadow.resting,
    '--landing-shadow-hover': tokens.shadow.hover,
    '--landing-red': '#d40511',
    '--landing-red-soft': isDark ? 'rgba(212, 5, 17, 0.16)' : 'rgba(212, 5, 17, 0.08)',
    '--landing-gold': '#ffcc00',
    '--landing-gold-soft': isDark ? 'rgba(255, 204, 0, 0.14)' : 'rgba(255, 204, 0, 0.14)',
    '--landing-gold-strong': isDark ? '#ffd84d' : '#8a5a00',
    '--landing-blue': isDark ? '#FFCC00' : '#D40511',
    '--landing-blue-soft': isDark ? 'rgba(255, 204, 0, 0.14)' : 'rgba(212, 5, 17, 0.08)',
    '--landing-green': '#34c759',
    '--landing-green-soft': isDark ? 'rgba(52, 199, 89, 0.18)' : 'rgba(52, 199, 89, 0.08)',
  } as React.CSSProperties;

  return (
    <AppleShell title="Self-Service Private Cloud">
      <div style={rootVars}>
        <style>{`
          .landing-page {
            display: flex;
            flex-direction: column;
            gap: 28px;
            width: 100%;
            color: var(--landing-text);
          }

          .landing-section {
            background: var(--landing-surface);
            border: 1px solid var(--landing-hairline);
            border-radius: 28px;
            box-shadow: var(--landing-shadow);
            padding: 32px;
          }

          .landing-hero {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.95fr);
            gap: 24px;
            align-items: stretch;
            margin-bottom: 24px;
          }

          .landing-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 8px 14px;
            border-radius: 999px;
            background: var(--landing-gold-soft);
            border: 1px solid rgba(255, 204, 0, 0.36);
            color: var(--landing-gold-strong);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            margin-bottom: 16px;
          }

          .landing-headline {
            margin: 0;
            font-size: clamp(38px, 5vw, 58px);
            line-height: 1.02;
            letter-spacing: -0.04em;
            font-weight: 700;
            max-width: 760px;
          }

          .landing-subheadline {
            margin: 18px 0 0;
            font-size: 18px;
            line-height: 1.65;
            color: var(--landing-subtext);
            max-width: 740px;
          }

          .landing-chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }

          .landing-story-chip {
            display: inline-flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 999px;
            background: var(--landing-surface-alt);
            border: 1px solid var(--landing-hairline);
            color: var(--landing-text);
            font-size: 12px;
            font-weight: 600;
          }

          .landing-button-row {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            margin-top: 28px;
          }

          .landing-primary-button,
          .landing-secondary-button,
          .landing-link-button {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            border-radius: 999px;
            font-size: 14px;
            font-weight: 600;
            padding: 12px 18px;
            transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
            text-decoration: none;
          }

          .landing-primary-button {
            background: var(--landing-red);
            color: #ffffff;
            border: 1px solid var(--landing-red);
            box-shadow: 0 10px 24px rgba(212, 5, 17, 0.18);
          }

          .landing-secondary-button {
            background: var(--landing-surface);
            color: var(--landing-text);
            border: 1px solid var(--landing-hairline);
          }

          .landing-link-button {
            background: transparent;
            color: var(--landing-text);
            border: none;
            padding-left: 0;
          }

          .landing-primary-button:hover,
          .landing-secondary-button:hover,
          .landing-link-button:hover,
          .landing-value-card:hover,
          .landing-persona-card:hover,
          .landing-step-card:hover,
          .landing-cta-card:hover {
            transform: translateY(-2px);
          }

          .landing-story-panel {
            display: flex;
            flex-direction: column;
            gap: 18px;
            background: linear-gradient(180deg, var(--landing-surface) 0%, var(--landing-surface-alt) 100%);
            border: 1px solid var(--landing-hairline);
            border-radius: 24px;
            padding: 24px;
          }

          .landing-story-panel h3,
          .landing-section-title {
            margin: 0;
            font-size: 28px;
            line-height: 1.15;
            letter-spacing: -0.03em;
          }

          .landing-section-copy {
            margin: 10px 0 0;
            font-size: 15px;
            line-height: 1.7;
            color: var(--landing-subtext);
            max-width: 860px;
          }

          .landing-story-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .landing-story-box {
            border-radius: 18px;
            padding: 18px;
            border: 1px solid var(--landing-hairline);
            background: var(--landing-surface);
          }

          .landing-story-box--before {
            border-left: 4px solid var(--landing-red);
          }

          .landing-story-box--after {
            border-left: 4px solid var(--landing-green);
          }

          .landing-story-box-title {
            margin: 0 0 10px;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .landing-story-list {
            margin: 0;
            padding-left: 18px;
            color: var(--landing-subtext);
            font-size: 14px;
            line-height: 1.6;
          }

          .landing-story-callout {
            border-radius: 18px;
            padding: 16px 18px;
            background: linear-gradient(90deg, var(--landing-red-soft) 0%, var(--landing-gold-soft) 100%);
            border: 1px solid rgba(212, 5, 17, 0.14);
            font-size: 14px;
            line-height: 1.7;
            color: var(--landing-text);
          }

          .landing-grid-4,
          .landing-grid-3,
          .landing-persona-grid,
          .landing-cta-grid {
            display: grid;
            gap: 16px;
          }

          .landing-grid-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .landing-grid-3 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .landing-persona-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .landing-cta-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .landing-value-card,
          .landing-persona-card,
          .landing-step-card,
          .landing-cta-card {
            border-radius: 22px;
            border: 1px solid var(--landing-hairline);
            background: var(--landing-surface);
            box-shadow: var(--landing-shadow);
            transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
          }

          .landing-value-card,
          .landing-persona-card,
          .landing-step-card {
            padding: 22px;
          }

          .landing-cta-card {
            padding: 20px 22px;
            cursor: pointer;
          }

          .landing-value-icon,
          .landing-step-icon,
          .landing-cta-icon,
          .landing-persona-badge {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            font-weight: 700;
            flex-shrink: 0;
          }

          .landing-value-title,
          .landing-persona-title,
          .landing-step-title,
          .landing-cta-title,
          .landing-layer-title {
            margin: 0;
            font-size: 18px;
            line-height: 1.3;
            letter-spacing: -0.02em;
          }

          .landing-value-copy,
          .landing-step-copy,
          .landing-cta-copy,
          .landing-layer-copy {
            margin: 10px 0 0;
            font-size: 14px;
            line-height: 1.7;
            color: var(--landing-subtext);
          }

          .landing-persona-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
          }

          .landing-persona-badge {
            margin-bottom: 0;
            background: var(--landing-surface-alt);
            border: 1px solid var(--landing-hairline);
            color: var(--landing-text);
            font-size: 12px;
            letter-spacing: 0.08em;
          }

          .landing-persona-detail {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--landing-hairline);
          }

          .landing-persona-detail-label {
            margin: 0 0 4px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: var(--landing-subtext);
          }

          .landing-persona-detail-copy {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: var(--landing-text);
          }

          .landing-section-header {
            margin-bottom: 20px;
          }

          .landing-section-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            color: var(--landing-red);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .landing-architecture-shell {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .landing-layer-grid {
            display: grid;
            grid-template-columns: 144px minmax(0, 1fr);
            gap: 18px;
            align-items: stretch;
          }

          .landing-layer-index {
            border-radius: 22px;
            padding: 18px;
            background: linear-gradient(180deg, var(--landing-surface-alt) 0%, var(--landing-surface) 100%);
            border: 1px solid var(--landing-hairline);
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 4px;
          }

          .landing-layer-index span:first-child {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--landing-subtext);
          }

          .landing-layer-index span:last-child {
            font-size: 30px;
            line-height: 1;
            letter-spacing: -0.04em;
            font-weight: 700;
          }

          .landing-layer-panel {
            border-radius: 22px;
            border: 1px solid var(--landing-hairline);
            background: var(--landing-surface);
            box-shadow: var(--landing-shadow);
            padding: 22px;
          }

          .landing-layer-chips {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 14px;
          }

          .landing-layer-chip {
            display: inline-flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 999px;
            background: var(--landing-surface-alt);
            border: 1px solid var(--landing-hairline);
            font-size: 12px;
            font-weight: 600;
            color: var(--landing-text);
          }

          .landing-flow-arrow {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            color: var(--landing-subtext);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .landing-flow-arrow::before,
          .landing-flow-arrow::after {
            content: '';
            height: 1px;
            flex: 1;
            background: var(--landing-hairline);
          }

          .landing-step-top,
          .landing-cta-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 16px;
          }

          .landing-step-number,
          .landing-cta-tag {
            display: inline-flex;
            align-items: center;
            padding: 6px 10px;
            border-radius: 999px;
            background: var(--landing-surface-alt);
            border: 1px solid var(--landing-hairline);
            color: var(--landing-subtext);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            white-space: nowrap;
          }

          .landing-step-map {
            margin-top: 14px;
            display: inline-flex;
            align-items: center;
            padding: 8px 12px;
            border-radius: 12px;
            background: var(--landing-surface-alt);
            border: 1px solid var(--landing-hairline);
            color: var(--landing-subtext);
            font-size: 12px;
            font-weight: 600;
          }

          .landing-value-panel {
            display: grid;
            grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
            gap: 20px;
            padding: 24px;
            border-radius: 24px;
            background: linear-gradient(135deg, var(--landing-red-soft) 0%, var(--landing-surface) 34%, var(--landing-gold-soft) 100%);
            border: 1px solid rgba(212, 5, 17, 0.12);
          }

          .landing-value-panel-copy {
            padding-right: 12px;
          }

          .landing-value-panel-note {
            margin-top: 18px;
            padding: 14px 16px;
            border-radius: 18px;
            background: var(--landing-surface);
            border: 1px solid var(--landing-hairline);
            font-size: 14px;
            line-height: 1.7;
            color: var(--landing-subtext);
          }

          .landing-pillar-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
          }

          .landing-pillar-card {
            border-radius: 20px;
            padding: 20px;
            background: var(--landing-surface);
            border: 1px solid var(--landing-hairline);
            box-shadow: var(--landing-shadow);
          }

          .landing-pillar-card h3 {
            margin: 0;
            font-size: 18px;
            line-height: 1.3;
            letter-spacing: -0.02em;
          }

          .landing-pillar-card p {
            margin: 10px 0 0;
            font-size: 14px;
            line-height: 1.7;
            color: var(--landing-subtext);
          }

          .landing-cta-card:hover {
            box-shadow: var(--landing-shadow-hover);
            border-color: rgba(212, 5, 17, 0.18);
          }

          .landing-cta-footer {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 16px;
            color: var(--landing-red);
            font-size: 13px;
            font-weight: 700;
          }

          .landing-muted-note {
            margin-top: 18px;
            font-size: 13px;
            line-height: 1.7;
            color: var(--landing-subtext);
          }

          @media (max-width: 1200px) {
            .landing-grid-4,
            .landing-persona-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 980px) {
            .landing-hero,
            .landing-value-panel,
            .landing-layer-grid,
            .landing-grid-3 {
              grid-template-columns: 1fr;
            }

            .landing-story-grid,
            .landing-pillar-grid,
            .landing-cta-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .landing-section {
              padding: 22px;
            }

            .landing-grid-4,
            .landing-persona-grid {
              grid-template-columns: 1fr;
            }

            .landing-layer-grid {
              gap: 12px;
            }

            .landing-headline {
              font-size: clamp(34px, 10vw, 44px);
            }
          }
        `}</style>

        <div className="landing-page">
          <section className="landing-section">
            <div className="landing-hero">
              <div>
                <div className="landing-kicker">
                  <CheckCircle2 size={14} strokeWidth={1.8} />
                  Infrastructure Platform Portal
                </div>

                <h1 className="landing-headline">
                  From Ticket-Based Infrastructure to Self-Service Private Cloud
                </h1>

                <p className="landing-subheadline">
                  A governed developer and operations experience that turns infrastructure requests,
                  security controls, deployment workflows, observability, and cost visibility into one
                  seamless platform journey.
                </p>

                <div className="landing-chip-row" style={{ marginTop: 20 }}>
                  {STORY_CHIPS.map(chip => (
                    <span key={chip} className="landing-story-chip">
                      {chip}
                    </span>
                  ))}
                </div>

                <div className="landing-button-row">
                  <a className="landing-primary-button" href="#demo-navigation">
                    Explore demo entry points
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </a>
                  <button
                    type="button"
                    className="landing-secondary-button"
                    onClick={() => navigate('/developer')}
                  >
                    Open developer journey
                  </button>
                  <button
                    type="button"
                    className="landing-link-button"
                    onClick={() => navigate('/platform')}
                  >
                    View platform story
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </button>
                </div>
              </div>

              <div className="landing-story-panel">
                <div>
                  <h3>Why this platform exists</h3>
                  <p className="landing-section-copy" style={{ marginTop: 10 }}>
                    This demo is not a tool tour. It shows an operating model shift from manual coordination
                    and ticket queues toward governed self-service, then onward to agent-assisted operations.
                  </p>
                </div>

                <div className="landing-story-grid">
                  <div className="landing-story-box landing-story-box--before">
                    <p className="landing-story-box-title" style={{ color: 'var(--landing-red)' }}>
                      Before
                    </p>
                    <ul className="landing-story-list">
                      <li>Infrastructure delivery depends on tickets and handoffs.</li>
                      <li>Security reviews arrive late and vary by team.</li>
                      <li>Observability and cost data are disconnected from provisioning.</li>
                      <li>Each team sees only part of the lifecycle.</li>
                    </ul>
                  </div>

                  <div className="landing-story-box landing-story-box--after">
                    <p className="landing-story-box-title" style={{ color: 'var(--landing-green)' }}>
                      After
                    </p>
                    <ul className="landing-story-list">
                      <li>Backstage becomes the front door for governed self-service.</li>
                      <li>Templates create standardized, policy-aware intent.</li>
                      <li>Git and Argo CD reconcile change into runtime consistently.</li>
                      <li>Operations, security, and cost signals stay attached to the workload.</li>
                    </ul>
                  </div>
                </div>

                <div className="landing-story-callout">
                  <strong>The shift:</strong> the user sees a simple request experience, while the platform
                  handles orchestration, policy, runtime, network controls, observability, cost insight, and
                  operational intelligence behind the scenes.
                </div>
              </div>
            </div>

            <div className="landing-grid-4">
              {EXECUTIVE_VALUES.map(card => (
                <div key={card.title} className="landing-value-card">
                  <div
                    className="landing-value-icon"
                    style={{ background: card.accentBg, color: card.accent }}
                  >
                    {card.icon}
                  </div>
                  <h3 className="landing-value-title">{card.title}</h3>
                  <p className="landing-value-copy">{card.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="landing-section">
            <div className="landing-section-header">
              <div className="landing-section-eyebrow">
                <User size={13} strokeWidth={1.8} />
                Persona Experience Strip
              </div>
              <h2 className="landing-section-title">How each persona experiences the platform</h2>
              <p className="landing-section-copy">
                The platform creates one common experience, but the value is expressed differently for each
                persona. Every team gets what it needs while the platform hides the backend complexity that
                used to sit in tickets, tribal knowledge, and one-off operational work.
              </p>
            </div>

            <div className="landing-persona-grid">
              {PERSONAS.map(persona => (
                <div key={persona.label} className="landing-persona-card">
                  <div className="landing-persona-row">
                    <div className="landing-persona-badge">{persona.shortLabel}</div>
                    <h3 className="landing-persona-title">{persona.label}</h3>
                  </div>

                  <div className="landing-persona-detail">
                    <p className="landing-persona-detail-label">Wants</p>
                    <p className="landing-persona-detail-copy">{persona.wants}</p>
                  </div>

                  <div className="landing-persona-detail">
                    <p className="landing-persona-detail-label">Gets</p>
                    <p className="landing-persona-detail-copy">{persona.gets}</p>
                  </div>

                  <div className="landing-persona-detail">
                    <p className="landing-persona-detail-label">Hidden complexity</p>
                    <p className="landing-persona-detail-copy">{persona.hidden}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="landing-section">
            <div className="landing-section-header">
              <div className="landing-section-eyebrow">
                <Layers size={13} strokeWidth={1.8} />
                Architecture View
              </div>
              <h2 className="landing-section-title">How the platform works behind the experience</h2>
              <p className="landing-section-copy">
                The architecture is intentionally layered so leaders can see the operating model, not just a
                technology inventory. Users interact with a simple portal. The platform then generates,
                reconciles, secures, observes, and optimizes the underlying runtime on their behalf.
              </p>
            </div>

            <div className="landing-architecture-shell">
              {ARCHITECTURE_LAYERS.map((layer, index) => (
                <React.Fragment key={layer.title}>
                  <div className="landing-layer-grid">
                    <div className="landing-layer-index">
                      <span>Layer</span>
                      <span>{index + 1}</span>
                    </div>
                    <div className="landing-layer-panel">
                      <h3 className="landing-layer-title">{layer.title}</h3>
                      <p className="landing-layer-copy">{layer.subtitle}</p>
                      <div className="landing-layer-chips">
                        {layer.items.map(item => (
                          <span key={item} className="landing-layer-chip">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {index < LAYER_FLOW_LABELS.length && (
                    <div className="landing-flow-arrow">{LAYER_FLOW_LABELS[index]}</div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </section>

          <section className="landing-section">
            <div className="landing-section-header">
              <div className="landing-section-eyebrow">
                <GitBranch size={13} strokeWidth={1.8} />
                Platform Flow
              </div>
              <h2 className="landing-section-title">How the platform turns intent into governed execution</h2>
              <p className="landing-section-copy">
                This is the story to walk through live: start with a request, show how the platform
                standardizes and governs it, and end with the runtime, cost, and operational signals that
                keep the service healthy after it has been provisioned.
              </p>
            </div>

            <div className="landing-grid-3">
              {PLATFORM_FLOW.map(step => (
                <div key={step.step} className="landing-step-card">
                  <div className="landing-step-top">
                    <div
                      className="landing-step-icon"
                      style={{ background: 'var(--landing-surface-alt)', color: 'var(--landing-red)' }}
                    >
                      {step.icon}
                    </div>
                    <span className="landing-step-number">Step {step.step}</span>
                  </div>

                  <h3 className="landing-step-title">{step.title}</h3>
                  <p className="landing-step-copy">{step.description}</p>
                  <div className="landing-step-map">{step.mapping}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="landing-section">
            <div className="landing-section-header">
              <div className="landing-section-eyebrow">
                <BarChart3 size={13} strokeWidth={1.8} />
                Value Proposition
              </div>
              <h2 className="landing-section-title">Why this matters beyond the demo itself</h2>
              <p className="landing-section-copy">
                The value is not that one more tool is available. The value is that the platform turns
                infrastructure and application delivery into a repeatable operating model that scales across
                teams while improving control, reliability, and transparency.
              </p>
            </div>

            <div className="landing-value-panel">
              <div className="landing-value-panel-copy">
                <h3 className="landing-section-title" style={{ fontSize: 30 }}>
                  From private cloud modernization to platform operating model change
                </h3>
                <p className="landing-section-copy" style={{ marginTop: 12 }}>
                  Backstage, Crossplane, Argo CD, Kubernetes, OpenShift, Knative, KubeVirt, Cilium,
                  Hubble, OPA/Kyverno, Prometheus, Grafana, OpenCost, and AIOps all matter here because
                  they work together as one platform narrative: the platform turns intent into governed
                  execution, then keeps the result visible and improvable.
                </p>
                <div className="landing-value-panel-note">
                  <strong>Leadership takeaway:</strong> this platform shortens delivery time while increasing
                  governance. It is a move away from ticket-driven infrastructure toward self-service with
                  guardrails, and eventually toward agent-assisted operations built on the same control plane.
                </div>
              </div>

              <div className="landing-pillar-grid">
                {VALUE_PILLARS.map(pillar => (
                  <div key={pillar.title} className="landing-pillar-card">
                    <h3>{pillar.title}</h3>
                    <p>{pillar.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="landing-section" id="demo-navigation" style={surfaceCardStyle}>
            <div className="landing-section-header">
              <div className="landing-section-eyebrow">
                <ArrowRight size={13} strokeWidth={1.8} />
                Demo Navigation
              </div>
              <h2 className="landing-section-title">Now enter the live demo</h2>
              <p className="landing-section-copy">
                Every card below routes to an existing demo experience in this environment. Use them as
                guided entry points after the opening story.
              </p>
            </div>

            <div className="landing-cta-grid">
              {DEMO_CARDS.map(card => (
                <button
                  key={card.title}
                  type="button"
                  className="landing-cta-card"
                  onClick={() => navigate(card.route)}
                  style={{ textAlign: 'left', appearance: 'none' }}
                >
                  <div className="landing-cta-top">
                    <div
                      className="landing-cta-icon"
                      style={{ background: 'var(--landing-surface-alt)', color: 'var(--landing-red)' }}
                    >
                      {card.icon}
                    </div>
                    <span className="landing-cta-tag">{card.category}</span>
                  </div>

                  <h3 className="landing-cta-title">{card.title}</h3>
                  <p className="landing-cta-copy">{card.description}</p>
                  <div className="landing-cta-footer">
                    Open route
                    <ArrowRight size={15} strokeWidth={1.8} />
                  </div>
                </button>
              ))}
            </div>

          </section>
        </div>
      </div>
    </AppleShell>
  );
};
