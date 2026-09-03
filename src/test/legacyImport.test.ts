// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db';
import { electronFileAdapter } from '../db/storage/electronFileAdapter';
import { STORAGE_KEY, LEGACY_STORAGE_KEY } from '../db/storage/localStorageAdapter';
import { migrateLoadedState } from '../db/migration';
import { readLegacyLocalStorageState } from '../db/storage/legacyImport';
import { AppDatabaseState } from '../types';

describe('legacy localStorage -> Electron file-store import', () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as any).tasksheetAPI;
  });

  afterEach(() => {
    localStorage.clear();
    delete (window as any).tasksheetAPI;
  });

  it('readLegacyLocalStorageState returns null when nothing is stored', () => {
    expect(readLegacyLocalStorageState()).toBeNull();
  });

  it('readLegacyLocalStorageState reads the current-key blob without clearing it', () => {
    const raw = { facility: { siteName: 'Legacy Facility' }, residents: [] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    expect(readLegacyLocalStorageState()).toEqual(raw);
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });

  it('readLegacyLocalStorageState falls back to the legacy pre-v2 key', () => {
    const raw = { facility: { siteName: 'Very Old Facility' }, residents: [] };
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(raw));
    expect(readLegacyLocalStorageState()).toEqual(raw);
  });

  it('electronFileAdapter.load() imports and migrates a legacy localStorage blob when the file store is empty, then seeds the file store without touching localStorage', async () => {
    // Seed a realistic legacy blob the same way a real pilot machine would have one:
    // export the current demo db state as a v2-shape localStorage blob.
    db.resetToDemoState();
    const legacyBlob = db.backupDatabase();
    localStorage.setItem(STORAGE_KEY, legacyBlob);

    const savedStates: AppDatabaseState[] = [];
    (window as any).tasksheetAPI = {
      load: async () => null, // no file on this machine yet
      save: async (state: AppDatabaseState) => { savedStates.push(state); },
    };

    const imported = await electronFileAdapter.load();

    expect(imported).not.toBeNull();
    expect(imported!.facility.siteName).toBe(migrateLoadedState(JSON.parse(legacyBlob)).facility.siteName);
    expect(imported!.residents.length).toBe(migrateLoadedState(JSON.parse(legacyBlob)).residents.length);

    // Imported state was seeded into the file store exactly once.
    expect(savedStates).toHaveLength(1);
    expect(savedStates[0].facility.siteName).toBe(imported!.facility.siteName);

    // The original localStorage copy is left untouched as a safety net.
    expect(localStorage.getItem(STORAGE_KEY)).toBe(legacyBlob);
  });

  it('electronFileAdapter.load() returns null (fresh install) when neither the file store nor localStorage have anything', async () => {
    (window as any).tasksheetAPI = {
      load: async () => null,
      save: async () => {},
    };
    expect(await electronFileAdapter.load()).toBeNull();
  });

  it('electronFileAdapter.load() prefers the real file store over localStorage once a file exists', async () => {
    localStorage.setItem(STORAGE_KEY, db.backupDatabase());
    const fileState = { ...db.getState(), facility: { ...db.getState().facility, siteName: 'From File Store' } };
    (window as any).tasksheetAPI = {
      load: async () => fileState,
      save: async () => { throw new Error('save should not be called when a file already exists'); },
    };
    const loaded = await electronFileAdapter.load();
    expect(loaded!.facility.siteName).toBe('From File Store');
  });
});
