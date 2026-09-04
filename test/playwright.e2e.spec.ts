import { test, expect } from '@playwright/test';

test.describe('TaskSheet Master Clinical Journeys (E2E)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).first().click();
    // Settings navigation is a flat, always-visible control-center rail (no
    // accordion/expand-collapse) — every section, including Demo Workspace
    // under Data & Support, is directly clickable without an expand step.
    await page.getByRole('button', { name: /Demo Workspace/ }).click();
    await page.getByRole('button', { name: 'Load Demo Workspace' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Load Demo Workspace' }).click();
    await page.evaluate(() => localStorage.setItem('tasksheet_welcome_dismissed', 'true'));
  });

  test('Journey 11 — Service Coverage classifications are available in Settings and resident task entry', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: /Service Coverage/ }).click();
    await expect(page.getByRole('heading', { name: 'Service Coverage' })).toBeVisible();
    await expect(page.getByText(/Private Pay/).first()).toBeVisible();
    await expect(page.getByText(/Complimentary/).first()).toBeVisible();

    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await page.getByRole('button', { name: /Care Tasks \(/ }).click();
    await page.getByRole('button', { name: 'Add Care Task' }).click();
    const coverageSelect = page.getByLabel('Service Coverage');
    await expect(coverageSelect).toBeVisible();
    await coverageSelect.selectOption('PRIVATE_PAY');
    await expect(page.getByText(/Additional to the resident's funded/i)).toBeVisible();
    await expect(page.getByText(/does not store prices, invoices, or payment information/i)).toBeVisible();
  });

  test('Journey 1 — HCA: Navigate HCA Day, select MAP2 Partial Medication Assistance from search, and Print Simple Checklist', async ({ page }) => {
    await page.goto('/');

    // 1. Verify Dashboard header
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Unit 2 East./ })).toBeVisible();

    // 2. Navigate to Shifts
    await page.getByRole('button', { name: 'Shifts' }).first().click();
    await expect(page.getByRole('heading', { name: 'Shifts' })).toBeVisible();

    // 3. Open HCA Day
    await page.getByRole('button', { name: 'Open D1 shift' }).click();

    // 4. In HCA Day workspace, verify header
    await expect(page.getByRole('heading', { name: /HCA Day/i })).toBeVisible();
    await expect(page.getByText(/Health Care Aide/).first()).toBeVisible();

    // 6. Quick Add care task from shift: Search MAP2
    await page.getByRole('button', { name: /^Add to D1/ }).click();
    await page.getByRole('button', { name: '+ Care Task' }).click();
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
    await expect(page.getByRole('dialog').getByRole('heading', { name: /^Print/i })).toBeVisible();

    // Select Simple Checklist style
    await page.locator('button').filter({ hasText: 'Simple Checklist' }).first().click();
    await page.getByRole('button', { name: /Open Full Preview/i }).click();
    await expect(page.getByRole('heading', { name: 'TASKSHEET' })).toBeVisible();
    const hcaPrintFooter = page.locator('.print-only style[data-print-footer]').last();
    const hcaFooterCss = await hcaPrintFooter.evaluate(element => element.textContent || '');
    expect(hcaFooterCss).toContain('HCA TaskSheet');
    expect(hcaFooterCss).toContain('D1');
    expect(hcaFooterCss).toContain('Page " counter(page) " of " counter(pages)');
    await expect(page.locator('.print-only .tasksheet-universal-document').last()).toHaveCSS('page', 'tasksheet-shift-simple_checklist-d1');
  });

  test('Journey 2 — LPN: Open LPN Day, verify fridge monitoring, and search Blood Glucose Check', async ({ page }) => {
    await page.goto('/');

    // 1. Go to Shifts -> LPN Day
    await page.getByRole('button', { name: 'Shifts' }).first().click();
    await page.getByRole('button', { name: 'Open LP1 shift' }).click();
    await expect(page.getByRole('heading', { name: 'LPN Day' })).toBeVisible();

    // 2. Verify the structured fridge-temperature routine remains visible
    await expect(page.getByText('Medication Fridge Temperature').first()).toBeVisible();
    await expect(page.getByText(/Verify digital reading/i)).toBeVisible();

    // 3. Add Care Task: Search Blood Glucose
    await page.getByRole('button', { name: /^Add to LP1/ }).click();
    await page.getByRole('button', { name: '+ Care Task' }).click();
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByPlaceholder(/Search LPN catalog/i).fill('Blood Glucose');
    await expect(page.getByRole('dialog').getByText('Blood Glucose Check').first()).toBeVisible();
    await page.getByRole('dialog').getByText('Blood Glucose Check').first().click();
    await page.locator('form').getByRole('button', { name: 'Add Task' }).click();

    // 4. Open Print Modal
    await page.getByRole('button', { name: 'Print Shift' }).click();
    await expect(page.getByRole('dialog').getByRole('heading', { name: /^Print/i })).toBeVisible();

    // Verify Clinical Worksheet preview
    await page.getByRole('button', { name: /Clinical Worksheet/i }).first().click();
    await page.getByRole('button', { name: /Open Full Preview/i }).click();
    await expect(page.getByText(/CLINICAL SHIFT WORKSHEET/i).first()).toBeVisible();
    const lpnPrintFooter = page.locator('.print-only style[data-print-footer]').last();
    const lpnFooterCss = await lpnPrintFooter.evaluate(element => element.textContent || '');
    expect(lpnFooterCss).toContain('size: letter landscape');
    expect(lpnFooterCss).toContain('LPN TaskSheet');
    expect(lpnFooterCss).toContain('LP1');
    await expect(page.locator('.print-only .tasksheet-universal-document').last()).toHaveCSS('page', 'tasksheet-shift-clinical_worksheet-lp1');
  });

  test('Journey 3 — Resident: Open Care Setup and add a wound from the profile', async ({ page }) => {
    await page.goto('/');

    // 1. Go to Residents
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await expect(page.getByRole('heading', { name: 'Residents' })).toBeVisible();

    // 2. Open Mary Smith (Room 254)
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await expect(page.getByRole('heading', { name: 'Mary Smith' })).toBeVisible();

    // 3. Launch Quick Care Setup
    await page.getByRole('button', { name: 'Care Setup' }).click();
    await expect(page.getByText('Set Up Resident Care Plan')).toBeVisible();
    await page.getByRole('button', { name: 'Close dialog' }).click();

    // 4. Switch to Wounds tab and add a wound
    await page.getByRole('button', { name: /Wounds \(/i }).click();
    await page.getByRole('main').getByRole('button', { name: 'Add Wound' }).click();
    await page.getByPlaceholder(/e\.g\. Left Lower Leg/i).fill('Left Forearm Skin Tear');
    await page.getByLabel('Search wound products').fill('10x10');
    await page.getByRole('button', { name: /Mepilex Border Flex 10 × 10 cm/i }).click();
    await page.getByLabel(/Quantity per use for Mepilex Border Flex 10 × 10 cm/i).fill('1');
    await page.locator('form').getByRole('button', { name: 'Add Wound' }).click();
    await expect(page.getByText('Left Forearm Skin Tear')).toBeVisible();
  });

  test('Journey 4 — Supervisor & Binder: Review Overdue & Mark Physical Binder Updated', async ({ page }) => {
    await page.goto('/');

    // 1. Open FYI Binder
    await page.getByRole('button', { name: 'FYI Binder' }).first().click();
    await expect(page.getByRole('heading', { name: 'FYI Binder' })).toBeVisible();

    // 2. Add an FYI to trigger update needed
    await page.getByRole('button', { name: 'Add FYI', exact: true }).first().click();
    await page.locator('form textarea').fill('Physician visiting today at 14:00.');
    await page.locator('form').getByRole('button', { name: 'Add FYI' }).click();

    // 3. Verify status says "Update Required"
    await expect(page.getByText(/Physical Binder Update Required/i)).toBeVisible();

    // 4. Click "Mark Physical Copy Updated"
    await page.getByRole('button', { name: /Mark Physical Copy Updated/i }).click();
    await expect(page.getByText(/Physical Binder Current/i)).toBeVisible();
  });

  test('Journey 6 — Operational unit-task edit and resident parent navigation', async ({ page }) => {
    await page.goto('/');

    // 1. Open LPN Day shift workspace
    await page.getByRole('button', { name: 'Shifts' }).first().click();
    await page.getByRole('button', { name: 'Open LP1 shift' }).click();

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

    // 3. Open Resident Profile and verify care-task filters remain available
    await page.getByRole('button', { name: 'Residents' }).first().click();
    await page.getByRole('button', { name: 'Open resident Mary Smith' }).click();
    await page.getByRole('button', { name: /Care Tasks/i }).click();
    await expect(page.getByRole('button', { name: /Active \(/i })).toBeVisible();
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
    const addShiftDialog = page.getByRole('dialog');
    await addShiftDialog.getByPlaceholder(/e\.g\. LPN Day/i).fill('Duplicate Test Shift');
    await addShiftDialog.getByPlaceholder('e.g. LP1, D1').fill('D1');
    await page.getByRole('button', { name: 'Add Shift', exact: true }).click();
    await expect(page.getByText(/already being used by another active shift/i)).toBeVisible();

    // 5. Provide valid unique short code
    await addShiftDialog.getByPlaceholder('e.g. LP1, D1').fill('D2');
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

  test('Journey 8 — Wound Quick Prints preview weekly and supply reports', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Print Center/i }).first().click();
    // Wound quick prints live inside the Wound Care report tab, alongside
    // that category's preset reports.
    await page.getByLabel('Print Center sections').getByRole('button', { name: 'Wound Care', exact: true }).click();
    await expect(page.getByText('Wound Quick Prints')).toBeVisible();

    await page.getByRole('button', { name: 'Preview' }).first().click();
    await expect(page.getByRole('heading', { name: 'WEEKLY WOUND CARE OVERVIEW' })).toBeVisible();
    const weeklyFooterCss = await page.locator('.print-only style[data-print-footer]').last().evaluate(element => element.textContent || '');
    expect(weeklyFooterCss).toContain('Weekly Wound Care');
    expect(weeklyFooterCss).toContain('Page " counter(page) " of " counter(pages)');
    await page.getByRole('button', { name: 'Back' }).click();

    // "Back" remounts Print Center fresh (same as its date/week pickers
    // already did before this section became tabbed), so re-select the tab.
    await page.getByLabel('Print Center sections').getByRole('button', { name: 'Wound Care', exact: true }).click();
    await page.getByLabel('Wound supply report scope').selectOption('all_active');
    await page.getByRole('button', { name: 'Preview' }).nth(1).click();
    await expect(page.getByRole('heading', { name: 'WOUND SUPPLIES RE-ORDER LIST' })).toBeVisible();
  });

  test('Journey 9 — Wound Supply Catalog searches brand products and exact sizes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: /Wound Supply Catalog/i }).click();
    await page.getByRole('button', { name: /Add Product/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Add Wound Product / Size' })).toBeVisible();
    await expect(page.getByLabel('Product Family')).toBeFocused();
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: /Common Wound Products/i })).toBeVisible();
    await page.getByLabel('Search wound supply catalog').fill('10x20');
    await expect(page.getByText('Mepilex Border Flex 10 × 20 cm')).toBeVisible();
    await expect(page.getByText('Biatain Silicone 10 × 20 cm')).toBeVisible();
    await page.getByLabel('Search wound supply catalog').fill('mep');
    await expect(page.getByText('Mepitel').first()).toBeVisible();
    await expect(page.getByText('Mepore').first()).toBeVisible();
    await expect(page.getByText('Mesalt').first()).toBeVisible();
  });

  test('Journey 10 — Report Library previews a system preset and compact bathing grid', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Print Center/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Print Center' })).toBeVisible();

    await page.getByLabel('Print Center sections').getByRole('button', { name: 'Residents', exact: true }).click();
    await page.getByRole('button', { name: /Resident Directory Active residents/i }).click();
    await expect(page.getByRole('heading', { name: 'Resident Directory' })).toBeVisible();
    const reportFooterCss = await page.locator('.print-only style[data-print-footer]').last().evaluate(element => element.textContent || '');
    expect(reportFooterCss).toContain('Page " counter(page) " of " counter(pages)');
    await page.getByRole('button', { name: 'Back' }).click();

    const sectionTabs = page.getByLabel('Print Center sections');
    await sectionTabs.getByRole('button', { name: 'Bathing', exact: true }).click();
    await expect(page.getByRole('button', { name: /Bathing Capacity.*Open Slots/i })).toBeVisible();

    await sectionTabs.getByRole('button', { name: 'Specialized Documents' }).click();
    const weekPicker = page.getByLabel('Select bathing week');
    await weekPicker.fill('2026-09-02');
    await page.getByRole('button', { name: 'Previous bathing week' }).click();
    await expect(weekPicker).toHaveValue('2026-08-26');
    await page.getByRole('button', { name: 'Next bathing week' }).click();
    await expect(weekPicker).toHaveValue('2026-09-02');
    await page.getByRole('button', { name: 'Preview Schedule' }).click();
    await expect(page.getByRole('heading', { name: 'Weekly Bathing Schedule' })).toBeVisible();
    await expect(page.getByText(/Capacity: \d+ per shift line\/day/).first()).toBeVisible();
    await expect(page.locator('[data-weekday="Monday"]').first()).toBeVisible();
    await expect(page.locator('[data-weekday="Sunday"]').first()).toBeVisible();
  });

  test('Journey 12 — Create, edit, and generate a Saved Print Package', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Print Center/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Print Center' })).toBeVisible();
    await page.getByLabel('Print Center sections').getByRole('button', { name: 'Print Packages' }).click();
    await expect(page.getByText('Built In')).toBeVisible();

    // Create a new saved package with two documents.
    await page.getByRole('button', { name: 'New Package' }).click();
    await expect(page.getByRole('heading', { name: 'New Print Package' })).toBeVisible();
    await page.getByLabel('Package Name').fill('Shift Huddle Package');
    await page.getByLabel('Document type to add').selectOption('wound_schedule');
    await page.getByRole('button', { name: 'Add Document' }).click();
    await page.getByLabel('Document type to add').selectOption('fyi_binder');
    await page.getByRole('button', { name: 'Add Document' }).click();
    await expect(page.getByRole('listitem')).toHaveCount(2);
    await page.getByRole('button', { name: 'Create Package' }).click();

    // It appears under Saved Packages.
    await expect(page.getByText('Shift Huddle Package')).toBeVisible();
    await expect(page.getByText('2 documents')).toBeVisible();

    // Edit it: remove one document, rename it.
    await page.getByRole('button', { name: 'Edit Shift Huddle Package' }).click();
    await expect(page.getByRole('heading', { name: 'Edit Print Package' })).toBeVisible();
    await page.getByRole('button', { name: /remove/i }).first().click();
    await page.getByLabel('Package Name').fill('Shift Huddle — Renamed');
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.getByText('Shift Huddle — Renamed')).toBeVisible();
    await expect(page.getByText('1 document', { exact: true })).toBeVisible();

    // Generate it — opens the shared package preview/print path. It's the
    // only saved package at this point, so its "Generate Package" button is
    // the last one on the page (after the two built-ins).
    await page.getByRole('button', { name: 'Generate Package' }).last().click();
    await expect(page.getByText('Shift Huddle — Renamed').first()).toBeVisible();
    await expect(page.getByText(/1 Bundled Document/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Print Complete Package' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();

    // Duplicate the built-in HCA Daily Package into an editable saved package.
    // "Back" remounts Print Center fresh, so re-select the Print Packages tab.
    await expect(page.getByRole('heading', { name: 'Print Center' })).toBeVisible();
    await page.getByLabel('Print Center sections').getByRole('button', { name: 'Print Packages' }).click();
    await page.getByRole('button', { name: 'Duplicate', exact: true }).first().click();
    await expect(page.getByRole('heading', { name: 'New Print Package' })).toBeVisible();
    await expect(page.getByLabel('Package Name')).toHaveValue('HCA Daily Package (Copy)');
    await expect(page.getByRole('listitem').first()).toBeVisible();
    await page.getByRole('button', { name: 'Create Package' }).click();
    await expect(page.getByText('HCA Daily Package (Copy)')).toBeVisible();

    // Delete a saved package requires confirmation.
    await page.getByRole('button', { name: 'Delete Shift Huddle — Renamed' }).click();
    await expect(page.getByRole('heading', { name: 'Delete Print Package?' })).toBeVisible();
    await page.getByRole('button', { name: 'Delete Package' }).click();
    await expect(page.getByText('Shift Huddle — Renamed')).toHaveCount(0);
  });
});

