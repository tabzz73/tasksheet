import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, 
  ClipboardList, 
  UserPlus, 
  Info, 
  Bandage, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Calendar, 
  Check, 
  Sparkles,
  ArrowLeft,
  Filter,
  Plus,
  Edit3,
  Copy,
  AlertTriangle
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { db } from '../../db';
import { 
  Resident, 
  Shift, 
  Role, 
  CatalogTaskTemplate, 
  UnitTaskTemplate, 
  RecurrenceFrequency, 
  ResidentTask,
  UnitTask,
  Wound,
  FYI,
  TaskPriority,
  FYICategory,
  RecurrenceRule,
  TaskAttentionConfig,
  TaskAttentionIndicator,
  MealRelation
} from '../../types';
import { RecurrenceSelector } from '../common/RecurrenceSelector';
import { detectAttentionIndicators, getIndicatorBadgeDetails } from '../../services/attention';
import { TaskAttentionBadges } from '../common/TaskAttentionBadges';
import { isTimeWithinShift, parseMilitaryTime } from '../../services/scheduling/timeWindow';
import { filterCatalogTasks, getCommonCatalogTasks, getRoleCatalogTasks } from '../../services/catalogDiscovery';
import { DEFAULT_CARE_TIMING_PRESETS } from '../../data/defaultData';
import { choosePreferredTimingPreset, getCareTimingPresetKind, getInShiftTimingPresets } from '../../services/careTiming';

export type AddEntityType = 'care_task' | 'unit_task' | 'resident' | 'fyi' | 'wound';
export type FormMode = 'add' | 'edit' | 'duplicate';

interface GlobalAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: FormMode;
  initialType?: AddEntityType;
  initialResidentTask?: ResidentTask | null;
  initialUnitTask?: UnitTask | null;
  initialWound?: Wound | null;
  initialFYI?: FYI | null;
  contextResidentId?: string;
  contextShiftId?: string;
  onSuccess?: () => void;
}

