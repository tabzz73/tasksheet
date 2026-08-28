// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { printPageStyle, RepeatingPrintFooter, sanitizePrintPageName } from '../components/print/RepeatingPrintFooter';

describe('shared repeating print footer standard', () => {
  afterEach(() => cleanup());

  it('renders coverage, stable generation timestamp, and current/total pages', () => {
    const view = render(
      <RepeatingPrintFooter
        pageName="D1LPN Clinical"
        orientation="landscape"
        coverage="D1LPN · Friday, August 28, 2026"
        generatedAt="2026-08-28T18:15:00.000Z"
      />,
    );
    const css = view.container.querySelector('style')?.textContent || '';

    expect(css).toContain('@page tasksheet-d1lpn-clinical');
    expect(css).toContain('size: letter landscape');
    expect(css).toContain('Coverage: D1LPN · Friday, August 28, 2026');
    expect(css).toContain('Generated:');
    expect(css).toContain('counter(page) " / " counter(pages)');
  });

  it('uses the same sanitized named page for the document and its footer', () => {
    expect(sanitizePrintPageName('FYI Binder / All Roles')).toBe('tasksheet-fyi-binder-all-roles');
    expect(printPageStyle('FYI Binder / All Roles')).toEqual({ page: 'tasksheet-fyi-binder-all-roles' });
  });
});
