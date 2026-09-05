import React, { useState } from 'react';
import { ClipboardList, AlertTriangle, ShieldCheck } from 'lucide-react';
import { createFirstAdmin } from '../../services/auth';
import { AppUser } from '../../types';
import { TASKSHEET_TAGLINE } from '../../constants/branding';

interface FirstAdminSetupScreenProps {
  onCreated: (user: AppUser) => void;
}

const MIN_PASSWORD_LENGTH = 8;

/** Shown exactly once per installation — when state.users is empty, whether
 *  that's a brand-new install or an existing one upgraded from a
 *  pre-accounts version of TaskSheet. The first account created here is
 *  always Admin; there is no role picker. */
export const FirstAdminSetupScreen: React.FC<FirstAdminSetupScreenProps> = ({ onCreated }) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !username.trim() || !password) { setError('All fields are required.'); return; }
    if (password.length < MIN_PASSWORD_LENGTH) { setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const user = await createFirstAdmin({ displayName: displayName.trim(), username: username.trim(), password });
      onCreated(user);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h1 className="font-heading font-extrabold text-ink text-lg">Create the first Administrator account</h1>
              <p className="text-xs text-muted mt-0.5">This workstation has no TaskSheet users yet. Create an Admin account to sign in and begin tracking who does what.</p>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2 p-2.5 rounded-control border border-danger bg-danger-soft text-danger text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="setup-display-name" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Display Name</label>
            <input id="setup-display-name" type="text" autoFocus placeholder="e.g. Jordan Smith" value={displayName} onChange={e => setDisplayName(e.target.value)} className="w-full px-3 h-10 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
          </div>

          <div>
            <label htmlFor="setup-username" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Username</label>
            <input id="setup-username" type="text" autoComplete="username" placeholder="e.g. jsmith" value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 h-10 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="setup-password" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Password</label>
              <input id="setup-password" type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 h-10 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
            </div>
            <div>
              <label htmlFor="setup-confirm-password" className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">Confirm Password</label>
              <input id="setup-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 h-10 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
            </div>
          </div>
          <p className="text-[11px] text-muted -mt-2">At least {MIN_PASSWORD_LENGTH} characters. This account is created locally on this workstation only.</p>

          <button type="submit" disabled={submitting} className="btn btn-accent w-full justify-center disabled:opacity-60">
            {submitting ? 'Creating account…' : 'Create Administrator Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
