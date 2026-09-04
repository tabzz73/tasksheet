import { AppDatabaseState, DashboardWidgetConfig, DashboardWidgetId, FYI, OperationalPriority, Resident, ResidentAttentionItem, ResidentTask, Wound } from '../types';
import { getResidentStatusLabel, isResidentCurrent } from './residentStatus';
import { sortRoomNumbers } from './generator';
import { buildBathingScheduleModel } from './print/specializedDocs';
import { isWithinActiveWindow } from './recurrence';
import { DEFAULT_DASHBOARD_LAYOUT } from '../data/defaultData';

export { isWithinActiveWindow };

const PRIORITY_RANK: Record<OperationalPriority, number> = { urgent: 0, high: 1, normal: 2 };

const KNOWN_WIDGET_IDS: readonly DashboardWidgetId[] = [
  'unit_situation', 'away_from_unit', 'resident_attention', 'resident_follow_up',
  'latest_fyi', 'code_of_month', 'todays_bathing', 'wound_attention',
];

/** Defensive read of the Dashboard's saved layout — mirrors the same
 *  "corrupted localStorage/backup can never crash the app" pattern already
 *  used for saved print packages. A non-array value, or one containing
 *  malformed entries, falls back to the default layout entirely rather
 *  than letting `.filter`/`.map` throw on a shape nothing here produced
 *  (e.g. a hand-edited backup file, or a value from an even older schema). */
export function getValidatedDashboardLayout(state: AppDatabaseState): DashboardWidgetConfig[] {
  const raw = state.settings.dashboardLayout;
  if (!Array.isArray(raw)) return DEFAULT_DASHBOARD_LAYOUT;
  const cleaned = raw.filter((w): w is DashboardWidgetConfig =>
    Boolean(w) && typeof w === 'object' &&
    KNOWN_WIDGET_IDS.includes((w as DashboardWidgetConfig).id) &&
    typeof (w as DashboardWidgetConfig).visible === 'boolean'
  );
  return cleaned.length > 0 ? cleaned : DEFAULT_DASHBOARD_LAYOUT;
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
    if (!isResidentCurrent(resident.status)) continue;
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
    .filter(f => {
      if (!f.residentId) return true;
      const resident = state.residents.find(r => r.id === f.residentId);
      return Boolean(resident && isResidentCurrent(resident.status));
    })
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
    if (!resident || !isResidentCurrent(resident.status)) continue;
    const dateLabel = !end ? 'Active' : end === today ? 'Ends today' : `Through ${formatShortDate(end)}`;
    entries.push({ resident, task, dateLabel, endingSoon: end === today || end === tomorrow });
  }
  return entries.sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.task.priority || 'normal'] - PRIORITY_RANK[b.task.priority || 'normal'];
    if (rankDiff !== 0) return rankDiff;
    return sortRoomNumbers(a.resident.roomNumber, b.resident.roomNumber);
  });
}

export type UnitSituationEntryKind = 'attention' | 'follow_up' | 'away' | 'fyi';

export interface UnitSituationEntry {
  kind: UnitSituationEntryKind;
  id: string;
  roomNumber?: string;
  label: string;
  /** Opens the resident profile when clicked; undefined for unscoped FYIs. */
  residentId?: string;
  /** 'away' entries only — picks Hospital vs. a neutral away icon. */
  isHospital?: boolean;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** The flagship huddle briefing: a SELECTIVE summary of the highest-priority
 *  items across every source (Resident Attention, Resident Follow-up, Away
 *  From Unit, urgent FYIs) — not an exhaustive re-listing of everything
 *  already shown on its own dedicated card. FYI text is truncated to a
 *  short line here specifically so this card never duplicates the full FYI
 *  text the Latest FYI card already shows. Capped to `limit` items so a
 *  quiet shift renders a short, scannable list instead of every record. */
export function getUnitSituationSummary(state: AppDatabaseState, today: string, limit = 6): UnitSituationEntry[] {
  const pool: (UnitSituationEntry & { rank: number })[] = [];

  for (const { resident, item } of getActiveResidentAttentionItems(state, today)) {
    pool.push({
      kind: 'attention',
      id: `att_${item.id}`,
      roomNumber: resident.roomNumber,
      label: item.type,
      residentId: resident.id,
      rank: PRIORITY_RANK[item.importance || 'normal'],
    });
  }

  for (const { resident, task, dateLabel } of getResidentFollowUpTasks(state, today)) {
    pool.push({
      kind: 'follow_up',
      id: `fu_${task.id}`,
      roomNumber: resident.roomNumber,
      label: `${task.title} — ${dateLabel}`,
      residentId: resident.id,
      rank: PRIORITY_RANK[task.priority || 'normal'],
    });
  }

  for (const { resident, statusLabel } of getAwayResidents(state)) {
    pool.push({
      kind: 'away',
      id: `away_${resident.id}`,
      roomNumber: resident.roomNumber,
      label: statusLabel,
      residentId: resident.id,
      isHospital: resident.status === 'in_hospital',
      rank: 1, // "important" tier — not clinically urgent, but not routine either
    });
  }

  // Only FYIs already important enough to warrant a mention — a normal FYI
  // belongs solely on the Latest FYI card, never duplicated here.
  for (const fyi of getDashboardFyis(state, today, 20).filter(f => f.importance !== 'normal')) {
    pool.push({
      kind: 'fyi',
      id: `fyi_${fyi.id}`,
      label: truncate(fyi.text, 70),
      rank: PRIORITY_RANK[fyi.importance],
    });
  }

  return pool
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ rank: _rank, ...entry }) => entry);
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
