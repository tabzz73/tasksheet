import { AppDatabaseState, RecurrenceFrequency, RecurrenceRule, ResidentTask, Shift, TaskServiceCoverage, TaskTimingType } from '../../types';
import { isTaskDueOnDate } from '../recurrence';
import { isTimeWithinShift, parseMilitaryTime } from '../scheduling/timeWindow';
import { isFundedCoverage, normalizeCoverage, validateCoveragePeriod } from '../coverage';

export type ValidationStatus = 'VALID' | 'INFO' | 'WARNING' | 'BLOCKED' | 'CRITICAL';
export type ValidationCode =
  | 'INVALID_MILITARY_TIME' | 'TASK_OUTSIDE_SHIFT' | 'SHIFT_INACTIVE' | 'SHIFT_NOT_FOUND'
  | 'DUPLICATE_TASK' | 'RESIDENT_NOT_OPERATIONAL' | 'CATALOG_ITEM_INACTIVE'
  | 'SHOWER_ALREADY_SCHEDULED' | 'SHOWER_SAME_DAY' | 'SHOWER_CAPACITY_REACHED' | 'WEEKLY_SHOWER_REQUIREMENT_MET'
  | 'SHIFT_TIME_CHANGE_CONFLICT' | 'SHIFT_ROLE_CHANGE_CONFLICT' | 'SHIFT_OVERLAP'
  | 'SHIFT_HAS_DEPENDENCIES' | 'CAPACITY_BELOW_ASSIGNMENTS' | 'STALE_RECORD' | 'INVALID_DATE_RANGE'
  | 'DUPLICATE_WOUND' | 'WOUND_NOT_ACTIVE' | 'MISSING_WOUND_PROTOCOL' | 'DUPLICATE_FYI'
  | 'COVERAGE_EXPIRED' | 'COVERAGE_NOT_STARTED' | 'FUNDED_FREQUENCY_EXCEEDED' | 'ADDITIONAL_SERVICE_CONFIRMATION'
  | 'COVERAGE_CHANGE_IMPACT' | 'DUPLICATE_PRIVATE_PAY_SERVICE' | 'COVERAGE_TYPE_IN_USE' | 'ROLE_REQUIREMENT_CONFLICT'
  | 'MISSING_RESIDENT';

export interface RecommendedAction { id: string; label: string; kind?: 'primary' | 'secondary' | 'cancel' }
export interface ValidationAffectedRecord { id: string; type: 'resident_task' | 'unit_task' | 'wound' | 'bathing' | 'shift' | 'resident' | 'fyi'; label: string; detail?: string; time?: string }
export interface ValidationResult {
  status: ValidationStatus;
  code?: ValidationCode;
  title: string;
  message: string;
  context?: Record<string, string | number | boolean | undefined>;
  affectedRecords?: ValidationAffectedRecord[];
  recommendedActions?: RecommendedAction[];
}

export class DomainConflictError extends Error {
  result: ValidationResult;
  constructor(result: ValidationResult) { super(result.message); this.name = 'DomainConflictError'; this.result = result; }
}

export const validResult = (title = 'Valid'): ValidationResult => ({ status: 'VALID', title, message: 'No conflicts found.' });
export const isBlocked = (result: ValidationResult) => result.status === 'BLOCKED' || result.status === 'CRITICAL';
export function assertValid(result: ValidationResult): void { if (isBlocked(result)) throw new DomainConflictError(result); }

export function validateMilitaryTime(value: string): ValidationResult {
  if (!/^\d{4}$/.test(value.trim()) || parseMilitaryTime(value) === null) return {
    status: 'BLOCKED', code: 'INVALID_MILITARY_TIME', title: 'Invalid Time Format',
    message: `“${value || 'blank'}” is not a valid time. Enter four-digit military time from 0000 through 2359, for example 0700 or 1430.`,
    recommendedActions: [{ id: 'change_time', label: 'Change Time', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }],
  };
  return validResult();
}

export function getShiftEndLastMinute(shift: Pick<Shift, 'startTime' | 'endTime'>): string {
  const end = parseMilitaryTime(shift.endTime); if (end === null) return shift.endTime;
  const minute = (end + 1439) % 1440; return `${Math.floor(minute / 60)}`.padStart(2, '0') + `${minute % 60}`.padStart(2, '0');
}

