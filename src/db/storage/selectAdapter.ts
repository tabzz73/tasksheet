import { StorageAdapter } from './types';
import { localStorageAdapter } from './localStorageAdapter';
import { electronFileAdapter } from './electronFileAdapter';

/**
 * Electron's preload script is the only thing that ever defines
 * window.tasksheetAPI, so its presence is what distinguishes "running
 * inside the packaged desktop app" from "running in a plain browser" (the
 * Vite dev server, Playwright e2e) or jsdom (vitest) — neither of which
 * ever loads a preload script.
 */
export function selectAdapter(): StorageAdapter {
  if (typeof window !== 'undefined' && window.tasksheetAPI) return electronFileAdapter;
  return localStorageAdapter;
}
