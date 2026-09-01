import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  RotateCw, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Sliders, 
  Info,
  CalendarDays
} from 'lucide-react';
import { 
  RecurrenceRule, 
  RecurrenceType, 
  RecurrenceOrdinal, 
  RecurrenceEndType,
  RecurrenceFrequency
} from '../../types';
import { formatRecurrenceHuman, parseDateUTC, formatDateUTC, getTodayLocalDateString } from '../../services/recurrence';

export interface RecurrenceSelectorProps {
  value?: RecurrenceRule;
  frequency?: RecurrenceFrequency;
  onChange: (rule: RecurrenceRule, frequency: RecurrenceFrequency) => void;
  defaultAnchorDate?: string;
  allowPrn?: boolean;
}

const WEEKDAYS = [
  { id: 1, label: 'M', full: 'Mon' },
  { id: 2, label: 'T', full: 'Tue' },
  { id: 3, label: 'W', full: 'Wed' },
  { id: 4, label: 'T', full: 'Thu' },
  { id: 5, label: 'F', full: 'Fri' },
  { id: 6, label: 'S', full: 'Sat' },
  { id: 0, label: 'S', full: 'Sun' },
];

const MONTHS = [
  { id: 1, name: 'Jan' }, { id: 2, name: 'Feb' }, { id: 3, name: 'Mar' },
  { id: 4, name: 'Apr' }, { id: 5, name: 'May' }, { id: 6, name: 'Jun' },
  { id: 7, name: 'Jul' }, { id: 8, name: 'Aug' }, { id: 9, name: 'Sep' },
  { id: 10, name: 'Oct' }, { id: 11, name: 'Nov' }, { id: 12, name: 'Dec' },
];

