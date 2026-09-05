import { test as setup, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { E2E_ADMIN } from './support/e2eUsers';

const dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runs once before the E2E suite. Creates the one local Admin account every
 * other spec authenticates as, then saves the resulting localStorage session
 * to disk so every other project can reuse it via `storageState` instead of
 * re-running first-admin setup (or login) at the top of every test.
 */
export const authFile = path.join(dirname, '.auth', 'admin.json');

setup('create the first Admin account', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Create the first Administrator account' })).toBeVisible();

  await page.getByLabel('Display Name').fill(E2E_ADMIN.displayName);
  await page.getByLabel('Username').fill(E2E_ADMIN.username);
  await page.getByLabel('Password', { exact: true }).fill(E2E_ADMIN.password);
  await page.getByLabel('Confirm Password').fill(E2E_ADMIN.password);
  await page.getByRole('button', { name: 'Create Administrator Account' }).click();

  // Confirms sign-in actually completed (past the login gate) before saving
  // state — a brand-new install lands on the Welcome screen (facility not
  // configured yet), not the Dashboard, so assert on the signed-in sidebar
  // indicator rather than dashboard-specific content.
  await expect(page.getByText(E2E_ADMIN.displayName)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

  await page.context().storageState({ path: authFile });
});
