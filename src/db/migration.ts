import { AppDatabaseState, Resident, ResidentTask, Wound, Role, Shift, FacilitySettings, CatalogTaskTemplate, WoundSupplyProduct, FacilityRoom, OccupancyPosition, ResidentPlacementHistory, ResidentStatus } from '../types';
import { DEFAULT_CARE_TIMING_PRESETS, DEFAULT_FACILITY, EMPTY_FACILITY, DEFAULT_SETTINGS, DEFAULT_ROLES, DEFAULT_SHIFTS, DEFAULT_BINDER_STATE } from '../data/defaultData';
import { ALBERTA_STARTER_CATEGORIES, ALBERTA_TASK_TEMPLATES, STANDARD_UNIT_TASK_TEMPLATES } from '../data/albertaCatalog';
import { WOUND_SUPPLY_CATALOG_SEED } from '../data/woundSupplyCatalog';

export const CURRENT_SCHEMA_VERSION = 3;
const LEGACY_CERTIFICATION_PAIN_PROMPT = 'record clinical value, result, follow-up, and initials on paper.';
export const CURRENT_OCCUPANCY_STATUSES = new Set<ResidentStatus>(['active', 'in_hospital', 'out_on_pass', 'on_hold']);

export const roomKey = (label: string) => label.trim().toLocaleLowerCase();

export const isObsoleteMissingRoomPreset = (preset: { id?: string; name?: string; dataSource?: string; filters?: Array<{ field?: string; operator?: string }> }) =>
  preset.id === 'residents-without-room' || preset.name === 'Residents Without Room' ||
  (preset.dataSource === 'residents' && Boolean(preset.filters?.some(filter => filter.field === 'room' && filter.operator === 'is_empty')));

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function migrateRoomModel(
  rawResidents: Resident[] = [],
  rawRooms: FacilityRoom[] = [],
  rawPositions: OccupancyPosition[] = [],
  rawHistory: ResidentPlacementHistory[] = [],
): Pick<AppDatabaseState, 'residents' | 'rooms' | 'occupancyPositions' | 'residentPlacementHistory'> {
  const now = new Date().toISOString();
  const rooms = rawRooms.map(room => ({ ...room }));
  const positions = rawPositions.map(position => ({ ...position }));
  const history = rawHistory.map(item => ({ ...item }));
  const currentOccupants = new Map<string, string>();

  const ensureSimplePosition = (resident: Resident, label: string): OccupancyPosition => {
    const existing = positions.find(position => roomKey(position.displayLabel) === roomKey(label));
    if (existing) return existing;
    const source = resident.source === 'demo' ? 'demo' : resident.source === 'imported' ? 'imported' : 'manual';
    const room: FacilityRoom = {
      id: generateUUID(), physicalRoomLabel: label, active: true, mode: 'simple', createdAt: now, source,
    };
    const position: OccupancyPosition = {
      id: generateUUID(), roomId: room.id, displayLabel: label, active: true, createdAt: now, source,
    };
    rooms.push(room);
    positions.push(position);
    return position;
  };

  const residents = rawResidents.map(raw => {
    const resident = { ...raw };
    const label = resident.roomNumber?.trim() || '';
    const isCurrent = CURRENT_OCCUPANCY_STATUSES.has(resident.status);
    if (!label) return { ...resident, roomNumber: '', occupancyPositionId: undefined, roomAssignmentNeedsReview: isCurrent };

    const referenced = positions.find(position => position.id === resident.occupancyPositionId);
    const position = referenced || ensureSimplePosition(resident, label);
    const displayLabel = referenced?.displayLabel || label;
    if (!isCurrent) return { ...resident, roomNumber: displayLabel, occupancyPositionId: undefined, roomAssignmentNeedsReview: false };

    const priorResidentId = currentOccupants.get(position.id);
    if (priorResidentId && priorResidentId !== resident.id) {
      return { ...resident, roomNumber: displayLabel, occupancyPositionId: undefined, roomAssignmentNeedsReview: true };
    }
    currentOccupants.set(position.id, resident.id);
    if (!history.some(item => item.residentId === resident.id && item.occupancyPositionId === position.id && !item.endedAt)) {
      history.push({ id: generateUUID(), residentId: resident.id, occupancyPositionId: position.id, displayLabel, startedAt: resident.admittedAt || now });
    }
    return { ...resident, roomNumber: displayLabel, occupancyPositionId: position.id, roomAssignmentNeedsReview: false };
  });
  return { residents, rooms, occupancyPositions: positions, residentPlacementHistory: history };
}

