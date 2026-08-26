export type UUID = string;

export type ResidentStatus = 
  | 'active' 
  | 'in_hospital' 
  | 'out_on_pass' 
  | 'on_hold'
  | 'discharged' 
  | 'deceased' 
  | 'inactive';

export type RecurrenceFrequency = 
  | 'once' 
  | 'daily' 
  | 'selected_days' 
  | 'weekly' 
  | 'every_2_weeks' 
  | 'monthly' 
  | 'prn'
  | 'custom';

export type UnitTaskResultType = 
  | 'checkbox' 
  | 'temperature' 
  | 'confirmation' 
  | 'pass_issue' 
  | 'value_note' 
  | 'checkbox_note';

export type ShiftPhase = 'start' | 'during' | 'end';

export type TaskPriority = 'normal' | 'high' | 'urgent';

export type PrintProfile = 'role_default' | 'simple_checklist' | 'clinical_worksheet';

export interface FacilityContactExtension {
  id: string;
  label: string;
  number: string;
  enabled?: boolean;
}

export interface Facility {
  siteName: string;
  unitName?: string;
  street: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  mainPhone: string;
  unitPhone: string;
  fax: string;
  additionalExtensions?: FacilityContactExtension[];
}

export type PrintDensity = 'compact' | 'standard' | 'spacious';

export interface QuickVitalsColumnConfig {
  id: string;
  label: string;
  shortLabel: string;
  width?: string;
  enabled: boolean;
  isSystem?: boolean;
}

export interface PrintProfileConfig {
  id: string;
  name: string;
  profileType: 'simple_checklist' | 'clinical_worksheet';
  density: PrintDensity;
  largePrint: boolean;
  handoffLinesCount: number;
  quickVitalsRowsCount: number;
  quickVitalsColumns: QuickVitalsColumnConfig[];
  showStartUnitTasks: boolean;
  showDuringUnitTasks: boolean;
  showEndUnitTasks: boolean;
  showImportantFYIs: boolean;
  showHandoffLines: boolean;
}

export interface FacilityBrandingSettings {
  logoUrl?: string;
  headerStyle: 'standard' | 'compact' | 'centered';
  shiftHeaderFormat?: 'short_code_only' | 'full_name_and_role' | 'name_only';
  confidentialityNotice: string;
  showConfidentialityNotice: boolean;
  showSupervisorSignatureBlock: boolean;
  watermarkStyle?: 'none' | 'draft' | 'confidential' | 'sample';
}

export interface QuickAddPresetOption {
  id: string;
  label: string;
  templateSlug?: string;
  defaultTime?: string;
  defaultFrequency?: RecurrenceFrequency;
  defaultInstructions?: string;
  isDefaultSelected?: boolean;
}

export interface FacilityQuickAddPreset {
  id: string;
  label: string;
  subtitle: string;
  category: string;
  roleCode: 'HCA' | 'LPN' | 'ALL';
  defaultTime?: string;
  defaultFrequency: RecurrenceFrequency;
  options: QuickAddPresetOption[];
  includedBundledItems?: string[]; // for AM/PM care descriptions
  isActive: boolean;
  displayOrder: number;
}

export type TaskAttentionIndicator = 
  | 'HIGH_ALERT'
  | 'TIME_CRITICAL'
  | 'MEAL_LINKED'
  | 'TWO_PERSON'
  | 'FOLLOW_UP'
  | 'OBSERVE'
  | 'PRECAUTION'
  | 'EQUIPMENT'
  | 'DOC_REF';

export type MealRelation = 'BEFORE_MEAL' | 'WITH_MEAL' | 'AFTER_MEAL';

export interface AttentionIndicatorMetadata {
  indicator: TaskAttentionIndicator;
  reason?: string;
  source?: 'catalog' | 'facility_rule' | 'smart_suggestion' | 'user_override';
  mealRelation?: MealRelation;
  equipmentNote?: string;
  docRefNote?: string;
}

export interface TaskAttentionConfig {
  indicators?: TaskAttentionIndicator[];
  metadata?: AttentionIndicatorMetadata[];
  mealRelation?: MealRelation;
  equipmentNote?: string;
  docRefNote?: string;
}

export type ResidentTrackingKind =
  | 'rai'
  | 'bowel'
  | 'fluid'
  | 'weight'
  | 'sleep'
  | 'food'
  | 'behavior'
  | 'pain';

/** Paper tracking prompt only. TaskSheet does not store clinical tracking results electronically. */
export interface ResidentTrackingConfig {
  kind: ResidentTrackingKind;
  prompt?: string;
}

export interface FacilityAttentionRule {
  id: string;
  name: string;
  pattern: string; // keyword or regex pattern
  indicators: TaskAttentionIndicator[];
  mealRelation?: MealRelation;
  equipmentNote?: string;
  docRefNote?: string;
  isActive: boolean;
  isSystem: boolean;
}

export interface WelcomeHeroSettings {
  showWelcomePage?: 'on_first_launch' | 'always' | 'never';
  showWhyTaskSheetContent?: boolean;
}

