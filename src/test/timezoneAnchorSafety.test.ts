/// <reference types="node" />
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { localDateFromTimestamp, formatLocalDate, getTodayLocalDateString, isTaskDueOnDate } from '../services/recurrence';
import { db } from '../db';
import { generateShiftSheet } from '../services/generator';
import { SHIFT_LPN_DAY_ID } from '../data/defaultData';

// This whole file runs under a fixed negative-UTC-offset timezone (Mountain
// Time) because the bug it guards against ONLY reproduces there: any local
// evening (roughly 18:00-23:59 MDT / 17:00-23:59 MST) is already the next
// calendar day in UTC. A CI runner defaulting to UTC would never exercise
// this path, so the timezone is pinned explicitly rather than left ambient.
const ORIGINAL_TZ = process.env.TZ;

describe('local-date anchoring across the UTC day boundary (MDT, UTC-6)', () => {
  beforeAll(() => {
    process.env.TZ = 'America/Edmonton';
  });

  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reads the LOCAL calendar date from a timestamp whose UTC date has already rolled to the next day', () => {
    // 19:13 local on Aug 31 == 01:13 UTC on Sep 1.
    expect(localDateFromTimestamp('2026-09-01T01:13:19.664Z')).toBe('2026-08-31');
    // A timestamp safely in the local morning has no UTC/local mismatch.
    expect(localDateFromTimestamp('2026-08-31T15:00:00.000Z')).toBe('2026-08-31');
  });

  it('formatLocalDate matches the Date object\'s own local getters, not its UTC ones', () => {
    const eveningInstant = new Date('2026-09-01T01:13:19.664Z');
    expect(formatLocalDate(eveningInstant)).toBe('2026-08-31');
  });

  it('a task/wound created in the local evening is still due THAT SAME local day, not the next one', () => {
    // createdAt is a real instant stamped at 19:13 MDT on Aug 31 -> 01:13Z Sep 1,
    // exactly the shape db.addWound/addResidentTask produce via new Date().toISOString().
    const eveningCreatedAt = '2026-09-01T01:13:19.664Z';
    const rule = { type: 'SELECTED_WEEKDAYS' as const, basis: 'selected_weekdays' as const, weekdays: [1], selectedDays: [1] };
    // Aug 31, 2026 is a Monday.
    expect(isTaskDueOnDate(rule, 'selected_days', '2026-08-31', eveningCreatedAt)).toBe(true);
  });

  it('end-to-end: a wound added this evening prints on today\'s shift sheet, not tomorrow\'s', () => {
    // Pin the system clock to the exact evening instant this test is about
    // (19:13 MDT on Aug 31 == 01:13 UTC on Sep 1), so db.addWound's internal
    // `new Date().toISOString()` stamps createdAt there regardless of the
    // real wall-clock date the suite happens to run on.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T01:13:19.664Z'));

    db.resetToDemoState();
    db.clearAllOperationalData();
    const resident = db.addResident({ firstName: 'Evening', lastName: 'Entry', roomNumber: '401', status: 'active' });
    // db.addWound stamps createdAt via new Date().toISOString() internally, so at
    // 19:13 MDT this produces the same next-UTC-day timestamp as the manual case above.
    db.addWound({
      residentId: resident.id,
      shiftId: SHIFT_LPN_DAY_ID,
      time: '1000',
      siteLocation: 'Left heel',
      status: 'active',
      firstAction: 'dressing_change',
      frequency: 'selected_days',
      recurrenceRule: { type: 'SELECTED_WEEKDAYS', basis: 'selected_weekdays', weekdays: [1], selectedDays: [1] },
      bathingRelation: 'independent',
    });

    const mondaySheet = generateShiftSheet('2026-08-31', SHIFT_LPN_DAY_ID);
    expect(mondaySheet.residentAssignments.flatMap(item => item.wounds)).toHaveLength(1);
  });

  it('getTodayLocalDateString reflects the local date under the pinned timezone', () => {
    // Sanity check that the helper itself is timezone-aware (uses real "now",
    // so we only assert it returns a well-formed local date, not a fixed value).
    expect(getTodayLocalDateString()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