/**
 * Removes a known RC26 print-certification seed defect without changing real
 * pain tasks or any other user-selected tracking configuration.
 */
export function sanitizeLegacyCertificationTracking(task: ResidentTask): ResidentTask {
  const tracking = task.trackingConfig;
  const isKnownBadPrompt = tracking?.kind === 'pain'
    && tracking.prompt?.trim().toLowerCase() === LEGACY_CERTIFICATION_PAIN_PROMPT;
  const taskContext = `${task.title || ''} ${task.category || ''} ${task.instructions || ''}`.toLowerCase();
  const isPainTask = taskContext.includes('pain');

  if (!isKnownBadPrompt || isPainTask) return task;
  const { trackingConfig: _discardedTracking, ...sanitized } = task;
  return sanitized as ResidentTask;
}

export function mergeWoundSupplyCatalog(stored: WoundSupplyProduct[] | undefined): WoundSupplyProduct[] {
  const storedById = new Map((stored || []).map(product => [product.id, product]));
  const seeded = WOUND_SUPPLY_CATALOG_SEED.map(product => ({ ...product, ...(storedById.get(product.id) || {}) }));
  const custom = (stored || []).filter(product => product.provenance === 'user_created' || !WOUND_SUPPLY_CATALOG_SEED.some(seed => seed.id === product.id));
  return [...seeded, ...custom];
}

export function migrateWoundStructure(wound: Wound, catalog: WoundSupplyProduct[] = WOUND_SUPPLY_CATALOG_SEED): Wound {
  const protocol = wound.protocol || wound.instructions;
  const supplies = Array.isArray(wound.supplies) ? wound.supplies.filter(item => item?.name?.trim()).map(item => {
    if (item.catalogId) return item;
    const normalizedName = item.name.trim().toLowerCase();
    const match = catalog.find(product =>
      product.productName.toLowerCase() === normalizedName ||
      (product.productFamily.toLowerCase() === normalizedName && (!item.unitSize || product.size === item.unitSize))
    );
    return match ? {
      ...item,
      catalogId: match.id,
      name: match.productName,
      productFamily: match.productFamily,
      manufacturer: match.manufacturer,
      category: match.category,
      unitSize: match.size,
      unitOfMeasure: item.unitOfMeasure || match.unit,
    } : item;
  }) : [];
  return {
    ...wound,
    protocol,
    supplies,
    assessmentType: wound.assessmentType || (wound.firstAction === 'assessment' ? 'full' : 'none'),
    startDate: wound.startDate || wound.recurrenceRule?.startDate,
    endDate: wound.endDate || wound.recurrenceRule?.endDate,
  };
}

