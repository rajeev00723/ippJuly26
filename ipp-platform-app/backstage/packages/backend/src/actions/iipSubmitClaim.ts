import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

const IIP_SERVICE_URL =
  process.env.IIP_SERVICE_URL || 'http://iip-service.ipp-system.svc.cluster.local';

export function createIIPSubmitClaimAction() {
  return createTemplateAction<{
    manifest: Record<string, unknown>;
    requestedBy: string;
    costCenter?: string;
    requestId?: string;
    businessUnit?: string;
    environment?: string;
  }>({
    id: 'iip:submit-claim',
    description: 'Submit a Crossplane claim to IIP Service for GitOps provisioning via @ipp-automation-bot',
    schema: {
      input: {
        required: ['manifest', 'requestedBy'],
        properties: {
          manifest: {
            title: 'Claim Manifest',
            description: 'Full Crossplane claim as a JS object',
            type: 'object',
          },
          requestedBy: {
            title: 'Requested By',
            description: 'Email of the requester',
            type: 'string',
          },
          costCenter: { title: 'Cost Center', type: 'string', default: 'demo-001' },
          requestId:  { title: 'Request ID',  type: 'string', default: '' },
          businessUnit: { title: 'Business Unit slug', type: 'string', default: 'bu-demo' },
          environment:  { title: 'Environment', type: 'string', default: 'dev' },
        },
      },
      output: {
        properties: {
          claimName:  { type: 'string' },
          claimPath:  { type: 'string' },
          prUrl:      { type: 'string' },
          argoCDApp:  { type: 'string' },
          message:    { type: 'string' },
        },
      },
    },

    async handler(ctx) {
      const { manifest, requestedBy, costCenter, requestId, businessUnit, environment } = ctx.input;
      const claimName = (manifest?.metadata as any)?.name ?? 'unknown';

      ctx.logger.info(`[IIP] Submitting claim ${claimName} to IIP Service at ${IIP_SERVICE_URL}`);

      const body = {
        manifest,
        requestedBy,
        costCenter:   costCenter   ?? 'demo-001',
        requestId:    requestId    ?? `REQ-${Date.now()}`,
        businessUnit: businessUnit ?? 'bu-demo',
        environment:  environment  ?? 'dev',
      };

      let response: Response;
      try {
        response = await fetch(`${IIP_SERVICE_URL}/api/provision`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(body),
        });
      } catch (err: any) {
        throw new Error(`IIP Service unreachable at ${IIP_SERVICE_URL}: ${err.message}`);
      }

      const data = await response.json() as any;

      if (!response.ok) {
        const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        throw new Error(`IIP Service rejected claim (HTTP ${response.status}): ${detail}`);
      }

      ctx.logger.info(`[IIP] Claim committed. PR: ${data.prUrl}`);
      ctx.logger.info(`[IIP] ArgoCD app: ${data.argoCDApp}`);
      ctx.logger.info(`[IIP] ${data.message}`);

      ctx.output('claimName', data.claimName);
      ctx.output('claimPath', data.claimPath);
      ctx.output('prUrl',     data.prUrl);
      ctx.output('argoCDApp', data.argoCDApp);
      ctx.output('message',   data.message);
    },
  });
}
