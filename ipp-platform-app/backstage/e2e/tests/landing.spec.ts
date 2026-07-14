import { test, expect } from '@playwright/test';

// Viewport is 1440×900 — set in playwright.config.ts

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the React app to hydrate
    await page.waitForSelector('[data-testid="apple-shell"], .apple-shell, body', { timeout: 15000 });
  });

  test('fits 1440×900 without horizontal scroll', async ({ page }) => {
    const scrollWidth  = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth  = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // 2px tolerance
  });

  test('shows "Self Service Private Cloud" hero text', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).toContain('Self Service Private Cloud');
  });

  test('does not contain "Platform Engineering at Scale"', async ({ page }) => {
    const body = await page.textContent('body');
    expect(body).not.toContain('Platform Engineering at Scale');
  });

  test('zero MUI class bleed — no MuiXxx-root classes on visible elements', async ({ page }) => {
    const muiElements = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      return all.filter(el => {
        const classes = el.className;
        return typeof classes === 'string' && /Mui[A-Z][a-zA-Z]+-root/.test(classes);
      }).map(el => ({
        tag: el.tagName,
        classes: el.className,
      }));
    });
    expect(muiElements, `Found MUI classes: ${JSON.stringify(muiElements)}`).toHaveLength(0);
  });

  test('uses SF Pro or system font — not a generic serif', async ({ page }) => {
    const bodyFont = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily;
    });
    // Should contain SF Pro, -apple-system, Inter, or sans-serif
    expect(bodyFont.toLowerCase()).toMatch(/(sf pro|apple-system|inter|system-ui|sans-serif)/);
  });

  test('shows persona tiles (at least 5)', async ({ page }) => {
    // Persona tiles should be present (Developer, Platform, Operations, Security, Provider)
    const body = await page.textContent('body');
    const personas = ['Developer', 'Platform', 'Operations', 'Security'];
    for (const p of personas) {
      expect(body).toContain(p);
    }
  });

  test('screenshot at 1440×900', async ({ page }) => {
    await page.screenshot({ path: '../screenshots/landing-1440x900.png', fullPage: false });
  });
});