test.describe('TaskSheet Master Clinical Journeys (E2E)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: /Demo Workspace/ }).click();
    await page.getByRole('button', { name: 'Load Demo Workspace' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Load Demo Workspace' }).click();
    await page.evaluate(() => localStorage.setItem('tasksheet_welcome_dismissed', 'true'));
  });

  test('Journey 13 — Dashboard operational huddle: attention items, Away From Unit, FYIs, and Code of the Month', async ({ page }) => {
    await page.getByRole('button', { name: 'Dashboard' }).first().click();
    await expect(page.getByText('Current Unit Situation')).toBeVisible();

    // Demo seed's active attention item shows up in both Resident Attention
    // and Current Unit Situation without navigating away.
    await expect(page.getByText('Increased Falls Observation').first()).toBeVisible();

    // Away From Unit lists actual residents, not just a count, and drills
    // into the Resident Profile.
    await page.getByRole('button', { name: /Robert Chen/ }).click();
    await expect(page.getByRole('heading', { name: 'Robert Chen' })).toBeVisible();
    await page.getByRole('button', { name: 'Dashboard' }).first().click();

    // Add Resident Attention from the Dashboard quick action.
    await page.getByRole('button', { name: 'Add Attention' }).click();
    await page.getByLabel("What's being tracked").fill('Sleep Tracking');
    await page.getByRole('button', { name: 'Add Attention Item' }).click();
    await expect(page.getByText('Sleep Tracking').first()).toBeVisible();

    // Customize: hide Away From Unit, save, confirm it disappears.
    await page.getByRole('button', { name: 'Customize' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByText('Away From Unit').locator('xpath=ancestor::li').getByRole('checkbox').uncheck();
    await dialog.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Away From Unit' })).toHaveCount(0);

    // Enable Code of the Month in Settings and confirm it appears back on the Dashboard.
    await page.getByRole('button', { name: 'Settings' }).first().click();
    await page.getByRole('button', { name: /Emergency Codes/ }).click();
    await expect(page.getByText('Code Red')).toBeVisible();
    await page.getByLabel(/Show "Code of the Month"/).check();
    await page.getByRole('combobox').selectOption({ label: 'Code Red — Fire' });

    await page.getByRole('button', { name: 'Dashboard' }).first().click();
    await expect(page.getByText('CODE RED')).toBeVisible();
    await expect(page.getByText('Fire')).toBeVisible();
  });
});
