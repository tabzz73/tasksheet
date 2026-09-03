import { Facility, FacilityCareTimingSettings, FacilitySettings, FacilityQuickAddPreset, Role, Shift, BinderState, QuickVitalsColumnConfig, PrintProfileConfig, ServiceCoverageDefinition, EmergencyCode, DashboardWidgetConfig } from '../types';
import { DEFAULT_ATTENTION_RULES } from '../services/attention';

export const DEFAULT_FACILITY: Facility = {
  siteName: 'Cedar Grove Continuing Care',
  unitName: 'Unit 2 East',
  street: '123 Example Avenue',
  city: 'Calgary',
  province: 'AB',
  postalCode: 'T2X 1X1',
  mainPhone: '403-555-0100',
  unitPhone: '403-555-0112',
  fax: '403-555-0199',
  additionalExtensions: [
    { id: 'ext_pharmacy', label: 'Pharmacy', number: 'ext 4021', enabled: true },
    { id: 'ext_physio', label: 'Physio', number: 'ext 3110', enabled: true },
    { id: 'ext_charge_rn', label: 'Charge RN', number: 'ext 2001', enabled: true },
  ],
};

export const EMPTY_FACILITY: Facility = {
  siteName: '',
  unitName: '',
  street: '',
  city: '',
  province: 'AB',
  postalCode: '',
  mainPhone: '',
  unitPhone: '',
  fax: '',
  additionalExtensions: [],
};

export const DEFAULT_VITALS_COLUMNS: QuickVitalsColumnConfig[] = [
  { id: 'bp', label: 'Blood Pressure', shortLabel: 'BP', width: '60pt', enabled: true, isSystem: true },
  { id: 'hr', label: 'Heart Rate / Pulse', shortLabel: 'HR', width: '40pt', enabled: true, isSystem: true },
  { id: 'temp', label: 'Temperature', shortLabel: 'Temp', width: '42pt', enabled: true, isSystem: true },
  { id: 'resp', label: 'Respirations', shortLabel: 'Resp', width: '40pt', enabled: true, isSystem: true },
  { id: 'o2', label: 'Oxygen Saturation', shortLabel: 'SpO2', width: '45pt', enabled: true, isSystem: true },
  { id: 'bg', label: 'Blood Glucose', shortLabel: 'BG', width: '45pt', enabled: true, isSystem: false },
  { id: 'pain', label: 'Pain Score (0-10)', shortLabel: 'Pain', width: '40pt', enabled: true, isSystem: false },
  { id: 'bm', label: 'Bowel Movement', shortLabel: 'BM', width: '38pt', enabled: false, isSystem: false },
  { id: 'weight', label: 'Weight (kg/lbs)', shortLabel: 'Wt', width: '45pt', enabled: false, isSystem: false },
  { id: 'initials', label: 'Staff Initials', shortLabel: 'Init', width: '38pt', enabled: true, isSystem: true },
];

export const DEFAULT_HCA_PRINT_PROFILE: PrintProfileConfig = {
  id: 'profile_hca_default',
  name: 'HCA Simple Checklist',
  profileType: 'simple_checklist',
  density: 'standard',
  largePrint: false,
  handoffLinesCount: 3,
  quickVitalsRowsCount: 0,
  quickVitalsColumns: [],
  showStartUnitTasks: true,
  showDuringUnitTasks: true,
  showEndUnitTasks: true,
  showImportantFYIs: true,
  showHandoffLines: true,
};

export const DEFAULT_LPN_PRINT_PROFILE: PrintProfileConfig = {
  id: 'profile_lpn_default',
  name: 'LPN Clinical Worksheet',
  profileType: 'clinical_worksheet',
  density: 'standard',
  largePrint: false,
  handoffLinesCount: 5,
  quickVitalsRowsCount: 8,
  quickVitalsColumns: DEFAULT_VITALS_COLUMNS,
  showStartUnitTasks: true,
  showDuringUnitTasks: true,
  showEndUnitTasks: true,
  showImportantFYIs: true,
  showHandoffLines: true,
};