export function validateFixedTimeForShift(time: string, shift: Shift): ValidationResult {
  const format = validateMilitaryTime(time); if (isBlocked(format)) return format;
  if (!isTimeWithinShift(time, shift.startTime, shift.endTime)) return {
    status: 'BLOCKED', code: 'TASK_OUTSIDE_SHIFT', title: `${time} Is Outside ${shift.shortCode || shift.name}`,
    message: `${time} is outside ${shift.shortCode || shift.name}. ${shift.shortCode || shift.name} runs from ${shift.startTime}–${shift.endTime}. Choose a time between ${shift.startTime} and ${getShiftEndLastMinute(shift)}, or assign the item to a shift that includes ${time}. Shift start is inclusive and shift end is exclusive.`,
    context: { time, shiftId: shift.id, shiftCode: shift.shortCode, shiftStart: shift.startTime, shiftEnd: shift.endTime },
    recommendedActions: [{ id: 'change_time', label: 'Change Time', kind: 'primary' }, { id: 'choose_shift', label: 'Choose Another Shift', kind: 'secondary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }],
  };
  return validResult();
}

export const isBathingAssignment = (task: Pick<ResidentTask, 'title' | 'category'>) => {
  const text = `${task.title} ${task.category}`.toLowerCase();
  return /\b(shower|tub bath|bed bath|partial bath|bathing assistance|bath assistance)\b/.test(text);
};

const datesFromToday = (count: number) => Array.from({ length: count }, (_, index) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + index); return date.toISOString().slice(0, 10); });
const dueDates = (frequency: RecurrenceFrequency, rule?: RecurrenceRule, createdAt?: string, horizon = 56) => datesFromToday(horizon).filter(date => isTaskDueOnDate(rule, frequency, date, createdAt));

export interface TaskAssignmentCandidate {
  id?: string; kind: 'resident_task' | 'unit_task' | 'wound'; residentId?: string; shiftId?: string; roleId?: string;
  isActive?: boolean;
  title: string; category?: string; time?: string; timingType?: TaskTimingType; isNoSpecificTime?: boolean;
  frequency: RecurrenceFrequency; recurrenceRule?: RecurrenceRule; createdAt?: string; templateSlug?: string;
  serviceCoverage?: TaskServiceCoverage;
}

