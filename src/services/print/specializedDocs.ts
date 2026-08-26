import { db } from '../../db';
import { Facility, Resident, ResidentTask, Shift, Role } from '../../types';
import { isDateDue, sortRoomNumbers } from '../generator';

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
  wounds: WoundScheduleItem[];
  totalActiveWounds: number;
  totalResidentsWithWounds: number;
}

export function buildWoundScheduleModel(currentDateStr: string): WoundScheduleModel {
  const state = db.getState();
  const facility = state.facility;
  const activeWounds = (state.wounds || [])
    .filter(w => w.status !== 'resolved')
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
      frequency: w.frequency.replace(/_/g, ' '),
      bathingRelation: w.bathingRelation === 'after_bath' ? 'After scheduled shower/bath' : w.bathingRelation === 'before_bath' ? 'Before shower' : 'Independent of bathing',
      instructions: w.instructions,
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
    wounds,
    totalActiveWounds: wounds.length,
    totalResidentsWithWounds: uniqueResidentIds.size,
  };
}

// ─── 3. Resident Care Summary Types & Builder ────────────────────────────────

export interface ResidentCareSummaryModel {
  facility: Facility;
  resident: Resident;
  formattedDate: string;
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
  const tasks = state.residentTasks.filter(t => t.residentId === resident.id && t.isActive !== false);
  const wounds = (state.wounds || []).filter(w => w.residentId === resident.id && w.status !== 'resolved');
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
        frequency: t.frequency.replace(/_/g, ' '),
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
        frequency: w.frequency.replace(/_/g, ' '),
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
    shifts,
  };
}
