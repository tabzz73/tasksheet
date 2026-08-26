import React, { useEffect, useState, useMemo } from 'react';
import { 
  Sparkles, 
  Check, 
  HeartHandshake, 
  Stethoscope, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Calendar, 
  ArrowLeft, 
  ArrowRight, 
  Sliders, 
  Layers, 
  Utensils, 
  Pill, 
  Activity, 
  Bath, 
  Footprints, 
  ShieldAlert,
  Info,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { db } from '../../db';
import { 
  Resident, 
  RecurrenceFrequency, 
  FacilityQuickAddPreset, 
  CatalogTaskTemplate,
  RecurrenceRule,
  Shift,
  Role,
  TaskAttentionConfig,
  ResidentTrackingConfig
} from '../../types';
import { RecurrenceSelector } from '../common/RecurrenceSelector';
import { DEFAULT_HCA_QUICK_ADD_PRESETS, ROLE_HCA_ID, ROLE_LPN_ID } from '../../data/defaultData';
import { findActiveRoleShiftForTime, validateTimedCareShift } from '../../services/scheduling/careShiftAssignment';
import { getResidentStatusLabel, isResidentCarePaused } from '../../services/residentStatus';
import { TaskAttentionBadges } from '../common/TaskAttentionBadges';

interface QuickCareSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  resident: Resident;
  onSuccess?: () => void;
}

interface SelectedTaskDraft {
  id: string; // unique draft id
  presetId?: string;
  templateSlug?: string;
  title: string;
  category: string;
  roleId: string;
  shiftId: string;
  time: string;
  frequency: RecurrenceFrequency;
  recurrenceRule?: RecurrenceRule;
  instructions: string;
  attentionConfig?: TaskAttentionConfig;
  trackingConfig?: ResidentTrackingConfig;
}

