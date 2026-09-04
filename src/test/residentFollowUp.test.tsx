// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { ResidentFollowUpCard } from '../components/dashboard/DashboardWidgets';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';

describe('Resident Follow-up Dashboard card', () => {
  const today = '2026-09-06';
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });
  afterEach(() => cleanup());

  it('shows the status label without relying on color alone, and no items when nothing is flagged', () => {
    render(<ResidentFollowUpCard state={db.getState()} today={today} onOpenResident={() => undefined} />);
    expect(screen.getByText('No follow-up tasks flagged for the Dashboard.')).not.toBeNull();
  });

  it('renders an overdue task with a visible text label', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'One', roomNumber: '120', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Collect urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-04' });

    render(<ResidentFollowUpCard state={db.getState()} today={today} onOpenResident={() => undefined} />);
    expect(screen.getByText('2 days overdue')).not.toBeNull();
  });

  it('clicking the row (not the status menu) navigates to the resident', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Click', roomNumber: '121', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Collect urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    let openedId = '';
    render(<ResidentFollowUpCard state={db.getState()} today={today} onOpenResident={(id) => { openedId = id; }} />);
    fireEvent.click(screen.getByText('Collect urine sample'));
    expect(openedId).toBe(resident.id);
  });

  it('the status menu is an accessible menu that updates the task and re-renders via onChanged', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Menu', roomNumber: '122', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Collect urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    let changedCount = 0;
    render(<ResidentFollowUpCard state={db.getState()} today={today} onOpenResident={() => undefined} onChanged={() => { changedCount++; }} />);

    const menuButton = screen.getByRole('button', { name: `Update follow-up status for ${task.title}` });
    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(menuButton);
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu')).not.toBeNull();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Carry Forward' }));
    expect(changedCount).toBe(1);
    expect(db.getState().residentTasks.find(t => t.id === task.id)?.followUpStatus).toBe('carry_forward');
    expect(db.getState().residentTasks.find(t => t.id === task.id)?.followUpCarryForwardCount).toBe(1);
  });

  it('marking a task Done removes it from the active list', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Done', roomNumber: '123', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Collect urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    db.setResidentTaskFollowUpStatus(task.id, 'done');
    render(<ResidentFollowUpCard state={db.getState()} today={today} onOpenResident={() => undefined} />);
    expect(screen.queryByText('Collect urine sample')).toBeNull();
  });
});

describe('GlobalAddModal — Follow-up due date field', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('is hidden until Show on Dashboard is checked, then saves the chosen due date', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    render(<GlobalAddModal isOpen initialType="care_task" contextResidentId={resident.id} contextShiftId={SHIFT_HCA_DAY_ID} onClose={() => undefined} />);

    expect(screen.queryByText('Due Date (optional)')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Show Advanced Options/i }));
    expect(screen.queryByText('Due Date (optional)')).toBeNull(); // still hidden — Dashboard visibility not yet on

    fireEvent.click(screen.getByRole('checkbox', { name: /Show on Dashboard \(Resident Follow-up\)/i }));
    expect(screen.getByText('Due Date (optional)')).not.toBeNull();

    fireEvent.change(screen.getByPlaceholderText(/Search .* catalog/i), { target: { value: 'Collect urine sample' } });
    const dueDateInput = screen.getByText('Due Date (optional)').closest('label')!.querySelector('input[type="date"]')!;
    fireEvent.change(dueDateInput, { target: { value: '2026-09-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    // Scoped by residentId, not just title — demo seed data already includes
    // an unrelated resident's task titled "Collect urine sample", and a
    // title-only match can silently pick that one up instead of the task
    // this test just created.
    const saved = db.getState().residentTasks.find(t => t.residentId === resident.id && t.title === 'Collect urine sample');
    expect(saved?.followUpDueDate).toBe('2026-09-01');
  });

  it('does not show the due date field for a tracking task — progress reads the recurrence dates instead', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const trackingTask = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'Monitoring',
      time: '0800', frequency: 'daily', trackingConfig: { kind: 'behavior' }, showOnDashboard: true,
      recurrenceRule: { startDate: '2026-09-03', endDate: '2026-09-07' },
    });

    render(<GlobalAddModal isOpen mode="edit" initialResidentTask={trackingTask} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Show Advanced Options/i }));
    expect(screen.queryByText('Due Date (optional)')).toBeNull();
  });

  it('edit mode shows the current follow-up status read-only, with the carry-forward count', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const task = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Collect urine sample', category: 'Monitoring',
      time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-01',
    });
    db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
    const updated = db.getState().residentTasks.find(t => t.id === task.id)!;

    render(<GlobalAddModal isOpen mode="edit" initialResidentTask={updated} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Show Advanced Options/i }));
    expect(screen.getByText(/Follow-up status:/)).not.toBeNull();
    expect(screen.getByText(/Carried forward 1×/)).not.toBeNull();
  });
});
