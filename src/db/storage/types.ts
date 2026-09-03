import { AppDatabaseState } from '../../types';

/**
 * localStorage is a synchronous browser API. DatabaseService relies on that
 * synchrony for an atomic contract every existing call site depends on:
 * a save failure throws immediately and the in-memory state is never
 * updated (see releaseRecoveryHardening.test.ts). Keep this adapter shape
 * distinct from the async one rather than forcing both through a single
 * polymorphic Promise-based interface.
 */
export interface SyncStorageAdapter {
  kind: 'sync';
  /** Loads and schema-migrates the persisted state, or null if nothing is stored yet. */
  loadSync(): AppDatabaseState | null;
  /** Persists state immediately. Throws synchronously on failure. */
  saveSync(state: AppDatabaseState): void;
}

/**
 * Electron's IPC bridge is inherently asynchronous. DatabaseService commits
 * mutations to memory optimistically for this adapter and persists in the
 * background, surfacing failures via getPersistStatus()/subscribeToPersistErrors()
 * instead of throwing back into the (synchronous) call site.
 */
export interface AsyncStorageAdapter {
  kind: 'async';
  /** Resolves the persisted, schema-migrated state, or null if nothing is stored yet. */
  load(): Promise<AppDatabaseState | null>;
  /** Persists state. Rejects on failure. */
  save(state: AppDatabaseState): Promise<void>;
}

export type StorageAdapter = SyncStorageAdapter | AsyncStorageAdapter;
