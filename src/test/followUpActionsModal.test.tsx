// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { FollowUpActionsModal, FollowUpActionsEntry } from '../components/dashboard/FollowUpActionsModal';
import { Resident, ResidentTask } from '../types';

const today = '2026-09-04';

function makeEntry(task: ResidentTask, resident: Resident): FollowUpActionsEntry {
  return { task, resident };
}

describe('FollowUpActionsModal (shared panel — Huddle + Resident Profile)', () => {
  beforeEach(() => { db.resetToDemoState(); db.clearAllOperationalData(); });
  afterEach(() => cleanup());

  it('one-time task: shows Done / Carry Forward / Needs Review / No Longer Required', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'One', roomNumber: '250', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today, mustNotMiss: true });

    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Done' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Carry Forward' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Needs Review' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'No Longer Required' })).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Mark Follow-up Complete' })).toBeNull();
  });

  it('Done requires a confirm step, then applies and calls onClose/onChanged', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Confirm', roomNumber: '251', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    let closed = false; let changed = 0;
    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => { closed = true; }} onChanged={() => { changed++; }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    // Confirm dialog appears; action has not applied yet.
    expect(db.getState().residentTasks.find(t => t.id === task.id)?.followUpStatus).not.toBe('done');
    fireEvent.click(screen.getByRole('button', { name: 'Mark Done' }));

    expect(db.getState().residentTasks.find(t => t.id === task.id)?.followUpStatus).toBe('done');
    expect(changed).toBe(1);
    expect(closed).toBe(true);
  });

  it('Carry Forward applies immediately with no confirm step', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Carry', roomNumber: '252', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Carry Forward' }));

    const stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(stored.followUpStatus).toBe('carry_forward');
    expect(stored.followUpCarryForwardCount).toBe(1);
    expect(stored.followUpDueDate).toBe(today);
  });

  it('bounded tracking task: shows Mark Complete / Extend Tracking Period / Needs Review, not Carry Forward', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Track', roomNumber: '253', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-03', endDate: '2026-09-07' } });

    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Mark Follow-up Complete' })).not.toBeNull();
    expect(screen.getByText('Extend Tracking Period')).not.toBeNull();
    expect(screen.queryByRole('button', { name: 'Carry Forward' })).toBeNull();
  });

  it('extending tracking preserves the start date and applies without closing the panel', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Extend', roomNumber: '254', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Behaviour Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, trackingConfig: { kind: 'behavior' }, recurrenceRule: { startDate: '2026-09-03', endDate: '2026-09-05' } });

    let closed = false;
    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => { closed = true; }} />);
    const dateInput = screen.getByDisplayValue('2026-09-05') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-09-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extend' }));

    const stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    expect(stored.recurrenceRule?.startDate).toBe('2026-09-03');
    expect(stored.recurrenceRule?.endDate).toBe('2026-09-10');
    expect(closed).toBe(false); // extending is a continuation action, panel stays open
  });

  it('occurrence-based task: shows Record Occurrence, and recording it updates the count', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Occ', roomNumber: '118', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 3 } });

    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Record Occurrence' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Record Occurrence' }));

    expect(db.getState().residentTasks.find(t => t.id === task.id)?.trackingConfig?.completedOccurrences).toBe(1);
  });

  it('No Longer Required requires confirmation and preserves the record', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'NLR', roomNumber: '255', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'No Longer Required' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove From Follow-up' }));

    expect(db.getState().residentTasks.find(t => t.id === task.id)?.followUpStatus).toBe('no_longer_needed');
    expect(db.getState().residentTasks).toHaveLength(1); // record preserved, not deleted
  });

  it('Open Resident navigates and closes the panel; is hidden when onOpenResident is omitted', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Nav', roomNumber: '256', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    let openedId = ''; let closed = false;
    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => { closed = true; }} onOpenResident={(id) => { openedId = id; }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open Resident / Task' }));
    expect(openedId).toBe(resident.id);
    expect(closed).toBe(true);

    cleanup();
    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Open Resident / Task' })).toBeNull();
  });

  it('occurrence-based task: stays live across repeated clicks in the same open session — disables once target is met without closing/reopening', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Live', roomNumber: '262', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Fluid Check', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'fluid', requiredOccurrences: 2 } });

    let changed = 0;
    const { rerender } = render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} onChanged={() => { changed++; }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Record Occurrence' }));
    // Force a re-render the same way a real onChanged-triggered parent
    // update would, without closing the modal — the component must re-read
    // live state itself rather than trusting the original `entry` prop.
    rerender(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} onChanged={() => { changed++; }} />);
    expect(screen.getByRole('button', { name: 'Record Occurrence' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Record Occurrence' }));
    rerender(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} onChanged={() => { changed++; }} />);
    expect(screen.queryByRole('button', { name: 'Record Occurrence' })).toBeNull();
    expect(screen.getByText('2/2 complete for this period')).not.toBeNull();
    expect(changed).toBe(2);
  });

  it('occurrence-based task: hides Record Occurrence and shows a complete state once the period target is met', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Complete', roomNumber: '260', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Weight Monitoring', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'weight', requiredOccurrences: 1, completedOccurrences: 1 } });

    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'Record Occurrence' })).toBeNull();
    expect(screen.getByText('1/1 complete for this period')).not.toBeNull();
  });

  it('occurrence-based task: Undo last occurrence reverses the most recent record without deleting it', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Undo', roomNumber: '261', status: 'active' });
    let task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Fluid Check', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, trackingConfig: { kind: 'fluid', requiredOccurrences: 3 } });
    task = db.recordResidentTaskOccurrence(task.id);
    const occurrenceId = task.trackingConfig!.occurrences![0].id;

    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: /Undo last occurrence/ }));

    const stored = db.getState().residentTasks.find(t => t.id === task.id)!;
    const reversed = stored.trackingConfig!.occurrences!.find(o => o.id === occurrenceId)!;
    expect(reversed.reversedAt).toBeTruthy();
    expect(stored.trackingConfig!.occurrences).toHaveLength(1); // preserved, not deleted
    expect(stored.trackingConfig!.completedOccurrences).toBe(0);
  });

  it('includes the source-of-truth reminder exactly once', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Reminder', roomNumber: '257', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    expect(screen.getAllByText(/TaskSheet tracks operational follow-up only/)).toHaveLength(1);
  });

  it('View History is hidden without onViewHistory, and calls it with (residentId, taskId) then closes when provided', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'History', roomNumber: '262', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Urine Sample Collection', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, followUpDueDate: today });

    const { rerender } = render(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => undefined} />);
    expect(screen.queryByRole('button', { name: 'View History' })).toBeNull();

    let closed = false;
    let viewed: [string, string] | null = null;
    rerender(<FollowUpActionsModal entry={makeEntry(task, resident)} today={today} onClose={() => { closed = true; }} onViewHistory={(residentId, taskId) => { viewed = [residentId, taskId]; }} />);
    fireEvent.click(screen.getByRole('button', { name: 'View History' }));

    expect(viewed).toEqual([resident.id, task.id]);
    expect(closed).toBe(true);
  });
});
