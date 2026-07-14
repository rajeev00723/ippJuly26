import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import {
  ArrowRight,
  Bot,
  GitBranch,
  Layers,
  Network,
  Server,
  Shield,
  Zap,
  DollarSign,
  Eye,
  ChevronRight,
  Play,
  Package,
} from 'lucide-react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { dhl } from '../../design-system/tokens';

// ── Platform journey steps ─────────────────────────────────────────────────────
const JOURNEY = [
  {
    step: '01',
    label: 'Request',
    title: 'Developer self-service',
    text: 'Pick a blueprint in Backstage. No ticket, no wait.',
    route: '/create',
    color: dhl.red,
  },
  {
    step: '02',
    label: 'Provision',
    title: 'Crossplane executes',
    text: 'Compositions render real infrastructure from declared intent.',
    route: '/crossplane',
    color: dhl.red,
  },
  {
    step: '03',
    label: 'Deliver',
    title: 'Argo CD reconciles',
    text: 'Git becomes the source of truth. Drift is auto-corrected.',
    route: '/gitops',
    color: dhl.yellow,
  },
  {
    step: '04',
    label: 'Operate',
    title: 'Full observability',
    text: 'Health, cost, security, and AIOps — one platform.',
    route: '/operations',
    color: dhl.yellow,
  },
] as const;

// ── Live demo capabilities ─────────────────────────────────────────────────────
const CAPABILITIES = [
  { icon: <Layers size={22} strokeWidth={1.6} />,     name: 'Self-Service Portal',      tag: 'Backstage',         text: 'Software catalog, scaffolder templates, and onboarding wizards.', route: '/create',                   accent: dhl.red },
  { icon: <Server size={22} strokeWidth={1.6} />,     name: 'Infrastructure Blueprints', tag: 'Crossplane',        text: 'Declarative compositions that provision real cloud resources.',    route: '/crossplane',               accent: dhl.red },
  { icon: <GitBranch size={22} strokeWidth={1.6} />,  name: 'GitOps Delivery',           tag: 'Argo CD',           text: 'Every change stored, reviewed, and continuously reconciled.',     route: '/gitops',                   accent: dhl.yellow },
  { icon: <Zap size={22} strokeWidth={1.6} />,        name: 'Serverless Workloads',      tag: 'Knative',           text: 'Scale-to-zero event-driven apps inside the same platform model.', route: '/knative',                  accent: '#FF8C00' },
  { icon: <Network size={22} strokeWidth={1.6} />,    name: 'Zero-Trust Network',        tag: 'Cilium / Hubble',   text: 'eBPF policy enforcement and live network flow visibility.',        route: '/security-posture',         accent: dhl.red },
  { icon: <Bot size={22} strokeWidth={1.6} />,        name: 'AIOps Assistant',           tag: 'Agent',             text: 'LLM-driven incident detection and guided remediation.',            route: '/agent-command-center',     accent: dhl.yellow },
  { icon: <Eye size={22} strokeWidth={1.6} />,        name: 'Observability',             tag: 'Grafana / Prom',    text: 'Platform-wide metrics, traces, and workload health signals.',      route: '/operations',               accent: dhl.red },
  { icon: <DollarSign size={22} strokeWidth={1.6} />, name: 'FinOps Visibility',         tag: 'OpenCost',          text: 'Per-team showback, forecasts, and cost ownership metadata.',       route: '/finops-charge-visibility', accent: dhl.yellow },
  { icon: <Shield size={22} strokeWidth={1.6} />,     name: 'Policy & Compliance',       tag: 'OPA / Kyverno',     text: 'Guardrails enforced at admission. Workload identity via SPIRE.',   route: '/security-posture',         accent: dhl.red },
] as const;

