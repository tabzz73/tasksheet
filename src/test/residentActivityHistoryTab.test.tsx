// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { ResidentActivityHistoryTab } from '../components/views/ResidentActivityHistoryTab';

describe('ResidentActivityHistoryTab', () => {
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });
  afterEach(() => cleanup());

  function setup() {
    const resident = db.addResident({ firstName: 'F', lastName: 'History', roomNumber: '260', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'General', frequency: 'once', timingType: 'period', showOnDashboard: true, followUpDueDate: '2026-09-01' });
    db.setResidentTaskFollowUpStatus(task.id, 'carry_forward');
    db.setResidentTaskFollowUpStatus(task.id, 'done');
    return { resident, task };
  }

  it('renders the resident\'s events newest-first with actor, summary, and changes', () => {
    const { resident, task } = setup();
    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} />);

    const rows = screen.getAllByTestId('audit-row');
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows[0].textContent).toContain('marked Done');
    expect(rows[0].textContent).toContain(task.title);
  });

  it('category filter narrows results', () => {
    const { resident } = setup();
    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    const rows = screen.getAllByTestId('audit-row');
    expect(rows.every(row => row.textContent?.includes('Resident task created'))).toBe(true);
  });

  it('search narrows results to matching text', () => {
    const { resident } = setup();
    db.addFYI({ residentId: resident.id, text: 'Prefers tea in the morning', category: 'preference', importance: 'normal' } as any);
    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} />);

    fireEvent.change(screen.getByLabelText('Search history'), { target: { value: 'tea' } });
    const rows = screen.getAllByTestId('audit-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Prefers tea');
  });

  it('date range filters exclude events outside the window', () => {
    const { resident } = setup();
    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} />);

    fireEvent.change(screen.getByLabelText('From date'), { target: { value: '2099-01-01' } });
    expect(screen.getByText('No history matches these filters.')).not.toBeNull();
  });

  it('Clear Filters resets category, search, and date range', () => {
    const { resident } = setup();
    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} />);

    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    fireEvent.change(screen.getByLabelText('Search history'), { target: { value: 'zzz-no-match' } });
    expect(screen.getByText('No history matches these filters.')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    expect(screen.getAllByTestId('audit-row').length).toBeGreaterThan(0);
  });

  it('initialTaskId pre-filters to one task and shows a clearable banner', () => {
    const { resident, task } = setup();
    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} initialTaskId={task.id} />);

    expect(screen.getByText(/Showing history for: Urine Sample Collection/)).not.toBeNull();
    const rows = screen.getAllByTestId('audit-row');
    expect(rows.every(row => row.textContent?.includes('Urine Sample Collection'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.queryByText(/Showing history for/)).toBeNull();
  });

  it('shows the legacy fallback, not an empty list, for a task-filtered view with zero audit events', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Legacy', roomNumber: '261', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Legacy Task', category: 'General', frequency: 'once', timingType: 'period' });
    const backup = JSON.parse(db.backupDatabase());
    backup.auditEvents = backup.auditEvents.filter((e: any) => e.entityId !== task.id);
    db.restoreDatabase(JSON.stringify(backup));

    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} initialTaskId={task.id} />);
    expect(screen.getByText('Created before Task History was enabled.')).not.toBeNull();
  });

  it('shows "Open Task" only when the task still exists and a handler is provided, and calls it with the resolved task', () => {
    const { resident, task } = setup();
    const state = db.getState();
    let opened: string | null = null;
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} onOpenTask={t => { opened = t.id; }} />);

    const openButtons = screen.getAllByRole('button', { name: 'Open Task' });
    expect(openButtons.length).toBeGreaterThan(0);
    fireEvent.click(openButtons[0]);
    expect(opened).toBe(task.id);
  });

  it('never shows "Open Task" when no handler is provided', () => {
    const { resident } = setup();
    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} />);
    expect(screen.queryByRole('button', { name: 'Open Task' })).toBeNull();
  });

  it('shows a "Last completed" summary line when something has been marked Done', () => {
    setup();
    const state = db.getState();
    const resident = state.residents.find(r => r.lastName === 'History')!;
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={state.residentTasks.filter(t => t.residentId === resident.id)} />);
    expect(screen.getByText(/Last completed:/)).not.toBeNull();
  });

  it('shows the generic empty state (not the legacy fallback) when there is no task filter and truly nothing has happened', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Empty', roomNumber: '262', status: 'active' });
    const backup = JSON.parse(db.backupDatabase());
    backup.auditEvents = [];
    db.restoreDatabase(JSON.stringify(backup));
    const state = db.getState();
    render(<ResidentActivityHistoryTab state={state} residentId={resident.id} residentTasks={[]} />);
    expect(screen.getByText(/No audit history yet/)).not.toBeNull();
  });
});
