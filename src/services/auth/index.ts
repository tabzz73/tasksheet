import { db } from '../../db';
import { AppUser } from '../../types';
import { hashPassword, verifyPassword } from './passwordHash';

const SESSION_KEY = 'tasksheet_session_v1';

interface StoredSession {
  userId: string;
}

function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function saveSession(userId: string): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ userId } satisfies StoredSession));
  } catch {
    // Storage quota or private browsing — session simply won't survive a
    // restart; sign-in itself still succeeds for the current app instance.
  }
}

function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // no-op
  }
}

export type LoginFailureReason = 'invalid' | 'inactive';
export type LoginResult = { ok: true; user: AppUser } | { ok: false; reason: LoginFailureReason };

/** True once at least one local user account exists. False on a brand-new
 *  install (and on an installation upgraded from a pre-accounts version,
 *  where `users` defaults to `[]`) — this is the exact signal the login gate
 *  uses to require first-admin setup instead of a login screen. */
export function hasAnyUsers(): boolean {
  return db.getState().users.length > 0;
}

/** Creates the first Admin account on a clean or freshly-upgraded install,
 *  then signs them in. Only meaningful when hasAnyUsers() is false — callers
 *  (FirstAdminSetupScreen) are responsible for that gate. */
export async function createFirstAdmin(params: { displayName: string; username: string; password: string }): Promise<AppUser> {
  const passwordHash = await hashPassword(params.password);
  const user = db.addUser({
    username: params.username,
    displayName: params.displayName,
    role: 'admin',
    active: true,
    passwordHash,
  });
  signIn(user);
  return user;
}

function signIn(user: AppUser): void {
  db.setCurrentActor({ id: user.id, displayName: user.displayName });
  db.recordLogin(user.id);
  saveSession(user.id);
  db.recordAuditEvent({ action: 'login', entityType: 'session', entityId: user.id, summary: `${user.displayName} signed in` });
}

/** Verifies credentials and, on success, establishes the session. On
 *  failure, returns one generic 'invalid' reason for both an unknown
 *  username and a wrong password — a failed-login message must not reveal
 *  whether the username exists. 'inactive' is only ever returned after a
 *  genuine username+password match against a deactivated account, so it
 *  isn't distinguishable from 'invalid' by a guesser either. */
export async function login(username: string, password: string): Promise<LoginResult> {
  const user = db.getState().users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  if (!user) {
    db.recordAuditEvent({ action: 'login_failed', entityType: 'session', summary: `Failed sign-in attempt for username "${username.trim()}"` });
    return { ok: false, reason: 'invalid' };
  }
  const passwordMatches = await verifyPassword(password, user.passwordHash);
  if (!passwordMatches) {
    db.recordAuditEvent({ action: 'login_failed', entityType: 'session', entityId: user.id, summary: `Failed sign-in attempt for ${user.displayName}` });
    return { ok: false, reason: 'invalid' };
  }
  if (!user.active) {
    db.recordAuditEvent({ action: 'login_failed', entityType: 'session', entityId: user.id, summary: `Sign-in blocked — ${user.displayName}'s account is inactive` });
    return { ok: false, reason: 'inactive' };
  }
  signIn(user);
  return { ok: true, user };
}

export function logout(): void {
  const actor = db.getCurrentActor();
  if (actor) db.recordAuditEvent({ action: 'logout', entityType: 'session', entityId: actor.id, summary: `${actor.displayName} signed out` });
  db.setCurrentActor(null);
  clearSession();
}

/** Called once at app boot. Re-validates the referenced user is still
 *  active before restoring the session — a deactivated account's stored
 *  session is silently discarded rather than granting access. Does not
 *  itself write a 'login' audit event (that would misrepresent an app
 *  restart as a fresh sign-in). */
export function restoreSession(): AppUser | null {
  const stored = loadSession();
  if (!stored) return null;
  const user = db.getState().users.find(u => u.id === stored.userId);
  if (!user || !user.active) {
    clearSession();
    return null;
  }
  db.setCurrentActor({ id: user.id, displayName: user.displayName });
  return user;
}

export function getCurrentUser(): AppUser | null {
  const actor = db.getCurrentActor();
  if (!actor) return null;
  return db.getState().users.find(u => u.id === actor.id) || null;
}

/** Admin-initiated reset — sets a new password directly, no email flow, per
 *  the local-first design. Distinct audit action from changeOwnPassword's
 *  self-service change. */
export async function adminResetPassword(userId: string, newPassword: string): Promise<void> {
  const user = db.getState().users.find(u => u.id === userId);
  if (!user) throw new Error('User not found.');
  const passwordHash = await hashPassword(newPassword);
  db.resetUserPassword(userId, passwordHash);
  db.recordAuditEvent({ action: 'password_reset', entityType: 'user', entityId: userId, summary: `Password reset for ${user.displayName}` });
}

/** Requires the caller's current password before allowing a self-service
 *  change — never displays or requires an admin override for this path. */
export async function changeOwnPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const user = db.getState().users.find(u => u.id === userId);
  if (!user) return false;
  const currentMatches = await verifyPassword(currentPassword, user.passwordHash);
  if (!currentMatches) return false;
  const passwordHash = await hashPassword(newPassword);
  db.resetUserPassword(userId, passwordHash);
  db.recordAuditEvent({ action: 'password_changed', entityType: 'user', entityId: userId, summary: `${user.displayName} changed their own password` });
  return true;
}
