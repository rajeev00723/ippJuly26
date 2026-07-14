import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import * as k8s from '@kubernetes/client-node';

export function createKubernetesDeleteAction() {
  return createTemplateAction<{
    apiVersion: string;
    kind: string;
    name: string;
    namespace: string;
    plural?: string;
  }>({
    id: 'kubernetes:delete-resource',
    description: 'Deletes a Kubernetes resource by kind, name and namespace',
    schema: {
      input: {
        required: ['apiVersion', 'kind', 'name', 'namespace'],
        type: 'object',
        properties: {
          apiVersion: { type: 'string', title: 'API Version', description: 'e.g. platform.iip.com/v1alpha1' },
          kind: { type: 'string', title: 'Kind', description: 'e.g. ThreeTierAppClaim' },
          name: { type: 'string', title: 'Resource Name' },
          namespace: { type: 'string', title: 'Namespace' },
          plural: { type: 'string', title: 'Plural', description: 'Explicit plural resource name (overrides auto-computed kind + s)' },
        },
      },
    },
    async handler(ctx) {
      const { apiVersion, kind } = ctx.input;
      // Form values arrive with stray whitespace surprisingly often; an
      // untrimmed name 404s and used to be misreported as "already deleted".
      const name = ctx.input.name.trim();
      const namespace = ctx.input.namespace.trim();
      const kc = new k8s.KubeConfig();
      kc.loadFromCluster();

      const [group, version] = apiVersion.includes('/')
        ? apiVersion.split('/')
        : ['', apiVersion];

      const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
      const coreApi = kc.makeApiClient(k8s.CoreV1Api);
      const appsApi = kc.makeApiClient(k8s.AppsV1Api);

      ctx.logger.info(`Deleting ${kind}/${name} in namespace ${namespace}`);
      try {
        const plural = ctx.input.plural ?? `${kind.toLowerCase()}s`;
        if (group) {
          // @kubernetes/client-node v0.20.x uses positional parameters
          await customApi.deleteNamespacedCustomObject(group, version, namespace, plural, name);
        } else if (kind === 'Deployment') {
          await appsApi.deleteNamespacedDeployment(name, namespace);
        } else if (kind === 'Service') {
          await coreApi.deleteNamespacedService(name, namespace);
        } else if (kind === 'Namespace') {
          await coreApi.deleteNamespace(name);
        } else {
          ctx.logger.warn(`Unsupported kind for deletion: ${kind}. Trying CustomObjectsApi.`);
          await customApi.deleteNamespacedCustomObject(group || 'apps', version || 'v1', namespace, `${kind.toLowerCase()}s`, name);
        }
        ctx.logger.info(`Successfully deleted ${kind}/${name}`);
      } catch (err: any) {
        if (err?.response?.statusCode === 404 || err?.statusCode === 404) {
          ctx.logger.warn(
            `${kind} "${name}" not found in namespace "${namespace}" — nothing was deleted. ` +
            `If you expected a deletion, check the resource name (list with: kubectl get ${ctx.input.plural ?? `${kind.toLowerCase()}s`} -A).`,
          );
        } else {
          throw new Error(`Failed to delete ${kind}/${name}: ${err.message}`);
        }
      }
    },
  });
}
