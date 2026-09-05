// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import * as auth from '../services/auth';
import { hashPassword } from '../services/auth/passwordHash';

describe('AuthService', () => {
  beforeEach(() => {
    db.resetToInitialState();
    localStorage.clear();
  });

  it('reports no users on a clean install', () => {
    expect(auth.hasAnyUsers()).toBe(false);
  });

  it('creates the first admin and signs them in', async () => {
    const user = await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'correct horse battery staple' });
    expect(user.role).toBe('admin');
    expect(user.active).toBe(true);
    expect(auth.hasAnyUsers()).toBe(true);
    expect(auth.getCurrentUser()?.id).toBe(user.id);
    expect(db.getCurrentActor()).toEqual({ id: user.id, displayName: 'Jordan Smith' });
  });

  it('logs a login audit event on successful first-admin creation', async () => {
    await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    const events = db.getState().auditEvents;
    expect(events.some(e => e.action === 'login' && e.userDisplayName === 'Jordan Smith')).toBe(true);
  });

  it('logs in successfully with correct credentials', async () => {
    await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    auth.logout();
    const result = await auth.login('jsmith', 'password123456');
    expect(result.ok).toBe(true);
  });

  it('rejects a wrong password with a generic reason', async () => {
    await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    auth.logout();
    const result = await auth.login('jsmith', 'wrong-password');
    expect(result).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects an unknown username with the SAME generic reason as a wrong password — does not reveal whether the username exists', async () => {
    await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    auth.logout();
    const unknownResult = await auth.login('nosuchuser', 'anything');
    const wrongPasswordResult = await auth.login('jsmith', 'wrong-password');
    expect(unknownResult).toEqual({ ok: false, reason: 'invalid' });
    expect(wrongPasswordResult).toEqual({ ok: false, reason: 'invalid' });
  });

  it('rejects an inactive user even with correct credentials', async () => {
    const admin = await auth.createFirstAdmin({ displayName: 'Admin One', username: 'admin1', password: 'password123456' });
    const hash = await hashPassword('password123456');
    const hca = db.addUser({ username: 'hca1', displayName: 'HCA One', role: 'hca', active: false, passwordHash: hash });
    auth.logout();
    const result = await auth.login('hca1', 'password123456');
    expect(result).toEqual({ ok: false, reason: 'inactive' });
    void admin; void hca;
  });

  it('username lookup is case-insensitive', async () => {
    await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'JSmith', password: 'password123456' });
    auth.logout();
    const result = await auth.login('jsmith', 'password123456');
    expect(result.ok).toBe(true);
  });

  it('restores a valid session on app boot without re-recording a login event', async () => {
    const user = await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    db.setCurrentActor(null); // simulate a fresh app instance before restoreSession runs
    const loginEventsBefore = db.getState().auditEvents.filter(e => e.action === 'login').length;
    const restored = auth.restoreSession();
    expect(restored?.id).toBe(user.id);
    expect(db.getCurrentActor()?.id).toBe(user.id);
    expect(db.getState().auditEvents.filter(e => e.action === 'login').length).toBe(loginEventsBefore);
  });

  it('does not restore a session for a since-deactivated user', async () => {
    const admin = await auth.createFirstAdmin({ displayName: 'Admin One', username: 'admin1', password: 'password123456' });
    const hash = await hashPassword('password123456');
    const hca = db.addUser({ username: 'hca1', displayName: 'HCA One', role: 'hca', active: true, passwordHash: hash });
    const hcaLogin = await auth.login('hca1', 'password123456');
    expect(hcaLogin.ok).toBe(true);
    // Simulate a fresh app instance restoring the HCA's stored session...
    db.setCurrentActor(null);
    // ...after an admin deactivated them in the meantime.
    db.setCurrentActor({ id: admin.id, displayName: admin.displayName });
    db.updateUser(hca.id, { active: false });
    db.setCurrentActor(null);
    expect(auth.restoreSession()).toBeNull();
  });

  it('signs out and clears the session so restoreSession no longer finds it', async () => {
    await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    auth.logout();
    expect(db.getCurrentActor()).toBeNull();
    expect(auth.restoreSession()).toBeNull();
  });

  it('cannot deactivate the last active admin', async () => {
    const admin = await auth.createFirstAdmin({ displayName: 'Only Admin', username: 'onlyadmin', password: 'password123456' });
    expect(() => db.updateUser(admin.id, { active: false })).toThrow(/last active Admin/i);
  });

  it('cannot demote the last active admin', async () => {
    const admin = await auth.createFirstAdmin({ displayName: 'Only Admin', username: 'onlyadmin', password: 'password123456' });
    expect(() => db.updateUser(admin.id, { role: 'viewer' })).toThrow(/last active Admin/i);
  });

  it('allows deactivating an admin when another active admin remains', async () => {
    const first = await auth.createFirstAdmin({ displayName: 'First Admin', username: 'first', password: 'password123456' });
    const hash = await hashPassword('password123456');
    const second = db.addUser({ username: 'second', displayName: 'Second Admin', role: 'admin', active: true, passwordHash: hash });
    expect(() => db.updateUser(first.id, { active: false })).not.toThrow();
    expect(db.getState().users.find(u => u.id === second.id)?.active).toBe(true);
  });

  it('changeOwnPassword requires the correct current password', async () => {
    const user = await auth.createFirstAdmin({ displayName: 'Jordan Smith', username: 'jsmith', password: 'password123456' });
    expect(await auth.changeOwnPassword(user.id, 'wrong-current', 'new-password-123')).toBe(false);
    expect(await auth.changeOwnPassword(user.id, 'password123456', 'new-password-123')).toBe(true);
    auth.logout();
    expect((await auth.login('jsmith', 'new-password-123')).ok).toBe(true);
  });

  it('rejects a duplicate username', async () => {
    await auth.createFirstAdmin({ displayName: 'First', username: 'dupe', password: 'password123456' });
    const hash = await hashPassword('password123456');
    expect(() => db.addUser({ username: 'dupe', displayName: 'Second', role: 'hca', active: true, passwordHash: hash })).toThrow(/already in use/i);
    expect(() => db.addUser({ username: 'DUPE', displayName: 'Third', role: 'hca', active: true, passwordHash: hash })).toThrow(/already in use/i);
  });
});
