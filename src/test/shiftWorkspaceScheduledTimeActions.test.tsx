// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { ShiftWorkspaceView } from '../components/views/ShiftWorkspaceView';
import { ROLE_HCA_ID, SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { getTodayLocalDateString } from '../services/recurrence';

// Regression coverage for a bug found during a full interaction audit: the
// generator expands a scheduled-time task (e.g. Medication Assistance at
// 0800/1700/2100) into synthetic per-time print rows with ids of the form
// `${realId}::${time}` — Shift Workspace renders those rows directly, so
// every row action (Edit/Duplicate/Stop/Delete/hasTaskHistory) must resolve
// back to the real underlying ResidentTask before calling any db method, or
// the mutation silently targets a nonexistent id.
describe('Shift Workspace actions on a scheduled-time (Medication Assistance) task row', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  function addScheduledTimeTask() {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const task = db.addResidentTask({
      residentId: resident.id, roleId: ROLE_HCA_ID, title: 'MAP3 — Full Medication Assistance',
      templateSlug: 'hca.medication.map3',
      category: 'Medication Assistance', frequency: 'daily', timingType: 'fixed',
      trackingConfig: { kind: 'observation', requiredOccurrences: 3, occurrenceResetPeriod: 'daily', scheduledTimes: ['0800', '1700', '2100'] },
    });
    return { resident, task };
  }

  it('Stop resolves to the real task, not the synthetic per-occurrence row id', () => {
    const { task } = addScheduledTimeTask();
    const view = render(
      <ShiftWorkspaceView
        shiftId={SHIFT_HCA_DAY_ID}
        currentDate={getTodayLocalDateString()}
        onBack={vi.fn()}
        onPrint={vi.fn()}
        onOpenAddCareTask={vi.fn()}
        onOpenAddUnitTask={vi.fn()}
        onOpenAddFYI={vi.fn()}
        onOpenAddWound={vi.fn()}
        onOpenResidentProfile={vi.fn()}
      />,
    );

    // The row renders the 0800 occurrence for this shift (Day 0700-1500).
    expect(view.getByText('MAP3 — Full Medication Assistance')).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: /Actions for MAP3/ }));
    fireEvent.click(view.getByRole('menuitem', { name: /Stop This Task/ }));
    fireEvent.click(view.getByRole('button', { name: 'Stop Care Task' }));

    const stopped = db.getState().residentTasks.find(t => t.id === task.id);
    expect(stopped?.isActive).toBe(false);
    // A bug here would leave the real record untouched while claiming success.
    expect(stopped?.stoppedAt).toBeDefined();
  });

  it('Edit opens the real task (all scheduled times), not a single-occurrence clone', () => {
    addScheduledTimeTask();
    const view = render(
      <ShiftWorkspaceView
        shiftId={SHIFT_HCA_DAY_ID}
        currentDate={getTodayLocalDateString()}
        onBack={vi.fn()}
        onPrint={vi.fn()}
        onOpenAddCareTask={vi.fn()}
        onOpenAddUnitTask={vi.fn()}
        onOpenAddFYI={vi.fn()}
        onOpenAddWound={vi.fn()}
        onOpenResidentProfile={vi.fn()}
      />,
    );

    fireEvent.click(view.getByRole('button', { name: /Actions for MAP3/ }));
    fireEvent.click(view.getByRole('menuitem', { name: /Edit Care Task/ }));

    // A bug here would either throw (real id not found) or open the edit
    // modal pre-filled with only the single 0800 occurrence instead of all
    // three real scheduled times.
    expect((view.getByLabelText('Time 1') as HTMLInputElement).value).toBe('0800');
    expect((view.getByLabelText('Time 2') as HTMLInputElement).value).toBe('1700');
    expect((view.getByLabelText('Time 3') as HTMLInputElement).value).toBe('2100');
  });

  it('Delete (no history) resolves to the real task id', () => {
    const { task } = addScheduledTimeTask();
    const view = render(
      <ShiftWorkspaceView
        shiftId={SHIFT_HCA_DAY_ID}
        currentDate={getTodayLocalDateString()}
        onBack={vi.fn()}
        onPrint={vi.fn()}
        onOpenAddCareTask={vi.fn()}
        onOpenAddUnitTask={vi.fn()}
        onOpenAddFYI={vi.fn()}
        onOpenAddWound={vi.fn()}
        onOpenResidentProfile={vi.fn()}
      />,
    );

    fireEvent.click(view.getByRole('button', { name: /Actions for MAP3/ }));
    fireEvent.click(view.getByRole('menuitem', { name: /Delete Care Task/ }));
    fireEvent.click(view.getByRole('button', { name: 'Delete Care Task' }));

    expect(db.getState().residentTasks.find(t => t.id === task.id)).toBeUndefined();
  });
});
