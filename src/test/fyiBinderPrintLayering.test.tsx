// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '../db';
import { FyiBinderPrintModal } from '../components/modals/FyiBinderPrintModal';

describe('FYI Binder print dialog layering', () => {
  beforeEach(() => {
    db.resetToDemoState();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders at document level above the isolated application content', () => {
    const view = render(
      <main data-testid="app-main" className="relative z-0 isolate overflow-hidden">
        <FyiBinderPrintModal isOpen onClose={vi.fn()} />
      </main>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Print FYI Binder' });

    expect(dialog.parentElement).toBe(document.body);
    expect(view.getByTestId('app-main').contains(dialog)).toBe(false);
    expect(dialog.classList.contains('fixed')).toBe(true);
    expect(dialog.classList.contains('z-[100]')).toBe(true);
  });

  it('renders the physical Binder in normal paginated flow instead of a clipped fixed viewport', () => {
    render(<FyiBinderPrintModal isOpen onClose={vi.fn()} />);

    const printStream = document.body.querySelector('.fyi-binder-print-stream');
    expect(printStream).not.toBeNull();
    expect(printStream?.parentElement).toBe(document.body);
    expect(printStream?.classList.contains('fixed')).toBe(false);
    expect(printStream?.classList.contains('inset-0')).toBe(false);
    expect(printStream?.querySelector('.fyi-resident-group')).not.toBeNull();
    expect(printStream?.querySelector('.fyi-block')).not.toBeNull();
    expect(document.body.classList.contains('fyi-binder-printing')).toBe(true);
  });
});