export const DEFAULT_HCA_QUICK_ADD_PRESETS: FacilityQuickAddPreset[] = [
  {
    id: 'preset_am_care',
    label: 'AM Care',
    subtitle: 'Morning personal care routine',
    category: 'AM Care',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    includedBundledItems: [
      'Morning wash / personal care',
      'Oral care / denture hygiene',
      'Grooming & hair care',
      'Dressing assistance',
      'Morning toileting assistance',
      'Bed / room safety check'
    ],
    options: [
      { id: 'am_complete', label: 'AM Care — Complete', templateSlug: 'am-care-complete', defaultTime: '0800', defaultFrequency: 'daily', isDefaultSelected: true },
      { id: 'am_personal', label: 'Morning Personal Care', templateSlug: 'morning-personal-care', defaultTime: '0800', defaultFrequency: 'daily' },
      { id: 'am_dressing', label: 'Dressing / Grooming Assistance', templateSlug: 'dressing-assistance', defaultTime: '0815', defaultFrequency: 'daily' },
    ],
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'preset_pm_care',
    label: 'PM Care',
    subtitle: 'Evening / bedtime care routine',
    category: 'PM Care',
    roleCode: 'HCA',
    defaultTime: '2000',
    defaultFrequency: 'daily',
    includedBundledItems: [
      'Evening personal care / wash',
      'Oral care',
      'Toileting assistance',
      'Undressing & nightwear',
      'Bed preparation',
      'Comfort & call bell safety check'
    ],
    options: [
      { id: 'pm_complete', label: 'PM Care — Complete', templateSlug: 'pm-care-complete', defaultTime: '2000', defaultFrequency: 'daily', isDefaultSelected: true },
      { id: 'pm_personal', label: 'Evening Personal Care', templateSlug: 'evening-care', defaultTime: '1930', defaultFrequency: 'daily' },
      { id: 'pm_bedtime', label: 'Bedtime Care', templateSlug: 'bedtime-care', defaultTime: '2030', defaultFrequency: 'daily' },
    ],
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'preset_toileting',
    label: 'Toileting Assistance',
    subtitle: 'Scheduled or as care planned',
    category: 'Toileting & Hygiene',
    roleCode: 'HCA',
    defaultTime: '0900',
    defaultFrequency: 'daily',
    options: [
      { id: 'toil_assist', label: 'Toileting Assistance', templateSlug: 'toileting-assistance', defaultTime: '0900', defaultFrequency: 'daily', isDefaultSelected: true },
      { id: 'toil_sched', label: 'Scheduled Toileting', templateSlug: 'scheduled-toileting', defaultTime: '1000', defaultFrequency: 'daily' },
      { id: 'toil_brief', label: 'Continence / Brief Change', templateSlug: 'continence-care', defaultTime: '1330', defaultFrequency: 'daily' },
    ],
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'preset_meals',
    label: 'Meal Assistance',
    subtitle: 'Escort, setup, cueing or feeding',
    category: 'Nutrition & Meals',
    roleCode: 'HCA',
    defaultTime: '0815',
    defaultFrequency: 'daily',
    options: [
      { id: 'meal_escort', label: 'Escort / Porter to Meal', templateSlug: 'escort-dining-room', defaultTime: '0815', defaultFrequency: 'daily', isDefaultSelected: true },
      { id: 'meal_setup', label: 'Meal Setup', templateSlug: 'meal-setup', defaultTime: '0820', defaultFrequency: 'daily' },
      { id: 'meal_delivery', label: 'Meal Delivery to Room', templateSlug: 'meal-tray-delivery', defaultTime: '0825', defaultFrequency: 'daily' },
      { id: 'meal_cueing', label: 'Meal Reminder / Cueing', templateSlug: 'meal-reminders', defaultTime: '0815', defaultFrequency: 'daily' },
      { id: 'meal_feeding', label: 'Feeding Assistance', templateSlug: 'feeding-assistance', defaultTime: '0830', defaultFrequency: 'daily' },
    ],
    isActive: true,
    displayOrder: 4,
  },
  {
    id: 'preset_med_assist',
    label: 'Medication Assistance',
    subtitle: 'MAP1 / MAP2 / MAP3 authorized support',
    category: 'Medication Assistance',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    options: [
      { id: 'map1', label: 'MAP1 — Medication Reminder', templateSlug: 'map1-medication-reminder', defaultTime: '0800', defaultFrequency: 'daily', defaultInstructions: 'Reminder only according to resident care plan.', isDefaultSelected: true },
      { id: 'map2', label: 'MAP2 — Partial Medication Assistance', templateSlug: 'map2-partial-assistance', defaultTime: '0800', defaultFrequency: 'daily', defaultInstructions: 'Resident participates; provide partial assistance per care plan.' },
      { id: 'map3', label: 'MAP3 — Full Medication Assistance', templateSlug: 'map3-full-assistance', defaultTime: '0800', defaultFrequency: 'daily', defaultInstructions: 'Full assistance per authorized care plan and facility protocol.' },
    ],
    isActive: true,
    displayOrder: 5,
  },
  {
    id: 'preset_mobility',
    label: 'Mobility & Transfers',
    subtitle: 'Walking, transfer or positioning',
    category: 'Mobility & Transfers',
    roleCode: 'HCA',
    defaultTime: '0930',
    defaultFrequency: 'daily',
    options: [
      { id: 'mob_walking', label: 'Walking / Ambulation Assistance', templateSlug: 'ambulation-assistance', defaultTime: '0930', defaultFrequency: 'daily', isDefaultSelected: true },
      { id: 'mob_1p', label: 'One-Person Transfer Assistance', templateSlug: 'one-person-transfer', defaultTime: '0800', defaultFrequency: 'daily' },
      { id: 'mob_2p', label: 'Two-Person Transfer Assistance', templateSlug: 'two-person-transfer', defaultTime: '0800', defaultFrequency: 'daily' },
      { id: 'mob_mech', label: 'Mechanical Lift Transfer', templateSlug: 'mechanical-lift-transfer', defaultTime: '0800', defaultFrequency: 'daily' },
      { id: 'mob_sittostand', label: 'Sit-to-Stand Transfer', templateSlug: 'sit-to-stand-transfer', defaultTime: '0800', defaultFrequency: 'daily' },
      { id: 'mob_reposition', label: 'Repositioning Assistance', templateSlug: 'repositioning', defaultTime: '1000', defaultFrequency: 'daily' },
      { id: 'mob_wheelchair', label: 'Wheelchair Assistance', templateSlug: 'wheelchair-transfer', defaultTime: '0830', defaultFrequency: 'daily' },
    ],
    isActive: true,
    displayOrder: 6,
  },
  {
    id: 'preset_bathing',
    label: 'Bathing Assistance',
    subtitle: 'Shower, tub or bed bath',
    category: 'Bathing & Hygiene',
    roleCode: 'HCA',
    defaultTime: '1000',
    defaultFrequency: 'weekly',
    options: [
      { id: 'bath_shower', label: 'Shower Assistance', templateSlug: 'shower-assistance', defaultTime: '1000', defaultFrequency: 'weekly', isDefaultSelected: true },
      { id: 'bath_tub', label: 'Tub Bath Assistance', templateSlug: 'tub-bath-assistance', defaultTime: '1000', defaultFrequency: 'weekly' },
      { id: 'bath_bed', label: 'Bed Bath Assistance', templateSlug: 'bed-bath', defaultTime: '0930', defaultFrequency: 'weekly' },
      { id: 'bath_escort', label: 'Bathing Setup / Escort', templateSlug: 'bathing-setup-escort', defaultTime: '0945', defaultFrequency: 'weekly' },
    ],
    isActive: true,
    displayOrder: 7,
  },
  {
    id: 'preset_stockings',
    label: 'Compression Stockings',
    subtitle: 'Apply morning / remove evening',
    category: 'Dressing & Mobility',
    roleCode: 'HCA',
    defaultTime: '0800',
    defaultFrequency: 'daily',
    options: [
      { id: 'stock_apply', label: 'Compression Stocking Assistance — Apply', templateSlug: 'compression-stockings-apply', defaultTime: '0800', defaultFrequency: 'daily', isDefaultSelected: true },
      { id: 'stock_remove', label: 'Compression Stocking Assistance — Remove', templateSlug: 'compression-stockings-remove', defaultTime: '2000', defaultFrequency: 'daily' },
    ],
    isActive: true,
    displayOrder: 8,
  },
  {
    id: 'preset_catheter',
    label: 'Catheter Care Support',
    subtitle: 'Bag emptying & drainage observation',
    category: 'Catheter & Elimination',
    roleCode: 'HCA',
    defaultTime: '1400',
    defaultFrequency: 'daily',
    options: [
      { id: 'cath_empty', label: 'Catheter Bag Emptying', templateSlug: 'catheter-bag-empty', defaultTime: '1400', defaultFrequency: 'daily', isDefaultSelected: true },
      { id: 'cath_obs', label: 'Catheter Drainage Observation', templateSlug: 'catheter-observation', defaultTime: '1000', defaultFrequency: 'daily' },
      { id: 'cath_pos', label: 'Catheter Tubing / Bag Position Check', templateSlug: 'catheter-position-check', defaultTime: '0800', defaultFrequency: 'daily' },
      { id: 'cath_hyg', label: 'Catheter Hygiene as Care Planned', templateSlug: 'catheter-hygiene', defaultTime: '0830', defaultFrequency: 'daily' },
    ],
    isActive: true,
    displayOrder: 9,
  },
  {
    id: 'preset_exercise',
    label: 'Exercise / Activity',
    subtitle: 'Walking program, ROM or exercises',
    category: 'Exercise & Activity',
    roleCode: 'HCA',
    defaultTime: '1030',
    defaultFrequency: 'daily',
    options: [
      { id: 'ex_program', label: 'Exercise Program Assistance', templateSlug: 'exercise-program', defaultTime: '1030', defaultFrequency: 'daily', isDefaultSelected: true },
      { id: 'ex_walking', label: 'Walking Program', templateSlug: 'walking-program', defaultTime: '1100', defaultFrequency: 'daily' },
      { id: 'ex_rom', label: 'Range of Motion Assistance', templateSlug: 'range-of-motion', defaultTime: '1030', defaultFrequency: 'daily' },
      { id: 'ex_chair', label: 'Chair Exercise Assistance', templateSlug: 'chair-exercise', defaultTime: '1400', defaultFrequency: 'daily' },
    ],
    isActive: true,
    displayOrder: 10,
  },
];