export interface FacilityTimePreset {
  id: string;
  label: string;
  time: string;
  isActive?: boolean;
}

export interface FacilityCareTimingSettings {
  medicationTimes: FacilityTimePreset[];
  mealTimes: FacilityTimePreset[];
}

export interface FacilitySettings {
  timezone: string;
  timeFormat: '24h' | '12h';
  developerFooterEnabled: boolean;
  firstRunCompleted: boolean;
  dataMode?: 'demo' | 'setup_required' | 'operational';
  printProfiles?: PrintProfileConfig[];
  branding?: FacilityBrandingSettings;
  quickAddPresets?: FacilityQuickAddPreset[];
  attentionRules?: FacilityAttentionRule[];
  smartSuggestionsEnabled?: boolean;
  welcomeHero?: WelcomeHeroSettings;
  careTimingPresets?: FacilityCareTimingSettings;
}

export interface Role {
  id: UUID;
  name: string;
  code: string;
  description: string;
  defaultPrintProfile: 'simple_checklist' | 'clinical_worksheet';
  isSystem?: boolean;
}

export interface Shift {
  id: UUID;
  name: string;            // e.g. "LPN Day"
  shortCode: string;       // e.g. "LP1", "D1", "NLPN"
  roleId: UUID;
  startTime: string;       // e.g. '0700'
  endTime: string;         // e.g. '1900'
  isActive?: boolean;
  displayOrder?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  source?: 'manual' | 'demo';
}

export interface Resident {
  id: UUID;
  firstName: string;
  lastName: string;
  roomNumber: string;
  status: ResidentStatus;
  notes?: string;
  admittedAt?: string;
  returnDate?: string;
  source?: 'manual' | 'imported' | 'demo';
  sourceBatchId?: string;
}

export type RecurrenceType =
  | 'ONE_TIME'
  | 'DAILY'
  | 'EVERY_N_DAYS'
  | 'SELECTED_WEEKDAYS'
  | 'WEEKLY'
  | 'EVERY_N_WEEKS'
  | 'MONTHLY_DAY'
  | 'MONTHLY_ORDINAL_WEEKDAY'
  | 'EVERY_N_MONTHS'
  | 'SELECTED_MONTHS'
  | 'DATE_RANGE'
  | 'PRN';

export type RecurrenceOrdinal = 'first' | 'second' | 'third' | 'fourth' | 'last';
export type RecurrenceEndType = 'never' | 'on_date' | 'after_occurrences';

export interface RecurrenceRule {
  /** Legacy aliases retained for safe migration of existing stored schedules. */
  frequency?: string;
  intervalDays?: number;
  anchorDate?: string;
  type?: RecurrenceType;
  basis?: 'daily' | 'selected_weekdays' | 'interval_days' | 'interval_weeks' | 'monthly_day' | 'specific_date' | 'prn';
  selectedDays?: number[]; // 0 = Sun, 1 = Mon ... 6 = Sat
  weekdays?: number[];     // 0 = Sun, 1 = Mon ... 6 = Sat (alias)
  dayOfMonth?: number;     // 1-31
  interval?: number;       // step interval for N days/weeks/months
  startDate?: string;      // YYYY-MM-DD anchor
  endDate?: string;        // YYYY-MM-DD
  endType?: RecurrenceEndType; // 'never' | 'on_date' | 'after_occurrences'
  endOccurrencesCount?: number; // stop after N occurrences
  ordinal?: RecurrenceOrdinal; // 'first' | 'second' | 'third' | 'fourth' | 'last'
  ordinalWeekday?: number; // 0=Sun..6=Sat
  months?: number[];       // 1-12 for selected months
  specificDate?: string;   // for ONE_TIME
  prnPrintOption?: 'all_sheets' | 'selected_shifts';
  scheduleMethod?: 'fixed_schedule' | 'from_last_performed';
  lastPerformedDate?: string;
  carryOverIfMissed?: boolean;
  reviewOnReturn?: boolean;
}

export interface ResidentTask {
  id: UUID;
  residentId: UUID;
  shiftId?: UUID;
  roleId?: UUID;
  templateSlug?: string;
  title: string;
  category: string;
  time?: string; // e.g. '0800'
  isNoSpecificTime?: boolean;
  frequency: RecurrenceFrequency;
  recurrenceRule?: RecurrenceRule;
  instructions?: string;
  priority?: TaskPriority;
  attentionConfig?: TaskAttentionConfig;
  trackingConfig?: ResidentTrackingConfig;
  isActive: boolean;
  stoppedAt?: string;
  createdAt: string;
  updatedAt?: string;
  source?: 'manual' | 'catalog' | 'imported' | 'demo';
  sourceBatchId?: string;
}

export interface UnitTaskResultConfig {
  unit?: string;
  min?: number;
  max?: number;
  passLabel?: string;
  issueLabel?: string;
}

