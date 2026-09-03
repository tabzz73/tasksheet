import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { ROLE_HCA_ID, ROLE_LPN_ID } from '../data/defaultData';
import { ResidentStatusExceptions } from '../components/print/ResidentStatusExceptions';
import { generateShiftSheet } from '../services/generator';
import { buildHcaDailyPackage, buildLpnClinicalPackage } from '../services/print/packages';
import { findActiveRoleShiftForTime, validateCareShiftSelection, validateTimedCareShift } from '../services/scheduling/careShiftAssignment';

describe('care configuration and resident status safety', () => {
  beforeEach(() => db.resetToDemoState());

  it('requires a correct-role active shift that covers a timed care task', () => {
    const roles = db.getState().roles;
    const hcaDay = db.addShift({
      name: 'HCA Boundary Day', shortCode: 'HBD', roleId: ROLE_HCA_ID,
      startTime: '0700', endTime: '1500', isActive: true,
    });

    expect(validateTimedCareShift({ shifts: [hcaDay], roles, shiftId: hcaDay.id, roleId: ROLE_HCA_ID, time: '0700' })).toBeNull();
    expect(validateTimedCareShift({ shifts: [hcaDay], roles, shiftId: hcaDay.id, roleId: ROLE_HCA_ID, time: '1459' })).toBeNull();
    expect(validateTimedCareShift({ shifts: [hcaDay], roles, shiftId: hcaDay.id, roleId: ROLE_HCA_ID, time: '1500' })).toMatch(/outside/i);
    expect(validateTimedCareShift({ shifts: [hcaDay], roles, shiftId: '', roleId: ROLE_HCA_ID, time: '1715' })).toMatch(/no active HCA shift covers 1715/i);
    expect(validateTimedCareShift({ shifts: [hcaDay], roles, shiftId: hcaDay.id, roleId: ROLE_LPN_ID, time: '0800' })).toMatch(/does not belong to LPN/i);
    expect(validateCareShiftSelection({ shifts: [hcaDay], roles, shiftId: '', roleId: ROLE_HCA_ID })).toMatch(/Select the active HCA shift/i);
  });

  it('resolves overnight boundaries and never crosses role ownership', () => {
    const overnight = db.addShift({
      name: 'HCA Overnight', shortCode: 'HN', roleId: ROLE_HCA_ID,
      startTime: '2300', endTime: '0700', isActive: true,
    });
    const shifts = [overnight];

    expect(findActiveRoleShiftForTime(shifts, ROLE_HCA_ID, '2300')?.id).toBe(overnight.id);
    expect(findActiveRoleShiftForTime(shifts, ROLE_HCA_ID, '0000')?.id).toBe(overnight.id);
    expect(findActiveRoleShiftForTime(shifts, ROLE_HCA_ID, '0659')?.id).toBe(overnight.id);
    expect(findActiveRoleShiftForTime(shifts, ROLE_HCA_ID, '0700')).toBeUndefined();
    expect(findActiveRoleShiftForTime(shifts, ROLE_LPN_ID, '0000')).toBeUndefined();
  });

  it('suppresses hospital, pass, and hold care, reports their status, and resumes preserved care when active', () => {
    db.clearAllOperationalData();
    const shift = db.addShift({
      name: 'Status Safety', shortCode: 'SS', roleId: ROLE_HCA_ID,
      startTime: '0700', endTime: '1500', isActive: true,
    });
    const statuses = ['active', 'in_hospital', 'out_on_pass', 'on_hold', 'inactive', 'discharged', 'deceased'] as const;
    const residents = statuses.map((status, index) => db.addResident({
      firstName: status, lastName: 'Resident', roomNumber: `${201 + index}`, status: 'active',
    }));
    residents.forEach((resident, index) => db.addResidentTask({
      residentId: resident.id, shiftId: shift.id, title: `${statuses[index]} care`,
      category: 'Care', frequency: 'daily', time: '0800',
    }));
    residents.forEach((resident, index) => db.updateResident(resident.id, { status: statuses[index] }));

    const sheet = generateShiftSheet('2026-08-26', shift.id);
    expect(sheet.residentAssignments.flatMap(item => item.tasks.map(task => task.title))).toEqual(['active care']);
    expect(sheet.residentStatusExceptions.map(item => item.status)).toEqual(['in_hospital', 'out_on_pass', 'on_hold']);
    expect(sheet.metrics.residentStatusExceptionCount).toBe(3);

    const heldResident = residents.find(resident => resident.firstName === 'on_hold')!;
    db.updateResident(heldResident.id, { status: 'active' });
    const resumedSheet = generateShiftSheet('2026-08-26', shift.id);
    expect(resumedSheet.residentAssignments.flatMap(item => item.tasks.map(task => task.title))).toContain('on_hold care');
    expect(resumedSheet.residentStatusExceptions.map(item => item.residentId)).not.toContain(heldResident.id);
  });

  it('renders a compact status exception notice without rendering suppressed task content', () => {
    const html = renderToStaticMarkup(<ResidentStatusExceptions items={[{
      residentId: 'resident-1', roomNumber: '104', residentName: 'Jamie Lee',
      status: 'in_hospital', statusLabel: 'In Hospital',
    }]} />);

    expect(html).toContain('Resident Status');
    expect(html).toContain('Room 104');
    expect(html).toContain('In Hospital');
    expect(html).toContain('tasks not included');
    expect(html).not.toContain('Medication Assistance');
  });

  it('blocks role packages when the matching role has no active shift instead of substituting another role', () => {
    const state = db.getState();
    const clinicalRoleIds = new Set(state.roles
      .filter(role => role.defaultPrintProfile === 'clinical_worksheet')
      .map(role => role.id));
    state.shifts.filter(shift => clinicalRoleIds.has(shift.roleId)).forEach(shift => db.updateShift(shift.id, { isActive: false }));
    const lpnPackage = buildLpnClinicalPackage('2026-08-26', { includeWoundSchedule: false });
    expect(lpnPackage.configurationWarnings.join(' ')).toMatch(/No active LPN\/RN shift/i);
    expect(lpnPackage.items.filter(item => item.docType === 'shift_document')).toHaveLength(0);

    db.getState().shifts.filter(shift => shift.roleId === ROLE_HCA_ID).forEach(shift => db.updateShift(shift.id, { isActive: false }));
    const hcaPackage = buildHcaDailyPackage('2026-08-26', { includeBathingGrid: false });
    expect(hcaPackage.configurationWarnings.join(' ')).toMatch(/No active HCA shift/i);
    expect(hcaPackage.items.filter(item => item.docType === 'shift_document')).toHaveLength(0);
  });

  it('surfaces non-blocking content warnings for bundled sections that will print blank, without withholding the package', () => {
    db.clearAllOperationalData();
    const clinicalRoleIds = new Set(db.getState().roles
      .filter(role => role.defaultPrintProfile === 'clinical_worksheet')
      .map(role => role.id));
    db.getState().shifts.filter(s => s.roleId === ROLE_HCA_ID || clinicalRoleIds.has(s.roleId)).forEach(s => db.updateShift(s.id, { isActive: false }));
    const shift = db.addShift({
      name: 'Empty Sheet Day', shortCode: 'ESD', roleId: ROLE_HCA_ID,
      startTime: '0700', endTime: '1500', isActive: true,
    });

    const hcaPackage = buildHcaDailyPackage('2026-08-26', { includeBathingGrid: false });
    expect(hcaPackage.configurationWarnings).toHaveLength(0);
    expect(hcaPackage.items.filter(item => item.docType === 'shift_document')).toHaveLength(1);
    expect(hcaPackage.contentWarnings.join(' ')).toMatch(new RegExp(`${shift.shortCode}.*no scheduled tasks`, 'i'));
    // Every shift item carries its raw GeneratedShiftSheet for Print History tracking.
    expect(hcaPackage.items[0].shiftSheet?.shift.id).toBe(shift.id);

    const lpnShift = db.addShift({
      name: 'Empty Wounds Day', shortCode: 'EWD', roleId: ROLE_LPN_ID,
      startTime: '0700', endTime: '1900', isActive: true,
    });
    const lpnPackage = buildLpnClinicalPackage('2026-08-26', { includeWoundSchedule: true });
    expect(lpnPackage.contentWarnings.join(' ')).toMatch(/Wound & Dressing Treatment Schedule has no active wound/i);
    expect(lpnPackage.contentWarnings.join(' ')).toMatch(new RegExp(`${lpnShift.shortCode}.*no scheduled tasks`, 'i'));
  });
});