// ── Main component ─────────────────────────────────────────────────────────────
export const LandingV2 = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isDark = (theme.palette as any).mode === 'dark';
  const [, setHoveredCap] = useState<string | null>(null);
  const [, setHoveredStep] = useState<string | null>(null);

  // Surface colours adapt to the active theme
  const bg      = theme.palette.background.default;
  const card    = theme.palette.background.paper;
  const border  = theme.palette.divider;
  const text    = theme.palette.text.primary;
  const muted   = theme.palette.text.secondary;

  return (
    <AppleShell title="Platform Demo">
      <div style={{ color: text }}>
        <style>{`
          /* ── DHL Landing Design System ── */
          .dhl-page {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: 100%;
            font-family: 'Inter', 'DM Sans', -apple-system, sans-serif;
          }

          /* ── Hero ── */
          .dhl-hero {
            position: relative;
            border-radius: 16px;
            overflow: hidden;
            background: ${isDark ? '#1C1C1C' : dhl.black};
            padding: 64px 52px 52px;
            margin-bottom: 20px;
            border: 1px solid rgba(212,5,17,0.15);
          }

          /* DHL Red authority bar — top of hero */
          .dhl-hero::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 3px;
            background: linear-gradient(90deg, ${dhl.red} 0%, #E8420A 55%, ${dhl.yellow} 100%);
          }

          /* Subtle background glow */
          .dhl-hero::after {
            content: '';
            position: absolute;
            inset: 0;
            background:
              radial-gradient(ellipse 65% 50% at 60% -10%, rgba(212,5,17,0.18) 0%, transparent 60%),
              radial-gradient(ellipse 40% 40% at 95% 90%, rgba(255,204,0,0.09) 0%, transparent 55%);
            pointer-events: none;
          }

          .dhl-hero-eyebrow {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 5px 12px;
            border-radius: 4px;
            background: rgba(212,5,17,0.14);
            border: 1px solid rgba(212,5,17,0.30);
            color: #FF6B6B;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.10em;
            text-transform: uppercase;
            margin-bottom: 24px;
            position: relative;
            z-index: 1;
          }

          .dhl-hero-eyebrow-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: ${dhl.red};
            animation: dhl-pulse 2s ease-in-out infinite;
          }

          @keyframes dhl-pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50%       { opacity: 0.5; transform: scale(0.8); }
          }

          .dhl-hero-headline {
            position: relative;
            z-index: 1;
            margin: 0;
            font-size: clamp(34px, 4.5vw, 58px);
            line-height: 1.05;
            letter-spacing: -0.04em;
            font-weight: 800;
            color: #FFFFFF;
            max-width: 780px;
          }

          .dhl-accent-red  { color: ${dhl.red}; }
          .dhl-accent-gold { color: ${dhl.yellow}; }

          .dhl-hero-sub {
            position: relative;
            z-index: 1;
            margin: 20px 0 0;
            font-size: 16px;
            line-height: 1.65;
            color: rgba(255,255,255,0.52);
            max-width: 560px;
          }

          .dhl-hero-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 32px;
            position: relative;
            z-index: 1;
          }

          /* ── Buttons ── */
          .dhl-btn-primary {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 12px 20px; border-radius: 7px;
            background: ${dhl.red}; color: #fff;
            font-size: 14px; font-weight: 700; border: none; cursor: pointer;
            transition: background 140ms, transform 100ms;
            letter-spacing: 0.01em;
          }
          .dhl-btn-primary:hover  { background: #B8040E; transform: translateY(-1px); }
          .dhl-btn-primary:active { transform: scale(0.97); }

          .dhl-btn-gold {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 12px 20px; border-radius: 7px;
            background: ${dhl.yellow}; color: ${dhl.black};
            font-size: 14px; font-weight: 700; border: none; cursor: pointer;
            transition: background 140ms, transform 100ms;
            letter-spacing: 0.01em;
          }
          .dhl-btn-gold:hover  { background: #FFD740; transform: translateY(-1px); }
          .dhl-btn-gold:active { transform: scale(0.97); }

          .dhl-btn-ghost {
            display: inline-flex; align-items: center; gap: 8px;
            padding: 12px 20px; border-radius: 7px;
            background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.70);
            font-size: 14px; font-weight: 600;
            border: 1px solid rgba(255,255,255,0.12); cursor: pointer;
            transition: background 140ms, transform 100ms;
            text-decoration: none;
          }
          .dhl-btn-ghost:hover  { background: rgba(255,255,255,0.11); transform: translateY(-1px); }
          .dhl-btn-ghost:active { transform: scale(0.97); }

          /* ── Stat bar inside hero ── */
          .dhl-stat-bar {
            display: flex;
            gap: 36px;
            margin-top: 48px;
            padding-top: 28px;
            border-top: 1px solid rgba(255,255,255,0.08);
            position: relative;
            z-index: 1;
          }

          .dhl-stat { display: flex; flex-direction: column; gap: 4px; }

          .dhl-stat-num {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: -0.04em;
            color: #FFFFFF;
            font-variant-numeric: tabular-nums;
          }
          .dhl-stat-num.red  { color: ${dhl.red}; }
          .dhl-stat-num.gold { color: ${dhl.yellow}; }

          .dhl-stat-label {
            font-size: 10px;
            color: rgba(255,255,255,0.32);
            font-weight: 600;
            letter-spacing: 0.06em;
            text-transform: uppercase;
          }

          /* ── Section wrapper ── */
          .dhl-section { margin-bottom: 20px; }

          .dhl-section-label {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: ${dhl.red};
            margin-bottom: 14px;
          }
          .dhl-section-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(212,5,17,0.18);
          }

          /* ── DHL Signature Rule Line ── */
          .dhl-rule-line {
            display: block;
            width: 100%;
            height: 2px;
            background: ${dhl.yellow};
            border: none;
            margin: 0 0 16px;
          }

          /* ── Journey strip ── */
          .dhl-journey {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
          }

          .dhl-journey-card {
            position: relative;
            border-radius: 12px;
            border: 1px solid ${border};
            background: ${card};
            padding: 24px 20px;
            cursor: pointer;
            transition: transform 140ms, box-shadow 140ms, border-color 140ms;
            overflow: hidden;
          }
          .dhl-journey-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 2px;
            background: var(--jc-color);
            opacity: 0.9;
          }
          .dhl-journey-card:hover {
            transform: translateY(-3px);
            border-color: var(--jc-color);
            box-shadow: 0 8px 28px rgba(0,0,0,0.12);
          }

          .dhl-journey-step {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.14em;
            color: var(--jc-color);
            text-transform: uppercase;
            margin-bottom: 12px;
          }

          .dhl-journey-label {
            display: inline-flex;
            padding: 3px 8px;
            border-radius: 4px;
            background: color-mix(in srgb, var(--jc-color) 12%, transparent);
            border: 1px solid color-mix(in srgb, var(--jc-color) 25%, transparent);
            color: var(--jc-color);
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-bottom: 12px;
          }

          .dhl-journey-title {
            margin: 0 0 7px;
            font-size: 15px;
            font-weight: 700;
            letter-spacing: -0.02em;
            color: ${text};
          }

          .dhl-journey-text {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: ${muted};
          }

          .dhl-journey-cta {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 16px;
            color: var(--jc-color);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.02em;
            opacity: 0;
            transition: opacity 140ms, transform 140ms;
            transform: translateX(-4px);
          }
          .dhl-journey-card:hover .dhl-journey-cta { opacity: 1; transform: translateX(0); }

          /* ── Capability grid ── */
          .dhl-cap-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }

          .dhl-cap-card {
            border-radius: 12px;
            border: 1px solid ${border};
            background: ${card};
            padding: 22px 20px;
            cursor: pointer;
            transition: transform 140ms, border-color 140ms, box-shadow 140ms;
            position: relative;
            overflow: hidden;
          }
          .dhl-cap-card:hover {
            transform: translateY(-2px);
            border-color: ${dhl.yellow};
            box-shadow: 0 6px 22px rgba(0,0,0,0.09);
          }
          .dhl-cap-card::after {
            content: '';
            position: absolute;
            bottom: 0; left: 0; right: 0;
            height: 2px;
            background: var(--cc-color);
            opacity: 0;
            transition: opacity 160ms;
          }
          .dhl-cap-card:hover::after { opacity: 1; }

          .dhl-cap-icon-wrap {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: color-mix(in srgb, var(--cc-color) 12%, transparent);
            color: var(--cc-color);
            margin-bottom: 12px;
            transition: background 140ms;
          }
          .dhl-cap-card:hover .dhl-cap-icon-wrap { background: color-mix(in srgb, var(--cc-color) 20%, transparent); }

          .dhl-cap-tag {
            display: inline-flex;
            padding: 2px 7px;
            border-radius: 4px;
            background: ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'};
            border: 1px solid ${border};
            color: ${muted};
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            margin-bottom: 8px;
          }

          .dhl-cap-name { margin: 0 0 6px; font-size: 14px; font-weight: 700; letter-spacing: -0.02em; color: ${text}; }
          .dhl-cap-text { margin: 0; font-size: 12px; line-height: 1.6; color: ${muted}; }

          .dhl-cap-arrow {
            position: absolute;
            top: 20px; right: 20px;
            color: ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'};
            transition: color 140ms, transform 140ms;
          }
          .dhl-cap-card:hover .dhl-cap-arrow { color: ${dhl.yellow}; transform: translate(2px, -2px); }

          /* ── Bottom CTA ── */
          .dhl-cta {
            border-radius: 14px;
            background: ${isDark ? '#1C1C1C' : dhl.black};
            border: 1px solid rgba(212,5,17,0.16);
            padding: 52px 52px;
            text-align: center;
            position: relative;
            overflow: hidden;
            margin-bottom: 8px;
          }
          .dhl-cta::before {
            content: '';
            position: absolute;
            inset: 0;
            background: radial-gradient(ellipse 70% 65% at 50% -5%, rgba(212,5,17,0.12) 0%, transparent 65%);
            pointer-events: none;
          }
          .dhl-cta::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, ${dhl.yellow} 50%, transparent 100%);
          }

          .dhl-cta-title { position: relative; margin: 0 0 12px; font-size: 32px; font-weight: 800; letter-spacing: -0.04em; color: #FFFFFF; }
          .dhl-cta-sub   { position: relative; margin: 0 auto 32px; font-size: 15px; line-height: 1.65; color: rgba(255,255,255,0.50); max-width: 480px; }
          .dhl-cta-btns  { position: relative; display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }

          /* ── Responsive ── */
          @media (max-width: 1100px) { .dhl-cap-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 900px)  { .dhl-journey  { grid-template-columns: repeat(2, 1fr); } }
          @media (max-width: 700px)  {
            .dhl-hero { padding: 36px 24px 32px; }
            .dhl-journey, .dhl-cap-grid { grid-template-columns: 1fr; }
            .dhl-cta { padding: 36px 24px; }
            .dhl-stat-bar { gap: 20px; flex-wrap: wrap; }
          }
        `}</style>

        <div className="dhl-page">

          {/* ── Hero ─────────────────────────────────────────────────────────── */}
          <section className="dhl-hero">
            <div className="dhl-hero-eyebrow">
              <span className="dhl-hero-eyebrow-dot" />
              Live Demo Environment
            </div>

            <h1 className="dhl-hero-headline">
              Self-Service Private Cloud.<br />
              <span className="dhl-accent-red">Request</span>{' '}
              <span style={{ color: 'rgba(255,255,255,0.38)', fontSize: '0.88em', fontWeight: 600 }}>to</span>{' '}
              <span className="dhl-accent-gold">runtime.</span>
            </h1>

            <p className="dhl-hero-sub">
              Self-service infrastructure, governed delivery, and operational intelligence — all live in this environment.
            </p>

            <div className="dhl-hero-actions">
              <button type="button" className="dhl-btn-primary" onClick={() => navigate('/developer')}>
                <Play size={13} strokeWidth={2.5} />
                Start demo
              </button>
              <button type="button" className="dhl-btn-gold" onClick={() => navigate('/getting-started')}>
                Getting started
                <ArrowRight size={13} strokeWidth={2} />
              </button>
              <button type="button" className="dhl-btn-ghost" onClick={() => navigate('/create')}>
                Self-service portal
                <ArrowRight size={13} strokeWidth={2} />
              </button>
              <button type="button" className="dhl-btn-ghost" onClick={() => navigate('/agent-command-center')}>
                AIOps
                <ArrowRight size={13} strokeWidth={2} />
              </button>
            </div>

            <div className="dhl-stat-bar">
              <div className="dhl-stat">
                <span className="dhl-stat-num red">9</span>
                <span className="dhl-stat-label">Live capabilities</span>
              </div>
              <div className="dhl-stat">
                <span className="dhl-stat-num">5</span>
                <span className="dhl-stat-label">Persona views</span>
              </div>
              <div className="dhl-stat">
                <span className="dhl-stat-num gold">0</span>
                <span className="dhl-stat-label">Manual tickets</span>
              </div>
              <div className="dhl-stat">
                <span className="dhl-stat-num" style={{ fontSize: 18, marginTop: 4 }}>KIND</span>
                <span className="dhl-stat-label">Runs locally</span>
              </div>
            </div>
          </section>

          {/* ── Platform Journey ──────────────────────────────────────────────── */}
          <section className="dhl-section">
            <div className="dhl-section-label">
              <ChevronRight size={11} strokeWidth={2.5} />
              Platform Journey — 4 steps
            </div>

            <div className="dhl-journey">
              {JOURNEY.map(step => (
                <div
                  key={step.step}
                  className="dhl-journey-card"
                  style={{ '--jc-color': step.color } as React.CSSProperties}
                  onClick={() => navigate(step.route)}
                  onMouseEnter={() => setHoveredStep(step.step)}
                  onMouseLeave={() => setHoveredStep(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(step.route)}
                >
                  <div className="dhl-journey-step">{step.step}</div>
                  <div className="dhl-journey-label">{step.label}</div>
                  <h3 className="dhl-journey-title">{step.title}</h3>
                  <p className="dhl-journey-text">{step.text}</p>
                  <div className="dhl-journey-cta">
                    Open live demo
                    <ArrowRight size={10} strokeWidth={2.5} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Capabilities ─────────────────────────────────────────────────── */}
          <section className="dhl-section">
            <div className="dhl-section-label">
              <Package size={11} strokeWidth={2.5} />
              All capabilities — live in this environment
            </div>

            <div className="dhl-cap-grid">
              {CAPABILITIES.map(cap => (
                <div
                  key={cap.name}
                  className="dhl-cap-card"
                  style={{ '--cc-color': cap.accent } as React.CSSProperties}
                  onClick={() => navigate(cap.route)}
                  onMouseEnter={() => setHoveredCap(cap.name)}
                  onMouseLeave={() => setHoveredCap(null)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && navigate(cap.route)}
                >
                  <ChevronRight size={14} strokeWidth={2} className="dhl-cap-arrow" />
                  <div className="dhl-cap-icon-wrap">{cap.icon}</div>
                  <div className="dhl-cap-tag">{cap.tag}</div>
                  <h3 className="dhl-cap-name">{cap.name}</h3>
                  <p className="dhl-cap-text">{cap.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ── Closing CTA ──────────────────────────────────────────────────── */}
          <section className="dhl-cta">
            <h2 className="dhl-cta-title">Ready to walk through it live?</h2>
            <p className="dhl-cta-sub">
              Start with a developer request and follow it through provisioning, delivery, and operations.
            </p>
            <div className="dhl-cta-btns">
              <button type="button" className="dhl-btn-primary" onClick={() => navigate('/developer')}>
                <Play size={13} strokeWidth={2.5} />
                Developer journey
              </button>
              <button type="button" className="dhl-btn-gold" onClick={() => navigate('/try-out')}>
                Try it out
                <ArrowRight size={13} strokeWidth={2} />
              </button>
              <button type="button" className="dhl-btn-ghost" onClick={() => navigate('/platform')}>
                Platform engineer view
                <ArrowRight size={13} strokeWidth={2} />
              </button>
            </div>
          </section>

        </div>
      </div>
    </AppleShell>
  );
};
