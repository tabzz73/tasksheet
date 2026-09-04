import { FYI, Resident, Role, Shift, AppDatabaseState } from '../../types';
import { sortRoomNumbers } from '../generator';
import {
  FyiBinderPrintDocumentModel,
  BinderFacility,
  BinderFyiEntry,
  BinderResidentGroup,
  BinderRoleSection,
  BinderShiftGroup,
} from '../../components/print/FyiBinderPrintDocument';
import { getTodayLocalDateString } from '../recurrence';

function formatMilitary(start: string, end: string): string {
  return start + '\u2013' + end;
}

function toEntry(f: FYI): BinderFyiEntry {
  return {
    id: f.id,
    category: f.category,
    importance: f.importance,
    text: f.text,
    effectiveDate: f.effectiveDate,
    expiryDate: f.expiryDate,
  };
}

function groupByResident(
  fyis: FYI[],
  residents: Resident[]
): { unitFyis: BinderFyiEntry[]; residentGroups: BinderResidentGroup[] } {
  const unitFyis: BinderFyiEntry[] = [];
  const resMap = new Map<string, { group: BinderResidentGroup; room: string }>();

  // Sort important first, then by room
  const sorted = [...fyis].sort((a, b) => {
    const aImp = a.importance === 'urgent' ? 0 : a.importance === 'high' ? 1 : 2;
    const bImp = b.importance === 'urgent' ? 0 : b.importance === 'high' ? 1 : 2;
    if (aImp !== bImp) return aImp - bImp;
    if (a.residentId && b.residentId) {
      const ra = residents.find(r => r.id === a.residentId);
      const rb = residents.find(r => r.id === b.residentId);
      if (ra && rb) return sortRoomNumbers(ra.roomNumber, rb.roomNumber);
    }
    return 0;
  });

  for (const f of sorted) {
    if (!f.residentId) {
      unitFyis.push(toEntry(f));
      continue;
    }
    const res = residents.find(r => r.id === f.residentId);
    if (!res) {
      unitFyis.push(toEntry(f));
      continue;
    }
    const key = f.residentId;
    if (!resMap.has(key)) {
      resMap.set(key, {
        room: res.roomNumber,
        group: {
          roomNumber: res.roomNumber,
          residentName: res.firstName + ' ' + res.lastName,
          fyis: [],
        },
      });
    }
    resMap.get(key)!.group.fyis.push(toEntry(f));
  }

  // Sort resident groups by room number naturally
  const residentGroups = [...resMap.values()]
    .sort((a, b) => sortRoomNumbers(a.room, b.room))
    .map(v => v.group);

  return { unitFyis, residentGroups };
}

export function buildFyiBinderPrintModel(
  state: AppDatabaseState,
  scopeRoleId?: string,
  scopeShiftId?: string
): FyiBinderPrintDocumentModel {
  const now = new Date().toISOString();
  const today = getTodayLocalDateString();

  // Filter: only active, not expired.
  const activeFyis = state.fyis.filter(f => {
    if (f.status !== 'active') return false;
    if (f.expiryDate && f.expiryDate < today) return false;
    if (scopeRoleId && f.roleId && f.roleId !== scopeRoleId) return false;
    if (scopeShiftId && f.shiftId && f.shiftId !== scopeShiftId) return false;
    return true;
  });

  const residents = state.residents;
  const roles = state.roles;
  const shifts = state.shifts;

  // Build scope label
  let scopeLabel = 'All Roles / All Shifts';
  if (scopeRoleId) {
    const role = roles.find(r => r.id === scopeRoleId);
    scopeLabel = role ? role.name : scopeRoleId;
  }
  if (scopeShiftId) {
    const shift = shifts.find(s => s.id === scopeShiftId);
    scopeLabel += shift ? ' / ' + (shift.shortCode || '') + ' ' + shift.name : '';
  }

  // 1. Shared FYIs — no roleId, no shiftId
  const sharedAll = activeFyis.filter(f => !f.roleId && !f.shiftId);
  const { unitFyis: sharedFyis, residentGroups: sharedResidentGroups } = groupByResident(sharedAll, residents);

  // 2. Role sections — one per role that has FYIs
  const roleSections: BinderRoleSection[] = [];

  for (const role of roles) {
    if (scopeRoleId && role.id !== scopeRoleId) continue;

    // FYIs scoped to this role (no specific shift)
    const roleFyisNoShift = activeFyis.filter(f => f.roleId === role.id && !f.shiftId);
    const { unitFyis: allShiftsFyis, residentGroups: allShiftsResidentGroups } = groupByResident(roleFyisNoShift, residents);

    // Shift sub-groups within this role
    const roleShifts = shifts.filter(s => s.roleId === role.id && s.isActive !== false);
    const shiftGroups: BinderShiftGroup[] = [];

    for (const shift of roleShifts.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99))) {
      if (scopeShiftId && shift.id !== scopeShiftId) continue;

      const shiftFyis = activeFyis.filter(f => f.shiftId === shift.id);
      if (shiftFyis.length === 0) continue;

      const { unitFyis: shiftSharedFyis, residentGroups: shiftResidentGroups } = groupByResident(shiftFyis, residents);

      shiftGroups.push({
        shiftId: shift.id,
        shiftCode: shift.shortCode || '',
        shiftName: shift.name,
        shiftTime: formatMilitary(shift.startTime, shift.endTime),
        sharedFyis: shiftSharedFyis,
        residentGroups: shiftResidentGroups,
      });
    }

    const hasContent =
      allShiftsFyis.length > 0 ||
      allShiftsResidentGroups.length > 0 ||
      shiftGroups.length > 0;

    if (hasContent) {
      roleSections.push({
        roleId: role.id,
        roleName: role.name,
        roleCode: role.code,
        allShiftsFyis,
        allShiftsResidentGroups,
        shiftGroups,
      });
    }
  }

  const facility: BinderFacility = {
    siteName: state.facility.siteName,
    street: state.facility.street,
    addressLine2: state.facility.addressLine2,
    city: state.facility.city,
    province: state.facility.province,
    postalCode: state.facility.postalCode,
    mainPhone: state.facility.mainPhone || undefined,
    unitPhone: state.facility.unitPhone || undefined,
    fax: state.facility.fax || undefined,
  };

  return {
    facility,
    binderVersion: state.binderState.version,
    generatedAt: now,
    scopeLabel,
    binderStatus: state.binderState.status,
    confirmedCurrentAt: state.binderState.lastConfirmedAt,
    sharedFyis,
    sharedResidentGroups,
    roleSections,
    developerFooter: state.settings.developerFooterEnabled ? 'TaskSheet · SoftVibeSolutions' : undefined,
  };
}
