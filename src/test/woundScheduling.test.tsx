// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';
import { ShiftWorkspaceView } from '../components/views/ShiftWorkspaceView';
import { db } from '../db';
import { ROLE_HCA_ID, SHIFT_HCA_DAY_ID, SHIFT_LPN_DAY_ID, SHIFT_LPN_NIGHT_ID } from '../data/defaultData';

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

  it('preselects the clinical shift supplied by a shift workspace', () => {
    const resident = db.addResident({ firstName: 'Night', lastName: 'Wound', roomNumber: '709', status: 'active' });
    const view = render(
      <GlobalAddModal
        isOpen
        initialType="wound"
        contextResidentId={resident.id}
        contextShiftId={SHIFT_LPN_NIGHT_ID}
        onClose={() => undefined}
      />,
    );

    expect((view.getByLabelText(/Assigned LPN\/RN Shift/i) as HTMLSelectElement).value).toBe(SHIFT_LPN_NIGHT_ID);
  });

  it('offers Wound Protocol from LPN/RN shift menus but not HCA shift menus', () => {
    const onOpenAddWound = vi.fn();
    const commonProps = {
      currentDate: '2026-08-26',
      onBack: vi.fn(),
      onPrint: vi.fn(),
      onOpenAddCareTask: vi.fn(),
      onOpenAddUnitTask: vi.fn(),
      onOpenAddFYI: vi.fn(),
      onOpenAddWound,
      onOpenResidentProfile: vi.fn(),
    };

    const clinicalView = render(<ShiftWorkspaceView {...commonProps} shiftId={SHIFT_LPN_DAY_ID} />);
    fireEvent.click(clinicalView.getByRole('button', { name: /Add to LP1/i }));
    expect(clinicalView.getByRole('button', { name: /Wound Protocol/i })).not.toBeNull();
    fireEvent.pointerDown(document.body);
    expect(clinicalView.queryByRole('button', { name: /Wound Protocol/i })).toBeNull();

    fireEvent.click(clinicalView.getByRole('button', { name: /Add to LP1/i }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(clinicalView.queryByRole('button', { name: /Wound Protocol/i })).toBeNull();

    fireEvent.click(clinicalView.getByRole('button', { name: /Add to LP1/i }));
    fireEvent.click(clinicalView.getByRole('button', { name: /Wound Protocol/i }));
    expect(onOpenAddWound).toHaveBeenCalledOnce();
    clinicalView.unmount();

    const hcaView = render(<ShiftWorkspaceView {...commonProps} shiftId={SHIFT_HCA_DAY_ID} />);
    fireEvent.click(hcaView.getByRole('button', { name: /Add to D1/i }));
    expect(hcaView.queryByRole('button', { name: /Wound Protocol/i })).toBeNull();
  });
});
