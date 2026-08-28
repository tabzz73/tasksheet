import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FyiBinderPrintDocument } from '../components/print/FyiBinderPrintDocument';
import { PrintPreviewPage } from '../components/views/PrintPreviewPage';
import { PRINT_TYPOGRAPHY_STANDARD } from '../constants/printTypography';

describe('TaskSheet print typography standard', () => {
  it('defines the shared Arial healthcare-print token hierarchy', () => {
    expect(PRINT_TYPOGRAPHY_STANDARD).toEqual({
      fontFamily: 'Arial, Helvetica, sans-serif',
      titleSize: '16pt',
      sectionSize: '10pt',
      tableHeaderSize: '8.5pt',
      bodySize: '8.5pt',
      secondarySize: '8pt',
      footerSize: '7.5pt',
      lineHeight: 1.1,
    });
  });

  it('applies the shared print root to preview, physical print, and FYI Binder output', () => {
    const preview = renderToStaticMarkup(<PrintPreviewPage onBack={() => undefined} />);
    const binder = renderToStaticMarkup(<FyiBinderPrintDocument model={{
      facility: {
        siteName: 'Test Facility',
        street: '1 Test Street',
        city: 'Edmonton',
        province: 'AB',
        postalCode: 'T0T 0T0',
      },
      binderVersion: 1,
      generatedAt: '2026-08-27T12:00:00.000Z',
      scopeLabel: 'All staff',
      binderStatus: 'current',
      sharedFyis: [],
      sharedResidentGroups: [],
      roleSections: [],
    }} />);

    expect(preview.match(/tasksheet-print-document/g)?.length).toBeGreaterThanOrEqual(2);
    expect(binder).toContain('class="tasksheet-print-document"');
    expect(binder).toContain('font-family:Arial, Helvetica, sans-serif');
  });
});
