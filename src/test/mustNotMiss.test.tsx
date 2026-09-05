// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';

describe('GlobalAddModal — Must Not Be Missed and Tracking Pattern', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('checking Must not be missed also checks Show in Huddle and sets Priority to High', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    render(<GlobalAddModal isOpen initialType="care_task" contextResidentId={resident.id} contextShiftId={SHIFT_HCA_DAY_ID} onClose={() => undefined} />);

    expect(screen.queryByText('Must not be missed')).not.toBeNull();

    fireEvent.click(screen.getByRole('checkbox', { name: 'Must not be missed' }));
    fireEvent.click(screen.getByRole('button', { name: /Show Customize visibility/i }));
    expect(screen.getByRole('checkbox', { name: 'Show in Huddle' })).toHaveProperty('checked', true);
    expect(screen.getByRole('checkbox', { name: /Show on Dashboard \(Resident Follow-up\)/i })).toHaveProperty('checked', true);

    fireEvent.click(screen.getByRole('button', { name: /Show Advanced options/i }));
    expect(screen.getByRole('button', { name: 'high' }).className).toContain('bg-ink');
  });

  it('saves mustNotMiss on the task', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    render(<GlobalAddModal isOpen initialType="care_task" contextResidentId={resident.id} contextShiftId={SHIFT_HCA_DAY_ID} onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Must not be missed' }));
    fireEvent.change(screen.getByPlaceholderText(/Search .* catalog/i), { target: { value: 'Urine Sample Task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    const saved = db.getState().residentTasks.find(t => t.title === 'Urine Sample Task');
    expect(saved?.mustNotMiss).toBe(true);
  });

  it('a tracking task shows a Tracking Pattern toggle instead of the due-date field', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const trackingTask = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring',
      time: '0800', frequency: 'once', trackingConfig: { kind: 'weight' }, showOnDashboard: true,
      recurrenceRule: { startDate: '2026-09-03', endDate: '2026-09-07' },
    });

    render(<GlobalAddModal isOpen mode="edit" initialResidentTask={trackingTask} onClose={() => undefined} />);
    expect(screen.getByText('Tracking Pattern')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Tracking period' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Repeated occurrences' })).not.toBeNull();
    expect(screen.queryByText('Due Date (optional)')).toBeNull();
  });

  it('switching to Repeated occurrences and saving sets requiredOccurrences, preserving completedOccurrences on edit', () => {
    const resident = db.getState().residents.find(r => r.status === 'active')!;
    const task = db.addResidentTask({
      residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring',
      time: '0800', frequency: 'once', trackingConfig: { kind: 'weight', requiredOccurrences: 3, completedOccurrences: 1 }, showOnDashboard: true,
    });

    render(<GlobalAddModal isOpen mode="edit" initialResidentTask={task} onClose={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Repeated occurrences' }).className).toContain('bg-ink');
    fireEvent.change(screen.getByDisplayValue('3'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    const saved = db.getState().residentTasks.find(t => t.id === task.id);
    expect(saved?.trackingConfig?.requiredOccurrences).toBe(5);
    expect(saved?.trackingConfig?.completedOccurrences).toBe(1); // never reset by a re-save
  });
});
