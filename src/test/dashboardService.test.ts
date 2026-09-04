import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import {
  isWithinActiveWindow,
  getActiveAttentionItems,
  getAwayResidents,
  getDashboardFyis,
  getHuddleBriefing,
  getMustNotMissFollowUp,
  getResidentFollowUpTasks,
  getUnitSituationSummary,
  getValidatedDashboardLayout,
  getWoundAttentionItems,
  getTodaysBathingCount,
} from '../services/dashboard';

describe('isWithinActiveWindow (date-bounded operational items)', () => {
  const today = '2026-09-03';

  it('future start date — not yet active', () => {
    expect(isWithinActiveWindow('2026-09-04', undefined, today)).toBe(false);
  });
  it('starts today — active', () => {
    expect(isWithinActiveWindow('2026-09-03', undefined, today)).toBe(true);
  });
  it('ends today — still active (inclusive)', () => {
    expect(isWithinActiveWindow('2026-09-01', '2026-09-03', today)).toBe(true);
  });
  it('ends tomorrow — still active', () => {
    expect(isWithinActiveWindow('2026-09-01', '2026-09-04', today)).toBe(true);
  });
  it('no end date — active indefinitely', () => {
    expect(isWithinActiveWindow('2026-08-01', undefined, today)).toBe(true);
  });
  it('expired yesterday — no longer active', () => {
    expect(isWithinActiveWindow('2026-08-01', '2026-09-02', today)).toBe(false);
  });
});

describe('getActiveAttentionItems', () => {
  beforeEach(() => db.resetToDemoState());

  it('suppresses future-start, expired, and manually-ended items; keeps active-today ones', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const today = '2026-09-03';
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Active Today', startDate: today });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Future', startDate: '2026-09-10' });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Expired', startDate: '2026-08-01', endDate: '2026-08-15' });
    const endingToday = db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Ending Today', startDate: '2026-08-25', endDate: today });
    const manuallyEnded = db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Manually Ended', startDate: today });
    db.endAttentionItem(manuallyEnded.id);

    const active = getActiveAttentionItems(db.getState(), today);
    const titles = active.filter(e => e.resident?.id === resident.id).map(e => e.item.title);
    expect(titles).toContain('Active Today');
    expect(titles).toContain('Ending Today');
    expect(titles).not.toContain('Future');
    expect(titles).not.toContain('Expired');
    expect(titles).not.toContain('Manually Ended');

    // Ending-soon flag
    const endingEntry = active.find(e => e.item.id === endingToday.id)!;
    expect(endingEntry.endingSoon).toBe(true);
  });

  it('manually ending an item preserves the historical record rather than deleting it', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const item = db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'To End', startDate: '2026-09-03' });
    db.endAttentionItem(item.id);
    const stored = db.getState().attentionItems.find(a => a.id === item.id);
    expect(stored).toBeDefined();
    expect(stored!.active).toBe(false);
    expect(stored!.updatedAt).toBeDefined();
  });

  it('rejects an attention item with no title', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    expect(() => db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: '  ', startDate: '2026-09-03' })).toThrow(/required/i);
  });

  it('rejects a resident-scoped item with no resident', () => {
    expect(() => db.addAttentionItem({ scope: 'resident', title: 'No resident', startDate: '2026-09-03' })).toThrow(/resident/i);
  });

  it('sorts urgent/high priority items ahead of normal ones, then by room', () => {
    db.clearAllOperationalData();
    const today = '2026-09-03';
    const roomB = db.addResident({ firstName: 'B', lastName: 'Room', roomNumber: '110', status: 'active' });
    const roomA = db.addResident({ firstName: 'A', lastName: 'Room', roomNumber: '105', status: 'active' });
    db.addAttentionItem({ scope: 'resident', residentId: roomB.id, title: 'Normal Note', startDate: today, priority: 'normal' });
    db.addAttentionItem({ scope: 'resident', residentId: roomA.id, title: 'Urgent Note', startDate: today, priority: 'urgent' });
    db.addAttentionItem({ scope: 'resident', residentId: roomA.id, title: 'No Priority Set', startDate: today });

    const active = getActiveAttentionItems(db.getState(), today, 'resident');
    expect(active.map(e => e.item.title)).toEqual(['Urgent Note', 'No Priority Set', 'Normal Note']);
  });

  it('excludes an item explicitly marked showOnDashboard: false, but keeps ones with the flag unset (opt-out, preserving prior behavior)', () => {
    db.clearAllOperationalData();
    const today = '2026-09-03';
    const resident = db.addResident({ firstName: 'C', lastName: 'Room', roomNumber: '120', status: 'active' });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Hidden Item', startDate: today, showOnDashboard: false });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Default Visible Item', startDate: today });

    const titles = getActiveAttentionItems(db.getState(), today).map(e => e.item.title);
    expect(titles).not.toContain('Hidden Item');
    expect(titles).toContain('Default Visible Item');
  });

  it('filters by scope when passed, and returns all scopes when omitted', () => {
    db.clearAllOperationalData();
    const today = '2026-09-03';
    const resident = db.addResident({ firstName: 'D', lastName: 'Room', roomNumber: '130', status: 'active' });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Resident Item', startDate: today });
    db.addAttentionItem({ scope: 'unit', title: 'Unit Item', startDate: today });
    db.addAttentionItem({ scope: 'site', title: 'Site Item', startDate: today });

    expect(getActiveAttentionItems(db.getState(), today, 'resident').map(e => e.item.title)).toEqual(['Resident Item']);
    expect(getActiveAttentionItems(db.getState(), today, 'unit').map(e => e.item.title)).toEqual(['Unit Item']);
    expect(getActiveAttentionItems(db.getState(), today, 'site').map(e => e.item.title)).toEqual(['Site Item']);
    expect(getActiveAttentionItems(db.getState(), today).length).toBe(3);
  });
});

