import { test, expect } from '@playwright/test';

test.describe('TaskSheet Master Clinical Journeys (E2E)', () => {

  test('Journey 1 — HCA: Navigate HCA Day, select MAP2 Partial Medication Assistance from search, and Print Simple Checklist', async ({ page }) => {
    await page.goto('/');

    // 1. Verify Dashboard header
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

    // 2. Navigate to Shifts
    await page.getByRole('button', { name: 'Shifts' }).first().click();
    await expect(page.getByRole('heading', { name: 'Shifts' })).toBeVisible();

    // 3. Open HCA Day
    const hcaCard = page.locator('div.bg-white').filter({ hasText: 'HCA Day' }).first();
    await hcaCard.getByRole('button', { name: 'Open Shift' }).click();

    // 4. In HCA Day workspace, verify header
    await expect(page.getByRole('heading', { name: /HCA Day/i })).toBeVisible();
    await expect(page.getByText('Health Care Aide', { exact: true })).toBeVisible();

    // 5. Complete a resident task
    const markDoneBtn = page.getByText('Mark Done').first();
    if (await markDoneBtn.isVisible()) {
      await markDoneBtn.click();
      await expect(page.getByText('Done').first()).toBeVisible();
    }

    // 6. Quick Add care task from shift: Search MAP2
    await page.getByRole('main').getByRole('button', { name: 'Add Task', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add Care Task' })).toBeVisible();

    // Select resident
    await page.locator('select').first().selectOption({ index: 1 });
    // Search MAP2
    await page.getByPlaceholder(/Search HCA catalog/i).fill('MAP2');
    await expect(page.getByRole('dialog').getByText('MAP2 — Partial Medication Assistance')).toBeVisible();
    await page.getByRole('dialog').getByText('MAP2 — Partial Medication Assistance').first().click();

    // Verify task title populated
    await page.locator('form').getByRole('button', { name: 'Add Task' }).click();

    // 7. Open Print Modal
    await page.getByRole('button', { name: 'Print Shift' }).click();
    await expect(page.getByRole('heading', { name: /Print Shift: HCA Day/i })).toBeVisible();

    // Select Simple Checklist style
    await page.locator('button').filter({ hasText: 'Simple Checklist' }).first().click();
    await page.getByRole('button', { name: /Show Full Sheet Preview/i }).click();
    await expect(page.getByText('TASKSHEET — DAILY CARE CHECKLIST')).toBeVisible();
  });

  test('Journey 2 — LPN: Open LPN Day, record fridge temp with range validation, and search Blood Glucose Check', async ({ page }) => {
    await page.goto('/');

    // 1. Go to Shifts -> LPN Day
    await page.getByRole('button', { name: 'Shifts' }).first().click();
    const lpnCard = page.locator('div.bg-white').filter({ hasText: 'LPN Day' }).first();
    await lpnCard.getByRole('button', { name: 'Open Shift' }).click();
    await expect(page.getByRole('heading', { name: 'LPN Day' })).toBeVisible();

    // 2. Click Medication Fridge Temperature unit task
    const fridgeTask = page.getByText('Medication Fridge Temperature').first();
    await fridgeTask.click();

    // Verify Temperature result dialog
    await expect(page.getByText(/Target safe range/i)).toBeVisible();
    await page.getByRole('button', { name: /Complete Routine/i }).click();

    // 3. Add Care Task: Search Blood Glucose
    await page.getByRole('main').getByRole('button', { name: 'Add Task', exact: true }).click();
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByPlaceholder(/Search LPN catalog/i).fill('Blood Glucose');
    await expect(page.getByRole('dialog').getByText('Blood Glucose Check').first()).toBeVisible();
    await page.getByRole('dialog').getByText('Blood Glucose Check').first().click();
    await page.locator('form').getByRole('button', { name: 'Add Task' }).click();

    // 4. Open Print Modal
    await page.getByRole('button', { name: 'Print Shift' }).click();
    await expect(page.getByRole('heading', { name: /Print Shift: LPN Day/i })).toBeVisible();

    // Verify Clinical Worksheet preview
    await page.getByRole('button', { name: /Clinical Worksheet/i }).first().click();
    await page.getByRole('button', { name: /Show Full Sheet Preview/i }).click();
    await expect(page.getByText('TASKSHEET — CLINICAL SHIFT WORKSHEET')).toBeVisible();
    await expect(page.getByText('QUICK VITALS / CLINICAL NOTES')).toBeVisible();
  });

  test('Journey 3 — Resident: Quick Care Setup, Add FYI, and Add Wound from profile', async ({ page }) => {
    await page.goto('/');

    // 1. Go to Residents
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await expect(page.getByRole('heading', { name: 'Residents' })).toBeVisible();

    // 2. Open Mary Smith (Room 254)
    await page.getByRole('button', { name: 'Profile' }).first().click();
    await expect(page.getByText(/Resident UUID:/i)).toBeVisible();

    // 3. Launch Quick Care Setup
    await page.getByRole('button', { name: 'Set Up Care' }).click();
    await expect(page.getByText('Set Up Resident Care Plan')).toBeVisible();
    await page.getByRole('button', { name: 'Create Care Tasks' }).click();

    // 4. Switch to Wounds tab and add a wound
    await page.getByRole('button', { name: /Wounds \(/i }).click();
    await page.getByRole('main').getByRole('button', { name: 'Add Wound' }).click();
    await page.getByPlaceholder(/e\.g\. Left Lower Leg/i).fill('Left Forearm Skin Tear');
    await page.locator('form').getByRole('button', { name: 'Add Wound' }).click();
    await expect(page.getByText('Left Forearm Skin Tear')).toBeVisible();
  });

  test('Journey 4 — Supervisor & Binder: Review Overdue & Mark Physical Binder Updated', async ({ page }) => {
    await page.goto('/');

    // 1. Open FYI Binder
    await page.getByRole('button', { name: 'FYI Binder' }).first().click();
    await expect(page.getByRole('heading', { name: 'FYI Binder' })).toBeVisible();

    // 2. Add an FYI to trigger update needed
    await page.getByRole('button', { name: '+ Add FYI' }).click();
    await page.locator('form textarea').fill('Physician visiting today at 14:00.');
    await page.locator('form').getByRole('button', { name: 'Add FYI' }).click();

    // 3. Verify status says "Update Required"
    await expect(page.getByText(/Physical Binder Update Required/i)).toBeVisible();

    // 4. Click "Mark Physical Copy Updated"
    await page.getByRole('button', { name: /Mark Physical Copy Updated/i }).click();
    await expect(page.getByText(/Physical Binder Current/i)).toBeVisible();
  });

  test('Journey 6 — Operational Task Edit, Duplicate, Stop, and Delete UX', async ({ page }) => {
    await page.goto('/');

    // 1. Open LPN Day shift workspace
    await page.getByRole('button', { name: 'Shifts' }).first().click();
    const lpnCard = page.locator('div.bg-white').filter({ hasText: 'LPN Day' }).first();
    await lpnCard.getByRole('button', { name: 'Open Shift' }).click();

    // 2. Click ⋯ menu for a unit task and select Edit Unit Task
    const unitActionsBtn = page.getByRole('button', { name: /Actions for Medication Fridge Temperature/i });
    await expect(unitActionsBtn).toBeVisible();
    await unitActionsBtn.click();

    await expect(page.getByRole('menuitem', { name: /Edit Unit Task/i })).toBeVisible();
    await page.getByRole('menuitem', { name: /Edit Unit Task/i }).click();

    // Verify Edit Unit Task modal
    await expect(page.getByRole('heading', { name: 'Edit Unit Task' })).toBeVisible();
    await page.getByPlaceholder('0715').fill('0720');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify time updated in workspace
    await expect(page.getByText('0720')).toBeVisible();

    // 3. Click ⋯ on a Care Task and test Duplicate
    const careCard = page.locator('div.bg-white').filter({ hasText: 'Blood Glucose Check' }).first();
    const careActionsBtn = careCard.getByRole('button', { name: /Actions for/i }).first();
    await careActionsBtn.click();
    await expect(page.getByRole('menuitem', { name: /Duplicate/i })).toBeVisible();
    await page.getByRole('menuitem', { name: /Duplicate/i }).click();

    await expect(page.getByRole('heading', { name: 'Duplicate Care Task' })).toBeVisible();
    await page.getByPlaceholder('0800').fill('1400');
    await page.getByRole('button', { name: 'Create Duplicate' }).click();

    // Verify duplicated task appears
    await expect(page.getByText('1400')).toBeVisible();

    // 4. Test Stop Task with confirmation
    await careCard.getByRole('button', { name: /Actions for/i }).first().click();
    await page.getByRole('menuitem', { name: /Stop This Task/i }).click();

    await expect(page.getByRole('heading', { name: 'Stop This Task?' })).toBeVisible();
    await expect(page.getByText(/All previous completion records and history will be retained/i)).toBeVisible();
    await page.getByRole('button', { name: 'Stop This Task' }).click();

    // 5. Open Resident Profile and verify Stopped vs Active filter
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Profile' }).first().click();
    await page.getByRole('button', { name: /Care Tasks/i }).click();
    await expect(page.getByRole('button', { name: /Stopped \(/i })).toBeVisible();
  });

  test('Journey 7 — Shift Management & Custom Short Code UX', async ({ page }) => {
    await page.goto('/');

    // 1. Navigate to Settings -> Roles & Shifts
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: 'Roles & Shifts' }).click();

    // 2. Verify prominent short codes exist
    await expect(page.getByText('LP1').first()).toBeVisible();
    await expect(page.getByText('D1').first()).toBeVisible();

    // 3. Click "+ Add Shift"
    await page.getByRole('button', { name: '+ Add Shift' }).click();
    await expect(page.getByRole('heading', { name: 'Add Shift' })).toBeVisible();

    // 4. Test duplicate short code validation
    await page.getByPlaceholder(/e\.g\. LPN Day/i).fill('Duplicate Test Shift');
    await page.getByPlaceholder('e.g. LP1, D1, E2, NLPN, RN1').fill('D1');
    await page.getByRole('button', { name: 'Add Shift', exact: true }).click();
    await expect(page.getByText(/already being used by another active shift/i)).toBeVisible();

    // 5. Provide valid unique short code
    await page.getByPlaceholder('e.g. LP1, D1, E2, NLPN, RN1').fill('D2');
    await page.getByRole('button', { name: 'Add Shift', exact: true }).click();

    // 6. Verify newly created shift appears in list
    await expect(page.getByText('D2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Duplicate Test Shift').first()).toBeVisible();

    // 7. Search shifts by short code
    await page.getByPlaceholder(/Search by short code/i).fill('D2');
    await expect(page.getByText('Duplicate Test Shift').first()).toBeVisible();

    // 8. Navigate to Shifts view and verify D2 is available
    await page.getByRole('button', { name: 'Shifts' }).first().click();
    await expect(page.getByText('D2', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Duplicate Test Shift').first()).toBeVisible();
  });
});
