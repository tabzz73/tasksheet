// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';
import { db } from '../db';
import { ROLE_HCA_ID } from '../data/defaultData';

describe('wound protocol scheduling UI', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('requires an active clinical shift and saves the selected recurrence and time', () => {
    const resident = db.addResident({ firstName: 'Wound', lastName: 'Resident', roomNumber: '707', status: 'active' });
    const view = render(
      <GlobalAddModal
        isOpen
        initialType="wound"
        contextResidentId={resident.id}
        onClose={() => undefined}
      />,
    );

    const shiftSelect = view.getByLabelText(/Assigned LPN\/RN Shift/i) as HTMLSelectElement;
    const optionValues = Array.from(shiftSelect.options).map(option => option.value).filter(Boolean);
    const state = db.getState();
    expect(optionValues.length).toBeGreaterThan(0);
    expect(optionValues.every(id => state.shifts.find(shift => shift.id === id)?.roleId !== ROLE_HCA_ID)).toBe(true);

    fireEvent.change(view.getByPlaceholderText(/Left Lower Leg Venous Ulcer/i), { target: { value: 'Left heel' } });
    fireEvent.change(view.getByLabelText(/Scheduled Time/i), { target: { value: '1000' } });
    fireEvent.click(view.getByRole('button', { name: /^Weekly$/i }));
    fireEvent.click(view.getByRole('button', { name: /Add Wound Protocol/i }));

    const wound = db.getState().wounds.find(item => item.residentId === resident.id && item.siteLocation === 'Left heel');
    expect(wound?.shiftId).toBe(shiftSelect.value);
    expect(wound?.time).toBe('1000');
    expect(wound?.frequency).toBe('weekly');
    expect(wound?.recurrenceRule?.type).toBe('WEEKLY');
  });

  it('blocks an out-of-window wound time for the selected clinical shift', () => {
    const resident = db.addResident({ firstName: 'Boundary', lastName: 'Wound', roomNumber: '708', status: 'active' });
    const view = render(
      <GlobalAddModal
        isOpen
        initialType="wound"
        contextResidentId={resident.id}
        onClose={() => undefined}
      />,
    );

    fireEvent.change(view.getByPlaceholderText(/Left Lower Leg Venous Ulcer/i), { target: { value: 'Right ankle' } });
    fireEvent.change(view.getByLabelText(/Scheduled Time/i), { target: { value: '2200' } });
    expect(view.getByRole('alert').textContent).toMatch(/outside/i);
    fireEvent.click(view.getByRole('button', { name: /Add Wound Protocol/i }));
    expect(db.getState().wounds.some(item => item.residentId === resident.id && item.siteLocation === 'Right ankle')).toBe(false);
  });
});
