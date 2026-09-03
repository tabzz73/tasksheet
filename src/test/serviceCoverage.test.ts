/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLE_HCA_ID } from '../data/defaultData';
import { ALBERTA_TASK_TEMPLATES } from '../data/albertaCatalog';
import { db } from '../db';
import { createCoverageSnapshot, getCoverageDefinitions, normalizeCoverage } from '../services/coverage';
import { generateShiftSheet } from '../services/generator';
import { PrintService } from '../services/print';
import { buildBathingScheduleModel } from '../services/print/specializedDocs';
import { buildCustomReportModel, SYSTEM_REPORT_PRESETS } from '../services/reports';
import { DomainConflictError } from '../services/validation';

describe('Service Coverage and additional services', () => {
  beforeEach(() => { localStorage.clear(); db.resetToInitialState(); });

  afterEach(() => { vi.useRealTimers(); });

  const setup = (weekly = 2) => {
    const shift = db.addShift({ name: 'HCA Day', shortCode: 'D1', roleId: ROLE_HCA_ID, startTime: '0700', endTime: '1500', isActive: true });
    const resident = db.addResident({ firstName: 'Jane', lastName: 'Coverage', roomNumber: '118', status: 'active', bathingFrequencyPerWeek: weekly });
    const defs = getCoverageDefinitions(db.getState().settings.serviceCoverageDefinitions);
    const coverage = (code: string, details = {}) => createCoverageSnapshot(defs.find(item => item.code === code)!, details);
    return { shift, resident, coverage };
  };

  const addBath = (residentId: string, shiftId: string, selectedDays: number[], serviceCoverage?: ReturnType<typeof normalizeCoverage>) => db.addResidentTask({
    residentId, shiftId, roleId: ROLE_HCA_ID, title: 'Shower Assistance', category: 'Bathing', time: '0900', frequency: 'selected_days', recurrenceRule: { basis: 'selected_weekdays', selectedDays }, serviceCoverage,
  });

  it('defaults legacy and unspecified assignments to Funded / Authorized', () => {
    expect(normalizeCoverage(undefined)).toMatchObject({ type: 'FUNDED', labelSnapshot: 'Funded / Authorized', isAdditionalService: false });
  });

  it('stores private pay as an assignment-level snapshot without financial data', () => {
    const { shift, resident, coverage } = setup();
    const task = addBath(resident.id, shift.id, [6], coverage('PRIVATE_PAY', { isAdditionalService: true, note: 'Family authorization reference on file' }));
    expect(task.serviceCoverage).toMatchObject({ type: 'PRIVATE_PAY', iconSnapshot: '$', isAdditionalService: true });
    expect(JSON.stringify(task.serviceCoverage)).not.toMatch(/price|amount|invoice|payment/i);
  });

  it('allows an explicit private-pay additional shower beyond funded frequency', () => {
    const { shift, resident, coverage } = setup(2);
    addBath(resident.id, shift.id, [1], coverage('FUNDED'));
    addBath(resident.id, shift.id, [4], coverage('FUNDED'));
    expect(() => addBath(resident.id, shift.id, [6], coverage('PRIVATE_PAY', { isAdditionalService: true }))).not.toThrow();
    expect(db.getState().residentTasks.filter(task => task.residentId === resident.id)).toHaveLength(3);
  });

  it('still blocks a third funded shower beyond authorized frequency', () => {
    const { shift, resident, coverage } = setup(2);
    addBath(resident.id, shift.id, [1], coverage('FUNDED'));
    addBath(resident.id, shift.id, [4], coverage('FUNDED'));
    expect(() => addBath(resident.id, shift.id, [6], coverage('FUNDED'))).toThrowError(DomainConflictError);
  });

  it('does not let private pay bypass bathing capacity', () => {
    const { shift, resident, coverage } = setup(3); db.updateSettings({ bathingCapacityPerShiftLine: 2 });
    const r2 = db.addResident({ firstName: 'Two', lastName: 'Resident', roomNumber: '119', status: 'active' });
    const r3 = db.addResident({ firstName: 'Three', lastName: 'Resident', roomNumber: '120', status: 'active' });
    addBath(resident.id, shift.id, [1], coverage('FUNDED'));
    addBath(r2.id, shift.id, [1], coverage('FUNDED'));
    expect(() => addBath(r3.id, shift.id, [1], coverage('PRIVATE_PAY', { isAdditionalService: true }))).toThrowError(DomainConflictError);
  });

  it('does not let exceptional coverage bypass shift-time validation', () => {
    const { shift, resident, coverage } = setup();
    expect(() => db.addResidentTask({ residentId: resident.id, shiftId: shift.id, roleId: ROLE_HCA_ID, title: 'Extra Care', category: 'Care', time: '1715', frequency: 'daily', serviceCoverage: coverage('COMPLIMENTARY', { isAdditionalService: true }) })).toThrowError(DomainConflictError);
  });

  it('does not let Private Pay bypass catalog role requirements', () => {
    const { shift, resident, coverage } = setup();
    const lpnTask = ALBERTA_TASK_TEMPLATES.find(template => template.roleCode === 'LPN')!;
    expect(() => db.addResidentTask({ residentId: resident.id, shiftId: shift.id, roleId: ROLE_HCA_ID, templateSlug: lpnTask.slug, title: lpnTask.title, category: 'Clinical', time: '1000', frequency: 'daily', serviceCoverage: coverage('PRIVATE_PAY', { isAdditionalService: true }) })).toThrow(/configured for LPN/i);
  });

  it('does not allow a covered wound protocol on an HCA shift', () => {
    const { shift, resident } = setup();
    expect(() => db.addWound({ residentId: resident.id, shiftId: shift.id, time: '1000', siteLocation: 'Left heel', status: 'active', firstAction: 'dressing_change', frequency: 'daily', bathingRelation: 'independent', protocol: 'Clean and dress.' })).toThrow(/LPN or RN shift/i);
  });

  it('blocks an invalid coverage date range', () => {
    const { shift, resident, coverage } = setup();
    expect(() => db.addResidentTask({ residentId: resident.id, shiftId: shift.id, roleId: ROLE_HCA_ID, title: 'Temporary Care', category: 'Care', time: '1000', frequency: 'daily', serviceCoverage: coverage('TEMPORARY_EXCEPTION', { startDate: '2026-09-30', endDate: '2026-09-01' }) })).toThrowError(DomainConflictError);
  });

  it('generates recurring services only inside their coverage period', () => {
    const { shift, resident, coverage } = setup();
    db.addResidentTask({ residentId: resident.id, shiftId: shift.id, roleId: ROLE_HCA_ID, title: 'Additional Care', category: 'Care', time: '1000', frequency: 'daily', serviceCoverage: coverage('PRIVATE_PAY', { isAdditionalService: true, startDate: '2026-09-01', endDate: '2026-09-30' }) });
    expect(generateShiftSheet('2026-08-31', shift.id).metrics.totalResidentTasks).toBe(0);
    expect(generateShiftSheet('2026-09-15', shift.id).metrics.totalResidentTasks).toBe(1);
    expect(generateShiftSheet('2026-10-01', shift.id).metrics.totalResidentTasks).toBe(0);
  });

  it('prints exceptional indicators and only the legends present', () => {
    const { shift, resident, coverage } = setup();
    db.addResidentTask({ residentId: resident.id, shiftId: shift.id, roleId: ROLE_HCA_ID, title: 'Additional Care', category: 'Care', time: '1000', frequency: 'daily', serviceCoverage: coverage('PRIVATE_PAY', { isAdditionalService: true }) });
    const model = PrintService.generateDocumentModel(generateShiftSheet('2026-09-15', shift.id), 'simple_checklist');
    expect(model.tableRows.some(row => row.taskTitle === '$ Additional Care')).toBe(true);
    expect(model.coverageLegend).toEqual(['$ Private Pay']);
  });

  it('marks bathing grids and supplies a filterable Private Pay report', () => {
    // Pin the clock on/before the Monday this test builds a grid for, so the
    // resident task's real `new Date().toISOString()` createdAt stamp is never
    // later than '2026-08-31' — otherwise the recurrence engine correctly (and
    // deterministically) treats the bath as not-yet-started on that date.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-31T12:00:00.000Z'));

    const { shift, resident, coverage } = setup();
    addBath(resident.id, shift.id, [1], coverage('PRIVATE_PAY', { isAdditionalService: true }));
    const grid = buildBathingScheduleModel('2026-08-31');
    expect(grid.shiftLines.flatMap(line => Object.values(line.days).flatMap(day => day.rooms))).toContain('118 $');
    expect(grid.coverageLegend).toEqual(['$ Private Pay']);
    const preset = SYSTEM_REPORT_PRESETS.find(item => item.id === 'private-pay-services')!;
    const report = buildCustomReportModel(preset);
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0].values.coverageCode).toBe('PRIVATE_PAY');
  });
});
