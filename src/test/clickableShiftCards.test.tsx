// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { DashboardView } from '../components/views/DashboardView';
import { ShiftsView } from '../components/views/ShiftsView';

describe('clickable shift cards and rows', () => {
  beforeEach(() => {
    localStorage.clear();
    db.resetToDemoState();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens a Dashboard shift from the full card while Print remains independent', () => {
    const onOpenShift = vi.fn();
    const onPrintShift = vi.fn();
    const view = render(
      <DashboardView
        currentDate="2026-08-27"
        onOpenShift={onOpenShift}
        onOpenQuickAdd={() => undefined}
        onPrintShift={onPrintShift}
        onNavigateToBinder={() => undefined}
        onNavigateToResidents={() => undefined}
      />,
    );

    const shiftCard = view.container.querySelector<HTMLElement>('[aria-label^="Open "][aria-label$=" shift"].cursor-pointer');
    expect(shiftCard).not.toBeNull();
    expect(screen.queryByText('Open Shift')).toBeNull();

    const printButton = shiftCard!.querySelector<HTMLButtonElement>('button');
    fireEvent.click(printButton!);
    expect(onPrintShift).toHaveBeenCalledOnce();
    expect(onOpenShift).not.toHaveBeenCalled();

    fireEvent.click(shiftCard!);
    expect(onOpenShift).toHaveBeenCalledOnce();
  });

  it('opens a shift from the full list row without a redundant Open button', () => {
    const onOpenShift = vi.fn();
    const view = render(
      <ShiftsView
        currentDate="2026-08-27"
        onDateChange={() => undefined}
        onOpenShift={onOpenShift}
        onPrintShift={() => undefined}
        onOpenAddShift={() => undefined}
      />,
    );

    const shiftRow = view.container.querySelector<HTMLElement>('[aria-label^="Open "][aria-label$=" shift"].cursor-pointer');
    expect(shiftRow).not.toBeNull();
    expect(screen.queryByText(/^Open$/)).toBeNull();

    fireEvent.keyDown(shiftRow!, { key: 'Enter' });
    expect(onOpenShift).toHaveBeenCalledOnce();
  });
});
