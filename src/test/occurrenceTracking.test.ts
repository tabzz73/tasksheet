import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { createFirstAdmin, logout, login } from '../services/auth';
import { SHIFT_HCA_DAY_ID, SHIFT_HCA_EVE_ID, SHIFT_LPN_DAY_ID } from '../data/defaultData';
import { getResidentFollowUpTasks, getMustNotMissFollowUp, formatOccurrenceProgressLabel } from '../services/dashboard';
import {
  getPeriodOccurrences,
  getEffectiveOccurrenceCount,
  isPeriodComplete,
  describeIncompletePastPeriod,
  getOccurrenceDates,
  deriveCurrentShiftId,
} from '../services/occurrenceTracking';

const today = '2026-09-04';

describe('formatOccurrenceProgressLabel', () => {
  it('reads "0/3" with nothing recorded', () => expect(formatOccurrenceProgressLabel(0, 3)).toBe('0/3'));
  it('reads "1/3 completed · 2 remaining" mid-period', () => expect(formatOccurrenceProgressLabel(1, 3)).toBe('1/3 completed · 2 remaining'));
  it('reads "2/3 completed · 1 remaining" mid-period', () => expect(formatOccurrenceProgressLabel(2, 3)).toBe('2/3 completed · 1 remaining'));
  it('reads "3/3 complete" once the target is reached', () => expect(formatOccurrenceProgressLabel(3, 3)).toBe('3/3 complete'));
  it('never exceeds the target even if given a larger count', () => expect(formatOccurrenceProgressLabel(5, 3)).toBe('3/3 complete'));
});

describe('db.recordResidentTaskOccurrence — one-time multi-collection ("once" period, the default)', () => {
  beforeEach(async () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
  });

  it('progresses 0/3 → 1/3 → 2/3 → 3/3 complete, backed by real occurrence records', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Urine', roomNumber: '118', status: 'active' });
    let task = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring',
      time: '0800', frequency: 'once', showOnDashboard: true, mustNotMiss: true,
      trackingConfig: { kind: 'fluid', requiredOccurrences: 3 },
    });
    expect(getEffectiveOccurrenceCount(task, today)).toBe(0);

    task = db.recordResidentTaskOccurrence(task.id);
    expect(task.trackingConfig?.completedOccurrences).toBe(1);
    expect(task.trackingConfig?.occurrences).toHaveLength(1);
    expect(task.trackingConfig?.occurrences?.[0].sequence).toBe(1);
    expect(task.trackingConfig?.occurrences?.[0].completedByDisplayName).toBe('Jordan Smith');
    expect(task.followUpStatus).not.toBe('done');

    task = db.recordResidentTaskOccurrence(task.id);
    expect(task.trackingConfig?.completedOccurrences).toBe(2);

    task = db.recordResidentTaskOccurrence(task.id);
    expect(task.trackingConfig?.completedOccurrences).toBe(3);
    expect(task.followUpStatus).toBe('done'); // once-mode resolves the whole follow-up on target
    expect(getResidentFollowUpTasks(db.getState(), today).map(e => e.task.id)).not.toContain(task.id);
  });

  it('never exceeds the target — a duplicate/race click past target is a safe no-op', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Race', roomNumber: '119', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Check', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 1 } });
    task = db.recordResidentTaskOccurrence(task.id);
    expect(task.trackingConfig?.completedOccurrences).toBe(1);
    // A second call (double-click, or a race) must not push past target.
    task = db.recordResidentTaskOccurrence(task.id);
    expect(task.trackingConfig?.completedOccurrences).toBe(1);
    expect(task.trackingConfig?.occurrences).toHaveLength(1);
  });

  it('each occurrence records who, when, and — when derivable — which shift', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4, 8, 0)); // 0800 local — inside HCA Day (0700-1500)
    const resident = db.addResident({ firstName: 'F', lastName: 'Shift', roomNumber: '120', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Vitals', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 3, occurrenceResetPeriod: 'daily' } });

    task = db.recordResidentTaskOccurrence(task.id);
    const record = task.trackingConfig!.occurrences![0];
    expect(record.completedByDisplayName).toBe('Jordan Smith');
    expect(record.shiftId).toBe(SHIFT_HCA_DAY_ID); // matches HCA Day's own window
    expect(record.occurrenceDate).toBe(today);
    expect(typeof record.occurredAt).toBe('string');
    vi.useRealTimers();
  });

  it('preserves original context across multiple days if the requirement remains open (no reset in "once" mode)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4, 9, 0));
    const resident = db.addResident({ firstName: 'F', lastName: 'MultiDay', roomNumber: '121', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Stool Specimen', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-03', trackingConfig: { kind: 'bowel', requiredOccurrences: 3 } });
    task = db.recordResidentTaskOccurrence(task.id); // day 1

    vi.setSystemTime(new Date(2026, 8, 5, 9, 0));
    task = db.recordResidentTaskOccurrence(task.id); // day 2 — same open requirement, no reset
    expect(task.trackingConfig?.completedOccurrences).toBe(2);
    expect(task.followUpDueDate).toBe('2026-09-03'); // original due/start context untouched
    expect(task.trackingConfig?.occurrences?.map(o => o.occurrenceDate)).toEqual(['2026-09-04', '2026-09-05']);
    vi.useRealTimers();
  });
});

