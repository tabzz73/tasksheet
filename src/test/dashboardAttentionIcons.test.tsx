// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { db } from '../db';
import {
  AwayFromUnitCard,
  LatestFyiCard,
  ResidentAttentionCard,
  TodaysBathingCard,
  WoundAttentionCard,
} from '../components/dashboard/DashboardWidgets';

describe('Dashboard attention icons — restrained, text-paired, not color-only', () => {
  beforeEach(() => {
    db.resetToDemoState();
    db.clearAllOperationalData();
  });
  afterEach(() => cleanup());

  it('Resident Attention: header carries a decorative alert icon and the heading name is unchanged', () => {
    const resident = db.addResident({ firstName: 'A', lastName: 'One', roomNumber: '101', status: 'active' });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Increased Falls Observation', startDate: '2026-09-03' });

    render(<ResidentAttentionCard state={db.getState()} today="2026-09-03" onOpenResident={() => undefined} />);

    const heading = screen.getByRole('heading', { name: 'Resident Attention' });
    expect(heading).not.toBeNull();
    const icon = heading.querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon!.getAttribute('aria-hidden')).toBe('true');
  });

  it('Resident Attention: an item ending today shows a clock icon paired with visible "Ends today" text', () => {
    const resident = db.addResident({ firstName: 'B', lastName: 'Two', roomNumber: '102', status: 'active' });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Two-Person Transfer Needed', startDate: '2026-08-25', endDate: '2026-09-03' });

    render(<ResidentAttentionCard state={db.getState()} today="2026-09-03" onOpenResident={() => undefined} />);

    const badge = screen.getByText('Ends today');
    expect(badge.parentElement?.querySelector('svg')).not.toBeNull();
  });

  it('Resident Attention: an item not ending soon shows no clock badge at all', () => {
    const resident = db.addResident({ firstName: 'C', lastName: 'Three', roomNumber: '103', status: 'active' });
    db.addAttentionItem({ scope: 'resident', residentId: resident.id, title: 'Temporary care preference change', startDate: '2026-08-01' });

    render(<ResidentAttentionCard state={db.getState()} today="2026-09-03" onOpenResident={() => undefined} />);

    expect(screen.queryByText('Ends today')).toBeNull();
    expect(screen.queryByText('Ends tomorrow')).toBeNull();
  });

  it('Away From Unit: an in-hospital resident gets a Hospital icon, and status is legible from text alone', () => {
    db.addResident({ firstName: 'Hosp', lastName: 'Ital', roomNumber: '201', status: 'in_hospital' });
    db.addResident({ firstName: 'Pass', lastName: 'Out', roomNumber: '202', status: 'out_on_pass' });

    render(<AwayFromUnitCard state={db.getState()} onOpenResident={() => undefined} />);

    const hospitalBadge = screen.getByText('In Hospital');
    const passBadge = screen.getByText('Out on Pass');
    expect(hospitalBadge.parentElement?.querySelector('svg')).not.toBeNull();
    expect(passBadge.parentElement?.querySelector('svg')).toBeNull();
    // Text alone (independent of any color) distinguishes the two statuses.
    expect(hospitalBadge.textContent).toContain('In Hospital');
    expect(passBadge.textContent).toContain('Out on Pass');
  });

  it('Latest FYI: only high/urgent FYIs get an icon + word; normal FYIs get neither', () => {
    db.addFYI({ text: 'Routine reminder', category: 'general', importance: 'normal', effectiveDate: '2026-09-01' });
    db.addFYI({ text: 'Needs a second look', category: 'safety', importance: 'high', effectiveDate: '2026-09-01' });
    db.addFYI({ text: 'Act now', category: 'safety', importance: 'urgent', effectiveDate: '2026-09-01' });

    render(<LatestFyiCard state={db.getState()} today="2026-09-03" onNavigateToBinder={() => undefined} />);

    expect(screen.getByText('Important')).not.toBeNull();
    expect(screen.getByText('Urgent')).not.toBeNull();
    // The routine FYI's own list row has neither flag.
    const routineRow = screen.getByText('Routine reminder').closest('li')!;
    expect(routineRow.textContent).not.toContain('Important');
    expect(routineRow.textContent).not.toContain('Urgent');
  });

  it('Wound Attention: header icon is muted (not danger) when there is nothing new to flag', () => {
    render(<WoundAttentionCard state={db.getState()} today="2026-09-03" onOpenResident={() => undefined} />);
    const heading = screen.getByRole('heading', { name: 'Wound Attention' });
    const icon = heading.parentElement!.querySelector('svg')!;
    expect(icon.getAttribute('class')).not.toContain('text-danger');
  });

  it('Today\'s Bathing: a routine card never receives a warning badge or danger color', () => {
    render(<TodaysBathingCard state={db.getState()} today="2026-09-03" onNavigateToBathing={() => undefined} />);
    expect(document.querySelector('.badge-danger, .badge-warning')).toBeNull();
  });
});
