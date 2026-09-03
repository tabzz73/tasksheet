import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { PrintDocumentView } from '../components/print/PrintDocumentView';
import { SHIFT_HCA_DAY_ID, SHIFT_LPN_DAY_ID } from '../data/defaultData';
import { db } from '../db';
import { generateShiftSheet } from '../services/generator';
import { PrintService } from '../services/print';

// Split around the apostrophe so the assertion doesn't depend on how
// react-dom's static-markup serializer happens to HTML-entity-encode it.
function expectDisclaimerPresent(html: string) {
  expect(html).toContain('Shift guide only');
  expect(html).toContain('verify against your site');
  expect(html).toContain('approved source of truth');
  expect(html).toContain('Report any discrepancy to LPN/Team Lead.');
}

describe('HCA/LPN TaskSheet compliance footer', () => {
  beforeEach(() => {
    db.resetToDemoState();
  });

  it('prints the fixed "Shift guide only" disclaimer on the HCA TaskSheet', () => {
    const model = PrintService.generateDocumentModel(generateShiftSheet('2026-09-03', SHIFT_HCA_DAY_ID), 'simple_checklist');
    const html = renderToStaticMarkup(<PrintDocumentView document={model} />);
    expectDisclaimerPresent(html);
  });

  it('prints the fixed "Shift guide only" disclaimer on the LPN TaskSheet', () => {
    const model = PrintService.generateDocumentModel(generateShiftSheet('2026-09-03', SHIFT_LPN_DAY_ID), 'clinical_worksheet');
    const html = renderToStaticMarkup(<PrintDocumentView document={model} />);
    expectDisclaimerPresent(html);
  });

  it('prints the disclaimer even when the facility has no confidentiality notice configured', () => {
    db.updateFacilitySettings({
      branding: {
        headerStyle: 'standard',
        shiftHeaderFormat: 'short_code_only',
        confidentialityNotice: '',
        showConfidentialityNotice: false,
        showSupervisorSignatureBlock: true,
      },
    });
    const model = PrintService.generateDocumentModel(generateShiftSheet('2026-09-03', SHIFT_HCA_DAY_ID), 'simple_checklist');
    const html = renderToStaticMarkup(<PrintDocumentView document={model} />);
    expectDisclaimerPresent(html);
  });
});
