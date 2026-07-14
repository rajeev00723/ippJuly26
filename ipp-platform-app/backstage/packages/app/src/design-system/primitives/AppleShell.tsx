import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useApi, appThemeApiRef, configApiRef } from '@backstage/core-plugin-api';
import { tokens, dhl } from '../tokens';
import { Sidebar, SidebarItemDef } from './Sidebar';
import {
  Home, ShoppingBag, BookOpen, Plus, FileText, Settings,
  Activity, Shield, DollarSign, LogOut, User, Search,
  BarChart3, Bot, Sun, Moon, Network, Server, Layers, Sliders, TrendingUp, Zap, Map,
  Rocket, Cpu, FlaskConical, Bell, GitBranch, Globe, Terminal, Package,
} from 'lucide-react';
import { clearSession, getSession } from '../../components/personas/PersonaLoginGate';

/** Build the sidebar nav in the logical demo-cockpit order. All indices are computed
 *  dynamically so optional items (Karmada, Knative) slot in without breaking headers. */
function buildNav(karmadaEnabled: boolean, knativeDemoEnabled: boolean) {
  const items: SidebarItemDef[] = [];
  const sectionHeaders: Record<number, string> = {};
  const dividerAfter: number[] = [];

  const push = (item: SidebarItemDef) => { items.push(item); };
  const section = (name: string) => { sectionHeaders[items.length] = name; };
  const divider = () => { dividerAfter.push(items.length - 1); };

  // ── 1. DEMO GUIDE ─────────────────────────────────────────────────────────
  section('DEMO GUIDE');
  push({ label: 'Demo Flow',       path: '/demo-flow', icon: <Map size={16} strokeWidth={1.8} /> });
  push({ label: 'Getting Started', path: '/getting-started', icon: <Rocket size={16} strokeWidth={1.8} /> });
  push({ label: 'Architecture',    path: '/architecture',    icon: <Layers size={16} strokeWidth={1.8} /> });
  push({ label: 'Try Out',         path: '/try-out',         icon: <FlaskConical size={16} strokeWidth={1.8} /> });
  push({ label: 'Docs / Ref',      path: '/docs',            icon: <FileText size={16} strokeWidth={1.8} /> });
  divider();

  // ── 2. BUILD & REQUEST ────────────────────────────────────────────────────
  section('BUILD & REQUEST');
  push({ label: 'Marketplace',  path: '/marketplace',              icon: <ShoppingBag size={16} strokeWidth={1.8} /> });
  push({ label: 'Catalog',      path: '/catalog',                  icon: <BookOpen size={16} strokeWidth={1.8} /> });
  push({ label: 'Create',       path: '/create',                   icon: <Plus size={16} strokeWidth={1.8} /> });
  push({ label: 'Onboard App',  path: '/infra-onboarding/new',    icon: <Server size={16} strokeWidth={1.8} /> });
  push({ label: 'My Resources', path: '/infra-onboarding/resources', icon: <Package size={16} strokeWidth={1.8} /> });
  divider();

  // ── 3. CONTROL PLANE ──────────────────────────────────────────────────────
  section('CONTROL PLANE');
  push({ label: 'Crossplane', path: '/crossplane',            icon: <Cpu size={16} strokeWidth={1.8} /> });
  push({ label: 'GitOps',     path: '/gitops',                icon: <GitBranch size={16} strokeWidth={1.8} /> });
  push({ label: 'Day 2 Ops',  path: '/infra-onboarding/day2', icon: <Sliders size={16} strokeWidth={1.8} /> });
  if (karmadaEnabled)    push({ label: 'Karmada', path: '/karmada', icon: <Globe size={16} strokeWidth={1.8} /> });
  if (knativeDemoEnabled) push({ label: 'Knative', path: '/knative', icon: <Zap size={16} strokeWidth={1.8} /> });
  divider();

  // ── 4. OPERATIONS & INTELLIGENCE ──────────────────────────────────────────
  section('OPERATIONS');
  push({ label: 'Operations',     path: '/operations',           icon: <Activity size={16} strokeWidth={1.8} /> });
  push({ label: 'AIOps',          path: '/aiops',                icon: <Bot size={16} strokeWidth={1.8} /> });
  push({ label: 'Agent Command',  path: '/agent-command-center', icon: <Terminal size={16} strokeWidth={1.8} /> });
  push({ label: 'Autonomous Ops', path: '/autonomous-datacenter', icon: <Zap size={16} strokeWidth={1.8} /> });
  divider();

  // ── 5. SECURITY, COST & GOVERNANCE ────────────────────────────────────────
  section('GOVERNANCE');
  push({ label: 'Security',    path: '/security',                 icon: <Shield size={16} strokeWidth={1.8} /> });
  push({ label: 'Cost',        path: '/cost',                     icon: <DollarSign size={16} strokeWidth={1.8} /> });
  push({ label: 'FinOps',      path: '/finops-charge-visibility', icon: <BarChart3 size={16} strokeWidth={1.8} /> });
  push({ label: 'Infra Costs', path: '/infra-onboarding/costs',  icon: <TrendingUp size={16} strokeWidth={1.8} /> });
  divider();

  // ── 6. PLATFORM ADMIN ─────────────────────────────────────────────────────
  section('ADMIN');
  push({ label: 'Settings', path: '/settings', icon: <Settings size={16} strokeWidth={1.8} /> });
  push({ label: 'Home',     path: '/',          icon: <Home size={16} strokeWidth={1.8} /> });

  return { items, sectionHeaders, dividerAfter };
}