export const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  value,
  frequency: initialFreq,
  onChange,
  defaultAnchorDate = getTodayLocalDateString(),
  allowPrn = true,
}) => {
  const [activeType, setActiveType] = useState<RecurrenceType>(
    value?.type || (initialFreq === 'prn' ? 'PRN' : 'DAILY')
  );

  const [rule, setRule] = useState<RecurrenceRule>({
    type: value?.type || 'DAILY',
    interval: value?.interval || 1,
    startDate: value?.startDate || defaultAnchorDate,
    endDate: value?.endDate,
    endType: value?.endType || 'never',
    endOccurrencesCount: value?.endOccurrencesCount || 6,
    weekdays: value?.weekdays || value?.selectedDays || [1, 2, 3, 4, 5],
    dayOfMonth: value?.dayOfMonth || 15,
    ordinal: value?.ordinal || 'first',
    ordinalWeekday: value?.ordinalWeekday !== undefined ? value?.ordinalWeekday : 1,
    months: value?.months || [3, 6, 9, 12],
    specificDate: value?.specificDate || defaultAnchorDate,
    prnPrintOption: value?.prnPrintOption || 'all_sheets',
    scheduleMethod: value?.scheduleMethod || 'fixed_schedule',
    lastPerformedDate: value?.lastPerformedDate || defaultAnchorDate,
    ...value
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [monthlyMode, setMonthlyMode] = useState<'day' | 'ordinal'>(
    value?.type === 'MONTHLY_ORDINAL_WEEKDAY' ? 'ordinal' : 'day'
  );

  // Sync state to parent
  const updateRule = (updates: Partial<RecurrenceRule>, newType?: RecurrenceType) => {
    const targetType = newType || activeType;
    const nextRule: RecurrenceRule = {
      ...rule,
      ...updates,
      type: targetType,
      selectedDays: updates.weekdays || rule.weekdays,
    };
    setRule(nextRule);
    if (newType) setActiveType(newType);

    // Map to legacy RecurrenceFrequency enum for backwards compatibility
    let legacyFreq: RecurrenceFrequency = 'daily';
    if (targetType === 'ONE_TIME') legacyFreq = 'once';
    else if (targetType === 'DAILY') legacyFreq = 'daily';
    else if (targetType === 'SELECTED_WEEKDAYS') legacyFreq = 'selected_days';
    else if (targetType === 'WEEKLY') legacyFreq = 'weekly';
    else if (targetType === 'EVERY_N_WEEKS' && nextRule.interval === 2) legacyFreq = 'every_2_weeks';
    else if (targetType === 'MONTHLY_DAY') legacyFreq = 'monthly';
    else if (targetType === 'PRN') legacyFreq = 'prn';
    else legacyFreq = 'custom';

    onChange(nextRule, legacyFreq);
  };

  // Preset Shortcuts
  const applyPreset = (preset: 'daily' | 'every_other_day' | 'mwf' | 'weekly' | 'every_other_week' | 'monthly' | 'every_28_days' | 'one_time' | 'prn') => {
    switch (preset) {
      case 'daily':
        updateRule({ interval: 1 }, 'DAILY');
        break;
      case 'every_other_day':
        updateRule({ interval: 2 }, 'EVERY_N_DAYS');
        break;
      case 'mwf':
        updateRule({ weekdays: [1, 3, 5] }, 'SELECTED_WEEKDAYS');
        break;
      case 'weekly':
        updateRule({ interval: 1, weekdays: [parseDateUTC(rule.startDate || defaultAnchorDate).getUTCDay()] }, 'WEEKLY');
        break;
      case 'every_other_week':
        updateRule({ interval: 2, weekdays: [parseDateUTC(rule.startDate || defaultAnchorDate).getUTCDay()] }, 'EVERY_N_WEEKS');
        break;
      case 'monthly':
        setMonthlyMode('day');
        updateRule({ dayOfMonth: parseDateUTC(rule.startDate || defaultAnchorDate).getUTCDate() }, 'MONTHLY_DAY');
        break;
      case 'every_28_days':
        updateRule({ interval: 28 }, 'EVERY_N_DAYS');
        break;
      case 'one_time':
        updateRule({ specificDate: rule.startDate || defaultAnchorDate }, 'ONE_TIME');
        break;
      case 'prn':
        updateRule({}, 'PRN');
        break;
    }
  };

  const isPresetActive = (preset: string): boolean => {
    if (preset === 'daily' && activeType === 'DAILY') return true;
    if (preset === 'every_other_day' && activeType === 'EVERY_N_DAYS' && rule.interval === 2) return true;
    if (preset === 'mwf' && activeType === 'SELECTED_WEEKDAYS' && rule.weekdays?.length === 3 && rule.weekdays.includes(1) && rule.weekdays.includes(3) && rule.weekdays.includes(5)) return true;
    if (preset === 'weekly' && activeType === 'WEEKLY') return true;
    if (preset === 'every_other_week' && activeType === 'EVERY_N_WEEKS' && rule.interval === 2) return true;
    if (preset === 'monthly' && activeType === 'MONTHLY_DAY') return true;
    if (preset === 'every_28_days' && activeType === 'EVERY_N_DAYS' && rule.interval === 28) return true;
    if (preset === 'one_time' && activeType === 'ONE_TIME') return true;
    if (preset === 'prn' && activeType === 'PRN') return true;
    return false;
  };

  const toggleWeekday = (day: number) => {
    const current = rule.weekdays || [];
    const exists = current.includes(day);
    let next: number[];
    if (exists) {
      next = current.length > 1 ? current.filter(d => d !== day) : current;
    } else {
      next = [...current, day].sort();
    }
    updateRule({ weekdays: next });
  };

  const toggleMonth = (m: number) => {
    const current = rule.months || [];
    const exists = current.includes(m);
    let next: number[];
    if (exists) {
      next = current.length > 1 ? current.filter(item => item !== m) : current;
    } else {
      next = [...current, m].sort((a, b) => a - b);
    }
    updateRule({ months: next });
  };

  // Calculated next due preview for "From Last Performed"
  const getNextDueFromPerformed = () => {
    if (!rule.lastPerformedDate || !rule.interval) return '';
    try {
      const d = parseDateUTC(rule.lastPerformedDate);
      const nextD = new Date(d.getTime() + (rule.interval * 24 * 60 * 60 * 1000));
      return nextD.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4 text-slate-800">
      {/* ── COMMON PRESETS TOOLBAR ── */}
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          How often?
        </label>
        <div className="flex flex-wrap gap-1.5">
          {allowPrn && <button
            type="button"
            onClick={() => applyPreset('daily')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('daily') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Daily
          </button>}

          <button
            type="button"
            onClick={() => applyPreset('every_other_day')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('every_other_day') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Every Other Day
          </button>

          <button
            type="button"
            onClick={() => applyPreset('mwf')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('mwf') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Mon / Wed / Fri
          </button>

          <button
            type="button"
            onClick={() => applyPreset('weekly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('weekly') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Weekly
          </button>

          <button
            type="button"
            onClick={() => applyPreset('every_other_week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('every_other_week') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Every Other Week
          </button>

          <button
            type="button"
            onClick={() => applyPreset('monthly')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('monthly') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Monthly
          </button>

          <button
            type="button"
            onClick={() => applyPreset('every_28_days')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('every_28_days') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            Every 28 Days
          </button>

          <button
            type="button"
            onClick={() => applyPreset('one_time')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('one_time') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            One Time
          </button>

          <button
            type="button"
            onClick={() => applyPreset('prn')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPresetActive('prn') ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            PRN / If Required
          </button>

          <button
            type="button"
            onClick={() => setShowFullMenu(!showFullMenu)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold text-teal-700 hover:bg-teal-50 border border-teal-200 flex items-center space-x-1 transition-colors"
          >
            <span>{showFullMenu ? 'Hide options' : 'More options...'}</span>
            {showFullMenu ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ── EXPANDED FULL FREQUENCY SELECTOR ── */}
      {showFullMenu && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
          <div className="font-bold text-slate-700 mb-1">All Recurring Patterns:</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'ONE_TIME', label: 'One Time (Specific Date)' },
              { id: 'DAILY', label: 'Daily' },
              { id: 'EVERY_N_DAYS', label: 'Every N Days' },
              { id: 'SELECTED_WEEKDAYS', label: 'Selected Days of Week' },
              { id: 'WEEKLY', label: 'Weekly' },
              { id: 'EVERY_N_WEEKS', label: 'Every N Weeks' },
              { id: 'MONTHLY_DAY', label: 'Monthly on Day N' },
              { id: 'MONTHLY_ORDINAL_WEEKDAY', label: 'Monthly Ordinal (e.g. 1st Mon)' },
              { id: 'EVERY_N_MONTHS', label: 'Every N Months' },
              { id: 'SELECTED_MONTHS', label: 'Selected Months' },
              { id: 'DATE_RANGE', label: 'Date Range' },
              { id: 'PRN', label: 'PRN / If Required' },
            ].filter(item => allowPrn || item.id !== 'PRN').map(item => (
              <label
                key={item.id}
                className={`flex items-center space-x-2 p-2 rounded-lg border cursor-pointer ${
                  activeType === item.id ? 'border-teal-600 bg-teal-50 font-bold text-teal-900' : 'border-slate-200 bg-white text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="recurrence_type"
                  checked={activeType === item.id}
                  onChange={() => updateRule({}, item.id as RecurrenceType)}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── CONTEXTUAL RECURRENCE CONFIGURATION FIELDS ── */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-4 shadow-2xs">

        {/* 1. ONE TIME */}
        {activeType === 'ONE_TIME' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={rule.specificDate || rule.startDate || defaultAnchorDate}
                onChange={e => updateRule({ specificDate: e.target.value, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {/* 2. EVERY N DAYS */}
        {activeType === 'EVERY_N_DAYS' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Repeat Every</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={rule.interval || 2}
                  onChange={e => updateRule({ interval: Math.max(1, Number(e.target.value)) })}
                  className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
                <span className="text-xs text-slate-600 font-semibold">days</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Starting Date</label>
              <input
                type="date"
                value={rule.startDate || defaultAnchorDate}
                onChange={e => updateRule({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {/* 3. SELECTED DAYS */}
        {activeType === 'SELECTED_WEEKDAYS' && (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Repeat on Days</label>
            <div className="flex space-x-1.5">
              {WEEKDAYS.map(w => {
                const selected = (rule.weekdays || []).includes(w.id);
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => toggleWeekday(w.id)}
                    className={`w-9 h-9 rounded-lg text-xs font-bold flex flex-col items-center justify-center transition-all ${
                      selected ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    <span>{w.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. WEEKLY */}
        {activeType === 'WEEKLY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">On Day of Week</label>
              <div className="flex space-x-1.5">
                {WEEKDAYS.map(w => {
                  const selected = (rule.weekdays || []).includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => updateRule({ weekdays: [w.id] })}
                      className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                        selected ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Starting Date</label>
              <input
                type="date"
                value={rule.startDate || defaultAnchorDate}
                onChange={e => updateRule({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {/* 5. EVERY N WEEKS */}
        {activeType === 'EVERY_N_WEEKS' && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Every</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={rule.interval || 2}
                    onChange={e => updateRule({ interval: Math.max(1, Number(e.target.value)) })}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                  <span className="text-xs text-slate-600 font-semibold">weeks</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Starting Date</label>
                <input
                  type="date"
                  value={rule.startDate || defaultAnchorDate}
                  onChange={e => updateRule({ startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">On Days</label>
              <div className="flex space-x-1.5">
                {WEEKDAYS.map(w => {
                  const selected = (rule.weekdays || []).includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => toggleWeekday(w.id)}
                      className={`w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                        selected ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{w.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 6. MONTHLY & ORDINAL */}
        {(activeType === 'MONTHLY_DAY' || activeType === 'MONTHLY_ORDINAL_WEEKDAY') && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="monthly_radio"
                  checked={activeType === 'MONTHLY_DAY'}
                  onChange={() => {
                    setMonthlyMode('day');
                    updateRule({}, 'MONTHLY_DAY');
                  }}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>On day of every month</span>
              </label>

              {activeType === 'MONTHLY_DAY' && (
                <div className="pl-6 flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Day:</span>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={rule.dayOfMonth || 15}
                    onChange={e => updateRule({ dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value))) })}
                    className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                  <span className="text-xs text-slate-500">of every month</span>
                </div>
              )}

              <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer pt-2 border-t border-slate-100">
                <input
                  type="radio"
                  name="monthly_radio"
                  checked={activeType === 'MONTHLY_ORDINAL_WEEKDAY'}
                  onChange={() => {
                    setMonthlyMode('ordinal');
                    updateRule({}, 'MONTHLY_ORDINAL_WEEKDAY');
                  }}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>On ordinal weekday of every month</span>
              </label>

              {activeType === 'MONTHLY_ORDINAL_WEEKDAY' && (
                <div className="pl-6 flex items-center space-x-2">
                  <span className="text-xs text-slate-500">The</span>
                  <select
                    value={rule.ordinal || 'first'}
                    onChange={e => updateRule({ ordinal: e.target.value as RecurrenceOrdinal })}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="first">First</option>
                    <option value="second">Second</option>
                    <option value="third">Third</option>
                    <option value="fourth">Fourth</option>
                    <option value="last">Last</option>
                  </select>

                  <select
                    value={rule.ordinalWeekday !== undefined ? rule.ordinalWeekday : 1}
                    onChange={e => updateRule({ ordinalWeekday: Number(e.target.value) })}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                    <option value={0}>Sunday</option>
                  </select>
                  <span className="text-xs text-slate-500">of every month</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. EVERY N MONTHS */}
        {activeType === 'EVERY_N_MONTHS' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Repeat Every</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={rule.interval || 3}
                  onChange={e => updateRule({ interval: Math.max(1, Number(e.target.value)) })}
                  className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
                <span className="text-xs text-slate-600 font-semibold">months</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={rule.dayOfMonth || 15}
                onChange={e => updateRule({ dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value))) })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Starting Date</label>
              <input
                type="date"
                value={rule.startDate || defaultAnchorDate}
                onChange={e => updateRule({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {/* 8. SELECTED MONTHS */}
        {activeType === 'SELECTED_MONTHS' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Repeat in Months</label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {MONTHS.map(m => {
                  const selected = (rule.months || []).includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toggleMonth(m.id)}
                      className={`p-2 rounded-lg text-xs font-bold text-center transition-all ${
                        selected ? 'bg-teal-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {m.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Day of Month</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={rule.dayOfMonth || 15}
                  onChange={e => updateRule({ dayOfMonth: Math.min(31, Math.max(1, Number(e.target.value))) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* 9. DATE RANGE */}
        {activeType === 'DATE_RANGE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">From Date</label>
              <input
                type="date"
                value={rule.startDate || defaultAnchorDate}
                onChange={e => updateRule({ startDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">To Date</label>
              <input
                type="date"
                value={rule.endDate || defaultAnchorDate}
                onChange={e => updateRule({ endDate: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>
        )}

        {/* 10. PRN / IF REQUIRED */}
        {activeType === 'PRN' && (
          <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
            <div className="font-bold flex items-center space-x-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-teal-600" />
              <span>PRN / As-Needed Operational Task</span>
            </div>
            <p className="text-[11px] text-teal-800">
              This task will be placed under the dedicated <strong>PRN / IF REQUIRED</strong> section on printed working sheets rather than mixed into timed hourly schedules.
            </p>
          </div>
        )}

        {/* ── ENDS CONTROLS (FOR ALL RECURRING RULES EXCEPT ONE_TIME) ── */}
        {activeType !== 'ONE_TIME' && activeType !== 'PRN' && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Ends
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer ${
                rule.endType === 'never' ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold' : 'border-slate-200 bg-white text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="end_type"
                  checked={rule.endType === 'never'}
                  onChange={() => updateRule({ endType: 'never', endDate: undefined })}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>No end date</span>
              </label>

              <label className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer ${
                rule.endType === 'on_date' ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold' : 'border-slate-200 bg-white text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="end_type"
                  checked={rule.endType === 'on_date'}
                  onChange={() => updateRule({ endType: 'on_date' })}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>On date</span>
              </label>

              <label className={`flex items-center space-x-2 p-2 rounded-lg border text-xs cursor-pointer ${
                rule.endType === 'after_occurrences' ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold' : 'border-slate-200 bg-white text-slate-700'
              }`}>
                <input
                  type="radio"
                  name="end_type"
                  checked={rule.endType === 'after_occurrences'}
                  onChange={() => updateRule({ endType: 'after_occurrences' })}
                  className="text-teal-600 focus:ring-teal-500"
                />
                <span>After occurrences</span>
              </label>
            </div>

            {rule.endType === 'on_date' && (
              <div className="pt-2">
                <input
                  type="date"
                  value={rule.endDate || defaultAnchorDate}
                  onChange={e => updateRule({ endDate: e.target.value })}
                  className="w-full sm:w-64 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            )}

            {rule.endType === 'after_occurrences' && (
              <div className="pt-2 flex items-center space-x-2">
                <span className="text-xs text-slate-500">Stop after</span>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={rule.endOccurrencesCount || 6}
                  onChange={e => updateRule({ endOccurrencesCount: Math.max(1, Number(e.target.value)) })}
                  className="w-20 px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                />
                <span className="text-xs text-slate-500">total occurrences</span>
              </div>
            )}
          </div>
        )}

        {/* ── ADVANCED: SCHEDULE METHOD (FROM LAST PERFORMED) ── */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showAdvanced ? 'Hide Advanced Options' : 'Advanced Schedule Options...'}</span>
          </button>

          {showAdvanced && (
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Schedule Anchor Method</label>
                <div className="space-y-1.5">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule_method"
                      checked={rule.scheduleMethod === 'fixed_schedule'}
                      onChange={() => updateRule({ scheduleMethod: 'fixed_schedule' })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span><strong>Fixed Schedule:</strong> Calculated forward from anchor date</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="schedule_method"
                      checked={rule.scheduleMethod === 'from_last_performed'}
                      onChange={() => updateRule({ scheduleMethod: 'from_last_performed' })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span><strong>From Last Performed:</strong> Calculated from manual last performed date</span>
                  </label>
                </div>
              </div>

              {rule.scheduleMethod === 'from_last_performed' && (
                <div className="p-2.5 bg-white border border-slate-200 rounded-lg space-y-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Last Performed Date
                    </label>
                    <input
                      type="date"
                      value={rule.lastPerformedDate || defaultAnchorDate}
                      onChange={e => updateRule({ lastPerformedDate: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  {getNextDueFromPerformed() && (
                    <p className="text-[11px] text-teal-800 font-semibold">
                      → Calculated Next Due: <strong>{getNextDueFromPerformed()}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* ── HUMAN READABLE SUMMARY BANNER ── */}
      <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
        <div className="flex items-center space-x-2 text-slate-700">
          <CalendarDays className="w-4 h-4 text-teal-600 shrink-0" />
          <span>Schedule: <strong className="text-slate-900">{formatRecurrenceHuman(rule)}</strong></span>
        </div>
      </div>
    </div>
  );
};
