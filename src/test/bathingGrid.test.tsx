// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BathingScheduleDocument } from '../components/print/BathingScheduleDocument';
import { PrintPreviewPage } from '../components/views/PrintPreviewPage';
import { db } from '../db';
import { ROLE_HCA_ID, SHIFT_HCA_DAY_ID, SHIFT_HCA_EVE_ID } from '../data/defaultData';
import { buildBathingScheduleModel } from '../services/print/specializedDocs';

const addBath = (residentId: string, shiftId = SHIFT_HCA_DAY_ID, selectedDays = [1]) => db.addResidentTask({
  residentId,
  shiftId,
  title: 'Shower',
  category: 'Bathing',
  time: '0930',
  frequency: 'selected_days',
  recurrenceRule: { type: 'SELECTED_WEEKDAYS', selectedDays, weekdays: selectedDays, startDate: '2026-08-31' },
});

describe('AcuiCare-style weekly bathing grid', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    db.updateSettings({ operationalWeekStartsOn: 1, bathingCapacityPerShiftLine: 2, bathingShiftIds: [SHIFT_HCA_DAY_ID, SHIFT_HCA_EVE_ID] });
  });
  afterEach(() => cleanup());

  it('builds the correct configured seven-day week and includes empty bathing shift lines', () => {
    const resident = db.addResident({ firstName: 'Grid', lastName: 'Resident', roomNumber: '101', status: 'active' });
    addBath(resident.id);
    const model = buildBathingScheduleModel('2026-09-02');

    expect(model.days.map(day => day.label)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);
    expect(model.weekRange).toContain('Aug 31');
    expect(model.weekRange).toContain('Sep 6, 2026');
    expect(model.shiftLines.map(line => line.shiftCode)).toEqual(['D1', 'E1']);
    expect(model.shiftLines[1].days[1]).toMatchObject({ rooms: [], scheduled: 0, capacity: 2, available: 2, overCapacity: false });
    expect(model.estimatedPages).toBe(1);
  });

  it('uses natural room sorting and never merges room/bed labels', () => {
    db.updateSettings({ bathingCapacityPerShiftLine: 3 });
    for (const room of ['110', '102A', '102']) {
      const resident = db.addResident({ firstName: 'Room', lastName: room, roomNumber: room, status: 'active' });
      addBath(resident.id);
    }
    const monday = buildBathingScheduleModel('2026-08-31').shiftLines[0].days[1];
    expect(monday.rooms).toEqual(['102', '102A', '110']);
    expect(monday).toMatchObject({ scheduled: 3, capacity: 3, available: 0, overCapacity: false });
  });

  it('renders one Available label for each normal unused slot and clear capacity states', () => {
    const resident = db.addResident({ firstName: 'One', lastName: 'Bath', roomNumber: '120', status: 'active' });
    addBath(resident.id);
    const view = render(<BathingScheduleDocument model={buildBathingScheduleModel('2026-08-31')} />);
    const partial = view.container.querySelector('[data-bathing-cell="D1-Monday"]')!;
    const empty = view.container.querySelector('[data-bathing-cell="E1-Monday"]')!;

    expect(partial.textContent).toContain('Room 120');
    expect(partial.textContent?.match(/Available/g)).toHaveLength(1);
    expect(partial.textContent).toContain('1 of 2');
    expect(empty.textContent?.match(/Available/g)).toHaveLength(2);
    expect(empty.textContent).toContain('0 of 2');
  });

  it('prints all over-capacity assignments without warning color and flags preview before printing', () => {
    db.updateSettings({ bathingCapacityPerShiftLine: 3 });
    for (const room of ['201', '202', '203']) {
      const resident = db.addResident({ firstName: 'Capacity', lastName: room, roomNumber: room, status: 'active' });
      addBath(resident.id);
    }
    const legacyBackup = JSON.parse(db.backupDatabase());
    legacyBackup.settings.bathingCapacityPerShiftLine = 2;
    db.restoreDatabase(JSON.stringify(legacyBackup));
    const model = buildBathingScheduleModel('2026-08-31');
    const view = render(<PrintPreviewPage specializedDoc={{ type: 'bathing', model }} onBack={() => undefined} />);
    const cell = view.container.querySelector('[data-bathing-cell="D1-Monday"]')!;

    expect(cell.textContent).toContain('Room 201');
    expect(cell.textContent).toContain('Room 202');
    expect(cell.textContent).toContain('Room 203');
    expect(cell.textContent).toContain('OVER CAPACITY — 3 of 2');
    expect(cell.className).not.toMatch(/amber|rose|red/);
    expect(view.getAllByText(/Bathing Capacity \/ Needs Review/).length).toBeGreaterThan(0);
    expect(view.getAllByText(/D1 Monday: 3 of 2/).length).toBeGreaterThan(0);
  });

  it('shows distinct configured weekly occurrences and excludes inactive, hospital, and pass residents', () => {
    db.updateSettings({ bathingCapacityPerShiftLine: 4 });
    const active = db.addResident({ firstName: 'Twice', lastName: 'Weekly', roomNumber: '301', status: 'active' });
    const inactive = db.addResident({ firstName: 'Inactive', lastName: 'Hidden', roomNumber: '302', status: 'active' });
    const hospital = db.addResident({ firstName: 'Hospital', lastName: 'Hidden', roomNumber: '303', status: 'active' });
    const pass = db.addResident({ firstName: 'Pass', lastName: 'Hidden', roomNumber: '304', status: 'active' });
    addBath(active.id, SHIFT_HCA_DAY_ID, [1, 4]);
    addBath(inactive.id); addBath(hospital.id); addBath(pass.id);
    db.updateResident(inactive.id, { status: 'inactive' }); db.updateResident(hospital.id, { status: 'in_hospital' }); db.updateResident(pass.id, { status: 'out_on_pass' });
    const model = buildBathingScheduleModel('2026-08-31');

    expect(model.shiftLines[0].days[1].rooms).toEqual(['301']);
    expect(model.shiftLines[0].days[4].rooms).toEqual(['301']);
    expect(JSON.stringify(model.shiftLines)).not.toMatch(/302|303|304/);
  });

  it('repeats the full report and weekday header and uses the shared landscape footer', () => {
    const markup = render(<BathingScheduleDocument model={buildBathingScheduleModel('2026-08-31')} />).container.innerHTML;
    expect(markup).toContain('display: table-header-group');
    expect(markup).toContain('data-weekday="Monday"');
    expect(markup).toContain('size: letter landscape');
    expect(markup).toContain('Weekly Bathing Schedule');
    expect(markup).toContain('Page " counter(page) " of " counter(pages)');
  });

  it('estimates multiple pages for a large configured shift-line set', () => {
    const extraIds = Array.from({ length: 7 }, (_, index) => db.addShift({
      name: `Bathing Line ${index + 2}`,
      shortCode: `D${index + 2}`,
      roleId: ROLE_HCA_ID,
      startTime: '0700',
      endTime: '1500',
      displayOrder: index + 3,
      isActive: true,
    }).id);
    db.updateSettings({ bathingShiftIds: [SHIFT_HCA_DAY_ID, SHIFT_HCA_EVE_ID, ...extraIds] });
    expect(buildBathingScheduleModel('2026-08-31').shiftLines).toHaveLength(9);
    expect(buildBathingScheduleModel('2026-08-31').estimatedPages).toBe(2);
  });
});
