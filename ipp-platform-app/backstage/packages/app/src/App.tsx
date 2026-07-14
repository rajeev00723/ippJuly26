import React, { lazy, Suspense } from 'react';
import { Route } from 'react-router-dom';
import { apiDocsPlugin, ApiExplorerPage } from '@backstage/plugin-api-docs';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import {
  CatalogImportPage,
  catalogImportPlugin,
} from '@backstage/plugin-catalog-import';
import { CatalogGraphPage } from '@backstage/plugin-catalog-graph';
import { orgPlugin } from '@backstage/plugin-org';
import { ScaffolderPage, scaffolderPlugin } from '@backstage/plugin-scaffolder';
import dhlLogoSrc from './assets/dhl-logo.png';
import { SearchPage } from '@backstage/plugin-search';
import {
  TechDocsIndexPage,
  techdocsPlugin,
  TechDocsReaderPage,
} from '@backstage/plugin-techdocs';
import { UserSettingsPage } from '@backstage/plugin-user-settings';
import { UnifiedThemeProvider } from '@backstage/theme';
import { apis } from './apis';
import { entityPage } from './components/catalog/EntityPage';
import { searchPage } from './components/search/SearchPage';
import { Root } from './components/Root';
import { AlertDisplay, OAuthRequestDialog, SignInPage } from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { appleThemeLight, appleThemeDark } from './design-system/theme';
import { AppleShell } from './design-system/primitives/AppleShell';

// ── Persona login gate (must load eagerly — it guards all other routes) ──────
import { PersonaLoginGate } from './components/personas/PersonaLoginGate';

// ── Lazy-load all heavy persona / tool pages ─────────────────────────────────
const LandingPage                = lazy(() => import('./components/personas/LandingPage').then(m => ({ default: m.LandingPage })));
const DeveloperDashboardPage     = lazy(() => import('./components/personas/DeveloperDashboardPage').then(m => ({ default: m.DeveloperDashboardPage })));
const PlatformEngineerDashboardPage = lazy(() => import('./components/personas/PlatformEngineerDashboardPage').then(m => ({ default: m.PlatformEngineerDashboardPage })));
const OperationsDashboardPage    = lazy(() => import('./components/personas/OperationsDashboardPage').then(m => ({ default: m.OperationsDashboardPage })));
const SecurityDashboardPage      = lazy(() => import('./components/personas/SecurityDashboardPage').then(m => ({ default: m.SecurityDashboardPage })));
const CrossplaneDashboardPage    = lazy(() => import('./components/personas/CrossplaneDashboardPage').then(m => ({ default: m.CrossplaneDashboardPage })));
const GitOpsDashboardPage        = lazy(() => import('./components/personas/GitOpsDashboardPage').then(m => ({ default: m.GitOpsDashboardPage })));
const AIOpsDashboardPage         = lazy(() => import('./components/personas/AIOpsDashboardPage').then(m => ({ default: m.AIOpsDashboardPage })));
const CostDashboardPage          = lazy(() => import('./components/personas/CostDashboardPage').then(m => ({ default: m.CostDashboardPage })));
const SecurityPosturePage        = lazy(() => import('./components/personas/SecurityPosturePage').then(m => ({ default: m.SecurityPosturePage })));
const TechnologyProviderDashboardPage = lazy(() => import('./components/personas/TechnologyProviderDashboardPage').then(m => ({ default: m.TechnologyProviderDashboardPage })));
const AgentCommandCenterPage     = lazy(() => import('./components/personas/AgentCommandCenterPage').then(m => ({ default: m.AgentCommandCenterPage })));
const AIOpsInteractiveChatPage   = lazy(() => import('./components/personas/AIOpsInteractiveChatPage').then(m => ({ default: m.AIOpsInteractiveChatPage })));
const FinOpsChargeVisibilityPage = lazy(() => import('./components/personas/FinOpsChargeVisibilityPage').then(m => ({ default: m.FinOpsChargeVisibilityPage })));
const AutonomousDataCenterPage   = lazy(() => import('./components/personas/AutonomousDataCenterPage').then(m => ({ default: m.AutonomousDataCenterPage })));
const MarketplacePage            = lazy(() => import('./components/marketplace/MarketplacePage').then(m => ({ default: m.MarketplacePage })));
const KarmadaDashboardPage       = lazy(() => import('./components/personas/KarmadaDashboardPage').then(m => ({ default: m.KarmadaDashboardPage })));
const KnativeDashboardPage       = lazy(() => import('./components/personas/KnativeDashboardPage').then(m => ({ default: m.KnativeDashboardPage })));
const DesignSystemShowcasePage   = lazy(() => import('./components/personas/DesignSystemShowcasePage').then(m => ({ default: m.DesignSystemShowcasePage })));
const LandingV2                  = lazy(() => import('./components/personas/LandingV2').then(m => ({ default: m.LandingV2 })));
const GettingStartedPage         = lazy(() => import('./components/personas/GettingStartedPage').then(m => ({ default: m.GettingStartedPage })));
const HowItWorksPage             = lazy(() => import('./components/personas/HowItWorksPage').then(m => ({ default: m.HowItWorksPage })));
const ArchitecturePage           = lazy(() => import('./components/personas/ArchitecturePage').then(m => ({ default: m.ArchitecturePage })));
const DemoFlowPage               = lazy(() => import('./components/personas/DemoFlowPage').then(m => ({ default: m.DemoFlowPage })));
const TryOutPage                 = lazy(() => import('./components/personas/TryOutPage').then(m => ({ default: m.TryOutPage })));
const InfraOnboardingPage        = lazy(() => import('./components/infra-onboarding/InfraOnboardingPage').then(m => ({ default: m.InfraOnboardingPage })));

