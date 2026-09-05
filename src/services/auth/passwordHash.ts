/**
 * Local password hashing — PBKDF2-SHA256 via the standard Web Crypto
 * `SubtleCrypto` API.
 *
 * Why Web Crypto and not a Node crypto module or an npm dependency: the
 * Electron renderer runs with `contextIsolation: true`, `nodeIntegration:
 * false`, `sandbox: true` (electron/main.cjs) — it has no Node `crypto`
 * access — and this same app also runs as a plain browser app in dev/test via
 * localStorageAdapter, with no IPC at all. `crypto.subtle` is available in
 * both contexts without any new dependency or IPC channel.
 *
 * Never reversible, never plaintext. Storage format:
 *   pbkdf2$<iterations>$<saltBase64>$<hashBase64>
 */

const ITERATIONS = 150_000;
const HASH_BITS = 256;
const SALT_BYTES = 16;
const SCHEME = 'pbkdf2';

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveHash(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: salt.slice().buffer, iterations, hash: 'SHA-256' }, keyMaterial, HASH_BITS);
  return new Uint8Array(bits);
}

/** Hashes a plaintext password into the storage format above. Salted, so
 *  hashing the same password twice never produces the same string. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await deriveHash(password, salt, ITERATIONS);
  return `${SCHEME}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time-ish comparison — compares full length regardless of where a
 *  mismatch occurs, so failure timing doesn't leak how much of the hash
 *  matched. */
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Verifies a plaintext password against a stored hash produced by
 *  hashPassword(). Never throws on a malformed/foreign stored value — treats
 *  it as a non-match. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== SCHEME) return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  try {
    const salt = fromBase64(parts[2]);
    const expected = fromBase64(parts[3]);
    const actual = await deriveHash(password, salt, iterations);
    return bytesEqual(actual, expected);
  } catch {
    return false;
  }
}
