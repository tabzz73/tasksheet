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
  ResidentTrackingConfig,
  MealRelation,
  WoundSupplySelection,
  ResidentStatus,
  TaskTimingType,
  TaskServiceCoverage
} from '../../types';
import { RecurrenceSelector } from '../common/RecurrenceSelector';
import { detectAttentionIndicators, getIndicatorBadgeDetails } from '../../services/attention';
import { DomainConflictError, ValidationResult } from '../../services/validation';
import { ConflictNotice } from '../common/ConflictNotice';
import { TaskAttentionBadges } from '../common/TaskAttentionBadges';
import { filterCatalogTasks, getCommonCatalogTasks, getRoleCatalogTasks } from '../../services/catalogDiscovery';
import { DEFAULT_CARE_TIMING_PRESETS } from '../../data/defaultData';
import { choosePreferredTimingPreset, getCareTimingPresetKind, getInShiftTimingPresets } from '../../services/careTiming';
import { validateCareShiftSelection, validateTimedCareShift } from '../../services/scheduling/careShiftAssignment';
import { getResidentStatusLabel, isResidentCarePaused } from '../../services/residentStatus';
import { WoundSupplyPicker } from '../common/WoundSupplyPicker';
import { createCoverageSnapshot, getCoverageDefinitions, normalizeCoverage } from '../../services/coverage';
import { getTodayLocalDateString } from '../../services/recurrence';

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
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  // Database state
  const state = db.getState();
  const residents = state.residents.filter(r => r.status !== 'deceased');
  const occupiedPositionIds = new Set(state.residents.filter(r => r.occupancyPositionId && ['active', 'in_hospital', 'out_on_pass', 'on_hold'].includes(r.status)).map(r => r.occupancyPositionId));
  const availablePositions = state.occupancyPositions.filter(position => position.active !== false && !occupiedPositionIds.has(position.id));
  const shifts = state.shifts.filter(shift => shift.isActive !== false);
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
  const [taskTimingType, setTaskTimingType] = useState<TaskTimingType>('fixed');
  const [taskFrequency, setTaskFrequency] = useState<RecurrenceFrequency>('daily');
  const [taskRecurrenceRule, setTaskRecurrenceRule] = useState<RecurrenceRule | undefined>(undefined);
  const [taskAttentionConfig, setTaskAttentionConfig] = useState<TaskAttentionConfig | undefined>(undefined);
  const [taskTrackingConfig, setTaskTrackingConfig] = useState<ResidentTrackingConfig | undefined>(undefined);
  const [taskInstructions, setTaskInstructions] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('normal');
  const [coverageType, setCoverageType] = useState('FUNDED');
  const [coverageStartDate, setCoverageStartDate] = useState('');
  const [coverageEndDate, setCoverageEndDate] = useState('');
  const [coverageAdditional, setCoverageAdditional] = useState(false);
  const [coverageNote, setCoverageNote] = useState('');
  const [coverageChangeConfirmed, setCoverageChangeConfirmed] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [allowPausedResidentCare, setAllowPausedResidentCare] = useState(false);

  // Form State: Unit Task
  const [unitTitle, setUnitTitle] = useState('');
  const [unitCategory, setUnitCategory] = useState('Start of Shift');
  const [unitShiftPhase, setUnitShiftPhase] = useState<'start' | 'during' | 'end'>('start');
  const [unitTime, setUnitTime] = useState('0715');
  const [unitTimingType, setUnitTimingType] = useState<TaskTimingType>('fixed');
  const [unitFrequency, setUnitFrequency] = useState<RecurrenceFrequency>('daily');
  const [unitRecurrenceRule, setUnitRecurrenceRule] = useState<RecurrenceRule | undefined>(undefined);
  const [unitResultType, setUnitResultType] = useState<any>('confirmation');
  const [unitInstructions, setUnitInstructions] = useState('');

  // Form State: Resident
  const [resFirstName, setResFirstName] = useState('');
  const [resLastName, setResLastName] = useState('');
  const [resRoomNumber, setResRoomNumber] = useState('');
  const [resStatus, setResStatus] = useState<ResidentStatus>('active');
  const [resNotes, setResNotes] = useState('');
  const [residentSaveError, setResidentSaveError] = useState('');
  const [mutationConflict, setMutationConflict] = useState<ValidationResult | null>(null);

  // Form State: FYI
  const [fyiText, setFyiText] = useState('');
  const [fyiCategory, setFyiCategory] = useState<FYICategory>('preference');
  const [fyiImportance, setFyiImportance] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [fyiScope, setFyiScope] = useState<'resident' | 'shared'>('resident');
  const [fyiRoleId, setFyiRoleId] = useState<string>('');

  // Form State: Wound
  const [woundSiteLocation, setWoundSiteLocation] = useState('');
  const [woundShiftId, setWoundShiftId] = useState('');
  const [woundTime, setWoundTime] = useState('1000');
  const [woundFirstAction, setWoundFirstAction] = useState<'treatment' | 'assessment' | 'dressing_change'>('treatment');
  const [woundFrequency, setWoundFrequency] = useState<RecurrenceFrequency>('daily');
  const [woundRecurrenceRule, setWoundRecurrenceRule] = useState<RecurrenceRule | undefined>(undefined);
  const [woundBathingRelation, setWoundBathingRelation] = useState<'independent' | 'before_bath' | 'after_bath' | 'separate_day'>('independent');
  const [woundInstructions, setWoundInstructions] = useState('');
  const [woundSupplies, setWoundSupplies] = useState<WoundSupplySelection[]>([]);
  const [woundAssessmentType, setWoundAssessmentType] = useState<'none' | 'partial' | 'full'>('none');
  const [woundStatus, setWoundStatus] = useState<'active' | 'healing' | 'resolved' | 'discontinued'>('active');
  const [woundStopConfirmed, setWoundStopConfirmed] = useState(false);
  const clinicalShifts = shifts.filter(shift => {
    if (shift.isActive === false) return false;
    const role = roles.find(item => item.id === shift.roleId);
    const roleText = `${role?.code || ''} ${role?.name || ''}`.toLowerCase();
    return roleText.includes('lpn') || roleText.includes('rn') || roleText.includes('nurse') || roleText.includes('practical');
  });

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

  useEffect(() => {
    setAllowPausedResidentCare(false);
  }, [isOpen, residentId]);

  // Reset or initialize on open / prop changes
  useEffect(() => {
    if (isOpen) {
      setHasUnsavedChanges(false);
      setShowUnsavedWarning(false);
      setWoundStopConfirmed(false);
      setCoverageChangeConfirmed(false);
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
        setTaskTimingType(initialResidentTask.timingType || (initialResidentTask.isNoSpecificTime || !initialResidentTask.time ? 'period' : 'fixed'));
        setTaskFrequency(initialResidentTask.frequency);
        setTaskRecurrenceRule(initialResidentTask.recurrenceRule);
        setTaskAttentionConfig(initialResidentTask.attentionConfig);
        setTaskTrackingConfig(initialResidentTask.trackingConfig);
        setTaskInstructions(initialResidentTask.instructions || '');
        setTaskPriority(initialResidentTask.priority || 'normal');
        const coverage = normalizeCoverage(initialResidentTask.serviceCoverage);
        setCoverageType(coverage.type); setCoverageStartDate(coverage.startDate || ''); setCoverageEndDate(coverage.endDate || ''); setCoverageAdditional(Boolean(coverage.isAdditionalService)); setCoverageNote(coverage.note || '');
      } else if (initialUnitTask) {
        setSelectedType('unit_task');
        setShiftId(initialUnitTask.shiftId);
        setRoleId(initialUnitTask.roleId || '');
        setUnitTitle(initialUnitTask.title);
        setUnitCategory(initialUnitTask.category);
        setUnitShiftPhase(initialUnitTask.shiftPhase);
        setUnitTime(initialUnitTask.time || '0715');
        setUnitTimingType(initialUnitTask.timingType || (initialUnitTask.time ? 'fixed' : 'period'));
        setUnitFrequency(initialUnitTask.frequency);
        setUnitRecurrenceRule(initialUnitTask.recurrenceRule);
        setUnitResultType(initialUnitTask.resultType);
        setUnitInstructions(initialUnitTask.instructions || '');
      } else if (initialWound) {
        setSelectedType('wound');
        setResidentId(initialWound.residentId);
        setWoundSiteLocation(initialWound.siteLocation);
        setWoundShiftId(initialWound.shiftId || '');
        setWoundTime(initialWound.time || '1000');
        setWoundFirstAction(initialWound.firstAction);
        setWoundFrequency(initialWound.frequency);
        setWoundRecurrenceRule(initialWound.recurrenceRule);
        setWoundBathingRelation(initialWound.bathingRelation);
        setWoundInstructions(initialWound.protocol || initialWound.instructions || '');
        setWoundSupplies(initialWound.supplies || []);
        setWoundAssessmentType(initialWound.assessmentType || 'none');
        setWoundStatus(initialWound.status);
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
        setTaskAttentionConfig(undefined);
        setTaskTrackingConfig(undefined);
        setTaskTime('0800');
        setIsNoSpecificTime(false);
        setTaskFrequency('daily');
        setTaskInstructions('');
        setTaskPriority('normal');
        setCoverageType('FUNDED'); setCoverageStartDate(''); setCoverageEndDate(''); setCoverageAdditional(false); setCoverageNote('');
        setUnitTitle('');
        setUnitInstructions('');
        setResFirstName('');
        setResLastName('');
        setResRoomNumber('');
        setResNotes('');
        setFyiText('');
        setWoundSiteLocation('');
        const contextualClinicalShift = clinicalShifts.find(shift => shift.id === contextShiftId);
        setWoundShiftId(contextualClinicalShift?.id || clinicalShifts[0]?.id || '');
        setWoundTime('1000');
        setWoundFirstAction('treatment');
        setWoundFrequency('daily');
        setWoundRecurrenceRule(undefined);
        setWoundBathingRelation('independent');
        setWoundInstructions('');
        setWoundSupplies([]);
        setWoundAssessmentType('none');
        setWoundStatus('active');
      }
    }
  }, [isOpen, initialType, initialResidentTask, initialUnitTask, initialWound, initialFYI, contextResidentId, contextShiftId, mode]);

  const currentShiftObj = shifts.find(s => s.id === shiftId);
  const currentRoleObj = roles.find(r => r.id === (roleId || currentShiftObj?.roleId));
  const currentRoleCode = currentRoleObj?.code || 'HCA';
  const selectedResident = residents.find(resident => resident.id === residentId);
  const pausedResidentNeedsAcknowledgement = Boolean(
    selectedResident && isResidentCarePaused(selectedResident.status) && !allowPausedResidentCare
  );

  const getShiftTimeError = (time: string): string | null => {
    return validateTimedCareShift({ shifts: state.shifts, roles, shiftId, roleId, time });
  };

  const careTaskTimeError = taskTimingType !== 'fixed' || isNoSpecificTime
    ? validateCareShiftSelection({ shifts: state.shifts, roles, shiftId, roleId })
    : getShiftTimeError(taskTime);
  const unitTaskTimeError = unitTimingType === 'fixed' ? getShiftTimeError(unitTime) : null;
  const selectedWoundShift = clinicalShifts.find(shift => shift.id === woundShiftId);
  const woundShiftTimeError = clinicalShifts.length === 0
    ? 'No active LPN/RN shift is configured. Create one in Settings → Roles & Shifts before saving this wound protocol.'
    : !woundShiftId
      ? 'Select the active LPN/RN shift that should receive this wound protocol.'
      : validateTimedCareShift({
          shifts: state.shifts,
          roles,
          shiftId: woundShiftId,
          roleId: selectedWoundShift?.roleId || '',
          time: woundTime,
        });

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
    setTaskTrackingConfig(t.trackingConfig);
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
  const captureMutationError = (error: unknown) => {
    if (error instanceof DomainConflictError) setMutationConflict(error.result);
    else setMutationConflict({ status: 'CRITICAL', title: 'TaskSheet Could Not Save Safely', message: `${error instanceof Error ? error.message : 'An unexpected local data error occurred.'} Your entries remain available in this form. Review them and try again.` });
  };
  const requestClose = () => {
    if (hasUnsavedChanges) setShowUnsavedWarning(true);
    else onClose();
  };

  const handleSaveCareTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !residentId || careTaskTimeError || pausedResidentNeedsAcknowledgement) return;
    setMutationConflict(null);
    const resolvedTaskTime = taskTimingType === 'period' ? undefined : taskTimingType === 'start_of_shift' ? currentShiftObj?.startTime : taskTimingType === 'end_of_shift' ? currentShiftObj?.endTime : taskTime;
    const resolvedNoSpecificTime = taskTimingType === 'period';
    const coverageDefinition = getCoverageDefinitions(state.settings.serviceCoverageDefinitions).find(item => item.code === coverageType);
    if (!coverageDefinition) { setMutationConflict({ status: 'BLOCKED', title: 'Service Coverage Is Unavailable', message: 'Select an active Service Coverage classification before saving.' }); return; }
    const serviceCoverage: TaskServiceCoverage = createCoverageSnapshot(coverageDefinition, { startDate: coverageStartDate, endDate: coverageEndDate, isAdditionalService: coverageAdditional, note: coverageNote });
    if (serviceCoverage.startDate && serviceCoverage.endDate && serviceCoverage.endDate < serviceCoverage.startDate) { setMutationConflict({ status: 'BLOCKED', code: 'INVALID_DATE_RANGE', title: 'Invalid Coverage Period', message: 'Coverage end date must be on or after the start date.' }); return; }
    if (mode === 'edit' && initialResidentTask && normalizeCoverage(initialResidentTask.serviceCoverage).type !== serviceCoverage.type && !coverageChangeConfirmed) { setMutationConflict({ status: 'WARNING', code: 'COVERAGE_CHANGE_IMPACT', title: 'Change Service Coverage?', message: `You are changing this task from ${normalizeCoverage(initialResidentTask.serviceCoverage).labelSnapshot} to ${serviceCoverage.labelSnapshot}. This changes how it appears on TaskSheets, bathing grids, resident summaries, filters, and reports.`, recommendedActions: [{ id: 'confirm_coverage', label: 'Change Coverage', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] }); return; }
    try {
    if (mode === 'edit' && initialResidentTask) {
      db.updateResidentTask(initialResidentTask.id, {
        residentId,
        shiftId: shiftId || undefined,
        roleId: roleId || undefined,
        templateSlug: taskTemplateSlug,
        title: taskTitle.trim(),
        category: taskCategory,
        time: resolvedTaskTime,
        isNoSpecificTime: resolvedNoSpecificTime,
        timingType: taskTimingType,
        frequency: taskFrequency,
        recurrenceRule: taskRecurrenceRule,
        attentionConfig: taskAttentionConfig,
        trackingConfig: taskTrackingConfig,
        instructions: taskInstructions.trim() || undefined,
        priority: taskPriority
        ,serviceCoverage
      }, { expectedRevision: state.revision });
    } else {
      // Check if identical active task already exists on resident
      const existingMatch = state.residentTasks.find(t =>
        t.residentId === residentId &&
        t.isActive !== false && (
          (taskTemplateSlug && t.templateSlug === taskTemplateSlug && (resolvedNoSpecificTime || t.time === resolvedTaskTime)) ||
          (t.title.trim().toLowerCase() === taskTitle.trim().toLowerCase() && (resolvedNoSpecificTime || t.time === resolvedTaskTime))
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
          time: resolvedTaskTime,
          isNoSpecificTime: resolvedNoSpecificTime,
          timingType: taskTimingType,
          frequency: taskFrequency,
          recurrenceRule: taskRecurrenceRule,
          attentionConfig: taskAttentionConfig,
          trackingConfig: taskTrackingConfig,
          instructions: taskInstructions.trim() || undefined,
          priority: taskPriority
          ,serviceCoverage
        }, { expectedRevision: state.revision });
      } else {
        db.addResidentTask({
          residentId,
          shiftId: shiftId || undefined,
          roleId: roleId || undefined,
          templateSlug: taskTemplateSlug,
          title: taskTitle.trim(),
          category: taskCategory,
          time: resolvedTaskTime,
          isNoSpecificTime: resolvedNoSpecificTime,
          timingType: taskTimingType,
          frequency: taskFrequency,
          recurrenceRule: taskRecurrenceRule,
          attentionConfig: taskAttentionConfig,
          trackingConfig: taskTrackingConfig,
          instructions: taskInstructions.trim() || undefined,
          priority: taskPriority
          ,serviceCoverage
        }, { expectedRevision: state.revision });
      }
    }
    } catch (error) { captureMutationError(error); return; }

    onSuccess?.();
    onClose();
  };

  const handleSaveUnitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle.trim() || !shiftId || unitTaskTimeError) return;

    setMutationConflict(null);
    const resolvedUnitTime = unitTimingType === 'period' ? undefined : unitTimingType === 'start_of_shift' ? currentShiftObj?.startTime : unitTimingType === 'end_of_shift' ? currentShiftObj?.endTime : unitTime;
    try { if (mode === 'edit' && initialUnitTask) {
      db.updateUnitTask(initialUnitTask.id, {
        shiftId,
        roleId: roleId || undefined,
        title: unitTitle.trim(),
        category: unitCategory,
        shiftPhase: unitShiftPhase,
        time: resolvedUnitTime,
        timingType: unitTimingType,
        frequency: unitFrequency,
        recurrenceRule: unitRecurrenceRule,
        resultType: unitResultType,
        instructions: unitInstructions.trim() || undefined
      }, { expectedRevision: state.revision });
    } else {
      db.addUnitTask({
        shiftId,
        roleId: roleId || undefined,
        title: unitTitle.trim(),
        category: unitCategory,
        shiftPhase: unitShiftPhase,
        time: resolvedUnitTime,
        timingType: unitTimingType,
        frequency: unitFrequency,
        recurrenceRule: unitRecurrenceRule,
        resultType: unitResultType,
        instructions: unitInstructions.trim() || undefined
      }, { expectedRevision: state.revision });
    } } catch (error) { captureMutationError(error); return; }

    onSuccess?.();
    onClose();
  };

  const handleAddResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resFirstName.trim() || !resLastName.trim() || !resRoomNumber.trim()) return;
    try {
      setResidentSaveError('');
      const newRes = db.addResident({
        firstName: resFirstName.trim(),
        lastName: resLastName.trim(),
        roomNumber: resRoomNumber.trim(),
        status: resStatus,
        notes: resNotes.trim() || undefined
      });
      setResidentId(newRes.id);
      onSuccess?.();
      onClose();
    } catch (error) {
      setResidentSaveError((error as Error).message);
    }
  };

  const handleAddFYI = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fyiText.trim()) return;

    setMutationConflict(null);
    try { if (mode === 'edit' && initialFYI) {
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
        effectiveDate: getTodayLocalDateString()
      });
    } } catch (error) { captureMutationError(error); return; }

    onSuccess?.();
    onClose();
  };

  const handleAddWound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!woundSiteLocation.trim() || !residentId || !woundShiftId || woundShiftTimeError) return;
    if (!woundInstructions.trim() && (woundStatus === 'active' || woundStatus === 'healing')) { setMutationConflict({ status: 'BLOCKED', code: 'MISSING_WOUND_PROTOCOL', title: 'Dressing Plan Is Required', message: `${woundSiteLocation.trim()} needs treatment/dressing instructions before it can be scheduled. Enter the protocol, or save it as resolved/discontinued if no future care is required.` }); return; }
    if (mode === 'edit' && initialWound && ['active', 'healing'].includes(initialWound.status) && ['resolved', 'discontinued'].includes(woundStatus) && !woundStopConfirmed) {
      setMutationConflict({ status: 'WARNING', code: 'WOUND_NOT_ACTIVE', title: 'Future Wound Care Will Stop', message: `Marking ${woundSiteLocation.trim()} as ${woundStatus} will remove this recurring wound protocol from future operational TaskSheets. Existing historical data is preserved.`, affectedRecords: [{ id: initialWound.id, type: 'wound', label: `${initialWound.siteLocation} · ${initialWound.frequency}` }], recommendedActions: [{ id: 'confirm_stop', label: 'Confirm & Stop Future Care', kind: 'primary' }, { id: 'cancel', label: 'Keep Wound Active', kind: 'cancel' }] });
      return;
    }

    const structuredFields = {
      protocol: woundInstructions.trim() || undefined,
      supplies: woundSupplies,
      assessmentType: woundAssessmentType,
      startDate: woundRecurrenceRule?.startDate,
      endDate: woundRecurrenceRule?.endDate,
      status: woundStatus,
      discontinuedAt: woundStatus === 'discontinued' ? new Date().toISOString() : undefined,
    };

    setMutationConflict(null);
    try { if (mode === 'edit' && initialWound) {
      db.updateWound(initialWound.id, {
        residentId,
        shiftId: woundShiftId,
        time: woundTime,
        siteLocation: woundSiteLocation.trim(),
        firstAction: woundFirstAction,
        frequency: woundFrequency,
        recurrenceRule: woundRecurrenceRule,
        bathingRelation: woundBathingRelation,
        ...structuredFields,
        instructions: undefined
      }, { expectedRevision: state.revision });
    } else {
      db.addWound({
        residentId,
        shiftId: woundShiftId,
        time: woundTime,
        siteLocation: woundSiteLocation.trim(),
        firstAction: woundFirstAction,
        frequency: woundFrequency,
        recurrenceRule: woundRecurrenceRule,
        bathingRelation: woundBathingRelation,
        ...structuredFields,
        instructions: undefined
      }, { expectedRevision: state.revision });
    } } catch (error) { captureMutationError(error); return; }

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
      onClose={requestClose}
      title={modalTitle}
      subtitle={
        selectedType && (currentResidentObj || currentShiftObj)
          ? `${currentResidentObj ? `Room ${currentResidentObj.roomNumber} — ${currentResidentObj.firstName} ${currentResidentObj.lastName}` : ''} ${currentResidentObj && currentShiftObj ? ' · ' : ''} ${currentShiftObj ? `${currentShiftObj.name} (${currentShiftObj.startTime}–${currentShiftObj.endTime})` : ''}`
          : "Select what you need to record for the team"
      }
      maxWidth="2xl"
    >
      <div onChangeCapture={() => setHasUnsavedChanges(true)}>
      {showUnsavedWarning && <div className="mb-4"><ConflictNotice result={{ status: 'WARNING', title: 'Unsaved Changes', message: 'You have changes that have not been saved. Keep editing to preserve your entries, or discard them and close this form.', recommendedActions: [{ id: 'keep_editing', label: 'Keep Editing', kind: 'primary' }, { id: 'discard', label: 'Discard Changes', kind: 'cancel' }] }} onAction={action => { if (action === 'discard') onClose(); else setShowUnsavedWarning(false); }} /></div>}
      {mutationConflict && <div className="mb-4"><ConflictNotice result={mutationConflict} onAction={action => { if (action === 'confirm_stop') setWoundStopConfirmed(true); if (action === 'confirm_coverage') setCoverageChangeConfirmed(true); setMutationConflict(null); }} /></div>}
      {/* 1. SELECTION SCREEN */}
      {!selectedType && mode === 'add' && (
        <div className="border border-hairline-strong rounded-surface divide-y divide-hairline overflow-hidden">
          <button
            type="button"
            onClick={() => setSelectedType('care_task')}
            className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-panel-sunken transition-colors text-left"
          >
            <HeartHandshake className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-ink">Care Task</h4>
              <p className="text-xs text-muted mt-0.5">Resident-specific care assignment, vitals, BG check, MAP, or hygiene.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('unit_task')}
            className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-panel-sunken transition-colors text-left"
          >
            <ClipboardList className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-ink">Unit Task</h4>
              <p className="text-xs text-muted mt-0.5">Shift & role routines, fridge temperature, narcotic count, or safety checks.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('resident')}
            className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-panel-sunken transition-colors text-left"
          >
            <UserPlus className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-ink">Resident</h4>
              <p className="text-xs text-muted mt-0.5">Add a new resident and room to the facility directory.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('fyi')}
            className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-panel-sunken transition-colors text-left"
          >
            <Info className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-ink">FYI / Standing Info</h4>
              <p className="text-xs text-muted mt-0.5">Information staff need to know without marking as a task row.</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('wound')}
            className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-panel-sunken transition-colors text-left"
          >
            <Bandage className="w-4 h-4 text-danger shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h4 className="text-[13px] font-bold text-ink">Wound Protocol</h4>
              <p className="text-xs text-muted mt-0.5">Track site, dressing changes, treatment schedule, and bathing relations.</p>
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
              className="inline-flex items-center text-xs text-muted hover:text-ink mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
            </button>
          )}

          {/* Context Banner */}
          {currentResidentObj && currentShiftObj && (
            <div className="p-3 bg-accent-soft border border-hairline-strong rounded-control flex items-center justify-between text-xs text-accent-strong font-medium">
              <div>
                <span className="font-bold">Room {currentResidentObj?.roomNumber} — {currentResidentObj?.firstName} {currentResidentObj?.lastName}</span>
                <span className="mx-2">·</span>
                <span>{currentShiftObj?.shortCode ? `${currentShiftObj.shortCode} — ` : ''}{currentShiftObj?.name} ({currentShiftObj?.startTime}–{currentShiftObj?.endTime})</span>
              </div>
              <span className="px-2 py-0.5 bg-accent-soft rounded font-semibold">{currentRoleObj?.name}</span>
            </div>
          )}

          {/* Resident Picker (if not in context or in edit/duplicate mode where change is supported) */}
          {(!contextResidentId || mode === 'duplicate') && (
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Resident <span className="text-danger">*</span>
              </label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              >
                <option value="">Select resident or room...</option>
                {residents.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} — {r.lastName}, {r.firstName} ({getResidentStatusLabel(r.status)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedResident && isResidentCarePaused(selectedResident.status) && (
            <div className="rounded-surface border border-warning bg-warning-soft p-3 text-warning" role="alert">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <div>
                  <p className="text-xs font-black">Care generation is paused: {getResidentStatusLabel(selectedResident.status)}</p>
                  <p className="mt-1 text-[11px] leading-relaxed">This task will be stored but cannot appear on a TaskSheet until the resident returns to Active.</p>
                  <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] font-bold">
                    <input type="checkbox" checked={allowPausedResidentCare} onChange={event => setAllowPausedResidentCare(event.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded text-warning" />
                    <span>I understand and want to configure future care while this resident is paused.</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Shift Picker */}
          {(!contextShiftId || mode === 'duplicate' || mode === 'edit') && (
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Shift
              </label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              >
                <option value="">Select active shift...</option>
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
                <p className="text-[11px] text-warning font-medium mt-1">
                  Notice: Moving to another shift will apply to future generated assignments.
                </p>
              )}
            </div>
          )}

          {/* What needs to be done? (Role-Aware Search + Optional Category Filter) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider">
                What needs to be done? <span className="text-danger">*</span>
              </label>
              {mode === 'add' && (
                <div className="flex items-center space-x-1.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPickerTab('common')}
                    className={`px-2 py-0.5 rounded font-medium ${pickerTab === 'common' ? 'bg-accent-soft text-accent-strong font-bold' : 'text-muted hover:text-ink'}`}
                  >
                    Common
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerTab('search')}
                    className={`px-2 py-0.5 rounded font-medium ${pickerTab === 'search' ? 'bg-accent-soft text-accent-strong font-bold' : 'text-muted hover:text-ink'}`}
                  >
                    Search All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerTab('custom');
                      setTaskTemplateSlug(undefined);
                      setTaskAttentionConfig(undefined);
                      setTaskTrackingConfig(undefined);
                    }}
                    className={`px-2 py-0.5 rounded font-medium ${pickerTab === 'custom' ? 'bg-accent-soft text-accent-strong font-bold' : 'text-muted hover:text-ink'}`}
                  >
                    + Custom Task
                  </button>
                </div>
              )}
            </div>

            {/* Optional Category Quick Filter Pill Bar (in Add mode) */}
            {mode === 'add' && (
              <div className="mb-2 flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                <span className="text-faint font-medium flex items-center">
                  <Filter className="w-3 h-3 mr-0.5" /> Domain:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-2 py-0.5 rounded-control whitespace-nowrap ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-ink text-white font-bold'
                      : 'bg-panel-sunken hover:bg-panel-sunken text-ink-soft'
                  }`}
                >
                  All Care
                </button>
                {categories.slice(0, 8).map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategoryFilter(c.id)}
                    className={`px-2 py-0.5 rounded-control whitespace-nowrap ${
                      selectedCategoryFilter === c.id
                        ? 'bg-ink text-white font-bold'
                        : 'bg-panel-sunken hover:bg-panel-sunken text-ink-soft'
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
                className="w-full pl-9 pr-4 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
              <Search className="w-4 h-4 text-faint absolute left-3 top-3" />
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
                      className="text-xs px-2.5 py-1 bg-panel-sunken hover:bg-accent-soft hover:text-accent-strong text-ink-soft rounded-md transition-colors font-medium text-left"
                    >
                      + {t.title}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {mode === 'add' && taskSearchQuery && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-panel border border-hairline-strong rounded-control divide-y divide-hairline text-xs">
                {filteredCatalogTasks.slice(0, 10).map(t => (
                  <button
                    key={t.slug}
                    type="button"
                    onClick={() => selectCatalogTemplate(t)}
                    className="w-full px-3 py-2 text-left hover:bg-accent-soft flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-semibold text-ink group-hover:text-accent-strong">{t.title}</div>
                      <div className="text-[11px] text-muted line-clamp-1">{t.defaultInstructions || t.description}</div>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-panel-sunken text-ink-soft group-hover:bg-accent-soft group-hover:text-accent-strong">
                      {t.roleCode}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Time Field */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Timing Type</label>
            <select value={taskTimingType} onChange={event => { const value = event.target.value as TaskTimingType; setTaskTimingType(value); setIsNoSpecificTime(value === 'period'); }} className="mb-2 w-full rounded-control border border-hairline-strong bg-panel px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-accent">
              <option value="fixed">Fixed Clock Time</option><option value="start_of_shift">Start of Shift</option><option value="end_of_shift">End of Shift</option><option value="period">During Shift / No Specific Time</option>
            </select>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">{taskTimingType === 'fixed' ? 'Scheduled Time (Military 24h)' : 'Resolved Time'}</label>
            <input
              type="text"
              disabled={taskTimingType !== 'fixed'}
              value={taskTimingType === 'start_of_shift' ? currentShiftObj?.startTime || '' : taskTimingType === 'end_of_shift' ? currentShiftObj?.endTime || '' : taskTimingType === 'period' ? '' : taskTime}
              onChange={(e) => setTaskTime(e.target.value)}
              placeholder="0800"
              aria-invalid={!!careTaskTimeError}
              className={`w-full sm:w-48 px-3.5 py-2.5 bg-panel disabled:bg-panel-sunken border rounded-control text-sm focus:ring-2 focus:ring-accent tabular-nums font-mono font-bold ${careTaskTimeError ? 'border-danger' : 'border-hairline-strong'}`}
            />
            <p className="mt-1 text-[11px] text-muted">{taskTimingType === 'start_of_shift' ? 'Automatically follows the configured shift start.' : taskTimingType === 'end_of_shift' ? 'Automatically follows the configured shift end and is permitted at the exclusive boundary.' : taskTimingType === 'period' ? 'Prints within the shift without a fixed clock time.' : 'Fixed times remain unchanged when shift hours change.'}</p>
            {timingPresetKind && taskTimingType === 'fixed' && (
              <div className="mt-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-muted">
                  Facility {timingPresetKind === 'medication' ? 'medication' : 'meal'} times
                </p>
                {availableTimingPresets.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {availableTimingPresets.map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setTaskTime(preset.time)}
                        className={`px-2.5 py-1.5 rounded-control border text-[11px] font-bold transition-colors ${
                          taskTime === preset.time
                            ? 'border-accent bg-accent-soft text-accent-strong ring-1 ring-accent'
                            : 'border-hairline-strong bg-panel text-ink-soft hover:border-accent hover:bg-accent-soft'
                        }`}
                      >
                        {preset.label} <span className="font-mono">{preset.time}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-warning">No active preset falls inside this shift. Enter a valid time manually or update Care Timing Presets in Settings.</p>
                )}
              </div>
            )}
            {careTaskTimeError && (
              <p className="mt-1.5 flex items-start space-x-1.5 text-xs font-semibold text-danger" role="alert">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{careTaskTimeError}</span>
              </p>
            )}
          </div>

          {/* Recurrence & Frequency Selector */}
          <div className="pt-2 border-t border-hairline">
            <RecurrenceSelector
              value={taskRecurrenceRule}
              frequency={taskFrequency}
              onChange={(newRule, newFreq) => {
                setTaskRecurrenceRule(newRule);
                setTaskFrequency(newFreq);
              }}
            />
          </div>

          <div className="rounded-surface border border-hairline-strong bg-panel-sunken p-3.5 space-y-3">
            <div>
              <label htmlFor="resident-task-service-coverage" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Service Coverage</label>
              <select id="resident-task-service-coverage" value={coverageType} onChange={event => { const code = event.target.value; setCoverageType(code); if (code === 'FUNDED') setCoverageAdditional(false); }} className="w-full rounded-control border border-hairline-strong bg-panel px-3.5 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-accent">
                {getCoverageDefinitions(state.settings.serviceCoverageDefinitions).map(item => <option key={item.id} value={item.code}>{item.icon ? `${item.icon} ` : ''}{item.name}</option>)}
              </select>
              <p className="mt-1 text-[11px] text-muted">Identifies why the service is provided. TaskSheet does not store prices, invoices, or payment information.</p>
            </div>
            {coverageType !== 'FUNDED' && <>
              <label className="flex items-center gap-2 text-xs font-semibold text-ink-soft"><input type="checkbox" checked={coverageAdditional} onChange={event => setCoverageAdditional(event.target.checked)} className="rounded border-hairline-strong text-accent-strong" />Additional to the resident's funded/authorized service</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-ink-soft">Effective Start Date<input type="date" value={coverageStartDate} onChange={event => setCoverageStartDate(event.target.value)} className="mt-1 w-full rounded-control border border-hairline-strong bg-panel px-3 py-2 text-sm" /></label>
                <label className="text-xs font-semibold text-ink-soft">Optional End Date<input type="date" value={coverageEndDate} min={coverageStartDate || undefined} onChange={event => setCoverageEndDate(event.target.value)} className="mt-1 w-full rounded-control border border-hairline-strong bg-panel px-3 py-2 text-sm" /></label>
              </div>
              <label className="block text-xs font-semibold text-ink-soft">Coverage Note (Optional)<input value={coverageNote} onChange={event => setCoverageNote(event.target.value)} placeholder="Authorization/reference note; no billing details" className="mt-1 w-full rounded-control border border-hairline-strong bg-panel px-3 py-2 text-sm font-normal" /></label>
              {coverageType === 'TEMPORARY_EXCEPTION' && !coverageEndDate && <p className="flex items-center gap-1.5 text-xs font-semibold text-warning"><AlertTriangle className="h-3.5 w-3.5" />Temporary exceptions normally need an end date so they do not continue indefinitely.</p>}
            </>}
          </div>

          {/* Instructions */}
          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={taskInstructions}
              onChange={(e) => setTaskInstructions(e.target.value)}
              placeholder="e.g. Fasting check before breakfast; notify nurse if BG < 4.0..."
              className="w-full px-3.5 py-2 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />
            {taskTemplateSlug && (
              <p className="mt-1 text-[11px] text-muted">Pre-filled from the task catalog. Edit these instructions for this resident as needed.</p>
            )}
          </div>

          {taskTrackingConfig && (
            <div className="flex items-center justify-between gap-3 rounded-surface border border-hairline-strong bg-accent-soft px-3 py-2 text-accent-strong">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider">Paper Tracking Field</p>
                <p className="text-[11px]">A structured {taskTrackingConfig.kind} write-in field will print on the resident's TaskSheet. Results are not stored electronically.</p>
              </div>
              <TaskAttentionBadges attentionConfig={taskAttentionConfig} maxVisible={3} />
            </div>
          )}

          {/* Smart Attention Suggestions Banner */}
          {(() => {
            if (state.settings.smartSuggestionsEnabled === false) return null;
            const detection = detectAttentionIndicators(taskTitle, taskInstructions, state.settings.attentionRules);
            const activeSet = new Set(taskAttentionConfig?.indicators || []);
            const unappliedSuggestions = detection.suggestedIndicators.filter(ind => !activeSet.has(ind));

            if (unappliedSuggestions.length === 0 && activeSet.size === 0) return null;

            return (
              <div className="p-3 bg-warning-soft/70 border border-warning rounded-surface space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 font-bold text-warning">
                    <Sparkles className="w-3.5 h-3.5 text-warning" />
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
                      className="text-[11px] font-bold text-warning hover:text-warning underline"
                    >
                      + Apply All Suggestions ({unappliedSuggestions.length})
                    </button>
                  )}
                </div>

                {/* Active Badges */}
                {activeSet.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-muted uppercase mr-1">Active:</span>
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
                          <span className="text-[10px] font-sans ml-1 text-faint">×</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Unapplied Suggestions */}
                {unappliedSuggestions.length > 0 && (
                  <div className="space-y-1 pt-1 border-t border-warning/60">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className="text-[10px] font-bold text-warning uppercase mr-1">Suggested:</span>
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
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded border border-dashed border-warning bg-panel text-warning text-[11px] font-bold hover:bg-warning-soft transition-colors"
                          >
                            <span>+ [{d.shortAbbreviation}] {d.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[10px] text-warning italic">
                      Detected from wording in task title and instructions. Click to apply.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Progressive Disclosure: Advanced Options */}
          <div className="border-t border-hairline-strong pt-2">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center text-xs font-medium text-muted hover:text-ink"
            >
              <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3.5 bg-panel-sunken border border-hairline-strong rounded-control space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink-soft">Priority:</span>
                  <div className="flex items-center space-x-2">
                    {(['normal', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setTaskPriority(p)}
                        className={`px-2.5 py-1 rounded capitalize font-medium ${
                          taskPriority === p
                            ? 'bg-ink text-white font-bold'
                            : 'bg-panel border border-hairline-strong text-ink-soft'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual Attention Indicators Selector */}
                <div className="pt-2 border-t border-hairline-strong space-y-2">
                  <span className="font-bold text-ink-soft block">Manual Attention & Safety Flags:</span>
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
                        <label key={ind} className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-ink">
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
                            className="rounded text-accent focus:ring-accent w-3.5 h-3.5"
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
              onClick={requestClose}
              className="px-4 py-2.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!careTaskTimeError || pausedResidentNeedsAcknowledgement}
              className="btn btn-accent px-6"
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
              className="inline-flex items-center text-xs text-muted hover:text-ink mb-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
            </button>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Shift <span className="text-danger">*</span>
            </label>
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
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
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              What needs to be done? <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
              placeholder="e.g. Medication Fridge Temperature, Controlled Count..."
              required
              className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />

            {mode === 'add' && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-faint self-center mr-1">Templates:</span>
                {unitTemplates.map(u => (
                  <button
                    key={u.slug}
                    type="button"
                    onClick={() => selectUnitTemplate(u)}
                    className="text-[11px] px-2.5 py-1 bg-panel-sunken hover:bg-accent-soft text-ink-soft hover:text-accent-strong rounded-md transition-colors"
                  >
                    + {u.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                When in shift?
              </label>
              <select
                value={unitShiftPhase}
                onChange={(e) => setUnitShiftPhase(e.target.value as any)}
                className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              >
                <option value="start">Start of Shift (Routines & Safety)</option>
                <option value="during">During Shift (Routines & Restock)</option>
                <option value="end">End of Shift (Handoff & Count)</option>
              </select>
            </div>

            <div><label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Timing Type</label><select value={unitTimingType} onChange={event => setUnitTimingType(event.target.value as TaskTimingType)} className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm"><option value="fixed">Fixed Time</option><option value="start_of_shift">Shift Start</option><option value="end_of_shift">Shift End</option><option value="period">During Shift</option></select></div>

            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Time (Military 24h)
              </label>
              <input
                type="text"
                disabled={unitTimingType !== 'fixed'}
                value={unitTimingType === 'start_of_shift' ? currentShiftObj?.startTime || '' : unitTimingType === 'end_of_shift' ? currentShiftObj?.endTime || '' : unitTimingType === 'period' ? '' : unitTime}
                onChange={(e) => setUnitTime(e.target.value)}
                placeholder="0715"
                aria-invalid={!!unitTaskTimeError}
                className={`w-full px-3.5 py-2 bg-panel border rounded-control text-sm focus:ring-2 focus:ring-accent font-mono tabular-nums ${unitTaskTimeError ? 'border-danger' : 'border-hairline-strong'}`}
              />
            </div>
          </div>

          {unitTaskTimeError && (
            <p className="flex items-start space-x-1.5 text-xs font-semibold text-danger" role="alert">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{unitTaskTimeError}</span>
            </p>
          )}

          <div className="pt-2 border-t border-hairline">
            <RecurrenceSelector
              value={unitRecurrenceRule}
              frequency={unitFrequency}
              allowPrn={false}
              onChange={(newRule, newFrequency) => {
                setUnitRecurrenceRule(newRule);
                setUnitFrequency(newFrequency);
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={unitInstructions}
              onChange={(e) => setUnitInstructions(e.target.value)}
              placeholder="e.g. Check emergency seals intact; test backup suction..."
              className="w-full px-3.5 py-2 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!!unitTaskTimeError}
              className="btn btn-accent px-6"
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
            className="inline-flex items-center text-xs text-muted hover:text-ink mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
          </button>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                First Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={resFirstName}
                onChange={(e) => setResFirstName(e.target.value)}
                placeholder="Arthur"
                required
                className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Last Name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={resLastName}
                onChange={(e) => setResLastName(e.target.value)}
                placeholder="Pendleton"
                required
                className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="resident-status" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Resident Status</label>
            <select id="resident-status" value={resStatus} onChange={event => setResStatus(event.target.value as ResidentStatus)} className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm">
              <option value="active">Active</option><option value="in_hospital">In Hospital</option><option value="out_on_pass">Out on Pass</option><option value="on_hold">On Hold</option><option value="inactive">Inactive / Not Yet Admitted</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Room / Occupancy Location <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={resRoomNumber}
              onChange={(e) => setResRoomNumber(e.target.value)}
              placeholder="Search or enter a configured label, e.g. L101A"
              list="available-room-positions"
              required
              className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent font-mono"
            />
            <datalist id="available-room-positions">{availablePositions.map(position => <option key={position.id} value={position.displayLabel}>{position.displayLabel} — Available</option>)}</datalist>
            <p className="mt-1 text-[11px] text-muted">Select an available configured position. A unique new label creates a simple room automatically.</p>
          </div>

          {residentSaveError && <div role="alert" className="rounded-control border border-danger bg-danger-soft p-3 text-xs font-bold text-danger">{residentSaveError}</div>}

          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Resident Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={resNotes}
              onChange={(e) => setResNotes(e.target.value)}
              placeholder="e.g. Uses rollator walker; prefers morning care after breakfast..."
              className="w-full px-3.5 py-2 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-accent px-6"
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
            className="inline-flex items-center text-xs text-muted hover:text-ink mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
          </button>

          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              FYI Standing Note / Instruction <span className="text-danger">*</span>
            </label>
            <textarea
              rows={3}
              value={fyiText}
              onChange={(e) => setFyiText(e.target.value)}
              placeholder="e.g. Son visits on Saturdays at 14:00 with diabetic treats; check BG before dinner."
              required
              className="w-full px-3.5 py-2 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Category
              </label>
              <select
                value={fyiCategory}
                onChange={(e) => setFyiCategory(e.target.value as FYICategory)}
                className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm"
              >
                <option value="preference">Resident Preference</option>
                <option value="safety">Safety Alert</option>
                <option value="communication">Communication</option>
                <option value="protocol">Clinical Protocol</option>
                <option value="medical">Medical Update</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Importance
              </label>
              <select
                value={fyiImportance}
                onChange={(e) => setFyiImportance(e.target.value as any)}
                className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm"
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
              onClick={requestClose}
              className="px-4 py-2.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-accent px-6"
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
            className="inline-flex items-center text-xs text-muted hover:text-ink mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Choose different type
          </button>

          {!contextResidentId && (
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Resident <span className="text-danger">*</span>
              </label>
              <select
                value={residentId}
                onChange={(e) => setResidentId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
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
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Site Location <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={woundSiteLocation}
              onChange={(e) => setWoundSiteLocation(e.target.value)}
              placeholder="e.g. Left Lower Leg Venous Ulcer, Right Forearm Skin Tear"
              required
              className="w-full px-3.5 py-2.5 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Primary Action
              </label>
              <select
                value={woundFirstAction}
                onChange={(e) => setWoundFirstAction(e.target.value as any)}
                className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm"
              >
                <option value="treatment">Wound Treatment</option>
                <option value="dressing_change">Dressing Change</option>
                <option value="assessment">Wound Assessment</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Bathing Relation
              </label>
              <select
                value={woundBathingRelation}
                onChange={(e) => setWoundBathingRelation(e.target.value as any)}
                className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm"
              >
                <option value="independent">Independent of Bathing</option>
                <option value="after_bath">Perform Immediately After Bath</option>
                <option value="before_bath">Perform Before Bath</option>
                <option value="separate_day">Separate Day from Bathing</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="wound-shift" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Assigned LPN/RN Shift <span className="text-danger">*</span>
              </label>
              <select
                id="wound-shift"
                value={woundShiftId}
                onChange={(event) => setWoundShiftId(event.target.value)}
                required
                className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm"
              >
                <option value="">Select clinical shift...</option>
                {clinicalShifts.map(shift => (
                  <option key={shift.id} value={shift.id}>
                    {shift.shortCode} — {shift.name} ({shift.startTime}–{shift.endTime})
                  </option>
                ))}
              </select>
              {clinicalShifts.length === 0 && (
                <p className="mt-1 text-[11px] font-semibold text-danger">No active LPN/RN shift is configured. Add one in Settings → Roles &amp; Shifts.</p>
              )}
            </div>
            <div>
              <label htmlFor="wound-time" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Scheduled Time <span className="text-danger">*</span>
              </label>
              <input
                id="wound-time"
                type="text"
                value={woundTime}
                onChange={(event) => setWoundTime(event.target.value)}
                required
                aria-invalid={!!woundShiftTimeError}
                className={`w-full px-3 py-2 bg-panel border rounded-control text-sm font-mono font-bold ${woundShiftTimeError ? 'border-danger' : 'border-hairline-strong'}`}
                placeholder="1000"
              />
            </div>
          </div>

          {woundShiftTimeError && (
            <p className="flex items-start space-x-1.5 text-xs font-semibold text-danger" role="alert">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{woundShiftTimeError}</span>
            </p>
          )}

          <div className="pt-2 border-t border-hairline">
            <RecurrenceSelector
              value={woundRecurrenceRule}
              frequency={woundFrequency}
              onChange={(newRule, newFrequency) => {
                setWoundRecurrenceRule(newRule);
                setWoundFrequency(newFrequency);
              }}
            />
          </div>

          <div>
            <label htmlFor="wound-protocol" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
              Treatment Protocol / Dressing Instructions
            </label>
            <textarea
              id="wound-protocol"
              rows={2}
              value={woundInstructions}
              onChange={(e) => setWoundInstructions(e.target.value)}
              placeholder="Cleanse with sterile NS, apply barrier film, cover with Mepilex Border..."
              className="w-full px-3.5 py-2 bg-panel border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <WoundSupplyPicker value={woundSupplies} onChange={setWoundSupplies} />
            <div>
              <label htmlFor="wound-assessment-type" className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Assessment / Notes Prompt
              </label>
              <select
                id="wound-assessment-type"
                value={woundAssessmentType}
                onChange={(event) => setWoundAssessmentType(event.target.value as 'none' | 'partial' | 'full')}
                className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-sm"
              >
                <option value="none">Notes only</option>
                <option value="partial">Partial assessment</option>
                <option value="full">Full assessment</option>
              </select>
              <p className="mt-1 text-[11px] text-muted">Creates a paper prompt only. No clinical result is stored in TaskSheet.</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={requestClose}
              className="px-4 py-2.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-accent px-6"
            >
              {mode === 'edit' ? 'Save Changes' : 'Add Wound Protocol'}
            </button>
          </div>
        </form>
      )}
      </div>
    </Modal>
  );
};
