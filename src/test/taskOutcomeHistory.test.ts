import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { explainNeedsReview, getResidentFollowUpTasks, DEFAULT_FOLLOW_UP_ESCALATION_THRESHOLD } from '../services/dashboard';
import { getEntityHistoryEvents } from '../services/residentHistory';
import { followUpActions } from '../services/followUpActions';

const today = '2026-09-04';

describe('Task Outcome History — one-time follow-up task', () => {
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });
  afterEach(() => vi.useRealTimers());

  it('records a rich, human-readable outcome for created → carried forward → completed', () => {
    vi.useFakeTimers({ now: new Date('2026-09-04T10:00:00.000Z') });
    const resident = db.addResident({ firstName: 'F', lastName: 'Urine', roomNumber: '250', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, mustNotMiss: true, followUpDueDate: '2026-09-02' });

    vi.advanceTimersByTime(60_000);
    db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
    vi.advanceTimersByTime(60_000);
    db.setResidentTaskFollowUpStatus(task.id, 'done');

    const [doneEvent, carryEvent, createdEvent] = getEntityHistoryEvents(db.getState(), task.id);

    expect(createdEvent.summary).toBe('Resident task created: Urine Sample Collection');

    expect(carryEvent.summary).toBe('Urine Sample Collection carried forward');
    expect(carryEvent.changes).toContain('Carry-forward count: 1');
    expect(carryEvent.changes).toContain('Original due date: 2026-09-02');

    expect(doneEvent.summary).toBe('Urine Sample Collection marked Done');
    expect(doneEvent.changes).toContain('Originally due: 2026-09-02');
    expect(doneEvent.changes).toMatch(/\d+ days? overdue/);
    expect(doneEvent.changes).toContain('Carried forward 1×');
    expect(doneEvent.userDisplayName).toBeTruthy();
    // Completion timestamp comes from the append-only audit event itself,
    // never a separately-stored completedAt field, and never inferred from
    // ResidentTask.updatedAt (which changes on any edit).
    expect(doneEvent.occurredAt).toBeTruthy();
  });

  it('marking No Longer Required records an optional reason without deleting history', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'NLR', roomNumber: '251', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'One-off Task', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: today });

    followUpActions.noLongerNeeded(task.id, 'Resident declined');

    const events = getEntityHistoryEvents(db.getState(), task.id);
    const nlrEvent = events.find(e => e.summary.includes('No Longer Required'))!;
    expect(nlrEvent.changes).toContain('Reason: Resident declined');
    expect(events.length).toBe(2); // created + no-longer-required, nothing erased
  });

  it('Needs Review manually flagged vs escalated via carry-forward threshold explain differently, without a misleading duplicate event', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Escalate', roomNumber: '252', status: 'active' });
    const manualTask = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Manual Review', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: today });
    const escalatedTask = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Escalated Task', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-08-20' });

    db.setResidentTaskFollowUpStatus(manualTask.id, 'needs_review');
    for (let i = 0; i < DEFAULT_FOLLOW_UP_ESCALATION_THRESHOLD; i++) db.setResidentTaskFollowUpStatus(escalatedTask.id, 'carry_forward');

    const entries = getResidentFollowUpTasks(db.getState(), today);
    const manualEntry = entries.find(e => e.task.id === manualTask.id)!;
    const escalatedEntry = entries.find(e => e.task.id === escalatedTask.id)!;

    expect(explainNeedsReview(manualEntry, DEFAULT_FOLLOW_UP_ESCALATION_THRESHOLD)).toBe('Manually flagged for review.');
    expect(explainNeedsReview(escalatedEntry, DEFAULT_FOLLOW_UP_ESCALATION_THRESHOLD)).toMatch(/Escalated after 3 carry-forwards/);

    // No separate "escalated to needs review" event exists — the explanation
    // instead points at the carry-forward events already in the audit trail.
    const escalatedHistory = getEntityHistoryEvents(db.getState(), escalatedTask.id);
    expect(escalatedHistory.filter(e => e.action === 'follow_up_status_changed').length).toBe(DEFAULT_FOLLOW_UP_ESCALATION_THRESHOLD);
    expect(escalatedHistory.some(e => e.summary.includes('Needs Review'))).toBe(false);
  });

  it('explainNeedsReview returns empty string when the entry does not need review', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Fine', roomNumber: '253', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Due Today', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: today });
    const [entry] = getResidentFollowUpTasks(db.getState(), today);
    expect(explainNeedsReview(entry, DEFAULT_FOLLOW_UP_ESCALATION_THRESHOLD)).toBe('');
  });
});

