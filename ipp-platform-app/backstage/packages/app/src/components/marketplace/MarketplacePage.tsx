import React, { useState } from 'react';
import { Server, Database, Globe, Lock, ExternalLink } from 'lucide-react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { ProviderDetailModal, Provider } from './ProviderDetailModal';
import providersData from './providers.json';

// ─── DHL Design Tokens — CSS-variable-aware, light+dark safe ─────────────────

const D = {
  red:        '#D40511',
  redDark:    '#B0000B',
  yellow:     '#FFCC00',
  yellowLight:'#FFF4CC',
  // All below resolve via CSS variables so light/dark mode work automatically
  black:      'var(--ds-bg)',
  dark:       'var(--ds-surface)',
  surface:    'var(--ds-surface)',
  surface2:   'var(--ds-surface-alt)',
  border:     'var(--ds-hairline)',
  text:       'var(--ds-text-primary)',
  muted:      'var(--ds-text-secondary)',
  mutedLight: 'var(--ds-text-secondary)',
  gradient:   'linear-gradient(90deg, #D40511 0%, #FFCC00 100%)',
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  label: string;
  icon: string;
  description: string;
}

// ─── SVG provider logos (light-on-dark) ─────────────────────────────────────

function KubeVirtLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="36" height="36" rx="6" stroke="#D40511" strokeWidth="2" fill="none" />
      <polygon points="16,16 24,10 32,16 32,32 24,38 16,32" stroke="#D40511" strokeWidth="1.5" fill="none" />
      <text x="24" y="28" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="10" fontWeight="600" fill="#D40511">KV</text>
    </svg>
  );
}

function GrafanaLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" stroke="#D40511" strokeWidth="2" fill="none" />
      <circle cx="24" cy="24" r="8" stroke="#D40511" strokeWidth="1.5" fill="none" />
      <line x1="24" y1="4" x2="24" y2="16" stroke="#D40511" strokeWidth="1.5" />
      <line x1="24" y1="32" x2="24" y2="44" stroke="#D40511" strokeWidth="1.5" />
      <line x1="4" y1="24" x2="16" y2="24" stroke="#D40511" strokeWidth="1.5" />
      <line x1="32" y1="24" x2="44" y2="24" stroke="#D40511" strokeWidth="1.5" />
    </svg>
  );
}

function VMwareLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="6" stroke="#D40511" strokeWidth="2" fill="none" />
      <text x="24" y="30" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="13" fontWeight="700" fill="#D40511">VM</text>
    </svg>
  );
}

function TerraformLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="6" stroke="#D40511" strokeWidth="2" fill="none" />
      <polygon points="14,13 14,24 22,28 22,17" fill="#D40511" />
      <polygon points="26,10 26,21 34,25 34,14" fill="#D40511" />
      <polygon points="14,28 14,35 22,39 22,32" fill="#D40511" />
    </svg>
  );
}

function FallbackProviderLogo({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <svg width="36" height="36" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="6" stroke="#D40511" strokeWidth="2" fill="none" />
      <text x="24" y="30" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="14" fontWeight="700" fill="#D40511">{initials}</text>
    </svg>
  );
}

function ProviderLogo({ logoKey, name }: { logoKey: string; name: string }) {
  switch (logoKey) {
    case 'kubevirt':   return <KubeVirtLogo />;
    case 'grafana':    return <GrafanaLogo />;
    case 'vmware':     return <VMwareLogo />;
    case 'terraform':  return <TerraformLogo />;
    default:           return <FallbackProviderLogo name={name} />;
  }
}

// ─── Category icon mapping ────────────────────────────────────────────────────

