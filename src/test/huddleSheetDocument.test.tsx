import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import { buildHuddleSheetModel } from '../services/dashboard';
import { HuddleSheetDocument } from '../components/print/HuddleSheetDocument';

const today = '2026-09-04';

// A permissive but real grayscale-safety check: every hex color literal used
// must be a neutral gray/black tone (equal or near-equal R/G/B channels), not
// a hue like red/blue/green — matching the monochrome laser-first print
// standard the rest of the print system already follows.
function assertGrayscaleSafe(markup: string) {
  const hexColors = markup.match(/#[0-9A-Fa-f]{6}/g) || [];
  for (const hex of hexColors) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
    // Generous enough to accept the print system's established near-black/
    // slate ink tokens (e.g. #111827, #374151, #475569 from the shared
    // RepeatingPrintFooter — visually indistinguishable from black/gray on a
    // monochrome laser printer) while still catching a real hue like
    // red/blue/green (diff well over 100).
    expect(maxDiff, `color ${hex} is not grayscale-safe`).toBeLessThanOrEqual(40);
  }
}

describe('HuddleSheetDocument — print rendering', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });

  it('renders every section in order: Header, Census, Away, Unit Situation, Resident Attention, Must-Not-Miss, FYI, Notes', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);

    const order = ['SHIFT HUDDLE / ENDORSEMENT SHEET', 'Census', 'Away From Unit', 'Current Unit Situation', 'Resident Attention', 'Must-Not-Miss Follow-up', 'Important FYI', 'Notes'];
    let lastIndex = -1;
    for (const label of order) {
      const index = markup.indexOf(label);
      expect(index, `expected to find "${label}"`).toBeGreaterThan(-1);
      expect(index, `"${label}" appeared out of order`).toBeGreaterThan(lastIndex);
      lastIndex = index;
    }
  });

  it('shows a clear empty-state line for each genuinely empty section, never a blank gap', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    expect(markup).toContain('No residents currently away from the unit.');
    expect(markup).toContain('No unit or site-wide notices right now.');
    expect(markup).toContain('No resident-specific attention items right now.');
    expect(markup).toContain('Nothing outstanding right now.');
    expect(markup).toContain('No FYIs flagged for Huddle right now.');
  });

  it('renders real Census, Away, Attention, and Follow-up content when present', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Overdue', roomNumber: '250', status: 'active' });
    db.addResident({ firstName: 'G', lastName: 'Away', roomNumber: '251', status: 'in_hospital' });
    db.addAttentionItem({ scope: 'site', title: 'Fire drill at 1000', startDate: today, active: true, showInHuddle: true } as any);
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Collect urine sample', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, mustNotMiss: true, followUpDueDate: '2026-09-02' });

    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);

    expect(markup).toContain('<strong>1</strong> present');
    expect(markup).toContain('<strong>1</strong> in hospital');
    expect(markup).toContain('G Away');
    expect(markup).toContain('Fire drill at 1000');
    expect(markup).toContain('Collect urine sample');
    expect(markup).toContain('2 days overdue');
  });

  it('never uses task checkboxes — this is a briefing, not a checklist', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    expect(markup).not.toContain('type="checkbox"');
  });

  it('includes the exact source-of-truth footer notice, and it never appears more than once', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    // React escapes the apostrophe in raw HTML output — match the actually
    // rendered text (with &#x27;) rather than a literal apostrophe.
    const notice = 'Shift guide only — verify against your site&#x27;s approved source of truth. If there is any discrepancy or unclear instruction, check with the Team Lead before proceeding.';
    const occurrences = markup.split(notice).length - 1;
    expect(occurrences).toBe(1);
  });

  it('includes the repeating print footer (page counter / physical page control) for its own named page', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    expect(markup).toContain('data-print-footer="tasksheet-huddle-sheet"');
    expect(markup).toContain('@page tasksheet-huddle-sheet');
    expect(markup).toContain('counter(page)');
  });

  it('is grayscale-safe: no hue colors, only neutral gray/black tones', () => {
    const resident = db.addResident({ firstName: 'F', lastName: 'Full', roomNumber: '252', status: 'active' });
    db.addAttentionItem({ scope: 'site', title: 'Urgent notice', startDate: today, active: true, showInHuddle: true, priority: 'urgent' } as any);
    db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'Task', category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, mustNotMiss: true, followUpDueDate: '2026-09-01' });

    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    assertGrayscaleSafe(markup);
  });

  it('never renders color as the sole signal for priority — a text flag accompanies it', () => {
    db.addAttentionItem({ scope: 'site', title: 'Urgent notice', startDate: today, active: true, showInHuddle: true, priority: 'urgent' } as any);
    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    // The flag text itself communicates severity (styled uppercase via CSS
    // text-transform, which doesn't change the underlying text node) —
    // never relying on the accompanying border/color alone.
    expect(markup.toLowerCase()).toContain('>urgent<');
  });

  it('shows Code of the Month compactly when enabled', () => {
    db.updateSettings({
      emergencyCodes: [{ id: 'c1', code: 'Blue', name: 'Cardiac Arrest', isSystem: true }],
      codeOfTheMonthId: 'c1',
      codeOfTheMonthEnabled: true,
    });
    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    expect(markup).toContain('Code of the Month');
    expect(markup).toContain('Code Blue');
    expect(markup).toContain('Cardiac Arrest');
  });

  it('omits Code of the Month entirely when not configured', () => {
    const model = buildHuddleSheetModel(db.getState(), today);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    expect(markup).not.toContain('Code of the Month');
  });

  it('handles a heavy multi-page volume of content without throwing', () => {
    for (let i = 0; i < 40; i++) {
      const resident = db.addResident({ firstName: `F${i}`, lastName: `Res${i}`, roomNumber: `${300 + i}`, status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: `Overdue Task ${i}`, category: 'Monitoring', time: '0800', frequency: 'once', showOnDashboard: true, mustNotMiss: true, followUpDueDate: '2026-09-01' });
      db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: `Attention ${i}`, startDate: today, active: true, showInHuddle: true } as any);
    }
    const model = buildHuddleSheetModel(db.getState(), today);
    expect(model.mustNotMiss.length).toBe(40);
    expect(model.residentAttention.length).toBe(40);
    const markup = renderToStaticMarkup(<HuddleSheetDocument model={model} />);
    expect(markup).toContain('Overdue Task 0');
    expect(markup).toContain('Overdue Task 39');
    assertGrayscaleSafe(markup);
  });
});
