import React, { useEffect, useState } from 'react';
import { UserCog, UserPlus, KeyRound, Lock } from 'lucide-react';
import { db } from '../../db';
import { AppUser, UserRole } from '../../types';
import { hashPassword } from '../../services/auth/passwordHash';
import { adminResetPassword, changeOwnPassword } from '../../services/auth';
import { Modal } from '../common/Modal';

interface UsersAccessTabProps {
  currentUser: AppUser;
  onShowFeedback?: (type: 'success' | 'error', message: string) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  lpn_rn: 'LPN / RN',
  hca: 'HCA',
  viewer: 'Viewer',
};

const MIN_PASSWORD_LENGTH = 8;

export const UsersAccessTab: React.FC<UsersAccessTabProps> = ({ currentUser, onShowFeedback }) => {
  const [revision, setRevision] = useState(0);
  useEffect(() => db.subscribe(() => setRevision(value => value + 1)), []);
  const state = db.getState(); void revision;
  const users = [...state.users].sort((a, b) => a.displayName.localeCompare(b.displayName));

  const [addOpen, setAddOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('hca');
  const [addError, setAddError] = useState<string | null>(null);
  const [addBusy, setAddBusy] = useState(false);

  const [resetTarget, setResetTarget] = useState<AppUser | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  const [changePwOpen, setChangePwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newOwnPw, setNewOwnPw] = useState('');
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeBusy, setChangeBusy] = useState(false);

  const feedback = (type: 'success' | 'error', message: string) => onShowFeedback?.(type, message);

  const submitAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setAddError(null);
    if (!newDisplayName.trim() || !newUsername.trim()) { setAddError('Display name and username are required.'); return; }
    if (newPassword.length < MIN_PASSWORD_LENGTH) { setAddError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    setAddBusy(true);
    try {
      const passwordHash = await hashPassword(newPassword);
      db.addUser({ username: newUsername.trim(), displayName: newDisplayName.trim(), role: newRole, active: true, passwordHash });
      feedback('success', `User "${newDisplayName.trim()}" created.`);
      setAddOpen(false);
      setNewDisplayName(''); setNewUsername(''); setNewPassword(''); setNewRole('hca');
    } catch (error) {
      setAddError((error as Error).message);
    } finally {
      setAddBusy(false);
    }
  };

  const handleRoleChange = (user: AppUser, role: UserRole) => {
    try {
      db.updateUser(user.id, { role });
      feedback('success', `${user.displayName}'s role updated to ${ROLE_LABELS[role]}.`);
    } catch (error) {
      feedback('error', (error as Error).message);
    }
  };

  const handleToggleActive = (user: AppUser) => {
    try {
      db.updateUser(user.id, { active: !user.active });
      feedback('success', `${user.displayName} ${user.active ? 'deactivated' : 'activated'}.`);
    } catch (error) {
      feedback('error', (error as Error).message);
    }
  };

  const submitReset = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetTarget) return;
    setResetError(null);
    if (resetPassword.length < MIN_PASSWORD_LENGTH) { setResetError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    setResetBusy(true);
    try {
      await adminResetPassword(resetTarget.id, resetPassword);
      feedback('success', `Password reset for ${resetTarget.displayName}.`);
      setResetTarget(null);
      setResetPassword('');
    } catch (error) {
      setResetError((error as Error).message);
    } finally {
      setResetBusy(false);
    }
  };

  const submitChangeOwnPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setChangeError(null);
    if (newOwnPw.length < MIN_PASSWORD_LENGTH) { setChangeError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`); return; }
    setChangeBusy(true);
    try {
      const ok = await changeOwnPassword(currentUser.id, currentPw, newOwnPw);
      if (!ok) { setChangeError('Current password is incorrect.'); return; }
      feedback('success', 'Your password has been changed.');
      setChangePwOpen(false);
      setCurrentPw(''); setNewOwnPw('');
    } finally {
      setChangeBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-surface border border-hairline-strong bg-panel p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-control bg-accent-soft p-2 text-accent-strong"><UserCog className="h-5 w-5" /></div>
            <div>
              <h3 className="font-black text-ink">Users & Access</h3>
              <p className="mt-1 text-xs text-muted">Local accounts only — no cloud sign-in. Passwords are never stored or shown in plain text.</p>
            </div>
          </div>
          <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 rounded-control bg-accent-strong px-3.5 py-2 text-xs font-bold text-white shrink-0">
            <UserPlus className="h-4 w-4" /> Add User
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-surface border border-hairline-strong bg-panel">
        <div className="border-b border-hairline-strong p-4">
          <h3 className="text-sm font-black text-ink">Accounts</h3>
          <p className="text-xs text-muted">{users.length} configured · {users.filter(u => u.active).length} active</p>
        </div>
        <div className="divide-y divide-hairline">
          {users.map(user => (
            <div key={user.id} className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <div>
                <div className="text-sm font-bold text-ink">{user.displayName}{user.id === currentUser.id && <span className="ml-1.5 text-[11px] font-normal text-faint">(you)</span>}</div>
                <div className="text-[11px] text-muted">@{user.username} · Last login {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Never'}</div>
              </div>
              <select
                value={user.role}
                onChange={event => handleRoleChange(user, event.target.value as UserRole)}
                aria-label={`Role for ${user.displayName}`}
                className="rounded-control border border-hairline-strong px-2.5 py-1.5 text-xs font-semibold"
              >
                {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <div className={`text-xs font-bold ${user.active ? 'text-positive' : 'text-danger'}`}>{user.active ? 'Active' : 'Inactive'}</div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => { setResetTarget(user); setResetError(null); }} aria-label={`Reset password for ${user.displayName}`} className="inline-flex items-center gap-1 rounded-control border border-hairline-strong px-2 py-1 text-[11px] font-bold">
                  <KeyRound className="h-3.5 w-3.5" /> Reset Password
                </button>
                <button type="button" onClick={() => handleToggleActive(user)} aria-label={`${user.active ? 'Deactivate' : 'Activate'} ${user.displayName}`} className="rounded-control border border-hairline-strong px-2 py-1 text-[11px] font-bold">
                  {user.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-control border border-hairline-strong bg-panel-sunken p-3 text-xs text-ink-soft">
        <Lock className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="flex-1">
          <span>Want to change your own password? </span>
          <button type="button" onClick={() => { setChangePwOpen(true); setChangeError(null); }} className="font-bold text-accent-strong hover:text-accent">Change my password</button>
        </div>
      </div>

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Add User" maxWidth="sm">
        <form onSubmit={submitAdd} className="space-y-4">
          {addError && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{addError}</p>}
          <div>
            <label htmlFor="new-user-display-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">Display Name</label>
            <input id="new-user-display-name" autoFocus value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} className="w-full rounded-control border border-hairline-strong px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label htmlFor="new-user-username" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">Username</label>
            <input id="new-user-username" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full rounded-control border border-hairline-strong px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label htmlFor="new-user-role" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">Role</label>
            <select id="new-user-role" value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} className="w-full rounded-control border border-hairline-strong px-3.5 py-2.5 text-sm">
              {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="new-user-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">Password</label>
            <input id="new-user-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full rounded-control border border-hairline-strong px-3.5 py-2.5 text-sm" />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-hairline-strong pt-3">
            <button type="button" onClick={() => setAddOpen(false)} className="rounded-control border border-hairline-strong px-4 py-2 text-xs font-medium text-ink-soft hover:bg-panel-sunken">Cancel</button>
            <button type="submit" disabled={addBusy} className="rounded-control bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-strong disabled:opacity-50">{addBusy ? 'Creating…' : 'Create User'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!resetTarget} onClose={() => setResetTarget(null)} title={`Reset Password${resetTarget ? ` — ${resetTarget.displayName}` : ''}`} maxWidth="sm">
        <form onSubmit={submitReset} className="space-y-4">
          {resetError && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{resetError}</p>}
          <div>
            <label htmlFor="reset-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">New Password</label>
            <input id="reset-password" autoFocus type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} className="w-full rounded-control border border-hairline-strong px-3.5 py-2.5 text-sm" />
            <p className="mt-1 text-[11px] text-muted">The user will need to sign in with this new password. There is no email flow.</p>
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-hairline-strong pt-3">
            <button type="button" onClick={() => setResetTarget(null)} className="rounded-control border border-hairline-strong px-4 py-2 text-xs font-medium text-ink-soft hover:bg-panel-sunken">Cancel</button>
            <button type="submit" disabled={resetBusy} className="rounded-control bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-strong disabled:opacity-50">{resetBusy ? 'Resetting…' : 'Reset Password'}</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={changePwOpen} onClose={() => setChangePwOpen(false)} title="Change My Password" maxWidth="sm">
        <form onSubmit={submitChangeOwnPassword} className="space-y-4">
          {changeError && <p role="alert" className="rounded-control bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">{changeError}</p>}
          <div>
            <label htmlFor="current-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">Current Password</label>
            <input id="current-password" autoFocus type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="w-full rounded-control border border-hairline-strong px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label htmlFor="new-own-password" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">New Password</label>
            <input id="new-own-password" type="password" value={newOwnPw} onChange={e => setNewOwnPw(e.target.value)} className="w-full rounded-control border border-hairline-strong px-3.5 py-2.5 text-sm" />
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-hairline-strong pt-3">
            <button type="button" onClick={() => setChangePwOpen(false)} className="rounded-control border border-hairline-strong px-4 py-2 text-xs font-medium text-ink-soft hover:bg-panel-sunken">Cancel</button>
            <button type="submit" disabled={changeBusy} className="rounded-control bg-accent px-4 py-2 text-xs font-bold text-white hover:bg-accent-strong disabled:opacity-50">{changeBusy ? 'Saving…' : 'Change Password'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
