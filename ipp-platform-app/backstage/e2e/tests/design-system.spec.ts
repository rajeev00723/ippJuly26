import { test, expect } from '@playwright/test';

test.describe('Design System Showcase', () => {
  test.beforeEach(async ({ page }) => {
    // Inject a demo session so AppleShell renders without login gate
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('idp_persona_session', JSON.stringify({
        persona: 'developer',
        displayName: 'Alex Rivera',
        email: 'dev.user@acme.local',
        loginAt: Date.now(),
      }));
    });
    await page.goto('/design-system');
    await page.waitForSelector('body', { timeout: 15000 });
  });

  test('loads without error', async ({ page }) => {
    await expect(page.locator('text=Design System')).toBeVisible({ timeout: 10000 });
  });

  test('shows color tokens section', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('Color Tokens');
    expect(body).toContain('#fbfbfd');
  });

  test('shows typography section', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('Typography');
  });

  test('no MUI class bleed', async ({ page }) => {
    const muiElements = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*'))
        .filter(el => typeof el.className === 'string' && /Mui[A-Z][a-zA-Z]+-root/.test(el.className))
        .map(el => ({ tag: el.tagName, classes: el.className }));
    });
    expect(muiElements, `Found MUI: ${JSON.stringify(muiElements)}`).toHaveLength(0);
  });

  test('fits 1440×900 viewport without horizontal scroll', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
  });

  test('screenshot at 1440×900', async ({ page }) => {
    await page.screenshot({ path: '../screenshots/design-system-1440x900.png', fullPage: false });
  });
});
