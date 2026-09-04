// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';
import { AddResidentAttentionModal } from '../components/modals/AddResidentAttentionModal';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { ResidentFollowUpCard } from '../components/dashboard/DashboardWidgets';
import { getTodayLocalDateString } from '../services/recurrence';

describe('Resident Task Dashboard/Huddle visibility (opt-in)', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('defaults both checkboxes unchecked and does not surface the task on the Dashboard unless flagged', () => {
    const resident = db.addResident({ firstName: 'RAI', lastName: 'Case', roomNumber: '250', status: 'active' });
    render(
      <GlobalAddModal
        isOpen
        initialType="care_task"
        contextResidentId={resident.id}
        contextShiftId={SHIFT_HCA_DAY_ID}
        onClose={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Show Customize visibility/i }));
    const dashboardCheckbox = screen.getByRole('checkbox', { name: /Show on Dashboard \(Resident Follow-up\)/i });
    const huddleCheckbox = screen.getByRole('checkbox', { name: 'Show in Huddle' });
    expect(dashboardCheckbox).toHaveProperty('checked', false);
    expect(huddleCheckbox).toHaveProperty('checked', false);
  });

  it('saves showOnDashboard/showInHuddle when checked, and the task then appears on the Resident Follow-up card', () => {
    const resident = db.addResident({ firstName: 'RAI', lastName: 'Tracked', roomNumber: '251', status: 'active' });
    render(
      <GlobalAddModal
        isOpen
        initialType="care_task"
        contextResidentId={resident.id}
        contextShiftId={SHIFT_HCA_DAY_ID}
        onClose={() => undefined}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText(/Search .* catalog/i), { target: { value: 'RAI Tracking' } });
    fireEvent.click(screen.getByRole('button', { name: /Show Customize visibility/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Show on Dashboard \(Resident Follow-up\)/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show in Huddle' }));

    const appearsIn = screen.getByText('Appears in:').parentElement!.textContent!;
    expect(appearsIn).toContain('Dashboard');
    expect(appearsIn).toContain('Huddle');

    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    const saved = db.getState().residentTasks.find(t => t.title === 'RAI Tracking');
    expect(saved).toBeDefined();
    expect(saved!.showOnDashboard).toBe(true);
    expect(saved!.showInHuddle).toBe(true);

    cleanup();
    // Match "today" to what the task's own default due date was actually
    // computed from (real wall-clock time via createdAt/getTodayLocalDateString)
    // — a fixed literal here drifts out of sync with that default as the
    // real calendar date moves on, wrongly excluding a not-yet-due task.
    render(<ResidentFollowUpCard state={db.getState()} today={getTodayLocalDateString()} onOpenResident={() => undefined} />);
    expect(screen.getByText('RAI Tracking')).not.toBeNull();
  });
});

describe('Attention Dashboard/Huddle visibility', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('defaults Show on Dashboard checked and Show in Huddle unchecked; unchecking Dashboard removes it from the Dashboard card', () => {
    render(<AddResidentAttentionModal isOpen onClose={() => undefined} onSaved={() => undefined} />);

    const dashboardCheckbox = screen.getByRole('checkbox', { name: 'Show on Dashboard' });
    const huddleCheckbox = screen.getByRole('checkbox', { name: 'Show in Huddle' });
    expect(dashboardCheckbox).toHaveProperty('checked', true);
    expect(huddleCheckbox).toHaveProperty('checked', false);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Sleep concern' } });
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'Pendleton' } });
    fireEvent.click(screen.getByRole('option', { name: /Pendleton/ }));
    fireEvent.click(dashboardCheckbox);
    fireEvent.click(huddleCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Add Attention Item' }));

    const stored = db.getState().attentionItems.find(a => a.title === 'Sleep concern');
    expect(stored?.showOnDashboard).toBe(false);
    expect(stored?.showInHuddle).toBe(true);
  });

  it('defaults the start date to the app\'s operational currentDate, not the raw wall-clock date', () => {
    render(<AddResidentAttentionModal isOpen onClose={() => undefined} onSaved={() => undefined} currentDate="2026-09-03" />);

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Overnight Observation' } });
    fireEvent.change(screen.getByLabelText('Resident'), { target: { value: 'Pendleton' } });
    fireEvent.click(screen.getByRole('option', { name: /Pendleton/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Attention Item' }));

    const stored = db.getState().attentionItems.find(a => a.title === 'Overnight Observation');
    expect(stored?.startDate).toBe('2026-09-03');
  });

  it('a Site-scoped item requires no resident and is saved with scope site', () => {
    render(<AddResidentAttentionModal isOpen onClose={() => undefined} onSaved={() => undefined} currentDate="2026-09-03" />);

    fireEvent.click(screen.getByRole('button', { name: 'Site' }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Fire drill' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Attention Item' }));

    const stored = db.getState().attentionItems.find(a => a.title === 'Fire drill');
    expect(stored?.scope).toBe('site');
    expect(stored?.residentId).toBeUndefined();
  });
});
