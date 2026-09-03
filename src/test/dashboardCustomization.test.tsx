// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { db } from '../db';
import { DashboardView } from '../components/views/DashboardView';
import { DEFAULT_DASHBOARD_LAYOUT } from '../data/defaultData';

describe('Dashboard customization', () => {
  beforeEach(() => {
    localStorage.clear();
    db.resetToDemoState();
  });
  afterEach(() => cleanup());

  const renderDashboard = () => render(
    <DashboardView
      currentDate="2026-09-03"
      onOpenShift={() => undefined}
      onOpenQuickAdd={() => undefined}
      onPrintShift={() => undefined}
      onNavigateToBinder={() => undefined}
      onNavigateToResidents={() => undefined}
      onOpenResidentProfile={() => undefined}
      onNavigateToSettings={() => undefined}
      onNavigateToBathing={() => undefined}
    />,
  );

  it('defaults to the recommended layout: hides bathing/wound attention, shows the operational core', () => {
    renderDashboard();
    expect(screen.getByText('Current Unit Situation')).not.toBeNull();
    expect(screen.getByText('Resident Attention')).not.toBeNull();
    expect(screen.getByText('Latest FYI')).not.toBeNull();
    expect(screen.getByText('Away From Unit')).not.toBeNull();
    expect(screen.queryByText("Today's Bathing")).toBeNull();
    expect(screen.queryByText('Wound Attention')).toBeNull();
  });

  it('hiding a widget via Customize removes it from the Dashboard and persists across remounts', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Customize Dashboard' })).not.toBeNull();

    const fyiRow = within(dialog).getByText('Latest FYI').closest('li')!;
    fireEvent.click(within(fyiRow).getByRole('checkbox'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));

    expect(screen.queryByRole('heading', { name: 'Latest FYI' })).toBeNull();

    cleanup();
    renderDashboard();
    expect(screen.queryByRole('heading', { name: 'Latest FYI' })).toBeNull();
    expect(db.getState().settings.dashboardLayout?.find(w => w.id === 'latest_fyi')?.visible).toBe(false);
  });

  it('reorders widgets with keyboard-accessible Move Up/Down controls (no drag required)', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    const dialog = screen.getByRole('dialog');

    const items = within(dialog).getAllByRole('listitem');
    const firstItemLabel = items[0].textContent;
    // Move the second item up so it becomes first.
    fireEvent.click(within(items[1]).getByRole('button', { name: /move.*up/i }));
    const reordered = within(dialog).getAllByRole('listitem');
    expect(reordered[0].textContent).not.toBe(firstItemLabel);

    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    const savedOrder = db.getState().settings.dashboardLayout!.map(w => w.id);
    expect(savedOrder[0]).not.toBe(DEFAULT_DASHBOARD_LAYOUT[0].id);
  });

  it('Restore Default Layout resets show/hide and order back to the recommended defaults', () => {
    db.updateSettings({ dashboardLayout: [{ id: 'wound_attention', visible: true }, { id: 'unit_situation', visible: false }] as any });
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Restore Default Layout' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(db.getState().settings.dashboardLayout).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it('Add Attention creates a resident attention item that immediately appears on the Dashboard', () => {
    renderDashboard();
    fireEvent.click(screen.getByRole('button', { name: 'Add Attention' }));
    expect(screen.getByRole('heading', { name: 'Add Resident Attention' })).not.toBeNull();

    fireEvent.change(screen.getByLabelText("What's being tracked"), { target: { value: 'Behaviour Tracking' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Attention Item' }));

    expect(screen.getAllByText('Behaviour Tracking').length).toBeGreaterThan(0);
  });
});
