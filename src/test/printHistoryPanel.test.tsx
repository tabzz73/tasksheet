// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { generateShiftSheet } from '../services/generator';
import { recordPrint, listEntries, PrintHistoryEntry } from '../services/printHistory';
import { PrintHistoryPanel } from '../components/views/PrintHistoryPanel';

describe('Print History — listEntries()', () => {
  beforeEach(() => {
    db.resetToDemoState();
    localStorage.clear();
  });

  it('returns an empty array when nothing has been recorded', () => {
    expect(listEntries()).toEqual([]);
  });

  it('returns every recorded entry sorted newest-first', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-01T08:00:00.000Z'));
    recordPrint({ shiftId: 'a', shiftCode: 'A1', shiftName: 'Shift A', date: '2026-09-01', profile: 'simple_checklist', totalItems: 3 });
    vi.setSystemTime(new Date('2026-09-02T08:00:00.000Z'));
    recordPrint({ shiftId: 'b', shiftCode: 'B1', shiftName: 'Shift B', date: '2026-09-02', profile: 'clinical_worksheet', totalItems: 5 });
    vi.useRealTimers();
    const entries = listEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0].shiftId).toBe('b');
    expect(entries[1].shiftId).toBe('a');
  });

  it('reflects CURRENT data on a re-run, not the stored snapshot — proving "Run this print configuration again" is not a historical replay', () => {
    const resident = db.addResident({ firstName: 'Snapshot', lastName: 'Test', roomNumber: '901', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Original Title', category: 'ADL', time: '0800', frequency: 'daily' });
    const date = '2026-09-03';
    const firstSheet = generateShiftSheet(date, SHIFT_HCA_DAY_ID);
    recordPrint({ shiftId: SHIFT_HCA_DAY_ID, shiftCode: firstSheet.shift.shortCode || '', shiftName: firstSheet.shift.name, date, profile: 'simple_checklist', totalItems: firstSheet.residentAssignments.length });
    const storedEntry = listEntries()[0];
    expect(storedEntry.date).toBe(date);

    const task = db.getState().residentTasks.find(t => t.residentId === resident.id)!;
    db.updateResidentTask(task.id, { title: 'Updated Title' });

    const regenerated = generateShiftSheet(storedEntry.date, storedEntry.shiftId);
    const titles = regenerated.residentAssignments.flatMap(a => a.tasks.map(t => t.title));
    expect(titles).toContain('Updated Title');
    expect(titles).not.toContain('Original Title');
  });
});

describe('PrintHistoryPanel', () => {
  afterEach(() => cleanup());

  it('shows an empty-state message when there is no history', () => {
    render(<PrintHistoryPanel entries={[]} onRerun={() => undefined} />);
    expect(screen.getByText('No prints recorded yet')).not.toBeNull();
  });

  it('lists entries and invokes onRerun with the clicked entry, worded as a re-run rather than a reprint', () => {
    const entry: PrintHistoryEntry = {
      id: 'ph_1', shiftId: 'shift-1', shiftCode: 'D1', shiftName: 'HCA Day', date: '2026-09-03',
      generatedAt: '2026-09-03T12:00:00.000Z', profile: 'simple_checklist', totalItems: 4, revision: 2, items: [],
    };
    let rerunEntry: PrintHistoryEntry | null = null;
    render(<PrintHistoryPanel entries={[entry]} onRerun={e => { rerunEntry = e; }} />);

    expect(screen.getByText(/D1 — HCA Day/)).not.toBeNull();
    expect(screen.queryByText(/Print Again/i)).toBeNull();
    expect(screen.queryByText(/^Reprint/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Run this print configuration again/i }));
    expect(rerunEntry).toEqual(entry);
  });
});
