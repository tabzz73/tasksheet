// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { SHIFT_LPN_DAY_ID, SHIFT_LPN_NIGHT_ID } from '../data/defaultData';
import { matchesWoundProductSearch, WOUND_SUPPLY_CATALOG_SEED } from '../data/woundSupplyCatalog';
import { buildWoundSupplyReorderModel } from '../services/print/specializedDocs';
import { WoundSupplyCatalogTab } from '../components/views/WoundSupplyCatalogTab';
import { WoundSupplyPicker } from '../components/common/WoundSupplyPicker';

describe('brand-based wound supply catalog', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('seeds named brands without claiming an official formulary and normalizes size search', () => {
    const names = WOUND_SUPPLY_CATALOG_SEED.map(product => product.productName);
    expect(names).toEqual(expect.arrayContaining(['Mepilex Border Flex 10 × 10 cm', 'Mepore 9 × 15 cm', 'Biatain Silicone 10 × 20 cm', 'AQUACEL Ag+', 'ALLEVYN Gentle Border']));
    const tenByTwenty = WOUND_SUPPLY_CATALOG_SEED.filter(product => matchesWoundProductSearch(product, '10x20')).map(product => product.productName);
    expect(tenByTwenty).toEqual(expect.arrayContaining(['Mepilex Border Flex 10 × 20 cm', 'Biatain Silicone 10 × 20 cm']));
    const mepSearch = WOUND_SUPPLY_CATALOG_SEED.filter(product => matchesWoundProductSearch(product, 'mep')).map(product => product.productName);
    expect(mepSearch).toEqual(expect.arrayContaining(['Mepilex', 'Mepitel', 'Mepore', 'Mesalt']));
    expect(WOUND_SUPPLY_CATALOG_SEED.some(product => /AHS Approved/i.test(`${product.notes || ''} ${product.localFormularyStatus || ''}`))).toBe(false);
  });

  it('allows facility stock changes, safe seeded deactivation, and user-created local products', () => {
    const seeded = db.getState().woundSupplyCatalog.find(product => product.productName === 'Mepilex Border Flex 10 × 10 cm')!;
    db.updateWoundSupplyProduct(seeded.id, { isFacilityStock: true, localFormularyStatus: 'approved_stocked' });
    db.updateWoundSupplyProduct(seeded.id, { isActive: false, localFormularyStatus: 'inactive' });
    const local = db.addWoundSupplyProduct({ productFamily: 'Facility Heel Foam', productName: 'Facility Heel Foam Small', manufacturer: 'Local Contract Product', category: 'Silicone Foam Dressing', size: 'Small', unit: 'Each', packageSize: 'Box of 5', supplierItemNumber: 'LOCAL-100', isFacilityStock: true, defaultReorderLevel: 4, isActive: true, localFormularyStatus: 'approved_stocked' });
    expect(db.getState().woundSupplyCatalog.find(product => product.id === seeded.id)).toMatchObject({ isActive: false, provenance: 'seeded' });
    expect(local).toMatchObject({ provenance: 'user_created', supplierItemNumber: 'LOCAL-100', defaultReorderLevel: 4 });
  });

  it('admin UI searches brands and creates an exact local size record', () => {
    const view = render(<WoundSupplyCatalogTab />);
    fireEvent.change(view.getByLabelText(/Search wound supply catalog/i), { target: { value: 'mepore 9x15' } });
    expect(view.getByText('Mepore 9 × 15 cm')).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: /Add Product/i }));
    fireEvent.change(view.getByLabelText('Product Family'), { target: { value: 'Local Foam' } });
    fireEvent.change(view.getByLabelText('Product Name'), { target: { value: 'Local Foam 8 × 8 cm' } });
    fireEvent.change(view.getByLabelText('Manufacturer / Brand'), { target: { value: 'Facility Supplier' } });
    fireEvent.change(view.getByLabelText('Dressing Category'), { target: { value: 'Foam Dressing' } });
    fireEvent.change(view.getByLabelText('Size'), { target: { value: '8 × 8 cm' } });
    fireEvent.click(view.getByRole('button', { name: /Save Product/i }));
    expect(db.getState().woundSupplyCatalog.some(product => product.productName === 'Local Foam 8 × 8 cm' && product.provenance === 'user_created')).toBe(true);
  });

  it('shows the complete active catalog in the wound protocol supply picker', () => {
    const view = render(<WoundSupplyPicker value={[]} onChange={() => undefined} />);
    fireEvent.click(view.getByRole('button', { name: 'All Catalog Products' }));
    expect(view.getByText(`${db.getState().woundSupplyCatalog.filter(product => product.isActive).length} matching active products`)).not.toBeNull();
    expect(view.getByText('Conforming Gauze')).not.toBeNull();
    expect(view.getByText('Tubular Retention Dressing')).not.toBeNull();
  });

  it('aggregates the same structured product while keeping sizes and families separate', () => {
    db.clearAllOperationalData();
    const one = db.addResident({ firstName: 'Size', lastName: 'One', roomNumber: '801', status: 'active' });
    const two = db.addResident({ firstName: 'Size', lastName: 'Two', roomNumber: '802', status: 'active' });
    const catalog = db.getState().woundSupplyCatalog;
    const ten = catalog.find(product => product.productName === 'Mepilex Border Flex 10 × 10 cm')!;
    const twenty = catalog.find(product => product.productName === 'Mepilex Border Flex 10 × 20 cm')!;
    const biatain = catalog.find(product => product.productName === 'Biatain Silicone 10 × 10 cm')!;
    const selection = (product: typeof ten, quantityPerUse?: number) => ({ catalogId: product.id, name: product.productName, productFamily: product.productFamily, manufacturer: product.manufacturer, category: product.category, unitSize: product.size, unitOfMeasure: product.unit, quantityPerUse });
    const base = { status: 'active' as const, firstAction: 'treatment' as const, frequency: 'daily' as const, bathingRelation: 'independent' as const, time: '1000' };
    db.addWound({ ...base, residentId: one.id, shiftId: SHIFT_LPN_DAY_ID, siteLocation: 'Heel', supplies: [selection(ten, 1), selection(twenty, 2)] });
    db.addWound({ ...base, residentId: two.id, shiftId: SHIFT_LPN_NIGHT_ID, siteLocation: 'Sacrum', time: '0100', supplies: [selection(ten, 1), selection(biatain, 1)] });
    const report = buildWoundSupplyReorderModel('2026-08-31', 'current_week');

    expect(report.rows).toHaveLength(3);
    const tenRow = report.rows.find(row => row.supplyName === 'Mepilex Border Flex' && row.unitSize === '10 × 10 cm');
    expect(tenRow).toMatchObject({ scheduledUses: 14, quantityPerUse: 1, estimatedNeed: 14 });
    expect(tenRow?.residentRooms).toHaveLength(2);
    expect(report.rows.find(row => row.supplyName === 'Mepilex Border Flex' && row.unitSize === '10 × 20 cm')).toMatchObject({ scheduledUses: 7, quantityPerUse: 2, estimatedNeed: 14 });
    expect(report.rows.some(row => row.supplyName === 'Biatain Silicone')).toBe(true);
  });

  it('leaves estimated need blank when quantity per use is absent or inconsistent', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Quantity', lastName: 'Optional', roomNumber: '803', status: 'active' });
    const product = db.getState().woundSupplyCatalog.find(item => item.productName === 'Normal Saline')!;
    db.addWound({ residentId: resident.id, shiftId: SHIFT_LPN_DAY_ID, time: '1000', siteLocation: 'Leg', status: 'active', firstAction: 'treatment', frequency: 'daily', bathingRelation: 'independent', supplies: [{ catalogId: product.id, name: product.productName, productFamily: product.productFamily, unitOfMeasure: product.unit }] });
    const row = buildWoundSupplyReorderModel('2026-08-31', 'current_week').rows[0];
    expect(row).toMatchObject({ scheduledUses: 7, quantityPerUse: null, estimatedNeed: null });
  });

  it('migrates an exact legacy product name to a catalog reference on restore', () => {
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Legacy', lastName: 'Supply', roomNumber: '804', status: 'active' });
    db.addWound({ residentId: resident.id, shiftId: SHIFT_LPN_DAY_ID, time: '1000', siteLocation: 'Arm', status: 'active', firstAction: 'treatment', frequency: 'daily', bathingRelation: 'independent', supplies: [{ name: 'Mepilex Border Flex 10 × 10 cm' }] });
    const backup = JSON.parse(db.backupDatabase());
    delete backup.woundSupplyCatalog;
    db.restoreDatabase(JSON.stringify(backup));
    const migrated = db.getState().wounds.find(wound => wound.residentId === resident.id)?.supplies?.[0];
    expect(migrated).toMatchObject({ name: 'Mepilex Border Flex 10 × 10 cm', productFamily: 'Mepilex Border Flex', unitSize: '10 × 10 cm' });
    expect(migrated?.catalogId).toBeTruthy();
  });
});
