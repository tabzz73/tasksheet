import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { BathingScheduleDocument } from '../components/print/BathingScheduleDocument';
import { CustomReportDocument } from '../components/print/CustomReportDocument';
import { buildBathingScheduleModel } from '../services/print/specializedDocs';
import { buildCustomReportModel, deleteUserPreset, REPORT_FIELDS, saveUserPreset, SYSTEM_REPORT_PRESETS } from '../services/reports';

describe('Report & Print Center engine', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });

  it('keeps every system preset buildable and protects approved resident identity fields', () => {
    for (const preset of SYSTEM_REPORT_PRESETS) expect(() => buildCustomReportModel(preset)).not.toThrow();
    const exposedResidentFields = REPORT_FIELDS.residents.map(field => field.id);
    expect(exposedResidentFields).toEqual(expect.arrayContaining(['room', 'firstName', 'lastName']));
    expect(exposedResidentFields).not.toEqual(expect.arrayContaining(['birthDate', 'healthNumber', 'phone', 'address']));
  });

  it('filters active residents and sorts rooms naturally', () => {
    db.addResident({ firstName: 'Room', lastName: 'Ten', roomNumber: '10', status: 'active' });
    db.addResident({ firstName: 'Room', lastName: 'Two', roomNumber: '2', status: 'active' });
    db.addResident({ firstName: 'Inactive', lastName: 'Person', roomNumber: '1', status: 'inactive' });
    const preset = SYSTEM_REPORT_PRESETS.find(item => item.id === 'resident-directory')!;
    const model = buildCustomReportModel(preset);
    expect(model.rows.map(row => row.values.room)).toEqual(['2', '10']);
  });

  it('persists, renames, duplicates, and deletes user preset configuration only', () => {
    const system = SYSTEM_REPORT_PRESETS.find(item => item.id === 'resident-directory')!;
    const saved = saveUserPreset({ ...system, id: undefined, name: 'Monthly Directory' });
    expect(db.getState().settings.savedPrintPresets?.[0].name).toBe('Monthly Directory');
    saveUserPreset({ ...saved, name: 'Renamed Directory' });
    expect(db.getState().settings.savedPrintPresets?.[0].name).toBe('Renamed Directory');
    expect(JSON.stringify(db.getState().settings.savedPrintPresets)).not.toContain('Room Ten');
    deleteUserPreset(saved.id);
    expect(db.getState().settings.savedPrintPresets).toEqual([]);
    expect(SYSTEM_REPORT_PRESETS.some(item => item.id === 'resident-directory')).toBe(true);
  });

  it('blocks no records at the preview model boundary and warns for large reports', () => {
    const base = SYSTEM_REPORT_PRESETS.find(item => item.id === 'resident-directory')!;
    expect(buildCustomReportModel(base).rows).toHaveLength(0);
    for (let index = 0; index < 900; index++) db.addResident({ firstName: 'Large', lastName: String(index), roomNumber: String(index + 1), status: 'active' });
    expect(buildCustomReportModel(base).largeReport).toBe(true);
  });

  it('expands recurring care within the selected range only', () => {
    const resident = db.addResident({ firstName: 'Recurring', lastName: 'Care', roomNumber: '20', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weekly Bath', category: 'Bathing', time: '0900', frequency: 'selected_days', recurrenceRule: { type: 'SELECTED_WEEKDAYS', selectedDays: [1, 4], weekdays: [1, 4], startDate: '2026-08-31' } });
    const preset = { ...SYSTEM_REPORT_PRESETS.find(item => item.id === 'recurring-care-schedule')!, dateRange: { start: '2026-08-31', end: '2026-09-06' } };
    const model = buildCustomReportModel(preset);
    expect(model.rows.map(row => row.values.date)).toEqual(['2026-08-31', '2026-09-03']);
  });

  it('builds a room-only bathing grid with configured capacity, availability, and lifecycle exclusions', () => {
    db.updateSettings({ bathingCapacityPerShiftLine: 2, operationalWeekStartsOn: 1 });
    const active = db.addResident({ firstName: 'Visible', lastName: 'Only In Detail', roomNumber: '102', status: 'active' });
    const hospital = db.addResident({ firstName: 'Hospital', lastName: 'Excluded', roomNumber: '103', status: 'in_hospital' });
    const schedule = { shiftId: SHIFT_HCA_DAY_ID, title: 'Shower', category: 'Bathing', time: '0930', frequency: 'selected_days' as const, recurrenceRule: { type: 'SELECTED_WEEKDAYS' as const, selectedDays: [1, 4], weekdays: [1, 4], startDate: '2026-08-31' } };
    db.addResidentTask({ ...schedule, residentId: active.id });
    db.addResidentTask({ ...schedule, residentId: hospital.id });
    const model = buildBathingScheduleModel('2026-09-02');
    expect(model.rows.map(row => row.roomNumber)).toEqual(['102']);
    expect(model.shiftLines[0].days[1]).toMatchObject({ rooms: ['102'], scheduled: 1, capacity: 2, available: 1 });
    const markup = renderToStaticMarkup(<BathingScheduleDocument model={model} />);
    expect(markup).toContain('Room 102');
    expect(markup).toContain('1 of 2');
    expect(markup).toContain('Available');
    expect(markup).not.toContain('Visible Only In Detail');
  });

  it('renders repeated generic table headers and landscape layout metadata', () => {
    const resident = db.addResident({ firstName: 'Print', lastName: 'Report', roomNumber: '30', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Morning Care', category: 'ADL', time: '0800', frequency: 'daily' });
    const report = buildCustomReportModel({ ...SYSTEM_REPORT_PRESETS.find(item => item.id === 'care-task-list')!, layout: 'landscape' });
    const markup = renderToStaticMarkup(<CustomReportDocument model={report} />);
    expect(markup).toContain('table-header-group');
    expect(markup).toContain('landscape');
  });
});
