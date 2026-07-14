import React from 'react';
import { ExternalLink, X } from 'lucide-react';

export interface Provider {
  id: string;
  name: string;
  vendor: string;
  version: string;
  logoKey: string;
  summary: string;
  description: string;
  categories: string[];
  capabilities: string[];
  upbound: string;
}

// ─── DHL Design Tokens ────────────────────────────────────────────────────────

const D = {
  red:      '#D40511',
  redDark:  '#AA0408',
  yellow:   '#FFCC00',
  dark:     '#1A1A1A',
  surface:  '#242424',
  surface2: '#2E2E2E',
  border:   '#3A3A3A',
  text:     '#F0F0F0',
  muted:    '#999999',
  mutedLt:  '#BBBBBB',
  gradient: 'linear-gradient(90deg, #D40511 0%, #FFCC00 100%)',
};

const FONT = "'Inter','Helvetica Neue',-apple-system,BlinkMacSystemFont,sans-serif";

// ─── SVG provider logos (light-on-dark) ─────────────────────────────────────

function KubeVirtLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="36" height="36" rx="6" stroke={D.mutedLt} strokeWidth="2" fill="none" />
      <polygon points="16,16 24,10 32,16 32,32 24,38 16,32" stroke={D.mutedLt} strokeWidth="1.5" fill="none" />
      <text x="24" y="28" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="10" fontWeight="600" fill={D.mutedLt}>KV</text>
    </svg>
  );
}

function GrafanaLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" stroke={D.mutedLt} strokeWidth="2" fill="none" />
      <circle cx="24" cy="24" r="8" stroke={D.mutedLt} strokeWidth="1.5" fill="none" />
      <line x1="24" y1="4" x2="24" y2="16" stroke={D.mutedLt} strokeWidth="1.5" />
      <line x1="24" y1="32" x2="24" y2="44" stroke={D.mutedLt} strokeWidth="1.5" />
      <line x1="4" y1="24" x2="16" y2="24" stroke={D.mutedLt} strokeWidth="1.5" />
      <line x1="32" y1="24" x2="44" y2="24" stroke={D.mutedLt} strokeWidth="1.5" />
    </svg>
  );
}

function VMwareLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="6" stroke={D.mutedLt} strokeWidth="2" fill="none" />
      <text x="24" y="30" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="13" fontWeight="700" fill={D.mutedLt}>VM</text>
    </svg>
  );
}

function TerraformLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="6" stroke={D.mutedLt} strokeWidth="2" fill="none" />
      <polygon points="14,13 14,24 22,28 22,17" fill={D.mutedLt} />
      <polygon points="26,10 26,21 34,25 34,14" fill={D.mutedLt} />
      <polygon points="14,28 14,35 22,39 22,32" fill={D.mutedLt} />
    </svg>
  );
}

function FallbackLogo({ name }: { name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="40" height="40" rx="6" stroke={D.mutedLt} strokeWidth="2" fill="none" />
      <text x="24" y="30" textAnchor="middle" fontFamily="-apple-system,sans-serif" fontSize="14" fontWeight="700" fill={D.mutedLt}>{initials}</text>
    </svg>
  );
}

function ProviderLogo({ logoKey, name }: { logoKey: string; name: string }) {
  switch (logoKey) {
    case 'kubevirt':  return <KubeVirtLogo />;
    case 'grafana':   return <GrafanaLogo />;
    case 'vmware':    return <VMwareLogo />;
    case 'terraform': return <TerraformLogo />;
    default:          return <FallbackLogo name={name} />;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface ProviderDetailModalProps {
  provider: Provider | null;
  onClose: () => void;
}

export function ProviderDetailModal({ provider, onClose }: ProviderDetailModalProps) {
  if (!provider) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, fontFamily: FONT,
      }}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={provider.name}
    >
      <div style={{
        width: 680,
        maxWidth: '95vw',
        maxHeight: '90vh',
        background: D.dark,
        border: `1px solid ${D.border}`,
        borderRadius: 12,
        borderTop: `3px solid`,
        borderImage: D.gradient + ' 1',
        boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '24px 28px 20px',
          display: 'flex', alignItems: 'flex-start', gap: 18,
          borderBottom: `1px solid ${D.border}`,
        }}>
          <div style={{
            flexShrink: 0, width: 56, height: 56,
            background: D.surface2, borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 4, boxSizing: 'border-box',
          }}>
            <ProviderLogo logoKey={provider.logoKey} name={provider.name} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: D.text, letterSpacing: '-0.3px', margin: 0 }}>
                {provider.name}
              </h2>
              <span style={{
                fontSize: 11, fontWeight: 700, color: D.muted,
                background: D.surface2, border: `1px solid ${D.border}`,
                borderRadius: 6, padding: '2px 8px', letterSpacing: '0.04em',
              }}>
                {provider.vendor}
              </span>
              <span style={{
                fontSize: 11, fontWeight: 500, color: D.muted,
                background: D.surface2, border: `1px solid ${D.border}`,
                borderRadius: 999, padding: '2px 10px',
              }}>
                v{provider.version}
              </span>
            </div>
            <p style={{ fontSize: 13, color: D.muted, margin: 0, lineHeight: 1.5 }}>
              {provider.summary}
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer',
              color: D.muted, padding: 6, borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = D.text;
              (e.currentTarget as HTMLButtonElement).style.background = D.surface2;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = D.muted;
              (e.currentTarget as HTMLButtonElement).style.background = 'none';
            }}
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* About */}
          <p style={{
            fontSize: 11, fontWeight: 700, color: D.red,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            margin: '0 0 10px',
          }}>
            About
          </p>
          <p style={{ fontSize: 14, color: D.mutedLt, lineHeight: 1.7, margin: '0 0 28px' }}>
            {provider.description}
          </p>

          {/* Capabilities */}
          <p style={{
            fontSize: 11, fontWeight: 700, color: D.red,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            margin: '0 0 12px',
          }}>
            Capabilities
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {provider.capabilities.map(cap => (
              <span key={cap} style={{
                fontSize: 12, fontWeight: 600,
                color: D.red,
                background: 'rgba(212,5,17,0.10)',
                border: '1px solid rgba(212,5,17,0.25)',
                borderRadius: 6, padding: '4px 12px',
              }}>
                {cap}
              </span>
            ))}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '16px 28px 22px',
          display: 'flex', gap: 12, alignItems: 'center',
          borderTop: `1px solid ${D.border}`,
        }}>
          <a
            href={provider.upbound}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              fontSize: 14, fontWeight: 700, color: '#fff',
              background: D.red, border: 'none', borderRadius: 6,
              padding: '10px 22px', cursor: 'pointer', textDecoration: 'none',
              transition: 'background 0.15s', fontFamily: FONT,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = D.redDark; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = D.red; }}
          >
            View on Upbound Marketplace
            <ExternalLink size={14} strokeWidth={2} />
          </a>
          <button
            onClick={onClose}
            style={{
              display: 'inline-flex', alignItems: 'center',
              fontSize: 14, fontWeight: 600, color: D.muted,
              background: 'none', border: `1px solid ${D.border}`,
              borderRadius: 6, padding: '10px 22px', cursor: 'pointer',
              fontFamily: FONT, transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = D.yellow;
              (e.currentTarget as HTMLButtonElement).style.color = D.yellow;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = D.border;
              (e.currentTarget as HTMLButtonElement).style.color = D.muted;
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