export function validateBathingAssignment(state: AppDatabaseState, candidate: TaskAssignmentCandidate): ValidationResult {
  if (candidate.kind !== 'resident_task' || !candidate.residentId || !isBathingAssignment({ title: candidate.title, category: candidate.category || '' })) return validResult();
  const resident = state.residents.find(item => item.id === candidate.residentId);
  const shift = state.shifts.find(item => item.id === candidate.shiftId);
  if (!resident || !shift) return validResult();
  const dates = dueDates(candidate.frequency, candidate.recurrenceRule, candidate.createdAt);
  const existing = state.residentTasks.filter(task => task.id !== candidate.id && task.isActive !== false && isBathingAssignment(task));
  const conflicts: ValidationAffectedRecord[] = [];
  for (const date of dates) {
    const sameResident = existing.filter(task => task.residentId === candidate.residentId && isTaskDueOnDate(task.recurrenceRule, task.frequency, date, task.createdAt));
    const exact = sameResident.find(task => task.shiftId === candidate.shiftId);
    if (exact) return { status: 'BLOCKED', code: 'SHOWER_ALREADY_SCHEDULED', title: 'Shower Already Scheduled', message: `${resident.firstName} ${resident.lastName} · Room ${resident.roomNumber} is already assigned to ${shift.shortCode || shift.name} on ${new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long' })}.`, context: { residentId: resident.id, room: resident.roomNumber, shiftId: shift.id, date }, affectedRecords: [{ id: exact.id, type: 'bathing', label: exact.title, detail: `${date} · ${shift.shortCode}` }], recommendedActions: [{ id: 'view_existing', label: 'View Existing Assignment', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
    if (sameResident.length && state.settings.allowMultipleBathingSameDay !== true) {
      const otherShift = state.shifts.find(item => item.id === sameResident[0].shiftId);
      return { status: 'BLOCKED', code: 'SHOWER_SAME_DAY', title: 'Shower Already Assigned for This Day', message: `${resident.firstName} ${resident.lastName} · Room ${resident.roomNumber} already has bathing scheduled on ${new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long' })} with ${otherShift?.shortCode || 'another shift'}. Move the existing assignment or choose another day.`, context: { date, existingShiftId: otherShift?.id, requestedShiftId: shift.id }, affectedRecords: sameResident.map(task => ({ id: task.id, type: 'bathing', label: task.title, detail: otherShift?.shortCode })), recommendedActions: [{ id: 'move_assignment', label: `Move to ${shift.shortCode}`, kind: 'primary' }, { id: 'choose_day', label: 'Choose Another Day', kind: 'secondary' }, { id: 'cancel', label: 'Keep Existing Assignment', kind: 'cancel' }] };
    }
    const assigned = existing.filter(task => task.shiftId === candidate.shiftId && isTaskDueOnDate(task.recurrenceRule, task.frequency, date, task.createdAt));
    const capacity = Math.max(1, state.settings.bathingCapacityPerShiftLine ?? 2);
    if (assigned.length >= capacity) {
      conflicts.push(...assigned.map(task => { const itemResident = state.residents.find(item => item.id === task.residentId); return { id: task.id, type: 'bathing' as const, label: `${itemResident?.roomNumber || 'Room'} · ${task.title}`, detail: date }; }));
      return { status: 'BLOCKED', code: 'SHOWER_CAPACITY_REACHED', title: 'Shower Capacity Reached', message: `${shift.shortCode || shift.name} already has ${assigned.length} of ${capacity} bathing assignments on ${new Date(`${date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long' })}. Room ${resident.roomNumber} cannot be added until another assignment is moved or capacity is reviewed.`, context: { date, shiftId: shift.id, assigned: assigned.length, capacity }, affectedRecords: conflicts, recommendedActions: [{ id: 'choose_shift', label: 'Choose Another Shift', kind: 'primary' }, { id: 'choose_day', label: 'Choose Another Day', kind: 'secondary' }, { id: 'view_grid', label: 'View Weekly Bathing Grid', kind: 'secondary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
    }
  }
  if (resident.bathingFrequencyPerWeek && isFundedCoverage(candidate.serviceCoverage)) {
    const fundedExisting = existing.filter(task => task.residentId === resident.id && isFundedCoverage(task.serviceCoverage));
    const week = datesFromToday(7); const existingDays = new Set(fundedExisting.flatMap(task => week.filter(date => isTaskDueOnDate(task.recurrenceRule, task.frequency, date, task.createdAt))));
    dueDates(candidate.frequency, candidate.recurrenceRule, candidate.createdAt, 7).forEach(date => existingDays.add(date));
    if (existingDays.size > resident.bathingFrequencyPerWeek) return { status: 'BLOCKED', code: 'WEEKLY_SHOWER_REQUIREMENT_MET', title: 'Weekly Shower Requirement Already Met', message: `${resident.firstName} ${resident.lastName} · Room ${resident.roomNumber} requires ${resident.bathingFrequencyPerWeek} bathing occurrence(s) per week. The proposed schedule would create ${existingDays.size}.`, context: { required: resident.bathingFrequencyPerWeek, proposed: existingDays.size }, recommendedActions: [{ id: 'change_requirement', label: 'Change Weekly Requirement', kind: 'secondary' }, { id: 'replace_day', label: 'Replace Existing Day', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  }
  return validResult();
}

export function validateTaskAssignment(state: AppDatabaseState, candidate: TaskAssignmentCandidate): ValidationResult {
  const coverage = normalizeCoverage(candidate.serviceCoverage);
  const coveragePeriodError = validateCoveragePeriod(coverage);
  if (coveragePeriodError) return { status: 'BLOCKED', code: 'INVALID_DATE_RANGE', title: 'Invalid Coverage Period', message: coveragePeriodError, recommendedActions: [{ id: 'change_dates', label: 'Change Coverage Dates', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  const shift = state.shifts.find(item => item.id === candidate.shiftId);
  if (!shift) return { status: 'BLOCKED', code: 'SHIFT_NOT_FOUND', title: 'Shift Not Found', message: `The assigned shift for “${candidate.title}” no longer exists. Choose an active shift before saving.`, recommendedActions: [{ id: 'choose_shift', label: 'Choose Active Shift', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  if (shift.isActive === false) return { status: 'BLOCKED', code: 'SHIFT_INACTIVE', title: 'Shift Is Inactive', message: `${shift.shortCode || shift.name} is inactive and cannot receive “${candidate.title}”. Select another shift or reactivate it in Settings.`, context: { shiftId: shift.id }, recommendedActions: [{ id: 'choose_shift', label: 'Select Another Shift', kind: 'primary' }, { id: 'shift_settings', label: 'Open Shift Settings', kind: 'secondary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  const shiftRole = state.roles.find(role => role.id === shift.roleId);
  const shiftRoleCode = shiftRole?.code?.toUpperCase();
  if (candidate.kind === 'wound' && shiftRoleCode !== 'LPN' && shiftRoleCode !== 'RN') return { status: 'BLOCKED', code: 'ROLE_REQUIREMENT_CONFLICT', title: 'Clinical Role Required', message: `${candidate.title} requires an active LPN or RN shift. ${shift.shortCode || shift.name} is configured for ${shiftRole?.name || 'another role'}. Service Coverage does not override clinical role requirements.`, context: { shiftId: shift.id, roleId: shift.roleId }, recommendedActions: [{ id: 'choose_shift', label: 'Choose LPN/RN Shift', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  const assignedTemplate = candidate.templateSlug ? state.catalogTaskTemplates.find(template => template.slug === candidate.templateSlug) : undefined;
  if (assignedTemplate && assignedTemplate.roleCode !== 'SHARED' && assignedTemplate.roleCode !== shiftRoleCode) return { status: 'BLOCKED', code: 'ROLE_REQUIREMENT_CONFLICT', title: 'Role Requirement Conflict', message: `${assignedTemplate.title} is configured for ${assignedTemplate.roleCode}. ${shift.shortCode || shift.name} is a ${shiftRoleCode || 'different-role'} shift. Choose an eligible shift or another task. Service Coverage never weakens role requirements.`, context: { shiftId: shift.id, requiredRole: assignedTemplate.roleCode, assignedRole: shiftRoleCode }, recommendedActions: [{ id: 'choose_shift', label: 'Choose Eligible Shift', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  const timing = candidate.timingType || (candidate.isNoSpecificTime || !candidate.time ? 'period' : 'fixed');
  if (timing === 'fixed') { const result = validateFixedTimeForShift(candidate.time || '', shift); if (isBlocked(result)) return result; }
  if (candidate.residentId) {
    const resident = state.residents.find(item => item.id === candidate.residentId);
    if (!resident || ['discharged', 'deceased', 'inactive'].includes(resident.status)) return { status: 'BLOCKED', code: 'RESIDENT_NOT_OPERATIONAL', title: 'Resident Is Not Operationally Active', message: `“${candidate.title}” cannot be scheduled because ${resident ? `${resident.firstName} ${resident.lastName}` : 'the selected resident'} is ${resident?.status || 'missing'}. Restore the resident to a current status or cancel this assignment.`, context: { residentId: candidate.residentId }, recommendedActions: [{ id: 'review_resident', label: 'Review Resident Status', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  }
  if (candidate.templateSlug && state.catalogTaskTemplates.find(template => template.slug === candidate.templateSlug)?.isActive === false) return { status: 'BLOCKED', code: 'CATALOG_ITEM_INACTIVE', title: 'Catalog Item Is Inactive', message: `“${candidate.title}” is inactive in the Care Task Catalog. Reactivate the catalog item or choose another task.`, recommendedActions: [{ id: 'catalog', label: 'Open Care Task Catalog', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  const bathing = validateBathingAssignment(state, candidate); if (isBlocked(bathing)) return bathing;
  const collection = candidate.kind === 'unit_task' ? state.unitTasks : state.residentTasks;
  const candidateDueDates = new Set(dueDates(candidate.frequency, candidate.recurrenceRule, candidate.createdAt));
  const duplicate = collection.find(task => task.id !== candidate.id && task.isActive !== false && task.shiftId === candidate.shiftId && ('residentId' in task ? task.residentId === candidate.residentId : true) && task.title.trim().toLowerCase() === candidate.title.trim().toLowerCase() && (task.time || '') === (candidate.time || '') && dueDates(task.frequency, task.recurrenceRule, task.createdAt).some(date => candidateDueDates.has(date)));
  if (duplicate) return { status: 'BLOCKED', code: 'DUPLICATE_TASK', title: 'Duplicate Task Assignment', message: `“${candidate.title}” is already scheduled${candidate.time ? ` at ${candidate.time}` : ''} on ${shift.shortCode || shift.name}. Edit the existing assignment instead of creating another copy.`, affectedRecords: [{ id: duplicate.id, type: candidate.kind === 'unit_task' ? 'unit_task' : 'resident_task', label: duplicate.title, time: duplicate.time }], recommendedActions: [{ id: 'edit_existing', label: 'Edit Existing Assignment', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
  return validResult();
}

export interface ShiftImpact extends ValidationResult { counts: { residents: number; residentTasks: number; unitTasks: number; wounds: number; bathingAssignments: number; conflicts: number; valid: number } }
export function analyzeShiftChange(state: AppDatabaseState, shiftId: string, proposed: Partial<Shift>): ShiftImpact {
  const current = state.shifts.find(shift => shift.id === shiftId);
  const empty = { residents: 0, residentTasks: 0, unitTasks: 0, wounds: 0, bathingAssignments: 0, conflicts: 0, valid: 0 };
  if (!current) return { ...validResult(), counts: empty };
  const next = { ...current, ...proposed };
  const residentTasks = state.residentTasks.filter(task => task.isActive !== false && task.shiftId === shiftId);
  const unitTasks = state.unitTasks.filter(task => task.isActive !== false && task.shiftId === shiftId);
  const wounds = state.wounds.filter(wound => ['active', 'healing'].includes(wound.status) && wound.shiftId === shiftId);
  const affected: ValidationAffectedRecord[] = [];
  const check = (id: string, type: ValidationAffectedRecord['type'], label: string, time?: string, timingType?: TaskTimingType) => {
    const semantic = timingType === 'start_of_shift' || timingType === 'end_of_shift' || timingType === 'period';
    if (time && !semantic && !isTimeWithinShift(time, next.startTime, next.endTime)) affected.push({ id, type, label, time, detail: `${next.shortCode} ${next.startTime}–${next.endTime}` });
  };
  residentTasks.forEach(task => check(task.id, isBathingAssignment(task) ? 'bathing' : 'resident_task', task.title, task.time, task.timingType));
  unitTasks.forEach(task => check(task.id, 'unit_task', task.title, task.time, task.timingType));
  wounds.forEach(wound => check(wound.id, 'wound', `Wound · ${wound.siteLocation}`, wound.time, wound.timingType));
  if (next.roleId !== current.roleId) {
    wounds.forEach(wound => { if (!affected.some(item => item.id === wound.id)) affected.push({ id: wound.id, type: 'wound', label: `Wound · ${wound.siteLocation}`, detail: 'Review clinical role requirement' }); });
  }
  const residentIds = new Set(residentTasks.map(task => task.residentId));
  const counts = { residents: residentIds.size, residentTasks: residentTasks.length, unitTasks: unitTasks.length, wounds: wounds.length, bathingAssignments: residentTasks.filter(isBathingAssignment).length, conflicts: affected.length, valid: residentTasks.length + unitTasks.length + wounds.length - affected.length };
  if (affected.length) return { status: 'BLOCKED', code: next.roleId !== current.roleId ? 'SHIFT_ROLE_CHANGE_CONFLICT' : 'SHIFT_TIME_CHANGE_CONFLICT', title: 'Shift Change Creates Conflicts', message: `Changing ${current.shortCode} from ${current.startTime}–${current.endTime} to ${next.startTime}–${next.endTime} would leave ${affected.length} assignment(s) outside the shift or requiring role review. Resolve them before saving the shift.`, context: { shiftId, oldStart: current.startTime, oldEnd: current.endTime, newStart: next.startTime, newEnd: next.endTime }, affectedRecords: affected, recommendedActions: [{ id: 'review', label: 'Review & Resolve', kind: 'primary' }, { id: 'cancel', label: 'Cancel Change', kind: 'cancel' }], counts };
  const overlap = state.shifts.find(shift => shift.id !== shiftId && shift.isActive !== false && shift.roleId === next.roleId && shiftsOverlap(next, shift));
  if (overlap) return { status: 'WARNING', code: 'SHIFT_OVERLAP', title: 'Shift Times Overlap', message: `${next.shortCode} overlaps ${overlap.shortCode} for the same role. Existing assignments remain valid, but review coverage and task ownership.`, context: { shiftId, overlapShiftId: overlap.id }, affectedRecords: [{ id: overlap.id, type: 'shift', label: `${overlap.shortCode} · ${overlap.startTime}–${overlap.endTime}` }], recommendedActions: [{ id: 'continue', label: 'Continue After Review', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }], counts };
  return { ...validResult(), counts };
}

const segments = (shift: Pick<Shift, 'startTime' | 'endTime'>): Array<[number, number]> => { const start = parseMilitaryTime(shift.startTime); const end = parseMilitaryTime(shift.endTime); if (start === null || end === null) return []; if (start === end) return [[0, 1440]]; return start < end ? [[start, end]] : [[start, 1440], [0, end]]; };
export function shiftsOverlap(a: Pick<Shift, 'startTime' | 'endTime'>, b: Pick<Shift, 'startTime' | 'endTime'>): boolean { return segments(a).some(([as, ae]) => segments(b).some(([bs, be]) => Math.max(as, bs) < Math.min(ae, be))); }

export function analyzeShiftDeletion(state: AppDatabaseState, shiftId: string): ValidationResult {
  const shift = state.shifts.find(item => item.id === shiftId); if (!shift) return validResult();
  const resident = state.residentTasks.filter(task => task.isActive !== false && task.shiftId === shiftId);
  const unit = state.unitTasks.filter(task => task.isActive !== false && task.shiftId === shiftId);
  const wounds = state.wounds.filter(wound => ['active', 'healing'].includes(wound.status) && wound.shiftId === shiftId);
  if (!resident.length && !unit.length && !wounds.length) return validResult();
  return { status: 'BLOCKED', code: 'SHIFT_HAS_DEPENDENCIES', title: `${shift.shortCode} Cannot Be Deleted Yet`, message: `${shift.shortCode} is referenced by ${resident.length} resident assignment(s), ${unit.length} unit task(s), ${resident.filter(isBathingAssignment).length} bathing assignment(s), and ${wounds.length} active wound protocol(s). Reassign or deactivate these records first.`, context: { residentTasks: resident.length, unitTasks: unit.length, bathing: resident.filter(isBathingAssignment).length, wounds: wounds.length }, recommendedActions: [{ id: 'review', label: 'Review Dependencies', kind: 'primary' }, { id: 'deactivate', label: 'Deactivate Shift', kind: 'secondary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
}

export function analyzeShiftDeactivation(state: AppDatabaseState, shiftId: string): ValidationResult {
  const shift = state.shifts.find(item => item.id === shiftId); if (!shift) return validResult();
  const resident = state.residentTasks.filter(task => task.isActive !== false && task.shiftId === shiftId);
  const unit = state.unitTasks.filter(task => task.isActive !== false && task.shiftId === shiftId);
  const wounds = state.wounds.filter(wound => ['active', 'healing'].includes(wound.status) && wound.shiftId === shiftId);
  if (!resident.length && !unit.length && !wounds.length) return validResult();
  return { status: 'WARNING', code: 'SHIFT_HAS_DEPENDENCIES', title: `${shift.shortCode} Has Active Work Assigned`, message: `Deactivating ${shift.shortCode} will immediately stop it from generating ${resident.length} resident assignment(s), ${unit.length} unit task(s), and ${wounds.length} active wound protocol(s) on any TaskSheet, even though those records will still show as active. Reactivate the shift or reassign this work if that work still needs to be printed.`, context: { residentTasks: resident.length, unitTasks: unit.length, wounds: wounds.length }, recommendedActions: [{ id: 'continue', label: 'Deactivate Anyway', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] };
}

export function validateBathingCapacityChange(state: AppDatabaseState, proposedCapacity: number): ValidationResult {
  if (!Number.isInteger(proposedCapacity) || proposedCapacity < 1) return { status: 'BLOCKED', code: 'CAPACITY_BELOW_ASSIGNMENTS', title: 'Invalid Shower Capacity', message: 'Enter a whole-number shower capacity of at least 1.' };
  const conflicts: ValidationAffectedRecord[] = []; const dates = datesFromToday(56);
  for (const shift of state.shifts.filter(item => item.isActive !== false)) for (const date of dates) {
    const assigned = state.residentTasks.filter(task => task.isActive !== false && task.shiftId === shift.id && isBathingAssignment(task) && isTaskDueOnDate(task.recurrenceRule, task.frequency, date, task.createdAt));
    if (assigned.length > proposedCapacity) conflicts.push({ id: `${shift.id}-${date}`, type: 'bathing', label: `${date} · ${shift.shortCode}`, detail: `${assigned.length} assigned` });
  }
  return conflicts.length ? { status: 'BLOCKED', code: 'CAPACITY_BELOW_ASSIGNMENTS', title: 'Existing Assignments Exceed New Capacity', message: `Reducing capacity to ${proposedCapacity} would create conflicts on ${conflicts.length} shift/day combination(s). No assignments were changed.`, affectedRecords: conflicts, recommendedActions: [{ id: 'review', label: 'Resolve Conflicts', kind: 'primary' }, { id: 'cancel', label: `Keep Capacity at ${state.settings.bathingCapacityPerShiftLine ?? 2}`, kind: 'cancel' }] } : validResult();
}
