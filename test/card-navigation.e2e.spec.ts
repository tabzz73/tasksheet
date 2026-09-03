import { test, expect, Page } from '@playwright/test';

async function loadDemoWorkspace(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).first().click();
  // Settings navigation is a flat, always-visible control-center rail (no
  // accordion/expand-collapse) — Demo Workspace is directly clickable.
  await page.getByRole('button', { name: /Demo Workspace/ }).click();
  await page.getByRole('button', { name: 'Load Demo Workspace' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Load Demo Workspace' }).click();
  await page.getByRole('button', { name: 'Dashboard' }).first().click();
}

test.describe('RC26 card navigation accessibility and responsive behavior', () => {
  test.beforeEach(async ({ page }) => loadDemoWorkspace(page));

  test('uses native sibling controls with visible keyboard focus and isolated Print', async ({ page }) => {
    const navigation = page.locator('[data-card-navigation="true"]').first();
    await expect(navigation).toBeVisible();
    await expect(navigation).toHaveAttribute('type', 'button');
    await expect(navigation).toHaveCSS('cursor', 'pointer');
    await expect(navigation.locator('button, a, [role="button"]')).toHaveCount(0);

    await navigation.focus();
    await page.keyboard.press('Tab');
    const printButton = navigation.locator('..').getByRole('button', { name: 'Print' });
    await expect(printButton).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(navigation).toBeFocused();
    await expect(navigation).toHaveCSS('outline-style', 'none');
    const focusRing = await navigation.evaluate(element => getComputedStyle(element).boxShadow);
    expect(focusRing).not.toBe('none');

    await printButton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByRole('heading', { name: /^Print/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Unit 2 East./ })).toBeVisible();
  });

  test('supports native Enter and Space activation exactly once', async ({ page }) => {
    let navigation = page.locator('[data-card-navigation="true"]').first();
    await navigation.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /^Add to .* ▾$/ })).toBeVisible();

    await page.getByRole('button', { name: 'Dashboard' }).first().click();
    navigation = page.locator('[data-card-navigation="true"]').first();
    await navigation.focus();
    await page.keyboard.press('Space');
    await expect(page.getByRole('button', { name: /^Add to .* ▾$/ })).toBeVisible();
  });

  test('keeps card scrolling non-navigational at desktop, tablet, and mobile widths', async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 768, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.getByRole('button', { name: 'Dashboard' }).first().click();
      const navigation = page.locator('[data-card-navigation="true"]').first();
      await navigation.scrollIntoViewIfNeeded();
      const box = await navigation.boundingBox();
      if (!box) throw new Error(`Navigation card missing at ${viewport.width}px`);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.wheel(0, 240);
      await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Unit 2 East./ })).toBeVisible();
    }
  });
});
