import { AppDatabaseState } from '../types';

export interface DemoState {
  configurationMode: 'demo' | 'setup_required' | 'operational';
  demoConfigurationActive: boolean;
  demoRecordsActive: boolean;
  demoRecordCount: number;
  showDemoIndicator: boolean;
}

export function getDemoState(state: AppDatabaseState): DemoState {
  const collections = [state.shifts, state.residents, state.residentTasks, state.unitTasks, state.fyis, state.wounds];
  const demoRecordCount = collections.reduce(
    (count, items) => count + items.filter(item => item.source === 'demo').length,
    0,
  );
  const configurationMode = state.settings.dataMode || 'operational';
  const demoConfigurationActive = configurationMode === 'demo';
  const demoRecordsActive = demoRecordCount > 0;

  return {
    configurationMode,
    demoConfigurationActive,
    demoRecordsActive,
    demoRecordCount,
    showDemoIndicator: demoConfigurationActive || demoRecordsActive,
  };
}
