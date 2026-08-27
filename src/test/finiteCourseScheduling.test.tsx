// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { generateShiftSheet } from '../services/generator';
import {
  formatRecurrenceHuman,
  isRecurrenceScheduleEnded,
  restartRecurrenceRule,
} from '../services/recurrence';
import { ResidentProfileView } from '../components/views/ResidentProfileView';
import { ShiftWorkspaceView } from '../components/views/ShiftWorkspaceView';
import { GlobalAddModal } from '../components/modals/GlobalAddModal';

const fiveDayRule = {
  type: 'DAILY' as const,
  startDate: '2026-08-25',
  endType: 'after_occurrences' as const,
  endOccurrencesCount: 5,
};

describe('finite resident care courses', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('prints the fifth daily occurrence and excludes the sixth', () => {
    const state = db.getState();
    const shift = state.shifts.find(item => item.isActive !== false)!;
    const resident = db.addResident({
      firstName: 'Finite', lastName: 'Course', roomNumber: '995', status: 'active',
    });
    const task = db.addResidentTask({
      residentId: resident.id,
      shiftId: shift.id,
      title: 'Vital Signs for 5 Days',
      category: 'Health Monitoring',
      time: shift.startTime,
      frequency: 'daily',
      recurrenceRule: fiveDayRule,
    });
    const unitTask = db.addUnitTask({
      shiftId: shift.id,
      title: 'Five-Day Unit Safety Check',
      category: 'Safety',
      shiftPhase: 'start',
      time: shift.startTime,
      frequency: 'daily',
      recurrenceRule: fiveDayRule,
    });
    const wound = db.addWound({
      residentId: resident.id,
      shiftId: shift.id,
      time: shift.startTime,
      siteLocation: 'Left forearm',
      status: 'active',
      firstAction: 'assessment',
      frequency: 'daily',
      recurrenceRule: fiveDayRule,
      bathingRelation: 'independent',
    });

    const fifthDay = generateShiftSheet('2026-08-29', shift.id);
    const sixthDay = generateShiftSheet('2026-08-30', shift.id);
    const fifthDayIds = fifthDay.residentAssignments.flatMap(assignment => assignment.tasks.map(item => item.id));
    const sixthDayIds = sixthDay.residentAssignments.flatMap(assignment => assignment.tasks.map(item => item.id));
    const fifthUnitIds = [...fifthDay.startUnitTasks, ...fifthDay.duringUnitTasks, ...fifthDay.endUnitTasks].map(item => item.id);
    const sixthUnitIds = [...sixthDay.startUnitTasks, ...sixthDay.duringUnitTasks, ...sixthDay.endUnitTasks].map(item => item.id);
    const fifthWoundIds = fifthDay.residentAssignments.flatMap(assignment => assignment.wounds.map(item => item.id));
    const sixthWoundIds = sixthDay.residentAssignments.flatMap(assignment => assignment.wounds.map(item => item.id));

    expect(fifthDayIds).toContain(task.id);
    expect(sixthDayIds).not.toContain(task.id);
    expect(fifthUnitIds).toContain(unitTask.id);
    expect(sixthUnitIds).not.toContain(unitTask.id);
    expect(fifthWoundIds).toContain(wound.id);
    expect(sixthWoundIds).not.toContain(wound.id);
  });

  it('formats, detects, and safely restarts a completed five-day schedule', () => {
    expect(formatRecurrenceHuman(fiveDayRule, 'daily')).toBe('Daily for 5 days');
    expect(isRecurrenceScheduleEnded(fiveDayRule, 'daily', '2026-08-29')).toBe(false);
    expect(isRecurrenceScheduleEnded(fiveDayRule, 'daily', '2026-08-30')).toBe(true);

    const restarted = restartRecurrenceRule(fiveDayRule, '2026-09-01');
    expect(restarted.startDate).toBe('2026-09-01');
    expect(restarted.endOccurrencesCount).toBe(5);
    expect(isRecurrenceScheduleEnded(restarted, 'daily', '2026-09-01')).toBe(false);
  });

  it('separates ended schedules and exposes extend/restart actions without deleting them', () => {
    const shift = db.getState().shifts.find(item => item.isActive !== false)!;
    const resident = db.addResident({
      firstName: 'Ended', lastName: 'Schedule', roomNumber: '996', status: 'active',
    });
    db.addResidentTask({
      residentId: resident.id,
      shiftId: shift.id,
      title: 'Past Vital Signs Course',
      category: 'Health Monitoring',
      time: shift.startTime,
      frequency: 'daily',
      recurrenceRule: { ...fiveDayRule, startDate: '2020-01-01' },
    });
    db.addWound({
      residentId: resident.id,
      shiftId: shift.id,
      time: shift.startTime,
      siteLocation: 'Ended left forearm protocol',
      status: 'active',
      firstAction: 'assessment',
      frequency: 'daily',
      recurrenceRule: { ...fiveDayRule, startDate: '2020-01-01' },
      bathingRelation: 'independent',
    });

    const view = render(
      <ResidentProfileView
        residentId={resident.id}
        onBack={vi.fn()}
        onOpenAddCareTask={vi.fn()}
        onOpenAddFYI={vi.fn()}
        onOpenAddWound={vi.fn()}
        onOpenQuickCareSetup={vi.fn()}
      />,
    );

    fireEvent.click(view.getByRole('button', { name: /^Care Tasks/ }));
    fireEvent.click(view.getByRole('button', { name: 'Ended (1)' }));

    expect(view.getByText('Daily for 5 days')).not.toBeNull();
    expect(view.getByText('Schedule Ended')).not.toBeNull();

    fireEvent.click(view.getByRole('button', { name: 'Actions for Past Vital Signs Course' }));
    expect(view.getByRole('menuitem', { name: 'Edit / Extend Schedule' })).not.toBeNull();
    expect(view.getByRole('menuitem', { name: /Restart Schedule Today/ })).not.toBeNull();

    fireEvent.click(view.getByRole('button', { name: /^Wounds/ }));
    fireEvent.click(view.getByRole('button', { name: 'Ended (1)' }));
    expect(view.getByText('Ended left forearm protocol')).not.toBeNull();
    expect(view.getByText('Schedule Ended')).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Actions for Wound Ended left forearm protocol' }));
    expect(view.getByRole('menuitem', { name: /Restart Schedule Today/ })).not.toBeNull();
    expect(view.getByRole('menuitem', { name: /Mark Protocol Resolved/ })).not.toBeNull();
  });

  it('keeps ended unit routines reviewable from their shift workspace', () => {
    const shift = db.getState().shifts.find(item => item.isActive !== false)!;
    db.addUnitTask({
      shiftId: shift.id,
      title: 'Ended Five-Day Unit Routine',
      category: 'Safety',
      shiftPhase: 'start',
      time: shift.startTime,
      frequency: 'daily',
      recurrenceRule: { ...fiveDayRule, startDate: '2020-01-01' },
    });

    const view = render(
      <ShiftWorkspaceView
        shiftId={shift.id}
        currentDate="2026-08-30"
        onBack={vi.fn()}
        onPrint={vi.fn()}
        onOpenAddCareTask={vi.fn()}
        onOpenAddUnitTask={vi.fn()}
        onOpenAddFYI={vi.fn()}
        onOpenAddWound={vi.fn()}
        onOpenResidentProfile={vi.fn()}
      />,
    );

    expect(view.getByText('Ended Unit Routines')).not.toBeNull();
    fireEvent.click(view.getByText('Ended Unit Routines'));
    expect(view.getByText('Ended Five-Day Unit Routine')).not.toBeNull();
    expect(view.getByText('Daily for 5 days')).not.toBeNull();
    fireEvent.click(view.getByRole('button', { name: 'Actions for ended Ended Five-Day Unit Routine' }));
    expect(view.getByRole('menuitem', { name: /Restart Schedule Today/ })).not.toBeNull();
  });

  it('allows unit routines to be configured with a finite occurrence limit', () => {
    const shift = db.getState().shifts.find(item => item.isActive !== false)!;
    const view = render(
      <GlobalAddModal
        isOpen
        initialType="unit_task"
        contextShiftId={shift.id}
        onClose={vi.fn()}
      />,
    );

    fireEvent.change(view.getByPlaceholderText(/Medication Fridge Temperature/i), {
      target: { value: 'Temporary Unit Monitoring' },
    });
    fireEvent.click(view.getByRole('radio', { name: 'After occurrences' }));
    fireEvent.change(view.getByRole('spinbutton'), { target: { value: '5' } });
    fireEvent.click(view.getByRole('button', { name: 'Add Unit Task' }));

    const created = db.getState().unitTasks.find(task => task.title === 'Temporary Unit Monitoring');
    expect(created?.recurrenceRule?.endType).toBe('after_occurrences');
    expect(created?.recurrenceRule?.endOccurrencesCount).toBe(5);
    expect(formatRecurrenceHuman(created?.recurrenceRule, created?.frequency)).toBe('Daily for 5 days');
  });
});
