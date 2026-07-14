import { test, expect } from '@playwright/test';

// Requires any persona session — set a stub in localStorage before navigating

test.describe('Marketplace Page', () => {
  test.beforeEach(async ({ page }) => {
    // Inject a demo session so PersonaLoginGate passes
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('idp_persona_session', JSON.stringify({
        persona: 'developer',
        displayName: 'Alex Rivera',
        email: 'dev.user@acme.local',
        loginAt: Date.now(),
      }));
    });
    await page.goto('/marketplace');
    await page.waitForSelector('body', { timeout: 15000 });
  });

  test('fits 1440×900 without horizontal scroll', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('no Backstage Page/Header/Content wrapper visible', async ({ page }) => {
    // Backstage chrome injects specific test ids or class patterns
    const backstageHeader = await page.locator('[class*="BackstageHeader"], [class*="MuiAppBar"]').count();
    expect(backstageHeader).toBe(0);
  });

  test('zero MUI class bleed', async ({ page }) => {
    const muiElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => typeof el.className === 'string' && /Mui[A-Z][a-zA-Z]+-root/.test(el.className))
        .map(el => ({ tag: el.tagName, classes: el.className }));
    });
    expect(muiElements, `Found MUI: ${JSON.stringify(muiElements)}`).toHaveLength(0);
  });

  test('shows provider tiles — KubeVirt and Azure', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('KubeVirt');
    expect(body).toContain('Microsoft Azure');
  });

  test('shows category filters', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('Compute');
  });

  test('opens provider detail modal on card click', async ({ page }) => {
    // Click the first provider card
    await page.locator('text=KubeVirt').first().click();
    // Modal should appear with "View on Upbound Marketplace"
    await expect(page.locator('text=View on Upbound Marketplace')).toBeVisible({ timeout: 5000 });
  });

  test('screenshot at 1440×900', async ({ page }) => {
    await page.screenshot({ path: '../screenshots/marketplace-1440x900.png', fullPage: false });
  });
});
