import { Role, Shift } from '../../types';
import { isTimeWithinShift, parseMilitaryTime } from './timeWindow';

export function getActiveRoleShifts(shifts: Shift[], roleId: string): Shift[] {
  return shifts
    .filter(shift => shift.isActive !== false && shift.roleId === roleId)
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
}

export function findActiveRoleShiftForTime(shifts: Shift[], roleId: string, time: string): Shift | undefined {
  return getActiveRoleShifts(shifts, roleId)
    .find(shift => isTimeWithinShift(time, shift.startTime, shift.endTime));
}

export function getRoleDisplayName(roles: Role[], roleId: string): string {
  const role = roles.find(item => item.id === roleId);
  return role?.code || role?.name || 'selected role';
}

export function validateCareShiftSelection(options: {
  shifts: Shift[];
  roles: Role[];
  shiftId: string;
  roleId: string;
}): string | null {
  const { shifts, roles, shiftId, roleId } = options;
  const roleLabel = getRoleDisplayName(roles, roleId);
  if (!roleId) return 'Choose an active HCA or LPN shift before saving this care task.';
  if (!shiftId) {
    if (getActiveRoleShifts(shifts, roleId).length === 0) {
      return `No active ${roleLabel} shift is configured. Create one in Settings → Roles & Shifts before saving this task.`;
    }
    return `Select the active ${roleLabel} shift that should receive this care task.`;
  }
  const shift = shifts.find(item => item.id === shiftId);
  if (!shift || shift.isActive === false) return 'The assigned shift is missing or inactive. Choose an active shift.';
  if (shift.roleId !== roleId) {
    return `${shift.shortCode || shift.name} does not belong to ${roleLabel}. Choose a shift with the correct role.`;
  }
  return null;
}

export function validateTimedCareShift(options: {
  shifts: Shift[];
  roles: Role[];
  shiftId: string;
  roleId: string;
  time: string;
}): string | null {
  const { shifts, roles, shiftId, roleId, time } = options;
  const roleLabel = getRoleDisplayName(roles, roleId);

  if (parseMilitaryTime(time) === null) {
    return `“${time || 'blank'}” is not a valid 24-hour time. Enter a time such as 1715.`;
  }
  if (!roleId) {
    return 'Choose an active HCA or LPN shift before saving this timed care task.';
  }

  const roleShifts = getActiveRoleShifts(shifts, roleId);
  if (!shiftId) {
    if (roleShifts.length === 0) {
      return `No active ${roleLabel} shift is configured. Create one in Settings → Roles & Shifts before saving this task.`;
    }
    if (!findActiveRoleShiftForTime(shifts, roleId, time)) {
      return `No active ${roleLabel} shift covers ${time}. Create an appropriate shift or choose another time.`;
    }
    return `Select the active ${roleLabel} shift that should receive this ${time} task.`;
  }

  const shift = shifts.find(item => item.id === shiftId);
  if (!shift || shift.isActive === false) {
    return 'The assigned shift is missing or inactive. Choose an active shift.';
  }
  if (shift.roleId !== roleId) {
    return `${shift.shortCode || shift.name} does not belong to ${roleLabel}. Choose a shift with the correct role.`;
  }
  if (!isTimeWithinShift(time, shift.startTime, shift.endTime)) {
    return `${time} is outside ${shift.shortCode || shift.name} (${shift.startTime}–${shift.endTime}). Choose another time or shift.`;
  }
  return null;
}
