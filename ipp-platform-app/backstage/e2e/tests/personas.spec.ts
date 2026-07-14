import { test, expect } from '@playwright/test';

// Helper to inject a developer session
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

const ROUTES = [
  { path: '/developer',  persona: 'developer',  label: 'Developer' },
  { path: '/operations', persona: 'operations', label: 'Operations' },
  { path: '/security',   persona: 'security',   label: 'Security'   },
  { path: '/platform',   persona: 'platform',   label: 'Platform'   },
];

for (const route of ROUTES) {
  test.describe(`Persona: ${route.label} (${route.path})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await injectSession(page, route.persona);
      await page.goto(route.path);
      await page.waitForSelector('body', { timeout: 15000 });
    });

    test('fits 1440×900 without horizontal scroll', async ({ page }) => {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
    });

    test('zero MUI class bleed', async ({ page }) => {
      const muiElements = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
          .filter(el => typeof el.className === 'string' && /Mui[A-Z][a-zA-Z]+-root/.test(el.className))
          .map(el => ({ tag: el.tagName, classes: el.className }));
      });
      expect(muiElements, `MUI in ${route.path}: ${JSON.stringify(muiElements)}`).toHaveLength(0);
    });

    test('no Backstage AppBar visible', async ({ page }) => {
      const count = await page.locator('[class*="MuiAppBar"]').count();
      expect(count).toBe(0);
    });
  });
}

test.describe('Persona: FinOps (/finops-charge-visibility)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await injectSession(page, 'developer');
    await page.goto('/finops-charge-visibility');
    await page.waitForSelector('body', { timeout: 15000 });
  });

  test('shows tab navigation', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('Overview');
    expect(body).toContain('Workloads');
    expect(body).toContain('Optimization');
    expect(body).toContain('Governance');
  });

  test('KPI cards visible on Overview tab', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('Forecasted Monthly');
  });

  test('screenshot', async ({ page }) => {
    await page.screenshot({ path: '../screenshots/finops-1440x900.png', fullPage: false });
  });
});
