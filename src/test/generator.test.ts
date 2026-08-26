import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { generateShiftSheet, isDateDue, sortRoomNumbers } from '../services/generator';
import { PrintService, calculateAdaptivePrintLayout } from '../services/print';
import { ROLE_HCA_ID, ROLE_LPN_ID, SHIFT_HCA_DAY_ID, SHIFT_LPN_DAY_ID } from '../data/defaultData';
import { ALBERTA_TASK_TEMPLATES } from '../data/albertaCatalog';
import { recordPrint, detectChanges, buildWhatChangedModel } from '../services/printHistory';
import { buildHcaDailyPackage, buildLpnClinicalPackage } from '../services/print/packages';
import { detectAttentionIndicators, getPrintAttentionTags, getPrintAttentionLegend } from '../services/attention';
import { compressTaskInstruction, filterPrioritizedAttentionTags } from '../services/print';
import { isTimeWithinShift } from '../services/scheduling/timeWindow';
import { filterCatalogTasks, getCommonCatalogTasks, getRoleCatalogTasks } from '../services/catalogDiscovery';

describe('TaskSheet Generator & Domain Core Tests', () => {
  beforeEach(() => {
    // Reset database to fresh clean default state
    db.resetToDemoState();
  });

  it('uses end-exclusive shift windows for normal and overnight shifts', () => {
    expect(isTimeWithinShift('0700', '0700', '1500')).toBe(true);
    expect(isTimeWithinShift('1459', '0700', '1500')).toBe(true);
    expect(isTimeWithinShift('1500', '0700', '1500')).toBe(false);
    expect(isTimeWithinShift('1715', '0700', '1500')).toBe(false);
    expect(isTimeWithinShift('0659', '0700', '1500')).toBe(false);

    expect(isTimeWithinShift('2300', '2300', '0700')).toBe(true);
    expect(isTimeWithinShift('0000', '2300', '0700')).toBe(true);
    expect(isTimeWithinShift('0659', '2300', '0700')).toBe(true);
    expect(isTimeWithinShift('0700', '2300', '0700')).toBe(false);
    expect(isTimeWithinShift('2460', '2300', '0700')).toBe(false);
  });

  it('excludes and reports out-of-window resident and unit tasks, including imported data', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Window', lastName: 'Test', roomNumber: '104', status: 'active' });
    const shift = db.addShift({
      name: 'Boundary D1',
      shortCode: 'BD1',
      roleId: ROLE_HCA_ID,
      startTime: '0700',
      endTime: '1500',
      isActive: true,
    });

    for (const time of ['0700', '1459', '1500', '1715', '0659']) {
      db.addResidentTask({
        residentId: resident.id,
        shiftId: shift.id,
        title: `Resident ${time}`,
        category: 'Boundary Test',
        frequency: 'daily',
        time,
      });
    }
    db.addResidentTask({
      residentId: resident.id,
      shiftId: shift.id,
      title: 'Imported invalid task',
      category: 'Boundary Test',
      frequency: 'daily',
      time: '1716',
      source: 'imported',
    });
    db.addUnitTask({
      shiftId: shift.id,
      title: 'Valid unit boundary',
      category: 'Boundary Test',
      shiftPhase: 'start',
      frequency: 'daily',
      time: '0700',
    });
    db.addUnitTask({
      shiftId: shift.id,
      title: 'Invalid unit boundary',
      category: 'Boundary Test',
      shiftPhase: 'end',
      frequency: 'daily',
      time: '1500',
    });

    const sheet = generateShiftSheet('2026-08-25', shift.id);
    const printedTimes = sheet.residentAssignments.flatMap(a => a.tasks.map(t => t.time));
    expect(printedTimes).toEqual(['0700', '1459']);
    expect(sheet.startUnitTasks.map(t => t.time)).toEqual(['0700']);
    expect(sheet.endUnitTasks).toHaveLength(0);
    expect(sheet.exceptions).toHaveLength(5);
    expect(sheet.exceptions.some(e => e.title === 'Imported invalid task' && e.source === 'imported')).toBe(true);
    expect(sheet.exceptions.some(e => e.taskType === 'unit_task' && e.time === '1500')).toBe(true);
    expect(sheet.metrics.exceptionCount).toBe(5);

    const otherHcaShift = db.getState().shifts.find(item => item.roleId === ROLE_HCA_ID && item.id !== shift.id);
    expect(otherHcaShift).toBeDefined();
    if (otherHcaShift) {
      const otherSheet = generateShiftSheet('2026-08-25', otherHcaShift.id);
      const otherUnitTasks = [...otherSheet.startUnitTasks, ...otherSheet.duringUnitTasks, ...otherSheet.endUnitTasks];
      expect(otherUnitTasks.some(task => task.title === 'Invalid unit boundary')).toBe(false);
    }

    const printModel = PrintService.createDocumentModel(sheet, 'simple_checklist');
    expect(printModel.exceptions).toEqual(sheet.exceptions);
    expect(printModel.tableRows.some(row => row.taskTitle === 'Imported invalid task')).toBe(false);

    const packageModel = buildHcaDailyPackage('2026-08-25', { includeBathingGrid: false });
    expect(packageModel.exceptions.some(e => e.title === 'Imported invalid task')).toBe(true);
  });

  it('prints overnight times through 0659 and excludes the 0700 end boundary', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Night', lastName: 'Boundary', roomNumber: '401', status: 'active' });
    const shift = db.addShift({
      name: 'Boundary N1',
      shortCode: 'BN1',
      roleId: ROLE_HCA_ID,
      startTime: '2300',
      endTime: '0700',
      isActive: true,
    });
    for (const time of ['2300', '0000', '0659', '0700']) {
      db.addResidentTask({
        residentId: resident.id,
        shiftId: shift.id,
        title: `Night ${time}`,
        category: 'Boundary Test',
        frequency: 'daily',
        time,
      });
    }

    const sheet = generateShiftSheet('2026-08-25', shift.id);
    const printedTimes = sheet.residentAssignments.flatMap(a => a.tasks.map(t => t.time));
    expect(new Set(printedTimes)).toEqual(new Set(['2300', '0000', '0659']));
    expect(sheet.exceptions.map(e => e.time)).toEqual(['0700']);
  });

  it('excludes edited resident and unit tasks moved outside their assigned shift', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Edited', lastName: 'Boundary', roomNumber: '105', status: 'active' });
    const shift = db.addShift({
      name: 'Edited D1',
      shortCode: 'ED1',
      roleId: ROLE_HCA_ID,
      startTime: '0700',
      endTime: '1500',
      isActive: true,
    });
    const residentTask = db.addResidentTask({
      residentId: resident.id,
      shiftId: shift.id,
      title: 'Edited resident task',
      category: 'Boundary Test',
      frequency: 'daily',
      time: '0900',
    });
    const unitTask = db.addUnitTask({
      shiftId: shift.id,
      title: 'Edited unit task',
      category: 'Boundary Test',
      shiftPhase: 'during',
      frequency: 'daily',
      time: '1000',
    });

    const validSheet = generateShiftSheet('2026-08-25', shift.id);
    expect(validSheet.residentAssignments.flatMap(a => a.tasks).some(t => t.id === residentTask.id)).toBe(true);
    expect(validSheet.duringUnitTasks.some(t => t.id === unitTask.id)).toBe(true);

    db.updateResidentTask(residentTask.id, { time: '1715' });
    db.updateUnitTask(unitTask.id, { time: '1715' });

    const editedSheet = generateShiftSheet('2026-08-25', shift.id);
    expect(editedSheet.residentAssignments.flatMap(a => a.tasks).some(t => t.id === residentTask.id)).toBe(false);
    expect(editedSheet.duringUnitTasks.some(t => t.id === unitTask.id)).toBe(false);
    expect(editedSheet.exceptions).toEqual(expect.arrayContaining([
      expect.objectContaining({ taskId: residentTask.id, taskType: 'resident_task', time: '1715' }),
      expect.objectContaining({ taskId: unitTask.id, taskType: 'unit_task', time: '1715' }),
    ]));
    expect(editedSheet.metrics.exceptionCount).toBe(2);
  });

  it('correctly derives Role from configured Shift without re-asking user', () => {
    const today = new Date().toISOString().split('T')[0];
    const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
    expect(sheet.shift.name).toBe('LPN Day');
    expect(sheet.role.id).toBe(ROLE_LPN_ID);
    expect(sheet.role.name).toBe('Licensed Practical Nurse');
  });

  it('guarantees Room Reuse Safety: Resident B in Room 254 receives zero bleed from Resident A', () => {
    // Resident A is Mary Smith in Room 254
    const mary = db.getState().residents.find(r => r.roomNumber === '254');
    expect(mary).toBeDefined();
    if (!mary) return;

    // Delete Mary Smith (discharged/moved)
    db.deleteResident(mary.id);

    // Verify Mary's tasks and wounds are deleted
    expect(db.getState().residentTasks.filter(t => t.residentId === mary.id).length).toBe(0);
    expect(db.getState().wounds.filter(w => w.residentId === mary.id).length).toBe(0);
    expect(db.getState().fyis.filter(f => f.residentId === mary.id).length).toBe(0);

    // Now Resident B moves into Room 254
    const newResident = db.addResident({
      firstName: 'George',
      lastName: 'Miller',
      roomNumber: '254',
      status: 'active',
      notes: 'New occupant of Room 254'
    });

    // Verify George has 0 initial tasks/wounds/bleed
    const newResidentTasks = db.getState().residentTasks.filter(t => t.residentId === newResident.id);
    const newResidentWounds = db.getState().wounds.filter(w => w.residentId === newResident.id);
    const newResidentFYIs = db.getState().fyis.filter(f => f.residentId === newResident.id);

    expect(newResidentTasks.length).toBe(0);
    expect(newResidentWounds.length).toBe(0);
    expect(newResidentFYIs.length).toBe(0);
  });

  it('suppresses care assignments for residents who are In Hospital or Out on Pass', () => {
    const today = new Date().toISOString().split('T')[0];
    const state = db.getState();
    const hospitalRes = state.residents.find(r => r.status === 'in_hospital');
    expect(hospitalRes).toBeDefined();

    const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
    const residentIdsInSheet = sheet.residentAssignments.map(a => a.resident.id);

    if (hospitalRes) {
      expect(residentIdsInSheet).not.toContain(hospitalRes.id);
    }
  });

  it('correctly evaluates recurrence frequencies (daily, selected days, weekly, monthly)', () => {
    const testDate = '2026-08-24'; // Monday (day 1)

    expect(isDateDue(testDate, 'daily')).toBe(true);
    expect(isDateDue(testDate, 'selected_days', { basis: 'selected_weekdays', selectedDays: [1, 3] })).toBe(true);
    expect(isDateDue(testDate, 'selected_days', { basis: 'selected_weekdays', selectedDays: [2, 4] })).toBe(false);
    expect(isDateDue(testDate, 'monthly', { basis: 'monthly_day', dayOfMonth: 24 })).toBe(true);
    expect(isDateDue(testDate, 'monthly', { basis: 'monthly_day', dayOfMonth: 15 })).toBe(false);
  });

  it('generates unified PrintDocumentModel with complete facility header and appropriate print profile', () => {
    const today = new Date().toISOString().split('T')[0];
    const sheetLpn = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
    const docLpn = PrintService.createDocumentModel(sheetLpn, 'clinical_worksheet');

    expect(docLpn.header.facility.siteName).toBe('Cedar Grove Continuing Care');
    expect(docLpn.header.facility.mainPhone).toBe('403-555-0100');
    expect(docLpn.header.roleName).toBe('Licensed Practical Nurse');
    expect(docLpn.profile).toBe('clinical_worksheet');
    expect(docLpn.showQuickVitalsGrid).toBe(true);
    expect(docLpn.quickVitalsRowsCount).toBe(8);

    const sheetHca = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
    const docHca = PrintService.createDocumentModel(sheetHca, 'simple_checklist');
    expect(docHca.header.roleName).toBe('Health Care Aide');
    expect(docHca.profile).toBe('simple_checklist');
    expect(docHca.showQuickVitalsGrid).toBe(false);
  });

  it('separates standard catalog from demo configuration: Clear Demo starts a blank real setup', () => {
    const initialCatalogCount = db.getState().catalogTaskTemplates.length;
    expect(initialCatalogCount).toBeGreaterThan(20);

    // Clear demo
    db.clearDemoData();
    const demoResidents = db.getState().residents.filter(r => r.source === 'demo');
    expect(demoResidents.length).toBe(0);

    // Catalog must be 100% intact!
    expect(db.getState().catalogTaskTemplates.length).toBe(initialCatalogCount);
    expect(db.getState().roles.length).toBeGreaterThanOrEqual(4);
    expect(db.getState().shifts).toHaveLength(0);
    expect(db.getState().facility.siteName).toBe('');
    expect(db.getState().settings.dataMode).toBe('setup_required');
  });

  it('sorts room numbers naturally (e.g. 101, 103A, 103B, 201, 254, 329B)', () => {
    const rooms = ['329B', '103B', '101', '254', '103A', '201'];
    const sorted = [...rooms].sort(sortRoomNumbers);
    expect(sorted).toEqual(['101', '103A', '103B', '201', '254', '329B']);
  });
});

