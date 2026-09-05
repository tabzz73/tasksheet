import { test, expect } from '@playwright/test';
import { E2E_ADMIN } from './support/e2eUsers';

/**
 * The most important healthcare-adjacent continuity scenario: a Must-Not-Miss
 * follow-up created and carried forward by one authorized user must still be
 * traceable — correctly attributed, in order — once a *different* authorized
 * user resolves it. This proves the audit trail is meaningful across users,
 * not just technically present on a single actor's session.
 */
test.describe('Follow-up continuity across users', () => {
  const TASK_TITLE = 'Continuity Test Task';
  const SECOND_USER = { displayName: 'Riley LPN', username: 'riley', password: 'riley-password-1' };

  test('MNM task created and carried forward by Admin, then marked Done by a second user, shows both users and both actions in order', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: /Demo Workspace/ }).click();
    await page.getByRole('button', { name: 'Load Demo Workspace' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Load Demo Workspace' }).click();

    // --- Admin creates a second authorized user (LPN/RN) --------------------
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: 'Users & Access' }).click();
    await page.getByRole('button', { name: 'Add User' }).click();
    const addDialog = page.getByRole('dialog').filter({ hasText: 'Add User' });
    await addDialog.getByLabel('Display Name').fill(SECOND_USER.displayName);
    await addDialog.getByLabel('Username').fill(SECOND_USER.username);
    await addDialog.getByLabel('Role').selectOption('lpn_rn');
    await addDialog.getByLabel('Password').fill(SECOND_USER.password);
    await addDialog.getByRole('button', { name: 'Create User' }).click();
    await expect(page.getByText(`User "${SECOND_USER.displayName}" created.`)).toBeVisible();

    // --- Admin creates a Must-Not-Miss task on Mary Smith and carries it forward
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await page.getByRole('button', { name: /Add for Mary/ }).click();
    await page.getByRole('button', { name: '+ Care Task' }).click();
    await expect(page.getByRole('heading', { name: 'Add Care Task' })).toBeVisible();

    await page.locator('#care-task-shift').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: '+ Custom Task' }).click();
    await page.getByPlaceholder(/Search .* catalog/i).fill(TASK_TITLE);
    await page.locator('#care-task-timing-type').selectOption('period');
    await page.getByRole('dialog').getByLabel('Must not be missed').check();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await page.getByLabel('Due Date (optional)').fill(yesterday);
    await page.getByRole('dialog').getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: /Care Tasks \(/ }).click();
    const followUpBadge = page.getByRole('button', { name: new RegExp(`Follow-up status for ${TASK_TITLE}`) });
    await followUpBadge.click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Follow-up Actions' })).toBeVisible();
    await page.getByRole('button', { name: 'Carry Forward' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // --- Sign out Admin, sign in as the second user --------------------------
    await page.getByTestId('app-sidebar').getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await page.getByLabel('Username').fill(SECOND_USER.username);
    await page.getByLabel('Password').fill(SECOND_USER.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByTestId('app-sidebar').getByText(SECOND_USER.displayName)).toBeVisible();

    // --- Second user finds the same task and marks it Done ------------------
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await page.getByRole('button', { name: /Care Tasks \(/ }).click();
    await followUpBadge.click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Follow-up Actions' })).toBeVisible();
    await page.getByRole('button', { name: 'Done', exact: true }).click();
    const confirmDialog = page.getByRole('dialog').filter({ hasText: 'Mark Follow-up Done' });
    await confirmDialog.getByRole('button', { name: 'Mark Done' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // --- Resident Profile history shows BOTH users and BOTH actions, in order
    await page.getByRole('button', { name: 'Room Safety & History' }).click();
    await expect(page.getByRole('heading', { name: 'Activity & History' })).toBeVisible();

    // Each row is one self-contained audit event (actor, action, timestamp,
    // summary) — read them as an ordered list rather than one flattened
    // text blob, so "who did what" can't be misattributed across rows.
    const rows = page.getByTestId('audit-row');
    const rowTexts = await rows.allInnerTexts();
    const relevantRows = rowTexts.filter(text => text.includes(TASK_TITLE));
    expect(relevantRows.length).toBeGreaterThanOrEqual(3);

    const doneRow = relevantRows.find(text => text.includes('marked Done') && text.includes(SECOND_USER.displayName));
    const carryForwardRow = relevantRows.find(text => text.includes('carried forward') && text.includes('Jordan Smith'));
    const createdRow = relevantRows.find(text => text.includes('Resident task created'));

    expect(doneRow, 'Riley\'s Done action must be recorded').toBeTruthy();
    expect(carryForwardRow, 'Jordan\'s Carry Forward action must be recorded').toBeTruthy();
    expect(createdRow, 'the original creation must be recorded').toBeTruthy();
    expect(createdRow).toContain('Jordan Smith');

    // Newest-first ordering: Done (Riley) appears before Carry Forward
    // (Jordan), which appears before Created (Jordan).
    const doneIndex = relevantRows.indexOf(doneRow!);
    const carryForwardIndex = relevantRows.indexOf(carryForwardRow!);
    const createdIndex = relevantRows.indexOf(createdRow!);
    expect(doneIndex).toBeLessThan(carryForwardIndex);
    expect(carryForwardIndex).toBeLessThan(createdIndex);
  });
});
