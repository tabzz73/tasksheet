import { AppDatabaseState } from '../../types';
import { migrateLoadedState } from '../migration';
import { AsyncStorageAdapter } from './types';
import { readLegacyLocalStorageState } from './legacyImport';

declare global {
  interface Window {
    tasksheetAPI?: {
      load(): Promise<unknown | null>;
      save(state: AppDatabaseState): Promise<void>;
    };
  }
}

export const electronFileAdapter: AsyncStorageAdapter = {
  kind: 'async',

  async load(): Promise<AppDatabaseState | null> {
    const api = window.tasksheetAPI;
    if (!api) return null;
    const raw = await api.load();
    if (raw) return migrateLoadedState(raw);

    // First launch of the file-backed store on this machine: import
    // whatever a prior release left in this window's localStorage, without
    // ever deleting the original copy.
    const legacy = readLegacyLocalStorageState();
    if (!legacy) return null;
    const imported = migrateLoadedState(legacy);
    await api.save(imported);
    return imported;
  },

  async save(state: AppDatabaseState): Promise<void> {
    const api = window.tasksheetAPI;
    if (!api) throw new Error('TaskSheet desktop storage bridge is unavailable.');
    await api.save(state);
  },
};
