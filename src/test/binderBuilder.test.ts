import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { buildFyiBinderPrintModel } from '../services/print/binderBuilder';

describe('buildFyiBinderPrintModel — FYI Binder is sourced exclusively from FYI records', () => {
  beforeEach(() => db.resetToDemoState());

  it('includes an active resident-scoped FYI, grouped under its resident', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Binder', lastName: 'Included', roomNumber: '501', status: 'active' });
    db.addFYI({ text: 'Prefers assistance at breakfast', category: 'general', importance: 'high', residentId: resident.id, effectiveDate: '2026-08-01' });

    const model = buildFyiBinderPrintModel(db.getState());
    const group = model.sharedResidentGroups.find(g => g.roomNumber === '501');
    expect(group).toBeDefined();
    expect(group!.fyis.some(f => f.text.includes('breakfast') && f.importance === 'high')).toBe(true);
  });

  it('excludes an expired FYI', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Binder', lastName: 'Expired', roomNumber: '502', status: 'active' });
    db.addFYI({ text: 'Temporary note', category: 'general', importance: 'normal', residentId: resident.id, effectiveDate: '2026-07-01', expiryDate: '2026-07-15' });

    const model = buildFyiBinderPrintModel(db.getState());
    const group = model.sharedResidentGroups.find(g => g.roomNumber === '502');
    expect(group).toBeUndefined();
  });

  it('does not pull Attention items into the binder, even when active', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Binder', lastName: 'NotAttention', roomNumber: '503', status: 'active' });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Temporary behaviour concern', startDate: '2026-08-01' });

    const model = buildFyiBinderPrintModel(db.getState());
    const group = model.sharedResidentGroups.find(g => g.roomNumber === '503');
    expect(group).toBeUndefined();
  });
});
