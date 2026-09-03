// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { selectAdapter } from '../db/storage/selectAdapter';
import { localStorageAdapter } from '../db/storage/localStorageAdapter';
import { electronFileAdapter } from '../db/storage/electronFileAdapter';

describe('selectAdapter', () => {
  afterEach(() => {
    delete (window as any).tasksheetAPI;
  });

  it('picks the localStorage adapter when no Electron preload bridge is present (vite dev server, vitest)', () => {
    expect(selectAdapter()).toBe(localStorageAdapter);
  });

  it('picks the Electron file adapter when window.tasksheetAPI is present (packaged desktop app)', () => {
    (window as any).tasksheetAPI = { load: async () => null, save: async () => {} };
    expect(selectAdapter()).toBe(electronFileAdapter);
  });
});
