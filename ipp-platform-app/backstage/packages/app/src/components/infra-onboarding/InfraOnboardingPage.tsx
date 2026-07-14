import React, { lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Rocket, Layers, Sliders, TrendingUp, Wand2, Upload } from 'lucide-react';
import { AppleShell } from '../../design-system/primitives/AppleShell';
import { FONT } from './components/shared';

const OnboardingWizard = lazy(() =>
  import('./components/OnboardingWizard').then(m => ({ default: m.OnboardingWizard })),
);
const YamlUpload = lazy(() =>
  import('./components/YamlUpload').then(m => ({ default: m.YamlUpload })),
);
const MyResourcesPage = lazy(() =>
  import('./components/MyResources').then(m => ({ default: m.MyResourcesPage })),
);
const Day2OpsPage = lazy(() =>
  import('./components/Day2Ops').then(m => ({ default: m.Day2OpsPage })),
);
const CostDashboardPage = lazy(() =>
  import('./components/CostDashboard').then(m => ({ default: m.CostDashboardPage })),
);

const TAB_TITLES: Record<string, string> = {
  new:       'Onboard New App',
  resources: 'My Resources',
  day2:      'Day 2 Operations',
  costs:     'Cost Dashboard',
};

const PageSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {[80, 200, 160].map((h, i) => (
      <div key={i} style={{ height: h, borderRadius: 16, background: 'var(--ds-surface-alt)', animation: 'io-shimmer 1.4s ease-in-out infinite' }} />
    ))}
    <style>{`@keyframes io-shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
  </div>
);

// ── New App page — tab toggle between Wizard and YAML upload ──────────────────

const NewAppPage: React.FC = () => {
  const [tab, setTab] = React.useState<'wizard' | 'yaml'>('wizard');
  return (
    <div>
      {/* Tab toggle */}
      <div style={{
        display: 'inline-flex', background: 'var(--ds-surface-alt)',
        borderRadius: 10, padding: 3, marginBottom: 24, gap: 2,
      }}>
        {(['wizard', 'yaml'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, fontFamily: FONT,
              background: tab === t ? 'var(--ds-surface)' : 'transparent',
              color: tab === t ? 'var(--ds-text-primary)' : 'var(--ds-text-tertiary)',
              boxShadow: tab === t ? '0 1px 3px var(--ds-hairline)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {t === 'wizard'
              ? <><Wand2 size={13} strokeWidth={1.5} />Guided Wizard</>
              : <><Upload size={13} strokeWidth={1.5} />Upload YAML</>
            }
          </button>
        ))}
      </div>

      <Suspense fallback={<PageSkeleton />}>
        {tab === 'wizard' ? <OnboardingWizard /> : <YamlUpload />}
      </Suspense>
    </div>
  );
};

// ── Shell wrapper for each sub-page ──────────────────────────────────────────

const SubPage: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const navigate = useNavigate();
  return (
    <AppleShell title={`Platform Engineering / ${title}`}>
      <button
        onClick={() => navigate('/infra-onboarding/')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--ds-text-tertiary)',
          fontSize: 12,
          fontFamily: FONT,
          fontWeight: 500,
          marginBottom: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
      >
        ← Platform Engineering
      </button>
      <h1 style={{ margin: '0 0 20px', fontSize: 26, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-primary)', letterSpacing: '-0.02em' }}>
        {title}
      </h1>
      {children}
    </AppleShell>
  );
};

// ── Router ────────────────────────────────────────────────────────────────────

export const InfraOnboardingPage: React.FC = () => (
  <Routes>
    <Route path="new" element={
      <SubPage title="Onboard New App">
        <NewAppPage />
      </SubPage>
    } />
    <Route path="resources" element={
      <SubPage title="My Resources">
        <Suspense fallback={<PageSkeleton />}><MyResourcesPage /></Suspense>
      </SubPage>
    } />
    <Route path="day2" element={
      <SubPage title="Day 2 Operations">
        <Suspense fallback={<PageSkeleton />}><Day2OpsPage /></Suspense>
      </SubPage>
    } />
    <Route path="costs" element={
      <SubPage title="Cost Dashboard">
        <Suspense fallback={<PageSkeleton />}><CostDashboardPage /></Suspense>
      </SubPage>
    } />
    <Route path="*" element={<InfraOnboardingLanding />} />
  </Routes>
);

const InfraOnboardingLanding: React.FC = () => {
  const navigate = useNavigate();
  return (
    <AppleShell title="Platform Engineering">
      <h1 style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-primary)', letterSpacing: '-0.02em' }}>
        Platform Engineering
      </h1>
      <p style={{ margin: '0 0 32px', fontSize: 14, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>
        Self-service infrastructure provisioning for your applications.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {[
          { path: '/infra-onboarding/new',       Icon: Rocket,     title: 'Onboard New App',   desc: 'Provision Kubernetes or VM infrastructure' },
          { path: '/infra-onboarding/resources', Icon: Layers,     title: 'My Resources',      desc: 'View and manage provisioned infrastructure' },
          { path: '/infra-onboarding/day2',      Icon: Sliders,    title: 'Day 2 Operations',  desc: 'Scale, restart, and snapshot resources' },
          { path: '/infra-onboarding/costs',     Icon: TrendingUp, title: 'Cost Dashboard',    desc: 'Forecasted vs actual spend breakdown' },
        ].map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              padding: 20, textAlign: 'left', cursor: 'pointer',
              border: '1px solid var(--ds-hairline)',
              borderRadius: 16,
              background: 'var(--ds-surface)',
              boxShadow: 'var(--ds-shadow-resting)',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--ds-shadow-hover)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--ds-shadow-resting)')}
          >
            <div style={{ marginBottom: 10, color: 'var(--ds-chip-info-text)' }}>
              <item.Icon size={26} strokeWidth={1.5} />
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, fontFamily: FONT, color: 'var(--ds-text-primary)' }}>{item.title}</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ds-text-secondary)', fontFamily: FONT }}>{item.desc}</p>
          </button>
        ))}
      </div>
    </AppleShell>
  );
};
