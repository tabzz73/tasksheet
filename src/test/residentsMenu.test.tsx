// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { db } from '../db';
import { ResidentsView } from '../components/views/ResidentsView';

describe('Residents list action menu', () => {
  beforeEach(() => {
    db.resetToDemoState();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the three-dot popup in a viewport portal outside the clipped list card', () => {
    const view = render(
      <ResidentsView
        onOpenResidentProfile={() => undefined}
        onOpenAddResident={() => undefined}
        onOpenQuickCareSetup={() => undefined}
      />,
    );

    const actionButton = screen.getAllByRole('button', { name: /^Actions for / })[0];
    fireEvent.click(actionButton);

    const menu = screen.getByRole('menu', { name: /^Resident actions for / });
    const clippedListCard = view.container.querySelector('.overflow-hidden');

    expect(menu.parentElement).toBe(document.body);
    expect(clippedListCard?.contains(menu)).toBe(false);
    expect(menu.classList.contains('fixed')).toBe(true);
    expect(menu.classList.contains('overflow-y-auto')).toBe(true);
    expect(actionButton.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens upward when the resident action button is near the bottom of the viewport', () => {
    render(
      <ResidentsView
        onOpenResidentProfile={() => undefined}
        onOpenAddResident={() => undefined}
        onOpenQuickCareSetup={() => undefined}
      />,
    );

    const actionButton = screen.getAllByRole('button', { name: /^Actions for / })[0];
    Object.defineProperty(actionButton, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        x: 900,
        y: 700,
        top: 700,
        right: 940,
        bottom: 732,
        left: 900,
        width: 40,
        height: 32,
        toJSON: () => ({}),
      }),
    });

    fireEvent.click(actionButton);

    const menu = screen.getByRole('menu');
    expect(menu.style.top).toBe('');
    expect(menu.style.bottom).not.toBe('');
  });

  it('opens a resident from the full list row without a redundant Open button', () => {
    const onOpenResidentProfile = vi.fn();
    const view = render(
      <ResidentsView
        onOpenResidentProfile={onOpenResidentProfile}
        onOpenAddResident={() => undefined}
        onOpenQuickCareSetup={() => undefined}
      />,
    );

    const residentRow = view.container.querySelector<HTMLElement>('[aria-label^="Open resident "].cursor-pointer');
    expect(residentRow).not.toBeNull();
    expect(screen.queryByText(/^Open$/)).toBeNull();

    fireEvent.click(residentRow!);
    expect(onOpenResidentProfile).toHaveBeenCalledOnce();
  });
});