export const GlobalAddModal: React.FC<GlobalAddModalProps> = ({
  isOpen,
  onClose,
  mode = 'add',
  initialType,
  initialResidentTask,
  initialUnitTask,
  initialWound,
  initialFYI,
  contextResidentId,
  contextShiftId,
  onSuccess
}) => {
  const [selectedType, setSelectedType] = useState<AddEntityType | null>(
    initialType || (initialResidentTask ? 'care_task' : initialUnitTask ? 'unit_task' : initialWound ? 'wound' : initialFYI ? 'fyi' : null)
  );

  // Database state
  const state = db.getState();
  const residents = state.residents.filter(r => r.status !== 'deceased');
  const shifts = state.shifts;
  const roles = state.roles;
  const catalogTemplates = state.catalogTaskTemplates.filter(t => t.isActive !== false);
  const categories = state.catalogCategories;
  const unitTemplates = state.unitTaskTemplates.filter(u => u.isActive !== false);

  // Context-aware prefill
  const [residentId, setResidentId] = useState<string>('');
  const [shiftId, setShiftId] = useState<string>('');
  const [roleId, setRoleId] = useState<string>('');

  // Form State: Care Task
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [pickerTab, setPickerTab] = useState<'common' | 'search' | 'custom'>('common');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState('AM Care');
  const [taskTemplateSlug, setTaskTemplateSlug] = useState<string | undefined>(undefined);
  const [taskTime, setTaskTime] = useState('0800');
  const [isNoSpecificTime, setIsNoSpecificTime] = useState(false);
  const [taskFrequency, setTaskFrequency] = useState<RecurrenceFrequency>('daily');
  const [taskRecurrenceRule, setTaskRecurrenceRule] = useState<RecurrenceRule | undefined>(undefined);
  const [taskAttentionConfig, setTaskAttentionConfig] = useState<TaskAttentionConfig | undefined>(undefined);
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('normal');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form State: Unit Task
  const [unitTitle, setUnitTitle] = useState('');
  const [unitCategory, setUnitCategory] = useState('Start of Shift');
  const [unitShiftPhase, setUnitShiftPhase] = useState<'start' | 'during' | 'end'>('start');
  const [unitTime, setUnitTime] = useState('0715');
  const [unitFrequency, setUnitFrequency] = useState<RecurrenceFrequency>('daily');
  const [unitResultType, setUnitResultType] = useState<any>('confirmation');
  const [unitInstructions, setUnitInstructions] = useState('');

  // Form State: Resident
  const [resFirstName, setResFirstName] = useState('');
  const [resLastName, setResLastName] = useState('');
  const [resRoomNumber, setResRoomNumber] = useState('');
  const [resNotes, setResNotes] = useState('');

  // Form State: FYI
  const [fyiText, setFyiText] = useState('');
  const [fyiCategory, setFyiCategory] = useState<FYICategory>('preference');
  const [fyiImportance, setFyiImportance] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [fyiScope, setFyiScope] = useState<'resident' | 'shared'>('resident');
  const [fyiRoleId, setFyiRoleId] = useState<string>('');

  // Form State: Wound
  const [woundSiteLocation, setWoundSiteLocation] = useState('');
  const [woundFirstAction, setWoundFirstAction] = useState<'treatment' | 'assessment' | 'dressing_change'>('treatment');
  const [woundFrequency, setWoundFrequency] = useState<RecurrenceFrequency>('daily');
  const [woundBathingRelation, setWoundBathingRelation] = useState<'independent' | 'before_bath' | 'after_bath' | 'separate_day'>('independent');
  const [woundInstructions, setWoundInstructions] = useState('');

  // When shift is selected or changes, derive role automatically
  useEffect(() => {
    if (shiftId) {
      const shift = shifts.find(s => s.id === shiftId);
      if (shift) {
        setRoleId(shift.roleId);
      }
    }
  }, [shiftId, shifts]);

  useEffect(() => {
    setSelectedCategoryFilter('ALL');
  }, [shiftId]);

  // Reset or initialize on open / prop changes
  useEffect(() => {
    if (isOpen) {
      if (initialResidentTask) {
        setSelectedType('care_task');
        setResidentId(initialResidentTask.residentId);
        setShiftId(initialResidentTask.shiftId || '');
        setRoleId(initialResidentTask.roleId || '');
        setTaskTitle(initialResidentTask.title);
        setTaskCategory(initialResidentTask.category);
        setTaskTemplateSlug(initialResidentTask.templateSlug);
        setTaskTime(initialResidentTask.time || '0800');
        setIsNoSpecificTime(!!initialResidentTask.isNoSpecificTime);
        setTaskFrequency(initialResidentTask.frequency);
        setTaskRecurrenceRule(initialResidentTask.recurrenceRule);
        setTaskAttentionConfig(initialResidentTask.attentionConfig);
        setTaskInstructions(initialResidentTask.instructions || '');
        setTaskPriority(initialResidentTask.priority || 'normal');
      } else if (initialUnitTask) {
        setSelectedType('unit_task');
        setShiftId(initialUnitTask.shiftId);
        setRoleId(initialUnitTask.roleId || '');
        setUnitTitle(initialUnitTask.title);
        setUnitCategory(initialUnitTask.category);
        setUnitShiftPhase(initialUnitTask.shiftPhase);
        setUnitTime(initialUnitTask.time || '0715');
        setUnitFrequency(initialUnitTask.frequency);
        setUnitResultType(initialUnitTask.resultType);
        setUnitInstructions(initialUnitTask.instructions || '');
      } else if (initialWound) {
        setSelectedType('wound');
        setResidentId(initialWound.residentId);
        setWoundSiteLocation(initialWound.siteLocation);
        setWoundFirstAction(initialWound.firstAction);
        setWoundFrequency(initialWound.frequency);
        setWoundBathingRelation(initialWound.bathingRelation);
        setWoundInstructions(initialWound.instructions || '');
      } else if (initialFYI) {
        setSelectedType('fyi');
        setResidentId(initialFYI.residentId || '');
        setFyiScope(initialFYI.residentId ? 'resident' : 'shared');
        setFyiText(initialFYI.text);
        setFyiCategory(initialFYI.category);
        setFyiImportance(initialFYI.importance);
        setFyiRoleId(initialFYI.roleId || '');
        setShiftId(initialFYI.shiftId || '');
      } else {
        if (initialType) {
          setSelectedType(initialType);
        } else if (contextResidentId && contextShiftId) {
          setSelectedType('care_task');
        } else {
          setSelectedType(initialType || null);
        }

        setResidentId(contextResidentId || (residents.length > 0 ? residents[0].id : ''));
        const defaultShift = contextShiftId || (shifts.length > 0 ? shifts[0].id : '');
        setShiftId(defaultShift);
        if (defaultShift) {
          const s = shifts.find(item => item.id === defaultShift);
          if (s) setRoleId(s.roleId);
        }

        // Reset inputs
        setTaskTitle('');
        setTaskSearchQuery('');
        setSelectedCategoryFilter('ALL');
        setPickerTab('common');
        setTaskTemplateSlug(undefined);
        setTaskTime('0800');
        setIsNoSpecificTime(false);
        setTaskFrequency('daily');
        setTaskInstructions('');
        setTaskPriority('normal');
        setUnitTitle('');
        setUnitInstructions('');
        setResFirstName('');
        setResLastName('');
        setResRoomNumber('');
        setResNotes('');
        setFyiText('');
        setWoundSiteLocation('');
        setWoundInstructions('');
      }
    }
  }, [isOpen, initialType, initialResidentTask, initialUnitTask, initialWound, initialFYI, contextResidentId, contextShiftId, mode]);

  const currentShiftObj = shifts.find(s => s.id === shiftId);
  const currentRoleObj = roles.find(r => r.id === (roleId || currentShiftObj?.roleId));
  const currentRoleCode = currentRoleObj?.code || 'HCA';

  const getShiftTimeError = (time: string): string | null => {
    if (!currentShiftObj) return null;
    if (parseMilitaryTime(time) === null) {
      return `“${time || 'blank'}” is not a valid 24-hour time. Enter a time such as 0715.`;
    }
    if (!isTimeWithinShift(time, currentShiftObj.startTime, currentShiftObj.endTime)) {
      return `${time} is outside ${currentShiftObj.shortCode || currentShiftObj.name} (${currentShiftObj.startTime}–${currentShiftObj.endTime}). Choose another time or shift.`;
    }
    return null;
  };

  const careTaskTimeError = isNoSpecificTime ? null : getShiftTimeError(taskTime);
  const unitTaskTimeError = getShiftTimeError(unitTime);

  // Role-Aware Filtered Catalog Tasks
  const roleCatalogTasks = getRoleCatalogTasks(catalogTemplates, currentRoleCode);
  const filteredCatalogTasks = filterCatalogTasks(
    roleCatalogTasks,
    categories,
    taskSearchQuery,
    selectedCategoryFilter,
  );
  const commonTemplates = getCommonCatalogTasks(roleCatalogTasks);
  const selectedCatalogTemplate = catalogTemplates.find(t => t.slug === taskTemplateSlug);
  const timingPresetKind = getCareTimingPresetKind(selectedCatalogTemplate, taskCategory, taskTitle);
  const configuredTimingPresets = state.settings.careTimingPresets || DEFAULT_CARE_TIMING_PRESETS;
  const availableTimingPresets = getInShiftTimingPresets(
    timingPresetKind === 'medication'
      ? configuredTimingPresets.medicationTimes
      : timingPresetKind === 'meal'
        ? configuredTimingPresets.mealTimes
        : [],
    currentShiftObj?.startTime,
    currentShiftObj?.endTime,
  );

  const selectCatalogTemplate = (t: CatalogTaskTemplate) => {
    setTaskTitle(t.title);
    setTaskTemplateSlug(t.slug);
    const cat = state.catalogCategories.find(c => c.id === t.categoryId);
    const presetKind = getCareTimingPresetKind(t, cat?.name || '', t.title);
    const configured = state.settings.careTimingPresets || DEFAULT_CARE_TIMING_PRESETS;
    const eligiblePresets = getInShiftTimingPresets(
      presetKind === 'medication' ? configured.medicationTimes : presetKind === 'meal' ? configured.mealTimes : [],
      currentShiftObj?.startTime,
      currentShiftObj?.endTime,
    );
    const preferredPreset = choosePreferredTimingPreset(eligiblePresets, t);
    if (preferredPreset) setTaskTime(preferredPreset.time);
    else if (t.defaultTime) setTaskTime(t.defaultTime);
    if (t.defaultFrequency) setTaskFrequency(t.defaultFrequency);
    setTaskInstructions(t.defaultInstructions || t.description || '');
    setTaskAttentionConfig(t.attentionConfig);
    if (cat) setTaskCategory(cat.name);
    setTaskSearchQuery('');
  };

  const selectUnitTemplate = (u: UnitTaskTemplate) => {
    setUnitTitle(u.title);
    setUnitShiftPhase(u.shiftPhase);
    if (u.defaultTime) setUnitTime(u.defaultTime);
    if (u.resultType) setUnitResultType(u.resultType);
    if (u.defaultInstructions) setUnitInstructions(u.defaultInstructions);
  };

  // Submission Handlers
  const handleSaveCareTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !residentId || careTaskTimeError) return;

    if (mode === 'edit' && initialResidentTask) {
      db.updateResidentTask(initialResidentTask.id, {
        residentId,
        shiftId: shiftId || undefined,
        roleId: roleId || undefined,
        templateSlug: taskTemplateSlug,
        title: taskTitle.trim(),
        category: taskCategory,
        time: isNoSpecificTime ? undefined : taskTime,
        isNoSpecificTime,
        frequency: taskFrequency,
        recurrenceRule: taskRecurrenceRule,
        attentionConfig: taskAttentionConfig,
        instructions: taskInstructions.trim() || undefined,
        priority: taskPriority
      });
    } else {
      // Check if identical active task already exists on resident
      const existingMatch = state.residentTasks.find(t =>
        t.residentId === residentId &&
        t.isActive !== false && (
          (taskTemplateSlug && t.templateSlug === taskTemplateSlug && (isNoSpecificTime || t.time === taskTime)) ||
          (t.title.trim().toLowerCase() === taskTitle.trim().toLowerCase() && (isNoSpecificTime || t.time === taskTime))
        )
      );

      if (existingMatch) {
        // Update existing task rather than creating duplicate
        db.updateResidentTask(existingMatch.id, {
          shiftId: shiftId || existingMatch.shiftId,
          roleId: roleId || existingMatch.roleId,
          templateSlug: taskTemplateSlug || existingMatch.templateSlug,
          title: taskTitle.trim(),
          category: taskCategory,
          time: isNoSpecificTime ? undefined : taskTime,
          isNoSpecificTime,
          frequency: taskFrequency,
          recurrenceRule: taskRecurrenceRule,
          attentionConfig: taskAttentionConfig,
          instructions: taskInstructions.trim() || undefined,
          priority: taskPriority
        });
      } else {
        db.addResidentTask({
          residentId,
          shiftId: shiftId || undefined,
          roleId: roleId || undefined,
          templateSlug: taskTemplateSlug,
          title: taskTitle.trim(),
          category: taskCategory,
          time: isNoSpecificTime ? undefined : taskTime,
          isNoSpecificTime,
          frequency: taskFrequency,
          recurrenceRule: taskRecurrenceRule,
          attentionConfig: taskAttentionConfig,
          instructions: taskInstructions.trim() || undefined,
          priority: taskPriority
        });
      }
    }

    onSuccess?.();
    onClose();
  };

  const handleSaveUnitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle.trim() || !shiftId || unitTaskTimeError) return;

    if (mode === 'edit' && initialUnitTask) {
      db.updateUnitTask(initialUnitTask.id, {
        shiftId,
        roleId: roleId || undefined,
        title: unitTitle.trim(),
        category: unitCategory,
        shiftPhase: unitShiftPhase,
        time: unitTime,
        frequency: unitFrequency,
        resultType: unitResultType,
        instructions: unitInstructions.trim() || undefined
      });
    } else {
      db.addUnitTask({
        shiftId,
        roleId: roleId || undefined,
        title: unitTitle.trim(),
        category: unitCategory,
        shiftPhase: unitShiftPhase,
        time: unitTime,
        frequency: unitFrequency,
        resultType: unitResultType,
        instructions: unitInstructions.trim() || undefined
      });
    }

    onSuccess?.();
    onClose();
  };

  const handleAddResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resFirstName.trim() || !resLastName.trim() || !resRoomNumber.trim()) return;

    const newRes = db.addResident({
      firstName: resFirstName.trim(),
      lastName: resLastName.trim(),
      roomNumber: resRoomNumber.trim(),
      status: 'active',
      notes: resNotes.trim() || undefined
    });

    setResidentId(newRes.id);
    onSuccess?.();
    onClose();
  };

  const handleAddFYI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fyiText.trim()) return;

    if (mode === 'edit' && initialFYI) {
      db.updateFYI(initialFYI.id, {
        residentId: fyiScope === 'resident' && residentId ? residentId : undefined,
        roleId: fyiRoleId || undefined,
        shiftId: shiftId || undefined,
        text: fyiText.trim(),
        category: fyiCategory,
        importance: fyiImportance
      });
    } else {
      db.addFYI({
        residentId: fyiScope === 'resident' && residentId ? residentId : undefined,
        roleId: fyiRoleId || undefined,
        shiftId: shiftId || undefined,
        text: fyiText.trim(),
        category: fyiCategory,
        importance: fyiImportance,
        effectiveDate: new Date().toISOString().split('T')[0]
      });
    }

    onSuccess?.();
    onClose();
  };

  const handleAddWound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woundSiteLocation.trim() || !residentId) return;

    if (mode === 'edit' && initialWound) {
      db.updateWound(initialWound.id, {
        residentId,
        siteLocation: woundSiteLocation.trim(),
        firstAction: woundFirstAction,
        frequency: woundFrequency,
        bathingRelation: woundBathingRelation,
        instructions: woundInstructions.trim() || undefined
      });
    } else {
      db.addWound({
        residentId,
        siteLocation: woundSiteLocation.trim(),
        status: 'active',
        firstAction: woundFirstAction,
        frequency: woundFrequency,
        bathingRelation: woundBathingRelation,
        instructions: woundInstructions.trim() || undefined
      });
    }

    onSuccess?.();
    onClose();
  };

  const currentResidentObj = residents.find(r => r.id === residentId);

  const daysLabels = [
    { day: 1, label: 'M' },
    { day: 2, label: 'T' },
    { day: 3, label: 'W' },
    { day: 4, label: 'T' },
    { day: 5, label: 'F' },
    { day: 6, label: 'S' },
    { day: 0, label: 'S' },
  ];

  const effectiveType = selectedType || (initialResidentTask ? 'care_task' : initialUnitTask ? 'unit_task' : initialWound ? 'wound' : initialFYI ? 'fyi' : undefined);
  const modalTitle = mode === 'edit'
    ? (effectiveType === 'care_task' ? 'Edit Care Task' : effectiveType === 'unit_task' ? 'Edit Unit Task' : effectiveType === 'wound' ? 'Edit Wound Protocol' : effectiveType === 'fyi' ? 'Edit FYI Note' : 'Edit')
    : mode === 'duplicate'
    ? (effectiveType === 'care_task' ? 'Duplicate Care Task' : effectiveType === 'unit_task' ? 'Duplicate Unit Task' : 'Duplicate')
    : effectiveType
    ? `Add ${effectiveType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`
    : "What do you want to add?";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={
        selectedType && (currentResidentObj || currentShiftObj)
          ? `${currentResidentObj ? `Room ${currentResidentObj.roomNumber} — ${currentResidentObj.firstName} ${currentResidentObj.lastName}` : ''} ${currentResidentObj && currentShiftObj ? ' · ' : ''} ${currentShiftObj ? `${currentShiftObj.name} (${currentShiftObj.startTime}–${currentShiftObj.endTime})` : ''}`
          : "Select what you need to record for the team"
      }
      maxWidth="2xl"
    >
      {/* 1. SELECTION SCREEN */}
      {!selectedType && mode === 'add' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          <button
            type="button"
            onClick={() => setSelectedType('care_task')}
            className="flex items-start p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left group cursor-pointer"
          >
            <div className="p-3 bg-teal-100 text-teal-700 rounded-lg group-hover:bg-teal-600 group-hover:text-white transition-colors">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div className="ml-3.5">
              <h4 className="font-semibold text-slate-900 group-hover:text-teal-900">Care Task</h4>
              <p className="text-xs text-slate-500 mt-1">Resident-specific care assignment, vitals, BG check, MAP, or hygiene.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('unit_task')}
            className="flex items-start p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left group cursor-pointer"
          >
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div className="ml-3.5">
              <h4 className="font-semibold text-slate-900 group-hover:text-blue-900">Unit Task</h4>
              <p className="text-xs text-slate-500 mt-1">Shift & role routines, fridge temperature, narcotic count, or safety checks.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('resident')}
            className="flex items-start p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left group cursor-pointer"
          >
            <div className="p-3 bg-purple-100 text-purple-700 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="ml-3.5">
              <h4 className="font-semibold text-slate-900 group-hover:text-purple-900">Resident</h4>
              <p className="text-xs text-slate-500 mt-1">Add a new resident and room to the facility directory.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('fyi')}
            className="flex items-start p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left group cursor-pointer"
          >
            <div className="p-3 bg-amber-100 text-amber-700 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Info className="w-6 h-6" />
            </div>
            <div className="ml-3.5">
              <h4 className="font-semibold text-slate-900 group-hover:text-amber-900">FYI / Standing Info</h4>
              <p className="text-xs text-slate-500 mt-1">Information staff need to know without marking as a task row.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('wound')}
            className="flex items-start p-4 rounded-xl border-2 border-slate-200 hover:border-teal-500 hover:bg-teal-50/50 transition-all text-left group sm:col-span-2 cursor-pointer"
          >
            <div className="p-3 bg-rose-100 text-rose-700 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <Bandage className="w-6 h-6" />
            </div>
            <div className="ml-3.5">
              <h4 className="font-semibold text-slate-900 group-hover:text-rose-900">Wound Protocol</h4>
              <p className="text-xs text-slate-500 mt-1">Track site, dressing changes, treatment schedule, and bathing relations.</p>
            </div>
          </button>
        </div>
      )}

      {/* 2. CARE TASK FORM (Shared for Add, Edit, Duplicate) */}
      {selectedType === 'care_task' && (
        <form onSubmit={handleSaveCareTask} className="space-y-4">
          {!initialType && mode === 'add' && !(contextResidentId && contextShiftId) && (
            <button
              type="button"
              onClick={() => setSelectedType(null)}
              className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
            </button>
          )}

          {/* Context Banner */}
          {currentResidentObj && currentShiftObj && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex items-center justify-between text-xs text-teal-900 font-medium">
              <div>
                <span className="font-bold">Room {currentResidentObj?.roomNumber} — {currentResidentObj?.firstName} {currentResidentObj?.lastName}</span>
                <span className="mx-2">·</span>
                <span>{currentShiftObj?.shortCode ? `${currentShiftObj.shortCode} — ` : ''}{currentShiftObj?.name} ({currentShiftObj?.startTime}–{currentShiftObj?.endTime})</span>
              </div>
              <span className="px-2 py-0.5 bg-teal-200/80 rounded font-semibold">{currentRoleObj?.name}</span>
            </div>
          )}

          {/* Resident Picker (if not in context or in edit/duplicate mode where change is supported) */}
          {(!contextResidentId || mode === 'duplicate') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Resident <span className="text-red-500">*</span>
              </label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select resident or room...</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} — {r.lastName}, {r.firstName} ({r.status.replace('_', ' ')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Shift Picker */}
          {(!contextShiftId || mode === 'duplicate' || mode === 'edit') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Shift
              </label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="">All Shifts / Role Default</option>
                {shifts.map(s => {
                  const r = roles.find(role => role.id === s.roleId);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.shortCode ? `${s.shortCode} — ` : ''}{s.name} ({s.startTime}–{s.endTime} · {r?.name})
                    </option>
                  );
                })}
              </select>
              {mode === 'edit' && shiftId !== initialResidentTask?.shiftId && (
                <p className="text-[11px] text-amber-700 font-medium mt-1">
                  Notice: Moving to another shift will apply to future generated assignments.
                </p>
              )}
            </div>
          )}

          {/* What needs to be done? (Role-Aware Search + Optional Category Filter) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                What needs to be done? <span className="text-red-500">*</span>
              </label>
              {mode === 'add' && (
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPickerTab('common')}
                    className={`px-2 py-0.5 rounded font-medium ${pickerTab === 'common' ? 'bg-teal-100 text-teal-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Common
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerTab('search')}
                    className={`px-2 py-0.5 rounded font-medium ${pickerTab === 'search' ? 'bg-teal-100 text-teal-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Search All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTab('custom');
                      setTaskTemplateSlug(undefined);
                    }}
                    className={`px-2 py-0.5 rounded font-medium ${pickerTab === 'custom' ? 'bg-teal-100 text-teal-800 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    + Custom Task
                  </button>
                </div>
              )}
            </div>

            {/* Optional Category Quick Filter Pill Bar (in Add mode) */}
            {mode === 'add' && (
              <div className="mb-2 flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-slate-400 font-medium flex items-center">
                  <Filter className="w-3 h-3 mr-0.5" /> Domain:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-2 py-0.5 rounded-full whitespace-nowrap ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  All Care
                </button>
                {categories.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(c.id)}
                    className={`px-2 py-0.5 rounded-full whitespace-nowrap ${
                      selectedCategoryFilter === c.id
                        ? 'bg-teal-700 text-white font-bold'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => {
                  setTaskTitle(e.target.value);
                  setTaskSearchQuery(e.target.value);
                }}
                placeholder={`Search ${currentRoleCode} catalog (e.g. MAP, shower, BG check, vitals, transfer)...`}
                required
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Suggestions / Common Pickers */}
            {mode === 'add' && pickerTab === 'common' && !taskSearchQuery && (
              <div className="mt-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {commonTemplates.map(t => (
                    <button
                      key={t.slug}
                      type="button"
                      onClick={() => selectCatalogTemplate(t)}
                      className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-teal-100 hover:text-teal-900 text-slate-700 rounded-md transition-colors font-medium text-left"
                    >
                      + {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'add' && taskSearchQuery && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-sm divide-y divide-slate-100 text-xs">
                {filteredCatalogTasks.slice(0, 10).map(t => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => selectCatalogTemplate(t)}
                    className="w-full px-3 py-2 text-left hover:bg-teal-50 flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 group-hover:text-teal-900">{t.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{t.defaultInstructions || t.description}</div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 group-hover:bg-teal-200 group-hover:text-teal-900">
                      {t.roleCode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Scheduled Time (Military 24h)
              </label>
              <label className="flex items-center space-x-1 text-[11px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNoSpecificTime}
                  onChange={(e) => setIsNoSpecificTime(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-3 h-3"
                />
                <span>No time / flexible</span>
              </label>
            </div>
            <input
              type="text"
              disabled={isNoSpecificTime}
              value={taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
              placeholder="0800"
              aria-invalid={!!careTaskTimeError}
              className={`w-full sm:w-48 px-3.5 py-2.5 bg-white disabled:bg-slate-100 border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 tabular-nums font-mono font-bold ${careTaskTimeError ? 'border-red-400' : 'border-slate-300'}`}
            />
            {timingPresetKind && !isNoSpecificTime && (
              <div className="mt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Facility {timingPresetKind === 'medication' ? 'medication' : 'meal'} times
                </p>
                {availableTimingPresets.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {availableTimingPresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setTaskTime(preset.time)}
                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors ${
                          taskTime === preset.time
                            ? 'border-teal-600 bg-teal-50 text-teal-900 ring-1 ring-teal-200'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50'
                        }`}
                      >
                        {preset.label} <span className="font-mono">{preset.time}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-amber-700">No active preset falls inside this shift. Enter a valid time manually or update Care Timing Presets in Settings.</p>
                )}
              </div>
            )}
            {careTaskTimeError && (
              <p className="mt-1.5 flex items-start space-x-1.5 text-xs font-semibold text-red-700" role="alert">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{careTaskTimeError}</span>
              </p>
            )}
          </div>

          {/* Recurrence & Frequency Selector */}
          <div className="pt-2 border-t border-slate-100">
            <RecurrenceSelector
              value={taskRecurrenceRule}
              frequency={taskFrequency}
              onChange={(newRule, newFreq) => {
                setTaskRecurrenceRule(newRule);
                setTaskFrequency(newFreq);
              }}
            />
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={taskInstructions}
              onChange={(e) => setTaskInstructions(e.target.value)}
              placeholder="e.g. Fasting check before breakfast; notify nurse if BG < 4.0..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            />
            {taskTemplateSlug && (
              <p className="mt-1 text-[11px] text-slate-500">Pre-filled from the task catalog. Edit these instructions for this resident as needed.</p>
            )}
          </div>

          {/* Smart Attention Suggestions Banner */}
          {(() => {
            if (state.settings.smartSuggestionsEnabled === false) return null;
            const detection = detectAttentionIndicators(taskTitle, taskInstructions, state.settings.attentionRules);
            const activeSet = new Set(taskAttentionConfig?.indicators || []);
            const unappliedSuggestions = detection.suggestedIndicators.filter(ind => !activeSet.has(ind));

            if (unappliedSuggestions.length === 0 && activeSet.size === 0) return null;

            return (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-amber-900">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Task Attention & Safety Indicators</span>
                  </div>

                  {unappliedSuggestions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const merged = Array.from(new Set([...Array.from(activeSet), ...unappliedSuggestions]));
                        setTaskAttentionConfig({
                          ...taskAttentionConfig,
                          indicators: merged,
                          mealRelation: taskAttentionConfig?.mealRelation || detection.mealRelation,
                          equipmentNote: taskAttentionConfig?.equipmentNote || detection.equipmentNote,
                          docRefNote: taskAttentionConfig?.docRefNote || detection.docRefNote,
                          metadata: [
                            ...(taskAttentionConfig?.metadata || []),
                            ...detection.metadata.filter(m => unappliedSuggestions.includes(m.indicator))
                          ]
                        });
                      }}
                      className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline"
                    >
                      + Apply All Suggestions ({unappliedSuggestions.length})
                    </button>
                  )}
                </div>

                {/* Active Badges */}
                {activeSet.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Active:</span>
                    {Array.from(activeSet).map(ind => {
                      const d = getIndicatorBadgeDetails(ind, taskAttentionConfig?.mealRelation);
                      return (
                        <button
                          key={ind}
                          type="button"
                          onClick={() => {
                            const next = Array.from(activeSet).filter(x => x !== ind);
                            setTaskAttentionConfig({
                              ...taskAttentionConfig,
                              indicators: next.length > 0 ? next : undefined,
                            });
                          }}
                          className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded border text-[11px] font-mono font-bold ${d.badgeBg} ${d.badgeText} ${d.badgeBorder} hover:opacity-75`}
                          title="Click to remove indicator"
                        >
                          <span>[{d.shortAbbreviation}] {d.label}</span>
                          <span className="text-[10px] font-sans ml-1 text-slate-400">×</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Unapplied Suggestions */}
                {unappliedSuggestions.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-amber-200/60">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-amber-700 uppercase mr-1">Suggested:</span>
                      {unappliedSuggestions.map(ind => {
                        const d = getIndicatorBadgeDetails(ind, detection.mealRelation);
                        return (
                          <button
                            key={ind}
                            type="button"
                            onClick={() => {
                              const next = [...Array.from(activeSet), ind];
                              setTaskAttentionConfig({
                                ...taskAttentionConfig,
                                indicators: next,
                                mealRelation: taskAttentionConfig?.mealRelation || detection.mealRelation,
                                equipmentNote: taskAttentionConfig?.equipmentNote || detection.equipmentNote,
                                docRefNote: taskAttentionConfig?.docRefNote || detection.docRefNote,
                                metadata: [
                                  ...(taskAttentionConfig?.metadata || []),
                                  ...detection.metadata.filter(m => m.indicator === ind)
                                ]
                              });
                            }}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border border-dashed border-amber-400 bg-white text-amber-900 text-[11px] font-bold hover:bg-amber-100 transition-colors"
                          >
                            <span>+ [{d.shortAbbreviation}] {d.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-amber-700 italic">
                      Detected from wording in task title and instructions. Click to apply.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Progressive Disclosure: Advanced Options */}
          <div className="border-t border-slate-200 pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">Priority:</span>
                  <div className="flex items-center space-x-2">
                    {(['normal', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTaskPriority(p)}
                        className={`px-2.5 py-1 rounded capitalize font-medium ${
                          taskPriority === p
                            ? 'bg-teal-700 text-white font-bold'
                            : 'bg-white border border-slate-300 text-slate-600'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Attention Indicators Selector */}
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <span className="font-bold text-slate-700 block">Manual Attention & Safety Flags:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      'HIGH_ALERT', 
                      'TIME_CRITICAL', 
                      'MEAL_LINKED', 
                      'TWO_PERSON', 
                      'FOLLOW_UP', 
                      'OBSERVE', 
                      'PRECAUTION', 
                      'EQUIPMENT', 
                      'DOC_REF'
                    ] as TaskAttentionIndicator[]).map(ind => {
                      const d = getIndicatorBadgeDetails(ind, taskAttentionConfig?.mealRelation);
                      const isChecked = taskAttentionConfig?.indicators?.includes(ind) || false;

                      return (
                        <label key={ind} className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-800">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const current = taskAttentionConfig?.indicators || [];
                              const next = isChecked ? current.filter(x => x !== ind) : [...current, ind];
                              setTaskAttentionConfig({
                                ...taskAttentionConfig,
                                indicators: next.length > 0 ? next : undefined,
                                metadata: isChecked 
                                  ? taskAttentionConfig?.metadata?.filter(m => m.indicator !== ind)
                                  : [...(taskAttentionConfig?.metadata || []), { indicator: ind, reason: 'Manually assigned by supervisor', source: 'user_override' }]
                              });
                            }}
                            className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                          />
                          <span>[{d.shortAbbreviation}] {d.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!careTaskTimeError}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
            >
              {mode === 'edit' ? 'Save Changes' : mode === 'duplicate' ? 'Create Duplicate' : 'Add Task'}
            </button>
          </div>
        </form>
      )}

      {/* 3. UNIT TASK FORM (Shared for Add, Edit, Duplicate) */}
      {selectedType === 'unit_task' && (
        <form onSubmit={handleSaveUnitTask} className="space-y-4">
          {!initialType && mode === 'add' && (
            <button
              type="button"
              onClick={() => setSelectedType(null)}
              className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
            </button>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Shift <span className="text-red-500">*</span>
            </label>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            >
              {shifts.map(s => {
                const r = roles.find(role => role.id === s.roleId);
                return (
                  <option key={s.id} value={s.id}>
                    {s.shortCode ? `${s.shortCode} — ` : ''}{s.name} ({s.startTime}–{s.endTime} · {r?.name})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              What needs to be done? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
              placeholder="e.g. Medication Fridge Temperature, Controlled Count..."
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            />

            {mode === 'add' && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-slate-400 self-center mr-1">Templates:</span>
                {unitTemplates.map(u => (
                  <button
                    key={u.slug}
                    type="button"
                    onClick={() => selectUnitTemplate(u)}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-blue-100 text-slate-700 hover:text-blue-800 rounded-md transition-colors"
                  >
                    + {u.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                When in shift?
              </label>
              <select
                value={unitShiftPhase}
                onChange={(e) => setUnitShiftPhase(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="start">Start of Shift (Routines & Safety)</option>
                <option value="during">During Shift (Routines & Restock)</option>
                <option value="end">End of Shift (Handoff & Count)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Time (Military 24h)
              </label>
              <input
                type="text"
                value={unitTime}
                onChange={(e) => setUnitTime(e.target.value)}
                placeholder="0715"
                aria-invalid={!!unitTaskTimeError}
                className={`w-full px-3.5 py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-teal-500 font-mono tabular-nums ${unitTaskTimeError ? 'border-red-400' : 'border-slate-300'}`}
              />
            </div>
          </div>

          {unitTaskTimeError && (
            <p className="flex items-start space-x-1.5 text-xs font-semibold text-red-700" role="alert">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{unitTaskTimeError}</span>
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              How often?
            </label>
            <select
              value={unitFrequency}
              onChange={(e) => setUnitFrequency(e.target.value as RecurrenceFrequency)}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            >
              <option value="daily">Daily</option>
              <option value="selected_days">Selected Days of Week</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={unitInstructions}
              onChange={(e) => setUnitInstructions(e.target.value)}
              placeholder="e.g. Check emergency seals intact; test backup suction..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!unitTaskTimeError}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
            >
              {mode === 'edit' ? 'Save Changes' : mode === 'duplicate' ? 'Create Duplicate' : 'Add Unit Task'}
            </button>
          </div>
        </form>
      )}

      {/* 4. RESIDENT FORM */}
      {selectedType === 'resident' && (
        <form onSubmit={handleAddResident} className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedType(null)}
            className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={resFirstName}
                onChange={(e) => setResFirstName(e.target.value)}
                placeholder="Arthur"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={resLastName}
                onChange={(e) => setResLastName(e.target.value)}
                placeholder="Pendleton"
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Room / Bed Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={resRoomNumber}
              onChange={(e) => setResRoomNumber(e.target.value)}
              placeholder="e.g. 101, 204B"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Resident Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={resNotes}
              onChange={(e) => setResNotes(e.target.value)}
              placeholder="e.g. Uses rollator walker; prefers morning care after breakfast..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
            >
              Add Resident
            </button>
          </div>
        </form>
      )}

      {/* 5. FYI FORM */}
      {selectedType === 'fyi' && (
        <form onSubmit={handleAddFYI} className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedType(null)}
            className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
          </button>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              FYI Standing Note / Instruction <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={fyiText}
              onChange={(e) => setFyiText(e.target.value)}
              placeholder="e.g. Son visits on Saturdays at 14:00 with diabetic treats; check BG before dinner."
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={fyiCategory}
                onChange={(e) => setFyiCategory(e.target.value as FYICategory)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="preference">Resident Preference</option>
                <option value="safety">Safety Alert</option>
                <option value="communication">Communication</option>
                <option value="protocol">Clinical Protocol</option>
                <option value="medical">Medical Update</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Importance
              </label>
              <select
                value={fyiImportance}
                onChange={(e) => setFyiImportance(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="normal">Normal</option>
                <option value="high">High (Highlighted)</option>
                <option value="urgent">Urgent Banner</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
            >
              {mode === 'edit' ? 'Save Changes' : 'Add FYI'}
            </button>
          </div>
        </form>
      )}

      {/* 6. WOUND PROTOCOL FORM */}
      {selectedType === 'wound' && (
        <form onSubmit={handleAddWound} className="space-y-4">
          <button
            type="button"
            onClick={() => setSelectedType(null)}
            className="inline-flex items-center text-xs text-slate-500 hover:text-slate-800 mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
          </button>

          {!contextResidentId && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Resident <span className="text-red-500">*</span>
              </label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Select resident...</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} — {r.lastName}, {r.firstName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Site Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={woundSiteLocation}
              onChange={(e) => setWoundSiteLocation(e.target.value)}
              placeholder="e.g. Left Lower Leg Venous Ulcer, Right Forearm Skin Tear"
              required
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Primary Action
              </label>
              <select
                value={woundFirstAction}
                onChange={(e) => setWoundFirstAction(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="treatment">Wound Treatment</option>
                <option value="dressing_change">Dressing Change</option>
                <option value="assessment">Wound Assessment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Bathing Relation
              </label>
              <select
                value={woundBathingRelation}
                onChange={(e) => setWoundBathingRelation(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm"
              >
                <option value="independent">Independent of Bathing</option>
                <option value="after_bath">Perform Immediately After Bath</option>
                <option value="before_bath">Perform Before Bath</option>
                <option value="separate_day">Separate Day from Bathing</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Wound Treatment Protocol / Dressing Instructions
            </label>
            <textarea
              rows={2}
              value={woundInstructions}
              onChange={(e) => setWoundInstructions(e.target.value)}
              placeholder="Cleanse with sterile NS, apply barrier film, cover with Mepilex Border..."
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-semibold shadow-md transition-colors"
            >
              {mode === 'edit' ? 'Save Changes' : 'Add Wound Protocol'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
