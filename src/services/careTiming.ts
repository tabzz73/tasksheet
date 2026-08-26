import { CatalogTaskTemplate, FacilityTimePreset } from '../types';
import { isTimeWithinShift } from './scheduling/timeWindow';

export type CareTimingPresetKind = 'medication' | 'meal' | null;

const MEAL_WORDS = /\b(breakfast|lunch|dinner|supper|meal|snack)\b/i;

export function getCareTimingPresetKind(
  template: CatalogTaskTemplate | undefined,
  categoryName: string,
  title: string,
): CareTimingPresetKind {
  if (template?.categoryId === 'cat-med-assist' || /medication assistance/i.test(categoryName)) {
    return 'medication';
  }
  if (template?.categoryId === 'cat-nutrition' || template?.attentionConfig?.mealRelation || MEAL_WORDS.test(title)) {
    return 'meal';
  }
  return null;
}

export function getInShiftTimingPresets(
  presets: FacilityTimePreset[],
  shiftStart?: string,
  shiftEnd?: string,
): FacilityTimePreset[] {
  return presets.filter(preset => (
    preset.isActive !== false
    && (!shiftStart || !shiftEnd || isTimeWithinShift(preset.time, shiftStart, shiftEnd))
  ));
}

export function choosePreferredTimingPreset(
  presets: FacilityTimePreset[],
  template: CatalogTaskTemplate,
): FacilityTimePreset | undefined {
  const title = template.title.toLowerCase();
  const namedMatch = presets.find(preset => {
    const label = preset.label.toLowerCase();
    return ['breakfast', 'lunch', 'dinner', 'supper', 'snack'].some(word => title.includes(word) && label.includes(word));
  });
  return namedMatch || presets.find(preset => preset.time === template.defaultTime) || presets[0];
}
