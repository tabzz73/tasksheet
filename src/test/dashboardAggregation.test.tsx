// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { db } from '../db';
import { SHIFT_HCA_DAY_ID } from '../data/defaultData';
import {
  LatestFyiCard,
  ResidentAttentionCard,
  ResidentFollowUpCard,
  UnitSituationCard,
} from '../components/dashboard/DashboardWidgets';

const noop = () => undefined;

describe('Dashboard aggregation — no duplication, correct empty/demo states', () => {
  afterEach(() => cleanup());

  describe('Empty mode (no operational data)', () => {
    beforeEach(() => {
      db.resetToDemoState();
      db.clearAllOperationalData();
    });

    it('shows the exact required empty-state copy on every card', () => {
      render(<ResidentAttentionCard state={db.getState()} today="2026-09-03" onOpenResident={noop} />);
      expect(screen.getByText('No active resident attention items.')).not.toBeNull();
      cleanup();

      render(<ResidentFollowUpCard state={db.getState()} today="2026-09-03" onOpenResident={noop} />);
      expect(screen.getByText('No follow-up tasks flagged for the Dashboard.')).not.toBeNull();
      cleanup();

      render(<LatestFyiCard state={db.getState()} today="2026-09-03" onNavigateToBinder={noop} />);
      expect(screen.getByText('No current FYIs.')).not.toBeNull();
    });

    it('never fabricates operational content in Current Unit Situation when nothing is eligible', () => {
      render(<UnitSituationCard state={db.getState()} today="2026-09-03" onOpenResident={noop} onNavigateToBinder={noop} />);
      expect(screen.getByText('Nothing unusual to report — a quiet shift so far.')).not.toBeNull();
    });
  });

  describe('Demo mode', () => {
    beforeEach(() => db.resetToDemoState());

    it('demonstrates all three content types with non-empty cards', () => {
      const state = db.getState();
      const today = '2026-09-03';

      render(<ResidentAttentionCard state={state} today={today} onOpenResident={noop} />);
      expect(screen.queryByText('No active resident attention items.')).toBeNull();
      cleanup();

      render(<ResidentFollowUpCard state={state} today={today} onOpenResident={noop} />);
      expect(screen.queryByText('No follow-up tasks flagged for the Dashboard.')).toBeNull();
      expect(screen.getByText('Behaviour Tracking')).not.toBeNull();
      cleanup();

      render(<LatestFyiCard state={state} today={today} onNavigateToBinder={noop} />);
      expect(screen.queryByText('No current FYIs.')).toBeNull();
    });
  });

  describe('No cross-card duplication', () => {
    beforeEach(() => {
      db.resetToDemoState();
      db.clearAllOperationalData();
    });

    it('shows an urgent FYI\'s full text only in Latest FYI, and only a short summary in Current Unit Situation', () => {
      const longText = 'This is a deliberately long FYI sentence written to exceed the short summary truncation limit used by Current Unit Situation so the test can prove it never renders the full text.';
      db.addFYI({ text: longText, category: 'safety', importance: 'urgent', effectiveDate: '2026-09-03' });
      const state = db.getState();

      const { container: latestContainer } = render(<LatestFyiCard state={state} today="2026-09-03" onNavigateToBinder={noop} />);
      expect(latestContainer.textContent).toContain(longText);
      cleanup();

      const { container: situationContainer } = render(<UnitSituationCard state={state} today="2026-09-03" onOpenResident={noop} onNavigateToBinder={noop} />);
      expect(situationContainer.textContent).not.toContain(longText);
      expect(situationContainer.textContent).toContain('This is a deliberately long FYI sentence');
    });

    it('does not populate Resident Follow-up from a Resident Attention item, or vice versa', () => {
      const resident = db.addResident({ firstName: 'Cross', lastName: 'Type', roomNumber: '400', status: 'active' });
      db.addResidentAttentionItem(resident.id, { type: 'Exit-Seeking Awareness', startDate: '2026-09-03' });
      const state = db.getState();

      render(<ResidentFollowUpCard state={state} today="2026-09-03" onOpenResident={noop} />);
      expect(screen.queryByText('Exit-Seeking Awareness')).toBeNull();
      expect(screen.getByText('No follow-up tasks flagged for the Dashboard.')).not.toBeNull();
    });
  });

  describe('Current Unit Situation icon per content kind', () => {
    beforeEach(() => {
      db.resetToDemoState();
      db.clearAllOperationalData();
    });

    it('uses a Hospital icon for an in-hospital resident and a distinct neutral icon for out-on-pass', () => {
      db.addResident({ firstName: 'Hosp', lastName: 'Case', roomNumber: '401', status: 'in_hospital' });
      db.addResident({ firstName: 'Pass', lastName: 'Case', roomNumber: '402', status: 'out_on_pass' });
      const { container } = render(<UnitSituationCard state={db.getState()} today="2026-09-03" onOpenResident={noop} onNavigateToBinder={noop} />);

      expect(container.querySelector('.lucide-hospital')).not.toBeNull();
      expect(container.querySelector('.lucide-log-out')).not.toBeNull();
    });

    it('uses a TriangleAlert icon for Resident Attention entries and an Activity icon for Resident Follow-up entries', () => {
      const resident = db.addResident({ firstName: 'Icon', lastName: 'Case', roomNumber: '403', status: 'active' });
      db.addResidentAttentionItem(resident.id, { type: 'Watch Closely', startDate: '2026-09-03', importance: 'urgent' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'RAI Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, priority: 'urgent' });

      const { container } = render(<UnitSituationCard state={db.getState()} today="2026-09-03" onOpenResident={noop} onNavigateToBinder={noop} />);
      expect(container.querySelector('.lucide-triangle-alert')).not.toBeNull();
      expect(container.querySelector('.lucide-activity')).not.toBeNull();
    });
  });
});
