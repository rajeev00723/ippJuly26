import { createBackend } from '@backstage/backend-defaults';
import { createBackendModule } from '@backstage/backend-plugin-api';
import { scaffolderActionsExtensionPoint } from '@backstage/plugin-scaffolder-node';
import { createCrossplaneApplyAction } from './actions/crossplaneApply';
import { createKubernetesDeleteAction } from './actions/kubernetesDelete';
import { createKnativeDeployAction } from './actions/knativeDeploy';
import { createIIPSubmitClaimAction } from './actions/iipSubmitClaim';
import { createIIPDestroyClaimAction } from './actions/iipDestroyClaim';

const backend = createBackend();

backend.add(import('@backstage/plugin-app-backend/alpha'));
// Guest auth issues real user tokens so cookie-authenticated endpoints
// (TechDocs static content) work; dangerouslyDisableDefaultAuthPolicy alone
// cannot satisfy the /.backstage/auth/v1/cookie flow, which needs a user principal.
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-catalog-backend/alpha'));
backend.add(import('@backstage/plugin-catalog-backend-module-scaffolder-entity-model'));
backend.add(import('@backstage/plugin-catalog-backend-module-unprocessed'));
backend.add(import('@backstage/plugin-proxy-backend/alpha'));
backend.add(import('@backstage/plugin-scaffolder-backend/alpha'));
backend.add(import('@backstage/plugin-search-backend/alpha'));
backend.add(import('@backstage/plugin-techdocs-backend/alpha'));

// Custom scaffolder actions module — registers crossplane:apply-claim
const crossplaneScaffolderModule = createBackendModule({
  pluginId: 'scaffolder',
  moduleId: 'crossplane-actions',
  register(env) {
    env.registerInit({
      deps: {
        scaffolder: scaffolderActionsExtensionPoint,
      },
      async init({ scaffolder }) {
        scaffolder.addActions(createCrossplaneApplyAction());
        scaffolder.addActions(createKubernetesDeleteAction());
        scaffolder.addActions(createKnativeDeployAction());
        scaffolder.addActions(createIIPSubmitClaimAction());
        scaffolder.addActions(createIIPDestroyClaimAction());
      },
    });
  },
});
backend.add(crossplaneScaffolderModule);

backend.start();
