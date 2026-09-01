// @vitest-environment jsdom
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { printPageStyle, RepeatingPrintFooter, sanitizePrintPageName } from '../components/print/RepeatingPrintFooter';

describe('shared repeating print footer standard', () => {
  afterEach(() => cleanup());

  it('renders privacy-safe loose-page identity, divider, and Page X of Y', () => {
    const view = render(
      <RepeatingPrintFooter
        pageName="D1LPN Clinical"
        orientation="landscape"
        facilityName="Cedar Grove"
        documentLabel="LPN TaskSheet"
        dateLabel="Aug 28, 2026"
        secondaryLabel="D1LPN · 0700–1900"
        generatedAt="2026-08-28T18:15:00.000Z"
      />,
    );
    const css = view.container.querySelector('style')?.textContent || '';

    expect(css).toContain('@page tasksheet-d1lpn-clinical');
    expect(css).toContain('size: letter landscape');
    expect(css).toContain('Cedar Grove | LPN TaskSheet');
    expect(css).toContain('D1LPN · 0700–1900');
    expect(css).toContain('Aug 28, 2026');
    expect(css).toContain('Page " counter(page) " of " counter(pages)');
    expect(css).toContain('border-top: 0.5pt solid #94a3b8');
    expect(css).toContain('margin: 5mm 5mm 12mm 5mm');
    expect(css).not.toContain('resident');
  });

  it('uses the same sanitized named page for the document and its footer', () => {
    expect(sanitizePrintPageName('FYI Binder / All Roles')).toBe('tasksheet-fyi-binder-all-roles');
    expect(printPageStyle('FYI Binder / All Roles')).toEqual({ page: 'tasksheet-fyi-binder-all-roles' });
  });
});
