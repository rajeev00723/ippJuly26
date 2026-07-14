import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import * as k8s from '@kubernetes/client-node';

export function createKnativeDeployAction() {
  return createTemplateAction<{
    serviceName: string;
    namespace: string;
    image: string;
    minScale?: number;
    maxScale?: number;
    concurrency?: number;
    memoryMi?: number;
    environment?: string;
    ownerTeam?: string;
  }>({
    id: 'knative:deploy-service',
    description: 'Deploy a Knative Serving Service (scale-to-zero) onto the cluster',
    schema: {
      input: {
        required: ['serviceName', 'namespace', 'image'],
        type: 'object',
        properties: {
          serviceName: { type: 'string', description: 'Knative Service name' },
          namespace:   { type: 'string', description: 'Target namespace' },
          image:       { type: 'string', description: 'Container image (registry/repo:tag)' },
          minScale:    { type: 'number', description: 'Minimum replicas (0 = scale-to-zero)', default: 0 },
          maxScale:    { type: 'number', description: 'Maximum replicas under load',           default: 5 },
          concurrency: { type: 'number', description: 'Target concurrent requests per pod',   default: 10 },
          memoryMi:    { type: 'number', description: 'Memory limit in MiB',                  default: 256 },
          environment: { type: 'string', description: 'Environment label (dev/staging/prod)', default: 'dev' },
          ownerTeam:   { type: 'string', description: 'Owning team label',                    default: 'developers' },
        },
      },
      output: {
        type: 'object',
        properties: {
          serviceName: { type: 'string' },
          namespace:   { type: 'string' },
          serviceUrl:  { type: 'string' },
        },
      },
    },
    async handler(ctx) {
      const {
        serviceName, namespace, image,
        minScale    = 0,
        maxScale    = 5,
        concurrency = 10,
        memoryMi    = 256,
        environment = 'dev',
        ownerTeam   = 'developers',
      } = ctx.input;

      ctx.logger.info(`Deploying Knative Service ${serviceName} in ${namespace}`);

      const kc = new k8s.KubeConfig();
      kc.loadFromCluster();

      // Ensure namespace exists
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

      const manifest = {
        apiVersion: 'serving.knative.dev/v1',
        kind: 'Service',
        metadata: {
          name: serviceName,
          namespace,
          labels: {
            app: serviceName,
            team: ownerTeam,
            environment,
            'managed-by': 'backstage-idp',
          },
          annotations: {
            'autoscaling.knative.dev/scale-to-zero-grace-period': '60s',
            'serving.knative.dev/creator': 'idp-platform',
          },
        },
        spec: {
          template: {
            metadata: {
              annotations: {
                'autoscaling.knative.dev/min-scale': String(minScale),
                'autoscaling.knative.dev/max-scale': String(maxScale),
                'autoscaling.knative.dev/target':    String(concurrency),
              },
            },
            spec: {
              containerConcurrency: concurrency,
              timeoutSeconds: 300,
              containers: [
                {
                  image,
                  ports: [{ containerPort: 8080, protocol: 'TCP' }],
                  resources: {
                    requests: { memory: `${memoryMi}Mi`, cpu: '100m' },
                    limits:   { memory: `${memoryMi}Mi`, cpu: '1000m' },
                  },
                  env: [
                    { name: 'APP_ENV', value: environment },
                    { name: 'PORT',    value: '8080' },
                  ],
                  readinessProbe: {
                    httpGet: { path: '/healthz', port: 8080 },
                    initialDelaySeconds: 5,
                    periodSeconds: 5,
                  },
                },
              ],
            },
          },
          traffic: [{ latestRevision: true, percent: 100 }],
        },
      };

      const customApi = kc.makeApiClient(k8s.CustomObjectsApi);
      try {
        await customApi.createNamespacedCustomObject(
          'serving.knative.dev', 'v1', namespace, 'services', manifest,
        );
        ctx.logger.info(`Knative Service ${serviceName} created`);
      } catch (err: any) {
        if (err?.body?.reason === 'AlreadyExists') {
          // Patch the existing service with a new image / config
          ctx.logger.info(`Knative Service ${serviceName} already exists — patching`);
          await customApi.patchNamespacedCustomObject(
            'serving.knative.dev', 'v1', namespace, 'services', serviceName,
            manifest,
            undefined, undefined, undefined,
            { headers: { 'Content-Type': 'application/merge-patch+json' } },
          );
          ctx.logger.info(`Knative Service ${serviceName} patched`);
        } else {
          throw new Error(`Failed to deploy Knative Service: ${err?.body?.message || err.message}`);
        }
      }

      const serviceUrl = `http://${serviceName}.${namespace}.svc.cluster.local`;
      ctx.output('serviceName', serviceName);
      ctx.output('namespace', namespace);
      ctx.output('serviceUrl', serviceUrl);
    },
  });
}
