import { test, expect } from '@playwright/test';

test('Welcome cards remain below the top application bar while scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).first().click();
  await page.getByRole('button', { name: /Application/ }).click();
  await page.getByRole('button', { name: /App Information/ }).click();
  await page.getByRole('button', { name: /Open Welcome & Overview/ }).click();

  const header = page.locator('header');
  const content = page.locator('main');
  await expect(header).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Clearer shifts. Better organized tasks. Simpler TaskSheets.' })).toBeVisible();

  await expect(content).toHaveCSS('overflow-y', 'auto');
  await expect(content).toHaveCSS('isolation', 'isolate');
  await expect(header).toHaveCSS('z-index', '30');

  await content.evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });

  const headerOwnsTopLayer = await page.evaluate(() => {
    const appHeader = document.querySelector('header');
    if (!appHeader) return false;
    const bounds = appHeader.getBoundingClientRect();
    const topElement = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    return Boolean(topElement && appHeader.contains(topElement));
  });

  expect(headerOwnsTopLayer).toBe(true);
});
