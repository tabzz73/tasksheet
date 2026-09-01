/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { buildBlankTaskSheetModel } from '../services/print/specializedDocs';

describe('blank TaskSheet template contains no resident data', () => {
  beforeEach(() => { localStorage.clear(); db.resetToDemoState(); });

  it('produces only empty writable rows, never live resident/task content', () => {
    const model = buildBlankTaskSheetModel('2026-08-31');

    expect(model.tableRows.length).toBeGreaterThan(0);
    model.tableRows.forEach(row => {
      expect(row.residentName).toBe('');
      expect(row.taskTitle).toBe('');
      expect(row.roomNumber).toBe('');
    });
    expect(model.residentGroups).toEqual([]);
    expect(model.startUnitTasks).toEqual([]);
    expect(model.duringUnitTasks).toEqual([]);
    expect(model.endUnitTasks).toEqual([]);
    expect(model.importantSharedFYIs).toEqual([]);
    expect(model.woundRows).toEqual([]);
    expect(model.header.documentSubtitle).toMatch(/blank/i);
    // The facility header is still populated for real letterhead use.
    expect(model.header.facility.siteName.length).toBeGreaterThan(0);
  });
});