export const DEFAULT_CARE_TIMING_PRESETS: FacilityCareTimingSettings = {
  medicationTimes: [
    { id: 'med-0800', label: 'Morning medications', time: '0800', isActive: true },
    { id: 'med-1200', label: 'Noon medications', time: '1200', isActive: true },
    { id: 'med-1700', label: 'Evening medications', time: '1700', isActive: true },
    { id: 'med-2100', label: 'Bedtime medications', time: '2100', isActive: true },
  ],
  mealTimes: [
    { id: 'meal-breakfast', label: 'Breakfast', time: '0800', isActive: true },
    { id: 'meal-lunch', label: 'Lunch', time: '1200', isActive: true },
    { id: 'meal-dinner', label: 'Dinner', time: '1700', isActive: true },
  ],
};

export const DEFAULT_SERVICE_COVERAGE_DEFINITIONS: ServiceCoverageDefinition[] = [
  { id: 'coverage-funded', code: 'FUNDED', name: 'Funded / Authorized', shortCode: '', isExceptional: false, isActive: true, isSystem: true, sortOrder: 1 },
  { id: 'coverage-private-pay', code: 'PRIVATE_PAY', name: 'Private Pay', shortCode: '$', icon: '$', isExceptional: true, isActive: true, isSystem: true, sortOrder: 2 },
  { id: 'coverage-complimentary', code: 'COMPLIMENTARY', name: 'Complimentary', shortCode: 'COMP', icon: '★', isExceptional: true, isActive: true, isSystem: true, sortOrder: 3 },
  { id: 'coverage-facility', code: 'FACILITY_INCLUDED', name: 'Facility Included', shortCode: 'INC', isExceptional: true, isActive: true, isSystem: true, sortOrder: 4 },
  { id: 'coverage-temporary', code: 'TEMPORARY_EXCEPTION', name: 'Temporary Exception', shortCode: '!', icon: '!', isExceptional: true, isActive: true, isSystem: true, sortOrder: 5 },
  { id: 'coverage-custom', code: 'CUSTOM', name: 'Custom / Other', shortCode: 'OTHER', isExceptional: true, isActive: true, isSystem: true, sortOrder: 6 },
];

