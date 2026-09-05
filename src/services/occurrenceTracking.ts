import { AppDatabaseState, ResidentTask, ResidentTrackingConfig, TaskOccurrenceRecord } from '../types';
import { isTimeWithinShift } from './scheduling/timeWindow';

/** Non-reversed occurrence records for the period that matters right now.
 *  `'once'` tasks (the default) share one lifetime target, so every
 *  recorded occurrence counts — matching the original occurrence-mode
 *  behavior (e.g. "3 urine samples required," no reset). `'daily'` tasks
 *  reset every calendar day, so only today's records count toward today's
 *  target; yesterday's remain in `occurrences` untouched and queryable, they
 *  just don't count toward today. Tasks with no `occurrences` array yet
 *  (created before per-occurrence history existed, or never recorded
 *  against) return `[]` — callers fall back to the legacy counter via
 *  `getEffectiveOccurrenceCount`. */
export function getPeriodOccurrences(task: ResidentTask, periodDate: string): TaskOccurrenceRecord[] {
  const all = (task.trackingConfig?.occurrences || []).filter(o => !o.reversedAt);
  if (task.trackingConfig?.occurrenceResetPeriod === 'daily') {
    return all.filter(o => o.occurrenceDate === periodDate);
  }
  return all;
}

/** The number of occurrences that count toward the current period's target.
 *  Prefers real per-occurrence history; falls back to the legacy
 *  `completedOccurrences` counter only for `'once'`-mode tasks that predate
 *  per-occurrence records (never fabricates history for a `'daily'` task,
 *  since a bare legacy counter has no date to attribute it to). */
export function getEffectiveOccurrenceCount(task: ResidentTask, today: string): number {
  const tracking = task.trackingConfig;
  if (!tracking) return 0;
  if (tracking.occurrences && tracking.occurrences.length > 0) {
    return getPeriodOccurrences(task, today).length;
  }
  if (tracking.occurrenceResetPeriod === 'daily') return 0;
  return tracking.completedOccurrences || 0;
}

/** True once every prior calendar day this occurrence-mode task was active
 *  is resolvable as "met target" or "history retained as partial" — i.e.
 *  there's nothing left to derive for `periodDate`. Used to decide whether
 *  a *past* daily period should be described as missed in history. */
export function isPeriodComplete(task: ResidentTask, periodDate: string): boolean {
  const required = task.trackingConfig?.requiredOccurrences || 0;
  return getPeriodOccurrences(task, periodDate).length >= required;
}

/** "2/3 completed · 1 missed" — the honest end-of-period outcome for a past
 *  daily period that never reached its target. Only meaningful for a date
 *  strictly before `today` (today's period is still open, never "missed"). */
export function describeIncompletePastPeriod(task: ResidentTask, periodDate: string): string | null {
  const required = task.trackingConfig?.requiredOccurrences;
  if (!required) return null;
  const completed = getPeriodOccurrences(task, periodDate).length;
  if (completed >= required) return null;
  const missed = required - completed;
  return `${completed}/${required} completed · ${missed} missed`;
}

/** Every distinct calendar day this occurrence-mode task has history for,
 *  newest first — the basis for Resident Activity & History's day-by-day
 *  occurrence grouping (spec: "preserve prior days," never conflate them). */
export function getOccurrenceDates(tracking: ResidentTrackingConfig | undefined): string[] {
  const dates = new Set((tracking?.occurrences || []).map(o => o.occurrenceDate));
  return [...dates].sort((a, b) => b.localeCompare(a));
}

/** Best-effort "which shift is this, right now" — the shift whose time
 *  window contains the current wall-clock time, so a Record Occurrence
 *  action can attribute itself to a real shift without asking the user to
 *  pick one every time. Falls back to the task's own assigned shift, then
 *  undefined, when no active shift's window matches (e.g. between shifts,
 *  or a facility with gaps in coverage). */
export function deriveCurrentShiftId(state: AppDatabaseState, task: ResidentTask, now: Date = new Date()): string | undefined {
  const hhmm = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const active = state.shifts.filter(s => s.isActive !== false);
  const match = active.find(s => isTimeWithinShift(hhmm, s.startTime, s.endTime));
  return match?.id || task.shiftId;
}
