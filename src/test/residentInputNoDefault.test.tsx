// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';
import { AddResidentAttentionModal } from '../components/modals/AddResidentAttentionModal';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID, SHIFT_LPN_DAY_ID } from '../data/defaultData';

/** Regression coverage for the "no implicit resident selection" audit:
 *  every resident-picking form must open with no resident chosen, and must
 *  show a clear validation message rather than silently no-op or silently
 *  fall back to the first resident when submitted empty. */
describe('No accidental first-resident defaults', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('GlobalAddModal Resident Care Task: opens with no resident selected and blocks submission with "Select a resident."', () => {
    render(<GlobalAddModal isOpen initialType="care_task" contextShiftId={SHIFT_HCA_DAY_ID} onClose={() => undefined} />);

    const residentInput = screen.getByLabelText(/^Resident/) as HTMLInputElement;
    expect(residentInput.value).toBe('');

    fireEvent.change(screen.getByPlaceholderText(/Search .* catalog/i), { target: { value: 'AM Care Routine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(screen.getByText('Select a resident.')).not.toBeNull();
    expect(db.getState().residentTasks.some(t => t.title === 'AM Care Routine')).toBe(false);
  });

  it('GlobalAddModal Wound: opens with no resident selected and blocks submission with "Select a resident."', () => {
    render(<GlobalAddModal isOpen initialType="wound" onClose={() => undefined} />);

    const residentInput = screen.getByLabelText(/^Resident/) as HTMLInputElement;
    expect(residentInput.value).toBe('');

    fireEvent.change(screen.getByPlaceholderText(/Venous Ulcer/i), { target: { value: 'Sacrum' } });
    fireEvent.change(screen.getByLabelText(/Assigned LPN\/RN Shift/), { target: { value: SHIFT_LPN_DAY_ID } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Wound Protocol' }));

    expect(screen.getByText('Select a resident.')).not.toBeNull();
  });

  it('AddResidentAttentionModal: opens with Resident scope selected but no resident chosen', () => {
    render(<AddResidentAttentionModal isOpen onClose={() => undefined} onSaved={() => undefined} />);

    const residentInput = screen.getByLabelText('Resident') as HTMLInputElement;
    expect(residentInput.value).toBe('');

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Untitled situation' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Attention Item' }));

    expect(screen.getByText('Select a resident.')).not.toBeNull();
    expect(db.getState().attentionItems.some(a => a.title === 'Untitled situation')).toBe(false);
  });

  it('reopening GlobalAddModal after an unrelated selection never carries a resident over from the previous open', () => {
    const residentA = db.getState().residents.find(r => r.status === 'active')!;
    const { unmount } = render(
      <GlobalAddModal isOpen initialType="care_task" contextResidentId={residentA.id} contextShiftId={SHIFT_HCA_DAY_ID} onClose={() => undefined} />,
    );
    // Context-preselected resident is legitimate — the banner should show it.
    expect(screen.getAllByText(new RegExp(residentA.roomNumber)).length).toBeGreaterThan(0);
    unmount();

    // A fresh, context-free open must not remember it.
    render(<GlobalAddModal isOpen initialType="care_task" contextShiftId={SHIFT_HCA_DAY_ID} onClose={() => undefined} />);
    const residentInput = screen.getByLabelText(/^Resident/) as HTMLInputElement;
    expect(residentInput.value).toBe('');
  });
});