describe('db.recordResidentTaskOccurrence — daily-reset period ("3x daily")', () => {
  beforeEach(async () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  function makeDailyTask(residentId: string) {
    return db.addResidentTask({
      residentId, shiftId: SHIFT_HCA_DAY_ID, title: 'Vital Signs Monitoring', category: 'Monitoring',
      time: '0800', frequency: 'daily', showOnDashboard: true, showInHuddle: true, mustNotMiss: true,
      trackingConfig: { kind: 'weight', requiredOccurrences: 3, occurrenceResetPeriod: 'daily' },
    });
  }

  it('cross-shift continuity: Day records 2/3, Evening sees 2/3 and can record the 3rd', () => {
    vi.setSystemTime(new Date(2026, 8, 4, 9, 0)); // 0900 — HCA Day
    const resident = db.addResident({ firstName: 'F', lastName: 'Vitals', roomNumber: '250', status: 'active' });
    let task = makeDailyTask(resident.id);

    task = db.recordResidentTaskOccurrence(task.id);
    expect(getEffectiveOccurrenceCount(task, today)).toBe(1);
    task = db.recordResidentTaskOccurrence(task.id);
    expect(getEffectiveOccurrenceCount(task, today)).toBe(2);
    expect(task.trackingConfig?.occurrences?.every(o => o.shiftId === SHIFT_HCA_DAY_ID)).toBe(true);

    // Evening Huddle: the incoming shift immediately sees 2/3, not a fresh 0/3.
    let [huddleEntry] = getMustNotMissFollowUp(db.getState(), today);
    expect(huddleEntry.task.id).toBe(task.id);
    expect(huddleEntry.occurrenceLabel).toBe('2/3 completed · 1 remaining');

    vi.setSystemTime(new Date(2026, 8, 4, 16, 0)); // 1600 — HCA Evening (1500-2300)
    task = db.recordResidentTaskOccurrence(task.id);
    expect(getEffectiveOccurrenceCount(task, today)).toBe(3);
    const lastRecord = task.trackingConfig!.occurrences!.find(o => o.sequence === 3)!;
    expect(lastRecord.shiftId).toBe(SHIFT_HCA_EVE_ID);

    // Once the period target is met, it drops out of active Huddle/Follow-up for today.
    expect(getMustNotMissFollowUp(db.getState(), today).map(e => e.task.id)).not.toContain(task.id);
    expect(getResidentFollowUpTasks(db.getState(), today).map(e => e.task.id)).not.toContain(task.id);
    // A recurring daily task is never permanently "done" — it just has
    // nothing left to do today.
    expect(task.followUpStatus).not.toBe('done');
  });

  it('period rollover: Sep 4 stays 3/3 complete in history; Sep 5 begins a fresh 0/3', () => {
    vi.setSystemTime(new Date(2026, 8, 4, 8, 0));
    const resident = db.addResident({ firstName: 'F', lastName: 'Rollover', roomNumber: '251', status: 'active' });
    let task = makeDailyTask(resident.id);
    task = db.recordResidentTaskOccurrence(task.id);
    task = db.recordResidentTaskOccurrence(task.id);
    task = db.recordResidentTaskOccurrence(task.id);
    expect(getEffectiveOccurrenceCount(task, '2026-09-04')).toBe(3);

    vi.setSystemTime(new Date(2026, 8, 5, 8, 0));
    // Sep 4's completed period is untouched...
    expect(getEffectiveOccurrenceCount(task, '2026-09-04')).toBe(3);
    expect(isPeriodComplete(task, '2026-09-04')).toBe(true);
    // ...and Sep 5 begins fresh, not carrying Sep 4's count forward.
    expect(getEffectiveOccurrenceCount(task, '2026-09-05')).toBe(0);

    task = db.recordResidentTaskOccurrence(task.id);
    expect(getEffectiveOccurrenceCount(task, '2026-09-05')).toBe(1);
    expect(getEffectiveOccurrenceCount(task, '2026-09-04')).toBe(3); // still untouched
  });

  it('end-of-period incomplete: yesterday stopped at 2/3 stays "2/3 completed · 1 missed" in history, and today starts fresh', () => {
    vi.setSystemTime(new Date(2026, 8, 4, 8, 0));
    const resident = db.addResident({ firstName: 'F', lastName: 'Missed', roomNumber: '252', status: 'active' });
    let task = makeDailyTask(resident.id);
    task = db.recordResidentTaskOccurrence(task.id);
    task = db.recordResidentTaskOccurrence(task.id); // only 2 of 3 recorded on Sep 4

    vi.setSystemTime(new Date(2026, 8, 5, 8, 0));
    expect(describeIncompletePastPeriod(task, '2026-09-04')).toBe('2/3 completed · 1 missed');
    // The missing 3rd occurrence from Sep 4 is never silently converted into
    // Sep 5's target — Sep 5 still needs its own fresh 3.
    expect(getEffectiveOccurrenceCount(task, '2026-09-05')).toBe(0);
    const dates = getOccurrenceDates(task.trackingConfig);
    expect(dates).toContain('2026-09-04');
    expect(getPeriodOccurrences(task, '2026-09-04')).toHaveLength(2); // history retained, not discarded
  });

  it('qualifies for Huddle attention while incomplete and Must-Not-Miss; disqualifies once complete', () => {
    vi.setSystemTime(new Date(2026, 8, 4, 8, 0));
    const resident = db.addResident({ firstName: 'F', lastName: 'Huddle', roomNumber: '253', status: 'active' });
    let task = makeDailyTask(resident.id);

    expect(getMustNotMissFollowUp(db.getState(), today).map(e => e.task.id)).toContain(task.id);
    task = db.recordResidentTaskOccurrence(task.id);
    task = db.recordResidentTaskOccurrence(task.id);
    task = db.recordResidentTaskOccurrence(task.id);
    expect(getMustNotMissFollowUp(db.getState(), today).map(e => e.task.id)).not.toContain(task.id);
  });
});

describe('db.reverseResidentTaskOccurrence', () => {
  beforeEach(async () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
  });

  it('corrects a mistaken entry without deleting it, and frees up a slot to record again', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Undo', roomNumber: '254', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Fluid Check', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'fluid', requiredOccurrences: 2 } });
    task = db.recordResidentTaskOccurrence(task.id);
    const occurrenceId = task.trackingConfig!.occurrences![0].id;

    task = db.reverseResidentTaskOccurrence(task.id, occurrenceId, 'Recorded by mistake');
    expect(getEffectiveOccurrenceCount(task, today)).toBe(0);
    // The record itself is preserved, not deleted.
    const reversed = task.trackingConfig!.occurrences!.find(o => o.id === occurrenceId)!;
    expect(reversed.reversedAt).toBeTruthy();
    expect(reversed.reversedByDisplayName).toBe('Jordan Smith');
    expect(reversed.reversalReason).toBe('Recorded by mistake');
    expect(task.trackingConfig!.occurrences).toHaveLength(1); // still there

    // Recording again works — the reversed slot doesn't block progress.
    task = db.recordResidentTaskOccurrence(task.id);
    expect(getEffectiveOccurrenceCount(task, today)).toBe(1);
    expect(task.trackingConfig!.occurrences).toHaveLength(2);
  });

  it('cannot reverse an already-reversed entry, or one that does not exist', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Undo2', roomNumber: '255', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Fluid Check', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'fluid', requiredOccurrences: 2 } });
    task = db.recordResidentTaskOccurrence(task.id);
    const occurrenceId = task.trackingConfig!.occurrences![0].id;
    db.reverseResidentTaskOccurrence(task.id, occurrenceId);
    expect(() => db.reverseResidentTaskOccurrence(task.id, occurrenceId)).toThrow(/already been reversed/i);
    expect(() => db.reverseResidentTaskOccurrence(task.id, 'nonexistent')).toThrow(/not found/i);
  });
});

