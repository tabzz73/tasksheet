// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { createFirstAdmin } from '../services/auth';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { buildHuddleSheetModel } from '../services/dashboard';
import { PrintPreviewPage } from '../components/views/PrintPreviewPage';
import { ReportsPrintView } from '../components/views/ReportsPrintView';
import { buildSavedPrintPackageModel, saveSavedPrintPackage } from '../services/print/packages';
import { PrintPackageView } from '../components/print/PrintPackageView';
import { SavedPrintPackage } from '../types';

const today = '2026-09-04';

describe('Huddle Sheet — Print Center / preview / audit integration', () => {
  beforeEach(async () => {
    db.resetToDemoState();
    db.clearAllOperationalData();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
  });
  afterEach(() => cleanup());

  it('records exactly one "Huddle Sheet print preview opened" audit event when the preview mounts', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    render(<PrintPreviewPage specializedDoc={{ type: 'huddle', model }} onBack={() => undefined} />);

    const events = db.getState().auditEvents.filter(e => e.action === 'print_preview_opened' && e.summary.includes('Huddle'));
    expect(events).toHaveLength(1);
    expect(events[0].userDisplayName).toBe('Jordan Smith');
    expect(events[0].entityType).toBe('print');
    // Honest wording — a preview opening, never a claim that a physical print completed.
    expect(events[0].summary.toLowerCase()).not.toContain('printed');
  });

  it('does not record a second audit event on re-render of the same mounted preview', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    const { rerender } = render(<PrintPreviewPage specializedDoc={{ type: 'huddle', model }} onBack={() => undefined} />);
    rerender(<PrintPreviewPage specializedDoc={{ type: 'huddle', model }} onBack={() => undefined} />);

    const events = db.getState().auditEvents.filter(e => e.action === 'print_preview_opened' && e.summary.includes('Huddle'));
    expect(events).toHaveLength(1);
  });

  it('warns (without blocking) when no shift is currently in effect for the header', () => {
    // No time-mocking needed — a facility whose shifts don't cover the
    // current wall-clock moment naturally has no derivable "current shift".
    db.getState().shifts.forEach(s => db.updateShift(s.id, { isActive: false }));
    const model = buildHuddleSheetModel(db.getState(), today);
    expect(model.shiftCode).toBeUndefined();

    render(<PrintPreviewPage specializedDoc={{ type: 'huddle', model }} onBack={() => undefined} />);
    expect(screen.getByText(/Huddle Sheet — heads up/)).not.toBeNull();
    expect(screen.getByText(/No current shift is in effect/)).not.toBeNull();
    // Never blocked — the Print button is still present and enabled.
    const printButton = screen.getByRole('button', { name: 'Print' }) as HTMLButtonElement;
    expect(printButton.disabled).toBe(false);
  });

  it('warns (without blocking) when all Huddle sections are empty', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    expect(model.hasAnyContent).toBe(false);
    render(<PrintPreviewPage specializedDoc={{ type: 'huddle', model }} onBack={() => undefined} />);
    expect(screen.getByText(/All Huddle sections are currently empty/)).not.toBeNull();
    const printButton = screen.getByRole('button', { name: 'Print' }) as HTMLButtonElement;
    expect(printButton.disabled).toBe(false);
  });

  it('does not warn once real content exists', () => {
    db.addAttentionItem({ scope: 'site', title: 'Fire drill', startDate: today, active: true, showInHuddle: true } as any);
    const model = buildHuddleSheetModel(db.getState(), today);
    render(<PrintPreviewPage specializedDoc={{ type: 'huddle', model }} onBack={() => undefined} />);
    expect(screen.queryByText(/Huddle Sheet — heads up/)).toBeNull();
  });

  it('is reachable from Print Center → Operational Reports → Specialized, and opens the preview on click', () => {
    let opened: { type: string } | null = null;
    render(
      <ReportsPrintView
        currentDate={today}
        onDateChange={() => undefined}
        onPrintShiftSheet={() => undefined}
        onPrintSpecializedDoc={(doc) => { opened = doc; }}
        onPrintPackage={() => undefined}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Operational Reports' }));
    expect(screen.getByRole('button', { name: 'Print Huddle' })).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Print Huddle' }));
    expect(opened).not.toBeNull();
    expect((opened as any).type).toBe('huddle');
  });

  it('can be included in a Saved Print Package and renders inside the bundled package view', () => {
    const pkg: SavedPrintPackage = {
      id: 'spp_huddle_test',
      name: 'Endorsement Bundle',
      items: [{ id: 'i1', type: 'huddle_sheet' }],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    saveSavedPrintPackage(pkg);

    const resident = db.addResident({ firstName: 'F', lastName: 'Pkg', roomNumber: '260', status: 'active' });
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Overdue Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, mustNotMiss: true, followUpDueDate: '2026-09-01' });

    const packageModel = buildSavedPrintPackageModel(pkg, today);
    expect(packageModel.items).toHaveLength(1);
    expect(packageModel.items[0].docType).toBe('huddle_sheet');
    expect(packageModel.items[0].huddleModel?.mustNotMiss.some(m => m.title === 'Overdue Task')).toBe(true);

    const view = render(<PrintPackageView packageModel={packageModel} />);
    expect(screen.getByText('SHIFT HUDDLE / ENDORSEMENT SHEET')).not.toBeNull();
    expect(view.container.textContent).toContain('Overdue Task');
  });

  it('a package containing an empty Huddle Sheet surfaces a content warning rather than failing', () => {
    const pkg: SavedPrintPackage = {
      id: 'spp_huddle_empty',
      name: 'Empty Endorsement Bundle',
      items: [{ id: 'i1', type: 'huddle_sheet' }],
      createdAt: '2026-09-01T00:00:00.000Z',
      updatedAt: '2026-09-01T00:00:00.000Z',
    };
    saveSavedPrintPackage(pkg);
    const packageModel = buildSavedPrintPackageModel(pkg, today);
    expect(packageModel.contentWarnings.some(w => w.includes('Huddle'))).toBe(true);
    expect(packageModel.items).toHaveLength(1); // still included, never blocked
  });
});
