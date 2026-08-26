/**
 * Parses a 24-hour clock value into minutes after midnight.
 * Accepts HHMM, HMM, HH:MM, and H:MM. Invalid clock values return null.
 */
export function parseMilitaryTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):?(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours > 23 || minutes > 59) {
    return null;
  }

  return hours * 60 + minutes;
}

/**
 * Returns true when taskTime falls within [shiftStart, shiftEnd).
 * The end boundary is deliberately exclusive so adjacent shifts cannot both
 * print the same timed task. A start equal to end represents a 24-hour window.
 */
export function isTimeWithinShift(taskTime: string, shiftStart: string, shiftEnd: string): boolean {
  const task = parseMilitaryTime(taskTime);
  const start = parseMilitaryTime(shiftStart);
  const end = parseMilitaryTime(shiftEnd);

  if (task === null || start === null || end === null) return false;
  if (start === end) return true;
  if (start < end) return task >= start && task < end;
  return task >= start || task < end;
}

