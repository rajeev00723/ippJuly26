import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

const IIP_SERVICE_URL =
  process.env.IIP_SERVICE_URL || 'http://iip-service.ipp-system.svc.cluster.local';

export function createIIPDestroyClaimAction() {
  return createTemplateAction<{
    claimName: string;
    claimKind?: string;
    businessUnit?: string;
    environment?: string;
    requestedBy?: string;
  }>({
    id: 'iip:destroy-claim',
    description: 'Delete a GitOps claim from Gitea via IIP Service — ArgoCD prune removes the resource',
    schema: {
      input: {
        required: ['claimName'],
        properties: {
          claimName:    { title: 'Claim Name',     type: 'string' },
          claimKind:    { title: 'Claim Kind',     type: 'string', default: 'VMAppClaim' },
          businessUnit: { title: 'Business Unit',  type: 'string', default: 'bu-demo' },
          environment:  { title: 'Environment',    type: 'string', default: 'dev' },
          requestedBy:  { title: 'Requested By',   type: 'string', default: '' },
        },
      },
      output: {
        properties: {
          claimName: { type: 'string' },
          claimPath: { type: 'string' },
          message:   { type: 'string' },
        },
      },
    },

    async handler(ctx) {
      const { claimName, claimKind, businessUnit, environment, requestedBy } = ctx.input;

      ctx.logger.info(`[IIP] Destroying claim ${claimName} via IIP Service at ${IIP_SERVICE_URL}`);

      const body = {
        claimName,
        claimKind:    claimKind    ?? 'VMAppClaim',
        businessUnit: businessUnit ?? 'bu-demo',
        environment:  environment  ?? 'dev',
        requestedBy:  requestedBy  ?? '',
      };

      let response: Response;
      try {
        response = await fetch(`${IIP_SERVICE_URL}/api/provision`, {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
      } catch (err: any) {
        throw new Error(`IIP Service unreachable at ${IIP_SERVICE_URL}: ${err.message}`);
      }

      const data = await response.json() as any;

      if (!response.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        throw new Error(`IIP Service rejected destroy (HTTP ${response.status}): ${detail}`);
      }

      ctx.logger.info(`[IIP] Claim deleted: ${data.claimPath}`);
      ctx.logger.info(`[IIP] ${data.message}`);

      ctx.output('claimName', data.claimName);
      ctx.output('claimPath', data.claimPath);
      ctx.output('message',   data.message);
    },
  });
}
