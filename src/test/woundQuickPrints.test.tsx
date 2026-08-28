import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { SHIFT_LPN_DAY_ID, SHIFT_LPN_NIGHT_ID } from '../data/defaultData';
import { generateShiftSheet } from '../services/generator';
import { PrintService } from '../services/print';
import { buildWeeklyWoundOverviewModel, buildWoundSupplyReorderModel } from '../services/print/specializedDocs';
import { WoundWeeklyOverviewDocument } from '../components/print/WoundWeeklyOverviewDocument';
import { WoundSupplyReorderDocument } from '../components/print/WoundSupplyReorderDocument';

describe('dedicated wound print workflows', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });

  it('prints each due wound once in the dedicated LPN section and not in regular task rows', () => {
    const resident = db.addResident({ firstName: 'Avery', lastName: 'North', roomNumber: '102A', status: 'active' });
    const wound = db.addWound({
      residentId: resident.id, shiftId: SHIFT_LPN_DAY_ID, time: '1000', siteLocation: 'Left heel', status: 'active',
      firstAction: 'dressing_change', frequency: 'daily', bathingRelation: 'independent', protocol: 'Cleanse and apply bordered foam.',
      supplies: [{ name: 'Bordered foam 10 × 10 cm' }, { name: 'Sterile saline' }], assessmentType: 'partial',
    });
    const model = PrintService.generateDocumentModel(generateShiftSheet('2026-08-31', SHIFT_LPN_DAY_ID));

    expect(model.woundRows).toHaveLength(1);
    expect(model.woundRows[0]).toMatchObject({ id: wound.id, location: 'Left heel', assessmentType: 'partial' });
    expect(model.tableRows.some(row => row.id.includes(wound.id) || row.isWound)).toBe(false);
  });

  it('uses recurrence across all clinical shifts and keeps separate wound rows in natural room order', () => {
    const resident10 = db.addResident({ firstName: 'Casey', lastName: 'Ten', roomNumber: '10', status: 'active' });
    const resident2 = db.addResident({ firstName: 'Casey', lastName: 'Two', roomNumber: '2', status: 'active' });
    const base = { status: 'active' as const, firstAction: 'treatment' as const, bathingRelation: 'independent' as const, protocol: 'Configured protocol' };
    db.addWound({ ...base, residentId: resident10.id, shiftId: SHIFT_LPN_NIGHT_ID, time: '0100', siteLocation: 'Right ankle', frequency: 'custom', recurrenceRule: { type: 'EVERY_N_DAYS', interval: 14, startDate: '2026-08-31' }, assessmentType: 'full' });
    db.addWound({ ...base, residentId: resident2.id, shiftId: SHIFT_LPN_DAY_ID, time: '0900', siteLocation: 'Left arm', frequency: 'selected_days', recurrenceRule: { type: 'SELECTED_WEEKDAYS', weekdays: [1, 4], selectedDays: [1, 4], startDate: '2026-08-31' }, assessmentType: 'partial' });
    db.addWound({ ...base, residentId: resident2.id, shiftId: SHIFT_LPN_DAY_ID, time: '1100', siteLocation: 'Sacrum', frequency: 'custom', recurrenceRule: { type: 'EVERY_N_DAYS', interval: 28, startDate: '2026-08-31' } });

    const model = buildWeeklyWoundOverviewModel('2026-09-02');
    expect(model.rows.map(row => row.roomNumber)).toEqual(['2', '2', '10']);
    expect(model.dailyTotals).toEqual([3, 0, 0, 1, 0, 0, 0]);
    expect(model.fullAssessmentCount).toBe(1);
    expect(model.partialAssessmentCount).toBe(2);
    expect(model.rows.some(row => row.slots.some(slot => slot.marker?.includes('NLPN')))).toBe(true);
  });

  it('excludes healed, discontinued, and inactive-resident wounds from both quick reports', () => {
    const active = db.addResident({ firstName: 'Active', lastName: 'Resident', roomNumber: '201', status: 'active' });
    const inactive = db.addResident({ firstName: 'Inactive', lastName: 'Resident', roomNumber: '202', status: 'inactive' });
    const add = (residentId: string, status: 'active' | 'resolved' | 'discontinued', location: string) => db.addWound({ residentId, shiftId: SHIFT_LPN_DAY_ID, time: '1000', siteLocation: location, status, firstAction: 'treatment', frequency: 'daily', bathingRelation: 'independent', supplies: [{ name: `${location} supply` }] });
    add(active.id, 'active', 'Included'); add(active.id, 'resolved', 'Healed'); add(active.id, 'discontinued', 'Stopped'); add(inactive.id, 'active', 'Inactive resident');

    expect(buildWeeklyWoundOverviewModel('2026-08-31').rows.map(row => row.location)).toEqual(['Included']);
    expect(buildWoundSupplyReorderModel('2026-08-31', 'all_active').rows.map(row => row.supplyName)).toEqual(['Included supply']);
  });

  it('aggregates exact supply names with use counts and preserves traceability', () => {
    const one = db.addResident({ firstName: 'Robin', lastName: 'One', roomNumber: '301', status: 'active' });
    const two = db.addResident({ firstName: 'Robin', lastName: 'Two', roomNumber: '302', status: 'active' });
    const add = (residentId: string, location: string, name: string) => db.addWound({ residentId, shiftId: SHIFT_LPN_DAY_ID, time: '1000', siteLocation: location, status: 'active', firstAction: 'treatment', frequency: 'daily', bathingRelation: 'independent', supplies: [{ name, quantityPerUse: 2 }] });
    add(one.id, 'Heel', 'Sterile Gauze'); add(two.id, 'Arm', 'Sterile Gauze'); add(two.id, 'Knee', 'sterile gauze');

    const model = buildWoundSupplyReorderModel('2026-08-31', 'current_week');
    expect(model.rows).toHaveLength(2);
    const exact = model.rows.find(row => row.supplyName === 'Sterile Gauze');
    expect(exact?.scheduledUses).toBe(14);
    expect(exact?.residentRooms).toHaveLength(2);
    expect(exact?.woundLocations).toEqual(expect.arrayContaining(['301 — Heel', '302 — Arm']));
  });

  it('renders repeatable table headers and writable inventory columns', () => {
    const resident = db.addResident({ firstName: 'Print', lastName: 'Proof', roomNumber: '401', status: 'active' });
    db.addWound({ residentId: resident.id, shiftId: SHIFT_LPN_DAY_ID, time: '0930', siteLocation: 'Toe', status: 'active', firstAction: 'treatment', frequency: 'daily', bathingRelation: 'independent', supplies: [{ name: 'Gauze' }] });
    const weekly = renderToStaticMarkup(<WoundWeeklyOverviewDocument model={buildWeeklyWoundOverviewModel('2026-08-31')} />);
    const supplies = renderToStaticMarkup(<WoundSupplyReorderDocument model={buildWoundSupplyReorderModel('2026-08-31', 'current_week')} />);
    expect(weekly).toContain('display:table-header-group');
    expect(weekly).toContain('WEEKLY WOUND CARE OVERVIEW');
    expect(supplies).toContain('On Hand');
    expect(supplies).toContain('Re-Order Qty');
  });

  it('uses the configured operational week start and resolves a specific-date wound', () => {
    db.updateSettings({ operationalWeekStartsOn: 0 });
    const resident = db.addResident({ firstName: 'Sunday', lastName: 'Start', roomNumber: '501', status: 'active' });
    db.addWound({ residentId: resident.id, shiftId: SHIFT_LPN_DAY_ID, time: '1000', siteLocation: 'Specific site', status: 'active', firstAction: 'treatment', frequency: 'once', recurrenceRule: { type: 'ONE_TIME', specificDate: '2026-09-02', startDate: '2026-09-02' }, bathingRelation: 'independent' });

    const model = buildWeeklyWoundOverviewModel('2026-09-02');
    expect(model.days[0]).toMatchObject({ label: 'Sun', dateStr: '2026-08-30' });
    expect(model.rows[0].slots.find(slot => slot.dateStr === '2026-09-02')?.due).toBe(true);
    expect(buildWeeklyWoundOverviewModel('2026-09-20').rows).toHaveLength(0);
  });

  it('keeps future active supplies in all-active scope but not the current-week scope', () => {
    const resident = db.addResident({ firstName: 'Future', lastName: 'Supply', roomNumber: '601', status: 'active' });
    db.addWound({ residentId: resident.id, shiftId: SHIFT_LPN_DAY_ID, time: '1000', siteLocation: 'Future site', status: 'active', firstAction: 'treatment', frequency: 'once', recurrenceRule: { type: 'ONE_TIME', specificDate: '2026-10-01', startDate: '2026-10-01' }, bathingRelation: 'independent', supplies: [{ name: 'Future dressing' }] });
    expect(buildWoundSupplyReorderModel('2026-08-31', 'current_week').rows).toHaveLength(0);
    expect(buildWoundSupplyReorderModel('2026-08-31', 'all_active').rows.map(row => row.supplyName)).toEqual(['Future dressing']);
  });

  it('leaves HCA output unchanged while retaining regular LPN tasks', () => {
    const resident = db.addResident({ firstName: 'Role', lastName: 'Boundary', roomNumber: '701', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_LPN_DAY_ID, title: 'Vital Signs', category: 'Monitoring', time: '0900', frequency: 'daily' });
    db.addWound({ residentId: resident.id, shiftId: SHIFT_LPN_DAY_ID, time: '1000', siteLocation: 'Heel', status: 'active', firstAction: 'treatment', frequency: 'daily', bathingRelation: 'independent' });
    const lpn = PrintService.generateDocumentModel(generateShiftSheet('2026-08-31', SHIFT_LPN_DAY_ID));
    expect(lpn.tableRows.some(row => row.taskTitle === 'Vital Signs')).toBe(true);
    expect(lpn.woundRows).toHaveLength(1);
    const hcaShift = db.getState().shifts.find(shift => db.getState().roles.find(role => role.id === shift.roleId)?.defaultPrintProfile === 'simple_checklist')!;
    const hca = PrintService.generateDocumentModel(generateShiftSheet('2026-08-31', hcaShift.id));
    expect(hca.woundRows).toEqual([]);
  });
});
