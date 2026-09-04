import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { followUpActions } from '../services/followUpActions';

describe('followUpActions (shared mutation wrappers — Dashboard/Huddle/Resident Profile all route through these)', () => {
  const today = '2026-09-04';
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });

  it('markDone / carryForward / needsReview / noLongerNeeded delegate to the same status transitions as calling db directly', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'One', roomNumber: '200', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    followUpActions.carryForward(task.id);
    let stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(stored.followUpStatus).toBe('carry_forward');
    expect(stored.followUpCarryForwardCount).toBe(1);
    expect(stored.followUpDueDate).toBe(today); // never touched

    followUpActions.needsReview(task.id);
    stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(stored.followUpStatus).toBe('needs_review');

    followUpActions.noLongerNeeded(task.id);
    stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(stored.followUpStatus).toBe('no_longer_needed');

    followUpActions.markDone(task.id);
    stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(stored.followUpStatus).toBe('done');
  });

  it('extendTracking preserves the original start date', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Two', roomNumber: '201', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-01', endDate: '2026-09-05' } });

    followUpActions.extendTracking(task.id, '2026-09-10');
    const stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(stored.recurrenceRule?.startDate).toBe('2026-09-01');
    expect(stored.recurrenceRule?.endDate).toBe('2026-09-10');
  });

  it('recordOccurrence increments completedOccurrences', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Three', roomNumber: '202', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Occurrence Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 3 } });

    followUpActions.recordOccurrence(task.id);
    const stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(stored.trackingConfig?.completedOccurrences).toBe(1);
  });
});
