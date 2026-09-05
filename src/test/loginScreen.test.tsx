// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { createFirstAdmin, logout } from '../services/auth';
import { LoginScreen } from '../components/auth/LoginScreen';

describe('LoginScreen', () => {
  beforeEach(async () => {
    db.resetToInitialState();
    await createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    logout();
  });
  afterEach(() => cleanup());

  const fillAndSubmit = (username: string, password: string) => {
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));
  };

  it('signs in with correct credentials', async () => {
    let signedIn = false;
    render(<LoginScreen onSignedIn={() => { signedIn = true; }} />);
    fillAndSubmit('jsmith', 'password123456');
    await waitFor(() => expect(signedIn).toBe(true));
  });

  it('shows one generic error for a wrong password, never confirming the username exists', async () => {
    render(<LoginScreen onSignedIn={() => undefined} />);
    fillAndSubmit('jsmith', 'wrong-password');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/incorrect username or password/i));
  });

  it('shows the SAME generic error for a nonexistent username', async () => {
    render(<LoginScreen onSignedIn={() => undefined} />);
    fillAndSubmit('nosuchuser', 'anything');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/incorrect username or password/i));
  });

  it('never renders the typed password value outside the password input itself', async () => {
    const { container } = render(<LoginScreen onSignedIn={() => undefined} />);
    fillAndSubmit('jsmith', 'wrong-password');
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    // The only place "wrong-password" may legitimately appear is the input's own value attribute.
    const matches = container.innerHTML.split('wrong-password').length - 1;
    expect(matches).toBeLessThanOrEqual(1);
  });
});