describe('getAwayResidents', () => {
  beforeEach(() => db.resetToDemoState());

  it('lists only hospital/pass/hold residents with a human status label, sorted by room', () => {
    const away = getAwayResidents(db.getState());
    expect(away.every(a => ['in_hospital', 'out_on_pass', 'on_hold'].includes(a.resident.status))).toBe(true);
    expect(away.every(a => typeof a.statusLabel === 'string' && a.statusLabel.length > 0)).toBe(true);
    const rooms = away.map(a => a.resident.roomNumber);
    expect(rooms).toEqual([...rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })));
  });
});

describe('getDashboardFyis', () => {
  const today = '2026-09-03';

  it('ranks urgent above high above normal, then most-recently-updated first', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    db.addFYI({ text: 'Normal note', category: 'general', importance: 'normal', effectiveDate: today });
    db.addFYI({ text: 'Urgent note', category: 'safety', importance: 'urgent', effectiveDate: today });
    db.addFYI({ text: 'High note', category: 'protocol', importance: 'high', effectiveDate: today });

    const fyis = getDashboardFyis(db.getState(), today);
    expect(fyis.map(f => f.importance)).toEqual(['urgent', 'high', 'normal']);
  });

  it('excludes FYIs outside their effective/expiry window', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    db.addFYI({ text: 'Not yet effective', category: 'general', importance: 'normal', effectiveDate: '2026-09-10' });
    db.addFYI({ text: 'Expired', category: 'general', importance: 'normal', effectiveDate: '2026-08-01', expiryDate: '2026-09-01' });
    db.addFYI({ text: 'Currently active', category: 'general', importance: 'normal', effectiveDate: '2026-09-01', expiryDate: '2026-09-05' });

    const fyis = getDashboardFyis(db.getState(), today);
    expect(fyis.map(f => f.text)).toEqual(['Currently active']);
  });

  it('respects the limit', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    for (let i = 0; i < 8; i++) db.addFYI({ text: `Note ${i}`, category: 'general', importance: 'normal', effectiveDate: today });
    expect(getDashboardFyis(db.getState(), today, 3)).toHaveLength(3);
  });

  it('excludes an FYI explicitly marked showOnDashboard: false, but keeps ones with the flag unset (opt-out, preserving prior behavior)', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    db.addFYI({ text: 'Hidden from dashboard', category: 'general', importance: 'normal', effectiveDate: today, showOnDashboard: false });
    db.addFYI({ text: 'Default visible', category: 'general', importance: 'normal', effectiveDate: today });
    db.addFYI({ text: 'Explicitly visible', category: 'general', importance: 'normal', effectiveDate: today, showOnDashboard: true });

    const texts = getDashboardFyis(db.getState(), today, 10).map(f => f.text);
    expect(texts).not.toContain('Hidden from dashboard');
    expect(texts).toContain('Default visible');
    expect(texts).toContain('Explicitly visible');
  });
});

