// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { getTodayLocalDateString } from '../services/recurrence';
import { SYSTEM_REPORT_PRESETS } from '../services/reports';
import { ReportCatalogPanel } from '../components/views/ReportCatalogPanel';

describe('ReportCatalogPanel — Customize a Copy', () => {
  beforeEach(() => db.resetToDemoState());
  afterEach(() => cleanup());

  it('opens the builder pre-filled from a system preset, and saving creates a new user preset without mutating the system preset', () => {
    const preset = SYSTEM_REPORT_PRESETS.find(item => item.id === 'resident-directory')!;
    const systemPresetsBefore = JSON.stringify(SYSTEM_REPORT_PRESETS);
    const today = getTodayLocalDateString();

    render(
      <ReportCatalogPanel
        selectedDate={today}
        onPreview={() => undefined}
        category="Residents"
        woundWeekAnchor={today}
        onWoundWeekAnchorChange={() => undefined}
        woundSupplyScope="current_week"
        onWoundSupplyScopeChange={() => undefined}
        today={today}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: `Customize a copy of ${preset.name}` }));
    expect(screen.getByRole('dialog')).not.toBeNull();
    const nameInput = screen.getByLabelText('Report preset name') as HTMLInputElement;
    expect(nameInput.value).toBe(`${preset.name} (Custom)`);

    fireEvent.click(screen.getByRole('button', { name: /Save Preset/i }));

    // System preset catalog is never mutated by the customize-and-save flow.
    expect(JSON.stringify(SYSTEM_REPORT_PRESETS)).toBe(systemPresetsBefore);

    // A distinct new entry appears under the user's own saved presets.
    const savedPresets = db.getState().settings.savedPrintPresets || [];
    expect(savedPresets).toHaveLength(1);
    expect(savedPresets[0].name).toBe(`${preset.name} (Custom)`);
    expect(savedPresets[0].id).not.toBe(preset.id);
  });
});
