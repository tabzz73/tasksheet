import { AppDatabaseState, FYI, OperationalPriority, Resident, ResidentAttentionItem, ResidentTask, Wound } from '../types';
import { getResidentStatusLabel } from './residentStatus';
import { sortRoomNumbers } from './generator';
import { buildBathingScheduleModel } from './print/specializedDocs';
import { isWithinActiveWindow } from './recurrence';

export { isWithinActiveWindow };

const PRIORITY_RANK: Record<OperationalPriority, number> = { urgent: 0, high: 1, normal: 2 };

export interface DashboardAttentionEntry {
  resident: Resident;
  item: ResidentAttentionItem;
  /** Ends today or tomorrow — worth flagging for review at huddle. */
  endingSoon: boolean;
}

/** Attention items that are active *today* — active flag set, and within
 *  their start/end date window. Items with a future start date or a past
 *  end date are excluded (they simply don't appear yet, or don't appear
 *  anymore — the record itself is preserved, never deleted). */
export function getActiveResidentAttentionItems(state: AppDatabaseState, today: string): DashboardAttentionEntry[] {
  const tomorrow = addDays(today, 1);
  const entries: DashboardAttentionEntry[] = [];
  for (const resident of state.residents) {
    for (const item of resident.attentionItems || []) {
      if (!item.active) continue;
      if (item.showOnDashboard === false) continue;
      if (!isWithinActiveWindow(item.startDate, item.endDate, today)) continue;
      entries.push({ resident, item, endingSoon: item.endDate === today || item.endDate === tomorrow });
    }
  }
  return entries.sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.item.importance || 'normal'] - PRIORITY_RANK[b.item.importance || 'normal'];
    if (rankDiff !== 0) return rankDiff;
    return sortRoomNumbers(a.resident.roomNumber, b.resident.roomNumber);
  });
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

export interface AwayResidentEntry {
  resident: Resident;
  statusLabel: string;
}

/** Residents currently away from the unit (hospital/pass/hold), for the
 *  actionable "Away From Unit" panel — not just a count. */
export function getAwayResidents(state: AppDatabaseState): AwayResidentEntry[] {
  return state.residents
    .filter(r => r.status === 'in_hospital' || r.status === 'out_on_pass' || r.status === 'on_hold')
    .sort((a, b) => sortRoomNumbers(a.roomNumber, b.roomNumber))
    .map(resident => ({ resident, statusLabel: getResidentStatusLabel(resident.status) }));
}

/** Active, currently-in-effect FYIs (respects effectiveDate/expiryDate),
 *  most operationally important first: urgent > high > normal, then most
 *  recently updated. Reuses the FYI Binder's own records — no second
 *  datastore. */
export function getDashboardFyis(state: AppDatabaseState, today: string, limit = 5): FYI[] {
  return state.fyis
    .filter(f => f.status === 'active' && f.showOnDashboard !== false && isWithinActiveWindow(f.effectiveDate, f.expiryDate, today))
    .sort((a, b) => {
      const rankDiff = PRIORITY_RANK[a.importance] - PRIORITY_RANK[b.importance];
      if (rankDiff !== 0) return rankDiff;
      return (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt);
    })
    .slice(0, limit);
}

export interface WoundAttentionEntry {
  resident: Resident;
  wound: Wound;
  isNew: boolean;
}

/** Operational (not clinical) wound awareness for the Dashboard: wounds
 *  that are new or recently updated, never a full wound list. Healed/
 *  discontinued wounds stay suppressed per existing print-suppression rules. */
export function getWoundAttentionItems(state: AppDatabaseState, today: string, recentDays = 2): WoundAttentionEntry[] {
  const cutoff = addDays(today, -recentDays);
  const entries: WoundAttentionEntry[] = [];
  for (const wound of state.wounds) {
    if (wound.status !== 'active' && wound.status !== 'healing') continue;
    const resident = state.residents.find(r => r.id === wound.residentId);
    if (!resident) continue;
    const changedAt = (wound.updatedAt || wound.createdAt).split('T')[0];
    if (changedAt < cutoff) continue;
    entries.push({ resident, wound, isNew: (wound.createdAt.split('T')[0]) >= cutoff });
  }
  return entries.sort((a, b) => sortRoomNumbers(a.resident.roomNumber, b.resident.roomNumber));
}

export interface ResidentFollowUpEntry {
  resident: Resident;
  task: ResidentTask;
  /** "Active" (no end date), "Ends today", or "Through <date>" — derived
   *  from the task's own recurrence end date, never a stored duplicate. */
  dateLabel: string;
  endingSoon: boolean;
}

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

/** Resident Tasks the creator explicitly flagged with `showOnDashboard` —
 *  time-limited or exception follow-up (RAI tracking, weight monitoring,
 *  temporary behaviour tracking...) that the LPN shouldn't miss at huddle,
 *  without turning every routine task into Dashboard noise. Reuses the
 *  task's own `recurrenceRule` start/end dates rather than a second set of
 *  date fields, and the task stays a Task — this only changes where staff
 *  are reminded about it. */
export function getResidentFollowUpTasks(state: AppDatabaseState, today: string): ResidentFollowUpEntry[] {
  const tomorrow = addDays(today, 1);
  const entries: ResidentFollowUpEntry[] = [];
  for (const task of state.residentTasks) {
    if (!task.isActive || task.showOnDashboard !== true) continue;
    const start = task.recurrenceRule?.startDate;
    const end = task.recurrenceRule?.endDate;
    if (!isWithinActiveWindow(start, end, today)) continue;
    const resident = state.residents.find(r => r.id === task.residentId);
    if (!resident) continue;
    const dateLabel = !end ? 'Active' : end === today ? 'Ends today' : `Through ${formatShortDate(end)}`;
    entries.push({ resident, task, dateLabel, endingSoon: end === today || end === tomorrow });
  }
  return entries.sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.task.priority || 'normal'] - PRIORITY_RANK[b.task.priority || 'normal'];
    if (rankDiff !== 0) return rankDiff;
    return sortRoomNumbers(a.resident.roomNumber, b.resident.roomNumber);
  });
}

/** Count of residents scheduled to bathe on `today`, reusing the exact same
 *  weekly bathing model the Bathing Grid print builds — no parallel
 *  scheduling calculation. */
export function getTodaysBathingCount(state: AppDatabaseState, today: string): number {
  const model = buildBathingScheduleModel(today);
  const current = new Date(today + 'T12:00:00');
  const weekStartsOn = state.settings.operationalWeekStartsOn ?? 1;
  const dayNumber = ((current.getDay() - weekStartsOn + 7) % 7) + 1; // 1=Mon..7=Sun, matches the builder
  return model.dailyTotals[dayNumber] || 0;
}