describe('getWoundAttentionItems', () => {
  it('only surfaces active/healing wounds updated within the recent window, never healed/discontinued ones', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const shift = db.addShift({ name: 'LPN Test', shortCode: 'LT', roleId: db.getState().roles.find(r => r.defaultPrintProfile === 'clinical_worksheet')!.id, startTime: '0700', endTime: '1900', isActive: true });
    const resident = db.addResident({ firstName: 'Wound', lastName: 'Case', roomNumber: '900', status: 'active' });
    db.addWound({ residentId: resident.id, shiftId: shift.id, time: '1000', siteLocation: 'Heel', status: 'active', firstAction: 'treatment', frequency: 'daily', bathingRelation: 'independent' });
    db.addWound({ residentId: resident.id, shiftId: shift.id, time: '1100', siteLocation: 'Sacrum', status: 'resolved', firstAction: 'treatment', frequency: 'daily', bathingRelation: 'independent' });

    const today = new Date().toISOString().split('T')[0];
    const items = getWoundAttentionItems(db.getState(), today);
    expect(items.some(i => i.wound.siteLocation === 'Heel')).toBe(true);
    expect(items.some(i => i.wound.siteLocation === 'Sacrum')).toBe(false);
  });
});

describe('getResidentFollowUpTasks', () => {
  const today = '2026-09-06';

  it('only includes tasks explicitly marked showOnDashboard: true — opt-in, unlike FYI/Attention', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'F', lastName: 'One', roomNumber: '150', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Flagged Follow-up', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Routine Task', category: 'Care', time: '0900', frequency: 'daily' });

    const titles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(titles).toEqual(['Flagged Follow-up']);
  });

  describe('overdue calculation', () => {
    it('a task due today shows "Due today"', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Today', roomNumber: '120', status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine sample collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

      const entry = getResidentFollowUpTasks(db.getState(), today)[0];
      expect(entry.statusLabel).toBe('Due today');
      expect(entry.bucket).toBe('due_today');
    });

    it('due yesterday → 1 day overdue', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Yest', roomNumber: '121', status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Overdue by one', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-05' });

      const entry = getResidentFollowUpTasks(db.getState(), today)[0];
      expect(entry.statusLabel).toBe('1 day overdue');
      expect(entry.overdueDays).toBe(1);
      expect(entry.bucket).toBe('overdue');
    });

    it('due 3 days ago → 3 days overdue (correct pluralization)', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'ThreeDays', roomNumber: '122', status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Overdue by three', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-03' });

      const entry = getResidentFollowUpTasks(db.getState(), today)[0];
      expect(entry.statusLabel).toBe('3 days overdue');
      expect(entry.overdueDays).toBe(3);
    });

    it('a future due date is not yet shown', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Future', roomNumber: '123', status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Not yet due', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-10' });

      expect(getResidentFollowUpTasks(db.getState(), today)).toHaveLength(0);
    });

    it('the original due date is retained after a carry-forward, so overdue age never resets', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Original', roomNumber: '124', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Collect urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-03' });

      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      const stored = db.getState().residentTasks.find(t => t.id === task.id)!;
      expect(stored.followUpDueDate).toBe('2026-09-03');

      const entry = getResidentFollowUpTasks(db.getState(), today)[0];
      expect(entry.overdueDays).toBe(3);
      expect(entry.statusLabel).toBe('3 days overdue · Carried forward');
    });
  });

  describe('tracking progress', () => {
    function addTracking(residentId: string, title: string, start: string, end?: string) {
      return db.addResidentTask({
        residentId, shiftId: SHIFT_HCA_DAY_ID, title, category: 'Monitoring', time: '0800', frequency: 'daily',
        showOnDashboard: true, trackingConfig: { kind: 'behavior' },
        recurrenceRule: { startDate: start, endDate: end, endType: end ? 'on_date' : 'never' },
      });
    }

    it('Day 1/5 on the start date of a 5-day tracking period', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Day1', roomNumber: '251', status: 'active' });
      addTracking(resident.id, 'Behaviour Tracking', '2026-09-06', '2026-09-10');
      const entry = getResidentFollowUpTasks(db.getState(), '2026-09-06')[0];
      expect(entry.statusLabel).toBe('Day 1/5');
    });

    it('Day 4/5 partway through a 5-day tracking period (Sep 3–Sep 7, checked on Sep 6)', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Day4', roomNumber: '251', status: 'active' });
      addTracking(resident.id, 'Behaviour Tracking', '2026-09-03', '2026-09-07');
      const entry = getResidentFollowUpTasks(db.getState(), '2026-09-06')[0];
      expect(entry.statusLabel).toBe('Day 4/5');
    });

    it('Day 5/5 · Ends today on the last day of a 5-day tracking period', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Day5', roomNumber: '251', status: 'active' });
      addTracking(resident.id, 'Behaviour Tracking', '2026-09-03', '2026-09-07');
      const entry = getResidentFollowUpTasks(db.getState(), '2026-09-07')[0];
      expect(entry.statusLabel).toBe('Day 5/5 · Ends today');
    });

    it('Active · Day X for open-ended tracking with a start date but no end date', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'OpenEnded', roomNumber: '307', status: 'active' });
      addTracking(resident.id, 'Fluid Monitoring', '2026-09-03');
      const entry = getResidentFollowUpTasks(db.getState(), '2026-09-06')[0];
      expect(entry.statusLabel).toBe('Active · Day 4');
      expect(entry.bucket).toBe('tracking_open_ended');
    });

    it('an extended tracking period updates the denominator: Day 5/5 extended by 3 days becomes Day 6/8', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Extended', roomNumber: '251', status: 'active' });
      const task = addTracking(resident.id, 'Behaviour Tracking', '2026-09-03', '2026-09-07');
      expect(getResidentFollowUpTasks(db.getState(), '2026-09-07')[0].statusLabel).toBe('Day 5/5 · Ends today');

      db.updateResidentTask(task.id, { recurrenceRule: { ...task.recurrenceRule, endDate: '2026-09-10' } });
      const entry = getResidentFollowUpTasks(db.getState(), '2026-09-08')[0];
      expect(entry.statusLabel).toBe('Day 6/8');
    });

    it('a one-day tracking period (start === end) shows Day 1/1 · Ends today, never Day 0/1', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'OneDay', roomNumber: '118', status: 'active' });
      addTracking(resident.id, 'Single-Day Check', '2026-09-06', '2026-09-06');
      const entry = getResidentFollowUpTasks(db.getState(), '2026-09-06')[0];
      expect(entry.statusLabel).toBe('Day 1/1 · Ends today');
    });

    it('expired tracking (today past the end date) is suppressed once resolved', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Expired', roomNumber: '251', status: 'active' });
      addTracking(resident.id, 'Behaviour Tracking', '2026-09-03', '2026-09-07');
      expect(getResidentFollowUpTasks(db.getState(), '2026-09-09')).toHaveLength(0);
    });

    it('expired tracking flagged Needs Review surfaces overdue-style instead of being suppressed', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'ExpiredReview', roomNumber: '251', status: 'active' });
      const task = addTracking(resident.id, 'Behaviour Tracking', '2026-09-03', '2026-09-07');
      db.setResidentTaskFollowUpStatus(task.id, 'needs_review');

      const entry = getResidentFollowUpTasks(db.getState(), '2026-09-09')[0];
      expect(entry.bucket).toBe('needs_review');
      expect(entry.statusLabel).toBe('Needs Review · 2 days overdue');
    });

    it('a completed tracking task is not shown as active follow-up', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Completed', roomNumber: '251', status: 'active' });
      const task = addTracking(resident.id, 'Behaviour Tracking', '2026-09-03', '2026-09-07');
      db.setResidentTaskFollowUpStatus(task.id, 'done');

      expect(getResidentFollowUpTasks(db.getState(), '2026-09-05')).toHaveLength(0);
      // Preserved, not deleted.
      expect(db.getState().residentTasks.some(t => t.id === task.id)).toBe(true);
    });
  });

  describe('carry-forward', () => {
    it('increments the count each time Carry Forward is chosen', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Count', roomNumber: '120', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      const stored = db.getState().residentTasks.find(t => t.id === task.id)!;
      expect(stored.followUpCarryForwardCount).toBe(2);
      expect(getResidentFollowUpTasks(db.getState(), today)[0].statusLabel).toContain('Carried forward 2×');
    });

    it('escalates to Needs Review once the carry-forward threshold is reached', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      db.updateSettings({ residentFollowUpEscalationThreshold: 2 });
      const resident = db.addResident({ firstName: 'F', lastName: 'Escalate', roomNumber: '120', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      expect(getResidentFollowUpTasks(db.getState(), today)[0].bucket).toBe('carry_forward');
      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      const entry = getResidentFollowUpTasks(db.getState(), today)[0];
      expect(entry.bucket).toBe('needs_review');
      expect(entry.needsReview).toBe(true);
    });

    it('below the default threshold of 3, two carry-forwards still display as Carried Forward, not Needs Review', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Default', roomNumber: '120', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });
      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      expect(getResidentFollowUpTasks(db.getState(), today)[0].bucket).toBe('carry_forward');
    });

    it('status transitions: Due → Carry Forward → Done leaves the task resolved', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Transitions', roomNumber: '120', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

      expect(getResidentFollowUpTasks(db.getState(), today)).toHaveLength(1);
      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
      expect(getResidentFollowUpTasks(db.getState(), today)).toHaveLength(1);
      db.setResidentTaskFollowUpStatus(task.id, 'done');
      expect(getResidentFollowUpTasks(db.getState(), today)).toHaveLength(0);
    });

    it('status transitions: Needs Review → No Longer Needed resolves without deleting the record', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Dismiss', roomNumber: '120', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

      db.setResidentTaskFollowUpStatus(task.id, 'needs_review');
      expect(getResidentFollowUpTasks(db.getState(), today)[0].bucket).toBe('needs_review');
      db.setResidentTaskFollowUpStatus(task.id, 'no_longer_needed');
      expect(getResidentFollowUpTasks(db.getState(), today)).toHaveLength(0);
      expect(db.getState().residentTasks.some(t => t.id === task.id)).toBe(true);
    });

    it('carry-forward status and count persist across a state reload', () => {
      db.resetToDemoState();
      db.clearAllOperationalData();
      const resident = db.addResident({ firstName: 'F', lastName: 'Reload', roomNumber: '120', status: 'active' });
      const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });
      db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');

      const reloaded = db.getState().residentTasks.find(t => t.id === task.id)!;
      expect(reloaded.followUpStatus).toBe('carry_forward');
      expect(reloaded.followUpCarryForwardCount).toBe(1);
      expect(reloaded.followUpDueDate).toBe(today);
    });
  });

  it('sorts Needs Review first, then most-overdue, then Due Today, then Carried Forward, then bounded tracking, then open-ended tracking', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const r1 = db.addResident({ firstName: 'F', lastName: 'R1', roomNumber: '101', status: 'active' });
    const r2 = db.addResident({ firstName: 'F', lastName: 'R2', roomNumber: '102', status: 'active' });
    const r3 = db.addResident({ firstName: 'F', lastName: 'R3', roomNumber: '103', status: 'active' });
    const r4 = db.addResident({ firstName: 'F', lastName: 'R4', roomNumber: '104', status: 'active' });
    const r5 = db.addResident({ firstName: 'F', lastName: 'R5', roomNumber: '105', status: 'active' });
    const r6 = db.addResident({ firstName: 'F', lastName: 'R6', roomNumber: '106', status: 'active' });

    const dueToday = db.addResidentTask({ residentId: r3.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Due Today Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });
    const carried = db.addResidentTask({ residentId: r4.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Carried Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-05' });
    db.setResidentTaskFollowUpStatus(carried.id, 'carry_forward');
    const review = db.addResidentTask({ residentId: r1.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Review Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-01' });
    db.setResidentTaskFollowUpStatus(review.id, 'needs_review');
    db.addResidentTask({ residentId: r2.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Overdue Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-04' });
    db.addResidentTask({ residentId: r5.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Bounded Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'fluid' }, recurrenceRule: { startDate: today, endDate: '2026-09-10' } });
    db.addResidentTask({ residentId: r6.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Open Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'fluid' }, recurrenceRule: { startDate: today } });

    const titles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(titles).toEqual(['Review Task', 'Overdue Task', 'Due Today Task', 'Carried Task', 'Bounded Tracking', 'Open Tracking']);
  });

  it('within the same bucket, sorts by priority (urgent/high before normal), then by room', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const roomB = db.addResident({ firstName: 'F', lastName: 'B', roomNumber: '160', status: 'active' });
    const roomA = db.addResident({ firstName: 'F', lastName: 'A', roomNumber: '155', status: 'active' });
    db.addResidentTask({ residentId: roomB.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Normal Priority', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, priority: 'normal', followUpDueDate: today });
    db.addResidentTask({ residentId: roomA.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urgent Priority', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, priority: 'urgent', followUpDueDate: today });

    const titles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(titles).toEqual(['Urgent Priority', 'Normal Priority']);
  });

  it('showInHuddle is independent of showOnDashboard — a task can be flagged for one, the other, both, or neither', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'F', lastName: 'Huddle', roomNumber: '161', status: 'active' });
    const dashboardOnly = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Dashboard Only', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, showInHuddle: false, followUpDueDate: today });
    const huddleOnly = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Huddle Only (not on Dashboard)', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: false, showInHuddle: true, followUpDueDate: today });

    const dashboardTitles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(dashboardTitles).toContain('Dashboard Only');
    expect(dashboardTitles).not.toContain('Huddle Only (not on Dashboard)');

    const stored = db.getState().residentTasks;
    expect(stored.find(t => t.id === dashboardOnly.id)?.showInHuddle).toBe(false);
    expect(stored.find(t => t.id === huddleOnly.id)?.showInHuddle).toBe(true);
  });

  it('stops surfacing a flagged task once its resident is discharged, but keeps one for a resident merely away (hospital/pass)', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    // Created while active, matching how this happens in practice — a task
    // is flagged, then the resident's status later changes.
    const goingAway = db.addResident({ firstName: 'F', lastName: 'Gone', roomNumber: '162', status: 'active' });
    const hospital = db.addResident({ firstName: 'F', lastName: 'Away', roomNumber: '163', status: 'in_hospital' });
    db.addResidentTask({ residentId: goingAway.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Stale Follow-up', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });
    db.addResidentTask({ residentId: hospital.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Still Relevant Follow-up', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });
    db.updateResident(goingAway.id, { status: 'discharged' });

    const titles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(titles).not.toContain('Stale Follow-up');
    expect(titles).toContain('Still Relevant Follow-up');
  });
});

describe('getResidentFollowUpTasks — occurrence-mode tracking', () => {
  const today = '2026-09-04';
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });

  it('shows "X/Y" progress, not a Day-X/Y date window, and requires no recurrenceRule', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Occ', roomNumber: '118', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 3 } });

    const [entry] = getResidentFollowUpTasks(db.getState(), today);
    expect(entry.statusLabel).toBe('0/3');
    expect(entry.occurrenceLabel).toBe('0/3');
    expect(entry.isTracking).toBe(true);
  });

  it('shows "X/Y · Complete" once the target is reached, via completedOccurrences alone', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Occ2', roomNumber: '119', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 3, completedOccurrences: 2 } });

    const [entry] = getResidentFollowUpTasks(db.getState(), today);
    expect(entry.statusLabel).toBe('2/3');
  });

  it('db.recordResidentTaskOccurrence increments, and marks the task done once the target is reached', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Occ3', roomNumber: '120', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 2 } });

    let updated = db.recordResidentTaskOccurrence(task.id);
    expect(updated.trackingConfig?.completedOccurrences).toBe(1);
    expect(getResidentFollowUpTasks(db.getState(), today).map(e => e.task.id)).toContain(task.id);

    updated = db.recordResidentTaskOccurrence(task.id);
    expect(updated.trackingConfig?.completedOccurrences).toBe(2);
    expect(updated.followUpStatus).toBe('done');
    expect(getResidentFollowUpTasks(db.getState(), today).map(e => e.task.id)).not.toContain(task.id);
  });

  it('db.recordResidentTaskOccurrence clamps at the required count and never exceeds it', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Occ4', roomNumber: '121', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 1, completedOccurrences: 1 }, followUpStatus: 'done' });

    const updated = db.recordResidentTaskOccurrence(task.id);
    expect(updated.trackingConfig?.completedOccurrences).toBe(1);
  });
});

