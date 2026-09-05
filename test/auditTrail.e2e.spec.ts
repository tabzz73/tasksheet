import { test, expect } from '@playwright/test';

/**
 * Critical audit journey: perform a real resident/task/follow-up/print
 * action as the signed-in Admin, then confirm Audit History shows the
 * correct actor, action, and context — and that a resident-scoped view only
 * shows that resident's events (proving the filter actually filters, not
 * just that events exist somewhere).
 */
test.describe('Audit trail journey', () => {
  const TASK_TITLE = 'E2E Audit Test Task';

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: /Demo Workspace/ }).click();
    await page.getByRole('button', { name: 'Load Demo Workspace' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Load Demo Workspace' }).click();
    await page.evaluate(() => localStorage.setItem('tasksheet_welcome_dismissed', 'true'));
  });

  test('resident task creation, follow-up carry-forward, and print preview all show up in Audit History with correct actor and context', async ({ page }) => {
    // --- Create a resident task on Mary Smith --------------------------------
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await expect(page.getByRole('heading', { name: 'Mary Smith' })).toBeVisible();

    await page.getByRole('button', { name: /Add for Mary/ }).click();
    await page.getByRole('button', { name: '+ Care Task' }).click();
    await expect(page.getByRole('heading', { name: 'Add Care Task' })).toBeVisible();

    await page.locator('#care-task-shift').selectOption({ index: 1 });
    await page.getByRole('button', { name: '+ Custom Task' }).click();
    await page.getByPlaceholder(/Search .* catalog/i).fill(TASK_TITLE);
    await page.locator('#care-task-timing-type').selectOption('period');

    await page.getByRole('dialog').getByLabel('Must not be missed').check();
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    await page.getByLabel('Due Date (optional)').fill(yesterday);

    await page.getByRole('dialog').getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // The follow-up badge only renders on the detailed Care Tasks tab, not
    // the Overview summary the profile lands on after the modal closes.
    await page.getByRole('button', { name: /Care Tasks \(/ }).click();

    // --- Carry the follow-up forward -----------------------------------------
    const followUpBadge = page.getByRole('button', { name: new RegExp(`Follow-up status for ${TASK_TITLE}`) });
    await expect(followUpBadge).toBeVisible();
    await followUpBadge.click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: 'Follow-up Actions' })).toBeVisible();
    await page.getByRole('button', { name: 'Carry Forward' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // --- Open a print preview (a non-resident-scoped audit event) -----------
    await page.getByRole('button', { name: 'Shifts' }).first().click();
    const firstShiftOpenButton = page.getByRole('button', { name: /^Open .* shift$/ }).first();
    await firstShiftOpenButton.click();
    await page.getByRole('button', { name: 'Print Shift' }).click();
    await page.locator('button').filter({ hasText: 'Simple Checklist' }).first().click();
    await page.getByRole('button', { name: /Open Full Preview/i }).click();
    await expect(page.getByRole('heading', { name: 'TASKSHEET' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();

    // --- Audit History: confirm actor, action, and context ------------------
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: 'Audit History' }).click();
    await expect(page.getByRole('heading', { name: 'Audit History' })).toBeVisible();

    const allRows = await page.getByTestId('audit-row').allInnerTexts();
    const createdRow = allRows.find(text => text.includes(`Resident task created: ${TASK_TITLE}`));
    const followUpRow = allRows.find(text => text.includes(`${TASK_TITLE} carried forward`));
    const printRow = allRows.find(text => text.includes('Print preview opened'));

    expect(createdRow, 'creation event must be recorded').toBeTruthy();
    expect(createdRow).toContain('Jordan Smith');
    expect(createdRow).toContain('created');
    expect(createdRow).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/); // a real timestamp is present

    expect(followUpRow, 'carry-forward event must be recorded').toBeTruthy();
    expect(followUpRow).toContain('Jordan Smith');

    expect(printRow, 'print-preview event must be recorded').toBeTruthy();
    expect(printRow).toContain('Jordan Smith');
    expect(printRow!.toLowerCase()).not.toContain('printed'); // honest wording — preview, not a confirmed print

    // --- Resident-scoped history: only Mary Smith's events, never the print event
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await page.getByRole('button', { name: 'Room Safety & History' }).click();
    await expect(page.getByRole('heading', { name: 'Activity & History' })).toBeVisible();

    const residentRows = await page.getByTestId('audit-row').allInnerTexts();
    expect(residentRows.some(text => text.includes(`Resident task created: ${TASK_TITLE}`))).toBe(true);
    expect(residentRows.some(text => text.includes(`${TASK_TITLE} carried forward`))).toBe(true);
    expect(residentRows.some(text => text.includes('Print preview opened'))).toBe(false);
  });
});
