import { test, expect } from '@playwright/test';

/**
 * Manual acceptance script (Vital Signs, 3x today) from the multi-occurrence
 * follow-up spec: create a "3 times today" Must-Not-Miss task, have one shift
 * record two of three occurrences, confirm the incoming Evening Huddle
 * immediately sees "2/3 completed · 1 remaining" (not a fresh 0/3), have
 * Evening record the third, and confirm it drops out of active Huddle/
 * Follow-up while every occurrence stays visible in Resident Activity &
 * History.
 */
test.describe('Multi-occurrence follow-up: cross-shift continuity', () => {
  test.beforeEach(async ({ page }) => {
    // Fixed at 0800 on a stable date — inside the demo HCA Day shift window
    // (0700-1500) — so occurrence records deterministically attribute to
    // "HCA Day" until the clock is advanced later in the test.
    await page.clock.install({ time: new Date(2026, 8, 4, 8, 0) });
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: /Demo Workspace/ }).click();
    await page.getByRole('button', { name: 'Load Demo Workspace' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Load Demo Workspace' }).click();
  });

  test('Day shift records 2/3, Evening Huddle sees 2/3 and records the 3rd, then it disappears from active follow-up', async ({ page }) => {
    const TASK_TITLE = 'Vital Signs Monitoring';

    // --- Create the task: 3 required occurrences, resetting daily, Must-Not-Miss
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await page.getByRole('button', { name: /Add for Mary/ }).click();
    await page.getByRole('button', { name: '+ Care Task' }).click();
    await expect(page.getByRole('heading', { name: 'Add Care Task' })).toBeVisible();

    await page.locator('#care-task-shift').selectOption({ index: 1 });
    await page.getByRole('button', { name: '+ Custom Task' }).click();
    await page.getByPlaceholder(/Search .* catalog/i).fill(TASK_TITLE);
    await page.locator('#care-task-timing-type').selectOption('period');
    await page.getByRole('dialog').getByLabel('Must not be missed').check();

    await page.getByRole('button', { name: '+ This needs repeated completions or continuous tracking' }).click();
    await page.getByRole('button', { name: 'Repeated occurrences' }).click();
    await page.getByLabel('Required occurrences').fill('3');
    await page.getByRole('button', { name: 'Each day' }).click();

    await page.getByRole('dialog').getByRole('button', { name: 'Add Task' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: /Care Tasks \(/ }).click();
    const followUpBadge = page.getByRole('button', { name: new RegExp(`Follow-up status for ${TASK_TITLE}`) });
    await expect(followUpBadge).toHaveAccessibleName(/0\/3/);

    // --- Day shift records occurrence 1 and 2 ---------------------------------
    await followUpBadge.click();
    const dayModal = page.getByRole('dialog').filter({ hasText: 'Follow-up Actions' });
    await dayModal.getByRole('button', { name: 'Record Occurrence', exact: true }).click();
    await expect(dayModal.getByRole('button', { name: 'Record Occurrence', exact: true })).toBeVisible(); // still open, target not met
    await dayModal.getByRole('button', { name: 'Record Occurrence', exact: true }).click();
    await expect(dayModal.getByText('2/2 complete for this period')).toHaveCount(0); // target is 3, not 2
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await expect(followUpBadge).toHaveAccessibleName(/2\/3 completed · 1 remaining/);

    // --- Evening Huddle: the incoming shift immediately sees 2/3, not a fresh 0/3
    await page.getByRole('button', { name: 'Dashboard' }).first().click();
    await page.getByRole('button', { name: /Huddle/i }).click();
    // The Must-Not-Miss row is the CardNavigationButton whose accessible
    // name names this specific task — distinct from the plain "Resident
    // Follow-up" list further down, which also mentions this task.
    const huddleActionButton = page.getByRole('button', { name: new RegExp(`Follow-up actions for ${TASK_TITLE}`) });
    const mustNotMissRow = page.locator('li').filter({ has: huddleActionButton });
    await expect(mustNotMissRow).toContainText('2/3 completed · 1 remaining');

    // --- Advance the clock into the Evening shift window and record the 3rd ---
    await page.clock.setFixedTime(new Date(2026, 8, 4, 16, 0)); // 1600 — HCA Evening (1500-2300)
    await huddleActionButton.click();
    const modal = page.getByRole('dialog').filter({ hasText: 'Follow-up Actions' });
    await expect(modal.getByRole('heading', { name: 'Follow-up Actions' })).toBeVisible();
    await modal.getByRole('button', { name: 'Record Occurrence', exact: true }).click();
    await expect(modal.getByText('3/3 complete for this period')).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Record Occurrence', exact: true })).toHaveCount(0); // disabled once complete
    await page.keyboard.press('Escape');

    // --- Disappears from active Huddle/Follow-up once complete for today -----
    await expect(page.getByText(TASK_TITLE)).toHaveCount(0);

    // --- Resident Activity & History shows all three occurrence timestamps/users
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await page.getByRole('button', { name: 'Room Safety & History' }).click();
    await expect(page.getByRole('heading', { name: 'Occurrence Progress' })).toBeVisible();
    await expect(page.getByText('3/3 complete')).toBeVisible();

    const occurrenceRows = await page.getByTestId('audit-row').allInnerTexts();
    const relevant = occurrenceRows.filter(t => t.includes(TASK_TITLE) && t.includes('occurrence recorded'));
    expect(relevant).toHaveLength(3);
    expect(relevant.filter(t => t.includes('Jordan Smith'))).toHaveLength(3); // same admin signed in throughout
    // Audit shiftSnapshot prefers the shift's short code (e.g. "D1"/"E1")
    // over its full name — matches db/index.ts's own convention.
    expect(relevant.some(t => t.includes('D1'))).toBe(true);
    expect(relevant.some(t => t.includes('E1'))).toBe(true);
  });
});
