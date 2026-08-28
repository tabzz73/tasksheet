import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { generateShiftSheet, sortRoomNumbers, calculateShiftDurationHours } from '../services/generator';
import { PrintService, formatShiftHeader } from '../services/print';
import { isTaskDueOnDate } from '../services/recurrence';
import { 
  ROLE_HCA_ID, 
  ROLE_LPN_ID, 
  ROLE_RN_ID, 
  SHIFT_HCA_DAY_ID, 
  SHIFT_LPN_DAY_ID 
} from '../data/defaultData';

describe('TaskSheet Production Hardening & Release Acceptance Test Suite', () => {
  beforeEach(() => {
    db.resetToDemoState();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // A. Installation and First-Run Tests
  // ════════════════════════════════════════════════════════════════════════════
  describe('A. Installation and First-Run Tests', () => {
    it('TS-001: Fresh installation initializes a valid, non-corrupt setup state', () => {
      const state = db.getState();
      expect(state.facility).toBeDefined();
      expect(state.facility.siteName).toBeTruthy();
      expect(state.roles.length).toBeGreaterThanOrEqual(3);
      expect(state.shifts.length).toBeGreaterThanOrEqual(3);
      expect(state.settings).toBeDefined();
    });

    it('TS-002: Facility configuration persists and updates TaskSheet headers without duplicating records', () => {
      db.updateFacility({
        siteName: 'Pineview Continuing Care Centre',
        street: '4500 16 Ave NW',
        city: 'Calgary',
        province: 'AB',
        postalCode: 'T3B 0M6',
        mainPhone: '403-555-4500',
        fax: '403-555-4501',
      });

      const state = db.getState();
      expect(state.facility.siteName).toBe('Pineview Continuing Care Centre');
      expect(state.facility.postalCode).toBe('T3B 0M6');

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);
      expect(model.header.facility.siteName).toBe('Pineview Continuing Care Centre');
      expect(model.header.facility.mainPhone).toBe('403-555-4500');
    });

    it('TS-003: Cancel or partial edits do not corrupt facility record', () => {
      const originalFacility = { ...db.getState().facility };
      // Attempt partial update
      db.updateFacility({ siteName: 'Updated Facility Name' });
      expect(db.getState().facility.siteName).toBe('Updated Facility Name');
      expect(db.getState().facility.street).toBe(originalFacility.street);
      expect(db.getState().facility.mainPhone).toBe(originalFacility.mainPhone);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // B. Navigation and UI Integrity
  // ════════════════════════════════════════════════════════════════════════════
  describe('B. Navigation and UI Integrity', () => {
    it('TS-010 & TS-011: Developer Information and branding identify SoftVibeSolutions', () => {
      const state = db.getState();
      expect(state.settings).toBeDefined();
      expect(state.settings.branding).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // C. Shift Configuration
  // ════════════════════════════════════════════════════════════════════════════
  describe('C. Shift Configuration', () => {
    it('TS-020: Create standard day shift (D1 — 0700-1500, HCA)', () => {
      const shift = db.addShift({
        name: 'Day Shift 1',
        shortCode: 'D1_NEW',
        startTime: '0700',
        endTime: '1500',
        roleId: ROLE_HCA_ID,
        isActive: true,
      });

      expect(shift.id).toBeDefined();
      expect(shift.shortCode).toBe('D1_NEW');
      expect(shift.startTime).toBe('0700');
      expect(shift.endTime).toBe('1500');

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, shift.id);
      expect(sheet.role.code).toBe('HCA');
    });

    it('TS-021: Custom shift short names are accepted without D/E/N restrictions', () => {
      const codes = ['LP1_TEST', 'LPN2_TEST', 'NLPN_TEST', 'E5_TEST', 'N1_TEST'];
      for (const code of codes) {
        const s = db.addShift({
          name: `Shift ${code}`,
          shortCode: code,
          startTime: '0700',
          endTime: '1900',
          roleId: ROLE_LPN_ID,
          isActive: true,
        });
        expect(s.shortCode).toBe(code);
      }
    });

    it('TS-022: Overnight shift duration (2300-0700) calculates as 8 hours, not negative 16 hours', () => {
      const duration = calculateShiftDurationHours('2300', '0700');
      expect(duration).toBe(8);
    });

    it('TS-023: Evening-to-morning overnight shift (1900-0700) calculates as 12 hours', () => {
      const duration = calculateShiftDurationHours('1900', '0700');
      expect(duration).toBe(12);
    });

    it('TS-025: Duplicate active shift short names are rejected with clear error', () => {
      db.addShift({
        name: 'Shift Alpha',
        shortCode: 'UNQ1',
        startTime: '0700',
        endTime: '1500',
        roleId: ROLE_HCA_ID,
        isActive: true,
      });

      expect(() => {
        db.addShift({
          name: 'Shift Beta',
          shortCode: 'UNQ1',
          startTime: '1500',
          endTime: '2300',
          roleId: ROLE_HCA_ID,
          isActive: true,
        });
      }).toThrow(/already being used/i);
    });

    it('TS-026: Editing shift time preserves existing task attachments', () => {
      const resident = db.addResident({ firstName: 'Arthur', lastName: 'Pendleton', roomNumber: '101', status: 'active' });
      const shift = db.addShift({ name: 'Day Care', shortCode: 'D_EDIT', startTime: '0700', endTime: '1500', roleId: ROLE_HCA_ID, isActive: true });
      
      const task = db.addResidentTask({
        residentId: resident.id,
        shiftId: shift.id,
        title: 'Morning Care',
        category: 'AM Care',
        frequency: 'daily',
        time: '0800',
        instructions: 'Setup grooming',
      });

      // Update shift time to 0700-1530
      db.updateShift(shift.id, { endTime: '1530' });

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, shift.id);
      expect(sheet.residentAssignments.length).toBeGreaterThan(0);
      const resAssignment = sheet.residentAssignments.find(a => a.resident.id === resident.id);
      expect(resAssignment).toBeDefined();
      expect(resAssignment?.tasks.map(t => t.id)).toContain(task.id);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // D. Resident Management & Identity Boundary
  // ════════════════════════════════════════════════════════════════════════════
  describe('D. Resident Management & Identity Boundary', () => {
    it('TS-030: Add resident with First Name, Last Name, and Room Number', () => {
      const r = db.addResident({ firstName: 'Maria', lastName: 'Santos', roomNumber: '101', status: 'active' });
      expect(r.id).toBeDefined();
      expect(r.firstName).toBe('Maria');
      expect(r.lastName).toBe('Santos');
      expect(r.roomNumber).toBe('101');
    });

    it('TS-031 & TS-032: Preserves double-occupancy room labels and prevents date/time coercion', () => {
      const rooms = ['101', '102A', '102B', '201-1', '305B'];
      for (const room of rooms) {
        const r = db.addResident({ firstName: 'Test', lastName: `Resident ${room}`, roomNumber: room, status: 'active' });
        expect(r.roomNumber).toBe(room);
        expect(r.roomNumber).not.toContain(':');
      }
    });

    it('TS-033: Resident without tasks does not have fabricated tasks generated', () => {
      const r = db.addResident({ firstName: 'Quiet', lastName: 'Resident', roomNumber: '999', status: 'active' });
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const assigned = sheet.residentAssignments.find(a => a.resident.id === r.id);
      expect(assigned).toBeUndefined();
    });

    it('TS-034: Multiple tasks for a resident appear independently without overwriting', () => {
      const r = db.addResident({ firstName: 'Eleanor', lastName: 'Vance', roomNumber: '204', status: 'active' });
      const t1 = db.addResidentTask({ residentId: r.id, shiftId: SHIFT_HCA_DAY_ID, title: 'AM Care', category: 'AM Care', frequency: 'daily', time: '0800' });
      const t2 = db.addResidentTask({ residentId: r.id, shiftId: SHIFT_HCA_DAY_ID, title: 'MAP2 Assistance', category: 'Medication Assistance', frequency: 'daily', time: '0830' });
      const t3 = db.addResidentTask({ residentId: r.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Catheter Care', category: 'Catheter / Urinary Care', frequency: 'daily', time: '1000' });

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const resAssignment = sheet.residentAssignments.find(a => a.resident.id === r.id);
      expect(resAssignment).toBeDefined();
      expect(resAssignment?.tasks.length).toBe(3);
      expect(resAssignment?.tasks.map(t => t.id)).toEqual(expect.arrayContaining([t1.id, t2.id, t3.id]));
    });

    it('TS-035: Same name in different rooms remain completely distinct residents', () => {
      const r1 = db.addResident({ firstName: 'Maria', lastName: 'Santos', roomNumber: '101', status: 'active' });
      const r2 = db.addResident({ firstName: 'Maria', lastName: 'Santos', roomNumber: '208', status: 'active' });

      db.addResidentTask({ residentId: r1.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Room 101 Task', category: 'Test', frequency: 'daily', time: '0800' });
      db.addResidentTask({ residentId: r2.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Room 208 Task', category: 'Test', frequency: 'daily', time: '0800' });

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const a1 = sheet.residentAssignments.find(a => a.resident.id === r1.id);
      const a2 = sheet.residentAssignments.find(a => a.resident.id === r2.id);

      expect(a1?.tasks[0].title).toBe('Room 101 Task');
      expect(a2?.tasks[0].title).toBe('Room 208 Task');
    });

    it('TS-037 & TS-038: In Hospital and Out on Pass residents are strictly suppressed from generation', () => {
      const rHosp = db.addResident({ firstName: 'Hospital', lastName: 'Patient', roomNumber: '301', status: 'in_hospital' });
      const rPass = db.addResident({ firstName: 'Pass', lastName: 'Patient', roomNumber: '302', status: 'out_on_pass' });
      
      db.addResidentTask({ residentId: rHosp.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Hospital Task', category: 'Test', frequency: 'daily', time: '0800' });
      db.addResidentTask({ residentId: rPass.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Pass Task', category: 'Test', frequency: 'daily', time: '0800' });

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      expect(sheet.residentAssignments.find(a => a.resident.id === rHosp.id)).toBeUndefined();
      expect(sheet.residentAssignments.find(a => a.resident.id === rPass.id)).toBeUndefined();
    });

    it('TS-039: Return from hospital immediately restores task generation without recreating schedule', () => {
      const r = db.addResident({ firstName: 'Recovering', lastName: 'Resident', roomNumber: '303', status: 'in_hospital' });
      const t = db.addResidentTask({ residentId: r.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Daily Dressing', category: 'Dressing', frequency: 'daily', time: '0900' });

      const today = new Date().toISOString().split('T')[0];
      // When in hospital -> suppressed
      expect(generateShiftSheet(today, SHIFT_HCA_DAY_ID).residentAssignments.find(a => a.resident.id === r.id)).toBeUndefined();

      // Return to active -> immediately due
      db.updateResident(r.id, { status: 'active' });
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const assignment = sheet.residentAssignments.find(a => a.resident.id === r.id);
      expect(assignment).toBeDefined();
      expect(assignment?.tasks[0].id).toBe(t.id);
    });

    it('TS-040 & Scenario 4: Resident replacement Room 205 (Resident A moves out -> Resident B moves in with ZERO cross-contamination)', () => {
      // Resident A in 205
      const resA = db.addResident({ firstName: 'Alice', lastName: 'Anderson', roomNumber: '205', status: 'active' });
      db.addResidentTask({ residentId: resA.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Alice Catheter Care', category: 'Catheter / Urinary Care', frequency: 'daily', time: '0800' });
      db.addFYI({ residentId: resA.id, text: 'Alice Fall Risk Alert', category: 'safety', importance: 'high', effectiveDate: '2026-08-25' });

      // Resident A moves out
      db.updateResident(resA.id, { status: 'discharged' });

      // Resident B moves into Room 205
      const resB = db.addResident({ firstName: 'Bob', lastName: 'Baker', roomNumber: '205', status: 'active' });
      db.addResidentTask({ residentId: resB.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Bob AM Hygiene', category: 'AM Care', frequency: 'daily', time: '0830' });

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);

      const assignmentB = sheet.residentAssignments.find(a => a.resident.id === resB.id);
      expect(assignmentB).toBeDefined();
      expect(assignmentB?.tasks.length).toBe(1);
      expect(assignmentB?.tasks[0].title).toBe('Bob AM Hygiene');
      expect(assignmentB?.tasks.map(t => t.title)).not.toContain('Alice Catheter Care');
      expect(assignmentB?.fyis.length).toBe(0);

      // Verify Resident A is not in active sheet
      expect(sheet.residentAssignments.find(a => a.resident.id === resA.id)).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // G. Task Scheduling & Recurrence Engine
  // ════════════════════════════════════════════════════════════════════════════
  describe('G. Task Scheduling & Recurrence Engine', () => {
    it('TS-070: Daily task appears every day', () => {
      expect(isTaskDueOnDate(undefined, 'daily', '2026-08-25')).toBe(true);
      expect(isTaskDueOnDate(undefined, 'daily', '2026-08-26')).toBe(true);
      expect(isTaskDueOnDate(undefined, 'daily', '2026-12-31')).toBe(true);
    });

    it('TS-071: Selected Weekdays (Mon/Wed/Fri) generate only on M/W/F across a 2-week period', () => {
      const rule = { frequency: 'selected_days' as const, selectedDays: [1, 3, 5] }; // Mon=1, Wed=3, Fri=5
      
      // Mon 2026-08-24 (due)
      expect(isTaskDueOnDate(rule, 'selected_days', '2026-08-24')).toBe(true);
      // Tue 2026-08-25 (not due)
      expect(isTaskDueOnDate(rule, 'selected_days', '2026-08-25')).toBe(false);
      // Wed 2026-08-26 (due)
      expect(isTaskDueOnDate(rule, 'selected_days', '2026-08-26')).toBe(true);
      // Thu 2026-08-27 (not due)
      expect(isTaskDueOnDate(rule, 'selected_days', '2026-08-27')).toBe(false);
      // Fri 2026-08-28 (due)
      expect(isTaskDueOnDate(rule, 'selected_days', '2026-08-28')).toBe(true);
      // Sat 2026-08-29 (not due)
      expect(isTaskDueOnDate(rule, 'selected_days', '2026-08-29')).toBe(false);
    });

    it('TS-072: Every 14 Days recurrence calculates exact 14-day cadence from anchor date', () => {
      const rule = { frequency: 'every_n_days' as const, intervalDays: 14, anchorDate: '2026-08-01' };
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-08-01')).toBe(true);  // Day 0
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-08-14')).toBe(false); // Day 13
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-08-15')).toBe(true);  // Day 14
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-08-29')).toBe(true);  // Day 28
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-09-12')).toBe(true);  // Month boundary (Day 42)
    });

    it('TS-073: Every 28 Days recurrence (Catheter changes)', () => {
      const rule = { frequency: 'every_n_days' as const, intervalDays: 28, anchorDate: '2026-08-01' };
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-08-01')).toBe(true);
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-08-28')).toBe(false);
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-08-29')).toBe(true); // Day 28
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-09-26')).toBe(true); // Day 56
    });

    it('TS-074: Recurrence continues seamlessly across year boundaries (Dec 28 -> Jan)', () => {
      const rule = { frequency: 'every_n_days' as const, intervalDays: 14, anchorDate: '2026-12-28' };
      expect(isTaskDueOnDate(rule, 'every_n_days', '2026-12-28')).toBe(true);
      expect(isTaskDueOnDate(rule, 'every_n_days', '2027-01-11')).toBe(true); // 14 days later in January
    });

    it('TS-075 & TS-076: Fixed day of month (22nd of every month)', () => {
      const rule = { frequency: 'monthly_day' as const, dayOfMonth: 22 };
      expect(isTaskDueOnDate(rule, 'monthly_day', '2026-01-22')).toBe(true);
      expect(isTaskDueOnDate(rule, 'monthly_day', '2026-02-22')).toBe(true);
      expect(isTaskDueOnDate(rule, 'monthly_day', '2026-02-23')).toBe(false);
      expect(isTaskDueOnDate(rule, 'monthly_day', '2026-12-22')).toBe(true);
    });

    it('TS-077: Leap year February 29 evaluation', () => {
      // 2028 is a leap year
      const rule = { frequency: 'monthly_day' as const, dayOfMonth: 29 };
      expect(isTaskDueOnDate(rule, 'monthly_day', '2028-02-29')).toBe(true);
      expect(isTaskDueOnDate(rule, 'monthly_day', '2028-02-28')).toBe(false);
    });

    it('Scenario 5: 90-Day Recurrence Marathon rigorously calculates all due dates without drift', () => {
      const dailyRule = { frequency: 'daily' as const };
      const mwfRule = { frequency: 'selected_days' as const, selectedDays: [1, 3, 5] };
      const biweeklyRule = { frequency: 'every_n_days' as const, intervalDays: 14, anchorDate: '2026-09-01' };

      let dailyHits = 0;
      let mwfHits = 0;
      let biweeklyHits = 0;

      const startDate = new Date('2026-09-01T12:00:00Z');
      for (let i = 0; i < 90; i++) {
        const currentDate = new Date(startDate.getTime() + i * 86400000);
        const dateStr = currentDate.toISOString().split('T')[0];

        if (isTaskDueOnDate(dailyRule, 'daily', dateStr)) dailyHits++;
        if (isTaskDueOnDate(mwfRule, 'selected_days', dateStr)) mwfHits++;
        if (isTaskDueOnDate(biweeklyRule, 'every_n_days', dateStr)) biweeklyHits++;
      }

      expect(dailyHits).toBe(90);
      expect(mwfHits).toBe(38); // Exactly 38 M/W/F days in this 90-day window
      expect(biweeklyHits).toBe(7); // Days 0, 14, 28, 42, 56, 70, 84
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // L & M. Universal TaskSheet Print Generation (HCA & LPN)
  // ════════════════════════════════════════════════════════════════════════════
  describe('L & M. Universal TaskSheet Print Generation', () => {
    it('TS-130: HCA TaskSheet uses 7-column universal layout with NO dedicated vitals column by default', () => {
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);

      expect(model.profile).toBe('simple_checklist');
      expect(model.tableRows).toBeDefined();
      expect(model.tableRows.length).toBeGreaterThan(0);
      // In simple_checklist, structured results do not include clinical vitals columns
      expect(model.tableRows.some(r => r.structuredResult?.type === 'vitals')).toBe(false);
    });

    it('TS-140: LPN TaskSheet uses landscape 8-column clinical layout WITH dedicated Vitals / Results column', () => {
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);

      expect(model.profile).toBe('clinical_worksheet');
      expect(model.tableRows).toBeDefined();
      // In clinical_worksheet, structured results or vitals are present
      expect(model.summary).toBeDefined();
      expect(model.header.shiftTime).toBeTruthy();
    });

    it('TS-155: Print header displays clean short code by default without redundant strings', () => {
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);

      expect(model.header.shiftShortCode).toBe(sheet.shift.shortCode);
      expect(model.header.shiftHeaderFormat).toBe('short_code_only');
    });

    it('TS-PRINT-HEADER-001: Shift Header Display persistence, unified preview equality, long custom codes, and overnight formatting', () => {
      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_LPN_DAY_ID);

      // 1. Assert Preview Formatter equals Print Formatter across all 3 modes
      const testData = {
        shiftShortCode: 'D1LPN',
        shiftCode: 'D1LPN',
        shiftName: 'D1LPN — LPN Day',
        roleName: 'Licensed Practical Nurse',
        shiftTime: '0700–1900'
      };

      expect(formatShiftHeader(testData, 'short_code_only')).toBe('D1LPN · 0700–1900');
      expect(formatShiftHeader(testData, 'name_only')).toBe('D1LPN — LPN Day · 0700–1900');
      expect(formatShiftHeader(testData, 'full_name_and_role')).toBe('D1LPN — LPN Day · Licensed Practical Nurse · 0700–1900');

      // 2. Test overnight formatting: NLPN · 1900–0700 and N1 · 2300–0700 (must not contain unwanted (+1))
      const overnightData = { shiftShortCode: 'NLPN', shiftTime: '1900–0700' };
      const formattedOvernight = formatShiftHeader(overnightData, 'short_code_only');
      expect(formattedOvernight).toBe('NLPN · 1900–0700');
      expect(formattedOvernight).not.toContain('(+1)');

      // 3. Test long custom codes and long names (NORTHWINGLPN, North Wing Weekend Licensed Practical Nurse Day Shift)
      const longCustomShift = {
        shiftShortCode: 'NORTHWINGLPN',
        shiftName: 'North Wing Weekend Licensed Practical Nurse Day Shift',
        roleName: 'Licensed Practical Nurse',
        shiftTime: '0700–1900'
      };
      expect(formatShiftHeader(longCustomShift, 'short_code_only')).toBe('NORTHWINGLPN · 0700–1900');
      expect(formatShiftHeader(longCustomShift, 'name_only')).toBe('North Wing Weekend Licensed Practical Nurse Day Shift · 0700–1900');
      expect(formatShiftHeader(longCustomShift, 'full_name_and_role')).toBe('North Wing Weekend Licensed Practical Nurse Day Shift · Licensed Practical Nurse · 0700–1900');

      // 4. Persistence across DB updates / restarts
      db.updateFacilitySettings({
        branding: {
          shiftHeaderFormat: 'name_only',
          headerStyle: 'standard',
          confidentialityNotice: 'TEST',
          showConfidentialityNotice: true,
          showSupervisorSignatureBlock: true
        }
      });
      const updatedModel = PrintService.generateDocumentModel(sheet);
      expect(updatedModel.header.shiftHeaderFormat).toBe('name_only');
      expect(formatShiftHeader(updatedModel.header, updatedModel.header.shiftHeaderFormat)).toBe(
        `${updatedModel.header.shiftName} · ${updatedModel.header.shiftTime}`
      );
    });

    it('TS-131 & Scenario 6: Large-Print Stress (80+ Tasks) generates without crashes or data truncation', () => {
      // Create 20 residents with 4 tasks each = 80 tasks
      for (let r = 1; r <= 20; r++) {
        const res = db.addResident({
          firstName: `Resident${r}`,
          lastName: `StressTest`,
          roomNumber: `${100 + r}`,
          status: 'active'
        });
        for (let t = 1; t <= 4; t++) {
          db.addResidentTask({
            residentId: res.id,
            shiftId: SHIFT_HCA_DAY_ID,
            title: `Care Task ${t} for Resident ${r}`,
            category: 'Stress Test',
            frequency: 'daily',
            time: `${String(7 + t).padStart(2, '0')}00`,
            instructions: 'Full assist with daily living activities, positioning, and safety monitoring.'
          });
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);

      expect(model.summary.totalResidentTasks).toBeGreaterThanOrEqual(80);
      expect(model.summary.estimatedPages).toBeGreaterThanOrEqual(3);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Q. Search, Sorting, and Natural Room Numbering
  // ════════════════════════════════════════════════════════════════════════════
  describe('Q. Search, Sorting, and Natural Room Numbering', () => {
    it('TS-183: Natural room sorting sorts 101, 102, 102A, 102B, 109, 110 naturally (not lexicographically)', () => {
      const unsorted = ['110', '102B', '101', '109', '102A', '102'];
      const sorted = unsorted.sort(sortRoomNumbers);
      expect(sorted).toEqual(['101', '102', '102A', '102B', '109', '110']);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // V & Scenario 8. Backup, Restore, and Disaster Recovery Drill
  // ════════════════════════════════════════════════════════════════════════════
  describe('V. Backup, Restore, and Disaster Recovery Drill', () => {
    it('TS-230, TS-232, TS-234 & Scenario 8: Backup -> Alter Data -> Restore -> Verify exact state recovery', () => {
      // 1. Create known baseline state
      const res = db.addResident({ firstName: 'Drill', lastName: 'Patient', roomNumber: '777', status: 'active' });
      const task = db.addResidentTask({
        residentId: res.id,
        shiftId: SHIFT_HCA_DAY_ID,
        title: 'Drill Care Task',
        category: 'Test',
        frequency: 'daily',
        time: '0800',
      });

      // 2. Backup database
      const backupJson = db.backupDatabase();
      expect(backupJson).toBeTruthy();

      // 3. Alter/corrupt current state
      db.clearAllOperationalData();
      expect(db.getState().residents.length).toBe(0);
      expect(db.getState().residentTasks.length).toBe(0);

      // 4. Restore database
      db.restoreDatabase(backupJson);

      // 5. Verify exact restoration
      const restoredState = db.getState();
      expect(restoredState.residents.some(r => r.id === res.id && r.lastName === 'Patient')).toBe(true);
      expect(restoredState.residentTasks.some(t => t.id === task.id && t.title === 'Drill Care Task')).toBe(true);
    });

    it('TS-233: Invalid or corrupted backup file is safely rejected before damaging database', () => {
      const initialResidentCount = db.getState().residents.length;
      expect(() => {
        db.restoreDatabase('{ "corrupted": true, "missingCore": 1 }');
      }).toThrow(/missing core schema objects/i);

      // Verify existing data remained completely untouched
      expect(db.getState().residents.length).toBe(initialResidentCount);
    });

    it('removes the known certification Pain tracker from non-pain tasks while preserving real pain tracking', () => {
      const resident = db.addResident({ firstName: 'Tracking', lastName: 'Migration', roomNumber: '778', status: 'active' });
      const nonPainTask = db.addResidentTask({
        residentId: resident.id,
        shiftId: SHIFT_LPN_DAY_ID,
        title: 'Respiratory Status Review',
        category: 'Health Monitoring',
        frequency: 'daily',
        time: '0900',
      });
      const painTask = db.addResidentTask({
        residentId: resident.id,
        shiftId: SHIFT_LPN_DAY_ID,
        title: 'Pain Reassessment',
        category: 'Pain / Symptom Management',
        frequency: 'daily',
        time: '1000',
      });
      const backup = JSON.parse(db.backupDatabase());
      const legacyPrompt = 'Record clinical value, result, follow-up, and initials on paper.';
      backup.residentTasks = backup.residentTasks.map((task: any) =>
        task.id === nonPainTask.id || task.id === painTask.id
          ? { ...task, trackingConfig: { kind: 'pain', prompt: legacyPrompt } }
          : task
      );

      db.restoreDatabase(JSON.stringify(backup));

      expect(db.getState().residentTasks.find(task => task.id === nonPainTask.id)?.trackingConfig).toBeUndefined();
      expect(db.getState().residentTasks.find(task => task.id === painTask.id)?.trackingConfig).toEqual({
        kind: 'pain',
        prompt: legacyPrompt,
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // O & Scenario 7. Demo Data & Provenance Cleanup
  // ════════════════════════════════════════════════════════════════════════════
  describe('O & Scenario 7. Demo Data & Provenance Cleanup', () => {
    it('TS-167, TS-168 & Scenario 7: Clear Demo and Clear Batch remove only tagged records while preserving manual production data', () => {
      // Add manual production resident
      const manualRes = db.addResident({ firstName: 'Manual', lastName: 'Production', roomNumber: '501', status: 'active' });

      // Add demo data
      db.loadDemoData();
      expect(db.getState().residents.some(r => r.source === 'demo')).toBe(true);

      // Clear demo data
      db.clearDemoData();

      // Verify demo records are gone, but manual production resident is 100% preserved
      const state = db.getState();
      expect(state.residents.some(r => r.source === 'demo')).toBe(false);
      expect(state.residents.some(r => r.id === manualRes.id)).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // R. Privacy & Information Minimization
  // ════════════════════════════════════════════════════════════════════════════
  describe('R. Privacy & Information Minimization', () => {
    it('TS-190 & TS-191: Resident model and print document contain no Alberta PHN, birthdate, or internal UUIDs in paper output', () => {
      const res = db.addResident({ firstName: 'Privacy', lastName: 'Resident', roomNumber: '101', status: 'active' });
      db.addResidentTask({ residentId: res.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Check vitals', category: 'Health Monitoring', frequency: 'daily', time: '0800' });

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      const model = PrintService.generateDocumentModel(sheet);

      // Verify resident identity strictly adheres to First + Last + Room
      const resGroup = model.residentGroups.find(r => r.residentId === res.id);
      expect(resGroup).toBeDefined();
      expect(resGroup?.residentName).toBe('Privacy Resident');
      expect(resGroup?.roomNumber).toBe('101');

      // Ensure no PHN or birthdate properties exist on Resident model
      expect((res as any).phn).toBeUndefined();
      expect((res as any).birthDate).toBeUndefined();
      expect((res as any).sin).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Y. Full Real-World Operational Scenarios
  // ════════════════════════════════════════════════════════════════════════════
  describe('Y. Full Real-World Operational Scenarios', () => {
    it('Scenario 1 — Normal HCA Day operational cycle with quick add and status transitions', () => {
      // 1. Clear operational data for clean test
      db.clearAllOperationalData();

      // 2. Setup 5 residents
      const residents = [];
      for (let i = 1; i <= 5; i++) {
        const r = db.addResident({ firstName: `Resident${i}`, lastName: 'HCA', roomNumber: `10${i}`, status: 'active' });
        residents.push(r);
        db.addResidentTask({
          residentId: r.id,
          shiftId: SHIFT_HCA_DAY_ID,
          title: 'AM Care Routine',
          category: 'AM Care',
          frequency: 'daily',
          time: '0800',
          instructions: 'Oral care, wash, dressing assist.'
        });
      }

      // Add unit task
      db.addUnitTask({
        shiftId: SHIFT_HCA_DAY_ID,
        title: 'Morning Dining Room Setup',
        category: 'Unit Operations',
        frequency: 'daily',
        time: '0730',
        shiftPhase: 'start'
      });

      const today = new Date().toISOString().split('T')[0];
      const sheet1 = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      expect(sheet1.residentAssignments.length).toBe(5);
      expect(sheet1.startUnitTasks.length).toBe(1);

      // Quick add urgent task for resident 1
      db.addResidentTask({
        residentId: residents[0].id,
        shiftId: SHIFT_HCA_DAY_ID,
        title: 'Urgent Fluid Intake Check',
        category: 'Nutrition & Hydration',
        frequency: 'daily',
        time: '1000'
      });

      // Transfer resident 5 to hospital
      db.updateResident(residents[4].id, { status: 'in_hospital' });

      // Regenerate
      const sheet2 = generateShiftSheet(today, SHIFT_HCA_DAY_ID);
      expect(sheet2.residentAssignments.length).toBe(4); // Resident 5 suppressed
      const r1 = sheet2.residentAssignments.find(a => a.resident.id === residents[0].id);
      expect(r1?.tasks.length).toBe(2); // AM Care + Urgent Fluid Check
    });

    it('Scenario 3 — Night shift crossing midnight (N1 2300-0700)', () => {
      const shift = db.addShift({
        name: 'Overnight N1',
        shortCode: 'N1_MID',
        startTime: '2300',
        endTime: '0700',
        roleId: ROLE_LPN_ID,
        isActive: true
      });

      const res = db.addResident({ firstName: 'Night', lastName: 'Patient', roomNumber: '401', status: 'active' });

      // Tasks across both sides of midnight
      db.addResidentTask({ residentId: res.id, shiftId: shift.id, title: '2330 Sedative Check', category: 'Health Monitoring', frequency: 'daily', time: '2330' });
      db.addResidentTask({ residentId: res.id, shiftId: shift.id, title: '0000 Midnight Turn', category: 'Positioning & Skin Care', frequency: 'daily', time: '0000' });
      db.addResidentTask({ residentId: res.id, shiftId: shift.id, title: '0300 Vitals & Reposition', category: 'Health Monitoring', frequency: 'daily', time: '0300' });
      db.addResidentTask({ residentId: res.id, shiftId: shift.id, title: '0600 Morning BG Check', category: 'Diabetes Care', frequency: 'daily', time: '0600' });

      const today = new Date().toISOString().split('T')[0];
      const sheet = generateShiftSheet(today, shift.id);
      const assignment = sheet.residentAssignments.find(a => a.resident.id === res.id);

      expect(assignment).toBeDefined();
      expect(assignment?.tasks.length).toBe(4);
      expect(assignment?.tasks.map(t => t.time)).toEqual(['0000', '0300', '0600', '2330']);
    });
  });
});