interface TopBarProps {
  title?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  scrolled?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ title, isDark, onToggleTheme, scrolled = false }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const p = theme.palette;
  const session = getSession();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) {
        if (e.key === 'Escape') setMenuOpen(false);
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [menuOpen]);

  const handleLogout = () => {
    clearSession();
    window.location.reload();
  };

  const initials = session?.persona ? session.persona.slice(0, 2).toUpperCase() : null;

  return (
    <header className={`apple-topbar${scrolled ? ' apple-topbar--scrolled' : ''}`}>
      {/* Breadcrumb — sidebar already shows DHL logo + IPP, so topbar shows context only */}
      <span style={{
        fontSize: '12px',
        fontWeight: 800,
        color: isDark ? dhl.yellow : dhl.black,
        fontFamily: tokens.font.sans,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        IPP
      </span>

      {title && (
        <>
          <span style={{ color: isDark ? 'var(--ds-hairline)' : 'rgba(0,0,0,0.3)', fontSize: '16px', lineHeight: 1 }}>/</span>
          <span style={{
            fontSize: '13px',
            fontWeight: 600,
            color: isDark ? 'var(--ds-text-primary)' : dhl.black,
            fontFamily: tokens.font.sans,
            letterSpacing: '-0.01em',
          }}>
            {title}
          </span>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Search */}
      <button
        onClick={() => navigate('/search')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '5px 11px',
          background: isDark ? 'var(--ds-surface-alt)' : 'rgba(0,0,0,0.08)',
          border: `1px solid ${isDark ? 'var(--ds-hairline)' : 'rgba(0,0,0,0.2)'}`,
          borderRadius: '7px',
          color: isDark ? 'var(--ds-text-tertiary)' : 'rgba(0,0,0,0.65)',
          fontSize: '12px',
          fontFamily: tokens.font.sans,
          cursor: 'pointer',
          transition: 'border-color 150ms ease, color 150ms ease, background 150ms ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? dhl.yellow : 'rgba(0,0,0,0.5)';
          (e.currentTarget as HTMLButtonElement).style.color = isDark ? 'var(--ds-text-primary)' : dhl.black;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? 'var(--ds-hairline)' : 'rgba(0,0,0,0.2)';
          (e.currentTarget as HTMLButtonElement).style.color = isDark ? 'var(--ds-text-tertiary)' : 'rgba(0,0,0,0.65)';
        }}
      >
        <Search size={13} strokeWidth={1.8} />
        <span>Search</span>
      </button>

      {/* Notifications bell */}
      <button
        aria-label="Notifications"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '7px',
          border: `1px solid ${isDark ? 'var(--ds-hairline)' : 'rgba(0,0,0,0.2)'}`,
          background: 'transparent',
          color: isDark ? 'var(--ds-text-secondary)' : 'rgba(0,0,0,0.65)',
          cursor: 'pointer',
          flexShrink: 0,
          position: 'relative',
          transition: 'border-color 150ms ease',
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? dhl.yellow : 'rgba(0,0,0,0.5)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? 'var(--ds-hairline)' : 'rgba(0,0,0,0.2)')}
      >
        <Bell size={14} strokeWidth={1.8} />
        {/* Notification dot */}
        <span style={{
          position: 'absolute',
          top: 5,
          right: 5,
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: dhl.red,
          border: `1.5px solid ${isDark ? 'var(--ds-surface)' : dhl.yellow}`,
          boxShadow: isDark ? 'none' : '0 0 0 1.5px rgba(0,0,0,0.08)',
        }} />
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={onToggleTheme}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: '7px',
          border: `1px solid ${isDark ? 'var(--ds-hairline)' : 'rgba(0,0,0,0.2)'}`,
          background: 'transparent',
          color: isDark ? 'var(--ds-text-secondary)' : 'rgba(0,0,0,0.65)',
          cursor: 'pointer',
          transition: 'color 150ms ease, border-color 150ms ease',
          flexShrink: 0,
        }}
        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? dhl.yellow : 'rgba(0,0,0,0.5)')}
        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.borderColor = isDark ? 'var(--ds-hairline)' : 'rgba(0,0,0,0.2)')}
      >
        {isDark ? <Sun size={14} strokeWidth={1.8} /> : <Moon size={14} strokeWidth={1.8} />}
      </button>

      {/* Profile avatar — DHL yellow background, black initials */}
      <div ref={menuRef} style={{ position: 'relative' }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: isDark ? dhl.yellow : dhl.black,
            border: 'none',
            color: isDark ? dhl.black : '#ffffff',
            fontSize: '11px',
            fontWeight: 800,
            fontFamily: tokens.font.sans,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '0.02em',
            flexShrink: 0,
            transition: 'transform 100ms ease',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)')}
          onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
          aria-label="User menu"
          aria-expanded={menuOpen}
        >
          {initials ?? <User size={14} strokeWidth={2} />}
        </button>

        {menuOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: 'var(--ds-surface)',
              border: `1px solid var(--ds-hairline)`,
              borderRadius: tokens.radius.inner,
              boxShadow: tokens.shadow.hover,
              minWidth: 200,
              zIndex: 200,
              overflow: 'hidden',
            }}
          >
            {session && (
              <div style={{ padding: '14px 16px', borderBottom: `1px solid var(--ds-hairline)` }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 4,
                }}>
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: dhl.yellow,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: dhl.black,
                    flexShrink: 0,
                  }}>
                    {initials ?? '?'}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--ds-text-primary)', fontFamily: tokens.font.sans }}>
                      {session.persona}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--ds-text-tertiary)', fontFamily: tokens.font.sans }}>
                      {session.username}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                color: dhl.red,
                fontSize: '13px',
                fontFamily: tokens.font.sans,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 150ms ease',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--ds-surface-alt)')}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
            >
              <LogOut size={13} strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export interface AppleShellProps {
  children?: React.ReactNode;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  contentStyle?: React.CSSProperties;
  noPadding?: boolean;
}

