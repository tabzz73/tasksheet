import { STORAGE_KEY, LEGACY_STORAGE_KEY } from './localStorageAdapter';

/**
 * Reads (without clearing) whatever a prior TaskSheet release left in this
 * window's localStorage, for one-time import into the new Electron
 * file-backed store on a machine's first launch after upgrading. Returns
 * the raw parsed JSON — not yet schema-migrated — or null if there's
 * nothing to import. Never deletes the original entry: it stays as a
 * safety copy even after a successful import.
 */
export function readLegacyLocalStorageState(): unknown | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to read legacy localStorage database for import:', e);
    return null;
  }
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse legacy localStorage database for import:', e);
    return null;
  }
}