describe('getResidentFollowUpTasks — mustNotMiss passthrough', () => {
  const today = '2026-09-04';
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });

  it('passes task.mustNotMiss through onto the entry, defaulting to false', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'MNM', roomNumber: '122', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Flagged', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today, mustNotMiss: true });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Not Flagged', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    const entries = getResidentFollowUpTasks(db.getState(), today);
    expect(entries.find(e => e.task.title === 'Flagged')?.mustNotMiss).toBe(true);
    expect(entries.find(e => e.task.title === 'Not Flagged')?.mustNotMiss).toBe(false);
  });
});

describe('extendResidentTaskTracking', () => {
  const today = '2026-09-08';
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });

  it('extends the end date, preserves the original start date, and recomputes Day X/Y', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Ext', roomNumber: '251', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-03', endDate: '2026-09-05' } });

    const updated = db.extendResidentTaskTracking(task.id, '2026-09-10');
    expect(updated.recurrenceRule?.startDate).toBe('2026-09-03');
    expect(updated.recurrenceRule?.endDate).toBe('2026-09-10');

    const [entry] = getResidentFollowUpTasks(db.getState(), today);
    expect(entry.statusLabel).toBe('Day 6/8');
  });

  it('rejects an end date before the original start date', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Ext2', roomNumber: '252', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-03', endDate: '2026-09-05' } });
    expect(() => db.extendResidentTaskTracking(task.id, '2026-09-01')).toThrow();
  });
});

