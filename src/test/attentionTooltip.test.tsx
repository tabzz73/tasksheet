// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { TaskAttentionBadges } from '../components/common/TaskAttentionBadges';

describe('attention icon tooltips', () => {
  afterEach(() => cleanup());

  it('renders the readable tooltip at the document level so cards cannot clip it', () => {
    const view = render(
      <div data-testid="clipping-card" className="overflow-hidden">
        <TaskAttentionBadges attentionConfig={{ indicators: ['HIGH_ALERT'] }} />
      </div>,
    );

    const badge = view.getByTitle(/High Alert/i);
    fireEvent.mouseEnter(badge.parentElement as HTMLElement);
    const tooltip = view.getByRole('tooltip');

    expect(tooltip.textContent).toMatch(/High Alert/i);
    expect(tooltip.parentElement).toBe(document.body);
    expect(view.getByTestId('clipping-card').contains(tooltip)).toBe(false);
  });
});