/**
 * Seed reference only — verified against Alberta Health Services Policy
 * #1181 "Emergency and Disaster Management" (revision effective February
 * 10, 2025), Appendix A: Emergency Response Codes/Plans. Fully editable in
 * Settings — a site's own Emergency Response Manual remains authoritative,
 * and TaskSheet does not present this list as official AHS policy.
 */
export const DEFAULT_EMERGENCY_CODES: EmergencyCode[] = [
  { id: 'code-blue', code: 'Blue', name: 'Cardiac Arrest / Medical Emergency', isSystem: true },
  { id: 'code-red', code: 'Red', name: 'Fire', isSystem: true },
  { id: 'code-white', code: 'White', name: 'Violence / Aggression', isSystem: true },
  { id: 'code-purple', code: 'Purple', name: 'Hostage', isSystem: true },
  { id: 'code-yellow', code: 'Yellow', name: 'Missing Person', isSystem: true },
  { id: 'code-black', code: 'Black', name: 'Bomb Threat', isSystem: true },
  { id: 'code-grey', code: 'Grey', name: 'Air Quality Concerns', isSystem: true },
  { id: 'code-green', code: 'Green', name: 'Evacuation', isSystem: true },
  { id: 'code-brown', code: 'Brown', name: 'Hazardous Spill / Release', isSystem: true },
  { id: 'code-orange', code: 'Orange', name: 'Mass Casualty Incident', isSystem: true },
];