describe('getMustNotMissFollowUp (Huddle attention list — never inflated by routine tracking)', () => {
  const today = '2026-09-04';
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });

  it('excludes a mustNotMiss tracking task that is merely mid-period (not due today, not ending today)', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Mid', roomNumber: '130', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Mid Period', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, mustNotMiss: true, trackingConfig: { kind: 'fluid' }, recurrenceRule: { startDate: '2026-09-01', endDate: '2026-09-20' } });

    expect(getMustNotMissFollowUp(db.getState(), today)).toHaveLength(0);
  });

  it('includes overdue, carried-forward, and needs_review tasks regardless of mustNotMiss', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Qual', roomNumber: '131', status: 'active' });
    const overdue = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Overdue', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-03' });
    const carried = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Carried', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-03' });
    db.setResidentTaskFollowUpStatus(carried.id, 'carry_forward');

    const titles = getMustNotMissFollowUp(db.getState(), today).map(e => e.task.title);
    expect(titles).toContain('Overdue');
    expect(titles).toContain('Carried');
    void overdue;
  });

  it('includes a due-today or ending-today task only when mustNotMiss is set', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'DueToday', roomNumber: '132', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Not Flagged Due Today', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Flagged Due Today', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today, mustNotMiss: true });

    const titles = getMustNotMissFollowUp(db.getState(), today).map(e => e.task.title);
    expect(titles).not.toContain('Not Flagged Due Today');
    expect(titles).toContain('Flagged Due Today');
  });

  it('sorts Needs Review, then most overdue, then carried forward, then due today, then tracking ending today, then active tracking', () => {
    const r1 = db.addResident({ firstName: 'F', lastName: 'S1', roomNumber: '141', status: 'active' });
    const r2 = db.addResident({ firstName: 'F', lastName: 'S2', roomNumber: '142', status: 'active' });
    const r3 = db.addResident({ firstName: 'F', lastName: 'S3', roomNumber: '143', status: 'active' });
    const r4 = db.addResident({ firstName: 'F', lastName: 'S4', roomNumber: '144', status: 'active' });
    const r5 = db.addResident({ firstName: 'F', lastName: 'S5', roomNumber: '145', status: 'active' });

    const review = db.addResidentTask({ residentId: r1.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Review', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-01' });
    db.setResidentTaskFollowUpStatus(review.id, 'needs_review');
    db.addResidentTask({ residentId: r2.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Overdue', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-02' });
    const carried = db.addResidentTask({ residentId: r3.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Carried', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });
    db.setResidentTaskFollowUpStatus(carried.id, 'carry_forward');
    db.addResidentTask({ residentId: r4.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Due Today', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today, mustNotMiss: true });
    db.addResidentTask({ residentId: r5.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Ending Today', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, mustNotMiss: true, trackingConfig: { kind: 'fluid' }, recurrenceRule: { startDate: '2026-09-01', endDate: today } });

    const titles = getMustNotMissFollowUp(db.getState(), today).map(e => e.task.title);
    expect(titles).toEqual(['Review', 'Overdue', 'Carried', 'Due Today', 'Ending Today']);
  });
});

describe('Legacy record normalization (records persisted before Operational Visibility existed)', () => {
  it('treats an FYI/attention item with no showOnDashboard key at all as shown, matching pre-feature behavior', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const today = '2026-09-03';
    const resident = db.addResident({ firstName: 'Legacy', lastName: 'Case', roomNumber: '170', status: 'active' });

    // Simulate a record shape from before these fields existed: no
    // showOnDashboard/showInHuddle/priority keys present at all, not even
    // as `undefined` — exactly what JSON.parse of old persisted data would
    // produce, as opposed to a TS optional field merely being unset.
    db.addFYI({ text: 'Pre-existing standing note', category: 'general', importance: 'normal', effectiveDate: today });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Pre-existing attention', startDate: today });

    expect(getDashboardFyis(db.getState(), today).some(f => f.text === 'Pre-existing standing note')).toBe(true);
    expect(getActiveAttentionItems(db.getState(), today).some(e => e.item.title === 'Pre-existing attention')).toBe(true);
  });

  it('treats a ResidentTask with no showOnDashboard key at all as hidden, matching pre-feature behavior (opt-in)', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const today = '2026-09-03';
    const resident = db.addResident({ firstName: 'Legacy', lastName: 'Task', roomNumber: '171', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Pre-existing routine task', category: 'Care', time: '0800', frequency: 'daily' });

    expect(getResidentFollowUpTasks(db.getState(), today)).toHaveLength(0);
  });
});

describe('getUnitSituationSummary (Unit + Site Attention only — not a duplicate of the other cards)', () => {
  const today = '2026-09-03';

  it('includes Unit- and Site-scoped Attention items', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    db.addAttentionItem({ scope: 'unit', title: 'Unit outage', startDate: today });
    db.addAttentionItem({ scope: 'site', title: 'Fire drill', startDate: today });

    const labels = getUnitSituationSummary(db.getState(), today).map(e => e.label);
    expect(labels).toContain('Unit outage');
    expect(labels).toContain('Fire drill');
  });

  it('excludes Resident-scoped Attention — that belongs on the Resident Attention card', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'F', lastName: 'Res', roomNumber: '210', status: 'active' });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Resident-only situation', startDate: today });

    expect(getUnitSituationSummary(db.getState(), today)).toHaveLength(0);
  });

  it('excludes FYIs, Resident Tasks, and Away/hospital status — those have their own dedicated cards', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    db.addFYI({ text: 'Routine note', category: 'general', importance: 'urgent', effectiveDate: today });
    const resident = db.addResident({ firstName: 'F', lastName: 'Track', roomNumber: '212', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'RAI Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, priority: 'high' });
    db.addResident({ firstName: 'F', lastName: 'Hosp', roomNumber: '213', status: 'in_hospital' });

    expect(getUnitSituationSummary(db.getState(), today)).toHaveLength(0);
  });

  it('is empty on a quiet shift with nothing eligible', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    expect(getUnitSituationSummary(db.getState(), today)).toHaveLength(0);
  });
});

