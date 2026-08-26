import { Resident, ResidentTask, UnitTask, FYI, Wound, Role, Shift, RecurrenceFrequency, RecurrenceRule } from '../../types';
import { db } from '../../db';
import { isTaskDueOnDate } from '../recurrence';
import { isTimeWithinShift, parseMilitaryTime } from '../scheduling/timeWindow';
import { getResidentStatusLabel, isResidentStatusException } from '../residentStatus';

export interface GeneratedResidentAssignment {
  resident: Resident;
  tasks: ResidentTask[];
  wounds: Wound[];
  fyis: FYI[];
}

export interface ShiftGenerationException {
  taskId: string;
  taskType: 'resident_task' | 'unit_task' | 'wound';
  title: string;
  time: string;
  reason: 'outside_shift_window' | 'invalid_time';
  shiftId: string;
  shiftCode: string;
  shiftStart: string;
  shiftEnd: string;
  residentId?: string;
  residentName?: string;
  roomNumber?: string;
  source?: string;
}

export interface GeneratedResidentStatusException {
  residentId: string;
  roomNumber: string;
  residentName: string;
  status: 'in_hospital' | 'out_on_pass' | 'on_hold';
  statusLabel: string;
}

/**
 * GeneratedShiftSheet — the output of the scheduling generator.
 *
 * ADR-001: Completion Domain Removed from Active Architecture
 * This sheet contains ONLY scheduled items determined by recurrence rules
 * and the selected Assignment Date + Shift. There are no completion records,
 * no progress percentages, and no overdue flags — TaskSheet does not
 * electronically track whether printed tasks were performed by staff.
 */
export interface GeneratedShiftSheet {
  date: string; // YYYY-MM-DD
  shift: Shift;
  role: Role;
  startUnitTasks: UnitTask[];
  duringUnitTasks: UnitTask[];
  endUnitTasks: UnitTask[];
  residentAssignments: GeneratedResidentAssignment[];
  /** PRN tasks scheduled for any resident on this shift — appear in a dedicated PRN section */
  prnTasks: GeneratedResidentAssignment[];
  importantFYIs: FYI[];
  /** Status-only residents whose care is intentionally suppressed for this shift. */
  residentStatusExceptions: GeneratedResidentStatusException[];
  /** Timed tasks withheld because their time is invalid for this shift. */
  exceptions: ShiftGenerationException[];
  metrics: {
    /** Count of scheduled resident care tasks (excluding PRN) */
    totalResidentTasks: number;
    /** Count of PRN care tasks scheduled */
    totalPrnTasks: number;
    /** Count of scheduled unit tasks */
    totalUnitTasks: number;
    /** Total scheduled items (resident + unit, excluding PRN) */
    totalScheduled: number;
    /** Count of active FYIs relevant to this shift */
    fyiCount: number;
    /** Count of timed tasks withheld for shift-window configuration errors */
    exceptionCount: number;
    /** Hospital, pass, or hold residents shown without care tasks. */
    residentStatusExceptionCount: number;
  };
}

export function isDateDue(dateStr: string, frequency: RecurrenceFrequency, rule?: RecurrenceRule, createdAt?: string): boolean {
  return isTaskDueOnDate(rule, frequency, dateStr, createdAt);
}

