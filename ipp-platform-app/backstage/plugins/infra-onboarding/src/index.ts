/**
 * @internal/backstage-plugin-infra-onboarding
 *
 * Frontend plugin for self-service infrastructure onboarding.
 *
 * DEMO BUILD NOTE:
 * For this demo, all UI components are implemented inside the app package at:
 *   packages/app/src/components/infra-onboarding/
 * This avoids the circular dependency that would arise from importing the
 * app's custom design system (AppleShell, tokens, etc.) into a separate package.
 *
 * TODO[ENTERPRISE]: Extract design system into @internal/backstage-design-system
 * and move all plugin code here. Register via createPlugin() / createApiFactory().
 * Example enterprise setup:
 *
 *   import { createPlugin, createRouteRef } from '@backstage/core-plugin-api';
 *   export const rootRouteRef = createRouteRef({ id: 'infra-onboarding' });
 *   export const infraOnboardingPlugin = createPlugin({
 *     id: 'infra-onboarding',
 *     routes: { root: rootRouteRef },
 *     apis: [
 *       createApiFactory({
 *         api: infraOnboardingApiRef,
 *         deps: { identityApi: identityApiRef, configApi: configApiRef },
 *         factory: ({ identityApi, configApi }) =>
 *           new InfraOnboardingClient({ identityApi, configApi }),
 *       }),
 *     ],
 *   });
 *   export { InfraOnboardingPage } from './components/InfraOnboardingPage';
 */

// Re-export types for enterprise consumers.
export type {
  InfraRequest,
  InfraResource,
  CostBreakdown,
  ProvisioningResult,
} from '../../app/src/components/infra-onboarding/types';
