// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';

describe('GlobalAddModal — FYI scope, dates, and routing preview', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('saves a shift-scoped FYI with an expiry date, and shows it in the "Appears in" preview', () => {
    render(<GlobalAddModal isOpen initialType="fyi" onClose={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText(/Son visits on Saturdays/i), { target: { value: 'Prefers tea over coffee' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unit-wide / Shared' }));

    // With scope set to Shared, the resident picker is hidden, so combobox
    // order is: Category, Importance, Shift, Role.
    const comboboxes = screen.getAllByRole('combobox');
    const shiftSelect = comboboxes[2];
    fireEvent.change(shiftSelect, { target: { value: SHIFT_HCA_DAY_ID } });

    const shift = db.getState().shifts.find(s => s.id === SHIFT_HCA_DAY_ID)!;
    const shiftLabel = shift.shortCode || shift.name;
    expect(screen.getByText(new RegExp(`${shiftLabel} Shift Workspace`))).not.toBeNull();

    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBe(2);
    fireEvent.change(dateInputs[1], { target: { value: '2026-12-31' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add FYI' }));

    const saved = db.getState().fyis.find(f => f.text === 'Prefers tea over coffee');
    expect(saved).toBeDefined();
    expect(saved!.shiftId).toBe(SHIFT_HCA_DAY_ID);
    expect(saved!.residentId).toBeUndefined();
    expect(saved!.expiryDate).toBe('2026-12-31');
  });

  it('defaults to Show on Dashboard checked and Show in Huddle unchecked, and both are saved when toggled', () => {
    render(<GlobalAddModal isOpen initialType="fyi" onClose={() => undefined} />);

    fireEvent.change(screen.getByPlaceholderText(/Son visits on Saturdays/i), { target: { value: 'Huddle-relevant note' } });

    const dashboardCheckbox = screen.getByRole('checkbox', { name: 'Show on Dashboard' });
    const huddleCheckbox = screen.getByRole('checkbox', { name: 'Show in Huddle' });
    expect(dashboardCheckbox).toHaveProperty('checked', true);
    expect(huddleCheckbox).toHaveProperty('checked', false);

    fireEvent.click(dashboardCheckbox);
    fireEvent.click(huddleCheckbox);
    const appearsIn = screen.getByText('Appears in:').parentElement!.textContent!;
    expect(appearsIn).toContain('Huddle');
    expect(appearsIn).not.toContain('Dashboard');

    fireEvent.click(screen.getByRole('button', { name: 'Add FYI' }));

    const saved = db.getState().fyis.find(f => f.text === 'Huddle-relevant note');
    expect(saved).toBeDefined();
    expect(saved!.showOnDashboard).toBe(false);
    expect(saved!.showInHuddle).toBe(true);
  });
});
