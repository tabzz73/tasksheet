// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { createFirstAdmin } from '../services/auth';
import { UsersAccessTab } from '../components/views/UsersAccessTab';
import { AppUser } from '../types';

describe('UsersAccessTab', () => {
  let admin: AppUser;
  let feedback: Array<{ type: 'success' | 'error'; text: string }>;

  beforeEach(async () => {
    db.resetToInitialState();
    admin = await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    feedback = [];
  });
  afterEach(() => cleanup());

  const renderTab = () => render(<UsersAccessTab currentUser={admin} onShowFeedback={(type, text) => feedback.push({ type, text })} />);

  it('lists the current user with a "(you)" tag', () => {
    const { container } = renderTab();
    expect(screen.getByText('Jordan Smith')).not.toBeNull();
    expect(screen.getByText('(you)')).not.toBeNull();
    expect(container.textContent).toContain('@jsmith');
    // createFirstAdmin signs the account in immediately, so it already has a
    // real lastLoginAt — not the "Never" placeholder a freshly-added user gets.
    expect(container.textContent).toMatch(/Last login \d/);
  });

  it('creates a new user through Add User, and the new account appears in the list', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Add User' }));
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Casey HCA' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'chca' } });
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'hca' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'casey-password-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

    await waitFor(() => expect(db.getState().users).toHaveLength(2));
    expect(screen.getByText('Casey HCA')).not.toBeNull();
    expect(feedback[feedback.length - 1]).toEqual({ type: 'success', text: 'User "Casey HCA" created.' });
  });

  it('rejects a too-short password without creating a user', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Add User' }));
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Casey HCA' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'chca' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/at least 8 characters/i);
    expect(db.getState().users).toHaveLength(1);
  });

  it('rejects a duplicate username (case-insensitive) without creating a user', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Add User' }));
    fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Another Jordan' } });
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'JSmith' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'another-password-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create User' }));

    expect((await screen.findByRole('alert')).textContent).toMatch(/already in use/i);
    expect(db.getState().users).toHaveLength(1);
  });

  it('changes a user\'s role from the row select', async () => {
    await db.addUser({ username: 'chca', displayName: 'Casey HCA', role: 'hca', active: true, passwordHash: 'pbkdf2$1$a$b' } as any);
    renderTab();
    fireEvent.change(screen.getByLabelText('Role for Casey HCA'), { target: { value: 'supervisor' } });
    await waitFor(() => expect(db.getState().users.find(u => u.username === 'chca')?.role).toBe('supervisor'));
    expect(feedback[feedback.length - 1]?.text).toMatch(/Casey HCA's role updated to Supervisor/);
  });

  it('deactivates and reactivates a non-last-admin user', async () => {
    db.addUser({ username: 'chca', displayName: 'Casey HCA', role: 'hca', active: true, passwordHash: 'pbkdf2$1$a$b' } as any);
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Deactivate Casey HCA' }));
    await waitFor(() => expect(db.getState().users.find(u => u.username === 'chca')?.active).toBe(false));
    expect(screen.getByRole('button', { name: 'Activate Casey HCA' })).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Activate Casey HCA' }));
    await waitFor(() => expect(db.getState().users.find(u => u.username === 'chca')?.active).toBe(true));
  });

  it('surfaces the last-admin protection as an inline error, not a crash', () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: `Deactivate ${admin.displayName}` }));
    expect(feedback[feedback.length - 1]?.type).toBe('error');
    expect(feedback[feedback.length - 1]?.text).toMatch(/last active Admin/i);
    // State is unchanged — the sole admin is still active.
    expect(db.getState().users[0].active).toBe(true);
  });

  it('resets another user\'s password via the admin flow, and never renders the password hash', async () => {
    db.addUser({ username: 'chca', displayName: 'Casey HCA', role: 'hca', active: true, passwordHash: 'pbkdf2$1$a$b' } as any);
    const { container } = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Reset password for Casey HCA' }));
    await screen.findByRole('heading', { name: 'Reset Password — Casey HCA' });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'brand-new-password-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => expect(feedback[feedback.length - 1]?.text).toBe('Password reset for Casey HCA.'));
    const updatedHash = db.getState().users.find(u => u.username === 'chca')?.passwordHash;
    expect(updatedHash).not.toBe('pbkdf2$1$a$b');
    expect(updatedHash).toMatch(/^pbkdf2\$/);
    expect(container.innerHTML).not.toContain(updatedHash);
  });

  it('changes the signed-in user\'s own password only after the current password is verified', async () => {
    renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Change my password' }));
    await screen.findByRole('heading', { name: 'Change My Password' });

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'wrong-password' } });
    fireEvent.change(screen.getByLabelText('New Password'), { target: { value: 'new-password-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    expect((await screen.findByRole('alert')).textContent).toMatch(/current password is incorrect/i);

    fireEvent.change(screen.getByLabelText('Current Password'), { target: { value: 'password123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Change Password' }));
    await waitFor(() => expect(feedback[feedback.length - 1]?.text).toBe('Your password has been changed.'));
  });
});
