import { beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { buildHuddleSheetModel } from '../services/dashboard';

const today = '2026-09-04';

describe('buildHuddleSheetModel — read-only projection of live data', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });

  it('reflects Census counts from real resident statuses', () => {
    db.addResident({ firstName: 'A', lastName: 'One', roomNumber: '101', status: 'active' });
    db.addResident({ firstName: 'B', lastName: 'Two', roomNumber: '102', status: 'active' });
    db.addResident({ firstName: 'C', lastName: 'Three', roomNumber: '103', status: 'in_hospital' });
    db.addResident({ firstName: 'D', lastName: 'Four', roomNumber: '104', status: 'out_on_pass' });

    const model = buildHuddleSheetModel(db.getState(), today);
    expect(model.census).toEqual({ activeCount: 2, inHospitalCount: 1, outOnPassCount: 1, onHoldCount: 0 });
  });

  it('lists Away From Unit for hospital/pass/hold residents with room and status', () => {
    db.addResident({ firstName: 'Ivy', lastName: 'Hosp', roomNumber: '105', status: 'in_hospital' });
    db.addResident({ firstName: 'Jack', lastName: 'Pass', roomNumber: '106', status: 'out_on_pass' });

    const model = buildHuddleSheetModel(db.getState(), today);
    expect(model.away).toHaveLength(2);
    expect(model.away.find(a => a.residentName === 'Ivy Hosp')).toMatchObject({ roomNumber: '105', statusLabel: 'In Hospital' });
    expect(model.away.find(a => a.residentName === 'Jack Pass')).toMatchObject({ roomNumber: '106', statusLabel: 'Out on Pass' });
  });

  it('separates Unit/Site Attention from Resident Attention, huddle-flagged only', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Res', roomNumber: '107', status: 'active' });
    db.addAttentionItem({ scope: 'site', title: 'Internet unavailable', details: '0900-1200', startDate: today, active: true, showInHuddle: true } as any);
    db.addAttentionItem({ scope: 'unit', title: 'Fire drill', startDate: today, active: true, showInHuddle: true } as any);
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Fall risk', startDate: today, active: true, showInHuddle: true } as any);
    // Not huddle-flagged — must be excluded entirely.
    db.addAttentionItem({ scope: 'site', title: 'Not for huddle', startDate: today, active: true, showInHuddle: false } as any);

    const model = buildHuddleSheetModel(db.getState(), today);
    expect(model.unitSiteAttention.map(a => a.title).sort()).toEqual(['Fire drill', 'Internet unavailable']);
    expect(model.residentAttention).toHaveLength(1);
    expect(model.residentAttention[0]).toMatchObject({ roomNumber: '107', residentName: 'F Res', title: 'Fall risk' });
  });

  it('Must-Not-Miss Follow-up shows the same wording as the on-screen Huddle: overdue, carried forward, Needs Review', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Overdue', roomNumber: '108', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Collect urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, mustNotMiss: true, followUpDueDate: '2026-09-02' });

    const model = buildHuddleSheetModel(db.getState(), today);
    const entry = model.mustNotMiss.find(m => m.title === 'Collect urine sample');
    expect(entry?.statusLabel).toBe('2 days overdue');
    expect(entry?.roomNumber).toBe('108');
  });

  it('Must-Not-Miss Follow-up shows Day X/Y for bounded tracking', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Track', roomNumber: '109', status: 'active' });
    db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'Monitoring',
      time: '0800', frequency: 'daily', showOnDashboard: true, showInHuddle: true, mustNotMiss: true,
      trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-01', endDate: '2026-09-05' },
    });

    const model = buildHuddleSheetModel(db.getState(), today);
    const entry = model.mustNotMiss.find(m => m.title === 'Behaviour Tracking');
    expect(entry?.statusLabel).toBe('Day 4/5');
  });

  it('Must-Not-Miss Follow-up shows occurrence X/Y progress, not a date window', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Occ', roomNumber: '110', status: 'active' });
    let task = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring',
      time: '0800', frequency: 'once', showOnDashboard: true, mustNotMiss: true,
      trackingConfig: { kind: 'weight', requiredOccurrences: 3 },
    });
    task = db.recordResidentTaskOccurrence(task.id);
    task = db.recordResidentTaskOccurrence(task.id);
    void task;

    const model = buildHuddleSheetModel(db.getState(), today);
    const entry = model.mustNotMiss.find(m => m.title === 'Weight Monitoring');
    expect(entry?.statusLabel).toBe('2/3 completed · 1 remaining');
  });

  it('marks needsReview true for an explicitly flagged Needs Review item', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Review', roomNumber: '111', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Escalated Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, mustNotMiss: true, followUpDueDate: today });
    db.setResidentTaskFollowUpStatus(task.id, 'needs_review');

    const model = buildHuddleSheetModel(db.getState(), today);
    const entry = model.mustNotMiss.find(m => m.title === 'Escalated Task');
    expect(entry?.needsReview).toBe(true);
    expect(entry?.statusLabel).toMatch(/Needs Review/);
  });

  it('includes only FYIs flagged showInHuddle, excluding otherwise-active ones', () => {
    db.addFYI({ text: 'Huddle-visible FYI', category: 'general', importance: 'normal', showOnDashboard: true, showInHuddle: true } as any);
    db.addFYI({ text: 'Not for huddle', category: 'general', importance: 'normal', showOnDashboard: true, showInHuddle: false } as any);

    const model = buildHuddleSheetModel(db.getState(), today);
    expect(model.importantFyis.map(f => f.text)).toEqual(['Huddle-visible FYI']);
  });

  it('includes Code of the Month only when enabled and a code is set', () => {
    db.updateSettings({
      emergencyCodes: [{ id: 'c1', code: 'Red', name: 'Fire', isSystem: true, reminder: 'Know your exits' }],
      codeOfTheMonthId: 'c1',
      codeOfTheMonthEnabled: true,
    });
    let model = buildHuddleSheetModel(db.getState(), today);
    expect(model.codeOfMonth).toEqual({ code: 'Red', name: 'Fire', reminder: 'Know your exits' });

    db.updateSettings({ codeOfTheMonthEnabled: false });
    model = buildHuddleSheetModel(db.getState(), today);
    expect(model.codeOfMonth).toBeUndefined();
  });

  it('hasAnyContent is false when every section is genuinely empty, true otherwise', () => {
    let model = buildHuddleSheetModel(db.getState(), today);
    expect(model.hasAnyContent).toBe(false);

    db.addAttentionItem({ scope: 'site', title: 'Something', startDate: today, active: true, showInHuddle: true } as any);
    model = buildHuddleSheetModel(db.getState(), today);
    expect(model.hasAnyContent).toBe(true);
  });

  it('never shows a section item that is not flagged for Huddle, even if Dashboard-visible', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'DashOnly', roomNumber: '112', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Dashboard-only task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, showInHuddle: false, followUpDueDate: today });

    const model = buildHuddleSheetModel(db.getState(), today);
    expect(model.mustNotMiss.some(m => m.title === 'Dashboard-only task')).toBe(false);
  });

  it('detects the shift in effect from wall-clock time for header context only — not a content filter', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 4, 8, 0)); // 0800 — HCA Day (0700-1500)
    let model = buildHuddleSheetModel(db.getState(), today);
    expect(model.shiftCode).toBe('D1');
    expect(model.shiftName).toBe('HCA Day');

    vi.setSystemTime(new Date(2026, 8, 4, 16, 0)); // 1600 — HCA Evening
    model = buildHuddleSheetModel(db.getState(), today);
    expect(model.shiftCode).toBe('E1');
    vi.useRealTimers();
  });

  it('formattedDate matches the requested date, independent of the current shift', () => {
    const model = buildHuddleSheetModel(db.getState(), '2026-12-25');
    expect(model.formattedDate).toMatch(/December 25, 2026/);
  });
});
