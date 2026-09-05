import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { generateShiftSheet } from '../services/generator';
import { getResidentFollowUpTasks, formatScheduledOccurrenceProgressLabel } from '../services/dashboard';
import { getTodayLocalDateString } from '../services/recurrence';
import { SHIFT_HCA_DAY_ID, SHIFT_HCA_EVE_ID, SHIFT_LPN_NIGHT_ID } from '../data/defaultData';
import { DomainConflictError } from '../services/validation';

// Medication Assistance (MAP1/MAP2/MAP3) scheduled-time occurrences.
// Day: 0700-1500, Evening: 1500-2300, Night (LPN): 2300-0700 (overnight).
describe('Medication Assistance — scheduled-time occurrences', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });

  function addResident(room = '100') {
    return db.addResident({ firstName: 'Med', lastName: 'Assist', roomNumber: room, status: 'active' });
  }

  it('MAP1 once daily behaves as an ordinary single-time task (legacy path, no scheduledTimes)', () => {
    const resident = addResident();
    const task = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'MAP1 — Medication Reminder',
      category: 'Medication Assistance', time: '0800', frequency: 'daily',
    });
    expect(task.trackingConfig).toBeUndefined();
    expect(task.time).toBe('0800');
    const sheet = generateShiftSheet(getTodayLocalDateString(), SHIFT_HCA_DAY_ID);
    expect(sheet.residentAssignments.flatMap(a => a.tasks).some(t => t.id === task.id)).toBe(true);
  });

  it('MAP3 with three scheduled times routes each occurrence to whichever shift window contains it', () => {
    const resident = addResident('254');
    const task = db.addResidentTask({
      residentId: resident.id, title: 'MAP3 — Full Medication Assistance', category: 'Medication Assistance',
      frequency: 'daily', timingType: 'fixed', isNoSpecificTime: false,
      trackingConfig: { kind: 'observation', requiredOccurrences: 3, occurrenceResetPeriod: 'daily', scheduledTimes: ['0800', '1700', '2100'] },
    });

    const today = getTodayLocalDateString();
    const day = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
    const evening = generateShiftSheet(today, SHIFT_HCA_EVE_ID);
    const night = generateShiftSheet(today, SHIFT_LPN_NIGHT_ID);

    const dayRows = day.residentAssignments.flatMap(a => a.tasks).filter(t => t.id.startsWith(task.id));
    const eveningRows = evening.residentAssignments.flatMap(a => a.tasks).filter(t => t.id.startsWith(task.id));
    const nightRows = night.residentAssignments.flatMap(a => a.tasks).filter(t => t.id.startsWith(task.id));

    expect(dayRows.map(t => t.time)).toEqual(['0800']);
    expect(eveningRows.map(t => t.time).sort()).toEqual(['1700', '2100']);
    expect(nightRows).toHaveLength(0);

    // The underlying assignment is still exactly one ResidentTask record —
    // it must never fan out into separate stored assignments.
    expect(db.getState().residentTasks.filter(t => t.title === task.title)).toHaveLength(1);
  });

  it('does not print any occurrence twice across the shifts that legitimately cover it', () => {
    const resident = addResident('254');
    db.addResidentTask({
      residentId: resident.id, title: 'MAP2 — Partial Medication Assistance', category: 'Medication Assistance',
      frequency: 'daily', timingType: 'fixed',
      trackingConfig: { kind: 'observation', requiredOccurrences: 2, occurrenceResetPeriod: 'daily', scheduledTimes: ['0800', '1700'] },
    });
    const today = getTodayLocalDateString();
    const allShiftIds = [SHIFT_HCA_DAY_ID, SHIFT_HCA_EVE_ID, SHIFT_LPN_NIGHT_ID];
    const allTimes = allShiftIds.flatMap(id => generateShiftSheet(today, id).residentAssignments.flatMap(a => a.tasks).map(t => t.time));
    expect(allTimes.sort()).toEqual(['0800', '1700']);
  });

  it('rejects a scheduled time that falls within no active shift window', () => {
    // The demo shift set (Day 0700-1500, Evening 1500-2300, Night 2300-0700)
    // covers all 24 hours — deactivate Night to open a genuine gap at 0200.
    db.updateShift(SHIFT_LPN_NIGHT_ID, { isActive: false });
    const resident = addResident();
    expect(() => db.addResidentTask({
      residentId: resident.id, title: 'MAP3 — Full Medication Assistance', category: 'Medication Assistance',
      frequency: 'daily', timingType: 'fixed',
      trackingConfig: { kind: 'observation', requiredOccurrences: 1, occurrenceResetPeriod: 'daily', scheduledTimes: ['0200'] },
    })).toThrow(DomainConflictError);
  });

  it('rejects an invalid 24-hour time format', () => {
    const resident = addResident();
    expect(() => db.addResidentTask({
      residentId: resident.id, title: 'MAP3 — Full Medication Assistance', category: 'Medication Assistance',
      frequency: 'daily', timingType: 'fixed',
      trackingConfig: { kind: 'observation', requiredOccurrences: 1, occurrenceResetPeriod: 'daily', scheduledTimes: ['9999'] },
    })).toThrow(DomainConflictError);
  });

  it('overnight shift boundary: a scheduled time after midnight routes to the overnight shift that spans it', () => {
    const resident = addResident();
    const task = db.addResidentTask({
      residentId: resident.id, title: 'MAP1 — Medication Reminder', category: 'Medication Assistance',
      frequency: 'daily', timingType: 'fixed',
      trackingConfig: { kind: 'observation', requiredOccurrences: 2, occurrenceResetPeriod: 'daily', scheduledTimes: ['2330', '0200'] },
    });
    const today = getTodayLocalDateString();
    const night = generateShiftSheet(today, SHIFT_LPN_NIGHT_ID); // 2300-0700
    const day = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
    const nightTimes = night.residentAssignments.flatMap(a => a.tasks).filter(t => t.id.startsWith(task.id)).map(t => t.time).sort();
    expect(nightTimes).toEqual(['0200', '2330']);
    expect(day.residentAssignments.flatMap(a => a.tasks).some(t => t.id.startsWith(task.id))).toBe(false);
  });

  it('formats scheduled-occurrence progress with the actual remaining clock times', () => {
    expect(formatScheduledOccurrenceProgressLabel(0, ['0800', '1700', '2100'])).toBe('0/3 (0800, 1700, 2100)');
    expect(formatScheduledOccurrenceProgressLabel(1, ['0800', '1700', '2100'])).toBe('1/3 completed · 2 remaining (1700, 2100)');
    expect(formatScheduledOccurrenceProgressLabel(3, ['0800', '1700', '2100'])).toBe('3/3 complete');
  });

  it('recording an occurrence advances the Huddle/Dashboard progress label and auto-completes at target', () => {
    const resident = addResident();
    const task = db.addResidentTask({
      residentId: resident.id, title: 'MAP3 — Full Medication Assistance', category: 'Medication Assistance',
      frequency: 'daily', timingType: 'fixed', showOnDashboard: true,
      trackingConfig: { kind: 'observation', requiredOccurrences: 3, occurrenceResetPeriod: 'daily', scheduledTimes: ['0800', '1700', '2100'] },
    });
    const today = getTodayLocalDateString();
    let entries = getResidentFollowUpTasks(db.getState(), today);
    expect(entries.find(e => e.task.id === task.id)?.occurrenceLabel).toBe('0/3 (0800, 1700, 2100)');

    db.recordResidentTaskOccurrence(task.id);
    entries = getResidentFollowUpTasks(db.getState(), today);
    expect(entries.find(e => e.task.id === task.id)?.occurrenceLabel).toBe('1/3 completed · 2 remaining (1700, 2100)');

    db.recordResidentTaskOccurrence(task.id);
    db.recordResidentTaskOccurrence(task.id);
    entries = getResidentFollowUpTasks(db.getState(), today);
    // Target met for today — no longer needs follow-up attention.
    expect(entries.find(e => e.task.id === task.id)).toBeUndefined();
  });

  it('backup/restore round-trips trackingConfig.scheduledTimes', () => {
    const resident = addResident();
    const task = db.addResidentTask({
      residentId: resident.id, title: 'MAP3 — Full Medication Assistance', category: 'Medication Assistance',
      frequency: 'daily', timingType: 'fixed',
      trackingConfig: { kind: 'observation', requiredOccurrences: 3, occurrenceResetPeriod: 'daily', scheduledTimes: ['0800', '1700', '2100'] },
    });
    const backup = db.backupDatabase();
    db.clearAllOperationalData();
    expect(db.getState().residentTasks).toHaveLength(0);
    db.restoreDatabase(backup);
    const restored = db.getState().residentTasks.find(t => t.id === task.id);
    expect(restored?.trackingConfig?.scheduledTimes).toEqual(['0800', '1700', '2100']);
  });

  it('a legacy single-time Medication Assistance record (no trackingConfig) is unaffected and still prints as one item on its shift', () => {
    const resident = addResident();
    const legacyBackup = JSON.parse(db.backupDatabase());
    legacyBackup.residentTasks.push({
      id: 'legacy-map-task', residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'MAP2 — Partial Medication Assistance',
      category: 'Medication Assistance', time: '0800', timingType: 'fixed', frequency: 'daily', isActive: true,
      createdAt: '2026-01-01T00:00:00.000Z', source: 'imported',
    });
    db.restoreDatabase(JSON.stringify(legacyBackup));
    const today = getTodayLocalDateString();
    const day = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
    const rows = day.residentAssignments.flatMap(a => a.tasks).filter(t => t.id === 'legacy-map-task');
    expect(rows).toHaveLength(1);
    expect(rows[0].time).toBe('0800');
  });
});