describe('occurrence audit trail', () => {
  beforeEach(async () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
  });

  it('logs one audit event per occurrence with actor, target, and shift context — no clinical result values', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Audit', roomNumber: '256', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Vital Signs Monitoring', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 3, occurrenceResetPeriod: 'daily' } });
    task = db.recordResidentTaskOccurrence(task.id);
    void task;

    const events = db.getState().auditEvents.filter(e => e.action === 'occurrence_recorded');
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.userDisplayName).toBe('Jordan Smith');
    expect(event.summary).toContain('1/3');
    expect(event.summary.toLowerCase()).not.toMatch(/bp|pulse|temperature|mmhg/);
    expect(event.residentId).toBe(resident.id);
  });

  it('logs a distinct occurrence_reversed event on correction', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Audit2', roomNumber: '257', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Check', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 1 } });
    task = db.recordResidentTaskOccurrence(task.id);
    db.reverseResidentTaskOccurrence(task.id, task.trackingConfig!.occurrences![0].id, 'wrong resident');
    const reversedEvent = db.getState().auditEvents.find(e => e.action === 'occurrence_reversed');
    expect(reversedEvent).toBeTruthy();
    expect(reversedEvent!.changes).toContain('wrong resident');
  });
});

describe('cross-user occurrence attribution (display-name snapshot)', () => {
  it('each occurrence keeps the actor who actually recorded it, even after a later user makes changes', async () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const admin = await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    const resident = db.addResident({ firstName: 'F', lastName: 'Cross', roomNumber: '258', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Vital Signs Monitoring', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 2, occurrenceResetPeriod: 'daily' } });
    task = db.recordResidentTaskOccurrence(task.id); // Jordan records #1

    logout();
    const passwordHash = (await import('../services/auth/passwordHash')).hashPassword;
    const riley = db.addUser({ username: 'riley', displayName: 'Riley LPN', role: 'lpn_rn', active: true, passwordHash: await passwordHash('riley-password-1') });
    await login('riley', 'riley-password-1');
    task = db.recordResidentTaskOccurrence(task.id); // Riley records #2

    const [first, second] = task.trackingConfig!.occurrences!;
    expect(first.completedByDisplayName).toBe('Jordan Smith');
    expect(second.completedByDisplayName).toBe('Riley LPN');
    void admin;
  });
});

describe('persistence — backup/restore preserves occurrence history', () => {
  beforeEach(async () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
  });

  it('a backup/restore round-trip keeps every occurrence record intact', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Restore', roomNumber: '259', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Intake Check', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'fluid', requiredOccurrences: 4, occurrenceResetPeriod: 'daily' } });
    task = db.recordResidentTaskOccurrence(task.id);
    task = db.recordResidentTaskOccurrence(task.id);

    const backup = db.backupDatabase();
    db.restoreDatabase(backup);

    const restored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(restored.trackingConfig?.occurrences).toHaveLength(2);
    expect(restored.trackingConfig?.occurrences?.[0].completedByDisplayName).toBe('Jordan Smith');
    expect(getEffectiveOccurrenceCount(restored, today)).toBe(2);
  });
});

describe('deriveCurrentShiftId', () => {
  beforeEach(() => db.resetToDemoState());

  it('resolves to the shift whose window contains the given time', () => {
    const state = db.getState();
    const task = { shiftId: SHIFT_LPN_DAY_ID } as any;
    const morning = new Date(2026, 8, 4, 8, 0); // 0800 — HCA Day window
    expect(deriveCurrentShiftId(state, task, morning)).toBe(SHIFT_HCA_DAY_ID);
    const evening = new Date(2026, 8, 4, 17, 0); // 1700 — HCA Evening window
    expect(deriveCurrentShiftId(state, task, evening)).toBe(SHIFT_HCA_EVE_ID);
  });

  it('falls back to the task\'s own assigned shift when no active shift window matches', () => {
    const state = { ...db.getState(), shifts: [] };
    const task = { shiftId: SHIFT_HCA_DAY_ID } as any;
    expect(deriveCurrentShiftId(state, task, new Date(2026, 8, 4, 3, 0))).toBe(SHIFT_HCA_DAY_ID);
  });
});
