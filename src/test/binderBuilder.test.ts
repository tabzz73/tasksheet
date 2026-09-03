import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { buildFyiBinderPrintModel } from '../services/print/binderBuilder';

describe('buildFyiBinderPrintModel — resident attention items opted into the binder', () => {
  beforeEach(() => db.resetToDemoState());

  it('includes an attention item with includeInFyiBinder set, grouped under its resident', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Binder', lastName: 'Opted', roomNumber: '501', status: 'active' });
    db.addResidentAttentionItem(resident.id, {
      type: 'Behaviour Tracking',
      note: 'Redirect calmly',
      startDate: '2026-08-01',
      includeInFyiBinder: true,
      importance: 'high',
    });

    const model = buildFyiBinderPrintModel(db.getState());
    const group = model.sharedResidentGroups.find(g => g.roomNumber === '501');
    expect(group).toBeDefined();
    expect(group!.fyis.some(f => f.text.includes('Behaviour Tracking') && f.importance === 'high')).toBe(true);
  });

  it('excludes an attention item that was not opted into the binder', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Binder', lastName: 'NotOpted', roomNumber: '502', status: 'active' });
    db.addResidentAttentionItem(resident.id, { type: 'Sleep Tracking', startDate: '2026-08-01' });

    const model = buildFyiBinderPrintModel(db.getState());
    const group = model.sharedResidentGroups.find(g => g.roomNumber === '502');
    expect(group).toBeUndefined();
  });

  it('excludes an expired attention item even when opted into the binder', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Binder', lastName: 'Expired', roomNumber: '503', status: 'active' });
    db.addResidentAttentionItem(resident.id, {
      type: 'Temporary Care Change',
      startDate: '2026-07-01',
      endDate: '2026-07-15',
      includeInFyiBinder: true,
    });

    const model = buildFyiBinderPrintModel(db.getState());
    const group = model.sharedResidentGroups.find(g => g.roomNumber === '503');
    expect(group).toBeUndefined();
  });
});
