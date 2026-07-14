import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import * as k8s from '@kubernetes/client-node';

export function createCrossplaneApplyAction() {
  return createTemplateAction<{
    manifest: Record<string, unknown>;
    namespace?: string;
    plural?: string;
  }>({
    id: 'crossplane:apply-claim',
    description: 'Apply a Crossplane claim directly to the Kubernetes cluster',
    schema: {
      input: {
        required: ['manifest'],
        type: 'object',
        properties: {
          manifest: {
            type: 'object',
            description: 'The Kubernetes manifest object to apply',
          },
          namespace: {
            type: 'string',
            description: 'Target namespace (overrides manifest metadata.namespace)',
          },
          plural: {
            type: 'string',
            description: 'Explicit plural resource name (overrides auto-computed kind + s)',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          claimName: { type: 'string' },
          namespace: { type: 'string' },
        },
      },
    },
    async handler(ctx) {
      const manifest = ctx.input.manifest as any;
      const namespace =
        ctx.input.namespace ||
        manifest?.metadata?.namespace ||
        'default';

      ctx.logger.info(
        `Applying Crossplane claim ${manifest?.metadata?.name} in namespace ${namespace}`,
      );

      const kc = new k8s.KubeConfig();
      kc.loadFromCluster();

      const coreApi = kc.makeApiClient(k8s.CoreV1Api);
      try {
        await coreApi.createNamespace({ metadata: { name: namespace } });
        ctx.logger.info(`Namespace ${namespace} created`);
      } catch (nsErr: any) {
        if (nsErr?.body?.reason !== 'AlreadyExists') {
          throw new Error(`Failed to create namespace: ${nsErr?.body?.message || nsErr.message}`);
        }
        ctx.logger.info(`Namespace ${namespace} already exists`);
      }

      const apiVersion = manifest.apiVersion as string;
      const kind = manifest.kind as string;

      // Native apps/v1 Deployment — patch replicas via AppsV1Api
      if (apiVersion === 'apps/v1' && kind === 'Deployment') {
        const appsApi = kc.makeApiClient(k8s.AppsV1Api);
        const name = manifest.metadata.name as string;
        const patch = { spec: { replicas: (manifest as any).spec?.replicas } };
        try {
          await appsApi.patchNamespacedDeployment(
            name,
            namespace,
            patch,
            undefined, undefined, undefined, undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } },
          );
          ctx.logger.info(`Deployment ${name} patched successfully`);
        } catch (err: any) {
          throw new Error(`Failed to patch Deployment: ${err?.body?.message || err.message}`);
        }
        ctx.output('claimName', name);
        ctx.output('namespace', namespace);
        return;
      }

      const customApi = kc.makeApiClient(k8s.CustomObjectsApi);

      const group = apiVersion.split('/')[0];
      const version = apiVersion.split('/')[1];
      const kindLower = kind.toLowerCase();
      const plural = ctx.input.plural ?? `${kindLower}s`;

      try {
        await customApi.createNamespacedCustomObject(
          group,
          version,
          namespace,
          plural,
          manifest,
        );
        ctx.logger.info(`Claim ${manifest.metadata.name} created successfully`);
      } catch (err: any) {
        if (err?.body?.reason === 'AlreadyExists') {
          ctx.logger.warn(
            `Claim ${manifest.metadata.name} already exists — skipping create`,
          );
        } else {
          throw new Error(
            `Failed to apply claim: ${err?.body?.message || err.message}`,
          );
        }
      }

      ctx.output('claimName', manifest.metadata.name);
      ctx.output('namespace', namespace);
    },
  });
}