describe('Alberta Standard Starter Catalog Tests', () => {
  beforeEach(() => {
    db.installAlbertaCatalog();
  });

  it('has stable and exact definitions for TaskSheet MAP1, MAP2, and MAP3', () => {
    const templates = db.getState().catalogTaskTemplates;
    const map1 = templates.find(t => t.slug === 'hca.medication.map1');
    const map2 = templates.find(t => t.slug === 'hca.medication.map2');
    const map3 = templates.find(t => t.slug === 'hca.medication.map3');

    expect(map1).toBeDefined();
    expect(map1?.title).toBe('MAP1 — Medication Reminder');
    expect(map1?.defaultInstructions).toContain('Reminder only');
    expect(map1?.carePlanDependent).toBe(true);
    expect(map1?.authorizationDependent).toBe(true);

    expect(map2).toBeDefined();
    expect(map2?.title).toBe('MAP2 — Partial Medication Assistance');
    expect(map2?.defaultInstructions).toContain('Partial assistance');
    expect(map2?.carePlanDependent).toBe(true);
    expect(map2?.authorizationDependent).toBe(true);

    expect(map3).toBeDefined();
    expect(map3?.title).toBe('MAP3 — Full Medication Assistance');
    expect(map3?.defaultInstructions).toContain('Full assistance');
    expect(map3?.carePlanDependent).toBe(true);
    expect(map3?.authorizationDependent).toBe(true);
  });

  it('shows MAP1, MAP2, and MAP3 in Common Quick Add for both HCA and LPN roles', () => {
    const templates = db.getState().catalogTaskTemplates;
    const expectedSlugs = [
      'hca.medication.map1',
      'hca.medication.map2',
      'hca.medication.map3',
    ];

    const hcaCommon = getCommonCatalogTasks(getRoleCatalogTasks(templates, 'HCA'));
    const lpnCommon = getCommonCatalogTasks(getRoleCatalogTasks(templates, 'LPN'));

    expect(hcaCommon.slice(0, 3).map(task => task.slug)).toEqual(expectedSlugs);
    expect(lpnCommon.slice(0, 3).map(task => task.slug)).toEqual(expectedSlugs);
  });

  it('offers Wellness Check as a common editable task for both HCA and LPN', () => {
    const templates = db.getState().catalogTaskTemplates;
    const wellness = templates.find(task => task.slug === 'shared.monitoring.wellness_check');

    expect(wellness).toBeDefined();
    expect(wellness?.title).toBe('Wellness Check');
    expect(wellness?.roleCode).toBe('SHARED');
    expect(wellness?.defaultInstructions).toContain('comfort');

    for (const roleCode of ['HCA', 'LPN']) {
      const roleTasks = getRoleCatalogTasks(templates, roleCode);
      expect(roleTasks.some(task => task.slug === wellness?.slug)).toBe(true);
      expect(getCommonCatalogTasks(roleTasks).some(task => task.slug === wellness?.slug)).toBe(true);
    }
  });

  it('provides editable starter instructions for every standard catalog task', () => {
    expect(ALBERTA_TASK_TEMPLATES.length).toBeGreaterThan(0);
    expect(ALBERTA_TASK_TEMPLATES.every(task => Boolean(task.defaultInstructions?.trim()))).toBe(true);
  });

  it('finds Medication Assistance by displayed category name for HCA and LPN', () => {
    const state = db.getState();

    for (const roleCode of ['HCA', 'LPN']) {
      const results = filterCatalogTasks(
        getRoleCatalogTasks(state.catalogTaskTemplates, roleCode),
        state.catalogCategories,
        'Medication Assistance',
      );
      const resultSlugs = results.map(task => task.slug);

      expect(resultSlugs).toEqual(expect.arrayContaining([
        'hca.medication.map1',
        'hca.medication.map2',
        'hca.medication.map3',
      ]));
    }
  });

  it('ensures all catalog task template slugs are completely unique', () => {
    const templates = db.getState().catalogTaskTemplates;
    const slugs = templates.map(t => t.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it('strictly preserves the Observation vs Assessment distinction between HCA and LPN', () => {
    const templates = db.getState().catalogTaskTemplates;

    // HCA tasks use Observation
    const hcaSkin = templates.find(t => t.slug === 'hca.positioning.skin_observation');
    const hcaCatheter = templates.find(t => t.slug === 'hca.continence.catheter_obs');
    const hcaPain = templates.find(t => t.slug === 'hca.monitoring.pain_behaviour_obs');

    expect(hcaSkin?.title).toContain('Observation');
    expect(hcaCatheter?.title).toContain('Observation');
    expect(hcaPain?.title).toContain('Observation');

    // LPN tasks use Assessment
    const lpnCatheter = templates.find(t => t.slug === 'lpn.catheter.assessment');
    const lpnPain = templates.find(t => t.slug === 'lpn.pain.assessment');
    const lpnVitals = templates.find(t => t.slug === 'lpn.monitoring.full_vitals');

    expect(lpnCatheter?.title).toContain('Assessment');
    expect(lpnPain?.title).toContain('Assessment');
    expect(lpnVitals?.roleCode).toBe('LPN');
  });

  it('preserves user custom tasks upon catalog reset/re-install', () => {
    // Add custom task
    const custom = db.addCustomTaskTemplate({
      slug: 'custom.resident.foot_soak',
      title: 'Warm Foot Soak with Epsom Salts',
      categoryId: 'cat-am-care',
      roleCode: 'HCA',
      defaultFrequency: 'weekly',
      defaultInstructions: 'Provide 10 min foot soak as requested.'
    });

    expect(db.getState().catalogTaskTemplates.find(t => t.slug === custom.slug)).toBeDefined();

    // Re-install Alberta standard catalog
    db.installAlbertaCatalog();

    // Custom task must still be present!
    const foundCustom = db.getState().catalogTaskTemplates.find(t => t.slug === custom.slug);
    expect(foundCustom).toBeDefined();
    expect(foundCustom?.title).toBe('Warm Foot Soak with Epsom Salts');
  });

  it('includes HS Care category and standardized bedtime care templates', () => {
    const categories = db.getState().catalogCategories;
    const hsCat = categories.find(c => c.id === 'cat-hs-care');
    expect(hsCat).toBeDefined();
    expect(hsCat?.name).toBe('HS Care');

    const templates = db.getState().catalogTaskTemplates;
    const hsComplete = templates.find(t => t.slug === 'hca.hs.hs_care_complete');
    expect(hsComplete).toBeDefined();
    expect(hsComplete?.title).toBe('HS Care — Complete');
    expect(hsComplete?.defaultTime).toBe('2000');
    expect(hsComplete?.synonyms).toContain('bedtime care');

    const hsCallBell = templates.find(t => t.slug === 'hca.hs.ensure_call_bell');
    expect(hsCallBell).toBeDefined();
  });

  it('Acceptance Test 1 — Care Task Edit: modifies time and updates generated shift sheet', () => {
    const mary = db.getState().residents.find(r => r.roomNumber === '254');
    expect(mary).toBeDefined();
    if (!mary) return;

    const maryCareTask = db.getState().residentTasks.find(t => t.residentId === mary.id && t.title.includes('Morning Personal Care'));
    expect(maryCareTask).toBeDefined();
    if (!maryCareTask) return;

    // Edit time from 0800 to 0745
    db.updateResidentTask(maryCareTask.id, { time: '0745' });

    const today = new Date().toISOString().split('T')[0];
    const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
    const maryAssignment = sheet.residentAssignments.find(a => a.resident.id === mary.id);
    const updatedTask = maryAssignment?.tasks.find(t => t.id === maryCareTask.id);

    expect(updatedTask).toBeDefined();
    expect(updatedTask?.time).toBe('0745');
  });

  it('Acceptance Test 2 — Unit Task Edit: modifies time and updates generated shift sheet', () => {
    const fridgeTask = db.getState().unitTasks.find(u => u.title.includes('Fridge Temperature'));
    expect(fridgeTask).toBeDefined();
    if (!fridgeTask) return;

    // Edit time from 0730 to 0715
    db.updateUnitTask(fridgeTask.id, { time: '0715' });

    const today = new Date().toISOString().split('T')[0];
    const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
    const updatedUnit = sheet.startUnitTasks.find(u => u.id === fridgeTask.id);

    expect(updatedUnit).toBeDefined();
    expect(updatedUnit?.time).toBe('0715');
  });

  it('Acceptance Test 3 — Stop Task with History: halts future generation while preserving historical completions', () => {
    const today = new Date().toISOString().split('T')[0];
    const taskWithHistory = db.getState().residentTasks.find(t => t.id === 'task-cd-01');
    expect(taskWithHistory).toBeDefined();
    if (!taskWithHistory) return;

    // ADR-001: legacyCompletions are retained for safe migration only; no new records are created
    const initialCompletionCount = db.getState().legacyCompletions.filter(c => c.entityId === taskWithHistory.id).length;

    // Stop Task (Deactivate) — this sets stoppedAt which makes hasTaskHistory true
    db.stopResidentTask(taskWithHistory.id);
    expect(db.getState().residentTasks.find(t => t.id === taskWithHistory.id)?.isActive).toBe(false);

    // After stopping, hasTaskHistory should return true (stoppedAt is set)
    expect(db.hasTaskHistory(taskWithHistory.id)).toBe(true);

    // Verify future shift sheet excludes stopped task
    const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
    const cdAssignment = sheet.residentAssignments.find(a => a.resident.id === taskWithHistory.residentId);
    expect(cdAssignment?.tasks.some(t => t.id === taskWithHistory.id)).toBe(false);

    // Verify legacy completion records are preserved (none created by new architecture)
    const remainingCompletions = db.getState().legacyCompletions.filter(c => c.entityId === taskWithHistory.id);
    expect(remainingCompletions.length).toBe(initialCompletionCount);
  });

  it('Acceptance Test 4 — Delete New Task: completely removes task with 0 history', () => {
    const mary = db.getState().residents.find(r => r.roomNumber === '254');
    expect(mary).toBeDefined();
    if (!mary) return;

    // Add a mistaken task with no history
    const mistakenTask = db.addResidentTask({
      residentId: mary.id,
      shiftId: SHIFT_HCA_DAY_ID,
      roleId: ROLE_HCA_ID,
      title: 'Mistaken Task Entry',
      category: 'AM Care',
      time: '0900',
      frequency: 'daily'
    });

    expect(db.getState().residentTasks.find(t => t.id === mistakenTask.id)).toBeDefined();
    expect(db.hasTaskHistory(mistakenTask.id)).toBe(false);

    // Delete mistaken task
    db.deleteResidentTask(mistakenTask.id);
    expect(db.getState().residentTasks.find(t => t.id === mistakenTask.id)).toBeUndefined();
  });

  it('Acceptance Test 5 — Duplicate Task: clones task with unique UUID and editable properties', () => {
    const sourceTask = db.getState().residentTasks[0];
    expect(sourceTask).toBeDefined();

    const clonedTask = db.duplicateResidentTask(sourceTask.id, { time: '1200' });
    expect(clonedTask).toBeDefined();
    expect(clonedTask?.id).not.toBe(sourceTask.id);
    expect(clonedTask?.time).toBe('1200');
    expect(clonedTask?.title).toBe(sourceTask.title);
    expect(clonedTask?.isActive).toBe(true);
  });

  it('Acceptance Test 6 — Shift Custom Short Codes: creates D1, D2, LP1, NLPN and verifies role/time independence', () => {
    // 1. Shift D1 (HCA Day)
    const shiftD1 = db.addShift({
      name: 'HCA Day',
      shortCode: 'D1-TEST',
      roleId: ROLE_HCA_ID,
      startTime: '0700',
      endTime: '1500'
    });
    expect(shiftD1.shortCode).toBe('D1-TEST');
    expect(shiftD1.roleId).toBe(ROLE_HCA_ID);

    // 2. Shift D2 (HCA Day 2)
    const shiftD2 = db.addShift({
      name: 'HCA Day 2',
      shortCode: 'D2-TEST',
      roleId: ROLE_HCA_ID,
      startTime: '0700',
      endTime: '1500'
    });
    expect(shiftD2.shortCode).toBe('D2-TEST');

    // 3. Shift LP1 (LPN Day)
    const shiftLP1 = db.addShift({
      name: 'LPN Day',
      shortCode: 'LP1-TEST',
      roleId: ROLE_LPN_ID,
      startTime: '0700',
      endTime: '1900'
    });
    expect(shiftLP1.shortCode).toBe('LP1-TEST');

    // 4. Shift NLPN (LPN Overnight 2300–0700)
    const shiftNLPN = db.addShift({
      name: 'LPN Overnight',
      shortCode: 'NLPN-TEST',
      roleId: ROLE_LPN_ID,
      startTime: '2300',
      endTime: '0700'
    });
    expect(shiftNLPN.shortCode).toBe('NLPN-TEST');

    // Verify all 4 shifts generate proper sheets with auto-derived roles
    const today = new Date().toISOString().split('T')[0];
    const sheetD1 = generateShiftSheet(today, shiftD1.id);
    expect(sheetD1.role.id).toBe(ROLE_HCA_ID);

    const sheetNLPN = generateShiftSheet(today, shiftNLPN.id);
    expect(sheetNLPN.role.id).toBe(ROLE_LPN_ID);
    expect(sheetNLPN.shift.shortCode).toBe('NLPN-TEST');
  });

  it('Acceptance Test 7 — Shift Rename Short Code: renames LP1 to LPN1 without breaking relational integrity or print models', () => {
    const lpnShift = db.getState().shifts.find(s => s.id === SHIFT_LPN_DAY_ID);
    expect(lpnShift).toBeDefined();
    if (!lpnShift) return;

    // Rename shortCode from LP1 to LPN1
    db.updateShift(lpnShift.id, { shortCode: 'LPN1' });

    // Verify state updated
    const updated = db.getState().shifts.find(s => s.id === SHIFT_LPN_DAY_ID);
    expect(updated?.shortCode).toBe('LPN1');

    // Verify tasks remain linked
    const linkedCareTasks = db.getState().residentTasks.filter(t => t.shiftId === SHIFT_LPN_DAY_ID);
    expect(linkedCareTasks.length).toBeGreaterThan(0);

    const linkedUnitTasks = db.getState().unitTasks.filter(u => u.shiftId === SHIFT_LPN_DAY_ID);
    expect(linkedUnitTasks.length).toBeGreaterThan(0);

    // Verify future print model uses LPN1
    const today = new Date().toISOString().split('T')[0];
    const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
    const doc = PrintService.createDocumentModel(sheet);
    expect(doc.header.shiftShortCode).toBe('LPN1');
    expect(doc.header.shiftName).toContain('LPN1 — LPN Day');
  });

  it('Acceptance Test 8 — Shift Short Code Uniqueness: rejects duplicate active short codes with clear error', () => {
    // D1 already exists on active HCA Day
    expect(() => {
      db.addShift({
        name: 'Another Day Shift',
        shortCode: 'D1', // Duplicate of existing active D1
        roleId: ROLE_HCA_ID,
        startTime: '0700',
        endTime: '1500'
      });
    }).toThrow(/already being used by another active shift/i);

    // Case-insensitive duplicate check: 'd1'
    expect(() => {
      db.addShift({
        name: 'Another Day Shift 2',
        shortCode: 'd1',
        roleId: ROLE_HCA_ID,
        startTime: '0700',
        endTime: '1500'
      });
    }).toThrow(/already being used by another active shift/i);
  });

  it('exports catalog containing 0 residents, 0 assignments, 0 wounds, 0 completions', () => {
    const exportData = db.exportCatalog();

    expect(exportData.catalogName).toBe('Alberta Starter Catalog');
    expect(exportData.catalogVersion).toBe('1.0');
    expect(exportData.alignment).toContain('Alberta continuing-care aligned');
    expect(exportData.categories.length).toBeGreaterThanOrEqual(20);
    expect(exportData.taskTemplates.length).toBeGreaterThan(25);
    expect(exportData.unitTaskTemplates.length).toBeGreaterThan(5);

    // Verify 0 resident data leakage
    expect((exportData as any).residents).toBeUndefined();
    expect((exportData as any).residentTasks).toBeUndefined();
    expect((exportData as any).wounds).toBeUndefined();
    expect((exportData as any).completions).toBeUndefined();
  });

  it('Phase 2 — Smart Reprints: records print snapshots and detects itemized added/modified/removed tasks', () => {
    const today = '2026-08-25';

    // 1. Initial snapshot (Rev 1)
    const initialTasks = [
      {
        id: 'task_1',
        roomNumber: '101',
        residentName: 'Arthur Pendleton',
        title: 'Morning Personal Care',
        time: '0745',
        category: 'Personal Care',
        instructions: 'Setup for shaving',
        updatedAt: '2026-08-25T07:00:00Z',
      },
      {
        id: 'task_2',
        roomNumber: '254',
        residentName: 'Mary Smith',
        title: 'Safety Check',
        time: '1300',
        category: 'Safety',
        instructions: 'Safety sweep',
        updatedAt: '2026-08-25T07:00:00Z',
      }
    ];

    const entry1 = recordPrint({
      shiftId: SHIFT_HCA_DAY_ID,
      shiftCode: 'D1',
      shiftName: 'HCA Day',
      date: today,
      profile: 'simple_checklist',
      totalItems: 2,
      items: initialTasks,
    });

    expect(entry1.revision).toBe(1);

    // Initial check: no changes
    const noChanges = detectChanges(SHIFT_HCA_DAY_ID, today, initialTasks);
    expect(noChanges?.hasChanges).toBe(false);

    // 2. Introduce changes: 1 added, 1 modified, 1 removed
    const updatedTasks = [
      // task_1 modified instructions
      {
        id: 'task_1',
        roomNumber: '101',
        residentName: 'Arthur Pendleton',
        title: 'Morning Personal Care',
        time: '0745',
        category: 'Personal Care',
        instructions: 'Setup for shaving and assist with warm washcloth',
        updatedAt: '2026-08-25T09:30:00Z',
      },
      // task_2 removed
      // task_3 added
      {
        id: 'task_3',
        roomNumber: '320',
        residentName: 'Irene Lockwood',
        title: 'Afternoon Hydration',
        time: '1415',
        category: 'Nutrition',
        instructions: 'Offer orange juice',
        updatedAt: '2026-08-25T09:35:00Z',
      }
    ];

    const changeSummary = detectChanges(SHIFT_HCA_DAY_ID, today, updatedTasks);
    expect(changeSummary?.hasChanges).toBe(true);
    expect(changeSummary?.added).toBe(1);
    expect(changeSummary?.modified).toBe(1);
    expect(changeSummary?.removed).toBe(1);

    // 3. Build What Changed model
    const deltaModel = buildWhatChangedModel(SHIFT_HCA_DAY_ID, today, updatedTasks);
    expect(deltaModel).not.toBeNull();
    expect(deltaModel?.previousRevision).toBe(1);
    expect(deltaModel?.newRevision).toBe(2);
    expect(deltaModel?.added.length).toBe(1);
    expect(deltaModel?.added[0].title).toBe('Afternoon Hydration');
    expect(deltaModel?.modified.length).toBe(1);
    expect(deltaModel?.modified[0].current.instructions).toContain('warm washcloth');
    expect(deltaModel?.removed.length).toBe(1);
    expect(deltaModel?.removed[0].residentName).toBe('Mary Smith');
  });

  it('Phase 3 — Print Packages: bundles multi-document HCA Daily Package and LPN Clinical Package with correct attachments', () => {
    const today = '2026-08-25';

    // 1. Test HCA Daily Package
    const hcaPkg = buildHcaDailyPackage(today, { includeBathingGrid: true, includeFyiReference: true });
    expect(hcaPkg.packageType).toBe('hca_daily_package');
    expect(hcaPkg.items.length).toBeGreaterThanOrEqual(2); // at least D1/D2 + Bathing grid
    
    const shiftItem = hcaPkg.items.find((i: any) => i.docType === 'shift_document');
    expect(shiftItem).toBeDefined();
    expect(shiftItem?.isLandscape).toBe(false); // HCA is portrait

    const bathingItem = hcaPkg.items.find((i: any) => i.docType === 'bathing_grid');
    expect(bathingItem).toBeDefined();
    expect(bathingItem?.isLandscape).toBe(true); // Bathing grid is landscape

    expect(hcaPkg.estimatedTotalPages).toBeGreaterThanOrEqual(2);

    // 2. Test LPN Clinical Package
    const lpnPkg = buildLpnClinicalPackage(today, { includeWoundSchedule: true, includeFyiReference: true });
    expect(lpnPkg.packageType).toBe('lpn_clinical_package');
    expect(lpnPkg.items.length).toBeGreaterThanOrEqual(2); // at least LP1 + Wound schedule

    const lpnShiftItem = lpnPkg.items.find((i: any) => i.docType === 'shift_document');
    expect(lpnShiftItem).toBeDefined();
    expect(lpnShiftItem?.isLandscape).toBe(true); // LPN is landscape

    const woundItem = lpnPkg.items.find((i: any) => i.docType === 'wound_schedule');
    expect(woundItem).toBeDefined();
    expect(woundItem?.isLandscape).toBe(true); // Wound schedule is landscape
  });

  it('Phase 4 — Print Profile Editor: applies custom density, large print, and custom Quick Vitals columns to PrintDocumentModel', () => {
    const today = '2026-08-25';
    const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);

    // Custom LPN profile configuration with spacious density, large print, and custom vitals columns
    const customLpnProfile = {
      id: 'profile_lpn_custom_test',
      name: 'Custom Night LPN Profile',
      profileType: 'clinical_worksheet' as const,
      density: 'spacious' as const,
      largePrint: true,
      handoffLinesCount: 7,
      quickVitalsRowsCount: 12,
      quickVitalsColumns: [
        { id: 'bp', label: 'Blood Pressure', shortLabel: 'BP', enabled: true },
        { id: 'hr', label: 'Heart Rate', shortLabel: 'HR', enabled: true },
        { id: 'bg', label: 'Blood Glucose', shortLabel: 'BG', enabled: true },
        { id: 'pain', label: 'Pain Score', shortLabel: 'Pain', enabled: true },
        { id: 'bm', label: 'Bowel Movement', shortLabel: 'BM', enabled: true },
        { id: 'initials', label: 'Initials', shortLabel: 'Init', enabled: true },
      ],
      showStartUnitTasks: true,
      showDuringUnitTasks: false,
      showEndUnitTasks: true,
      showImportantFYIs: true,
      showHandoffLines: true,
    };

    const doc = PrintService.createDocumentModel(sheet, customLpnProfile);

    expect(doc.density).toBe('spacious');
    expect(doc.largePrint).toBe(true);
    expect(doc.handoffNotesLinesCount).toBe(7);
    expect(doc.quickVitalsRowsCount).toBe(12);
    expect(doc.quickVitalsColumns?.length).toBe(6);
    expect(doc.quickVitalsColumns?.some(c => c.shortLabel === 'BG')).toBe(true);
    expect(doc.quickVitalsColumns?.some(c => c.shortLabel === 'BM')).toBe(true);
    expect(doc.duringUnitTasks.length).toBe(0); // during unit tasks suppressed by config
  });

  it('Phase 5 — Facility Branding & Compliance: propagates custom facility branding and confidentiality notices to print models', () => {
    const today = '2026-08-25';
    const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);

    // Verify confidentiality notice presence
    const doc = PrintService.createDocumentModel(sheet);
    expect(doc.confidentialityNotice).toBeDefined();
    expect(doc.confidentialityNotice).toContain('CONFIDENTIAL HEALTHCARE RECORD');

    // Update facility branding notice
    db.updateFacilitySettings({
      branding: {
        headerStyle: 'compact',
        confidentialityNotice: 'CUSTOM TEST LEGAL NOTICE · SHRED UPON COMPLETION',
        showConfidentialityNotice: true,
        showSupervisorSignatureBlock: true,
        watermarkStyle: 'confidential',
      }
    });

    const customDoc = PrintService.createDocumentModel(sheet);
    expect(customDoc.confidentialityNotice).toBe('CUSTOM TEST LEGAL NOTICE · SHRED UPON COMPLETION');
  });

  describe('Full Spectrum Recurrence Engine Tests', () => {
    it('evaluates ONE_TIME only on the specific anchor date', () => {
      const rule = { type: 'ONE_TIME' as const, specificDate: '2026-08-25', startDate: '2026-08-25' };
      expect(isDateDue('2026-08-25', 'once', rule)).toBe(true);
      expect(isDateDue('2026-08-26', 'once', rule)).toBe(false);
      expect(isDateDue('2026-08-24', 'once', rule)).toBe(false);
    });

    it('evaluates EVERY_N_DAYS (Every Other Day and Every 28 Days)', () => {
      // Every Other Day starting Aug 25, 2026
      const everyOtherDay = { type: 'EVERY_N_DAYS' as const, interval: 2, startDate: '2026-08-25' };
      expect(isDateDue('2026-08-25', 'custom', everyOtherDay)).toBe(true);
      expect(isDateDue('2026-08-26', 'custom', everyOtherDay)).toBe(false);
      expect(isDateDue('2026-08-27', 'custom', everyOtherDay)).toBe(true);
      expect(isDateDue('2026-08-28', 'custom', everyOtherDay)).toBe(false);
      expect(isDateDue('2026-08-29', 'custom', everyOtherDay)).toBe(true);
      expect(isDateDue('2026-08-31', 'custom', everyOtherDay)).toBe(true);
      expect(isDateDue('2026-09-02', 'custom', everyOtherDay)).toBe(true);

      // Every 28 Days starting Aug 25, 2026 -> next due Sep 22, 2026
      const every28Days = { type: 'EVERY_N_DAYS' as const, interval: 28, startDate: '2026-08-25' };
      expect(isDateDue('2026-08-25', 'custom', every28Days)).toBe(true);
      expect(isDateDue('2026-09-21', 'custom', every28Days)).toBe(false);
      expect(isDateDue('2026-09-22', 'custom', every28Days)).toBe(true);
    });

    it('evaluates SELECTED_WEEKDAYS (Mon / Wed / Fri)', () => {
      // Aug 25 2026 = Tue, Aug 26 = Wed, Aug 27 = Thu, Aug 28 = Fri, Aug 31 = Mon
      const mwf = { type: 'SELECTED_WEEKDAYS' as const, weekdays: [1, 3, 5], startDate: '2026-08-25' };
      expect(isDateDue('2026-08-25', 'selected_days', mwf)).toBe(false); // Tuesday
      expect(isDateDue('2026-08-26', 'selected_days', mwf)).toBe(true);  // Wednesday
      expect(isDateDue('2026-08-27', 'selected_days', mwf)).toBe(false); // Thursday
      expect(isDateDue('2026-08-28', 'selected_days', mwf)).toBe(true);  // Friday
      expect(isDateDue('2026-08-31', 'selected_days', mwf)).toBe(true);  // Monday
    });

    it('evaluates EVERY_N_WEEKS (Every 2 Weeks on Tuesday)', () => {
      // Aug 25 2026 = Tuesday (Week 0)
      // Sep 01 2026 = Tuesday (Week 1 -> false)
      // Sep 08 2026 = Tuesday (Week 2 -> true)
      const every2Weeks = { type: 'EVERY_N_WEEKS' as const, interval: 2, weekdays: [2], startDate: '2026-08-25' };
      expect(isDateDue('2026-08-25', 'every_2_weeks', every2Weeks)).toBe(true);
      expect(isDateDue('2026-09-01', 'every_2_weeks', every2Weeks)).toBe(false);
      expect(isDateDue('2026-09-08', 'every_2_weeks', every2Weeks)).toBe(true);
      expect(isDateDue('2026-09-15', 'every_2_weeks', every2Weeks)).toBe(false);
      expect(isDateDue('2026-09-22', 'every_2_weeks', every2Weeks)).toBe(true);
    });

    it('evaluates MONTHLY_DAY (22nd of every month)', () => {
      const monthly22 = { type: 'MONTHLY_DAY' as const, dayOfMonth: 22, startDate: '2026-08-01' };
      expect(isDateDue('2026-08-22', 'monthly', monthly22)).toBe(true);
      expect(isDateDue('2026-08-23', 'monthly', monthly22)).toBe(false);
      expect(isDateDue('2026-09-22', 'monthly', monthly22)).toBe(true);
    });

    it('evaluates MONTHLY_ORDINAL_WEEKDAY (First Monday of every month)', () => {
      // In Sep 2026: Sep 1=Tue, Sep 7=Mon (1st Monday)
      // In Oct 2026: Oct 1=Thu, Oct 5=Mon (1st Monday)
      const firstMonday = {
        type: 'MONTHLY_ORDINAL_WEEKDAY' as const,
        ordinal: 'first' as const,
        ordinalWeekday: 1, // Monday
        startDate: '2026-08-01'
      };

      expect(isDateDue('2026-09-07', 'custom', firstMonday)).toBe(true);
      expect(isDateDue('2026-09-14', 'custom', firstMonday)).toBe(false);
      expect(isDateDue('2026-10-05', 'custom', firstMonday)).toBe(true);
      expect(isDateDue('2026-10-12', 'custom', firstMonday)).toBe(false);
    });

    it('evaluates SELECTED_MONTHS (Quarterly: Mar, Jun, Sep, Dec on Day 15)', () => {
      const quarterly = {
        type: 'SELECTED_MONTHS' as const,
        months: [3, 6, 9, 12],
        dayOfMonth: 15,
        startDate: '2026-01-01'
      };

      expect(isDateDue('2026-08-15', 'custom', quarterly)).toBe(false); // August not in list
      expect(isDateDue('2026-09-15', 'custom', quarterly)).toBe(true);  // September in list
      expect(isDateDue('2026-10-15', 'custom', quarterly)).toBe(false); // October not in list
      expect(isDateDue('2026-12-15', 'custom', quarterly)).toBe(true);  // December in list
    });

    it('halts generation when endType is after_occurrences', () => {
      // Daily for 3 occurrences starting Aug 25, 2026 (Aug 25, Aug 26, Aug 27)
      const threeOccurrences = {
        type: 'DAILY' as const,
        startDate: '2026-08-25',
        endType: 'after_occurrences' as const,
        endOccurrencesCount: 3,
      };

      expect(isDateDue('2026-08-25', 'daily', threeOccurrences)).toBe(true); // 1st
      expect(isDateDue('2026-08-26', 'daily', threeOccurrences)).toBe(true); // 2nd
      expect(isDateDue('2026-08-27', 'daily', threeOccurrences)).toBe(true); // 3rd
      expect(isDateDue('2026-08-28', 'daily', threeOccurrences)).toBe(false); // 4th -> halted!
    });
  });

  describe('HCA Quick Add Presets & Care Plan Setup Tests', () => {
    it('initializes default 10 HCA care presets with correct clinical defaults', () => {
      const presets = db.getQuickAddPresets();
      expect(presets.length).toBe(10);

      // Verify AM Care
      const amPreset = presets.find(p => p.id === 'preset_am_care');
      expect(amPreset).toBeDefined();
      expect(amPreset?.defaultTime).toBe('0800');
      expect(amPreset?.includedBundledItems?.length).toBeGreaterThanOrEqual(5);

      // Verify PM Care
      const pmPreset = presets.find(p => p.id === 'preset_pm_care');
      expect(pmPreset).toBeDefined();
      expect(pmPreset?.defaultTime).toBe('2000');

      // Verify MAP Medication Assistance
      const medPreset = presets.find(p => p.id === 'preset_med_assist');
      expect(medPreset).toBeDefined();
      expect(medPreset?.options.some(o => o.label.includes('MAP1'))).toBe(true);
      expect(medPreset?.options.some(o => o.label.includes('MAP2'))).toBe(true);
      expect(medPreset?.options.some(o => o.label.includes('MAP3'))).toBe(true);

      // Verify Compression Stockings
      const stockPreset = presets.find(p => p.id === 'preset_stockings');
      expect(stockPreset).toBeDefined();
      expect(stockPreset?.options.some(o => o.label.includes('Apply') && o.defaultTime === '0800')).toBe(true);
      expect(stockPreset?.options.some(o => o.label.includes('Remove') && o.defaultTime === '2000')).toBe(true);
    });

    it('persists preset reordering and state updates in database', () => {
      const initial = db.getQuickAddPresets();
      const reversed = [...initial].reverse().map((p, i) => ({ ...p, displayOrder: i + 1 }));
      db.updateQuickAddPresets(reversed);

      const retrieved = db.getQuickAddPresets();
      expect(retrieved[0].id).toBe(initial[initial.length - 1].id);

      // Reset back
      db.resetQuickAddPresets();
      expect(db.getQuickAddPresets()[0].id).toBe('preset_am_care');
    });

    it('generates multiple scheduled tasks for multi-meal assignments and compression stocking pairs', () => {
      const today = '2026-08-25';
      const testResId = 'res-test-quickadd-001';

      // 1. Add AM Care
      db.addResidentTask({
        residentId: testResId,
        shiftId: SHIFT_HCA_DAY_ID,
        title: 'AM Care — Complete',
        category: 'AM Care',
        time: '0800',
        frequency: 'daily',
      });

      // 2. Add Breakfast (0815) & Lunch (1215)
      db.addResidentTask({
        residentId: testResId,
        shiftId: SHIFT_HCA_DAY_ID,
        title: 'Meal Assistance — Breakfast',
        category: 'Nutrition & Meals',
        time: '0815',
        frequency: 'daily',
      });
      db.addResidentTask({
        residentId: testResId,
        shiftId: SHIFT_HCA_DAY_ID,
        title: 'Meal Assistance — Lunch',
        category: 'Nutrition & Meals',
        time: '1215',
        frequency: 'daily',
      });

      // 3. Add Stockings Apply (0800)
      db.addResidentTask({
        residentId: testResId,
        shiftId: SHIFT_HCA_DAY_ID,
        title: 'Compression Stocking Assistance — Apply',
        category: 'Dressing & Mobility',
        time: '0800',
        frequency: 'daily',
      });

      // Verify tasks are present for today's HCA Day shift
      const resTasks = db.getState().residentTasks.filter(t => t.residentId === testResId);
      expect(resTasks.length).toBe(4);
      expect(resTasks.some(t => t.time === '0800' && t.title === 'AM Care — Complete')).toBe(true);
      expect(resTasks.some(t => t.time === '0815' && t.title.includes('Breakfast'))).toBe(true);
      expect(resTasks.some(t => t.time === '1215' && t.title.includes('Lunch'))).toBe(true);
      expect(resTasks.some(t => t.time === '0800' && t.title.includes('Compression Stocking'))).toBe(true);
    });
  });

  describe('Task Attention Indicator & Smart Detection Tests', () => {
    it('detects High Alert, Time-Critical, and Meal-Linked indicators for Insulin tasks', () => {
      const result = detectAttentionIndicators(
        'BG check + Insulin glargine',
        'Check fasting blood glucose and administer scheduled insulin before breakfast'
      );

      expect(result.suggestedIndicators).toContain('HIGH_ALERT');
      expect(result.suggestedIndicators).toContain('TIME_CRITICAL');
      expect(result.suggestedIndicators).toContain('MEAL_LINKED');
      expect(result.mealRelation).toBe('BEFORE_MEAL');
      expect(result.metadata.some(m => m.reason?.includes('Insulin'))).toBe(true);
    });

    it('differentiates context for Pain Assessment vs Pain Reassessment', () => {
      // Pain Assessment -> OBSERVE
      const assessResult = detectAttentionIndicators('Routine Pain Assessment', 'Evaluate resident pain level on 0-10 scale');
      expect(assessResult.suggestedIndicators).toContain('OBSERVE');
      expect(assessResult.suggestedIndicators).not.toContain('FOLLOW_UP');

      // Pain Reassessment -> FOLLOW_UP
      const reassessResult = detectAttentionIndicators('Pain Reassessment', 'Evaluate PRN analgesic effectiveness 45 minutes post dose');
      expect(reassessResult.suggestedIndicators).toContain('FOLLOW_UP');
      expect(reassessResult.docRefNote).toBeDefined();
    });

    it('detects Two-Person Assist and Equipment notes for Mechanical Lift transfers', () => {
      const liftResult = detectAttentionIndicators('Mechanical Lift Transfer to Wheelchair', 'Use hoyer lift and size M sling with 2 staff');
      expect(liftResult.suggestedIndicators).toContain('TWO_PERSON');
      expect(liftResult.suggestedIndicators).toContain('EQUIPMENT');
      expect(liftResult.equipmentNote).toContain('lift sling');
    });

    it('populates Layer 1 catalog intelligence into standard catalog templates', () => {
      const state = db.getState();
      const insulinTemplate = state.catalogTaskTemplates.find(t => t.slug.includes('insulin') || t.title.toLowerCase().includes('insulin'));
      if (insulinTemplate) {
        expect(insulinTemplate.attentionConfig).toBeDefined();
        expect(insulinTemplate.attentionConfig?.indicators).toContain('HIGH_ALERT');
      }

      const twoPersonTemplate = state.catalogTaskTemplates.find(t => t.slug.includes('two-person') || t.title.includes('Two-Person'));
      if (twoPersonTemplate) {
        expect(twoPersonTemplate.attentionConfig).toBeDefined();
        expect(twoPersonTemplate.attentionConfig?.indicators).toContain('TWO_PERSON');
      }
    });

    it('generates paper-safe print tags and a dynamic print legend for active codes only', () => {
      const task1 = {
        attentionConfig: {
          indicators: ['HIGH_ALERT' as const, 'TIME_CRITICAL' as const, 'MEAL_LINKED' as const],
          mealRelation: 'BEFORE_MEAL' as const,
        }
      };
      const task2 = {
        attentionConfig: {
          indicators: ['TWO_PERSON' as const, 'EQUIPMENT' as const],
        }
      };

      const tags1 = getPrintAttentionTags(task1.attentionConfig);
      expect(tags1).toEqual(['[HA]', '[TC]', '[BM]']);

      const tags2 = getPrintAttentionTags(task2.attentionConfig);
      expect(tags2).toEqual(['[2P]', '[EQ]']);

      // Dynamic legend
      const legend = getPrintAttentionLegend([task1, task2]);
      expect(legend.length).toBe(5);
      expect(legend.some(l => l.code === '[HA]' && l.label === 'High Alert')).toBe(true);
      expect(legend.some(l => l.code === '[TC]' && l.label === 'Time-Critical')).toBe(true);
      expect(legend.some(l => l.code === '[BM]' && l.label === 'Before Meal')).toBe(true);
      expect(legend.some(l => l.code === '[2P]' && l.label === 'Two-Person Assist')).toBe(true);
      expect(legend.some(l => l.code === '[EQ]' && l.label === 'Equipment Required')).toBe(true);
      // Ensure unused codes (e.g. [IC], [FU], [DOC]) are NOT present in legend
      expect(legend.some(l => l.code === '[IC]')).toBe(false);
      expect(legend.some(l => l.code === '[FU]')).toBe(false);
    });

    it('prevents duplication when adding quick add presets to HCA and LPN', () => {
      const state = db.getState();
      const testResId = state.residents[0]?.id || 'res-test-1';

      // 1. Initial addition of AM Care — Complete
      db.addResidentTask({
        residentId: testResId,
        shiftId: SHIFT_HCA_DAY_ID,
        title: 'AM Care — Complete',
        category: 'AM Care',
        time: '0800',
        frequency: 'daily',
        instructions: 'Initial morning care',
      });

      const countBefore = db.getState().residentTasks.filter(
        t => t.residentId === testResId && t.title === 'AM Care — Complete' && t.isActive !== false
      ).length;
      expect(countBefore).toBe(1);

      // 2. Simulate re-adding via Quick Add / preset workflow with upsert
      const existingMatch = db.getState().residentTasks.find(
        t => t.residentId === testResId && t.isActive !== false && t.title === 'AM Care — Complete' && t.time === '0800'
      );

      if (existingMatch) {
        db.updateResidentTask(existingMatch.id, {
          instructions: 'Updated instructions without duplicating task',
        });
      } else {
        db.addResidentTask({
          residentId: testResId,
          shiftId: SHIFT_HCA_DAY_ID,
          title: 'AM Care — Complete',
          category: 'AM Care',
          time: '0800',
          frequency: 'daily',
          instructions: 'Duplicate attempt',
        });
      }

      // Verify zero duplicate records were created
      const countAfter = db.getState().residentTasks.filter(
        t => t.residentId === testResId && t.title === 'AM Care — Complete' && t.isActive !== false
      ).length;
      expect(countAfter).toBe(1);

      const updatedTask = db.getState().residentTasks.find(
        t => t.residentId === testResId && t.title === 'AM Care — Complete'
      );
      expect(updatedTask?.instructions).toBe('Updated instructions without duplicating task');
    });

    it('adapts busy LPN print density and yields handoff space without violating explicit accessibility settings', () => {
      const lowVolume = calculateAdaptivePrintLayout({
        isClinical: true,
        requestedDensity: 'standard',
        largePrint: false,
        taskRowCount: 4,
        sectionCount: 2,
        alertCount: 0,
        requestedHandoffLines: 5,
      });
      expect(lowVolume).toMatchObject({ density: 'standard', handoffLines: 5, estimatedPages: 1 });

      const busyShift = calculateAdaptivePrintLayout({
        isClinical: true,
        requestedDensity: 'standard',
        largePrint: false,
        taskRowCount: 14,
        sectionCount: 2,
        alertCount: 0,
        requestedHandoffLines: 5,
      });
      expect(busyShift.density).toBe('compact');
      expect(busyShift.handoffLines).toBe(1);
      expect(busyShift.estimatedPages).toBe(1);

      const accessibleShift = calculateAdaptivePrintLayout({
        isClinical: true,
        requestedDensity: 'spacious',
        largePrint: true,
        taskRowCount: 14,
        sectionCount: 2,
        alertCount: 0,
        requestedHandoffLines: 5,
      });
      expect(accessibleShift.density).toBe('spacious');
      expect(accessibleShift.estimatedPages).toBeGreaterThan(1);
    });

    it('adapts HCA print density for assignments of fifteen or more residents and paginates without clipping', () => {
      const fifteenResidentShift = calculateAdaptivePrintLayout({
        isClinical: false,
        requestedDensity: 'standard',
        largePrint: false,
        taskRowCount: 18,
        sectionCount: 2,
        alertCount: 0,
        requestedHandoffLines: 3,
      });
      expect(fifteenResidentShift).toMatchObject({
        density: 'compact',
        handoffLines: 3,
        estimatedPages: 1,
      });

      const highVolumeShift = calculateAdaptivePrintLayout({
        isClinical: false,
        requestedDensity: 'standard',
        largePrint: false,
        taskRowCount: 30,
        sectionCount: 3,
        alertCount: 1,
        requestedHandoffLines: 3,
      });
      expect(highVolumeShift.density).toBe('compact');
      expect(highVolumeShift.handoffLines).toBe(1);
      expect(highVolumeShift.estimatedPages).toBe(2);

      const largePrintShift = calculateAdaptivePrintLayout({
        isClinical: false,
        requestedDensity: 'standard',
        largePrint: true,
        taskRowCount: 18,
        sectionCount: 2,
        alertCount: 0,
        requestedHandoffLines: 3,
      });
      expect(largePrintShift.density).toBe('standard');
      expect(largePrintShift.handoffLines).toBe(3);
      expect(largePrintShift.estimatedPages).toBeGreaterThan(1);
    });

    it('generates Universal Compact Table TaskSheet with inline structured results and minimal paper estimation', () => {
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);

      // Verify table rows exist and are populated
      expect(model.tableRows).toBeDefined();
      expect(model.tableRows.length).toBeGreaterThan(0);

      // Verify workflow sections
      expect(model.tableRows.some(r => r.workflowSection === 'start')).toBe(true);
      expect(model.tableRows.some(r => r.workflowSection === 'resident_care')).toBe(true);
      expect(model.tableRows.some(r => r.workflowSection === 'end')).toBe(true);

      // Verify task-driven structured writing fields
      const bgRow = model.tableRows.find(r => r.taskTitle.toLowerCase().includes('blood glucose') || r.taskTitle.toLowerCase().includes('insulin'));
      if (bgRow) {
        expect(bgRow.structuredResult).toBeDefined();
        expect(bgRow.structuredResult?.type).toBe('bg');
        expect(bgRow.structuredResult?.label).toContain('BG:');
      }

      const vitalsRow = model.tableRows.find(r => r.taskTitle.toLowerCase().includes('vitals'));
      if (vitalsRow) {
        expect(vitalsRow.structuredResult).toBeDefined();
        expect(vitalsRow.structuredResult?.type).toBe('vitals');
        expect(vitalsRow.structuredResult?.label).toContain('BP:');
      }

      const fridgeRow = model.tableRows.find(r => r.taskTitle.toLowerCase().includes('fridge'));
      if (fridgeRow) {
        expect(fridgeRow.structuredResult).toBeDefined();
        expect(fridgeRow.structuredResult?.type).toBe('temp');
        expect(fridgeRow.structuredResult?.label).toContain('Temp:');
      }

      // Verify paper efficiency note and page estimation
      expect(model.summary.estimatedPages).toBeLessThanOrEqual(3);
      expect(model.summary.paperEfficiencyNote).toContain('Optimized for minimal paper');

      // Verify facility header info
      expect(model.header.facility.siteName).toBe('Cedar Grove Continuing Care');
      expect(model.header.facility.street).toBeDefined();
      expect(model.header.facility.mainPhone).toBeDefined();
      expect(model.header.facility.fax).toBeDefined();
    });

    it('prevents duplicated shift codes in header when shift name contains shortCode (e.g. NLPN — NLPN — LPN Overnight)', () => {
      const today = new Date().toISOString().split('T')[0];
      const allShifts = db.getState().shifts;
      const shiftNLPN = allShifts.find(s => s.shortCode === 'NLPN') || allShifts[0];
      
      // Update shift name to simulate user having prefixed shortCode
      db.updateShift(shiftNLPN.id, {
        name: `${shiftNLPN.shortCode} — ${shiftNLPN.name}`,
      });

      const sheet = generateShiftSheet(today, shiftNLPN.id);
      const model = PrintService.generateDocumentModel(sheet);

      // Verify no duplicate code prefix in header shiftName
      expect(model.header.shiftName).not.toMatch(new RegExp(`${shiftNLPN.shortCode}\\s*—\\s*${shiftNLPN.shortCode}`));
      expect(model.header.shiftName.startsWith(`${shiftNLPN.shortCode} — `)).toBe(true);
    });

    it('compresses clinical instructions and prioritizes attention tags for print readability', () => {
      // Test instruction compression
      const rawInsulin = 'Check fasting BG before breakfast. Administer Lantus 14 Units SC per MAR.';
      expect(compressTaskInstruction(rawInsulin)).toBe('Fasting BG before breakfast · Insulin per MAR');

      const rawOxygen = 'Check O2 concentrator at 2 L/min, inspect skin behind ears.';
      expect(compressTaskInstruction(rawOxygen)).toBe('O₂ 2 L/min · Check equipment/skin');

      const rawMechLift = 'Transfer using mechanical lift with 2 staff members.';
      expect(compressTaskInstruction(rawMechLift)).toBe('Mechanical lift · 2 staff');

      // Test attention tag prioritization (max 2-3 tags, removes [DOC], prioritizes HA/TC)
      const manyTags = ['[DOC]', '[MON]', '[TC]', '[HA]', '[BM]'];
      const prioritized = filterPrioritizedAttentionTags(manyTags, 3);
      expect(prioritized).toEqual(['[HA]', '[TC]', '[BM]']);
      expect(prioritized).not.toContain('[DOC]');
      expect(prioritized.length).toBeLessThanOrEqual(3);

      // Verify rowType mapping on generated print model
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);
      
      const unitRow = model.tableRows.find(r => r.workflowSection === 'start');
      expect(unitRow?.rowType).toBe('compact');

      const residentRow = model.tableRows.find(r => r.workflowSection === 'resident_care');
      expect(['standard', 'expanded']).toContain(residentRow?.rowType);
    });

    it('generates HCA print model with concise HCA routine compression and 1-page efficiency', () => {
      // HCA phrasing compression tests
      expect(compressTaskInstruction('Assist with morning personal care, grooming, and dressing.')).toBe('Wash · Oral care · Grooming · Dressing');
      expect(compressTaskInstruction('Assist with bedtime care and comfort measures.')).toBe('Personal care · Toileting · Nightwear · Bed prep');
      expect(compressTaskInstruction('Check and change continence product; provide peri care and barrier cream.')).toBe('Brief change · Peri care · Barrier cream');
      expect(compressTaskInstruction('Escort resident to dining room and return after meal.')).toBe('Escort to/from dining room');
      expect(compressTaskInstruction('Offer fluids and hydration to resident.')).toBe('Offer fluids');
      expect(compressTaskInstruction('Apply compression stockings before resident gets out of bed.')).toBe('Apply before breakfast');

      // Generate HCA Day shift sheet
      const today = new Date().toISOString().split('T')[0];
      const hcaSheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const hcaModel = PrintService.generateDocumentModel(hcaSheet, 'simple_checklist');

      expect(hcaModel.profile).toBe('simple_checklist');
      expect(hcaModel.tableRows.length).toBeGreaterThan(0);
      expect(hcaModel.summary.estimatedPages).toBeLessThanOrEqual(2);
      expect(hcaModel.summary.paperEfficiencyNote).toContain('Optimized for minimal paper');
    });

    it('persists and propagates additional unit extensions and quick contacts to print header', () => {
      // Configure custom quick contact extensions
      db.updateFacility({
        additionalExtensions: [
          { id: 'ext_custom_pharm', label: 'Pharmacy Desk', number: 'ext 8800', enabled: true },
          { id: 'ext_custom_physio', label: 'Physiotherapist', number: 'ext 8812', enabled: true },
          { id: 'ext_custom_hidden', label: 'Off-Shift Line', number: 'ext 9999', enabled: false },
        ]
      });

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);

      expect(model.header.facility.additionalExtensions).toBeDefined();
      expect(model.header.facility.additionalExtensions?.length).toBe(3);

      const activeExts = model.header.facility.additionalExtensions?.filter(e => e.enabled !== false);
      expect(activeExts?.length).toBe(2);
      expect(activeExts?.map(e => e.label)).toContain('Pharmacy Desk');
      expect(activeExts?.map(e => e.label)).toContain('Physiotherapist');
      expect(activeExts?.map(e => e.label)).not.toContain('Off-Shift Line');
    });

    it('persists and applies Header Layout Styles (compact, centered, standard) to print header models', () => {
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);

      // 1. Test Compact header style
      db.updateFacilitySettings({
        branding: {
          headerStyle: 'compact',
          confidentialityNotice: 'TEST NOTICE',
          showConfidentialityNotice: true,
          showSupervisorSignatureBlock: true,
          watermarkStyle: 'none'
        }
      });
      const compactModel = PrintService.generateDocumentModel(sheet);
      expect(compactModel.header.headerStyle).toBe('compact');

      // 2. Test Centered header style with Logo
      db.updateFacilitySettings({
        branding: {
          headerStyle: 'centered',
          logoUrl: 'https://example.com/logo.png',
          confidentialityNotice: 'TEST NOTICE',
          showConfidentialityNotice: true,
          showSupervisorSignatureBlock: true,
          watermarkStyle: 'draft'
        }
      });
      const centeredModel = PrintService.generateDocumentModel(sheet);
      expect(centeredModel.header.headerStyle).toBe('centered');
      expect(centeredModel.header.logoUrl).toBe('https://example.com/logo.png');
      expect(centeredModel.header.watermarkStyle).toBe('draft');

      // 3. Test Standard header style
      db.updateFacilitySettings({
        branding: {
          headerStyle: 'standard',
          confidentialityNotice: 'TEST NOTICE',
          showConfidentialityNotice: true,
          showSupervisorSignatureBlock: true,
          watermarkStyle: 'none'
        }
      });
      const standardModel = PrintService.generateDocumentModel(sheet);
      expect(standardModel.header.headerStyle).toBe('standard');
    });

    it('persists and applies shiftHeaderFormat options (short_code_only, name_only, full_name_and_role)', () => {
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);

      // 1. Default / short_code_only
      db.updateFacilitySettings({
        branding: {
          headerStyle: 'standard',
          shiftHeaderFormat: 'short_code_only',
          confidentialityNotice: 'TEST',
          showConfidentialityNotice: true,
          showSupervisorSignatureBlock: true
        }
      });
      const shortCodeModel = PrintService.generateDocumentModel(sheet);
      expect(shortCodeModel.header.shiftHeaderFormat).toBe('short_code_only');
      expect(shortCodeModel.header.shiftShortCode).toBe(sheet.shift.shortCode);

      // 2. full_name_and_role
      db.updateFacilitySettings({
        branding: {
          headerStyle: 'standard',
          shiftHeaderFormat: 'full_name_and_role',
          confidentialityNotice: 'TEST',
          showConfidentialityNotice: true,
          showSupervisorSignatureBlock: true
        }
      });
      const fullModel = PrintService.generateDocumentModel(sheet);
      expect(fullModel.header.shiftHeaderFormat).toBe('full_name_and_role');
      expect(fullModel.header.roleName).toBe('Licensed Practical Nurse');

      // 3. name_only
      db.updateFacilitySettings({
        branding: {
          headerStyle: 'standard',
          shiftHeaderFormat: 'name_only',
          confidentialityNotice: 'TEST',
          showConfidentialityNotice: true,
          showSupervisorSignatureBlock: true
        }
      });
      const nameOnlyModel = PrintService.generateDocumentModel(sheet);
      expect(nameOnlyModel.header.shiftHeaderFormat).toBe('name_only');
    });
  });
});
