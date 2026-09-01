import React, { useState } from 'react';
import { Clock3, Pill, Plus, RotateCcw, Save, Trash2, Utensils } from 'lucide-react';
import { db } from '../../db';
import { DEFAULT_CARE_TIMING_PRESETS } from '../../data/defaultData';
import { FacilityCareTimingSettings, FacilityTimePreset } from '../../types';
import { parseMilitaryTime } from '../../services/scheduling/timeWindow';

interface CareTimingSettingsTabProps {
  onShowFeedback: (type: 'success' | 'error', text: string) => void;
}

function cloneTimingSettings(settings: FacilityCareTimingSettings): FacilityCareTimingSettings {
  return {
    medicationTimes: settings.medicationTimes.map(item => ({ ...item })),
    mealTimes: settings.mealTimes.map(item => ({ ...item })),
  };
}

function normalizeTime(value: string): string | null {
  const minutes = parseMilitaryTime(value);
  if (minutes === null) return null;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}${String(minutes % 60).padStart(2, '0')}`;
}

export const CareTimingSettingsTab: React.FC<CareTimingSettingsTabProps> = ({ onShowFeedback }) => {
  const initial = db.getState().settings.careTimingPresets || DEFAULT_CARE_TIMING_PRESETS;
  const [timings, setTimings] = useState<FacilityCareTimingSettings>(() => cloneTimingSettings(initial));

  const updatePreset = (group: keyof FacilityCareTimingSettings, id: string, updates: Partial<FacilityTimePreset>) => {
    setTimings(current => ({
      ...current,
      [group]: current[group].map(item => item.id === id ? { ...item, ...updates } : item),
    }));
  };

  const addPreset = (group: keyof FacilityCareTimingSettings) => {
    const isMedication = group === 'medicationTimes';
    setTimings(current => {
      const prefix = isMedication ? 'med-custom' : 'meal-custom';
      let suffix = current[group].length + 1;
      while (current[group].some(item => item.id === `${prefix}-${suffix}`)) suffix += 1;
      const item: FacilityTimePreset = {
        id: `${prefix}-${suffix}`,
        label: isMedication ? 'Medication time' : 'Meal / snack',
        time: '',
        isActive: true,
      };
      return { ...current, [group]: [...current[group], item] };
    });
  };

  const removePreset = (group: keyof FacilityCareTimingSettings, id: string) => {
    setTimings(current => ({ ...current, [group]: current[group].filter(item => item.id !== id) }));
  };

  const handleSave = () => {
    const normalized: FacilityCareTimingSettings = { medicationTimes: [], mealTimes: [] };
    for (const group of ['medicationTimes', 'mealTimes'] as const) {
      const seen = new Set<string>();
      for (const item of timings[group]) {
        const time = normalizeTime(item.time);
        if (!item.label.trim() || !time) {
          onShowFeedback('error', 'Every timing preset needs a label and a valid 24-hour time such as 0800.');
          return;
        }
        if (seen.has(time)) {
          onShowFeedback('error', `Duplicate ${group === 'medicationTimes' ? 'medication' : 'meal'} time ${time}.`);
          return;
        }
        seen.add(time);
        normalized[group].push({ ...item, label: item.label.trim(), time });
      }
    }

    setTimings(cloneTimingSettings(normalized));
    db.updateSettings({ careTimingPresets: normalized });
    onShowFeedback('success', 'Facility medication and meal timing presets saved.');
  };

  const handleReset = () => {
    setTimings(cloneTimingSettings(DEFAULT_CARE_TIMING_PRESETS));
    onShowFeedback('success', 'Standard medication and meal times restored. Select Save Timing Presets to apply them.');
  };

  const renderGroup = (
    group: keyof FacilityCareTimingSettings,
    title: string,
    description: string,
    Icon: React.ComponentType<{ className?: string }>,
  ) => (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-teal-100 text-teal-800"><Icon className="w-4 h-4" /></span>
          <div>
            <h3 className="text-sm font-black text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => addPreset(group)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
        >
          <Plus className="w-3.5 h-3.5" /> Add time
        </button>
      </div>

      <div className="p-4 space-y-2">
        {timings[group].length === 0 && (
          <div className="p-5 border border-dashed border-slate-300 rounded-xl text-center text-xs text-slate-500">
            No timings configured. Add at least one facility time.
          </div>
        )}
        {timings[group].map(item => {
          const invalidTime = item.time.length > 0 && parseMilitaryTime(item.time) === null;
          return (
            <div key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] sm:grid-cols-[auto_minmax(0,1fr)_110px_auto] gap-3 items-center p-3 rounded-xl border border-slate-200 bg-white">
              <input
                type="checkbox"
                checked={item.isActive !== false}
                onChange={event => updatePreset(group, item.id, { isActive: event.target.checked })}
                aria-label={`Enable ${item.label}`}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <input
                type="text"
                value={item.label}
                onChange={event => updatePreset(group, item.id, { label: event.target.value })}
                aria-label={`${title} label`}
                placeholder={group === 'medicationTimes' ? 'e.g. Morning medications' : 'e.g. Breakfast'}
                className="min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-teal-500"
              />
              <div className="col-start-2 sm:col-start-auto">
                <input
                  type="text"
                  inputMode="numeric"
                  value={item.time}
                  onChange={event => updatePreset(group, item.id, { time: event.target.value.replace(/\D/g, '').slice(0, 4) })}
                  onBlur={() => {
                    const normalized = normalizeTime(item.time);
                    if (normalized) updatePreset(group, item.id, { time: normalized });
                  }}
                  aria-label={`${item.label} time`}
                  placeholder="0800"
                  maxLength={4}
                  className={`w-full px-3 py-2 border rounded-lg text-xs font-mono font-black tracking-wider focus:ring-2 focus:ring-teal-500 ${invalidTime ? 'border-rose-400 bg-rose-50' : 'border-slate-300'}`}
                />
              </div>
              <button
                type="button"
                onClick={() => removePreset(group, item.id)}
                aria-label={`Remove ${item.label}`}
                className="p-2 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="p-2 rounded-xl bg-teal-100 text-teal-800"><Clock3 className="w-5 h-5" /></span>
          <div>
            <h2 className="text-base font-black text-slate-900">Facility Care Timing Presets</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">These times appear as quick choices when staff add Medication Assistance or meal-related resident tasks. Only times inside the selected shift are offered.</p>
          </div>
        </div>
      </div>

      {renderGroup('medicationTimes', 'Medication Timing Presets', 'Common facility medication-pass or assistance times.', Pill)}
      {renderGroup('mealTimes', 'Meal Timing Presets', 'Breakfast, lunch, dinner, snacks, or other facility meal times.', Utensils)}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-1">
        <button type="button" onClick={handleReset} className="inline-flex justify-center items-center gap-2 px-4 py-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50">
          <RotateCcw className="w-3.5 h-3.5" /> Restore standard times
        </button>
        <button type="button" onClick={handleSave} className="inline-flex justify-center items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm">
          <Save className="w-3.5 h-3.5" /> Save Timing Presets
        </button>
      </div>
    </div>
  );
};
