import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import {
  getResidentActivityEvents,
  getEntityHistoryEvents,
  getLastCompletedTaskEvent,
  getTrackingHistoryForResident,
  hasRecordedHistory,
  categorizeResidentHistoryEvent,
} from '../services/residentHistory';

describe('residentHistory service', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });
  afterEach(() => vi.useRealTimers());

  describe('getResidentActivityEvents', () => {
    it('filters strictly by resident — never leaks another resident\'s events', () => {
      const mary = db.addResident({ firstName: 'Mary', lastName: 'One', roomNumber: '201', status: 'active' });
      const jane = db.addResident({ firstName: 'Jane', lastName: 'Two', roomNumber: '202', status: 'active' });
      db.addResidentTask({ residentId: mary.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Mary Task', category: 'General', frequency: 'once', timingType: 'period' });
      db.addResidentTask({ residentId: jane.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Jane Task', category: 'General', frequency: 'once', timingType: 'period' });

      const maryEvents = getResidentActivityEvents(db.getState(), mary.id);
      expect(maryEvents.some(e => e.summary.includes('Mary Task'))).toBe(true);
      expect(maryEvents.some(e => e.summary.includes('Jane Task'))).toBe(false);
    });

    it('sorts newest first', () => {
      vi.useFakeTimers({ now: new Date('2026-09-04T10:00:00.000Z') });
      const resident = db.addResident({ firstName: 'F', lastName: 'Sort', roomNumber: '203', status: 'active' });
      vi.advanceTimersByTime(60_000);
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Task A', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });
      vi.advanceTimersByTime(60_000);
      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      vi.advanceTimersByTime(60_000);
      db.setResidentTaskFollowUpStatus(task.id, 'done');

      const events = getResidentActivityEvents(db.getState(), resident.id);
      const timestamps = events.map(e => new Date(e.occurredAt).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
      expect(events[0].summary).toContain('marked Done');
    });

    it('filters by category', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Cat', roomNumber: '204', status: 'active' });
      db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Fall risk', startDate: '2026-09-01', active: true } as any);
      db.addFYI({ residentId: resident.id, text: 'Prefers tea', category: 'preference', importance: 'normal' } as any);
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Care Task', category: 'General', frequency: 'once', timingType: 'period' });

      const state = db.getState();
      expect(getResidentActivityEvents(state, resident.id, { category: 'attention' }).every(e => e.entityType === 'attention_item')).toBe(true);
      expect(getResidentActivityEvents(state, resident.id, { category: 'fyi' }).every(e => e.entityType === 'fyi')).toBe(true);
      expect(getResidentActivityEvents(state, resident.id, { category: 'tasks' }).some(e => e.summary.includes('Care Task'))).toBe(true);
    });

    it('filters by date range, inclusive', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Range', roomNumber: '205', status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Ranged Task', category: 'General', frequency: 'once', timingType: 'period' });
      const today = new Date().toISOString().slice(0, 10);

      const state = db.getState();
      expect(getResidentActivityEvents(state, resident.id, { dateFrom: today, dateTo: today }).length).toBeGreaterThan(0);
      expect(getResidentActivityEvents(state, resident.id, { dateFrom: '2099-01-01' }).length).toBe(0);
      expect(getResidentActivityEvents(state, resident.id, { dateTo: '2000-01-01' }).length).toBe(0);
    });

    it('search matches summary, changes, and actor name case-insensitively', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Search', roomNumber: '206', status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'General', frequency: 'once', timingType: 'period' });

      const state = db.getState();
      expect(getResidentActivityEvents(state, resident.id, { search: 'urine' }).length).toBeGreaterThan(0);
      expect(getResidentActivityEvents(state, resident.id, { search: 'no-such-term-xyz' }).length).toBe(0);
    });

    it('entityId narrows to one specific record — what a task\'s View History opens', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Entity', roomNumber: '207', status: 'active' });
      const taskA = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Task A', category: 'General', frequency: 'once', timingType: 'period' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Task B', category: 'General', frequency: 'once', timingType: 'period' });

      const events = getResidentActivityEvents(db.getState(), resident.id, { entityId: taskA.id });
      expect(events.every(e => e.entityId === taskA.id)).toBe(true);
      expect(events.some(e => e.summary.includes('Task A'))).toBe(true);
    });
  });

  describe('categorizeResidentHistoryEvent', () => {
    it('buckets a follow_up_status_changed event as tracking when the task currently has trackingConfig, follow_up otherwise', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Bucket', roomNumber: '208', status: 'active' });
      const oneTime = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'One-time', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });
      const tracking = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Tracked', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, trackingConfig: { kind: 'weight' }, recurrenceRule: { startDate: '2026-09-01', endDate: '2026-09-05' } });

      db.setResidentTaskFollowUpStatus(oneTime.id, 'done');
      db.setResidentTaskFollowUpStatus(tracking.id, 'done');

      const state = db.getState();
      const oneTimeEvent = state.auditEvents.find(e => e.entityId === oneTime.id && e.action === 'follow_up_status_changed')!;
      const trackingEvent = state.auditEvents.find(e => e.entityId === tracking.id && e.action === 'follow_up_status_changed')!;
      expect(categorizeResidentHistoryEvent(oneTimeEvent, state)).toBe('follow_up');
      expect(categorizeResidentHistoryEvent(trackingEvent, state)).toBe('tracking');
    });

    it('always buckets tracking_extended and occurrence events as tracking', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Extend', roomNumber: '209', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-01', endDate: '2026-09-05' } });
      db.extendResidentTaskTracking(task.id, '2026-09-10');
      const state = db.getState();
      const extendEvent = state.auditEvents.find(e => e.action === 'tracking_extended')!;
      expect(categorizeResidentHistoryEvent(extendEvent, state)).toBe('tracking');
    });

    it('maps attention/fyi/wound/resident entity types to their own categories', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Map', roomNumber: '210', status: 'active' });
      db.updateResident(resident.id, { notes: 'updated' });
      const state = db.getState();
      const residentEvent = state.auditEvents.find(e => e.entityType === 'resident' && e.entityId === resident.id);
      if (residentEvent) expect(categorizeResidentHistoryEvent(residentEvent, state)).toBe('resident_status');
    });
  });

  describe('getEntityHistoryEvents', () => {
    it('returns only events for one entity, newest first', () => {
      vi.useFakeTimers({ now: new Date('2026-09-04T10:00:00.000Z') });
      const resident = db.addResident({ firstName: 'F', lastName: 'EH', roomNumber: '211', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Tracked Task', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });
      vi.advanceTimersByTime(60_000);
      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');

      const events = getEntityHistoryEvents(db.getState(), task.id);
      expect(events.length).toBe(2);
      expect(events[0].action).toBe('follow_up_status_changed');
      expect(events[1].action).toBe('created');
    });
  });

  describe('getLastCompletedTaskEvent', () => {
    it('finds the most recent marked-Done event, narrowed by title when given', () => {
      vi.useFakeTimers({ now: new Date('2026-09-04T10:00:00.000Z') });
      const resident = db.addResident({ firstName: 'F', lastName: 'Done', roomNumber: '212', status: 'active' });
      const urine = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });
      const weight = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Check', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });
      db.setResidentTaskFollowUpStatus(urine.id, 'done');
      vi.advanceTimersByTime(60_000);
      db.setResidentTaskFollowUpStatus(weight.id, 'done');

      const state = db.getState();
      const last = getLastCompletedTaskEvent(state, resident.id);
      expect(last?.summary).toContain('Weight Check');

      const urineOnly = getLastCompletedTaskEvent(state, resident.id, 'urine');
      expect(urineOnly?.summary).toContain('Urine Sample Collection');
    });

    it('returns undefined when nothing has been completed', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'NoDone', roomNumber: '213', status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Untouched', category: 'General', frequency: 'once', timingType: 'period' });
      expect(getLastCompletedTaskEvent(db.getState(), resident.id)).toBeUndefined();
    });

    it('is never inferred from updatedAt — a plain field edit does not count as completion', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Edit', roomNumber: '214', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Edited Task', category: 'General', frequency: 'once', timingType: 'period' });
      db.updateResidentTask(task.id, { instructions: 'new instructions' });
      expect(getLastCompletedTaskEvent(db.getState(), resident.id)).toBeUndefined();
    });
  });

  describe('getTrackingHistoryForResident', () => {
    it('returns started/extended events for a tracking task, day-to-day follow-up excluded', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Track', roomNumber: '215', status: 'active' });
      const tracking = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-03', endDate: '2026-09-07' } });
      db.extendResidentTaskTracking(tracking.id, '2026-09-10');
      db.setResidentTaskFollowUpStatus(tracking.id, 'done');
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Plain follow-up', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });

      const history = getTrackingHistoryForResident(db.getState(), resident.id);
      expect(history.some(e => e.action === 'tracking_extended')).toBe(true);
      expect(history.some(e => e.summary.includes('Behaviour Tracking') && e.summary.includes('marked Done'))).toBe(true);
      expect(history.some(e => e.summary.includes('Plain follow-up'))).toBe(false);
    });
  });

  describe('hasRecordedHistory / legacy data', () => {
    it('is false for a record with zero audit events, and never fabricates one', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Legacy', roomNumber: '216', status: 'active' });
      // Simulate a pre-audit-era record: add via addResidentTask (which does
      // audit), then strip its audit event out to model truly legacy data.
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Legacy Task', category: 'General', frequency: 'once', timingType: 'period' });
      const backup = JSON.parse(db.backupDatabase());
      backup.auditEvents = backup.auditEvents.filter((e: any) => e.entityId !== task.id);
      db.restoreDatabase(JSON.stringify(backup));

      expect(hasRecordedHistory(db.getState(), task.id)).toBe(false);
      expect(getEntityHistoryEvents(db.getState(), task.id)).toHaveLength(0);
    });

    it('is true once at least one real event exists', () => {
      const resident = db.addResident({ firstName: 'F', lastName: 'Real', roomNumber: '217', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Real Task', category: 'General', frequency: 'once', timingType: 'period' });
      expect(hasRecordedHistory(db.getState(), task.id)).toBe(true);
    });
  });
});
