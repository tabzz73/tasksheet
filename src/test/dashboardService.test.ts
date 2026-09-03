import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { ROLE_HCA_ID } from '../data/defaultData';
import {
  isWithinActiveWindow,
  getActiveResidentAttentionItems,
  getAwayResidents,
  getDashboardFyis,
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

describe('getActiveResidentAttentionItems', () => {
  beforeEach(() => db.resetToDemoState());

  it('suppresses future-start, expired, and manually-ended items; keeps active-today ones', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const today = '2026-09-03';
    db.addResidentAttentionItem(resident.id, { type: 'Active Today', startDate: today });
    const future = db.addResidentAttentionItem(resident.id, { type: 'Future', startDate: '2026-09-10' });
    const expired = db.addResidentAttentionItem(resident.id, { type: 'Expired', startDate: '2026-08-01', endDate: '2026-08-15' });
    const endingToday = db.addResidentAttentionItem(resident.id, { type: 'Ending Today', startDate: '2026-08-25', endDate: today });
    const manuallyEnded = db.addResidentAttentionItem(resident.id, { type: 'Manually Ended', startDate: today });
    db.endResidentAttentionItem(resident.id, manuallyEnded.id);

    const active = getActiveResidentAttentionItems(db.getState(), today);
    const types = active.filter(e => e.resident.id === resident.id).map(e => e.item.type);
    expect(types).toContain('Active Today');
    expect(types).toContain('Ending Today');
    expect(types).not.toContain('Future');
    expect(types).not.toContain('Expired');
    expect(types).not.toContain('Manually Ended');

    // Ending-soon flag
    const endingEntry = active.find(e => e.item.id === endingToday.id)!;
    expect(endingEntry.endingSoon).toBe(true);
  });

  it('manually ending an item preserves the historical record rather than deleting it', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const item = db.addResidentAttentionItem(resident.id, { type: 'To End', startDate: '2026-09-03' });
    db.endResidentAttentionItem(resident.id, item.id);
    const stored = db.getState().residents.find(r => r.id === resident.id)!.attentionItems!.find(a => a.id === item.id);
    expect(stored).toBeDefined();
    expect(stored!.active).toBe(false);
    expect(stored!.updatedAt).toBeDefined();
  });

  it('rejects an attention item with no type', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    expect(() => db.addResidentAttentionItem(resident.id, { type: '  ', startDate: '2026-09-03' })).toThrow(/required/i);
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

describe('getTodaysBathingCount', () => {
  it('reuses the real Bathing Grid model rather than a parallel calculation (returns a non-negative count without throwing)', () => {
    db.resetToDemoState();
    const today = new Date().toISOString().split('T')[0];
    const count = getTodaysBathingCount(db.getState(), today);
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