function migrateCategoryName(cat: string, title?: string): string {
  if (!cat) return 'Other';
  const c = cat.toLowerCase();
  const t = (title || '').toLowerCase();

  if (c.includes('hygiene') || c.includes('grooming')) {
    if (t.includes('shower') || t.includes('bath')) return 'Bathing';
    if (t.includes('bedtime') || t.includes('hs ') || t.includes('hour of sleep')) return 'HS Care';
    if (t.includes('evening') || t.includes('pm')) return 'PM Care';
    return 'AM Care';
  }
  if (c.includes('hs care') || c.includes('bedtime') || t.includes('hs care') || t.includes('bedtime')) return 'HS Care';
  if (c.includes('elimination') || c.includes('continence')) return 'Continence & Toileting';
  if (c.includes('mobility') || c.includes('transfer')) {
    if (t.includes('reposition') || t.includes('skin') || t.includes('offload')) return 'Positioning & Skin Care';
    return 'Mobility & Transfers';
  }
  if (c.includes('weights') || c.includes('vital signs')) return 'Health Monitoring';
  if (c.includes('scheduled injection')) return 'Injection';
  if (c.includes('wound') || c.includes('skin care')) return 'Wound Care';
  if (c.includes('catheter')) return 'Catheter / Urinary Care';
  if (c.includes('pain')) return 'Pain / Symptom Management';
  if (c.includes('respiratory')) return 'Respiratory Care';
  if (c.includes('diabetes')) return 'Diabetes Care';
  if (c.includes('nutrition') || c.includes('hydration')) return 'Nutrition & Hydration';
  return cat;
}

export function getInitialState(): AppDatabaseState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    revision: 0,
    facility: { ...EMPTY_FACILITY },
    settings: DEFAULT_SETTINGS,
    roles: DEFAULT_ROLES,
    shifts: [],
    residents: [],
    rooms: [],
    occupancyPositions: [],
    residentPlacementHistory: [],
    residentTasks: [],
    unitTasks: [],
    fyis: [],
    wounds: [],
    woundSupplyCatalog: WOUND_SUPPLY_CATALOG_SEED,
    legacyCompletions: [],
    binderState: DEFAULT_BINDER_STATE,
    catalogCategories: ALBERTA_STARTER_CATEGORIES,
    catalogTaskTemplates: ALBERTA_TASK_TEMPLATES,
    unitTaskTemplates: STANDARD_UNIT_TASK_TEMPLATES,
  };
}

/**
 * Pure schema-upgrade pipeline: takes whatever JSON shape a prior TaskSheet
 * version persisted (localStorage or file) and returns a current-schema
 * AppDatabaseState. Contains no storage I/O — callers decide where the
 * bytes came from and whether/where to persist the upgraded result.
 */