function CategoryIcon({ iconKey, size = 20, active: _active }: { iconKey: string; size?: number; active: boolean }) {
  const props = { size, strokeWidth: 1.8, color: '#D40511' };
  switch (iconKey) {
    case 'server':   return <Server {...props} />;
    case 'database': return <Database {...props} />;
    case 'network':  return <Globe {...props} />;
    case 'lock':     return <Lock {...props} />;
    default:         return <Server {...props} />;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MarketplacePage() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const categories: Category[] = providersData.categories as Category[];
  const providers: Provider[] = providersData.providers as Provider[];

  const filteredProviders = activeCategory
    ? providers.filter(p => p.categories.includes(activeCategory))
    : providers;

  const countForCategory = (catId: string) =>
    providers.filter(p => p.categories.includes(catId)).length;

  const activeCategoryLabel = activeCategory
    ? categories.find(c => c.id === activeCategory)?.label
    : null;

  const toggleCategory = (catId: string) => {
    setActiveCategory(prev => (prev === catId ? null : catId));
  };

  return (
    <AppleShell title="Marketplace">
      <div>
        <style>{`
          .mp-page {
            width: 100%;
            padding-bottom: 48px;
            font-family: 'Inter', 'Helvetica Neue', sans-serif;
            background: var(--ds-bg);
            min-height: 100%;
            box-sizing: border-box;
          }

          /* ── Hero ── */
          .mp-hero {
            background: linear-gradient(135deg, var(--dhl-yellow-surface, #FFFBEB) 0%, #FFFBF0 60%, var(--dhl-yellow-light, #FFF4CC) 100%);
            border: 1px solid var(--dhl-border-warm, #F1E3A3);
            border-radius: 8px;
            padding: 48px 40px 44px;
            margin-bottom: 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 32px;
            overflow: hidden;
            position: relative;
          }
          .mp-hero__text { flex: 1; min-width: 0; }
          .mp-hero__illustration {
            width: 280px;
            height: 148px;
            flex-shrink: 0;
            border-radius: 8px;
            background: linear-gradient(135deg, rgba(255,204,0,0.35) 0%, rgba(212,5,17,0.08) 100%);
            border: 1px solid rgba(212,5,17,0.12);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            overflow: hidden;
          }
          [data-theme="dark"] .mp-hero {
            background: linear-gradient(135deg, rgba(255,204,0,0.08) 0%, rgba(255,204,0,0.04) 100%);
            border-color: rgba(255,204,0,0.18);
          }
          [data-theme="dark"] .mp-hero__illustration {
            background: linear-gradient(135deg, rgba(255,204,0,0.12) 0%, rgba(212,5,17,0.06) 100%);
            border-color: rgba(255,204,0,0.18);
          }
          .mp-hero__eyebrow {
            color: ${D.red};
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 12px;
          }
          .mp-hero__title {
            font-size: clamp(26px, 3.5vw, 42px);
            font-weight: 800;
            color: var(--ds-text-primary);
            margin: 0 0 12px;
            letter-spacing: -0.5px;
          }
          .mp-hero__subtitle {
            font-size: 15px;
            color: var(--ds-text-secondary);
            margin: 0;
            line-height: 1.6;
            max-width: 560px;
          }

          /* ── Body padding ── */
          .mp-body {
            padding: 0 40px;
          }

          /* ── Section label ── */
          .mp-section-label {
            color: ${D.red};
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .mp-section-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: rgba(212,5,17,0.2);
          }

          /* ── Category grid ── */
          .mp-categories {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 36px;
          }
          @media (max-width: 900px) {
            .mp-categories { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 540px) {
            .mp-categories { grid-template-columns: 1fr; }
          }

          .mp-cat {
            background: var(--ds-surface);
            border: 1px solid var(--ds-hairline);
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
            display: flex;
            flex-direction: column;
            gap: 10px;
            user-select: none;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
          }
          .mp-cat:hover {
            border-color: #FFCC00;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          }
          .mp-cat.active {
            border-color: ${D.red};
            background: rgba(212,5,17,0.04);
            box-shadow: 0 2px 12px rgba(212,5,17,0.10);
          }
          [data-theme="dark"] .mp-cat.active {
            background: rgba(255,204,0,0.10);
          }

          .mp-cat__icon {
            width: 44px;
            height: 44px;
            border-radius: 8px;
            background: var(--dhl-yellow, #FFCC00);
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .mp-cat.active .mp-cat__icon {
            background: var(--dhl-yellow, #FFCC00);
          }

          .mp-cat__title {
            font-size: 14px;
            font-weight: 700;
            color: var(--ds-text-primary);
            margin: 0;
            line-height: 1.2;
          }
          .mp-cat__desc {
            font-size: 12px;
            color: var(--ds-text-secondary);
            margin: 0;
            line-height: 1.4;
          }
          .mp-cat__count {
            font-size: 12px;
            font-weight: 600;
            color: ${D.red};
            margin-top: 2px;
          }
          .mp-cat.active .mp-cat__count {
            color: ${D.red};
          }

          /* ── Provider grid ── */
          .mp-providers-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
          }
          .mp-filter-chip {
            font-size: 11px;
            font-weight: 600;
            color: ${D.red};
            background: rgba(212,5,17,0.12);
            border: 1px solid rgba(212,5,17,0.25);
            border-radius: 999px;
            padding: 2px 12px;
          }

          .mp-provider-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }
          @media (max-width: 1100px) {
            .mp-provider-grid { grid-template-columns: repeat(3, 1fr); }
          }
          @media (max-width: 800px) {
            .mp-provider-grid { grid-template-columns: repeat(2, 1fr); }
          }
          @media (max-width: 500px) {
            .mp-provider-grid { grid-template-columns: 1fr; }
          }

          .mp-provider {
            background: var(--ds-surface);
            border: 1px solid var(--ds-hairline);
            border-radius: 8px;
            padding: 20px 24px;
            display: flex;
            flex-direction: column;
            gap: 0;
            cursor: pointer;
            transition: border-color 0.15s, box-shadow 0.15s;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          }
          .mp-provider:hover {
            border-color: #FFCC00;
            box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          }

          .mp-provider__logo {
            width: 48px;
            height: 48px;
            background: var(--dhl-yellow, #FFCC00);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 14px;
            padding: 6px;
            box-sizing: border-box;
            flex-shrink: 0;
          }

          .mp-provider__name {
            font-size: 14px;
            font-weight: 700;
            color: var(--ds-text-primary);
            margin: 0 0 4px;
            letter-spacing: -0.1px;
          }

          .mp-provider__vendor-row {
            display: flex;
            align-items: center;
            gap: 6px;
            margin-bottom: 10px;
          }
          .mp-provider__vendor {
            font-size: 11px;
            color: var(--ds-text-secondary);
            font-weight: 500;
          }
          .mp-provider__version {
            font-size: 10px;
            color: var(--ds-text-secondary);
            background: var(--ds-surface-alt);
            border: 1px solid var(--ds-hairline);
            border-radius: 999px;
            padding: 1px 8px;
            font-weight: 600;
          }

          .mp-provider__summary {
            font-size: 12px;
            color: var(--ds-text-secondary);
            line-height: 1.55;
            margin: 0 0 18px;
            flex: 1;
          }

          .mp-provider__btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            font-weight: 700;
            color: ${D.red};
            background: rgba(212,5,17,0.06);
            border: 1px solid rgba(212,5,17,0.22);
            border-radius: 6px;
            padding: 7px 16px;
            cursor: pointer;
            font-family: inherit;
            align-self: flex-start;
            transition: background 0.15s, border-color 0.15s;
          }
          .mp-provider__btn:hover {
            background: rgba(212,5,17,0.14);
            border-color: rgba(212,5,17,0.45);
          }

          /* ── Empty state ── */
          .mp-empty {
            grid-column: 1 / -1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 48px 0;
            color: var(--ds-text-secondary);
            font-size: 14px;
          }
        `}</style>

        <div className="mp-page">

          {/* ── Hero ── */}
          <div className="mp-hero">
            <div className="mp-hero__text">
              <div className="mp-hero__eyebrow">IPP · Private Cloud · Marketplace</div>
              <h1 className="mp-hero__title">Private Cloud Marketplace</h1>
              <p className="mp-hero__subtitle">
                Browse and install Crossplane providers for your private cloud infrastructure.
              </p>
            </div>
            {/* Decorative illustration panel */}
            <div className="mp-hero__illustration" aria-hidden="true">
              {/* DHL logistics abstract — speed marks + provider grid motif */}
              <svg viewBox="0 0 280 148" xmlns="http://www.w3.org/2000/svg" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
                {/* Speed mark stripes */}
                <rect x="0" y="56" width="280" height="7" rx="3.5" fill="#D40511" opacity="0.18"/>
                <rect x="0" y="68" width="230" height="7" rx="3.5" fill="#D40511" opacity="0.13"/>
                <rect x="0" y="80" width="180" height="7" rx="3.5" fill="#D40511" opacity="0.09"/>
                {/* Provider card motifs */}
                <rect x="20"  y="18" width="56" height="30" rx="6" fill="#FFCC00" opacity="0.55"/>
                <rect x="86"  y="18" width="56" height="30" rx="6" fill="#D40511" opacity="0.14"/>
                <rect x="152" y="18" width="56" height="30" rx="6" fill="#FFCC00" opacity="0.40"/>
                <rect x="20"  y="100" width="56" height="30" rx="6" fill="#D40511" opacity="0.10"/>
                <rect x="86"  y="100" width="56" height="30" rx="6" fill="#FFCC00" opacity="0.45"/>
                <rect x="152" y="100" width="56" height="30" rx="6" fill="#D40511" opacity="0.12"/>
                {/* Central DHL mark */}
                <text x="228" y="52" fontFamily="'Inter',sans-serif" fontSize="11" fontWeight="800" fill="#D40511" opacity="0.35" letterSpacing="2">DHL</text>
              </svg>
            </div>
          </div>

          <div className="mp-body">

            {/* ── Categories ── */}
            <div className="mp-section-label">Categories</div>
            <div className="mp-categories">
              {categories.map(cat => {
                const isActive = activeCategory === cat.id;
                return (
                  <div
                    key={cat.id}
                    className={`mp-cat${isActive ? ' active' : ''}`}
                    onClick={() => toggleCategory(cat.id)}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isActive}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') toggleCategory(cat.id); }}
                  >
                    <div className="mp-cat__icon">
                      <CategoryIcon iconKey={cat.icon} size={18} active={isActive} />
                    </div>
                    <p className="mp-cat__title">{cat.label}</p>
                    <p className="mp-cat__desc">{cat.description}</p>
                    <p className="mp-cat__count">
                      {countForCategory(cat.id)} provider{countForCategory(cat.id) !== 1 ? 's' : ''}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ── Providers ── */}
            <div className="mp-providers-header">
              <div className="mp-section-label" style={{ marginBottom: 0, flex: 1 }}>Providers</div>
              {activeCategoryLabel && (
                <span className="mp-filter-chip">{activeCategoryLabel}</span>
              )}
            </div>

            <div className="mp-provider-grid">
              {filteredProviders.length === 0 ? (
                <div className="mp-empty">
                  <p style={{ margin: 0 }}>No providers in this category.</p>
                </div>
              ) : (
                filteredProviders.map(provider => (
                  <div
                    key={provider.id}
                    className="mp-provider"
                    onClick={() => setSelectedProvider(provider)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${provider.name}`}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedProvider(provider); }}
                  >
                    <div className="mp-provider__logo">
                      <ProviderLogo logoKey={provider.logoKey} name={provider.name} />
                    </div>
                    <p className="mp-provider__name">{provider.name}</p>
                    <div className="mp-provider__vendor-row">
                      <span className="mp-provider__vendor">{provider.vendor}</span>
                      <span className="mp-provider__version">v{provider.version}</span>
                    </div>
                    <p className="mp-provider__summary">{provider.summary}</p>
                    <button
                      className="mp-provider__btn"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedProvider(provider);
                      }}
                    >
                      View
                      <ExternalLink size={11} strokeWidth={2} />
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>{/* mp-body */}
        </div>{/* mp-page */}

        {/* ── Modal ── */}
        <ProviderDetailModal
          provider={selectedProvider}
          onClose={() => setSelectedProvider(null)}
        />
      </div>
    </AppleShell>
  );
}

export default MarketplacePage;
