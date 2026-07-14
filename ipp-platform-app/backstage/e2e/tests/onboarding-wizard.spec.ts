import { test, expect } from '@playwright/test';

// Same session-injection pattern as personas.spec.ts — /infra-onboarding is
// gated behind PersonaLoginGate persona="any".
async function injectSession(page: any, persona = 'developer') {
  await page.evaluate((p: string) => {
    localStorage.setItem('idp_persona_session', JSON.stringify({
      persona: p,
      displayName: 'Alex Rivera',
      email: 'dev.user@acme.local',
      loginAt: Date.now(),
    }));
  }, persona);
}

// The webpack dev server surfaces a blocking overlay for warnings, not just
// errors (a pre-existing, harmless @protobufjs/inquire "critical dependency"
// warning in this repo) — it intercepts pointer events over the whole page.
// Only relevant to the local dev server, not the built/deployed app.
async function dismissDevOverlay(page: any) {
  await page.evaluate(() => {
    document.getElementById('webpack-dev-server-client-overlay')?.remove();
  }).catch(() => {});
}

// Walks the wizard end-to-end for the default (kubevirt-vm) target. In this
// environment /api/proxy/iip/* isn't reachable (no live IIP backend), so
// InfraOnboardingClient.provision() falls back to its labeled client-side
// simulation — this is the same fallback a real offline demo relies on, so
// exercising it here is a legitimate smoke test of "wizard -> ready", not a
// workaround.
test.describe('Onboarding wizard (/infra-onboarding/new)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await dismissDevOverlay(page);
    // Backstage's own guest sign-in gate is separate from (and in front of)
    // the app's PersonaLoginGate — complete it once per session, and wait for
    // the identity exchange to finish before navigating away.
    const enterButton = page.getByRole('button', { name: 'Enter' });
    if (await enterButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dismissDevOverlay(page);
      await enterButton.click();
      await expect(enterButton).not.toBeVisible({ timeout: 15000 });
    }
    await injectSession(page, 'developer');
    await page.goto('/infra-onboarding/new');
    await dismissDevOverlay(page);
    await page.waitForSelector('body', { timeout: 15000 });
  });

  test('walks App Type -> App Details -> Infrastructure -> Review -> Provisioning -> Complete', async ({ page }) => {
    // Step 1 — App Type: greenfield is selectable, click it then Next.
    await page.getByRole('button', { name: /greenfield/i }).click();
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 2 — App Details: fill required fields.
    await page.getByPlaceholder('my-service').fill('e2e-test-app');
    await page.getByPlaceholder('platform-engineering').fill('platform-eng');
    await page.getByPlaceholder(/github\.com\/acme\/new-service/i).fill('https://github.com/acme/e2e-test-app');
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 3 — Infrastructure: default target (KubeVirt VM) is preselected;
    // just confirm the target selector rendered, then proceed.
    await expect(page.getByText(/Virtual Machine \(KubeVirt\)/i)).toBeVisible();
    await page.getByRole('button', { name: /Next/i }).click();

    // Step 4 — Review: confirm key facts are shown, then submit.
    await expect(page.getByText('e2e-test-app', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: /Confirm & Provision/i }).click();

    // Step 5/6 — Provisioning then Complete. The simulated fallback takes a
    // few seconds (6 steps x ~1s each); allow a generous timeout.
    await expect(page.getByText(/Infrastructure Provisioned Successfully/i)).toBeVisible({ timeout: 20000 });
  });
});
