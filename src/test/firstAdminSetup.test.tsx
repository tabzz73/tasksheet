// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { FirstAdminSetupScreen } from '../components/auth/FirstAdminSetupScreen';

describe('FirstAdminSetupScreen', () => {
  beforeEach(() => db.resetToInitialState());
  afterEach(() => cleanup());

  const fill = () => {
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Jordan Smith' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'jsmith' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123456' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123456' } });
  };

  it('creates an Admin account and signs the user in', async () => {
    let created: string | null = null;
    render(<FirstAdminSetupScreen onCreated={u => { created = u.id; }} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Create Administrator Account' }));
    await waitFor(() => expect(created).not.toBeNull());
    expect(db.getState().users[0].role).toBe('admin');
  });

  it('rejects mismatched passwords without creating a user', () => {
    render(<FirstAdminSetupScreen onCreated={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Jordan Smith' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'jsmith' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123456' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'different-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Administrator Account' }));
    expect(screen.getByRole('alert').textContent).toMatch(/do not match/i);
    expect(db.getState().users).toHaveLength(0);
  });

  it('rejects a too-short password', () => {
    render(<FirstAdminSetupScreen onCreated={() => undefined} />);
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Jordan Smith' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'jsmith' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Administrator Account' }));
    expect(screen.getByRole('alert').textContent).toMatch(/at least 8 characters/i);
    expect(db.getState().users).toHaveLength(0);
  });

  it('never renders the computed password hash anywhere in the markup', async () => {
    const { container } = render(<FirstAdminSetupScreen onCreated={() => undefined} />);
    fill();
    fireEvent.click(screen.getByRole('button', { name: 'Create Administrator Account' }));
    await waitFor(() => expect(db.getState().users).toHaveLength(1));
    expect(container.innerHTML).not.toContain('pbkdf2$');
    expect(container.innerHTML).not.toContain(db.getState().users[0].passwordHash);
  });
});
