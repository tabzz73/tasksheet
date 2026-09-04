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
import { getTodayLocalDateString } from '../services/recurrence';

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
      render(<UnitSituationCard state={db.getState()} today="2026-09-03" />);
      expect(screen.getByText('Nothing unusual to report — a quiet shift so far.')).not.toBeNull();
    });
  });

  describe('Demo mode', () => {
    beforeEach(() => db.resetToDemoState());

    it('demonstrates all three content types with non-empty cards', () => {
      const state = db.getState();
      // Demo seed data's active windows are computed relative to the real
      // wall-clock date (not a fixed literal), so "today" here must match
      // that same real date or eligibility silently drifts as time passes.
      const today = getTodayLocalDateString();

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

    it('shows an urgent FYI\'s full text only in Latest FYI, never in Current Unit Situation (FYI is not an Attention source)', () => {
      const longText = 'This is a deliberately long FYI sentence written to exceed the short summary truncation limit used by Current Unit Situation so the test can prove it never renders the full text.';
      db.addFYI({ text: longText, category: 'safety', importance: 'urgent', effectiveDate: '2026-09-03' });
      const state = db.getState();

      const { container: latestContainer } = render(<LatestFyiCard state={state} today="2026-09-03" onNavigateToBinder={noop} />);
      expect(latestContainer.textContent).toContain(longText);
      cleanup();

      const { container: situationContainer } = render(<UnitSituationCard state={state} today="2026-09-03" />);
      expect(situationContainer.textContent).not.toContain(longText);
    });

    it('does not populate Resident Follow-up from an Attention item, or vice versa', () => {
      const resident = db.addResident({ firstName: 'Cross', lastName: 'Type', roomNumber: '400', status: 'active' });
      db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Exit-Seeking Awareness', startDate: '2026-09-03' });
      const state = db.getState();

      render(<ResidentFollowUpCard state={state} today="2026-09-03" onOpenResident={noop} />);
      expect(screen.queryByText('Exit-Seeking Awareness')).toBeNull();
      expect(screen.getByText('No follow-up tasks flagged for the Dashboard.')).not.toBeNull();
    });

    it('does not populate Current Unit Situation from Resident-scoped Attention — only Unit/Site', () => {
      const resident = db.addResident({ firstName: 'Res', lastName: 'Scoped', roomNumber: '405', status: 'active' });
      db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Resident-only situation', startDate: '2026-09-03' });
      db.addAttentionItem({ scope: 'unit', title: 'Unit-wide situation', startDate: '2026-09-03' });
      const state = db.getState();

      render(<UnitSituationCard state={state} today="2026-09-03" />);
      expect(screen.queryByText('Resident-only situation')).toBeNull();
      expect(screen.getByText('Unit-wide situation')).not.toBeNull();
    });

    it('does not populate Current Unit Situation from a Resident Task flagged showOnDashboard', () => {
      const resident = db.addResident({ firstName: 'Task', lastName: 'Flagged', roomNumber: '406', status: 'active' });
      db.addResidentTask({ residentId: resident.id, shiftId: SHIFT_HCA_DAY_ID, title: 'RAI Tracking', category: 'Monitoring', time: '0800', frequency: 'daily', showOnDashboard: true, priority: 'urgent' });
      const state = db.getState();

      render(<UnitSituationCard state={state} today="2026-09-03" />);
      expect(screen.queryByText('RAI Tracking')).toBeNull();
      expect(screen.getByText('Nothing unusual to report — a quiet shift so far.')).not.toBeNull();
    });
  });

  describe('Current Unit Situation icon per scope', () => {
    beforeEach(() => {
      db.resetToDemoState();
      db.clearAllOperationalData();
    });

    it('uses distinct icons for Unit-scoped and Site-scoped Attention', () => {
      db.addAttentionItem({ scope: 'unit', title: 'Unit outage', startDate: '2026-09-03' });
      db.addAttentionItem({ scope: 'site', title: 'Fire drill', startDate: '2026-09-03' });
      const { container } = render(<UnitSituationCard state={db.getState()} today="2026-09-03" />);

      expect(container.querySelector('.lucide-wrench')).not.toBeNull();
      expect(container.querySelector('.lucide-shield-alert')).not.toBeNull();
    });
  });
});
