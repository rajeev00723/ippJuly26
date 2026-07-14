import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowDown, Layers, Server, GitBranch, Shield, Eye, Bot,
} from 'lucide-react';
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
  gradient:   'linear-gradient(90deg, #D40511 0%, #FFCC00 100%)',
  yellowDark: '#E6B800',
};

const LAYERS = [
  {
    title: 'Developer Experience Layer',
    tags: ['Backstage', 'Software Templates', 'Service Catalog'],
    icon: <Layers size={20} strokeWidth={1.6} />,
    iconColor: D.red,
    desc: 'Developers interact with golden-path templates. No Kubernetes, no YAML, no tickets. Backstage abstracts the platform beneath a clean self-service UI backed by DHL SSO.',
  },
  {
    title: 'Provisioning Layer',
    tags: ['Crossplane', 'Upbound', 'Compositions'],
    icon: <Server size={20} strokeWidth={1.6} />,
    iconColor: D.yellow,
    desc: "Crossplane Compositions translate a developer's intent into real infrastructure. Claims map to composite resources. Upbound providers provision cloud or Kubernetes objects continuously until desired state is achieved.",
  },
  {
    title: 'Delivery Layer',
    tags: ['Argo CD', 'GitOps', 'Kustomize'],
    icon: <GitBranch size={20} strokeWidth={1.6} />,
    iconColor: D.yellow,
    desc: 'Argo CD watches Git as the single source of truth. Every manifest change is reconciled against the live cluster. Drift is detected and auto-corrected within seconds.',
  },
  {
    title: 'Security Layer',
    tags: ['OPA / Kyverno', 'Cilium', 'SPIRE'],
    icon: <Shield size={20} strokeWidth={1.6} />,
    iconColor: D.red,
    desc: 'Admission policies enforce guardrails at creation time. Cilium implements zero-trust eBPF network policy between all workloads. SPIRE issues cryptographic workload identity via SVID certificates, eliminating shared secrets.',
  },
  {
    title: 'Observability Layer',
    tags: ['Grafana', 'Prometheus', 'Hubble'],
    icon: <Eye size={20} strokeWidth={1.6} />,
    iconColor: D.red,
    desc: 'Prometheus scrapes cluster and workload metrics. Grafana surfaces dashboards per workload, team, and cost centre. Hubble provides real-time eBPF network-flow visibility.',
  },
  {
    title: 'Intelligence Layer',
    tags: ['AIOps Agent', 'OpenCost', 'Claude API'],
    icon: <Bot size={20} strokeWidth={1.6} />,
    iconColor: D.yellow,
    desc: 'An LLM-backed AIOps agent correlates Prometheus anomalies, Argo CD events, and Hubble flows. OpenCost assigns spend to teams and workloads. The agent surfaces actionable recommendations and can autonomously remediate known failure patterns.',
  },
];

