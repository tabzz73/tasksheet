// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TaskActionMenu } from '../components/common/TaskActionMenu';

describe('task three-dot action menu', () => {
  afterEach(() => cleanup());

  it('renders outside clipped HCA cards and closes on outside click', () => {
    const view = render(
      <div data-testid="hca-card" className="overflow-hidden">
        <TaskActionMenu onEdit={vi.fn()} onDelete={vi.fn()} ariaLabel="Actions for Morning Care" />
      </div>,
    );

    const trigger = view.getByRole('button', { name: /Actions for Morning Care/i });
    fireEvent.click(trigger);
    const menu = view.getByRole('menu', { name: /Care Task actions/i });

    expect(menu.parentElement).toBe(document.body);
    expect(view.getByTestId('hca-card').contains(menu)).toBe(false);
    expect(menu.classList.contains('fixed')).toBe(true);
    expect(menu.classList.contains('overflow-y-auto')).toBe(true);

    fireEvent.pointerDown(document.body);
    expect(view.queryByRole('menu')).toBeNull();
  });

  it('opens above a trigger near the viewport bottom and closes on scroll', () => {
    const view = render(<TaskActionMenu onEdit={vi.fn()} onDelete={vi.fn()} ariaLabel="Actions for Bedtime Care" />);
    const trigger = view.getByRole('button', { name: /Actions for Bedtime Care/i });
    Object.defineProperty(trigger, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 700, right: 940, bottom: 732, left: 908, width: 32, height: 32, x: 908, y: 700, toJSON: () => ({}) }),
    });

    fireEvent.click(trigger);
    const menu = view.getByRole('menu');
    expect(menu.style.top).toBe('');
    expect(menu.style.bottom).not.toBe('');

    fireEvent.scroll(window);
    expect(view.queryByRole('menu')).toBeNull();
  });
});
