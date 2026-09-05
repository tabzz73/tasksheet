// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../services/auth/passwordHash';

describe('passwordHash', () => {
  it('hashes and verifies a round trip', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple');
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });

  it('salts each hash — the same password hashes differently each time', async () => {
    const a = await hashPassword('same password');
    const b = await hashPassword('same password');
    expect(a).not.toBe(b);
    expect(await verifyPassword('same password', a)).toBe(true);
    expect(await verifyPassword('same password', b)).toBe(true);
  });

  it('stores the hash in the documented pbkdf2$iterations$salt$hash format', async () => {
    const hash = await hashPassword('anything');
    const parts = hash.split('$');
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe('pbkdf2');
    expect(Number(parts[1])).toBeGreaterThan(0);
  });

  it('never throws on a malformed stored value — treats it as a non-match', async () => {
    await expect(verifyPassword('anything', 'not-a-real-hash')).resolves.toBe(false);
    await expect(verifyPassword('anything', '')).resolves.toBe(false);
  });
});
