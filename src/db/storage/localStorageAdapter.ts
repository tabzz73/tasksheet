import { AppDatabaseState } from '../../types';
import { migrateLoadedState } from '../migration';
import { SyncStorageAdapter } from './types';

export const STORAGE_KEY = 'tasksheet_v1_db_state_v2';
export const LEGACY_STORAGE_KEY = 'tasksheet_v1_db_state';

export const localStorageAdapter: SyncStorageAdapter = {
  kind: 'sync',

  loadSync(): AppDatabaseState | null {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    let stored: string | null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to read database state from storage, initializing fresh:', e);
      return null;
    }
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      const loadedState = migrateLoadedState(parsed);
      // Persist the upgraded shape immediately, matching prior behavior.
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedState));
      return loadedState;
    } catch (e) {
      console.error('Failed to load database state from storage, initializing fresh:', e);
      return null;
    }
  },

  saveSync(state: AppDatabaseState): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save database state to localStorage:', e);
      throw e;
    }
  },
};
