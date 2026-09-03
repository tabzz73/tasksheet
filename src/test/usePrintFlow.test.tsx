// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { usePrintFlow } from '../app/usePrintFlow';
import { db } from '../db';
import { generateShiftSheet } from '../services/generator';
import { PrintService } from '../services/print';
import { getEntry } from '../services/printHistory';
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

  it('setters independently control each print-preview surface', () => {
    const { result } = renderHook(() => usePrintFlow());
    act(() => result.current.setSpecializedPrintDoc({ type: 'blank_template', model: PrintService.generateDocumentModel(generateShiftSheet('2026-09-02', SHIFT_HCA_DAY_ID)) }));
    expect(result.current.specializedPrintDoc).not.toBeNull();
    act(() => result.current.setSpecializedPrintDoc(null));
    expect(result.current.specializedPrintDoc).toBeNull();
  });
});
