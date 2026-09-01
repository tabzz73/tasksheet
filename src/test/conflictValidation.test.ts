/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { ROLE_HCA_ID, ROLE_LPN_ID } from '../data/defaultData';
import { db } from '../db';
import { DomainConflictError, analyzeShiftChange, validateFixedTimeForShift, validateMilitaryTime } from '../services/validation';

const addShift = (shortCode: string, startTime: string, endTime: string, roleId = ROLE_HCA_ID) => db.addShift({
  name: shortCode, shortCode, startTime, endTime, roleId, isActive: true,
});

const addResident = (roomNumber: string, suffix = roomNumber) => db.addResident({
  firstName: 'Test', lastName: `Resident ${suffix}`, roomNumber, status: 'active', source: 'manual',
});

const addTask = (residentId: string, shiftId: string, title: string, time = '0800', extra = {}) => db.addResidentTask({
  residentId, shiftId, roleId: ROLE_HCA_ID, title, category: 'Personal Care', time,
  timingType: 'fixed', frequency: 'daily', source: 'manual', ...extra,
});

const conflictCode = (operation: () => unknown) => {
  try { operation(); }
  catch (error) { if (error instanceof DomainConflictError) return error.result.code; throw error; }
  return undefined;
};

describe('central conflict validation and atomic recovery', () => {
  beforeEach(() => { localStorage.clear(); db.resetToInitialState(); });

  it.each(['7', '7:00', '2400', '2500', '1260', 'abcd'])('rejects invalid military time %s', value => {
    expect(validateMilitaryTime(value).status).toBe('BLOCKED');
  });

  it.each(['0000', '0700', '1459', '2359'])('accepts strict four-digit military time %s', value => {
    expect(validateMilitaryTime(value).status).toBe('VALID');
  });

  it('enforces start-inclusive and end-exclusive daytime boundaries', () => {
    const shift = addShift('D1', '0700', '1500');
    expect(validateFixedTimeForShift('0700', shift).status).toBe('VALID');
    expect(validateFixedTimeForShift('1459', shift).status).toBe('VALID');
    expect(validateFixedTimeForShift('0659', shift).code).toBe('TASK_OUTSIDE_SHIFT');
    expect(validateFixedTimeForShift('1500', shift).code).toBe('TASK_OUTSIDE_SHIFT');
    expect(validateFixedTimeForShift('1715', shift).code).toBe('TASK_OUTSIDE_SHIFT');
  });

  it('enforces overnight boundaries across midnight', () => {
    const shift = addShift('N1', '2300', '0700');
    for (const time of ['2300', '0000', '0200', '0659']) expect(validateFixedTimeForShift(time, shift).status).toBe('VALID');
    expect(validateFixedTimeForShift('0700', shift).code).toBe('TASK_OUTSIDE_SHIFT');
    expect(validateFixedTimeForShift('2259', shift).code).toBe('TASK_OUTSIDE_SHIFT');
  });

  it('blocks the third bathing assignment when shift/day capacity is two', () => {
    const shift = addShift('D1', '0700', '1500');
    db.updateSettings({ bathingCapacityPerShiftLine: 2 });
    const residents = ['101', '102', '103'].map(room => addResident(room));
    addTask(residents[0].id, shift.id, 'Shower');
    addTask(residents[1].id, shift.id, 'Tub Bath');
    expect(conflictCode(() => addTask(residents[2].id, shift.id, 'Bed Bath'))).toBe('SHOWER_CAPACITY_REACHED');
    expect(db.getState().residentTasks).toHaveLength(2);
  });

  it('blocks duplicate bathing on the same shift/day and another shift/day', () => {
    const d1 = addShift('D1', '0700', '1500');
    const e1 = addShift('E1', '1500', '2300');
    const resident = addResident('104');
    addTask(resident.id, d1.id, 'Shower');
    expect(conflictCode(() => addTask(resident.id, d1.id, 'Shower', '0900'))).toBe('SHOWER_ALREADY_SCHEDULED');
    expect(conflictCode(() => addTask(resident.id, e1.id, 'Tub Bath', '1600'))).toBe('SHOWER_SAME_DAY');
  });

  it('blocks tasks assigned to an inactive shift', () => {
    const shift = addShift('D1', '0700', '1500');
    db.updateShift(shift.id, { isActive: false });
    const resident = addResident('105');
    expect(conflictCode(() => addTask(resident.id, shift.id, 'Morning Care'))).toBe('SHIFT_INACTIVE');
  });

  it('rejects out-of-shift saves and preserves prior state', () => {
    const shift = addShift('D1', '0700', '1500');
    const resident = addResident('106');
    const task = addTask(resident.id, shift.id, 'Vital Signs');
    expect(conflictCode(() => db.updateResidentTask(task.id, { time: '1715' }))).toBe('TASK_OUTSIDE_SHIFT');
    expect(db.getState().residentTasks.find(item => item.id === task.id)?.time).toBe('0800');
  });

  it('blocks shortening or moving a shift past fixed dependent work', () => {
    const shift = addShift('D1', '0700', '1500');
    const resident = addResident('107');
    addTask(resident.id, shift.id, 'Late Care', '1430');
    expect(conflictCode(() => db.updateShift(shift.id, { endTime: '1400' }))).toBe('SHIFT_TIME_CHANGE_CONFLICT');
    expect(db.getState().shifts.find(item => item.id === shift.id)?.endTime).toBe('1500');
  });

  it('updates semantic start/end tasks atomically when a compatible shift changes', () => {
    const shift = addShift('D1', '0700', '1500');
    const resident = addResident('108');
    const start = addTask(resident.id, shift.id, 'Start Care', '0700', { timingType: 'start_of_shift' });
    const end = addTask(resident.id, shift.id, 'End Care', '1500', { timingType: 'end_of_shift' });
    db.updateShift(shift.id, { startTime: '0600', endTime: '1600' });
    const tasks = db.getState().residentTasks;
    expect(tasks.find(item => item.id === start.id)?.time).toBe('0600');
    expect(tasks.find(item => item.id === end.id)?.time).toBe('1600');
  });

  it('returns an overlap warning for shift impact review', () => {
    const day = addShift('D1', '0700', '1500');
    addShift('E1', '1500', '2300');
    expect(analyzeShiftChange(db.getState(), day.id, { endTime: '1600' }).code).toBe('SHIFT_OVERLAP');
  });

  it('blocks capacity reduction below existing assignments without modifying settings', () => {
    const shift = addShift('D1', '0700', '1500');
    db.updateSettings({ bathingCapacityPerShiftLine: 3 });
    ['109', '110'].map(room => addResident(room)).forEach((resident, index) => addTask(resident.id, shift.id, index ? 'Tub Bath' : 'Shower'));
    expect(conflictCode(() => db.updateSettings({ bathingCapacityPerShiftLine: 1 }))).toBe('CAPACITY_BELOW_ASSIGNMENTS');
    expect(db.getState().settings.bathingCapacityPerShiftLine).toBe(3);
  });

  it('rolls back an entire batch when any row is invalid', () => {
    const shift = addShift('D1', '0700', '1500');
    const resident = addResident('111');
    expect(conflictCode(() => db.addMultipleResidentTasks([
      { residentId: resident.id, shiftId: shift.id, roleId: ROLE_HCA_ID, title: 'Valid', category: 'Care', time: '0800', frequency: 'daily' },
      { residentId: resident.id, shiftId: shift.id, roleId: ROLE_HCA_ID, title: 'Invalid', category: 'Care', time: '1715', frequency: 'daily' },
    ]))).toBe('TASK_OUTSIDE_SHIFT');
    expect(db.getState().residentTasks).toHaveLength(0);
  });

  it('detects stale edits and keeps the newer saved value', () => {
    const shift = addShift('D1', '0700', '1500');
    const resident = addResident('112');
    const task = addTask(resident.id, shift.id, 'Original');
    const revision = db.getRevision();
    db.updateResidentTask(task.id, { title: 'Newer value' }, { expectedRevision: revision });
    expect(conflictCode(() => db.updateResidentTask(task.id, { title: 'Stale value' }, { expectedRevision: revision }))).toBe('STALE_RECORD');
    expect(db.getState().residentTasks.find(item => item.id === task.id)?.title).toBe('Newer value');
  });

  it('validates wound shift role and time', () => {
    const shift = addShift('D1LPN', '0700', '1900', ROLE_LPN_ID);
    const resident = addResident('113');
    expect(conflictCode(() => db.addWound({ residentId: resident.id, shiftId: shift.id, time: '2000', siteLocation: 'Left heel', frequency: 'daily', status: 'active', protocol: 'Clean and dress.', firstAction: 'dressing_change', bathingRelation: 'independent' }))).toBe('TASK_OUTSIDE_SHIFT');
  });

  it('blocks duplicate FYIs and duplicate active wound locations', () => {
    const shift = addShift('D1LPN', '0700', '1900', ROLE_LPN_ID);
    const resident = addResident('114');
    db.addFYI({ residentId: resident.id, text: 'Use blue cup', category: 'general', importance: 'normal', effectiveDate: '2026-08-28' });
    expect(conflictCode(() => db.addFYI({ residentId: resident.id, text: 'Use blue cup', category: 'general', importance: 'normal', effectiveDate: '2026-08-28' }))).toBe('DUPLICATE_FYI');
    db.addWound({ residentId: resident.id, shiftId: shift.id, time: '0800', siteLocation: 'Left heel', frequency: 'daily', status: 'active', protocol: 'Clean and dress.', firstAction: 'dressing_change', bathingRelation: 'independent' });
    expect(conflictCode(() => db.addWound({ residentId: resident.id, shiftId: shift.id, time: '0900', siteLocation: 'left heel', frequency: 'daily', status: 'active', protocol: 'Clean and dress.', firstAction: 'dressing_change', bathingRelation: 'independent' }))).toBe('DUPLICATE_WOUND');
  });

  it('warns instead of silently deactivating a shift with active resident/unit tasks or wounds', () => {
    const shift = addShift('D1LPN', '0700', '1900', ROLE_LPN_ID);
    const resident = addResident('115');
    addTask(resident.id, shift.id, 'AM Care');

    const impact = db.analyzeShiftDeactivation(shift.id);
    expect(impact.status).toBe('WARNING');
    expect(impact.context?.residentTasks).toBe(1);

    // Deactivation itself is still allowed (it's reversible) — only the silent, unwarned path is the defect.
    db.deactivateShift(shift.id);
    expect(db.getState().shifts.find(s => s.id === shift.id)?.isActive).toBe(false);
  });

  it('reports no deactivation impact for a shift with no active dependents', () => {
    const shift = addShift('D2LPN', '0700', '1900', ROLE_LPN_ID);
    expect(db.analyzeShiftDeactivation(shift.id).status).toBe('VALID');
  });
});
