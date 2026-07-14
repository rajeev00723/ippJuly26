import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import {
  TechDocsClient,
  techdocsApiRef,
} from '@backstage/plugin-techdocs';

// Wrap TechDocsClient so getCookie() silently succeeds even when the backend
// returns 401 (which happens in this demo because the legacy auth backend plugin
// is incompatible with the new backend system and fails to start, leaving the
// cookie endpoint with no user token to validate against).
class GuestTechDocsClient extends TechDocsClient {
  async getCookie() {
    try {
      return await super.getCookie();
    } catch {
      // Cookie auth is not strictly required when dangerouslyDisableDefaultAuthPolicy
      // is true — static files are served without credential checks. Return a
      // placeholder so the TechDocs reader proceeds to render the docs.
      return { expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
    }
  }
}

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),
  ScmAuth.createDefaultApiFactory(),
  createApiFactory({
    api: techdocsApiRef,
    deps: { configApi: configApiRef, discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ configApi, discoveryApi, fetchApi }) =>
      new GuestTechDocsClient({ configApi, discoveryApi, fetchApi }),
  }),
];
