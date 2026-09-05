import React, { useState } from 'react';
import { ClipboardList, AlertTriangle } from 'lucide-react';
import { login } from '../../services/auth';
import { AppUser } from '../../types';
import { TASKSHEET_TAGLINE } from '../../constants/branding';

interface LoginScreenProps {
  onSignedIn: (user: AppUser) => void;
}

/** Local sign-in only — no email verification, no password-reset email, no
 *  cloud MFA, no social login. A failed attempt shows one generic message
 *  regardless of whether the username exists or the password was wrong. */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onSignedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) { setError('Enter your username and password.'); return; }
    setSubmitting(true);
    setError('');
    const result = await login(username, password);
    setSubmitting(false);
    if (result.ok === true) {
      onSignedIn(result.user);
      return;
    }
    const reason: 'invalid' | 'inactive' = result.reason;
    setError(reason === 'inactive'
      ? 'This account is inactive. Contact an Administrator.'
      : 'Incorrect username or password.');
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-6">
          <div className="w-9 h-9 rounded-control flex items-center justify-center shrink-0 bg-accent text-white">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="font-heading font-extrabold text-ink text-base leading-tight">TaskSheet</p>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-muted">{TASKSHEET_TAGLINE}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-panel border border-hairline-strong rounded-surface shadow-elevated p-6 space-y-4">
          <div>
            <h1 className="font-heading font-extrabold text-ink text-lg">Sign in</h1>
            <p className="text-xs text-muted mt-0.5">Sign in with your TaskSheet account for this workstation.</p>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-2.5 rounded-control border border-danger bg-danger-soft text-danger text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="login-username" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Username</label>
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              autoFocus
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 h-10 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 h-10 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <button type="submit" disabled={submitting} className="btn btn-accent w-full justify-center disabled:opacity-60">
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
};
