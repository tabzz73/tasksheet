import { db } from '../../db';
import { Facility, Resident, ResidentTask, Shift, Role, Wound } from '../../types';
import { isDateDue, sortRoomNumbers } from '../generator';
import { formatRecurrenceHuman, isRecurrenceScheduleEnded } from '../recurrence';

// ─── 1. Bathing Schedule Types & Builder ─────────────────────────────────────

export interface BathingSlot {
  dayNumber: number; // 0=Sun, 1=Mon ... 6=Sat (or 1..7 Mon..Sun)
  dayLabel: string;  // 'Mon', 'Tue', etc.
  scheduled: boolean;
  time?: string;
  shiftCode?: string;
  instructions?: string;
  notes?: string;
}

export interface BathingResidentRow {
  residentId: string;
  roomNumber: string;
  residentName: string;
  status: string;
  assistanceLevel?: string;
  notes?: string;
  slots: Record<number, BathingSlot>; // keyed by 1=Mon..7=Sun
}

export interface BathingScheduleModel {
  facility: Facility;
  title: string;
  weekRange: string;
  dateStr: string;
  generatedAt?: string;
  days: Array<{ dayNumber: number; label: string; shortDate: string }>;
  rows: BathingResidentRow[];
  dailyTotals: Record<number, number>; // dayNumber -> total baths
  targetCapacityPerDay: number;
}

