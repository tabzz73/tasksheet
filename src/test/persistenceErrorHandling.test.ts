// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DatabaseService, PersistStatus } from '../db';
import { AsyncStorageAdapter } from '../db/storage/types';
import { AppDatabaseState } from '../types';

async function waitForStatus(instance: DatabaseService, target: PersistStatus, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (instance.getPersistStatus() !== target) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for persist status "${target}"; last observed "${instance.getPersistStatus()}"`);
    }
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

function createAsyncAdapter(save: (state: AppDatabaseState) => Promise<void>): AsyncStorageAdapter {
  return { kind: 'async', load: async () => null, save };
}

describe('DatabaseService async persistence (Electron file adapter path)', () => {
  it('commits mutations to memory immediately and reports "saved" once the background write succeeds', async () => {
    const writes: string[] = [];
    const adapter = createAsyncAdapter(async state => { writes.push(state.facility.siteName); });
    const instance = new DatabaseService(adapter);

    await waitForStatus(instance, 'saved');
    instance.updateFacility({ siteName: 'Sunrise Manor' });

    // The mutation is visible synchronously, before the background write settles.
    expect(instance.getState().facility.siteName).toBe('Sunrise Manor');

    await waitForStatus(instance, 'saved');
    expect(writes).toContain('Sunrise Manor');
  });

  it('flips persist status to "error" (without throwing) when a background write fails, and keeps the optimistic state', async () => {
    const adapter = createAsyncAdapter(async () => { throw new Error('disk full'); });
    const instance = new DatabaseService(adapter);

    await waitForStatus(instance, 'error');

    const statuses: PersistStatus[] = [];
    instance.subscribeToPersistErrors(status => statuses.push(status));

    expect(() => instance.updateFacility({ siteName: 'Still Applied Locally' })).not.toThrow();
    expect(instance.getState().facility.siteName).toBe('Still Applied Locally');

    await waitForStatus(instance, 'error');
    expect(statuses).toContain('saving');
  });

  it('retryPersist() re-attempts the current state and can recover to "saved"', async () => {
    let shouldFail = true;
    const adapter = createAsyncAdapter(async () => {
      if (shouldFail) throw new Error('disk full');
    });
    const instance = new DatabaseService(adapter);
    await waitForStatus(instance, 'error');

    shouldFail = false;
    instance.retryPersist();
    await waitForStatus(instance, 'saved');
  });

  it('subscribeToPersistErrors returns an unsubscribe function that stops further notifications', async () => {
    const adapter = createAsyncAdapter(async () => {});
    const instance = new DatabaseService(adapter);
    await waitForStatus(instance, 'saved');

    const received: PersistStatus[] = [];
    const unsubscribe = instance.subscribeToPersistErrors(status => received.push(status));
    unsubscribe();

    instance.updateFacility({ siteName: 'After Unsubscribe' });
    await waitForStatus(instance, 'saved');
    expect(received).toEqual([]);
  });
});
