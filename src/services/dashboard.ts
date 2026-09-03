import { AppDatabaseState, FYI, Resident, ResidentAttentionItem, Wound } from '../types';
import { getResidentStatusLabel } from './residentStatus';
import { sortRoomNumbers } from './generator';
import { buildBathingScheduleModel } from './print/specializedDocs';

/** True when a date-bounded item is in its active window for `today`
 *  (inclusive on both ends). Shared by resident attention items and FYIs. */
export function isWithinActiveWindow(startDate: string | undefined, endDate: string | undefined, today: string): boolean {
  if (startDate && startDate > today) return false;
  if (endDate && endDate < today) return false;
  return true;
}

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
      if (!isWithinActiveWindow(item.startDate, item.endDate, today)) continue;
      entries.push({ resident, item, endingSoon: item.endDate === today || item.endDate === tomorrow });
    }
  }
  return entries.sort((a, b) => sortRoomNumbers(a.resident.roomNumber, b.resident.roomNumber));
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
  const importanceRank: Record<FYI['importance'], number> = { urgent: 0, high: 1, normal: 2 };
  return state.fyis
    .filter(f => f.status === 'active' && isWithinActiveWindow(f.effectiveDate, f.expiryDate, today))
    .sort((a, b) => {
      const rankDiff = importanceRank[a.importance] - importanceRank[b.importance];
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
