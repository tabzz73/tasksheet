import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import {
  isWithinActiveWindow,
  getActiveAttentionItems,
  getAwayResidents,
  getDashboardFyis,
  getHuddleBriefing,
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
  const today = '2026-09-03';

  it('only includes tasks explicitly marked showOnDashboard: true — opt-in, unlike FYI/Attention', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'F', lastName: 'One', roomNumber: '150', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Flagged Follow-up', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Routine Task', category: 'Care', time: '0900', frequency: 'daily' });

    const titles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(titles).toEqual(['Flagged Follow-up']);
  });

  it('labels a task with no recurrence end date as "Active", one ending today as "Ends today", and one with a future end date as "Through <date>"', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'F', lastName: 'Two', roomNumber: '151', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'RAI Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Ends Today Task', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, recurrenceRule: { endDate: today, endType: 'on_date' } });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Through Sep 10', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, recurrenceRule: { endDate: '2026-09-10', endType: 'on_date' } });

    const entries = getResidentFollowUpTasks(db.getState(), today);
    const byTitle = Object.fromEntries(entries.map(e => [e.task.title, e]));
    expect(byTitle['RAI Tracking'].dateLabel).toBe('Active');
    expect(byTitle['Ends Today Task'].dateLabel).toBe('Ends today');
    expect(byTitle['Ends Today Task'].endingSoon).toBe(true);
    expect(byTitle['Through Sep 10'].dateLabel).toBe('Through Sep 10');
    expect(byTitle['Through Sep 10'].endingSoon).toBe(false);
  });

  it('excludes a flagged task whose recurrence end date has already passed', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'F', lastName: 'Three', roomNumber: '152', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Expired Follow-up', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, recurrenceRule: { endDate: '2026-08-01', endType: 'on_date' } });

    expect(getResidentFollowUpTasks(db.getState(), today)).toHaveLength(0);
  });

  it('sorts by priority (urgent/high before normal), then by room', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const roomB = db.addResident({ firstName: 'F', lastName: 'B', roomNumber: '160', status: 'active' });
    const roomA = db.addResident({ firstName: 'F', lastName: 'A', roomNumber: '155', status: 'active' });
    db.addResidentTask({ residentId: roomB.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Normal Priority', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, priority: 'normal' });
    db.addResidentTask({ residentId: roomA.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urgent Priority', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, priority: 'urgent' });

    const titles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(titles).toEqual(['Urgent Priority', 'Normal Priority']);
  });

  it('showInHuddle is independent of showOnDashboard — a task can be flagged for one, the other, both, or neither', () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'F', lastName: 'Huddle', roomNumber: '161', status: 'active' });
    const dashboardOnly = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Dashboard Only', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, showInHuddle: false });
    const huddleOnly = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Huddle Only (not on Dashboard)', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: false, showInHuddle: true });

    const dashboardTitles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(dashboardTitles).toContain('Dashboard Only');
    expect(dashboardTitles).not.toContain('Huddle Only (not on Dashboard)');

    // showInHuddle is persisted independently even though no Huddle View
    // consumes it yet.
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
    db.addResidentTask({ residentId: goingAway.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Stale Follow-up', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true });
    db.addResidentTask({ residentId: hospital.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Still Relevant Follow-up', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true });
    db.updateResident(goingAway.id, { status: 'discharged' });

    const titles = getResidentFollowUpTasks(db.getState(), today).map(e => e.task.title);
    expect(titles).not.toContain('Stale Follow-up');
    expect(titles).toContain('Still Relevant Follow-up');
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
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Follow-up task', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, showInHuddle: true });
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
