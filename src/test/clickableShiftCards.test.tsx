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

    const shiftNavigation = view.container.querySelector<HTMLButtonElement>('[data-card-navigation="true"][aria-label^="Open "][aria-label$=" shift"]');
    expect(shiftNavigation).not.toBeNull();
    expect(shiftNavigation?.tagName).toBe('BUTTON');
    expect(shiftNavigation?.className).toContain('focus-visible:ring-2');
    expect(shiftNavigation?.querySelector('button, a, [role="button"]')).toBeNull();
    expect(screen.queryByText('Open Shift')).toBeNull();

    const printButton = shiftNavigation!.parentElement!.querySelector<HTMLButtonElement>('button:not([data-card-navigation])');
    fireEvent.click(printButton!);
    expect(onPrintShift).toHaveBeenCalledOnce();
    expect(onOpenShift).not.toHaveBeenCalled();

    fireEvent.click(shiftNavigation!);
    expect(onOpenShift).toHaveBeenCalledOnce();
  });

  it('uses a native full-row navigation button without a redundant Open button', () => {
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

    const shiftNavigation = view.container.querySelector<HTMLButtonElement>('[data-card-navigation="true"][aria-label^="Open "][aria-label$=" shift"]');
    expect(shiftNavigation).not.toBeNull();
    expect(shiftNavigation?.tagName).toBe('BUTTON');
    expect(shiftNavigation?.querySelector('button, a, [role="button"]')).toBeNull();
    expect(screen.queryByText(/^Open$/)).toBeNull();

    fireEvent.click(shiftNavigation!);
    expect(onOpenShift).toHaveBeenCalledOnce();
  });
});
