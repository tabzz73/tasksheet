// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { ROLE_HCA_ID, ROLE_LPN_ID } from '../data/defaultData';
import {
  buildSavedPrintPackageModel,
  listSavedPrintPackages,
  saveSavedPrintPackage,
  deleteSavedPrintPackage,
} from '../services/print/packages';
import { SavedPrintPackage } from '../types';

describe('saved print packages', () => {
  beforeEach(() => db.resetToDemoState());

  // ─── Persistence ────────────────────────────────────────────────────────
  it('creates, reloads, updates, renames, duplicates, and deletes a saved package', () => {
    const shift = db.getState().shifts.find(s => s.isActive !== false)!;
    const pkg: SavedPrintPackage = {
      id: 'spp_test_1',
      name: 'Morning Charge Package',
      items: [{ id: 'i1', type: 'shift_document', shiftId: shift.id }],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };

    saveSavedPrintPackage(pkg);
    expect(listSavedPrintPackages().map(p => p.id)).toContain('spp_test_1');

    // "Reload" — read persisted settings directly, not the in-memory object.
    const reloaded = listSavedPrintPackages().find(p => p.id === 'spp_test_1');
    expect(reloaded?.name).toBe('Morning Charge Package');
    expect(reloaded?.items).toHaveLength(1);

    // Update / rename (same id upserts).
    saveSavedPrintPackage({ ...pkg, name: 'Morning Charge — Renamed', updatedAt: '2026-09-02T00:00:00.000Z' });
    expect(listSavedPrintPackages()).toHaveLength(1);
    expect(listSavedPrintPackages()[0].name).toBe('Morning Charge — Renamed');

    // Duplicate — a distinct id, original untouched.
    const duplicate: SavedPrintPackage = { ...pkg, id: 'spp_test_2', name: 'Morning Charge (Copy)' };
    saveSavedPrintPackage(duplicate);
    expect(listSavedPrintPackages()).toHaveLength(2);
    expect(listSavedPrintPackages().find(p => p.id === 'spp_test_1')?.name).toBe('Morning Charge — Renamed');

    // Delete.
    deleteSavedPrintPackage('spp_test_2');
    expect(listSavedPrintPackages().map(p => p.id)).toEqual(['spp_test_1']);
  });

  it('survives being re-read from settings the way a restart would (no separate datastore)', () => {
    const shift = db.getState().shifts.find(s => s.isActive !== false)!;
    saveSavedPrintPackage({
      id: 'spp_restart', name: 'Restart Check',
      items: [{ id: 'i1', type: 'shift_document', shiftId: shift.id }],
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    });
    // Saved packages live in settings, the same object backup/restore serializes —
    // confirm they round-trip through JSON exactly like the rest of state does.
    const roundTripped = JSON.parse(JSON.stringify(db.getState().settings.savedPrintPackages));
    expect(roundTripped).toEqual(db.getState().settings.savedPrintPackages);
    expect(roundTripped.find((p: SavedPrintPackage) => p.id === 'spp_restart')).toBeDefined();
  });

  // ─── Rendering ──────────────────────────────────────────────────────────
  it('renders multiple mixed document types in the saved order, reusing the existing report renderers', () => {
    const hcaShift = db.getState().shifts.find(s => s.roleId === ROLE_HCA_ID && s.isActive !== false)!;
    const lpnShift = db.getState().shifts.find(s => s.roleId === ROLE_LPN_ID && s.isActive !== false)!;
    const pkg: SavedPrintPackage = {
      id: 'spp_mixed', name: 'Morning Charge Package',
      items: [
        { id: 'i1', type: 'shift_document', shiftId: lpnShift.id },
        { id: 'i2', type: 'wound_schedule' },
        { id: 'i3', type: 'fyi_binder' },
        { id: 'i4', type: 'shift_document', shiftId: hcaShift.id },
        { id: 'i5', type: 'blank_template' },
      ],
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    };

    const model = buildSavedPrintPackageModel(pkg, '2026-09-03');
    expect(model.packageType).toBe('saved_package');
    expect(model.savedPackageId).toBe('spp_mixed');
    expect(model.items.map(i => i.docType)).toEqual([
      'shift_document', 'wound_schedule', 'fyi_binder', 'shift_document', 'blank_template',
    ]);
    // Correct model attached per type — same renderers as the built-in packages.
    expect(model.items[0].shiftModel).toBeDefined();
    expect(model.items[1].woundModel).toBeDefined();
    expect(model.items[2].fyiBinderModel).toBeDefined();
    expect(model.items[3].shiftModel).toBeDefined();
    expect(model.items[4].shiftModel).toBeDefined();
    expect(model.configurationWarnings).toHaveLength(0);
  });

  // ─── History ────────────────────────────────────────────────────────────
  it('carries a raw shiftSheet on every shift_document item so print history can be recorded, same as the built-in packages', () => {
    const shift = db.getState().shifts.find(s => s.isActive !== false)!;
    const pkg: SavedPrintPackage = {
      id: 'spp_history', name: 'History Check',
      items: [{ id: 'i1', type: 'shift_document', shiftId: shift.id }],
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const model = buildSavedPrintPackageModel(pkg, '2026-09-10');
    const shiftItem = model.items.find(i => i.docType === 'shift_document');
    expect(shiftItem?.shiftSheet?.shift.id).toBe(shift.id);
    expect(shiftItem?.shiftModel).toBeDefined();
  });

  // ─── Content warnings (reuses the existing contentWarnings architecture) ──
  it('warns on blank shifts, empty bathing weeks, and no active wounds without blocking the package', () => {
    db.clearAllOperationalData();
    const clinicalRoleIds = new Set(db.getState().roles
      .filter(role => role.defaultPrintProfile === 'clinical_worksheet')
      .map(role => role.id));
    db.getState().shifts.filter(s => s.roleId === ROLE_HCA_ID || clinicalRoleIds.has(s.roleId))
      .forEach(s => db.updateShift(s.id, { isActive: false }));
    const shift = db.addShift({ name: 'Quiet Day', shortCode: 'QD', roleId: ROLE_HCA_ID, startTime: '0700', endTime: '1500', isActive: true });

    const pkg: SavedPrintPackage = {
      id: 'spp_empty', name: 'Empty Sections Check',
      items: [
        { id: 'i1', type: 'shift_document', shiftId: shift.id },
        { id: 'i2', type: 'bathing_grid' },
        { id: 'i3', type: 'wound_schedule' },
        { id: 'i4', type: 'fyi_binder' },
      ],
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const model = buildSavedPrintPackageModel(pkg, '2026-08-26');
    expect(model.configurationWarnings).toHaveLength(0); // non-blocking — package still prints
    expect(model.items).toHaveLength(4);
    expect(model.contentWarnings.join(' ')).toMatch(/QD.*no scheduled tasks/i);
    expect(model.contentWarnings.join(' ')).toMatch(/Bathing.*no scheduled bathing/i);
    expect(model.contentWarnings.join(' ')).toMatch(/Wound.*no active wound protocols/i);
  });

  // ─── Stale / malformed configuration ───────────────────────────────────
  it('skips a deleted shift reference with a blocking, repair-me warning instead of crashing', () => {
    const pkg: SavedPrintPackage = {
      id: 'spp_stale', name: 'Stale Shift Check',
      items: [{ id: 'i1', type: 'shift_document', shiftId: 'shift-does-not-exist' }],
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const model = buildSavedPrintPackageModel(pkg, '2026-09-03');
    expect(model.items).toHaveLength(0);
    expect(model.configurationWarnings.join(' ')).toMatch(/no longer exists/i);
  });

  it('skips a deactivated shift with a repair-me warning', () => {
    const shift = db.getState().shifts.find(s => s.isActive !== false)!;
    db.updateShift(shift.id, { isActive: false });
    const pkg: SavedPrintPackage = {
      id: 'spp_inactive', name: 'Inactive Shift Check',
      items: [{ id: 'i1', type: 'shift_document', shiftId: shift.id }],
      createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z',
    };
    const model = buildSavedPrintPackageModel(pkg, '2026-09-03');
    expect(model.items).toHaveLength(0);
    expect(model.configurationWarnings.join(' ')).toMatch(/no longer an active shift/i);
  });

  it('flags an empty package (zero documents) as blocking, and never crashes on malformed persisted data', () => {
    const empty: SavedPrintPackage = { id: 'spp_none', name: 'Nothing Yet', items: [], createdAt: '2026-09-01T00:00:00.000Z', updatedAt: '2026-09-01T00:00:00.000Z' };
    expect(buildSavedPrintPackageModel(empty, '2026-09-03').configurationWarnings.length).toBeGreaterThan(0);

    db.updateSettings({ savedPrintPackages: [
      { id: 'valid', name: 'Valid', items: [] } as any,
      { id: 'no-name' } as any,
      { name: 'no-id', items: [] } as any,
      null as any,
      'not-an-object' as any,
    ] });
    expect(() => listSavedPrintPackages()).not.toThrow();
    expect(listSavedPrintPackages().map(p => p.id)).toEqual(['valid']);
  });

  // ─── Date behavior ──────────────────────────────────────────────────────
  it('always resolves against the date passed in, never a date baked into the saved package', () => {
    const shift = db.getState().shifts.find(s => s.isActive !== false)!;
    const pkg: SavedPrintPackage = {
      id: 'spp_date', name: 'Date Check',
      items: [{ id: 'i1', type: 'shift_document', shiftId: shift.id }],
      createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const modelA = buildSavedPrintPackageModel(pkg, '2026-09-03');
    const modelB = buildSavedPrintPackageModel(pkg, '2026-09-10');
    expect(modelA.dateStr).toBe('2026-09-03');
    expect(modelB.dateStr).toBe('2026-09-10');
    expect(modelA.items[0].shiftSheet?.date).toBe('2026-09-03');
    expect(modelB.items[0].shiftSheet?.date).toBe('2026-09-10');
  });
});
