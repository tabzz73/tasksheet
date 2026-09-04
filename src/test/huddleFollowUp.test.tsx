// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { HuddleView } from '../components/dashboard/HuddleView';

const today = '2026-09-04';

describe('HuddleView — Must-Not-Miss Follow-up section', () => {
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });
  afterEach(() => cleanup());

  it('does not render the section when nothing qualifies', () => {
    render(<HuddleView isOpen onClose={() => undefined} state={db.getState()} today={today} formattedToday="Friday, September 4, 2026" />);
    expect(screen.queryByText('Must-Not-Miss Follow-up')).toBeNull();
  });

  it('shows only qualifying entries, with an attention count, and leaves the existing Resident Follow-up section untouched', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Case', roomNumber: '250', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, showInHuddle: true, followUpDueDate: '2026-09-03', mustNotMiss: true });
    // A routine mid-period tracking task, mustNotMiss — should NOT inflate the count.
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, showInHuddle: true, mustNotMiss: true, trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-01', endDate: '2026-09-20' } });

    render(<HuddleView isOpen onClose={() => undefined} state={db.getState()} today={today} formattedToday="Friday, September 4, 2026" />);

    expect(screen.getByText('Must-Not-Miss Follow-up')).not.toBeNull();
    expect(screen.getByText('1 needs attention')).not.toBeNull();
    // The overdue task appears in both the new section and the existing
    // (showInHuddle-driven) Resident Follow-up section — that's expected,
    // the two lists serve different purposes and aren't deduplicated.
    expect(screen.getAllByText('Urine Sample Collection').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Resident Follow-up')).not.toBeNull();
  });

  it('clicking a row opens Follow-up Actions for that task, and an action updates Huddle immediately via onChanged', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Click', roomNumber: '250', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-03', mustNotMiss: true });

    let changedCount = 0;
    const { rerender } = render(<HuddleView isOpen onClose={() => undefined} state={db.getState()} today={today} formattedToday="Friday, September 4, 2026" onChanged={() => { changedCount++; }} />);

    fireEvent.click(screen.getByRole('button', { name: `Follow-up actions for ${task.title}, 250` }));
    expect(screen.getByText('Follow-up Actions')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Carry Forward' }));
    expect(changedCount).toBe(1);
    expect(db.getState().residentTasks.find(t => t.id === task.id)?.followUpStatus).toBe('carry_forward');

    // Simulate the parent re-render onChanged triggers — Huddle re-derives
    // from fresh state and the row now reflects Carried Forward.
    rerender(<HuddleView isOpen onClose={() => undefined} state={db.getState()} today={today} formattedToday="Friday, September 4, 2026" onChanged={() => { changedCount++; }} />);
    expect(screen.getByText(/Carried forward/)).not.toBeNull();
  });

  it('Done removes the task from the Must-Not-Miss section immediately after re-render, without a page refresh', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Done', roomNumber: '250', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-03', mustNotMiss: true });

    const { rerender } = render(<HuddleView isOpen onClose={() => undefined} state={db.getState()} today={today} formattedToday="Friday, September 4, 2026" />);
    fireEvent.click(screen.getByRole('button', { name: `Follow-up actions for ${task.title}, 250` }));
    // Two buttons named "Done" exist while the panel is open: Huddle's own
    // footer "Done" (closes the briefing) and the follow-up action "Done"
    // inside Follow-up Actions — the action one renders last in DOM order.
    const doneButtons = screen.getAllByRole('button', { name: 'Done' });
    fireEvent.click(doneButtons[doneButtons.length - 1]);
    fireEvent.click(screen.getByRole('button', { name: 'Mark Done' }));

    rerender(<HuddleView isOpen onClose={() => undefined} state={db.getState()} today={today} formattedToday="Friday, September 4, 2026" />);
    expect(screen.queryByText('Must-Not-Miss Follow-up')).toBeNull();
    expect(db.getState().residentTasks.find(t => t.id === task.id)?.followUpStatus).toBe('done');
  });

  it('Open Resident closes Huddle and calls onOpenResident with the resident id', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Nav', roomNumber: '250', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: '2026-09-03', mustNotMiss: true });

    let closed = false; let openedId = '';
    render(<HuddleView isOpen onClose={() => { closed = true; }} state={db.getState()} today={today} formattedToday="Friday, September 4, 2026" onOpenResident={(id) => { openedId = id; }} />);
    fireEvent.click(screen.getByRole('button', { name: `Follow-up actions for ${task.title}, 250` }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Resident / Task' }));

    expect(closed).toBe(true);
    expect(openedId).toBe(resident.id);
  });
});