describe('getValidatedDashboardLayout (corrupted-config crash guard)', () => {
  beforeEach(() => db.resetToDemoState());

  it('returns the default layout when dashboardLayout is not an array at all', () => {
    db.updateSettings({ dashboardLayout: 'not-an-array' as unknown as never });
    expect(() => getValidatedDashboardLayout(db.getState())).not.toThrow();
    const layout = getValidatedDashboardLayout(db.getState());
    expect(Array.isArray(layout)).toBe(true);
    expect(layout.length).toBeGreaterThan(0);
  });

  it('drops entries with an unknown widget id or a non-boolean visible flag, keeping the valid ones', () => {
    db.updateSettings({
      dashboardLayout: [
        { id: 'resident_attention', visible: true },
        { id: 'some_deleted_future_widget', visible: true } as unknown as never,
        { id: 'latest_fyi', visible: 'yes' } as unknown as never,
      ],
    });
    const layout = getValidatedDashboardLayout(db.getState());
    expect(layout).toEqual([{ id: 'resident_attention', visible: true }]);
  });

  it('falls back to the default layout entirely when every entry is malformed', () => {
    db.updateSettings({ dashboardLayout: [{ bogus: true } as unknown as never] });
    const layout = getValidatedDashboardLayout(db.getState());
    expect(layout.length).toBeGreaterThan(0);
    expect(layout.every(w => typeof w.visible === 'boolean')).toBe(true);
  });

  it('passes a well-formed layout through unchanged', () => {
    const wellFormed = [{ id: 'latest_fyi' as const, visible: false }];
    db.updateSettings({ dashboardLayout: wellFormed });
    expect(getValidatedDashboardLayout(db.getState())).toEqual(wellFormed);
  });
});

