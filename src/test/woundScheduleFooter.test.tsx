// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { WoundScheduleDocument } from '../components/print/WoundScheduleDocument';
import { db } from '../db';
import { buildWoundScheduleModel } from '../services/print/specializedDocs';

describe('wound schedule print footer', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('defines repeating coverage, generation timestamp, and page numbering', () => {
    const model = buildWoundScheduleModel('2026-08-28');
    const view = render(<WoundScheduleDocument model={model} />);
    const printCss = view.container.querySelector('style')?.textContent || '';

    expect(model.generatedAt).toBeTruthy();
    expect(printCss).toContain('@page tasksheet-wound-schedule');
    expect(printCss).toContain(`Coverage: ${model.formattedDate}`);
    expect(printCss).toContain('Generated:');
    expect(printCss).toContain('counter(page) " / " counter(pages)');
    expect(view.container.querySelector('.wound-schedule-document')).not.toBeNull();
  });
});
