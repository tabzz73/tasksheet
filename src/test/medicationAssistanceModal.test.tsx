// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';

// MAP1/MAP2/MAP3 Frequency + Timing modal UX.
// Critical rule under test throughout: choosing a frequency only determines
// how many blank time rows exist — it must never pre-fill, assume, or
// prescribe a clock time. The user supplies every time.
describe('GlobalAddModal — Medication Assistance frequency & scheduled times', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  function openModalForActiveResident() {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    render(<GlobalAddModal isOpen initialType="care_task" contextResidentId={resident.id} onClose={() => undefined} />);
    return resident;
  }

  function selectMap3() {
    fireEvent.change(screen.getByPlaceholderText(/Search .* catalog/i), { target: { value: 'MAP3' } });
    fireEvent.click(screen.getByRole('button', { name: /MAP3 — Full Medication Assistance/ }));
  }

  it('selecting a Medication Assistance template shows Assistance Level and Frequency, defaulting to Once daily with no scheduled-time rows', () => {
    openModalForActiveResident();
    selectMap3();
    expect(screen.getByText('Assistance Level')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'MAP3' })).toHaveProperty('ariaPressed', 'true');
    expect(screen.getByRole('button', { name: 'Once daily' })).toHaveProperty('ariaPressed', 'true');
    // Once daily is the legacy single-time path — no scheduled-time rows yet.
    expect(screen.queryByLabelText('Time 1')).toBeNull();
  });

  it('choosing 3x creates exactly three blank time rows — nothing pre-filled', () => {
    openModalForActiveResident();
    selectMap3();
    fireEvent.click(screen.getByRole('button', { name: '3×' }));

    const t1 = screen.getByLabelText('Time 1') as HTMLInputElement;
    const t2 = screen.getByLabelText('Time 2') as HTMLInputElement;
    const t3 = screen.getByLabelText('Time 3') as HTMLInputElement;
    expect(t1.value).toBe('');
    expect(t2.value).toBe('');
    expect(t3.value).toBe('');
    expect(screen.queryByLabelText('Time 4')).toBeNull();
  });

  it('switching between frequency counts resizes the row count without inventing times for prior entries', () => {
    openModalForActiveResident();
    selectMap3();
    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    fireEvent.change(screen.getByLabelText('Time 1'), { target: { value: '0800' } });
    fireEvent.change(screen.getByLabelText('Time 2'), { target: { value: '1700' } });

    fireEvent.click(screen.getByRole('button', { name: '3×' }));
    expect((screen.getByLabelText('Time 1') as HTMLInputElement).value).toBe('0800');
    expect((screen.getByLabelText('Time 2') as HTMLInputElement).value).toBe('1700');
    expect((screen.getByLabelText('Time 3') as HTMLInputElement).value).toBe('');
  });

  it('rejects duplicate times and blocks save', () => {
    openModalForActiveResident();
    selectMap3();
    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    fireEvent.change(screen.getByLabelText('Time 1'), { target: { value: '0800' } });
    fireEvent.change(screen.getByLabelText('Time 2'), { target: { value: '0800' } });

    expect(screen.getByText(/Duplicate time/i)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Add Task' })).toHaveProperty('disabled', true);
  });

  it('rejects an invalid 24-hour time and blocks save', () => {
    openModalForActiveResident();
    selectMap3();
    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    fireEvent.change(screen.getByLabelText('Time 1'), { target: { value: '0800' } });
    fireEvent.change(screen.getByLabelText('Time 2'), { target: { value: '9999' } });

    expect(screen.getByText(/not a valid 24-hour time/i)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Add Task' })).toHaveProperty('disabled', true);
  });

  it('shows a live "Appears in" routing summary computed from the same shift-window logic as print', () => {
    openModalForActiveResident();
    selectMap3();
    fireEvent.click(screen.getByRole('button', { name: '3×' }));
    fireEvent.change(screen.getByLabelText('Time 1'), { target: { value: '0800' } });
    fireEvent.change(screen.getByLabelText('Time 2'), { target: { value: '1700' } });
    fireEvent.change(screen.getByLabelText('Time 3'), { target: { value: '2100' } });

    const appearsIn = screen.getAllByText('Appears in:').map(el => el.parentElement!.textContent!).join(' | ');
    expect(appearsIn).toContain('0800');
    expect(appearsIn).toContain('1700, 2100');
  });

  it('saves scheduled times sorted chronologically regardless of entry order, with no time/shiftId set', () => {
    openModalForActiveResident();
    selectMap3();
    fireEvent.click(screen.getByRole('button', { name: '3×' }));
    // Enter out of chronological order.
    fireEvent.change(screen.getByLabelText('Time 1'), { target: { value: '2100' } });
    fireEvent.change(screen.getByLabelText('Time 2'), { target: { value: '0800' } });
    fireEvent.change(screen.getByLabelText('Time 3'), { target: { value: '1700' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    const saved = db.getState().residentTasks.find(t => t.title === 'MAP3 — Full Medication Assistance');
    expect(saved).toBeDefined();
    expect(saved!.trackingConfig?.scheduledTimes).toEqual(['0800', '1700', '2100']);
    expect(saved!.trackingConfig?.requiredOccurrences).toBe(3);
    expect(saved!.time).toBeUndefined();
    expect(saved!.shiftId).toBeUndefined();
  });

  it('4x builds four blank rows and saves all four times', () => {
    openModalForActiveResident();
    selectMap3();
    fireEvent.click(screen.getByRole('button', { name: '4×' }));
    ['0700', '1100', '1600', '2100'].forEach((value, i) => {
      fireEvent.change(screen.getByLabelText(`Time ${i + 1}`), { target: { value } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));
    const saved = db.getState().residentTasks.find(t => t.title === 'MAP3 — Full Medication Assistance');
    expect(saved!.trackingConfig?.scheduledTimes).toEqual(['0700', '1100', '1600', '2100']);
  });

  it('Custom frequency starts with one blank row and supports adding/removing rows', () => {
    openModalForActiveResident();
    selectMap3();
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }));
    expect(screen.getByLabelText('Time 1')).not.toBeNull();
    expect(screen.queryByLabelText('Time 2')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Add time/i }));
    fireEvent.click(screen.getByRole('button', { name: /Add time/i }));
    expect(screen.getByLabelText('Time 3')).not.toBeNull();

    fireEvent.click(screen.getByLabelText('Remove time 2'));
    expect(screen.queryByLabelText('Time 3')).toBeNull();
    expect(screen.getByLabelText('Time 1')).not.toBeNull();
    expect(screen.getByLabelText('Time 2')).not.toBeNull();
  });

  it('MAP2 twice daily saves exactly two scheduled times', () => {
    openModalForActiveResident();
    fireEvent.change(screen.getByPlaceholderText(/Search .* catalog/i), { target: { value: 'MAP2' } });
    fireEvent.click(screen.getByRole('button', { name: /MAP2 — Partial Medication Assistance/ }));
    fireEvent.click(screen.getByRole('button', { name: '2×' }));
    fireEvent.change(screen.getByLabelText('Time 1'), { target: { value: '0800' } });
    fireEvent.change(screen.getByLabelText('Time 2'), { target: { value: '1700' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    const saved = db.getState().residentTasks.find(t => t.title === 'MAP2 — Partial Medication Assistance');
    expect(saved!.trackingConfig?.scheduledTimes).toEqual(['0800', '1700']);
  });

  it('editing an existing multi-time MAP assignment restores the level, frequency, and every time without collapsing them', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const task = db.addResidentTask({
      residentId: resident.id, title: 'MAP3 — Full Medication Assistance', category: 'Medication Assistance',
      templateSlug: 'hca.medication.map3', frequency: 'daily', timingType: 'fixed',
      trackingConfig: { kind: 'observation', requiredOccurrences: 3, occurrenceResetPeriod: 'daily', scheduledTimes: ['0800', '1700', '2100'] },
    });

    render(<GlobalAddModal isOpen mode="edit" initialResidentTask={task} onClose={() => undefined} />);

    expect(screen.getByRole('button', { name: 'MAP3' })).toHaveProperty('ariaPressed', 'true');
    expect(screen.getByRole('button', { name: '3×' })).toHaveProperty('ariaPressed', 'true');
    expect((screen.getByLabelText('Time 1') as HTMLInputElement).value).toBe('0800');
    expect((screen.getByLabelText('Time 2') as HTMLInputElement).value).toBe('1700');
    expect((screen.getByLabelText('Time 3') as HTMLInputElement).value).toBe('2100');

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    const saved = db.getState().residentTasks.find(t => t.id === task.id);
    expect(saved!.trackingConfig?.scheduledTimes).toEqual(['0800', '1700', '2100']);
  });
});