export const AppleShell = React.forwardRef<HTMLDivElement, AppleShellProps>(
  ({ children, title, className, style, contentStyle, noPadding = false }, ref) => {
    const appThemeApi = useApi(appThemeApiRef);
    const configApi = useApi(configApiRef);
    const location = useLocation();
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [scrolled, setScrolled] = React.useState(false);

    const karmadaEnabled = React.useMemo(() => {
      try { return configApi.getOptionalBoolean('karmada.enabled') ?? false; }
      catch { return false; }
    }, [configApi]);

    const knativeDemoEnabled = React.useMemo(() => {
      try { return configApi.getOptionalBoolean('knative.demoEnabled') ?? false; }
      catch { return false; }
    }, [configApi]);

    const { items: navItems, sectionHeaders, dividerAfter } = React.useMemo(
      () => buildNav(karmadaEnabled, knativeDemoEnabled),
      [karmadaEnabled, knativeDemoEnabled],
    );

    const [isDark, setIsDark] = React.useState(() => {
      const stored = appThemeApi.getActiveThemeId();
      // If no preference stored yet, default to light
      if (!stored) appThemeApi.setActiveThemeId('dhl-light');
      return stored === 'dhl-dark';
    });

    const toggleTheme = React.useCallback(() => {
      const next = isDark ? 'dhl-light' : 'dhl-dark';
      appThemeApi.setActiveThemeId(next);
      setIsDark(!isDark);
    }, [isDark, appThemeApi]);

    React.useEffect(() => {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }, [isDark]);

    React.useEffect(() => {
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
        setScrolled(false);
      }
    }, [location.pathname]);

    const handleContentScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
      setScrolled(e.currentTarget.scrollTop > 4);
    }, []);

    return (
      <div
        ref={ref}
        data-theme={isDark ? 'dark' : 'light'}
        className={`apple-shell ${className ?? ''}`}
        style={style}
      >
        <Sidebar
          items={navItems}
          dividerAfter={dividerAfter}
          sectionHeaders={sectionHeaders}
          featuredSection="DEMO GUIDE"
        />
        <main className="apple-main">
          <TopBar title={title} isDark={isDark} onToggleTheme={toggleTheme} scrolled={scrolled} />
          <div
            ref={contentRef}
            className="apple-content"
            onScroll={handleContentScroll}
            style={{ padding: noPadding ? 0 : undefined, ...contentStyle }}
          >
            <div key={location.pathname} className="ds-page-enter">
              {children}
            </div>
          </div>
        </main>
      </div>
    );
  },
);

AppleShell.displayName = 'AppleShell';
