import { AppDatabaseState, AttentionItem, AttentionScope, DashboardWidgetConfig, DashboardWidgetId, EmergencyCode, FYI, OperationalPriority, Resident, ResidentTask, Wound } from '../types';
import { getResidentStatusLabel, isResidentCurrent } from './residentStatus';
import { sortRoomNumbers } from './generator';
import { buildBathingScheduleModel } from './print/specializedDocs';
import { getDaysDifference, isWithinActiveWindow, localDateFromTimestamp } from './recurrence';
import { DEFAULT_DASHBOARD_LAYOUT } from '../data/defaultData';

export { isWithinActiveWindow };

const PRIORITY_RANK: Record<OperationalPriority, number> = { urgent: 0, high: 1, normal: 2 };

/** Conservative default — a task carried forward this many times escalates
 *  to Needs Review in Resident Follow-up if the facility hasn't set its own
 *  threshold in Settings. */
export const DEFAULT_FOLLOW_UP_ESCALATION_THRESHOLD = 3;

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

export interface AttentionEntry {
  item: AttentionItem;
  /** Resolved only for scope === 'resident'. */
  resident?: Resident;
  /** Ends today or tomorrow — worth flagging for review at huddle. */
  endingSoon: boolean;
}

/** Active Attention items — active flag set, within their start/end date
 *  window, and (for resident-scoped items) attached to a still-current
 *  resident. Pass `scope` to restrict to one scope; omit for all three.
 *  Attention is awareness only: it is never filtered by / routed through
 *  print or Shift Workspace logic. */