describe('Task Outcome History — tracking task', () => {
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });
  afterEach(() => vi.useRealTimers());

  it('records started (creation), extended, and completed, each with actor and readable text', () => {
    vi.useFakeTimers({ now: new Date('2026-09-03T10:00:00.000Z') });
    const resident = db.addResident({ firstName: 'F', lastName: 'Behaviour', roomNumber: '254', status: 'active' });
    const task = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'General',
      frequency: 'daily', timingType: 'period', showOnDashboard: true, showInHuddle: true,
      trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-03', endDate: '2026-09-07' },
    });

    vi.advanceTimersByTime(24 * 60 * 60_000);
    db.extendResidentTaskTracking(task.id, '2026-09-10');
    vi.advanceTimersByTime(24 * 60 * 60_000);
    db.setResidentTaskFollowUpStatus(task.id, 'done');

    const [doneEvent, extendedEvent, startedEvent] = getEntityHistoryEvents(db.getState(), task.id);
    expect(startedEvent.action).toBe('created');
    expect(extendedEvent.action).toBe('tracking_extended');
    expect(extendedEvent.changes).toContain('End date: 2026-09-07 → 2026-09-10');
    expect(doneEvent.summary).toBe('Behaviour Tracking marked Done');
    [doneEvent, extendedEvent, startedEvent].forEach(e => expect(e.userDisplayName).toBeTruthy());
  });

  it('ended early (No Longer Required) is distinguishable from a natural completion', () => {
    vi.useFakeTimers({ now: new Date('2026-09-01T10:00:00.000Z') });
    const resident = db.addResident({ firstName: 'F', lastName: 'EndedEarly', roomNumber: '255', status: 'active' });
    const task = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Fluid Monitoring', category: 'General',
      frequency: 'daily', timingType: 'period', showOnDashboard: true,
      trackingConfig: { kind: 'fluid' }, recurrenceRule: { startDate: '2026-09-01', endDate: '2026-09-14' },
    });
    vi.advanceTimersByTime(60_000);
    followUpActions.noLongerNeeded(task.id);
    const [endedEvent] = getEntityHistoryEvents(db.getState(), task.id);
    expect(endedEvent.summary).toBe('Fluid Monitoring marked No Longer Required');
  });
});

describe('Task Outcome History — occurrence-based task', () => {
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });
  afterEach(() => vi.useRealTimers());

  it('each occurrence (1/3, 2/3, 3/3) is individually timestamped and attributed', () => {
    vi.useFakeTimers({ now: new Date('2026-09-04T08:00:00.000Z') });
    const resident = db.addResident({ firstName: 'F', lastName: 'Occ', roomNumber: '256', status: 'active' });
    let task = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'General',
      frequency: 'once', timingType: 'period', showOnDashboard: true,
      trackingConfig: { kind: 'observation', requiredOccurrences: 3 },
    });
    task = followUpActions.recordOccurrence(task.id);
    vi.advanceTimersByTime(60 * 60_000);
    task = followUpActions.recordOccurrence(task.id);
    vi.advanceTimersByTime(60 * 60_000);
    followUpActions.recordOccurrence(task.id);

    const events = getEntityHistoryEvents(db.getState(), task.id).filter(e => e.action === 'occurrence_recorded').reverse();
    expect(events).toHaveLength(3);
    expect(events[0].summary).toContain('1/3');
    expect(events[1].summary).toContain('2/3');
    expect(events[2].summary).toContain('3/3');
    events.forEach(e => { expect(e.userDisplayName).toBeTruthy(); expect(e.occurredAt).toBeTruthy(); });
  });
});

describe('Audit integrity — outcome events are append-only', () => {
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });

  it('a later title change never rewrites an older event\'s snapshot text', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Rename', roomNumber: '257', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Original Title', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: today });
    db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');

    db.updateResidentTask(task.id, { title: 'Renamed Title' });
    db.setResidentTaskFollowUpStatus(task.id, 'done');

    const events = getEntityHistoryEvents(db.getState(), task.id);
    expect(events.some(e => e.summary.includes('Original Title'))).toBe(true);
    expect(events.find(e => e.action === 'created')!.summary).toContain('Original Title');
    expect(events.find(e => e.summary.includes('carried forward'))!.summary).toContain('Original Title');
    // Only events written after the rename reflect the new title.
    expect(events.find(e => e.summary.includes('marked Done'))!.summary).toContain('Renamed Title');
    expect(db.getState().residentTasks.find(t => t.id === task.id)!.title).toBe('Renamed Title');
  });
});

describe('Synchronization — completion produces identical history regardless of entry point', () => {
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });

  it('followUpActions.markDone (the shared surface every screen calls) always writes the same audit shape', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Sync', roomNumber: '258', status: 'active' });
    const dashboardStyleTask = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Task X', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });
    const huddleStyleTask = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Task Y', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });

    // Simulates two different screens both routing through the one shared
    // mutation surface — see src/services/followUpActions.ts.
    followUpActions.markDone(dashboardStyleTask.id);
    followUpActions.markDone(huddleStyleTask.id);

    const [eventX] = getEntityHistoryEvents(db.getState(), dashboardStyleTask.id).filter(e => e.action === 'follow_up_status_changed');
    const [eventY] = getEntityHistoryEvents(db.getState(), huddleStyleTask.id).filter(e => e.action === 'follow_up_status_changed');
    expect(eventX.action).toBe(eventY.action);
    expect(eventX.entityType).toBe(eventY.entityType);
    expect(eventX.summary.endsWith('marked Done')).toBe(true);
    expect(eventY.summary.endsWith('marked Done')).toBe(true);
    expect(eventX.changes?.split('\n').length).toBe(eventY.changes?.split('\n').length);
  });
});
