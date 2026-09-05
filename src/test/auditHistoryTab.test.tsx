// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { createFirstAdmin } from '../services/auth';
import { AuditHistoryTab } from '../components/views/AuditHistoryTab';

describe('AuditHistoryTab', () => {
  beforeEach(async () => {
    db.resetToDemoState();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
  });
  afterEach(() => cleanup());

  it('shows the empty state when there are no matching events', () => {
    // A fresh demo reset with no manual mutations still logs the demo-load
    // and first-admin events, so filter them all out via search to exercise
    // the genuinely-empty-result path.
    render(<AuditHistoryTab />);
    fireEvent.change(screen.getByPlaceholderText(/Search summary, user, room/i), { target: { value: 'no-such-event-xyz' } });
    expect(screen.getByText('No audit events match these filters.')).not.toBeNull();
  });

  it('lists events newest-first with actor, action, and entity type', () => {
    const resident = db.getState().residents[0];
    db.updateResident(resident.id, { status: 'in_hospital' });
    render(<AuditHistoryTab />);

    const rows = screen.getAllByTestId('audit-row');
    expect(rows.length).toBeGreaterThan(0);
    // Most recent mutation (the resident status change) is first.
    expect(rows[0].textContent).toContain('Jordan Smith');
    expect(rows[0].textContent).toContain('Status changed');
    expect(rows[0].textContent).toContain('Resident');
  });

  it('filters by search text across summary and actor', () => {
    const resident = db.getState().residents[0];
    db.updateResident(resident.id, { status: 'in_hospital' });
    render(<AuditHistoryTab />);

    fireEvent.change(screen.getByPlaceholderText(/Search summary, user, room/i), { target: { value: resident.firstName } });
    const rows = screen.getAllByTestId('audit-row');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.textContent).toContain(resident.firstName);
    }
  });

  it('filters by entity type', () => {
    const resident = db.getState().residents[0];
    const shift = db.getState().shifts[0];
    db.updateResident(resident.id, { status: 'in_hospital' });
    db.updateShift(shift.id, { name: 'Renamed Shift' });
    render(<AuditHistoryTab />);

    fireEvent.change(screen.getByDisplayValue('All areas'), { target: { value: 'shift' } });
    const rows = screen.getAllByTestId('audit-row');
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.textContent).toContain('Shift');
      expect(row.textContent).not.toContain('Resident updated');
    }
  });

  it('filters by source mode (demo vs manual)', () => {
    const resident = db.getState().residents[0]; // demo-sourced state
    db.updateResident(resident.id, { status: 'in_hospital' });
    render(<AuditHistoryTab />);

    fireEvent.change(screen.getByDisplayValue('Demo & manual'), { target: { value: 'manual' } });
    // The resident status change happened while demo data was loaded, so it
    // is tagged sourceMode 'demo' and must disappear under "Manual only".
    expect(screen.queryByText(/Resident updated/)).toBeNull();
  });

  it('never renders a raw password or password hash anywhere in its output', () => {
    const { container } = render(<AuditHistoryTab />);
    expect(container.innerHTML).not.toContain('pbkdf2$');
    expect(container.innerHTML.toLowerCase()).not.toContain('password123456');
  });

  it('paginates with Load More once there are more than 50 matching events', () => {
    const resident = db.getState().residents[0];
    for (let i = 0; i < 55; i++) {
      db.updateResident(resident.id, { firstName: `Name${i}` });
    }
    render(<AuditHistoryTab />);
    expect(screen.getAllByTestId('audit-row').length).toBe(50);
    fireEvent.click(screen.getByRole('button', { name: 'Load More' }));
    expect(screen.getAllByTestId('audit-row').length).toBeGreaterThan(50);
  });
});