export function getActiveAttentionItems(state: AppDatabaseState, today: string, scope?: AttentionScope): AttentionEntry[] {
  const tomorrow = addDays(today, 1);
  const entries: AttentionEntry[] = [];
  for (const item of state.attentionItems) {
    if (scope && item.scope !== scope) continue;
    if (!item.active) continue;
    if (item.showOnDashboard === false) continue;
    if (!isWithinActiveWindow(item.startDate, item.endDate, today)) continue;
    let resident: Resident | undefined;
    if (item.scope === 'resident') {
      resident = state.residents.find(r => r.id === item.residentId);
      if (!resident || !isResidentCurrent(resident.status)) continue;
    }
    entries.push({ item, resident, endingSoon: item.endDate === today || item.endDate === tomorrow });
  }
  return entries.sort((a, b) => {
    const rankDiff = PRIORITY_RANK[a.item.priority || 'normal'] - PRIORITY_RANK[b.item.priority || 'normal'];
    if (rankDiff !== 0) return rankDiff;
    if (a.resident && b.resident) return sortRoomNumbers(a.resident.roomNumber, b.resident.roomNumber);
    return a.item.title.localeCompare(b.item.title);
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

function formatShortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

/** "Due today" / "N day(s) overdue" — computed from the ORIGINAL due date,
 *  never from a later carry-forward date, so a repeatedly-delayed task
 *  doesn't look artificially new. `dueDate` must be `<= today`. */
export function formatOverdueLabel(dueDate: string, today: string): string {
  const days = getDaysDifference(dueDate, today);
  if (days <= 0) return 'Due today';
  return `${days} day${days === 1 ? '' : 's'} overdue`;
}

/** "Day X/Y" (bounded) or "Active · Day X" (open-ended) tracking progress,
 *  inclusive of both the start and end date. A one-day period (start ===
 *  end) reads "Day 1/1 · Ends today", never "Day 0/1". `startDate` must be
 *  `<= today` and, if set, `endDate` must be `>= today` (expired periods
 *  are handled by the caller, not this formatter). */
export function formatTrackingProgressLabel(startDate: string, endDate: string | undefined, today: string): string {
  const day = Math.max(1, getDaysDifference(startDate, today) + 1);
  if (!endDate) return `Active · Day ${day}`;
  const totalDays = Math.max(1, getDaysDifference(startDate, endDate) + 1);
  const clampedDay = Math.min(day, totalDays);
  return `Day ${clampedDay}/${totalDays}${today === endDate ? ' · Ends today' : ''}`;
}

export type ResidentFollowUpBucket =
  | 'needs_review' | 'overdue' | 'due_today' | 'carry_forward'
  | 'tracking_active' | 'tracking_open_ended';

export interface ResidentFollowUpEntry {
  resident: Resident;
  task: ResidentTask;
  bucket: ResidentFollowUpBucket;
  /** Ready-to-render status/progress text, e.g. "2 days overdue · Carried
   *  forward", "Day 4/5", "Active · Day 4", "Needs Review · 3 days overdue". */
  statusLabel: string;
  isTracking: boolean;
  overdueDays?: number;
  carryForwardCount: number;
  /** True when this entry is severe enough (explicit Needs Review, or
   *  escalated via the carry-forward threshold) to warrant surfacing even
   *  without an explicit `showInHuddle` flag. */
  needsReview: boolean;
}

/** Resident Tasks the creator explicitly flagged with `showOnDashboard` —
 *  the place unfinished follow-up (a missed one-off task, or an active
 *  tracking period) stays visible until it's resolved or no longer
 *  relevant. Sourced exclusively from ResidentTask; never FYI or
 *  Attention. Entirely a Dashboard/Huddle concern — never read by the
 *  generator or print output. */
export function getResidentFollowUpTasks(state: AppDatabaseState, today: string): ResidentFollowUpEntry[] {
  const threshold = state.settings.residentFollowUpEscalationThreshold ?? DEFAULT_FOLLOW_UP_ESCALATION_THRESHOLD;
  const entries: ResidentFollowUpEntry[] = [];

  for (const task of state.residentTasks) {
    if (!task.isActive || task.showOnDashboard !== true) continue;
    const resident = state.residents.find(r => r.id === task.residentId);
    if (!resident || !isResidentCurrent(resident.status)) continue;

    const status = task.followUpStatus || 'due';
    if (status === 'done' || status === 'no_longer_needed') continue;
    const carryForwardCount = task.followUpCarryForwardCount || 0;

    if (task.trackingConfig) {
      const start = task.recurrenceRule?.startDate;
      const end = task.recurrenceRule?.endDate;
      if (!start) continue;
      const expired = Boolean(end) && today > end!;

      if (expired) {
        // Past its bounded end date: stop showing as active tracking. If it
        // was explicitly flagged Needs Review, surface it overdue-style
        // instead of silently dropping it; otherwise suppress it.
        if (status !== 'needs_review') continue;
        entries.push({
          resident, task, bucket: 'needs_review',
          statusLabel: `Needs Review · ${formatOverdueLabel(end!, today)}`,
          isTracking: true, overdueDays: getDaysDifference(end!, today), carryForwardCount, needsReview: true,
        });
        continue;
      }

      if (!isWithinActiveWindow(start, end, today)) continue; // not yet started
      const label = formatTrackingProgressLabel(start, end, today);
      const escalated = status === 'needs_review';
      entries.push({
        resident, task,
        bucket: escalated ? 'needs_review' : (end ? 'tracking_active' : 'tracking_open_ended'),
        statusLabel: escalated ? `Needs Review · ${label}` : label,
        isTracking: true, carryForwardCount, needsReview: escalated,
      });
      continue;
    }

    // Discrete due-date follow-up task (e.g. a one-off sample collection).
    const dueDate = task.followUpDueDate || task.recurrenceRule?.startDate || localDateFromTimestamp(task.createdAt);
    if (dueDate > today) continue; // not due yet

    const overdueDays = getDaysDifference(dueDate, today);
    const escalated = status === 'carry_forward' && carryForwardCount >= threshold;
    const needsReview = status === 'needs_review' || escalated;

    let bucket: ResidentFollowUpBucket;
    if (needsReview) bucket = 'needs_review';
    else if (status === 'carry_forward') bucket = 'carry_forward';
    else if (overdueDays > 0) bucket = 'overdue';
    else bucket = 'due_today';

    const parts = [overdueDays > 0 ? formatOverdueLabel(dueDate, today) : 'Due today'];
    if (carryForwardCount > 0) parts.push(`Carried forward${carryForwardCount > 1 ? ` ${carryForwardCount}×` : ''}`);
    let statusLabel = parts.join(' · ');
    if (needsReview) statusLabel = `Needs Review · ${statusLabel}`;

    entries.push({ resident, task, bucket, statusLabel, isTracking: false, overdueDays, carryForwardCount, needsReview });
  }

  const BUCKET_RANK: Record<ResidentFollowUpBucket, number> = {
    needs_review: 0, overdue: 1, due_today: 2, carry_forward: 3, tracking_active: 4, tracking_open_ended: 5,
  };
  return entries.sort((a, b) => {
    const bucketDiff = BUCKET_RANK[a.bucket] - BUCKET_RANK[b.bucket];
    if (bucketDiff !== 0) return bucketDiff;
    const overdueDiff = (b.overdueDays || 0) - (a.overdueDays || 0);
    if (overdueDiff !== 0) return overdueDiff;
    const rankDiff = PRIORITY_RANK[a.task.priority || 'normal'] - PRIORITY_RANK[b.task.priority || 'normal'];
    if (rankDiff !== 0) return rankDiff;
    return sortRoomNumbers(a.resident.roomNumber, b.resident.roomNumber);
  });
}

export interface UnitSituationEntry {
  id: string;
  label: string;
  dateLabel: string;
  scope: 'unit' | 'site';
}

function formatAttentionDateLabel(item: AttentionItem, today: string): string {
  if (!item.endDate) return item.startDate > today ? `Starts ${formatShortDate(item.startDate)}` : 'Ongoing';
  if (item.endDate === today) return 'Through today';
  return item.startDate > today ? `${formatShortDate(item.startDate)}–${formatShortDate(item.endDate)}` : `Through ${formatShortDate(item.endDate)}`;
}

/** "What unusual or temporary things are happening on the unit/site right
 *  now?" — sourced EXCLUSIVELY from active Unit + Site scoped Attention
 *  items. Deliberately does not pull in FYIs, Resident Tasks, Resident
 *  Attention, or wounds: those already have their own dedicated Dashboard
 *  cards, and duplicating them here is exactly what made this card
 *  confusing before. Resident-scoped situations belong on the Resident
 *  Attention card instead. */
export function getUnitSituationSummary(state: AppDatabaseState, today: string): UnitSituationEntry[] {
  return getActiveAttentionItems(state, today)
    .filter(({ item }) => item.scope === 'unit' || item.scope === 'site')
    .map(({ item }) => ({
      id: item.id,
      label: item.title,
      dateLabel: formatAttentionDateLabel(item, today),
      scope: item.scope as 'unit' | 'site',
    }));
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

export interface HuddleBriefing {
  today: string;
  census: { activeCount: number; inHospitalCount: number; outOnPassCount: number; onHoldCount: number };
  away: AwayResidentEntry[];
  /** Unit + Site scoped Attention, showInHuddle only. */
  unitSiteAttention: AttentionEntry[];
  /** Resident-scoped Attention, showInHuddle only. */
  residentAttention: AttentionEntry[];
  /** Resident Tasks flagged showOnDashboard AND (showInHuddle OR severe
   *  enough to warrant surfacing on its own — Needs Review, explicit or
   *  escalated via the carry-forward threshold). */
  residentFollowUp: ResidentFollowUpEntry[];
  /** FYIs flagged showInHuddle. */
  importantFyis: FYI[];
  codeOfMonth?: EmergencyCode;
}

/** Huddle is NOT a record type — it is a read-only briefing view assembled
 *  from existing sources, filtered to items the creator explicitly flagged
 *  `showInHuddle`. Nothing here is stored; everything is derived fresh from
 *  Attention / Resident Task / FYI / resident status each time it's opened. */
export function getHuddleBriefing(state: AppDatabaseState, today: string): HuddleBriefing {
  const allAttention = getActiveAttentionItems(state, today).filter(({ item }) => item.showInHuddle === true);
  return {
    today,
    census: {
      activeCount: state.residents.filter(r => r.status === 'active').length,
      inHospitalCount: state.residents.filter(r => r.status === 'in_hospital').length,
      outOnPassCount: state.residents.filter(r => r.status === 'out_on_pass').length,
      onHoldCount: state.residents.filter(r => r.status === 'on_hold').length,
    },
    away: getAwayResidents(state),
    unitSiteAttention: allAttention.filter(({ item }) => item.scope !== 'resident'),
    residentAttention: allAttention.filter(({ item }) => item.scope === 'resident'),
    residentFollowUp: getResidentFollowUpTasks(state, today).filter(e => e.task.showInHuddle === true || e.needsReview),
    importantFyis: getDashboardFyis(state, today, 20).filter(f => f.showInHuddle === true),
    codeOfMonth: state.settings.codeOfTheMonthEnabled === true
      ? (state.settings.emergencyCodes || []).find(c => c.id === state.settings.codeOfTheMonthId)
      : undefined,
  };
}