export function buildBathingScheduleModel(currentDateStr: string): BathingScheduleModel {
  const state = db.getState();
  const facility = state.facility;
  const residents = [...state.residents]
    .filter(r => r.status === 'active')
    .sort((a, b) => sortRoomNumbers(a.roomNumber, b.roomNumber));
  
  const tasks = state.residentTasks.filter(t => t.isActive !== false);
  const shifts = state.shifts;
  const fyis = state.fyis.filter(f => f.status === 'active');

  // Calculate the Monday-Sunday week bounds based on currentDateStr
  const current = new Date(currentDateStr + 'T12:00:00');
  const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const distanceToMonday = (dayOfWeek + 6) % 7; // distance from Mon (0 if Mon)
  
  const monday = new Date(current);
  monday.setDate(current.getDate() - distanceToMonday);

  const days: Array<{ dayNumber: number; label: string; shortDate: string }> = [];
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayNumber = i + 1; // 1=Mon, 2=Tue, ..., 7=Sun
    const shortDate = d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    days.push({ dayNumber, label: dayLabels[i], shortDate });
  }

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekRange = `${monday.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  const dailyTotals: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  const rows: BathingResidentRow[] = residents.map(res => {
    // Find bathing/shower tasks for this resident
    const residentBathingTasks = tasks.filter(t => {
      if (t.residentId !== res.id) return false;
      const isBathingCategory = t.category?.toLowerCase().includes('bath') || t.category?.toLowerCase().includes('hygiene');
      const isBathingTitle = t.title?.toLowerCase().includes('shower') || t.title?.toLowerCase().includes('bath');
      return isBathingCategory || isBathingTitle;
    });

    // Find transfer / safety FYIs
    const resFyis = fyis.filter(f => f.residentId === res.id);
    const safetyFyi = resFyis.find(f => f.category?.toLowerCase() === 'safety' || f.text.toLowerCase().includes('transfer') || f.text.toLowerCase().includes('lift'));
    const prefFyi = resFyis.find(f => f.category?.toLowerCase() === 'preference' || f.text.toLowerCase().includes('shower') || f.text.toLowerCase().includes('bath'));

    const slots: Record<number, BathingSlot> = {};
    for (let i = 1; i <= 7; i++) {
      slots[i] = {
        dayNumber: i,
        dayLabel: dayLabels[i - 1],
        scheduled: false,
      };
    }

    residentBathingTasks.forEach(t => {
      const shift = shifts.find(s => s.id === t.shiftId);
      const shiftCode = shift?.shortCode || (shift?.name.includes('Day') ? 'D1' : 'E1');

      if (t.frequency === 'daily') {
        for (let i = 1; i <= 7; i++) {
          slots[i] = {
            dayNumber: i,
            dayLabel: dayLabels[i - 1],
            scheduled: true,
            time: t.time || '0930',
            shiftCode,
            instructions: t.instructions,
          };
          dailyTotals[i] = (dailyTotals[i] || 0) + 1;
        }
      } else if (t.frequency === 'selected_days' || t.frequency === 'weekly') {
        const selected = t.recurrenceRule?.selectedDays || [1, 4]; // default Mon/Thu
        selected.forEach(d => {
          // Normalize 0..6 (0=Sun) to 1..7 (1=Mon..7=Sun)
          const normDay = d === 0 ? 7 : d;
          if (normDay >= 1 && normDay <= 7) {
            slots[normDay] = {
              dayNumber: normDay,
              dayLabel: dayLabels[normDay - 1],
              scheduled: true,
              time: t.time || '0930',
              shiftCode,
              instructions: t.instructions,
            };
            dailyTotals[normDay] = (dailyTotals[normDay] || 0) + 1;
          }
        });
      }
    });

    let assistanceLevel = '1-Person Assist';
    if (safetyFyi?.text.toLowerCase().includes('2-person') || safetyFyi?.text.toLowerCase().includes('two person') || safetyFyi?.text.toLowerCase().includes('lift')) {
      assistanceLevel = '2-Person Lift';
    } else if (safetyFyi?.text.toLowerCase().includes('transfer belt')) {
      assistanceLevel = '1-Person Belt';
    }

    return {
      residentId: res.id,
      roomNumber: res.roomNumber,
      residentName: `${res.firstName} ${res.lastName}`,
      status: res.status,
      assistanceLevel,
      notes: prefFyi?.text || (residentBathingTasks[0]?.instructions) || res.notes,
      slots,
    };
  });

  return {
    facility,
    title: 'BATHING & HYGIENE MASTER SCHEDULE',
    weekRange,
    dateStr: currentDateStr,
    generatedAt: new Date().toISOString(),
    days,
    rows,
    dailyTotals,
    targetCapacityPerDay: 6,
  };
}

// ─── 2. Wound Schedule Types & Builder ───────────────────────────────────────

export interface WoundScheduleItem {
  id: string;
  roomNumber: string;
  residentName: string;
  siteLocation: string;
  firstAction: string;
  frequency: string;
  bathingRelation: string;
  instructions?: string;
  supplies: string;
  assessmentType: 'none' | 'partial' | 'full';
  scheduledTime: string;
  shiftCode: string;
  roleName: string;
  configurationWarning?: string;
}

export interface WoundScheduleModel {
  facility: Facility;
  title: string;
  dateStr: string;
  formattedDate: string;
  generatedAt: string;
  wounds: WoundScheduleItem[];
  totalActiveWounds: number;
  totalResidentsWithWounds: number;
}

export function buildWoundScheduleModel(currentDateStr: string): WoundScheduleModel {
  const state = db.getState();
  const facility = state.facility;
  const activeWounds = (state.wounds || [])
    .filter(w => w.status === 'active' || w.status === 'healing')
    .filter(w => state.residents.some(resident => resident.id === w.residentId && resident.status === 'active'))
    .filter(w => isDateDue(currentDateStr, w.frequency, w.recurrenceRule, w.createdAt));
  
  const residents = state.residents;

  const wounds: WoundScheduleItem[] = activeWounds.map(w => {
    const res = residents.find(r => r.id === w.residentId);
    const shift = state.shifts.find(item => item.id === w.shiftId);
    const role = shift ? state.roles.find(item => item.id === shift.roleId) : undefined;
    const configurationWarning = !shift
      ? 'Needs LPN/RN shift assignment before operational printing.'
      : !w.time
        ? 'Needs a scheduled time before operational printing.'
        : undefined;
    return {
      id: w.id,
      roomNumber: res?.roomNumber || '—',
      residentName: res ? `${res.firstName} ${res.lastName}` : 'Unknown Resident',
      siteLocation: w.siteLocation,
      firstAction: w.firstAction === 'treatment'
        ? 'Wound Treatment'
        : w.firstAction === 'dressing_change'
          ? 'Dressing Change'
          : 'Assessment & Staging',
      frequency: formatRecurrenceHuman(w.recurrenceRule, w.frequency),
      bathingRelation: w.bathingRelation === 'after_bath' ? 'After scheduled shower/bath' : w.bathingRelation === 'before_bath' ? 'Before shower' : 'Independent of bathing',
      instructions: w.protocol || w.instructions,
      supplies: (w.supplies || []).map(item => item.unitSize && !item.name.includes(item.unitSize) ? `${item.name} — ${item.unitSize}` : item.name).join('; ') || '—',
      assessmentType: w.assessmentType || 'none',
      scheduledTime: w.time || '—',
      shiftCode: shift ? `${shift.shortCode} — ${shift.name}` : 'Unassigned clinical shift',
      roleName: role?.name || 'Unassigned',
      configurationWarning,
    };
  }).sort((a, b) => sortRoomNumbers(a.roomNumber, b.roomNumber));

  const uniqueResidentIds = new Set(activeWounds.map(w => w.residentId));

  const [y, m, d] = currentDateStr.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return {
    facility,
    title: 'WOUND & DRESSING TREATMENT SCHEDULE',
    dateStr: currentDateStr,
    formattedDate,
    generatedAt: new Date().toISOString(),
    wounds,
    totalActiveWounds: wounds.length,
    totalResidentsWithWounds: uniqueResidentIds.size,
  };
}

// ─── Weekly Wound Overview & Supply Re-Order ────────────────────────────────

export interface WoundWeekDay {
  dateStr: string;
  label: string;
  shortDate: string;
}

export interface WeeklyWoundOverviewRow {
  woundId: string;
  residentId: string;
  roomNumber: string;
  residentName: string;
  location: string;
  protocol: string;
  supplies: string;
  frequency: string;
  slots: Array<{ dateStr: string; due: boolean; marker?: string }>;
}

export interface WeeklyWoundOverviewModel {
  facility: Facility;
  title: string;
  weekRange: string;
  anchorDate: string;
  generatedAt?: string;
  days: WoundWeekDay[];
  rows: WeeklyWoundOverviewRow[];
  dailyTotals: number[];
  totalScheduledTreatments: number;
  totalActiveResidents: number;
  totalActiveWounds: number;
  fullAssessmentCount: number;
  partialAssessmentCount: number;
}

export interface WoundSupplyReorderRow {
  key: string;
  supplyName: string;
  unitSize?: string;
  unit?: string;
  residentRooms: string[];
  woundLocations: string[];
  scheduledUses: number | null;
  quantityPerUse: number | null;
  estimatedNeed: number | null;
}

export interface WoundSupplyReorderModel {
  facility: Facility;
  title: string;
  scope: 'current_week' | 'all_active';
  scopeLabel: string;
  weekRange: string;
  rows: WoundSupplyReorderRow[];
  activeWoundCount: number;
  activeResidentCount: number;
  generatedDate: string;
  generatedAt?: string;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getWoundWeek(anchorDate: string): { days: WoundWeekDay[]; weekRange: string } {
  const [year, month, day] = anchorDate.split('-').map(Number);
  const anchor = new Date(year, month - 1, day, 12);
  const weekStartsOn = db.getState().settings.operationalWeekStartsOn ?? 1;
  const weekStart = new Date(anchor);
  weekStart.setDate(anchor.getDate() - ((anchor.getDay() - weekStartsOn + 7) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const current = new Date(weekStart);
    current.setDate(weekStart.getDate() + index);
    return {
      dateStr: toIsoDate(current),
      label: current.toLocaleDateString('en-CA', { weekday: 'short' }),
      shortDate: current.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }),
    };
  });
  const last = new Date(weekStart);
  last.setDate(weekStart.getDate() + 6);
  return {
    days,
    weekRange: `${weekStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`,
  };
}

function activeOperationalWounds(): Array<{ wound: Wound; resident: Resident; shift?: Shift }> {
  const state = db.getState();
  return state.wounds.flatMap(wound => {
    if (wound.status !== 'active' && wound.status !== 'healing') return [];
    const resident = state.residents.find(item => item.id === wound.residentId && item.status === 'active');
    if (!resident) return [];
    const shift = state.shifts.find(item => item.id === wound.shiftId && item.isActive !== false);
    return [{ wound, resident, shift }];
  });
}

export function buildWeeklyWoundOverviewModel(anchorDate: string): WeeklyWoundOverviewModel {
  const state = db.getState();
  const { days, weekRange } = getWoundWeek(anchorDate);
  const dailyTotals = Array(7).fill(0) as number[];
  let fullAssessmentCount = 0;
  let partialAssessmentCount = 0;

  const rows = activeOperationalWounds().map(({ wound, resident, shift }) => {
    const slots = days.map((day, index) => {
      const due = isDateDue(day.dateStr, wound.frequency, wound.recurrenceRule, wound.createdAt);
      if (due) dailyTotals[index] += 1;
      const assessment = wound.assessmentType === 'full' ? 'FULL' : wound.assessmentType === 'partial' ? 'PARTIAL' : '';
      if (due && assessment === 'FULL') fullAssessmentCount += 1;
      if (due && assessment === 'PARTIAL') partialAssessmentCount += 1;
      return { dateStr: day.dateStr, due, marker: due ? [wound.time || '—', shift?.shortCode || 'UNASSIGNED', assessment].filter(Boolean).join(' · ') : undefined };
    });
    return {
      woundId: wound.id,
      residentId: resident.id,
      roomNumber: resident.roomNumber,
      residentName: `${resident.firstName} ${resident.lastName}`,
      location: wound.siteLocation,
      protocol: wound.protocol || wound.instructions || 'Follow configured wound protocol.',
      supplies: (wound.supplies || []).map(item => item.unitSize && !item.name.includes(item.unitSize) ? `${item.name} — ${item.unitSize}` : item.name).join('; ') || '—',
      frequency: formatRecurrenceHuman(wound.recurrenceRule, wound.frequency),
      slots,
    };
  }).filter(row => row.slots.some(slot => slot.due))
    .sort((a, b) => sortRoomNumbers(a.roomNumber, b.roomNumber) || a.residentName.localeCompare(b.residentName) || a.location.localeCompare(b.location));

  return {
    facility: state.facility,
    title: 'WEEKLY WOUND CARE OVERVIEW',
    weekRange,
    anchorDate,
    generatedAt: new Date().toISOString(),
    days,
    rows,
    dailyTotals,
    totalScheduledTreatments: dailyTotals.reduce((sum, count) => sum + count, 0),
    totalActiveResidents: new Set(rows.map(row => row.residentId)).size,
    totalActiveWounds: rows.length,
    fullAssessmentCount,
    partialAssessmentCount,
  };
}

export function buildWoundSupplyReorderModel(anchorDate: string, scope: 'current_week' | 'all_active'): WoundSupplyReorderModel {
  const state = db.getState();
  const { days, weekRange } = getWoundWeek(anchorDate);
  const aggregates = new Map<string, WoundSupplyReorderRow>();
  const selected = activeOperationalWounds().filter(({ wound }) => scope === 'all_active' || days.some(day => isDateDue(day.dateStr, wound.frequency, wound.recurrenceRule, wound.createdAt)));

  selected.forEach(({ wound, resident }) => {
    const uses = scope === 'current_week'
      ? days.filter(day => isDateDue(day.dateStr, wound.frequency, wound.recurrenceRule, wound.createdAt)).length
      : null;
    (wound.supplies || []).forEach(supply => {
      const key = supply.catalogId ? `catalog:${supply.catalogId}|${supply.unitSize || ''}` : `exact:${supply.name.trim()}|${supply.unitSize || ''}`;
      const catalogProduct = supply.catalogId ? state.woundSupplyCatalog.find(product => product.id === supply.catalogId) : undefined;
      const existing = aggregates.get(key) || {
        key,
        supplyName: supply.productFamily || catalogProduct?.productFamily || supply.name.trim(),
        unitSize: supply.unitSize || catalogProduct?.size,
        unit: supply.unitOfMeasure || catalogProduct?.unit,
        residentRooms: [],
        woundLocations: [],
        scheduledUses: scope === 'current_week' ? 0 : null,
        quantityPerUse: supply.quantityPerUse ?? null,
        estimatedNeed: null,
      };
      const residentRoom = `${resident.roomNumber} — ${resident.firstName} ${resident.lastName}`;
      const woundTrace = `${resident.roomNumber} — ${wound.siteLocation}`;
      if (!existing.residentRooms.includes(residentRoom)) existing.residentRooms.push(residentRoom);
      if (!existing.woundLocations.includes(woundTrace)) existing.woundLocations.push(woundTrace);
      if (existing.scheduledUses !== null && uses !== null) existing.scheduledUses += uses;
      if (existing.quantityPerUse !== null && existing.quantityPerUse !== supply.quantityPerUse) existing.quantityPerUse = null;
      aggregates.set(key, existing);
    });
  });

  return {
    facility: state.facility,
    title: 'WOUND SUPPLIES RE-ORDER LIST',
    scope,
    scopeLabel: scope === 'current_week' ? `Current week · ${weekRange}` : 'All active wounds',
    weekRange,
    rows: [...aggregates.values()].map(row => ({ ...row, estimatedNeed: row.scheduledUses !== null && row.quantityPerUse !== null ? row.scheduledUses * row.quantityPerUse : null })).sort((a, b) => a.supplyName.localeCompare(b.supplyName) || (a.unitSize || '').localeCompare(b.unitSize || '')),
    activeWoundCount: selected.length,
    activeResidentCount: new Set(selected.map(item => item.resident.id)).size,
    generatedDate: new Date().toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }),
    generatedAt: new Date().toISOString(),
  };
}

// ─── 3. Resident Care Summary Types & Builder ────────────────────────────────

export interface ResidentCareSummaryModel {
  facility: Facility;
  resident: Resident;
  formattedDate: string;
  generatedAt?: string;
  importantFYIs: Array<{ category: string; text: string; importance: string }>;
  tasksByShift: Array<{
    shift: Shift;
    role: Role;
    tasks: Array<{
      id: string;
      title: string;
      category: string;
      time?: string;
      frequency: string;
      instructions?: string;
      priority?: string;
    }>;
  }>;
  wounds: Array<{
    id: string;
    siteLocation: string;
    firstAction: string;
    frequency: string;
    bathingRelation: string;
    shiftCode: string;
    scheduledTime: string;
    instructions?: string;
  }>;
}

export function buildResidentCareSummaryModel(residentId: string, currentDateStr: string): ResidentCareSummaryModel | null {
  const state = db.getState();
  const resident = state.residents.find(r => r.id === residentId);
  if (!resident) return null;

  const facility = state.facility;
  const tasks = state.residentTasks.filter(t =>
    t.residentId === resident.id &&
    t.isActive !== false &&
    !isRecurrenceScheduleEnded(t.recurrenceRule, t.frequency, currentDateStr, t.createdAt)
  );
  const wounds = (state.wounds || []).filter(w =>
    w.residentId === resident.id &&
    (w.status === 'active' || w.status === 'healing') &&
    !isRecurrenceScheduleEnded(w.recurrenceRule, w.frequency, currentDateStr, w.createdAt)
  );
  const fyis = state.fyis.filter(f => f.residentId === resident.id && f.status === 'active');
  const shifts = state.shifts;
  const roles = state.roles;

  // Group tasks by shift
  const shiftMap = new Map<string, ResidentTask[]>();
  tasks.forEach(t => {
    const sId = t.shiftId || shifts[0]?.id || 'default';
    if (!shiftMap.has(sId)) shiftMap.set(sId, []);
    shiftMap.get(sId)!.push(t);
  });

  const tasksByShift = Array.from(shiftMap.entries()).map(([sId, sTasks]) => {
    const shift = shifts.find(s => s.id === sId) || shifts[0];
    const role = roles.find(r => r.id === shift?.roleId) || roles[0];
    const sortedTasks = [...sTasks].sort((a, b) => (a.time || '9999').localeCompare(b.time || '9999'));

    return {
      shift,
      role,
      tasks: sortedTasks.map(t => ({
        id: t.id,
        title: t.title,
        category: t.category,
        time: t.time,
        frequency: formatRecurrenceHuman(t.recurrenceRule, t.frequency),
        instructions: t.instructions,
        priority: t.priority,
      })),
    };
  });

  const [y, m, d] = currentDateStr.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return {
    facility,
    resident,
    formattedDate,
    generatedAt: new Date().toISOString(),
    importantFYIs: fyis.map(f => ({
      category: f.category,
      text: f.text,
      importance: f.importance || 'normal',
    })),
    tasksByShift,
    wounds: wounds.map(w => {
      const assignedShift = shifts.find(shift => shift.id === w.shiftId);
      return {
        id: w.id,
        siteLocation: w.siteLocation,
        firstAction: w.firstAction === 'treatment' ? 'Wound Treatment' : w.firstAction === 'dressing_change' ? 'Dressing Change' : 'Assessment',
        frequency: formatRecurrenceHuman(w.recurrenceRule, w.frequency),
        bathingRelation: w.bathingRelation === 'after_bath' ? 'After Shower' : 'Independent',
        shiftCode: assignedShift ? `${assignedShift.shortCode} — ${assignedShift.name}` : 'Needs clinical shift assignment',
        scheduledTime: w.time || 'Time required',
        instructions: w.instructions,
      };
    }),
  };
}

// ─── 4. Shift Configuration Reference Builder ────────────────────────────────

export interface ShiftConfigReferenceModel {
  facility: Facility;
  formattedDate: string;
  generatedAt?: string;
  shifts: Array<{
    shift: Shift;
    role: Role;
    unitTasksCount: number;
    residentTasksCount: number;
    unitTasks: Array<{ title: string; phase: string; time?: string; instructions?: string }>;
  }>;
}

export function buildShiftConfigReferenceModel(currentDateStr: string): ShiftConfigReferenceModel {
  const state = db.getState();
  const facility = state.facility;
  const activeShifts = state.shifts.filter(s => s.isActive !== false).sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  const roles = state.roles;
  const unitTasks = state.unitTasks.filter(u => u.isActive !== false);
  const residentTasks = state.residentTasks.filter(t => t.isActive !== false);

  const shifts = activeShifts.map(s => {
    const role = roles.find(r => r.id === s.roleId) || roles[0];
    const sUnitTasks = unitTasks.filter(u => u.shiftId === s.id);
    const sResidentTasks = residentTasks.filter(t => t.shiftId === s.id);

    return {
      shift: s,
      role,
      unitTasksCount: sUnitTasks.length,
      residentTasksCount: sResidentTasks.length,
      unitTasks: sUnitTasks.map(u => ({
        title: u.title,
        phase: u.shiftPhase,
        time: u.time,
        instructions: u.instructions,
      })),
    };
  });

  const [y, m, d] = currentDateStr.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return {
    facility,
    formattedDate,
    generatedAt: new Date().toISOString(),
    shifts,
  };
}