export const QuickCareSetupModal: React.FC<QuickCareSetupModalProps> = ({
  isOpen,
  onClose,
  resident,
  onSuccess,
}) => {
  const state = db.getState();
  const getCatalogCategoryName = (categoryId: string) =>
    state.catalogCategories.find(category => category.id === categoryId)?.name || categoryId;
  const presets = state.settings.quickAddPresets || DEFAULT_HCA_QUICK_ADD_PRESETS;
  const shifts = state.shifts.filter(s => s.isActive !== false);
  const hcaRoleId = state.roles.find(role => role.code === 'HCA')?.id || ROLE_HCA_ID;
  const lpnRoleId = state.roles.find(role => role.code === 'LPN')?.id || ROLE_LPN_ID;

  // Modal Step: 'select' (Step 1) | 'configure' (Step 2)
  const [step, setStep] = useState<'select' | 'configure'>('select');

  // Discovery Tab: 'common' | 'recent' | 'all'
  const [discoveryTab, setDiscoveryTab] = useState<'common' | 'recent' | 'all'>('common');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Preset IDs in Step 1
  const [selectedPresetIds, setSelectedPresetIds] = useState<Set<string>>(new Set(['preset_am_care']));
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>('preset_am_care');

  // Preset sub-option selections
  // For Meal Assistance: which assistance types (e.g. ['meal_escort']) and meals (e.g. ['breakfast', 'lunch', 'supper'])
  const [mealSubOptions, setMealSubOptions] = useState<string[]>(['meal_escort', 'meal_setup']);
  const [mealTimingOptions, setMealTimingOptions] = useState<string[]>(['breakfast', 'lunch', 'supper']);
  
  // For Compression Stockings: 'apply', 'remove', or 'both'
  const [stockingMode, setStockingMode] = useState<'apply' | 'remove' | 'both'>('both');

  // For Medication Assistance: 'map1', 'map2', or 'map3'
  const [mapSelection, setMapSelection] = useState<'map1' | 'map2' | 'map3'>('map2');

  // For other presets: which sub-option ID is selected
  const [presetSubOptionMap, setPresetSubOptionMap] = useState<Record<string, string>>({
    preset_toileting: 'toil_assist',
    preset_mobility: 'mob_walking',
    preset_bathing: 'bath_shower',
    preset_catheter: 'cath_empty',
    preset_exercise: 'ex_program',
  });

  // Selected catalog task templates from 'All Tasks' or 'Recent'
  const [selectedCatalogSlugs, setSelectedCatalogSlugs] = useState<Set<string>>(new Set());

  // Step 2 Draft Tasks
  const [draftTasks, setDraftTasks] = useState<SelectedTaskDraft[]>([]);
  const [allowPausedResidentCare, setAllowPausedResidentCare] = useState(false);

  useEffect(() => {
    setAllowPausedResidentCare(false);
  }, [isOpen, resident.id]);

  // Recent tasks used in facility
  const recentTemplates = useMemo(() => {
    const slugCounts: Record<string, number> = {};
    state.residentTasks.forEach(t => {
      if (t.templateSlug) slugCounts[t.templateSlug] = (slugCounts[t.templateSlug] || 0) + 1;
    });
    const sortedSlugs = Object.keys(slugCounts).sort((a, b) => slugCounts[b] - slugCounts[a]).slice(0, 10);
    return state.catalogTaskTemplates.filter(t => sortedSlugs.includes(t.slug));
  }, [state.residentTasks, state.catalogTaskTemplates]);

  // Filtered All Tasks
  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return state.catalogTaskTemplates.filter(t => t.isActive !== false);
    const q = searchQuery.toLowerCase();
    return state.catalogTaskTemplates.filter(t => 
      t.isActive !== false && (
        t.title.toLowerCase().includes(q) ||
        getCatalogCategoryName(t.categoryId).toLowerCase().includes(q) ||
        t.synonyms?.some(s => s.toLowerCase().includes(q))
      )
    );
  }, [state.catalogTaskTemplates, searchQuery]);

  // Existing Active Tasks for this Resident (to prevent duplication)
  const existingResidentTasks = useMemo(() => {
    return state.residentTasks.filter(t => t.residentId === resident.id && t.isActive !== false);
  }, [state.residentTasks, resident.id]);

  // Helper to check if a task is already active on this resident
  const isTaskAlreadyActive = (slug?: string, title?: string, time?: string): boolean => {
    return existingResidentTasks.some(existing => {
      if (slug && existing.templateSlug && existing.templateSlug === slug) {
        if (!time || !existing.time || existing.time === time) return true;
      }
      if (title && existing.title.trim().toLowerCase() === title.trim().toLowerCase()) {
        if (!time || !existing.time || existing.time === time) return true;
      }
      return false;
    });
  };

  // Helper to check if a preset is already active
  const isPresetAlreadyActive = (preset: FacilityQuickAddPreset): boolean => {
    if (preset.id === 'preset_meals') {
      return existingResidentTasks.some(t => t.title.toLowerCase().includes('meal assistance'));
    }
    if (preset.id === 'preset_stockings') {
      return existingResidentTasks.some(t => t.title.toLowerCase().includes('compression stocking'));
    }
    return preset.options.some(opt => isTaskAlreadyActive(opt.templateSlug, opt.label));
  };

  const resolveShiftIdForTime = (roleId: string, time: string): string =>
    findActiveRoleShiftForTime(shifts, roleId, time)?.id || '';

  // Toggle preset selection
  const handleTogglePreset = (presetId: string) => {
    const next = new Set(selectedPresetIds);
    if (next.has(presetId)) {
      next.delete(presetId);
    } else {
      next.add(presetId);
      setExpandedPresetId(presetId);
    }
    setSelectedPresetIds(next);
  };

  // Toggle catalog task template
  const handleToggleCatalogTask = (slug: string) => {
    const next = new Set(selectedCatalogSlugs);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setSelectedCatalogSlugs(next);
  };

  // Build Drafts and Proceed to Step 2
  const handleProceedToConfigure = () => {
    const drafts: SelectedTaskDraft[] = [];

    // Process Common Presets
    presets.forEach(p => {
      if (!selectedPresetIds.has(p.id)) return;

      const roleId = p.roleCode === 'LPN' ? lpnRoleId : hcaRoleId;

      // Special Case 1: Meal Assistance
      if (p.id === 'preset_meals') {
        const mealTimes: Record<string, { time: string; label: string }> = {
          breakfast: { time: '0815', label: 'Breakfast' },
          lunch: { time: '1215', label: 'Lunch' },
          supper: { time: '1715', label: 'Supper' },
          snacks: { time: '1030', label: 'Snacks / Hydration' },
        };

        mealTimingOptions.forEach(mealKey => {
          const mInfo = mealTimes[mealKey] || { time: '0815', label: mealKey };
          const assistLabels = mealSubOptions.map(optId => {
            const opt = p.options.find(o => o.id === optId);
            return opt ? opt.label : '';
          }).filter(Boolean).join(', ');

          drafts.push({
            id: `draft_meal_${mealKey}_${Date.now()}`,
            presetId: p.id,
            templateSlug: 'escort-dining-room',
            title: `Meal Assistance — ${mInfo.label}`,
            category: p.category,
            roleId,
            shiftId: resolveShiftIdForTime(roleId, mInfo.time),
            time: mInfo.time,
            frequency: 'daily',
            instructions: assistLabels ? `Assistance required: ${assistLabels}.` : 'Assist resident with meal routine.',
          });
        });
        return;
      }

      // Special Case 2: Compression Stockings
      if (p.id === 'preset_stockings') {
        if (stockingMode === 'apply' || stockingMode === 'both') {
          drafts.push({
            id: `draft_stock_apply_${Date.now()}`,
            presetId: p.id,
            templateSlug: 'compression-stockings-apply',
            title: 'Compression Stocking Assistance — Apply',
            category: p.category,
            roleId,
            shiftId: resolveShiftIdForTime(roleId, '0800'),
            time: '0800',
            frequency: 'daily',
            instructions: 'Apply clean compression stockings in morning before resident ambulates.',
          });
        }
        if (stockingMode === 'remove' || stockingMode === 'both') {
          drafts.push({
            id: `draft_stock_remove_${Date.now()}`,
            presetId: p.id,
            templateSlug: 'compression-stockings-remove',
            title: 'Compression Stocking Assistance — Remove',
            category: p.category,
            roleId,
            shiftId: resolveShiftIdForTime(roleId, '2000'),
            time: '2000',
            frequency: 'daily',
            instructions: 'Remove compression stockings in evening during bedtime preparation.',
          });
        }
        return;
      }

      // Special Case 3: Medication Assistance (MAP1/2/3)
      if (p.id === 'preset_med_assist') {
        const mapOpt = p.options.find(o => o.id === mapSelection) || p.options[0];
        drafts.push({
          id: `draft_map_${Date.now()}`,
          presetId: p.id,
          templateSlug: mapOpt.templateSlug,
          title: mapOpt.label,
          category: p.category,
          roleId,
          shiftId: resolveShiftIdForTime(roleId, mapOpt.defaultTime || '0800'),
          time: mapOpt.defaultTime || '0800',
          frequency: 'daily',
          instructions: mapOpt.defaultInstructions || 'Assist according to authorized resident care plan.',
        });
        return;
      }

      // General Preset Case (AM Care, PM Care, Toileting, Mobility, Bathing, Catheter, Exercise)
      const selectedSubId = presetSubOptionMap[p.id] || p.options[0]?.id;
      const subOpt = p.options.find(o => o.id === selectedSubId) || p.options[0];

      let bundledInst = '';
      if (p.includedBundledItems && p.includedBundledItems.length > 0) {
        bundledInst = `Included routine: ${p.includedBundledItems.join(', ')}.`;
      }

      drafts.push({
        id: `draft_${p.id}_${Date.now()}`,
        presetId: p.id,
        templateSlug: subOpt?.templateSlug,
        title: subOpt?.label || p.label,
        category: p.category,
        roleId,
        shiftId: resolveShiftIdForTime(roleId, subOpt?.defaultTime || p.defaultTime || '0800'),
        time: subOpt?.defaultTime || p.defaultTime || '0800',
        frequency: subOpt?.defaultFrequency || p.defaultFrequency || 'daily',
        instructions: subOpt?.defaultInstructions || bundledInst || 'Provide care as planned.',
      });
    });

    // Process Selected Catalog Task Templates
    selectedCatalogSlugs.forEach(slug => {
      const tmpl = state.catalogTaskTemplates.find(t => t.slug === slug);
      if (!tmpl) return;

      const isLpn = tmpl.roleCode === 'LPN';
      const roleId = isLpn ? lpnRoleId : hcaRoleId;

      drafts.push({
        id: `draft_cat_${tmpl.slug}_${Date.now()}`,
        templateSlug: tmpl.slug,
        title: tmpl.title,
        category: getCatalogCategoryName(tmpl.categoryId),
        roleId,
        shiftId: resolveShiftIdForTime(roleId, tmpl.defaultTime || '0800'),
        time: tmpl.defaultTime || '0800',
        frequency: tmpl.defaultFrequency || 'daily',
        instructions: tmpl.defaultInstructions || 'Follow resident care plan.',
        attentionConfig: tmpl.attentionConfig,
        trackingConfig: tmpl.trackingConfig,
      });
    });

    setDraftTasks(drafts);
    setStep('configure');
  };

  // Update a single draft task in Step 2
  const handleUpdateDraft = (id: string, updates: Partial<SelectedTaskDraft>) => {
    setDraftTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  // Remove a draft task from Step 2
  const handleRemoveDraft = (id: string) => {
    setDraftTasks(prev => prev.filter(t => t.id !== id));
  };

  const getDraftTimeError = (task: SelectedTaskDraft): string | null => {
    return validateTimedCareShift({
      shifts: state.shifts,
      roles: state.roles,
      shiftId: task.shiftId,
      roleId: task.roleId,
      time: task.time,
    });
  };

  const draftTimeErrors = new Map(
    draftTasks.map(task => [task.id, getDraftTimeError(task)]).filter((entry): entry is [string, string] => !!entry[1])
  );

  // Final Commit to Database (Duplication-Safe Upsert)
  const handleSaveAll = () => {
    if (draftTimeErrors.size > 0 || (isResidentCarePaused(resident.status) && !allowPausedResidentCare)) return;
    draftTasks.forEach(task => {
      // Find if an identical active task already exists on this resident
      const existingMatch = state.residentTasks.find(t => 
        t.residentId === resident.id && 
        t.isActive !== false && (
          (task.templateSlug && t.templateSlug === task.templateSlug && (!task.time || !t.time || t.time === task.time)) ||
          (t.title.trim().toLowerCase() === task.title.trim().toLowerCase() && (!task.time || !t.time || t.time === task.time))
        )
      );

      if (existingMatch) {
        // Update existing active task instead of creating duplicate records
        db.updateResidentTask(existingMatch.id, {
          shiftId: task.shiftId || existingMatch.shiftId,
          roleId: task.roleId || existingMatch.roleId,
          templateSlug: task.templateSlug || existingMatch.templateSlug,
          title: task.title.trim(),
          category: task.category,
          time: task.time,
          frequency: task.frequency,
          recurrenceRule: task.recurrenceRule,
          instructions: task.instructions.trim() || undefined,
          attentionConfig: task.attentionConfig,
          trackingConfig: task.trackingConfig,
        });
      } else {
        // Insert new task
        db.addResidentTask({
          residentId: resident.id,
          shiftId: task.shiftId || undefined,
          roleId: task.roleId || undefined,
          templateSlug: task.templateSlug,
          title: task.title.trim(),
          category: task.category,
          time: task.time,
          frequency: task.frequency,
          recurrenceRule: task.recurrenceRule,
          instructions: task.instructions.trim() || undefined,
          attentionConfig: task.attentionConfig,
          trackingConfig: task.trackingConfig,
          priority: 'normal',
        });
      }
    });

    onSuccess?.();
    onClose();
  };

  const totalSelectedCount = selectedPresetIds.size + selectedCatalogSlugs.size;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Set Up Resident Care Plan"
      subtitle={`Room ${resident.roomNumber} — ${resident.firstName} ${resident.lastName}`}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        {isResidentCarePaused(resident.status) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950" role="alert">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-xs font-black">Care generation is paused: {getResidentStatusLabel(resident.status)}</p>
                <p className="mt-1 text-[11px] leading-relaxed">New routines will be stored but will not appear on TaskSheets until this resident returns to Active.</p>
                <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] font-bold">
                  <input type="checkbox" checked={allowPausedResidentCare} onChange={event => setAllowPausedResidentCare(event.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded text-amber-700" />
                  <span>I understand and want to configure future care while this resident is paused.</span>
                </label>
              </div>
            </div>
          </div>
        )}
        {/* ── STEP 1: DISCOVER & SELECT CARE ROUTINES ── */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500">
              Select the common care this resident requires. You can customize schedules and specific instructions in the next step.
            </p>

            {/* Discovery Tabs & Search Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDiscoveryTab('common')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    discoveryTab === 'common'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Common ({presets.filter(p => p.isActive).length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscoveryTab('recent')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    discoveryTab === 'recent'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Recent ({recentTemplates.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiscoveryTab('all')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                    discoveryTab === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  <span>All Tasks ({state.catalogTaskTemplates.length})</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search care routines..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* ── TAB 1: COMMON CARE GROUPS ── */}
            {discoveryTab === 'common' && (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                {presets.filter(p => p.isActive).map(preset => {
                  const isSelected = selectedPresetIds.has(preset.id);
                  const isExpanded = expandedPresetId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      className={`rounded-xl border transition-all ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Card Header Row */}
                      <div className="p-3 flex items-start justify-between cursor-pointer">
                        <label className="flex items-start space-x-3 cursor-pointer flex-1 select-none">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleTogglePreset(preset.id)}
                            className="w-4 h-4 mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-slate-900">{preset.label}</span>
                              {preset.defaultTime && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded font-bold">
                                  Default {preset.defaultTime}
                                </span>
                              )}
                              {isPresetAlreadyActive(preset) && (
                                <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                                  ✓ Active on Resident
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{preset.subtitle}</p>
                          </div>
                        </label>

                        {isSelected && (
                          <button
                            type="button"
                            onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                            title="Customize options"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>

                      {/* Expandable Sub-Options */}
                      {isSelected && isExpanded && (
                        <div className="px-4 pb-3 pt-1 border-t border-slate-200/60 space-y-3 bg-white/70 rounded-b-xl text-xs">
                          {/* AM Care / PM Care Bundled Preview */}
                          {preset.includedBundledItems && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Included in this routine:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-slate-700">
                                {preset.includedBundledItems.map((item, i) => (
                                  <div key={i} className="flex items-center space-x-1.5">
                                    <Check className="w-3 h-3 text-teal-600 shrink-0" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Meal Assistance Mini-Workflow */}
                          {preset.id === 'preset_meals' && (
                            <div className="space-y-2.5">
                              <div>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                  Assistance Required:
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                  {preset.options.map(opt => (
                                    <label key={opt.id} className="flex items-center space-x-1.5 text-[11px] text-slate-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={mealSubOptions.includes(opt.id)}
                                        onChange={() => {
                                          setMealSubOptions(prev => 
                                            prev.includes(opt.id) ? prev.filter(x => x !== opt.id) : [...prev, opt.id]
                                          );
                                        }}
                                        className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                      />
                                      <span>{opt.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                  Scheduled Meals:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                  {[
                                    { key: 'breakfast', label: 'Breakfast (0815)' },
                                    { key: 'lunch', label: 'Lunch (1215)' },
                                    { key: 'supper', label: 'Supper (1715)' },
                                    { key: 'snacks', label: 'Snacks (1030)' },
                                  ].map(m => (
                                    <label key={m.key} className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-800 bg-slate-100 px-2 py-1 rounded cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={mealTimingOptions.includes(m.key)}
                                        onChange={() => {
                                          setMealTimingOptions(prev => 
                                            prev.includes(m.key) ? prev.filter(x => x !== m.key) : [...prev, m.key]
                                          );
                                        }}
                                        className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                                      />
                                      <span>{m.label}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Compression Stockings Choice */}
                          {preset.id === 'preset_stockings' && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Stocking Routine:
                              </span>
                              <div className="flex space-x-2">
                                {[
                                  { id: 'both', label: 'Apply (0800) & Remove (2000)' },
                                  { id: 'apply', label: 'Apply Only (0800)' },
                                  { id: 'remove', label: 'Remove Only (2000)' },
                                ].map(s => (
                                  <label key={s.id} className="flex items-center space-x-1.5 text-[11px] text-slate-800 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="stocking_mode"
                                      checked={stockingMode === s.id}
                                      onChange={() => setStockingMode(s.id as any)}
                                      className="text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>{s.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Medication Assistance Choice (MAP1/2/3) */}
                          {preset.id === 'preset_med_assist' && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                MAP Assistance Level:
                              </span>
                              <div className="space-y-1">
                                {preset.options.map(opt => (
                                  <label key={opt.id} className="flex items-start space-x-2 text-[11px] text-slate-800 cursor-pointer">
                                    <input
                                      type="radio"
                                      name="map_option"
                                      checked={mapSelection === opt.id}
                                      onChange={() => setMapSelection(opt.id as any)}
                                      className="text-teal-600 focus:ring-teal-500 mt-0.5"
                                    />
                                    <div>
                                      <span className="font-bold">{opt.label}</span>
                                      <span className="text-slate-500 block text-[10px]">{opt.defaultInstructions}</span>
                                    </div>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* General Radio Options (Toileting, Mobility, Bathing, Catheter, Exercise) */}
                          {preset.id !== 'preset_meals' && preset.id !== 'preset_stockings' && preset.id !== 'preset_med_assist' && (
                            <div>
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                                Specific Option:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {preset.options.map(opt => (
                                  <label key={opt.id} className="flex items-center space-x-2 text-[11px] text-slate-800 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`opt_${preset.id}`}
                                      checked={(presetSubOptionMap[preset.id] || preset.options[0]?.id) === opt.id}
                                      onChange={() => setPresetSubOptionMap({ ...presetSubOptionMap, [preset.id]: opt.id })}
                                      className="text-teal-600 focus:ring-teal-500"
                                    />
                                    <span>{opt.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── TAB 2: RECENT TASKS ── */}
            {discoveryTab === 'recent' && (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {recentTemplates.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No recent tasks recorded yet.</div>
                ) : (
                  recentTemplates.map(tmpl => {
                    const isSelected = selectedCatalogSlugs.has(tmpl.slug);
                    return (
                      <label
                        key={tmpl.slug}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleCatalogTask(tmpl.slug)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-xs text-slate-900">{tmpl.title}</span>
                              {isTaskAlreadyActive(tmpl.slug, tmpl.title, tmpl.defaultTime) && (
                                <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                                  ✓ Active
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">{getCatalogCategoryName(tmpl.categoryId)} · Default {tmpl.defaultTime || '0800'}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-slate-400">{tmpl.roleCode}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}

            {/* ── TAB 3: ALL CATALOG TASKS ── */}
            {discoveryTab === 'all' && (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {filteredCatalog.map(tmpl => {
                  const isSelected = selectedCatalogSlugs.has(tmpl.slug);
                  return (
                    <label
                      key={tmpl.slug}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isSelected ? 'border-purple-600 bg-purple-50/50' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleCatalogTask(tmpl.slug)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-xs text-slate-900">{tmpl.title}</span>
                            {isTaskAlreadyActive(tmpl.slug, tmpl.title, tmpl.defaultTime) && (
                              <span className="text-[10px] bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                                ✓ Active
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500">{getCatalogCategoryName(tmpl.categoryId)} · Default {tmpl.defaultTime || '0800'}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold font-mono text-slate-400">{tmpl.roleCode}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Selection Summary & Navigation */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">
                Selected: <strong className="text-slate-900">{totalSelectedCount} care routine{totalSelectedCount !== 1 ? 's' : ''}</strong>
              </span>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={totalSelectedCount === 0}
                  onClick={handleProceedToConfigure}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <span>Configure Selected ({totalSelectedCount})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: STREAMLINED CONFIGURATION TRAY ── */}
        {step === 'configure' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Fine-tune shift, scheduled time, and recurrence for the selected care tasks.
              </p>
              <button
                type="button"
                onClick={() => setStep('select')}
                className="text-xs text-teal-700 font-bold hover:underline flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Selection</span>
              </button>
            </div>

            {/* List of Draft Tasks */}
            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {draftTasks.map((task, index) => (
                <div key={task.id} className={`p-4 bg-slate-50 border rounded-xl space-y-3 text-xs ${draftTimeErrors.has(task.id) ? 'border-red-300' : 'border-slate-200'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Routine #{index + 1} · {task.category}
                        </span>
                        {isTaskAlreadyActive(task.templateSlug, task.title, task.time) && (
                          <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.5 rounded font-bold">
                            🔄 Updates Existing Task
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{task.title}</h4>
                        <TaskAttentionBadges attentionConfig={task.attentionConfig} maxVisible={3} />
                        {task.trackingConfig && <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-cyan-800">Tracking</span>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDraft(task.id)}
                      className="text-slate-400 hover:text-rose-600 text-xs font-semibold"
                      title="Remove this task"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Shift */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Assigned Shift
                      </label>
                      <select
                        value={task.shiftId}
                        onChange={e => handleUpdateDraft(task.id, { shiftId: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold"
                      >
                        {shifts.filter(s => s.roleId === task.roleId).length === 0 && (
                          <option value="">No active role-matching shift</option>
                        )}
                        {shifts.filter(s => s.roleId === task.roleId).map(s => (
                          <option key={s.id} value={s.id}>{s.shortCode} — {s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Time */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Time (Military 24h)
                      </label>
                      <input
                        type="text"
                        value={task.time}
                        onChange={e => handleUpdateDraft(task.id, { time: e.target.value })}
                        aria-invalid={draftTimeErrors.has(task.id)}
                        className={`w-full px-2.5 py-1.5 bg-white border rounded-lg text-xs font-mono font-bold ${draftTimeErrors.has(task.id) ? 'border-red-400' : 'border-slate-300'}`}
                        placeholder="0800"
                      />
                    </div>

                    {/* Instructions */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                        Instructions
                      </label>
                      <input
                        type="text"
                        value={task.instructions}
                        onChange={e => handleUpdateDraft(task.id, { instructions: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                        placeholder="Special resident instructions..."
                      />
                    </div>
                  </div>

                  {draftTimeErrors.has(task.id) && (
                    <p className="flex items-start space-x-1.5 text-[11px] font-semibold text-red-700" role="alert">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{draftTimeErrors.get(task.id)}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAll}
                disabled={draftTimeErrors.size > 0 || (isResidentCarePaused(resident.status) && !allowPausedResidentCare)}
                className="px-6 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-md flex items-center space-x-1.5 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Save {draftTasks.length} Care Routines to {resident.firstName}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