export const HowItWorksPage = () => {
  const navigate = useNavigate();

  return (
    <AppleShell title="How It Works">
      <div>
        <style>{`
          .hiw2-page {
            width: 100%;
            padding-bottom: 48px;
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
          }

          /* Hero */
          .hiw2-hero {
            background: ${D.yellow};
            border-bottom: 4px solid ${D.red};
            border-radius: 12px;
            padding: 48px 40px;
            margin-bottom: 32px;
          }
          .hiw2-hero__subtitle {
            color: ${D.redDark};
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .hiw2-hero__title {
            font-size: clamp(28px, 4vw, 48px);
            font-weight: 700;
            color: ${D.dark};
            margin: 0 0 16px;
          }
          .hiw2-hero__body {
            font-size: 16px;
            color: #444;
            max-width: 640px;
            line-height: 1.6;
            margin: 0;
          }

          /* Section label */
          .hiw2-section-label {
            color: ${D.red};
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .hiw2-section-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(212,5,17,0.2);
          }

          /* Layer cards */
          .hiw2-layers {
            display: flex;
            flex-direction: column;
            gap: 4px;
            margin-bottom: 32px;
          }

          .hiw2-layer {
            display: grid;
            grid-template-columns: 260px 1fr;
            background: ${D.surface};
            border: 1px solid ${D.border};
            border-radius: 8px;
            overflow: hidden;
            transition: border-color 0.2s;
          }
          .hiw2-layer:hover { border-color: var(--lc); }

          .hiw2-layer__left {
            background: ${D.surface2};
            padding: 20px 22px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            border-right: 1px solid ${D.border};
          }

          .hiw2-layer__icon {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            background: color-mix(in srgb, var(--lc) 14%, transparent);
            color: var(--lc);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .hiw2-layer__name {
            font-size: 14px;
            font-weight: 700;
            color: ${D.text};
            margin: 0 0 8px;
          }

          .hiw2-layer__tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
          }

          .hiw2-tag {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 999px;
            font-size: 10px;
            font-weight: 600;
            background: color-mix(in srgb, var(--lc) 12%, transparent);
            color: var(--lc);
            border: 1px solid color-mix(in srgb, var(--lc) 25%, transparent);
          }

          .hiw2-layer__right {
            padding: 20px 22px;
            display: flex;
            align-items: center;
          }

          .hiw2-layer__desc {
            font-size: 13px;
            line-height: 1.6;
            color: ${D.muted};
            margin: 0;
          }

          .hiw2-connector {
            display: flex;
            justify-content: center;
            padding: 2px 0;
            color: ${D.dim};
          }

          /* Bottom callout */
          .hiw2-callout {
            background: ${D.surface};
            border: 1px solid ${D.border};
            border-left: 4px solid ${D.yellow};
            border-radius: 8px;
            padding: 24px 28px;
            margin-bottom: 32px;
          }
          .hiw2-callout p {
            font-size: 14px;
            color: ${D.muted};
            line-height: 1.7;
            margin: 0;
          }
          .hiw2-callout p strong { color: ${D.text}; font-weight: 700; }

          /* CTA */
          .hiw2-cta {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }

          .hiw2-btn-primary {
            background: ${D.red};
            color: #fff;
            font-weight: 700;
            border: none;
            border-radius: 6px;
            padding: 12px 24px;
            cursor: pointer;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: background 0.2s;
          }
          .hiw2-btn-primary:hover { background: ${D.redDark}; }

          .hiw2-btn-secondary {
            background: transparent;
            color: ${D.yellow};
            font-weight: 700;
            border: 1px solid ${D.yellow};
            border-radius: 6px;
            padding: 12px 24px;
            cursor: pointer;
            font-size: 14px;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            transition: background 0.2s;
          }
          .hiw2-btn-secondary:hover { background: rgba(255,204,0,0.08); }

          @media (max-width: 700px) {
            .hiw2-layer { grid-template-columns: 1fr; }
            .hiw2-hero { padding: 36px 24px; }
          }
        `}</style>

        <div className="hiw2-page">

          {/* Hero */}
          <div className="hiw2-hero">
            <div className="hiw2-hero__subtitle">DHL · Infrastructure Platform Portal</div>
            <h1 className="hiw2-hero__title">How It Works</h1>
            <p className="hiw2-hero__body">
              The platform is a layered stack where each layer has a single responsibility. Together they form an opinionated, self-healing, self-service private cloud.
            </p>
          </div>

          {/* Layers */}
          <div className="hiw2-section-label">Platform Layers — top to bottom</div>
          <div className="hiw2-layers">
            {LAYERS.map((layer, i) => (
              <React.Fragment key={layer.title}>
                <div className="hiw2-layer" style={{ '--lc': layer.iconColor } as React.CSSProperties}>
                  <div className="hiw2-layer__left">
                    <div className="hiw2-layer__icon">{layer.icon}</div>
                    <div>
                      <p className="hiw2-layer__name">{layer.title}</p>
                      <div className="hiw2-layer__tags">
                        {layer.tags.map(t => <span key={t} className="hiw2-tag">{t}</span>)}
                      </div>
                    </div>
                  </div>
                  <div className="hiw2-layer__right">
                    <p className="hiw2-layer__desc">{layer.desc}</p>
                  </div>
                </div>
                {i < LAYERS.length - 1 && (
                  <div className="hiw2-connector">
                    <ArrowDown size={14} strokeWidth={2} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Callout */}
          <div className="hiw2-callout">
            <p>
              <strong>Every layer is composable.</strong> DHL teams can adopt individual layers or the full stack. Each component is open-source and CNCF-graduated where available.
            </p>
          </div>

          {/* CTA */}
          <div className="hiw2-cta">
            <button type="button" className="hiw2-btn-primary" onClick={() => navigate('/architecture')}>
              View Architecture <ArrowRight size={13} strokeWidth={2} />
            </button>
            <button type="button" className="hiw2-btn-secondary" onClick={() => navigate('/try-out')}>
              Try It Out <ArrowRight size={13} strokeWidth={2} />
            </button>
          </div>

        </div>
      </div>
    </AppleShell>
  );
};