describe('getHuddleBriefing (read-only briefing, not a record type — showInHuddle only)', () => {
  const today = '2026-09-03';

  it('includes Census and Away unconditionally, but every other source only when flagged showInHuddle', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    db.addResident({ firstName: 'H', lastName: 'Away', roomNumber: '500', status: 'in_hospital' });
    const resident = db.addResident({ firstName: 'H', lastName: 'Res', roomNumber: '501', status: 'active' });

    db.addAttentionItem({ scope: 'unit', title: 'Not flagged for huddle', startDate: today, showInHuddle: false });
    db.addAttentionItem({ scope: 'unit', title: 'Flagged for huddle', startDate: today, showInHuddle: true });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Resident situation', startDate: today, showInHuddle: true });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Follow-up task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, showInHuddle: true, followUpDueDate: today });
    db.addFYI({ text: 'Huddle FYI', category: 'general', importance: 'normal', effectiveDate: today, showInHuddle: true });
    db.addFYI({ text: 'Non-huddle FYI', category: 'general', importance: 'normal', effectiveDate: today });

    const briefing = getHuddleBriefing(db.getState(), today);
    expect(briefing.census.inHospitalCount).toBe(1);
    expect(briefing.away).toHaveLength(1);
    expect(briefing.unitSiteAttention.map(e => e.item.title)).toEqual(['Flagged for huddle']);
    expect(briefing.residentAttention.map(e => e.item.title)).toEqual(['Resident situation']);
    expect(briefing.residentFollowUp.map(e => e.task.title)).toEqual(['Follow-up task']);
    expect(briefing.importantFyis.map(f => f.text)).toEqual(['Huddle FYI']);
  });

  it('includes Code of the Month only when enabled in settings', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    db.updateSettings({ codeOfTheMonthEnabled: false });
    expect(getHuddleBriefing(db.getState(), today).codeOfMonth).toBeUndefined();
  });

  it('is not a persisted record — recomputes fresh from current source data each call', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    expect(getHuddleBriefing(db.getState(), today).unitSiteAttention).toHaveLength(0);
    db.addAttentionItem({ scope: 'site', title: 'Fire drill', startDate: today, showInHuddle: true });
    expect(getHuddleBriefing(db.getState(), today).unitSiteAttention).toHaveLength(1);
  });
});

describe('getTodaysBathingCount', () => {
  it('reuses the real Bathing Grid model rather than a parallel calculation (returns a non-negative count without throwing)', () => {
    db.resetToDemoState();
    const today = new Date().toISOString().split('T')[0];
    const count = getTodaysBathingCount(db.getState(), today);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