export interface UnitTask {
  id: UUID;
  shiftId: UUID;
  roleId?: UUID;
  templateSlug?: string;
  title: string;
  category: string;
  shiftPhase: ShiftPhase;
  time?: string; // e.g. '0715'
  frequency: RecurrenceFrequency;
  recurrenceRule?: RecurrenceRule;
  // resultType is retained only for print-template paper write-in field rendering.
  // It does NOT drive any electronic completion workflow.
  // ADR-001: Completion Domain Removed from Active Architecture
  resultType?: UnitTaskResultType;
  resultConfig?: UnitTaskResultConfig;
  instructions?: string;
  attentionConfig?: TaskAttentionConfig;
  isActive: boolean;
  stoppedAt?: string;
  createdAt: string;
  updatedAt?: string;
  source?: 'manual' | 'catalog' | 'imported' | 'demo';
  sourceBatchId?: string;
}

export type FYICategory = 
  | 'preference' 
  | 'communication' 
  | 'safety' 
  | 'protocol' 
  | 'medical'
  | 'general';

export interface FYI {
  id: UUID;
  residentId?: UUID; // Optional: if undefined, it's a shared/unit FYI
  roleId?: UUID;     // Optional: specific role scope or all
  shiftId?: UUID;    // Optional: specific shift scope or all
  text: string;
  category: FYICategory;
  importance: 'normal' | 'high' | 'urgent';
  effectiveDate: string;
  expiryDate?: string;
  version: number;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt?: string;
  source?: 'manual' | 'demo';
}

export interface Wound {
  id: UUID;
  residentId: UUID;
  /** Required for new protocols; optional only for legacy records awaiting reassignment. */
  shiftId?: UUID;
  /** Scheduled 24-hour time within the assigned LPN/RN shift. */
  time?: string;
  siteLocation: string;
  status: 'active' | 'healing' | 'resolved';
  firstAction: 'treatment' | 'assessment' | 'dressing_change';
  frequency: RecurrenceFrequency;
  recurrenceRule?: RecurrenceRule;
  bathingRelation: 'independent' | 'before_bath' | 'after_bath' | 'separate_day';
  instructions?: string;
  createdAt: string;
  updatedAt?: string;
  source?: 'manual' | 'demo';
}

/**
 * @deprecated LegacyCompletion — TaskSheet no longer tracks digital task completion.
 * Retained only for safe migration of existing localStorage data.
 * NOT used in any operational UI, generator, or print logic.
 * ADR-001: Completion Domain Removed from Active Architecture (2026-08-24)
 */
export interface LegacyCompletion {
  id: UUID;
  date: string;
  shiftId: UUID;
  entityType: 'resident_task' | 'unit_task';
  entityId: UUID;
  residentId?: UUID;
  completedAt: string;
  completedBy?: string;
  resultValue?: string | number | boolean;
  resultNote?: string;
  actionTaken?: string;
  status: 'completed' | 'not_completed' | 'missed';
}

// Backward-compatible alias so db/index.ts migration reads still compile
export type Completion = LegacyCompletion;

export interface CatalogCategory {
  id: string;
  name: string;
  roleCode?: 'HCA' | 'LPN' | 'RN' | 'SHARED';
  description?: string;
  displayOrder: number;
}

export interface CatalogTaskTemplate {
  id?: string;
  slug: string;
  title: string;
  categoryId: string;
  roleCode: 'HCA' | 'LPN' | 'RN' | 'SHARED';
  recommendedRoleIds?: string[];
  taskScope?: 'RESIDENT';
  carePlanDependent?: boolean;
  authorizationDependent?: boolean;
  defaultPriority?: TaskPriority;
  defaultTime?: string;
  defaultFrequency: RecurrenceFrequency;
  defaultInstructions?: string;
  description?: string;
  synonyms?: string[];
  attentionConfig?: TaskAttentionConfig;
  trackingConfig?: ResidentTrackingConfig;
  isPopular?: boolean;
  isStandardTemplate?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UnitTaskTemplate {
  slug: string;
  title: string;
  roleCode: 'HCA' | 'LPN' | 'RN' | 'SHARED';
  shiftPhase: ShiftPhase;
  defaultTime?: string;
  // resultType drives paper write-in field rendering on printed sheets only
  resultType?: UnitTaskResultType;
  resultConfig?: UnitTaskResultConfig;
  defaultInstructions?: string;
  synonyms?: string[];
  isActive?: boolean;
}

export interface BinderState {
  version: number;
  status: 'current' | 'update_required';
  lastConfirmedAt?: string;
  lastModifiedAt: string;
  pendingChangesCount: number;
}

export interface AppDatabaseState {
  facility: Facility;
  settings: FacilitySettings;
  roles: Role[];
  shifts: Shift[];
  residents: Resident[];
  residentTasks: ResidentTask[];
  unitTasks: UnitTask[];
  fyis: FYI[];
  wounds: Wound[];
  /**
   * @deprecated legacyCompletions — retained for safe migration only.
   * Not rendered in UI. Not used by generator. Not used by print service.
   * ADR-001: Completion Domain Removed from Active Architecture
   */
  legacyCompletions: LegacyCompletion[];
  binderState: BinderState;
  catalogCategories: CatalogCategory[];
  catalogTaskTemplates: CatalogTaskTemplate[];
  unitTaskTemplates: UnitTaskTemplate[];
}
