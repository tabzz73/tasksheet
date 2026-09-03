import { RecurrenceRule, RecurrenceType, RecurrenceOrdinal, RecurrenceEndType } from '../../types';

// Helper to parse 'YYYY-MM-DD' into UTC midnight timestamp
export function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// Format UTC Date back to 'YYYY-MM-DD'
export function formatDateUTC(d: Date): string {
  return d.toISOString().split('T')[0];
}

// Calculate days between two YYYY-MM-DD strings (date2 - date1)
export function getDaysDifference(date1Str: string, date2Str: string): number {
  const d1 = parseDateUTC(date1Str).getTime();
  const d2 = parseDateUTC(date2Str).getTime();
  return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
}

/**
 * Extracts the LOCAL calendar date ('YYYY-MM-DD') a timestamp falls on.
 *
 * `createdAt` fields are stored as raw UTC instants (`new Date().toISOString()`).
 * Taking the UTC date directly (`isoString.split('T')[0]`) is wrong as a
 * recurrence anchor: in any negative-UTC-offset timezone, anything created in
 * the local evening already has a UTC date of "tomorrow", which would make a
 * same-day recurrence rule report as not yet due on the day it was created.
 */
export function localDateFromTimestamp(isoString: string): string {
  return formatLocalDate(new Date(isoString));
}

/**
 * Formats a Date as 'YYYY-MM-DD' using its LOCAL calendar date, not UTC.
 * Use this (not `new Date().toISOString().split('T')[0]`) for "today"/"tomorrow"
 * anywhere in the app — the ISO-split form reads the UTC date, which is already
 * the next calendar day for the second half of every evening in any
 * negative-UTC-offset timezone (all of North and South America).
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today's date as 'YYYY-MM-DD' in the local timezone. */
export function getTodayLocalDateString(): string {
  return formatLocalDate(new Date());
}

/** True when a date-bounded item is in its active window for `today`
 *  (inclusive on both ends). Shared by resident attention items, FYIs, and
 *  anything else with an optional start/end (or effective/expiry) date pair. */
export function isWithinActiveWindow(startDate: string | undefined, endDate: string | undefined, today: string): boolean {
  if (startDate && startDate > today) return false;
  if (endDate && endDate < today) return false;
  return true;
}

/**
 * Calculates the exact day of month (1-31) for an ordinal weekday (e.g. 1st Monday, 2nd Tuesday, last Friday).
 * month is 1-indexed (1=Jan, 12=Dec).
 * weekday is 0=Sun, 1=Mon ... 6=Sat.
 */
export function getOrdinalWeekdayDate(
  year: number,
  month: number,
  ordinal: RecurrenceOrdinal,
  weekday: number
): number {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  if (ordinal === 'last') {
    for (let day = daysInMonth; day >= 1; day--) {
      const d = new Date(Date.UTC(year, month - 1, day));
      if (d.getUTCDay() === weekday) {
        return day;
      }
    }
    return daysInMonth;
  }

  const ordinalMultiplier = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
  }[ordinal] || 1;

  let count = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCDay() === weekday) {
      count++;
      if (count === ordinalMultiplier) {
        return day;
      }
    }
  }

  // Fallback if 4th didn't exist
  return 1;
}

/**
 * Evaluates whether a task/routine is scheduled to generate on a target date.
 */
