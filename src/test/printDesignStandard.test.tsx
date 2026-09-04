import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID, SHIFT_LPN_DAY_ID } from '../data/defaultData';
import { generateShiftSheet } from '../services/generator';
import { PrintService } from '../services/print';
import { buildShiftConfigReferenceModel, buildWoundScheduleModel } from '../services/print/specializedDocs';
import { buildWhatChangedModel, buildTaskSnapshot, recordPrint, TaskSnapshotItem } from '../services/printHistory';
import { UniversalTableDocument } from '../components/print/UniversalTableDocument';
import { ShiftConfigReferenceDocument } from '../components/print/ShiftConfigReferenceDocument';
import { WoundScheduleDocument } from '../components/print/WoundScheduleDocument';
import { UpcomingScheduleDocument } from '../components/print/UpcomingScheduleDocument';
import { WhatChangedDocument } from '../components/print/WhatChangedDocument';

// The exact compound class-strings that identified the violation (a large
// dark fill spanning a header/banner) — not a blanket "no bg-slate-900"
// check, since small black identifier chips (shift-code, room-number) are
// deliberately preserved elsewhere in these same documents.
const REMOVED_DARK_FILL_PATTERNS = [
  'bg-slate-900 text-white p-3 flex items-center justify-between', // ShiftConfigReferenceDocument per-shift bar
  'bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider', // WoundScheduleDocument / UpcomingScheduleDocument <thead>
  'bg-emerald-800 text-white', // WhatChangedDocument Added banner
  'bg-amber-700 text-white', // WhatChangedDocument Modified banner
  'bg-rose-800 text-white', // WhatChangedDocument Removed banner
];

describe('Print Design Standard — toner-light compliance', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });

  it('UniversalTableDocument shows a clear empty-state message instead of a silent header-only table (simple checklist)', () => {
    const sheet = generateShiftSheet('2026-09-07', SHIFT_HCA_DAY_ID);
    const model = PrintService.generateDocumentModel(sheet);
    expect(model.tableRows).toHaveLength(0);
    const markup = renderToStaticMarkup(<UniversalTableDocument model={model} />);
    expect(markup).toContain('No scheduled tasks for this shift on this date.');
    expect(markup).toContain('colSpan="7"');
  });

  it('UniversalTableDocument shows the empty-state message with the correct 8-column span for clinical worksheets', () => {
    const sheet = generateShiftSheet('2026-09-07', SHIFT_LPN_DAY_ID);
    const model = PrintService.generateDocumentModel(sheet);
    expect(model.tableRows).toHaveLength(0);
    const markup = renderToStaticMarkup(<UniversalTableDocument model={model} />);
    expect(markup).toContain('No scheduled tasks for this shift on this date.');
    expect(markup).toContain('colSpan="8"');
  });

  it('does not show the empty-state message when a shift has scheduled tasks', () => {
    const resident = db.addResident({ firstName: 'Has', lastName: 'Tasks', roomNumber: '101', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Morning Care', category: 'ADL', time: '0800', frequency: 'daily' });
    const model = PrintService.generateDocumentModel(generateShiftSheet('2026-09-07', SHIFT_HCA_DAY_ID));
    expect(model.tableRows.length).toBeGreaterThan(0);
    const markup = renderToStaticMarkup(<UniversalTableDocument model={model} />);
    expect(markup).not.toContain('No scheduled tasks for this shift on this date.');
    expect(markup).toContain('Morning Care');
  });

  it('replaces large toner-heavy dark fills with the light header pattern, grayscale-safe', () => {
    const shiftConfigMarkup = renderToStaticMarkup(<ShiftConfigReferenceDocument model={buildShiftConfigReferenceModel('2026-09-07')} />);
    const woundMarkup = renderToStaticMarkup(<WoundScheduleDocument model={buildWoundScheduleModel('2026-09-07')} />);
    const upcomingMarkup = renderToStaticMarkup(<UpcomingScheduleDocument currentDateStr="2026-09-07" />);

    const resident = db.addResident({ firstName: 'Delta', lastName: 'Test', roomNumber: '210', status: 'active' });
    const task = db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Original Task', category: 'ADL', time: '0800', frequency: 'daily' });
    const date = '2026-09-08';
    const firstSheet = generateShiftSheet(date, SHIFT_HCA_DAY_ID);
    const structuredTasks: TaskSnapshotItem[] = [{ id: task.id, roomNumber: resident.roomNumber, residentName: `${resident.firstName} ${resident.lastName}`, title: task.title, time: task.time, category: task.category, updatedAt: buildTaskSnapshot([task])[task.id] }];
    recordPrint({ shiftId: SHIFT_HCA_DAY_ID, shiftCode: firstSheet.shift.shortCode || '', shiftName: firstSheet.shift.name, date, profile: 'simple_checklist', totalItems: 1, items: structuredTasks });
    db.updateResidentTask(task.id, { title: 'Renamed Task' });
    const updatedTask = db.getState().residentTasks.find(t => t.id === task.id)!;
    const currentSnapshot: TaskSnapshotItem[] = [{ id: updatedTask.id, roomNumber: resident.roomNumber, residentName: `${resident.firstName} ${resident.lastName}`, title: updatedTask.title, time: updatedTask.time, category: updatedTask.category, updatedAt: buildTaskSnapshot([updatedTask])[updatedTask.id] }];
    const whatChangedModel = buildWhatChangedModel(SHIFT_HCA_DAY_ID, date, currentSnapshot)!;
    expect(whatChangedModel.modified.length).toBeGreaterThan(0);
    const whatChangedMarkup = renderToStaticMarkup(<WhatChangedDocument model={whatChangedModel} />);

    for (const markup of [shiftConfigMarkup, woundMarkup, upcomingMarkup, whatChangedMarkup]) {
      for (const pattern of REMOVED_DARK_FILL_PATTERNS) {
        expect(markup).not.toContain(pattern);
      }
    }

    // The fixed documents use the shared light header token instead.
    expect(shiftConfigMarkup).toContain('var(--print-header-fill)');
    expect(upcomingMarkup).toContain('var(--print-header-fill)');
    expect(woundMarkup).toContain('var(--print-header-fill)');
  });
});