export function migrateLoadedState(parsed: any): AppDatabaseState {
  const storedCollections = [parsed.residents, parsed.residentTasks, parsed.unitTasks, parsed.fyis, parsed.wounds];
  const hasStoredDemoRecords = storedCollections.some(items =>
    Array.isArray(items) && items.some(item => item?.source === 'demo')
  );
  const hasDefaultDemoFacility =
    (parsed.facility?.siteName || DEFAULT_FACILITY.siteName) === DEFAULT_FACILITY.siteName &&
    (parsed.facility?.street || DEFAULT_FACILITY.street) === DEFAULT_FACILITY.street;
  const migratedDataMode: FacilitySettings['dataMode'] =
    parsed.settings?.dataMode || (hasStoredDemoRecords && hasDefaultDemoFacility ? 'demo' : 'operational');
  const migratedSettings: FacilitySettings = {
    ...DEFAULT_SETTINGS,
    ...(parsed.settings || {}),
    dataMode: migratedDataMode,
    careTimingPresets: {
      medicationTimes: parsed.settings?.careTimingPresets?.medicationTimes || DEFAULT_CARE_TIMING_PRESETS.medicationTimes,
      mealTimes: parsed.settings?.careTimingPresets?.mealTimes || DEFAULT_CARE_TIMING_PRESETS.mealTimes,
    },
    savedPrintPresets: (parsed.settings?.savedPrintPresets || []).filter((preset: { id?: string; name?: string; dataSource?: string; filters?: Array<{ field?: string; operator?: string }> }) => !isObsoleteMissingRoomPreset(preset)),
  };
  const defaultShiftIds = new Set(DEFAULT_SHIFTS.map(shift => shift.id));

  // Migrate resident task categories
  const migratedResidentTasks: ResidentTask[] = (parsed.residentTasks || []).map((t: ResidentTask) => {
    const currentTemplate = t.templateSlug
      ? ALBERTA_TASK_TEMPLATES.find(template => template.slug === t.templateSlug)
      : undefined;
    const trackingConfig = t.trackingConfig || currentTemplate?.trackingConfig;
    return sanitizeLegacyCertificationTracking({
      ...t,
      category: migrateCategoryName(t.category, t.title),
      trackingConfig,
      attentionConfig: t.attentionConfig || currentTemplate?.attentionConfig,
    });
  });

  // Migrate shifts with shortCode, isActive, and displayOrder
  const migratedShifts: Shift[] = (parsed.shifts || DEFAULT_SHIFTS).map((s: Shift, idx: number) => {
    let shortCode = s.shortCode;
    if (!shortCode) {
      if (s.name.includes('HCA Day')) shortCode = 'D1';
      else if (s.name.includes('HCA Evening')) shortCode = 'E1';
      else if (s.name.includes('HCA Night')) shortCode = 'N1';
      else if (s.name.includes('LPN Day')) shortCode = 'LP1';
      else if (s.name.includes('LPN Overnight') || s.name.includes('LPN Night')) shortCode = 'NLPN';
      else if (s.name.includes('RN')) shortCode = 'RN1';
      else shortCode = s.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || `S${idx + 1}`;
    }
    return {
      ...s,
      shortCode,
      isActive: s.isActive !== false,
      displayOrder: s.displayOrder ?? (idx + 1),
      source: s.source || (migratedDataMode === 'demo' && defaultShiftIds.has(s.id) ? 'demo' : 'manual'),
    };
  });

  // Wound scheduling became shift-aware after the original schema. Demo
  // protocols may safely use the baseline clinical shift; real legacy
  // protocols stay unassigned until an administrator reviews them.
  const loadedRoles: Role[] = parsed.roles?.length ? parsed.roles : DEFAULT_ROLES;
  const demoClinicalShift = migratedShifts.find(shift => {
    const role = loadedRoles.find(item => item.id === shift.roleId);
    const roleText = `${role?.code || ''} ${role?.name || ''}`.toLowerCase();
    return shift.isActive !== false && (roleText.includes('lpn') || roleText.includes('rn') || roleText.includes('nurse'));
  });
  const woundSupplyCatalog = mergeWoundSupplyCatalog(parsed.woundSupplyCatalog);
  const migratedWounds: Wound[] = (parsed.wounds || []).map((rawWound: Wound) => {
    const wound = migrateWoundStructure(rawWound, woundSupplyCatalog);
    return {
      ...wound,
      shiftId: wound.shiftId || (wound.source === 'demo' ? demoClinicalShift?.id : undefined),
      time: wound.time || (wound.source === 'demo' ? '1000' : undefined),
    };
  });

  // Always enforce current 25 standardized categories and latest starter templates
  // while preserving any custom user templates (isStandardTemplate === false)
  const customTemplates = (parsed.catalogTaskTemplates || []).filter((t: CatalogTaskTemplate) => t.isStandardTemplate === false);
  const mergedTemplates: CatalogTaskTemplate[] = [...ALBERTA_TASK_TEMPLATES, ...customTemplates];

  const roomModel = migrateRoomModel(parsed.residents || [], parsed.rooms || [], parsed.occupancyPositions || [], parsed.residentPlacementHistory || []);
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    facility: parsed.facility || DEFAULT_FACILITY,
    settings: migratedSettings,
    roles: loadedRoles,
    shifts: migratedShifts,
    ...roomModel,
    residentTasks: migratedResidentTasks,
    unitTasks: parsed.unitTasks || [],
    fyis: parsed.fyis || [],
    wounds: migratedWounds,
    woundSupplyCatalog,
    legacyCompletions: parsed.legacyCompletions || parsed.completions || [], // migrate old key
    binderState: parsed.binderState || DEFAULT_BINDER_STATE,
    catalogCategories: ALBERTA_STARTER_CATEGORIES,
    catalogTaskTemplates: mergedTemplates,
    unitTaskTemplates: STANDARD_UNIT_TASK_TEMPLATES,
  } as AppDatabaseState;
}