export const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetConfig[] = [
  { id: 'unit_situation', visible: true },
  { id: 'resident_attention', visible: true },
  { id: 'resident_follow_up', visible: true },
  { id: 'latest_fyi', visible: true },
  { id: 'away_from_unit', visible: true },
  { id: 'code_of_month', visible: true },
  { id: 'todays_bathing', visible: false },
  { id: 'wound_attention', visible: false },
];

export const DEFAULT_SETTINGS: FacilitySettings = {
  timezone: 'America/Edmonton',
  timeFormat: '24h',
  operationalWeekStartsOn: 1,
  developerFooterEnabled: false,
  firstRunCompleted: false,
  dataMode: 'setup_required',
  printProfiles: [DEFAULT_HCA_PRINT_PROFILE, DEFAULT_LPN_PRINT_PROFILE],
  branding: {
    headerStyle: 'standard',
    shiftHeaderFormat: 'short_code_only',
    confidentialityNotice: 'CONFIDENTIAL HEALTHCARE RECORD — FOR AUTHORIZED FACILITY USE ONLY. DISPOSE VIA SECURE SHREDDING AT END OF SHIFT.',
    showConfidentialityNotice: true,
    showSupervisorSignatureBlock: true,
    watermarkStyle: 'none',
  },
  quickAddPresets: DEFAULT_HCA_QUICK_ADD_PRESETS,
  attentionRules: DEFAULT_ATTENTION_RULES,
  smartSuggestionsEnabled: true,
  careTimingPresets: DEFAULT_CARE_TIMING_PRESETS,
  serviceCoverageDefinitions: DEFAULT_SERVICE_COVERAGE_DEFINITIONS,
  welcomeHero: {
    showWelcomePage: 'on_first_launch',
    showWhyTaskSheetContent: true,
  },
  emergencyCodes: DEFAULT_EMERGENCY_CODES,
  codeOfTheMonthEnabled: false,
  dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
};

