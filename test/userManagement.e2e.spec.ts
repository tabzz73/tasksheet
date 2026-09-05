import { test, expect } from '@playwright/test';
import { E2E_ADMIN } from './support/e2eUsers';

/**
 * Critical user-management journey. The `chromium` project already starts
 * signed in as the Admin created by auth.setup.ts (see playwright.config.ts's
 * `storageState`) — this test does NOT re-run first-admin setup, it exercises
 * what happens *after* that: creating a second local account, signing in as
 * it, confirming role-gated navigation, deactivating it, and confirming a
 * deactivated account can no longer sign in at all.
 */
test.describe('User management journey', () => {
  const NEW_USER = { displayName: 'Casey HCA', username: 'chca', password: 'casey-password-1' };

  test('create user, sign in as them, role restrictions apply, deactivate, and login is then blocked', async ({ page }) => {
    await page.goto('/');

    // Confirm we really are the seeded Admin before doing anything.
    await expect(page.getByTestId('app-sidebar').getByText(E2E_ADMIN.displayName)).toBeVisible();

    // --- Admin creates a new HCA-role user ---------------------------------
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: 'Users & Access' }).click();
    await expect(page.getByRole('heading', { name: 'Users & Access' })).toBeVisible();

    await page.getByRole('button', { name: 'Add User' }).click();
    const addDialog = page.getByRole('dialog').filter({ hasText: 'Add User' });
    await addDialog.getByLabel('Display Name').fill(NEW_USER.displayName);
    await addDialog.getByLabel('Username').fill(NEW_USER.username);
    await addDialog.getByLabel('Role').selectOption('hca');
    await addDialog.getByLabel('Password').fill(NEW_USER.password);
    await addDialog.getByRole('button', { name: 'Create User' }).click();

    await expect(page.getByText(`User "${NEW_USER.displayName}" created.`)).toBeVisible();
    await expect(page.getByText(NEW_USER.username, { exact: false })).toBeVisible();

    // --- Sign out, then sign in as the new HCA user -------------------------
    await page.getByTestId('app-sidebar').getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.getByLabel('Username').fill(NEW_USER.username);
    await page.getByLabel('Password').fill(NEW_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByTestId('app-sidebar').getByText(NEW_USER.displayName)).toBeVisible();

    // --- Role restriction: an HCA cannot see Users & Access or Audit History
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await expect(page.getByRole('button', { name: 'Users & Access' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Audit History' })).not.toBeVisible();
    // A section every role can reach is still present, proving Settings itself
    // isn't blocked wholesale — only the admin-only screens are hidden.
    await expect(page.getByRole('button', { name: /App Information/ })).toBeVisible();

    // --- Sign back in as Admin and deactivate the HCA account ---------------
    await page.getByTestId('app-sidebar').getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Username').fill(E2E_ADMIN.username);
    await page.getByLabel('Password').fill(E2E_ADMIN.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByTestId('app-sidebar').getByText(E2E_ADMIN.displayName)).toBeVisible();

    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: 'Users & Access' }).click();
    await page.getByRole('button', { name: `Deactivate ${NEW_USER.displayName}` }).click();
    await expect(page.getByText(`${NEW_USER.displayName} deactivated.`)).toBeVisible();
    await expect(page.getByRole('button', { name: `Activate ${NEW_USER.displayName}` })).toBeVisible();

    // --- Deactivated account is now blocked from signing in -----------------
    await page.getByTestId('app-sidebar').getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Username').fill(NEW_USER.username);
    await page.getByLabel('Password').fill(NEW_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByRole('alert')).toHaveText(/inactive/i);
    // Still on the sign-in screen — never granted a session.
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByTestId('app-sidebar')).toHaveCount(0);
  });
});