export function sortRoomNumbers(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function calculateShiftDurationHours(startTime: string, endTime: string): number {
  const parseMinutes = (t: string) => {
    const clean = t.replace(/[^0-9]/g, '').padStart(4, '0');
    const h = parseInt(clean.slice(0, 2), 10) || 0;
    const m = parseInt(clean.slice(2, 4), 10) || 0;
    return h * 60 + m;
  };
  const startMin = parseMinutes(startTime);
  const endMin = parseMinutes(endTime);
  if (endMin >= startMin) {
    return (endMin - startMin) / 60;
  }
  // Overnight shift crossing midnight
  return (24 * 60 - startMin + endMin) / 60;
}

/**
 * generateShiftSheet — the core TaskSheet scheduling engine.
 *
 * Takes an Assignment Date and Shift ID, returns all scheduled tasks,
 * wounds, PRN items, and FYIs organized for that shift.
 *
 * ADR-001: No completion records, no progress percentages, no overdue flags.
 * TaskSheet generates the paper working guide. Staff use paper documentation
 * systems (MAR, EHR, TAR, flow sheets) for authoritative clinical recording.
 */
export function generateShiftSheet(dateStr: string, shiftId: string): GeneratedShiftSheet {
  const state = db.getState();
  const shift = state.shifts.find(s => s.id === shiftId);
  if (!shift) {
    throw new Error(`Shift with ID ${shiftId} not found.`);
  }

  const role = state.roles.find(r => r.id === shift.roleId) || {
    id: shift.roleId,
    name: 'General Role',
    code: 'GEN',
    description: 'Operational role',
    defaultPrintProfile: 'clinical_worksheet' as const,
    isSystem: true
  };

  const exceptions: ShiftGenerationException[] = [];

  const exceptionReason = (time: string): ShiftGenerationException['reason'] =>
    parseMilitaryTime(time) === null ? 'invalid_time' : 'outside_shift_window';

  // 1. Unit Tasks — scheduled (excluding PRN from unit tasks section)
  const candidateUnitTasks = state.unitTasks.filter(
    u => u.isActive &&
         u.frequency !== 'prn' &&
         (u.shiftId ? u.shiftId === shiftId : u.roleId === role.id) &&
         isDateDue(dateStr, u.frequency, u.recurrenceRule, u.createdAt)
  );

  const shiftUnitTasks = candidateUnitTasks.filter(u => {
    if (!u.time || isTimeWithinShift(u.time, shift.startTime, shift.endTime)) return true;
    exceptions.push({
      taskId: u.id,
      taskType: 'unit_task',
      title: u.title,
      time: u.time,
      reason: exceptionReason(u.time),
      shiftId: shift.id,
      shiftCode: shift.shortCode || shift.name,
      shiftStart: shift.startTime,
      shiftEnd: shift.endTime,
      source: u.source,
    });
    return false;
  });

  const startUnitTasks = shiftUnitTasks
    .filter(u => u.shiftPhase === 'start')
    .sort((a, b) => (a.time || '0000').localeCompare(b.time || '0000'));

  const duringUnitTasks = shiftUnitTasks
    .filter(u => u.shiftPhase === 'during')
    .sort((a, b) => (a.time || '0000').localeCompare(b.time || '0000'));

  const endUnitTasks = shiftUnitTasks
    .filter(u => u.shiftPhase === 'end')
    .sort((a, b) => (a.time || '0000').localeCompare(b.time || '0000'));

  // 2. Active Residents — hospital, pass, and hold care is suppressed.
  const activeResidents = state.residents
    .filter(r => r.status === 'active')
    .sort((a, b) => sortRoomNumbers(a.roomNumber, b.roomNumber));
  const residentStatusExceptions: GeneratedResidentStatusException[] = state.residents
    .filter(resident => isResidentStatusException(resident.status))
    .sort((a, b) => sortRoomNumbers(a.roomNumber, b.roomNumber))
    .map(resident => ({
      residentId: resident.id,
      roomNumber: resident.roomNumber,
      residentName: `${resident.firstName} ${resident.lastName}`,
      status: resident.status as GeneratedResidentStatusException['status'],
      statusLabel: getResidentStatusLabel(resident.status),
    }));

  // 3. Resident Tasks — split into regular vs PRN
  const residentAssignments: GeneratedResidentAssignment[] = [];
  const prnTasks: GeneratedResidentAssignment[] = [];
  let totalResidentTasks = 0;
  let totalPrnTasks = 0;

  for (const res of activeResidents) {
    // All care tasks for this resident matching this shift/role
    const candidateTasks = state.residentTasks
      .filter(t => t.isActive && t.residentId === res.id)
      .filter(t => (t.shiftId ? t.shiftId === shiftId : (t.roleId ? t.roleId === role.id : true)))
      .filter(t => isDateDue(dateStr, t.frequency, t.recurrenceRule, t.createdAt))
      .sort((a, b) => (a.time || '9999').localeCompare(b.time || '9999'));

    const allMatchingTasks = candidateTasks.filter(t => {
      if (!t.time || isTimeWithinShift(t.time, shift.startTime, shift.endTime)) return true;
      exceptions.push({
        taskId: t.id,
        taskType: 'resident_task',
        title: t.title,
        time: t.time,
        reason: exceptionReason(t.time),
        shiftId: shift.id,
        shiftCode: shift.shortCode || shift.name,
        shiftStart: shift.startTime,
        shiftEnd: shift.endTime,
        residentId: res.id,
        residentName: `${res.firstName} ${res.lastName}`,
        roomNumber: res.roomNumber,
        source: t.source,
      });
      return false;
    });

    // Separate PRN from regular scheduled tasks
    const regularTasks = allMatchingTasks.filter(t => t.frequency !== 'prn');
    const prnResidentTasks = allMatchingTasks.filter(t => t.frequency === 'prn');

    // Wounds for this resident
    const candidateWounds = state.wounds
      .filter(w => w.residentId === res.id && w.status !== 'resolved' && w.shiftId === shiftId)
      .filter(w => isDateDue(dateStr, w.frequency, w.recurrenceRule, w.createdAt));
    const wounds = candidateWounds.filter(w => {
      if (w.time && isTimeWithinShift(w.time, shift.startTime, shift.endTime)) return true;
      const configuredTime = w.time || 'Not set';
      exceptions.push({
        taskId: w.id,
        taskType: 'wound',
        title: `Wound Care — ${w.siteLocation}`,
        time: configuredTime,
        reason: exceptionReason(configuredTime),
        shiftId: shift.id,
        shiftCode: shift.shortCode || shift.name,
        shiftStart: shift.startTime,
        shiftEnd: shift.endTime,
        residentId: res.id,
        residentName: `${res.firstName} ${res.lastName}`,
        roomNumber: res.roomNumber,
        source: w.source,
      });
      return false;
    });

    // FYIs for this resident (matching role/shift scope)
    const fyis = state.fyis.filter(
      f => f.status === 'active' &&
           f.residentId === res.id &&
           (!f.roleId || f.roleId === role.id) &&
           (!f.shiftId || f.shiftId === shiftId)
    );

    if (regularTasks.length > 0 || wounds.length > 0 || fyis.length > 0) {
      residentAssignments.push({ resident: res, tasks: regularTasks, wounds, fyis });
      totalResidentTasks += regularTasks.length;
    }

    if (prnResidentTasks.length > 0) {
      prnTasks.push({ resident: res, tasks: prnResidentTasks, wounds: [], fyis: [] });
      totalPrnTasks += prnResidentTasks.length;
    }
  }

  // 4. Important Unit / Shared FYIs
  const importantFYIs = state.fyis.filter(
    f => f.status === 'active' &&
         !f.residentId &&
         (!f.roleId || f.roleId === role.id) &&
         (!f.shiftId || f.shiftId === shiftId)
  );

  const totalUnitTasks = shiftUnitTasks.length;
  const fyiCount = importantFYIs.length;

  return {
    date: dateStr,
    shift,
    role,
    startUnitTasks,
    duringUnitTasks,
    endUnitTasks,
    residentAssignments,
    prnTasks,
    importantFYIs,
    residentStatusExceptions,
    exceptions,
    metrics: {
      totalResidentTasks,
      totalPrnTasks,
      totalUnitTasks,
      totalScheduled: totalResidentTasks + totalUnitTasks,
      fyiCount,
      exceptionCount: exceptions.length,
      residentStatusExceptionCount: residentStatusExceptions.length,
    }
  };
}
