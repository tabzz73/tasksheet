import { describe, expect, it } from 'vitest';
import { isTaskDueOnDate } from '../services/recurrence';

describe('1.0 recurring scheduling release audit', () => {
  it('keeps every 14-day and every 28-day schedules anchored without duplicate drift', () => {
    const every14 = { type: 'EVERY_N_DAYS' as const, interval: 14, startDate: '2026-01-01' };
    const every28 = { type: 'EVERY_N_DAYS' as const, interval: 28, startDate: '2026-01-01' };
    expect(isTaskDueOnDate(every14, 'custom', '2026-01-15')).toBe(true);
    expect(isTaskDueOnDate(every14, 'custom', '2026-01-16')).toBe(false);
    expect(isTaskDueOnDate(every28, 'custom', '2026-01-29')).toBe(true);
    expect(isTaskDueOnDate(every28, 'custom', '2026-02-26')).toBe(true);
  });

  it('does not invent day 29, 30, or 31 in shorter months', () => {
    for (const day of [29, 30, 31]) {
      const rule = { type: 'MONTHLY_DAY' as const, dayOfMonth: day, startDate: '2026-01-01' };
      expect(isTaskDueOnDate(rule, 'monthly', '2026-02-28')).toBe(false);
    }
    expect(isTaskDueOnDate({ type: 'MONTHLY_DAY', dayOfMonth: 31, startDate: '2026-01-01' }, 'monthly', '2026-03-31')).toBe(true);
    expect(isTaskDueOnDate({ type: 'MONTHLY_DAY', dayOfMonth: 30, startDate: '2026-01-01' }, 'monthly', '2026-04-30')).toBe(true);
  });

  it('honors specific dates and inclusive effective end dates', () => {
    expect(isTaskDueOnDate({ type: 'ONE_TIME', specificDate: '2026-08-29' }, 'once', '2026-08-29')).toBe(true);
    expect(isTaskDueOnDate({ type: 'ONE_TIME', specificDate: '2026-08-29' }, 'once', '2026-08-30')).toBe(false);
    const finite = { type: 'DAILY' as const, startDate: '2026-08-27', endDate: '2026-08-29' };
    expect(isTaskDueOnDate(finite, 'daily', '2026-08-29')).toBe(true);
    expect(isTaskDueOnDate(finite, 'daily', '2026-08-30')).toBe(false);
  });

  it('evaluates selected months without generating on unselected months', () => {
    const quarterly = { type: 'SELECTED_MONTHS' as const, months: [3, 6, 9, 12], dayOfMonth: 15, startDate: '2026-01-01' };
    expect(isTaskDueOnDate(quarterly, 'custom', '2026-09-15')).toBe(true);
    expect(isTaskDueOnDate(quarterly, 'custom', '2026-10-15')).toBe(false);
  });
});
