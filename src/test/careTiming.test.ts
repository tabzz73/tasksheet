import { describe, expect, it } from 'vitest';
import { ALBERTA_TASK_TEMPLATES } from '../data/albertaCatalog';
import { DEFAULT_CARE_TIMING_PRESETS } from '../data/defaultData';
import { choosePreferredTimingPreset, getCareTimingPresetKind, getInShiftTimingPresets } from '../services/careTiming';
import { db } from '../db';

describe('facility medication and meal timing presets', () => {
  it('offers only active presets inside a normal shift', () => {
    const results = getInShiftTimingPresets(DEFAULT_CARE_TIMING_PRESETS.medicationTimes, '0700', '1500');
    expect(results.map(item => item.time)).toEqual(['0800', '1200']);
  });

  it('supports overnight shift windows and excludes the end boundary', () => {
    const presets = [
      { id: 'a', label: 'Late', time: '2300', isActive: true },
      { id: 'b', label: 'Midnight', time: '0000', isActive: true },
      { id: 'c', label: 'Early', time: '0659', isActive: true },
      { id: 'd', label: 'Boundary', time: '0700', isActive: true },
      { id: 'e', label: 'Disabled', time: '0100', isActive: false },
    ];
    expect(getInShiftTimingPresets(presets, '2300', '0700').map(item => item.time)).toEqual(['2300', '0000', '0659']);
  });

  it('identifies medication and meal tasks and chooses the closest named facility preset', () => {
    const medication = ALBERTA_TASK_TEMPLATES.find(task => task.slug === 'hca.medication.map2');
    const breakfast = ALBERTA_TASK_TEMPLATES.find(task => /breakfast/i.test(task.title));
    expect(medication).toBeDefined();
    expect(getCareTimingPresetKind(medication, 'Medication Assistance', medication?.title || '')).toBe('medication');
    if (breakfast) {
      expect(getCareTimingPresetKind(breakfast, 'Nutrition & Hydration', breakfast.title)).toBe('meal');
      expect(choosePreferredTimingPreset(DEFAULT_CARE_TIMING_PRESETS.mealTimes, breakfast)?.label).toBe('Breakfast');
    }
  });

  it('fills missing timing groups when restoring an older backup', () => {
    db.resetToDemoState();
    const olderBackup = JSON.parse(db.backupDatabase());
    olderBackup.settings.careTimingPresets = { medicationTimes: [{ id: 'custom', label: 'Custom', time: '0930' }] };

    db.restoreDatabase(JSON.stringify(olderBackup));

    expect(db.getState().settings.careTimingPresets?.medicationTimes[0].time).toBe('0930');
    expect(db.getState().settings.careTimingPresets?.mealTimes.map(item => item.time)).toEqual(['0800', '1200', '1700']);
  });
});