export function isTaskDueOnDate(
  rule: RecurrenceRule | undefined,
  frequency: string | undefined,
  targetDateStr: string,
  createdAtStr?: string
): boolean {
  // If no rule, fallback to frequency string
  if (!rule) {
    if (frequency === 'daily' || frequency === 'DAILY') return true;
    if (frequency === 'prn' || frequency === 'PRN') return true;
    return true;
  }

  // Normalize recurrence type (from type, frequency, or legacy basis)
  const freqLower = (frequency || '').toLowerCase();
  const ruleFreqLower = (rule.frequency ? String(rule.frequency) : '').toLowerCase();
  const ruleType: RecurrenceType = (rule.type ||
    (ruleFreqLower === 'selected_days' || freqLower === 'selected_days' ? 'SELECTED_WEEKDAYS' :
     ruleFreqLower === 'every_n_days' || freqLower === 'every_n_days' ? 'EVERY_N_DAYS' :
     ruleFreqLower === 'monthly_day' || freqLower === 'monthly_day' ? 'MONTHLY_DAY' :
     ruleFreqLower === 'every_n_weeks' || freqLower === 'every_n_weeks' ? 'EVERY_N_WEEKS' :
     ruleFreqLower === 'weekly' || freqLower === 'weekly' ? 'WEEKLY' :
     rule.basis === 'daily' || freqLower === 'daily' ? 'DAILY' :
     rule.basis === 'interval_days' ? 'EVERY_N_DAYS' :
     rule.basis === 'selected_weekdays' ? 'SELECTED_WEEKDAYS' :
     rule.basis === 'interval_weeks' ? 'EVERY_N_WEEKS' :
     rule.basis === 'monthly_day' ? 'MONTHLY_DAY' :
     rule.basis === 'specific_date' ? 'ONE_TIME' :
     rule.basis === 'prn' || freqLower === 'prn' ? 'PRN' : 'DAILY')) as RecurrenceType;

  // PRN tasks are always available on sheets (or placed in the PRN section)
  if (ruleType === 'PRN') {
    return true;
  }

  const anchorDateStr = rule.startDate || rule.anchorDate || (rule.specificDate || (createdAtStr ? localDateFromTimestamp(createdAtStr) : targetDateStr));
  
  // Date boundaries: before start date -> not due
  if (targetDateStr < anchorDateStr) {
    return false;
  }

  // Check explicit end date
  if (rule.endDate && targetDateStr > rule.endDate) {
    return false;
  }

  const targetDate = parseDateUTC(targetDateStr);
  const targetYear = targetDate.getUTCFullYear();
  const targetMonth = targetDate.getUTCMonth() + 1; // 1-12
  const targetDayOfMonth = targetDate.getUTCDate();
  const targetWeekday = targetDate.getUTCDay(); // 0=Sun..6=Sat

  // Check 'after_occurrences' limit
  if (rule.endType === 'after_occurrences' && rule.endOccurrencesCount && rule.endOccurrencesCount > 0) {
    // If target is beyond start, count occurrences from start up to target
    let occCount = 0;
    let curr = parseDateUTC(anchorDateStr);
    const targetTime = targetDate.getTime();
    
    // Create a sub-rule without end limit to evaluate single days
    const baseRule = { ...rule, endType: 'never' as RecurrenceEndType, endDate: undefined };

    while (curr.getTime() <= targetTime) {
      const cStr = formatDateUTC(curr);
      if (isTaskDueOnDate(baseRule, frequency, cStr, createdAtStr)) {
        occCount++;
        if (occCount > rule.endOccurrencesCount) {
          return false; // Exceeded allowed occurrences
        }
      }
      curr = new Date(curr.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  // ── EVALUATE BY TYPE ──

  switch (ruleType) {
    case 'ONE_TIME': {
      const targetMatch = rule.specificDate || rule.startDate || rule.anchorDate;
      return targetDateStr === targetMatch;
    }

    case 'DAILY': {
      return true;
    }

    case 'EVERY_N_DAYS': {
      const interval = Math.max(1, rule.interval || rule.intervalDays || 2);
      
      // If "From Last Performed" mode
      if (rule.scheduleMethod === 'from_last_performed' && rule.lastPerformedDate) {
        const diffFromPerformed = getDaysDifference(rule.lastPerformedDate, targetDateStr);
        return diffFromPerformed > 0 && diffFromPerformed % interval === 0;
      }

      const diffDays = getDaysDifference(anchorDateStr, targetDateStr);
      return diffDays >= 0 && diffDays % interval === 0;
    }

    case 'SELECTED_WEEKDAYS': {
      const weekdays = rule.weekdays || rule.selectedDays || [1, 2, 3, 4, 5];
      return weekdays.includes(targetWeekday);
    }

    case 'WEEKLY': {
      const weekdays = rule.weekdays || rule.selectedDays || [parseDateUTC(anchorDateStr).getUTCDay()];
      return weekdays.includes(targetWeekday);
    }

    case 'EVERY_N_WEEKS': {
      const interval = Math.max(1, rule.interval || 2);
      const weekdays = rule.weekdays || rule.selectedDays || [parseDateUTC(anchorDateStr).getUTCDay()];
      
      if (!weekdays.includes(targetWeekday)) {
        return false;
      }

      const diffDays = getDaysDifference(anchorDateStr, targetDateStr);
      if (diffDays < 0) return false;

      // Find the start week epoch (Sunday of anchor date)
      const anchorDate = parseDateUTC(anchorDateStr);
      const anchorSunday = new Date(anchorDate.getTime() - anchorDate.getUTCDay() * 24 * 60 * 60 * 1000);
      const targetSunday = new Date(targetDate.getTime() - targetWeekday * 24 * 60 * 60 * 1000);
      
      const weeksBetween = Math.round((targetSunday.getTime() - anchorSunday.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return weeksBetween >= 0 && weeksBetween % interval === 0;
    }

    case 'MONTHLY_DAY': {
      const targetDay = rule.dayOfMonth || parseDateUTC(anchorDateStr).getUTCDate();
      return targetDayOfMonth === targetDay;
    }

    case 'MONTHLY_ORDINAL_WEEKDAY': {
      const ordinal = rule.ordinal || 'first';
      const weekday = rule.ordinalWeekday !== undefined ? rule.ordinalWeekday : 1; // Default Monday
      const dueDayOfMonth = getOrdinalWeekdayDate(targetYear, targetMonth, ordinal, weekday);
      return targetDayOfMonth === dueDayOfMonth;
    }

    case 'EVERY_N_MONTHS': {
      const interval = Math.max(1, rule.interval || 3);
      const targetDay = rule.dayOfMonth || parseDateUTC(anchorDateStr).getUTCDate();
      
      if (targetDayOfMonth !== targetDay) return false;

      const anchor = parseDateUTC(anchorDateStr);
      const monthsDiff = (targetYear - anchor.getUTCFullYear()) * 12 + (targetMonth - (anchor.getUTCMonth() + 1));
      return monthsDiff >= 0 && monthsDiff % interval === 0;
    }

    case 'SELECTED_MONTHS': {
      const months = rule.months || [1, 4, 7, 10]; // Quarterly default
      const targetDay = rule.dayOfMonth || parseDateUTC(anchorDateStr).getUTCDate();
      return months.includes(targetMonth) && targetDayOfMonth === targetDay;
    }

    case 'DATE_RANGE': {
      // Within date range, check optional sub-rule (default daily)
      if (rule.weekdays && rule.weekdays.length > 0) {
        return rule.weekdays.includes(targetWeekday);
      }
      return true;
    }

    default:
      return true;
  }
}

/**
 * True only after the final scheduled date has passed. The retained task can
 * still be reviewed or edited, but it is no longer eligible for generation.
 */
export function isRecurrenceScheduleEnded(
  rule: RecurrenceRule | undefined,
  frequency: string | undefined,
  referenceDateStr: string,
  createdAtStr?: string,
): boolean {
  if (!rule) return false;

  const type: RecurrenceType = (rule.type ||
    (rule.basis === 'specific_date' ? 'ONE_TIME' :
     rule.basis === 'prn' || frequency?.toLowerCase() === 'prn' ? 'PRN' :
     'DAILY')) as RecurrenceType;

  if (type === 'PRN') return false;
  if (rule.endDate && referenceDateStr > rule.endDate) return true;

  if (type === 'ONE_TIME') {
    const occurrenceDate = rule.specificDate || rule.startDate || rule.anchorDate;
    return !!occurrenceDate && referenceDateStr > occurrenceDate;
  }

  if (rule.endType !== 'after_occurrences' || !rule.endOccurrencesCount || rule.endOccurrencesCount < 1) {
    return false;
  }

  const anchorDateStr = rule.startDate || rule.anchorDate || (createdAtStr ? localDateFromTimestamp(createdAtStr) : referenceDateStr);
  if (referenceDateStr <= anchorDateStr) return false;

  const baseRule: RecurrenceRule = {
    ...rule,
    endType: 'never',
    endDate: undefined,
    endOccurrencesCount: undefined,
  };
  let occurrenceCount = 0;
  let cursor = parseDateUTC(anchorDateStr);
  const referenceTime = parseDateUTC(referenceDateStr).getTime();

  while (cursor.getTime() <= referenceTime) {
    const cursorDateStr = formatDateUTC(cursor);
    if (isTaskDueOnDate(baseRule, frequency, cursorDateStr, createdAtStr)) {
      occurrenceCount++;
      if (occurrenceCount === rule.endOccurrencesCount) {
        return referenceDateStr > cursorDateStr;
      }
    }
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  return false;
}

/** Re-anchor a retained ended schedule while preserving its recurrence shape. */
export function restartRecurrenceRule(rule: RecurrenceRule, newStartDate: string): RecurrenceRule {
  const previousStart = rule.startDate || rule.anchorDate || rule.specificDate;
  const restarted: RecurrenceRule = {
    ...rule,
    startDate: newStartDate,
    anchorDate: newStartDate,
    lastPerformedDate: undefined,
  };

  if (rule.type === 'ONE_TIME' || rule.basis === 'specific_date') {
    restarted.specificDate = newStartDate;
  }

  if (rule.endType === 'after_occurrences') {
    restarted.endDate = undefined;
  } else if (rule.endDate && previousStart) {
    const durationDays = Math.max(0, getDaysDifference(previousStart, rule.endDate));
    const newEnd = new Date(parseDateUTC(newStartDate).getTime() + durationDays * 24 * 60 * 60 * 1000);
    restarted.endDate = formatDateUTC(newEnd);
  }

  return restarted;
}

const WEEKDAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Returns a human-friendly clinical description of the recurrence rule.
 */
function formatRecurrenceBaseHuman(rule?: RecurrenceRule, frequency?: string): string {
  if (!rule) {
    if (frequency === 'daily') return 'Daily';
    if (frequency === 'prn') return 'PRN / If Required';
    if (frequency === 'every_2_weeks') return 'Every Other Week';
    if (frequency === 'weekly') return 'Weekly';
    if (frequency === 'monthly') return 'Monthly';
    if (frequency === 'once') return 'One Time';
    if (frequency === 'selected_days') return 'Selected Days';
    if (frequency === 'custom') return 'Custom Schedule';
    return frequency ? frequency.replace(/_/g, ' ') : 'Daily';
  }

  const type: RecurrenceType = (rule.type ||
    (rule.basis === 'daily' ? 'DAILY' :
     rule.basis === 'interval_days' ? 'EVERY_N_DAYS' :
     rule.basis === 'selected_weekdays' ? 'SELECTED_WEEKDAYS' :
     rule.basis === 'interval_weeks' ? 'EVERY_N_WEEKS' :
     rule.basis === 'monthly_day' ? 'MONTHLY_DAY' :
     rule.basis === 'specific_date' ? 'ONE_TIME' :
     rule.basis === 'prn' ? 'PRN' : 'DAILY')) as RecurrenceType;

  switch (type) {
    case 'ONE_TIME':
      return `One Time (${rule.specificDate || rule.startDate || 'Specific Date'})`;

    case 'DAILY':
      return rule.endDate ? `Daily until ${rule.endDate}` : 'Daily';

    case 'EVERY_N_DAYS': {
      const n = rule.interval || 2;
      if (n === 2) return 'Every 2 Days';
      if (n === 28) return 'Every 28 Days';
      return `Every ${n} Days`;
    }

    case 'SELECTED_WEEKDAYS': {
      const wks = rule.weekdays || rule.selectedDays || [];
      if (wks.length === 3 && wks.includes(1) && wks.includes(3) && wks.includes(5)) {
        return 'Every Mon / Wed / Fri';
      }
      if (wks.length === 5 && !wks.includes(0) && !wks.includes(6)) {
        return 'Every Weekday (Mon–Fri)';
      }
      if (wks.length === 2 && wks.includes(0) && wks.includes(6)) {
        return 'Every Sat / Sun';
      }
      return wks.length > 0 ? `Every ${wks.map(d => WEEKDAY_NAMES_SHORT[d]).join(' / ')}` : 'Selected Days';
    }

    case 'WEEKLY': {
      const wks = rule.weekdays || rule.selectedDays || [];
      if (wks.length === 1) {
        return `Weekly on ${WEEKDAY_NAMES_SHORT[wks[0]]}`;
      }
      return `Weekly (${wks.map(d => WEEKDAY_NAMES_SHORT[d]).join(', ')})`;
    }

    case 'EVERY_N_WEEKS': {
      const n = rule.interval || 2;
      const wks = rule.weekdays || rule.selectedDays || [];
      const dayStr = wks.map(d => WEEKDAY_NAMES_SHORT[d]).join(', ');
      if (n === 2) return `Every Other Week${dayStr ? ` (${dayStr})` : ''}`;
      return `Every ${n} Weeks${dayStr ? ` (${dayStr})` : ''}`;
    }

    case 'MONTHLY_DAY':
      return `Monthly on day ${rule.dayOfMonth || 1}`;

    case 'MONTHLY_ORDINAL_WEEKDAY': {
      const ord = rule.ordinal || 'first';
      const wk = WEEKDAY_NAMES_SHORT[rule.ordinalWeekday !== undefined ? rule.ordinalWeekday : 1];
      return `Monthly on the ${ord} ${wk}`;
    }

    case 'EVERY_N_MONTHS': {
      const n = rule.interval || 3;
      return `Every ${n} Months (Day ${rule.dayOfMonth || 1})`;
    }

    case 'SELECTED_MONTHS': {
      const mStrs = (rule.months || []).map(m => MONTH_NAMES_SHORT[m - 1]).join(', ');
      return `Selected Months (${mStrs} on Day ${rule.dayOfMonth || 1})`;
    }

    case 'DATE_RANGE':
      return `Date Range (${rule.startDate || ''} – ${rule.endDate || ''})`;

    case 'PRN':
      return 'PRN / If Required';

    default:
      return 'Daily';
  }
}

/** Adds finite-course wording consistently across every recurrence pattern. */
export function formatRecurrenceHuman(rule?: RecurrenceRule, frequency?: string): string {
  const base = formatRecurrenceBaseHuman(rule, frequency);
  if (!rule || base.startsWith('One Time') || base.startsWith('Date Range') || base.startsWith('PRN')) {
    return base;
  }

  if (rule.endType === 'after_occurrences' && rule.endOccurrencesCount) {
    const isDaily = rule.type === 'DAILY' || rule.basis === 'daily' || frequency?.toLowerCase() === 'daily';
    const unit = isDaily
      ? (rule.endOccurrencesCount === 1 ? 'day' : 'days')
      : (rule.endOccurrencesCount === 1 ? 'occurrence' : 'occurrences');
    return `${base} for ${rule.endOccurrencesCount} ${unit}`;
  }

  if (rule.endDate && !base.toLowerCase().includes('until')) {
    return `${base} until ${rule.endDate}`;
  }

  return base;
}
