// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePrintFlow } from '../app/usePrintFlow';
import { db } from '../db';
import { generateShiftSheet } from '../services/generator';
import { PrintService } from '../services/print';
import { getEntry } from '../services/printHistory';
import { buildHcaDailyPackage } from '../services/print/packages';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';

describe('usePrintFlow', () => {
  beforeEach(() => {
    db.resetToDemoState();
  });

  it('starts with no print state set', () => {
    const { result } = renderHook(() => usePrintFlow());
    expect(result.current.printShiftSheet).toBeNull();
    expect(result.current.printPreviewModel).toBeNull();
    expect(result.current.specializedPrintDoc).toBeNull();
    expect(result.current.packagePrintModel).toBeNull();
  });

  it('openFullPreviewFromShiftSheet promotes the model to full preview, clears the shift-sheet modal, and records the print', () => {
    const date = '2026-09-02';
    const sheet = generateShiftSheet(date, SHIFT_HCA_DAY_ID);
    const model = PrintService.generateDocumentModel(sheet);

    const { result } = renderHook(() => usePrintFlow());
    act(() => result.current.setPrintShiftSheet(sheet));
    expect(result.current.printShiftSheet).toBe(sheet);

    act(() => result.current.openFullPreviewFromShiftSheet(sheet, model));

    expect(result.current.printPreviewModel).toBe(model);
    expect(result.current.printShiftSheet).toBeNull();

    const entry = getEntry(sheet.shift.id, date);
    expect(entry).toBeDefined();
    expect(entry?.profile).toBe(model.profile);
  });

  it('openPackagePreview records a Print History entry for every bundled shift, then shows the package', () => {
    const date = '2026-09-09';
    const pkg = buildHcaDailyPackage(date, { includeBathingGrid: false });
    const shiftItem = pkg.items.find(item => item.docType === 'shift_document');
    expect(shiftItem?.shiftSheet).toBeDefined();
    expect(getEntry(shiftItem!.shiftSheet!.shift.id, date)).toBeUndefined();

    const { result } = renderHook(() => usePrintFlow());
    act(() => result.current.openPackagePreview(pkg));

    expect(result.current.packagePrintModel).toBe(pkg);
    const entry = getEntry(shiftItem!.shiftSheet!.shift.id, date);
    expect(entry).toBeDefined();
    expect(entry?.profile).toBe(shiftItem!.shiftModel!.profile);
  });

  it('setters independently control each print-preview surface', () => {
    const { result } = renderHook(() => usePrintFlow());
    act(() => result.current.setSpecializedPrintDoc({ type: 'blank_template', model: PrintService.generateDocumentModel(generateShiftSheet('2026-09-02', SHIFT_HCA_DAY_ID)) }));
    expect(result.current.specializedPrintDoc).not.toBeNull();
    act(() => result.current.setSpecializedPrintDoc(null));
    expect(result.current.specializedPrintDoc).toBeNull();
  });
});