// ── Route-level loading fallback — skeleton shell matching AppleShell layout ──
const PageLoader = () => (
  <div style={{
    display: 'flex',
    height: '100vh',
    width: '100vw',
    background: 'var(--ds-bg, #fbfbfd)',
    fontFamily: "'Inter','DM Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
  }}>
    <style>{`
      @keyframes ds-shimmer {
        0%   { background-position: -400px 0; }
        100% { background-position:  400px 0; }
      }
      .ds-skel {
        background: linear-gradient(90deg, var(--ds-surface-alt,#f5f5f7) 25%, var(--ds-surface,#fff) 50%, var(--ds-surface-alt,#f5f5f7) 75%);
        background-size: 800px 100%;
        animation: ds-shimmer 1.4s ease-in-out infinite;
        border-radius: 8px;
      }
      @media (prefers-reduced-motion: reduce) {
        .ds-skel { animation: none; background: var(--ds-surface-alt,#f5f5f7); }
      }
    `}</style>

    {/* Sidebar skeleton */}
    <div style={{ width: 240, flexShrink: 0, height: '100vh', background: 'var(--ds-surface,#fff)', borderRight: '1px solid var(--ds-hairline,rgba(0,0,0,0.08))', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="ds-skel" style={{ width: 80, height: 20, marginBottom: 20 }} />
      {[1,2,3,4,5].map(i => <div key={i} className="ds-skel" style={{ width: `${60 + i * 5}%`, height: 14 }} />)}
      <div style={{ height: 1, background: 'var(--ds-hairline,rgba(0,0,0,0.08))', margin: '8px 0' }} />
      {[1,2,3].map(i => <div key={i} className="ds-skel" style={{ width: `${50 + i * 8}%`, height: 14 }} />)}
    </div>

    {/* Main area skeleton */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {/* Topbar skeleton */}
      <div style={{ height: 64, background: 'var(--ds-surface,#fff)', borderBottom: '1px solid var(--ds-hairline,rgba(0,0,0,0.08))', display: 'flex', alignItems: 'center', padding: '0 32px', gap: 12 }}>
        <div className="ds-skel" style={{ width: 120, height: 16 }} />
        <div style={{ flex: 1 }} />
        <div className="ds-skel" style={{ width: 140, height: 30, borderRadius: 8 }} />
        <div className="ds-skel" style={{ width: 34, height: 34, borderRadius: 8 }} />
        <div className="ds-skel" style={{ width: 34, height: 34, borderRadius: '50%' }} />
      </div>

      {/* Content skeleton */}
      <div style={{ flex: 1, padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="ds-skel" style={{ width: 80, height: 12 }} />
          <div className="ds-skel" style={{ width: 320, height: 32 }} />
          <div className="ds-skel" style={{ width: 240, height: 16 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {[1,2,3,4,5].map(i => <div key={i} className="ds-skel" style={{ height: 90, borderRadius: 18 }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="ds-skel" style={{ height: 200, borderRadius: 18 }} />
          <div className="ds-skel" style={{ height: 200, borderRadius: 18 }} />
        </div>
      </div>
    </div>
  </div>
);

const app = createApp({
  apis,
  components: {
    // Silent guest sign-in: gives the frontend a real user token so
    // cookie-authenticated requests (TechDocs static content) succeed.
    SignInPage: props => <SignInPage {...props} auto providers={['guest']} />,
  },
  themes: [
    { id: 'dhl-light', title: 'DHL Light', variant: 'light', Provider: ({ children }) => (
      <UnifiedThemeProvider theme={appleThemeLight} noCssBaseline>{children}</UnifiedThemeProvider>
    )},
    { id: 'dhl-dark', title: 'DHL Dark', variant: 'dark', Provider: ({ children }) => (
      <UnifiedThemeProvider theme={appleThemeDark} noCssBaseline>{children}</UnifiedThemeProvider>
    )},
  ],
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, {
      createComponent: scaffolderPlugin.routes.root,
      viewTechDoc: techdocsPlugin.routes.docRoot,
      createFromTemplate: scaffolderPlugin.routes.selectedTemplate,
    });
    bind(apiDocsPlugin.externalRoutes, {
      registerApi: catalogImportPlugin.routes.importPage,
    });
    bind(scaffolderPlugin.externalRoutes, {
      registerComponent: catalogImportPlugin.routes.importPage,
      viewTechDoc: techdocsPlugin.routes.docRoot,
    });
    bind(orgPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
  },
});

// ── Persona routes — all gated behind PersonaLoginGate ────────────────────────
const PERSONA_ROUTES = [
  { path: '/developer',  element: <DeveloperDashboardPage />,          persona: 'developer' },
  { path: '/platform',   element: <PlatformEngineerDashboardPage />,   persona: 'platform' },
  { path: '/operations', element: <OperationsDashboardPage />,         persona: 'operations' },
  { path: '/security',   element: <SecurityDashboardPage />,           persona: 'security' },
  { path: '/provider',   element: <TechnologyProviderDashboardPage />, persona: 'provider' },
] as const;

// Tool pages: accessible once any persona is logged in
const TOOL_ROUTES = [
  { path: '/crossplane',               element: <CrossplaneDashboardPage /> },
  { path: '/gitops',                   element: <GitOpsDashboardPage /> },
  { path: '/aiops',                    element: <AIOpsDashboardPage /> },
  { path: '/cost',                     element: <CostDashboardPage /> },
  { path: '/security-posture',         element: <SecurityPosturePage /> },
  { path: '/agent-command-center',     element: <AgentCommandCenterPage /> },
  { path: '/aiops-chat',               element: <AIOpsInteractiveChatPage /> },
  { path: '/finops-charge-visibility', element: <FinOpsChargeVisibilityPage /> },
  { path: '/autonomous-datacenter',    element: <AutonomousDataCenterPage /> },
  { path: '/karmada',                  element: <KarmadaDashboardPage /> },
  { path: '/knative',                  element: <KnativeDashboardPage /> },
] as const;

const routes = (
  <FlatRoutes>
    {/* Landing / persona selection — always accessible */}
    <Route path="/" element={<Suspense fallback={<PageLoader />}><LandingV2 /></Suspense>} />
    <Route path="/self-service-private-cloud" element={<Suspense fallback={<PageLoader />}><LandingV2 /></Suspense>} />
    <Route path="/landing-v1" element={<Suspense fallback={<PageLoader />}><LandingPage /></Suspense>} />

    {/* Marketplace — accessible to any logged-in persona */}
    <Route
      path="/marketplace"
      element={
        <PersonaLoginGate persona="any">
          <Suspense fallback={<PageLoader />}><MarketplacePage /></Suspense>
        </PersonaLoginGate>
      }
    />

    {/* Persona-gated routes */}
    {PERSONA_ROUTES.map(({ path, element, persona }) => (
      <Route
        key={path}
        path={path}
        element={
          <PersonaLoginGate persona={persona}>
            <Suspense fallback={<PageLoader />}>{element}</Suspense>
          </PersonaLoginGate>
        }
      />
    ))}

    {/* Tool pages — gated: any persona session */}
    {TOOL_ROUTES.map(({ path, element }) => (
      <Route
        key={path}
        path={path}
        element={
          <PersonaLoginGate persona="any">
            <Suspense fallback={<PageLoader />}>{element}</Suspense>
          </PersonaLoginGate>
        }
      />
    ))}

    {/* Guide pages — no persona gate */}
    <Route path="/demo-flow"       element={<Suspense fallback={<PageLoader />}><DemoFlowPage /></Suspense>} />
    <Route path="/getting-started" element={<Suspense fallback={<PageLoader />}><GettingStartedPage /></Suspense>} />
    <Route path="/how-it-works"    element={<Suspense fallback={<PageLoader />}><HowItWorksPage /></Suspense>} />
    <Route path="/architecture"    element={<Suspense fallback={<PageLoader />}><ArchitecturePage /></Suspense>} />
    <Route path="/try-out"         element={<Suspense fallback={<PageLoader />}><TryOutPage /></Suspense>} />

    {/* Design system showcase — no persona gate */}
    <Route path="/design-system" element={<Suspense fallback={<PageLoader />}><DesignSystemShowcasePage /></Suspense>} />

    {/* Standard Backstage routes — wrapped in AppleShell for consistent DHL chrome */}
    <Route path="/catalog" element={
      <AppleShell title="Catalog"><CatalogIndexPage /></AppleShell>
    } />
    <Route path="/catalog/:namespace/:kind/:name" element={
      <AppleShell title="Catalog"><CatalogEntityPage /></AppleShell>
    }>
      {entityPage}
    </Route>
    <Route path="/docs" element={
      <AppleShell title="Docs"><TechDocsIndexPage /></AppleShell>
    } />
    <Route path="/docs/:namespace/:kind/:name/*" element={
      <AppleShell title="Docs" noPadding><TechDocsReaderPage /></AppleShell>
    } />
    <Route path="/create" element={
      <AppleShell title="Create">
        <ScaffolderPage
          headerOptions={{
            title: 'Self-Service Templates',
            subtitle: 'Provision, manage, or decommission platform resources using standard templates',
          }}
          groups={[
            {
              title: (
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img src={dhlLogoSrc} alt="DHL" style={{ height: '28px', width: 'auto', objectFit: 'contain' }} />
                  <span>Public &amp; Private Cloud Self Service</span>
                </span>
              ),
              // Consolidated 5: day0, day2, brownfield, greenfield, yaml-upload
              filter: entity =>
                !entity.metadata.tags?.includes('_deprecated') &&
                !entity.metadata.tags?.includes('iip'),
            },
            {
              title: 'IIP — Infrastructure Interface Platform (GitOps)',
              // IIP templates: tagged with 'iip'
              filter: entity =>
                entity.metadata.tags?.includes('iip') === true,
            },
          ]}
          // Globally exclude deprecated templates from the Create page
          templateFilter={entity =>
            !entity.metadata.tags?.includes('_deprecated')
          }
        />
      </AppleShell>
    } />
    <Route path="/api-docs" element={
      <AppleShell title="API Docs"><ApiExplorerPage /></AppleShell>
    } />
    <Route path="/catalog-graph" element={
      <AppleShell title="Catalog Graph" noPadding>
        <CatalogGraphPage
          initialState={{
            selectedKinds: ['component', 'system', 'api', 'group'],
            selectedRelations: ['dependsOn', 'hasPart', 'ownedBy', 'providesApi', 'consumesApi'],
          }}
        />
      </AppleShell>
    } />
    <Route path="/catalog-import" element={
      <AppleShell title="Import"><CatalogImportPage /></AppleShell>
    } />
    <Route path="/search" element={
      <AppleShell title="Search"><SearchPage /></AppleShell>
    }>{searchPage}</Route>
    <Route path="/settings" element={
      <AppleShell title="Settings"><UserSettingsPage /></AppleShell>
    } />

    {/* Platform Engineering — Infra Onboarding plugin */}
    <Route
      path="/infra-onboarding/*"
      element={
        <PersonaLoginGate persona="any">
          <Suspense fallback={<PageLoader />}><InfraOnboardingPage /></Suspense>
        </PersonaLoginGate>
      }
    />
  </FlatRoutes>
);

export default app.createRoot(
  <>
    <AlertDisplay />
    <OAuthRequestDialog />
    <AppRouter>
      <Root>{routes}</Root>
    </AppRouter>
  </>,
);