export const ROLE_HCA_ID = 'role-hca-0001';
export const ROLE_LPN_ID = 'role-lpn-0002';
export const ROLE_RN_ID = 'role-rn-0003';
export const ROLE_SUP_ID = 'role-sup-0004';

export const DEFAULT_ROLES: Role[] = [
  {
    id: ROLE_HCA_ID,
    name: 'Health Care Aide',
    code: 'HCA',
    description: 'Direct personal care, mobility, hygiene, nutrition, and observation assistance.',
    defaultPrintProfile: 'simple_checklist',
    isSystem: true
  },
  {
    id: ROLE_LPN_ID,
    name: 'Licensed Practical Nurse',
    code: 'LPN',
    description: 'Clinical nursing assessments, vital signs, medication administration, wound care, and treatments.',
    defaultPrintProfile: 'clinical_worksheet',
    isSystem: true
  },
  {
    id: ROLE_RN_ID,
    name: 'Registered Nurse',
    code: 'RN',
    description: 'Comprehensive clinical care, complex care coordination, advanced assessments, and leadership.',
    defaultPrintProfile: 'clinical_worksheet',
    isSystem: true
  },
  {
    id: ROLE_SUP_ID,
    name: 'Shift Supervisor / Lead',
    code: 'SUP',
    description: 'Unit coordination, shift assignment oversight, and clinical supervision.',
    defaultPrintProfile: 'clinical_worksheet',
    isSystem: true
  }
];

export const SHIFT_HCA_DAY_ID = 'shift-hca-day-001';
export const SHIFT_HCA_EVE_ID = 'shift-hca-eve-002';
export const SHIFT_LPN_DAY_ID = 'shift-lpn-day-003';
export const SHIFT_LPN_NIGHT_ID = 'shift-lpn-night-004';
export const SHIFT_RN_DAY_ID = 'shift-rn-day-005';

export const DEFAULT_SHIFTS: Shift[] = [
  {
    id: SHIFT_HCA_DAY_ID,
    roleId: ROLE_HCA_ID,
    name: 'HCA Day',
    shortCode: 'D1',
    startTime: '0700',
    endTime: '1500',
    isActive: true,
    displayOrder: 1,
    description: 'Daytime personal care, morning routines, breakfast/lunch assistance, and mobilization.',
    source: 'demo',
  },
  {
    id: SHIFT_HCA_EVE_ID,
    roleId: ROLE_HCA_ID,
    name: 'HCA Evening',
    shortCode: 'E1',
    startTime: '1500',
    endTime: '2300',
    isActive: true,
    displayOrder: 2,
    description: 'Evening care routines, dinner assistance, bedtime preparation, and safety rounds.',
    source: 'demo',
  },
  {
    id: SHIFT_LPN_DAY_ID,
    roleId: ROLE_LPN_ID,
    name: 'LPN Day',
    shortCode: 'LP1',
    startTime: '0700',
    endTime: '1900',
    isActive: true,
    displayOrder: 3,
    description: '12-hour day clinical shift: morning/lunch vitals, diabetes care, medication rounds, wound care.',
    source: 'demo',
  },
  {
    id: SHIFT_LPN_NIGHT_ID,
    roleId: ROLE_LPN_ID,
    name: 'LPN Overnight',
    shortCode: 'NLPN',
    startTime: '2300',
    endTime: '0700',
    isActive: true,
    displayOrder: 4,
    description: 'Overnight clinical monitoring, safety checks, morning preparation, and night handoff.',
    source: 'demo',
  },
  {
    id: SHIFT_RN_DAY_ID,
    roleId: ROLE_RN_ID,
    name: 'RN Day',
    shortCode: 'RN1',
    startTime: '0700',
    endTime: '1900',
    isActive: true,
    displayOrder: 5,
    description: '12-hour RN charge and clinical coordination.',
    source: 'demo',
  }
];

export const DEFAULT_BINDER_STATE: BinderState = {
  version: 1,
  status: 'current',
  lastConfirmedAt: new Date().toISOString(),
  lastModifiedAt: new Date().toISOString(),
  pendingChangesCount: 0
};
