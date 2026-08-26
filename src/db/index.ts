import { AppDatabaseState, Resident, ResidentTask, UnitTask, FYI, Wound, Completion, LegacyCompletion, Role, Shift, Facility, FacilitySettings, BinderState, CatalogCategory, CatalogTaskTemplate, UnitTaskTemplate, FacilityQuickAddPreset, FacilityAttentionRule } from '../types';
import { DEFAULT_CARE_TIMING_PRESETS, DEFAULT_FACILITY, EMPTY_FACILITY, DEFAULT_SETTINGS, DEFAULT_ROLES, DEFAULT_SHIFTS, DEFAULT_BINDER_STATE, DEFAULT_HCA_QUICK_ADD_PRESETS } from '../data/defaultData';
import { DEFAULT_ATTENTION_RULES } from '../services/attention';
import { ALBERTA_STARTER_CATEGORIES, ALBERTA_TASK_TEMPLATES, STANDARD_UNIT_TASK_TEMPLATES } from '../data/albertaCatalog';
import { generateDemoData } from '../data/demoSeed';

const STORAGE_KEY = 'tasksheet_v1_db_state_v2';
const LEGACY_STORAGE_KEY = 'tasksheet_v1_db_state';

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

function getInitialState(): AppDatabaseState {
  return {
    facility: { ...EMPTY_FACILITY },
    settings: DEFAULT_SETTINGS,
    roles: DEFAULT_ROLES,
    shifts: [],
    residents: [],
    residentTasks: [],
    unitTasks: [],
    fyis: [],
    wounds: [],
    legacyCompletions: [],
    binderState: DEFAULT_BINDER_STATE,
    catalogCategories: ALBERTA_STARTER_CATEGORIES,
    catalogTaskTemplates: ALBERTA_TASK_TEMPLATES,
    unitTaskTemplates: STANDARD_UNIT_TASK_TEMPLATES
  };
}

class DatabaseService {
  private state: AppDatabaseState;
  private listeners: Array<(state: AppDatabaseState) => void> = [];

  constructor() {
    this.state = this.loadFromStorage();
  }

  private loadFromStorage(): AppDatabaseState {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        let stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
          stored = window.localStorage.getItem(LEGACY_STORAGE_KEY);
        }

        if (stored) {
          const parsed = JSON.parse(stored);

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
          };
          const defaultShiftIds = new Set(DEFAULT_SHIFTS.map(shift => shift.id));

          // Migrate resident task categories
          const migratedResidentTasks: ResidentTask[] = (parsed.residentTasks || []).map((t: ResidentTask) => {
            const currentTemplate = t.templateSlug
              ? ALBERTA_TASK_TEMPLATES.find(template => template.slug === t.templateSlug)
              : undefined;
            const trackingConfig = t.trackingConfig || currentTemplate?.trackingConfig;
            return {
              ...t,
              category: migrateCategoryName(t.category, t.title),
              trackingConfig,
              attentionConfig: t.attentionConfig || currentTemplate?.attentionConfig,
            };
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

          // Always enforce current 25 standardized categories and latest starter templates
          // while preserving any custom user templates (isStandardTemplate === false)
          const customTemplates = (parsed.catalogTaskTemplates || []).filter((t: CatalogTaskTemplate) => t.isStandardTemplate === false);
          const mergedTemplates: CatalogTaskTemplate[] = [...ALBERTA_TASK_TEMPLATES, ...customTemplates];

          const loadedState: AppDatabaseState = {
            facility: parsed.facility || DEFAULT_FACILITY,
            settings: migratedSettings,
            roles: parsed.roles?.length ? parsed.roles : DEFAULT_ROLES,
            shifts: migratedShifts,
            residents: parsed.residents || [],
            residentTasks: migratedResidentTasks,
            unitTasks: parsed.unitTasks || [],
            fyis: parsed.fyis || [],
            wounds: parsed.wounds || [],
            legacyCompletions: parsed.legacyCompletions || parsed.completions || [], // migrate old key
            binderState: parsed.binderState || DEFAULT_BINDER_STATE,
            catalogCategories: ALBERTA_STARTER_CATEGORIES,
            catalogTaskTemplates: mergedTemplates,
            unitTaskTemplates: STANDARD_UNIT_TASK_TEMPLATES
          };

          // Save upgraded state to storage
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedState));
          return loadedState;
        }
      }
    } catch (e) {
      console.error('Failed to load database state from storage, initializing fresh:', e);
    }
    const initial = getInitialState();
    this.saveToStorage(initial);
    return initial;
  }

  private saveToStorage(newState: AppDatabaseState): void {
    this.state = newState;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      }
    } catch (e) {
      console.error('Failed to save database state to localStorage:', e);
    }
    this.notifyListeners();
  }

  public subscribe(listener: (state: AppDatabaseState) => void): () => void {
    this.listeners.push(listener);
    listener(this.state);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public getState(): AppDatabaseState {
    return this.state;
  }

  // Facility & Settings
  public updateFacility(facility: Partial<Facility>): void {
    const updatedFacility = { ...this.state.facility, ...facility };
    const completesRealSetup =
      this.state.settings.dataMode === 'setup_required' &&
      updatedFacility.siteName.trim() !== '' &&
      updatedFacility.street.trim() !== '' &&
      updatedFacility.city.trim() !== '' &&
      updatedFacility.postalCode.trim() !== '' &&
      updatedFacility.mainPhone.trim() !== '' &&
      this.state.shifts.some(shift => shift.source !== 'demo');
    this.saveToStorage({
      ...this.state,
      facility: updatedFacility,
      settings: completesRealSetup
        ? { ...this.state.settings, dataMode: 'operational', firstRunCompleted: true }
        : this.state.settings,
    });
  }

  public updateSettings(settings: Partial<FacilitySettings>): void {
    this.saveToStorage({
      ...this.state,
      settings: { ...this.state.settings, ...settings }
    });
  }

  public updateFacilitySettings(settings: Partial<FacilitySettings>): void {
    this.updateSettings(settings);
  }

  // Quick Add Presets
  public getQuickAddPresets(): FacilityQuickAddPreset[] {
    return this.state.settings.quickAddPresets || DEFAULT_HCA_QUICK_ADD_PRESETS;
  }

  public updateQuickAddPresets(presets: FacilityQuickAddPreset[]): void {
    this.updateSettings({
      quickAddPresets: presets
    });
  }

  public resetQuickAddPresets(): void {
    this.updateSettings({
      quickAddPresets: DEFAULT_HCA_QUICK_ADD_PRESETS
    });
  }

  // Attention Rules
  public getAttentionRules(): FacilityAttentionRule[] {
    return this.state.settings.attentionRules || DEFAULT_ATTENTION_RULES;
  }

  public updateAttentionRules(rules: FacilityAttentionRule[]): void {
    this.updateSettings({
      attentionRules: rules
    });
  }

  public resetAttentionRules(): void {
    this.updateSettings({
      attentionRules: DEFAULT_ATTENTION_RULES
    });
  }

  public setSmartSuggestionsEnabled(enabled: boolean): void {
    this.updateSettings({
      smartSuggestionsEnabled: enabled
    });
  }

  // Roles & Shifts
  public addRole(role: Omit<Role, 'id'>): Role {
    const newRole: Role = { ...role, id: generateUUID() };
    this.saveToStorage({
      ...this.state,
      roles: [...this.state.roles, newRole]
    });
    return newRole;
  }

  public updateRole(id: string, updates: Partial<Role>): void {
    this.saveToStorage({
      ...this.state,
      roles: this.state.roles.map(r => r.id === id ? { ...r, ...updates } : r)
    });
  }

  public deleteRole(id: string): void {
    this.saveToStorage({
      ...this.state,
      roles: this.state.roles.filter(r => r.id !== id)
    });
  }

  public addShift(shift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'>): Shift {
    const trimmedCode = shift.shortCode ? shift.shortCode.trim() : '';
    if (!trimmedCode) throw new Error('Shift Short Name / Code is required.');
    
    const isAct = shift.isActive !== false;
    if (isAct) {
      const conflict = this.state.shifts.find(s => 
        s.isActive !== false && 
        s.shortCode.trim().toUpperCase() === trimmedCode.toUpperCase()
      );
      if (conflict) {
        throw new Error(`'${trimmedCode}' is already being used by another active shift (${conflict.name}). Choose a different short name.`);
      }
    }

    const newShift: Shift = {
      ...shift,
      id: generateUUID(),
      shortCode: trimmedCode,
      isActive: isAct,
      displayOrder: shift.displayOrder ?? (this.state.shifts.length + 1),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: shift.source || 'manual',
    };

    const completesRealSetup =
      this.state.settings.dataMode === 'setup_required' &&
      this.state.facility.siteName.trim() !== '' &&
      this.state.facility.street.trim() !== '' &&
      this.state.facility.city.trim() !== '' &&
      this.state.facility.postalCode.trim() !== '' &&
      this.state.facility.mainPhone.trim() !== '';
    this.saveToStorage({
      ...this.state,
      shifts: [...this.state.shifts, newShift],
      settings: completesRealSetup
        ? { ...this.state.settings, dataMode: 'operational', firstRunCompleted: true }
        : this.state.settings,
    });
    return newShift;
  }

  public updateShift(id: string, updates: Partial<Shift>): Shift {
    const current = this.state.shifts.find(s => s.id === id);
    if (!current) throw new Error('Shift not found.');

    const targetIsActive = updates.isActive !== undefined ? updates.isActive : (current.isActive !== false);
    const targetShortCode = (updates.shortCode !== undefined ? updates.shortCode : current.shortCode).trim();

    if (!targetShortCode) throw new Error('Shift Short Name / Code cannot be empty.');

    if (targetIsActive) {
      const conflict = this.state.shifts.find(s => 
        s.id !== id && 
        s.isActive !== false && 
        s.shortCode.trim().toUpperCase() === targetShortCode.toUpperCase()
      );
      if (conflict) {
        throw new Error(`'${targetShortCode}' is already being used by another active shift (${conflict.name}). Choose a different short name.`);
      }
    }

    const updatedShift: Shift = {
      ...current,
      ...updates,
      shortCode: targetShortCode,
      isActive: targetIsActive,
      updatedAt: new Date().toISOString()
    };

    this.saveToStorage({
      ...this.state,
      shifts: this.state.shifts.map(s => s.id === id ? updatedShift : s)
    });
    return updatedShift;
  }

  public duplicateShift(id: string, overrides?: { name?: string; shortCode?: string; startTime?: string; endTime?: string; roleId?: string }): Shift {
    const source = this.state.shifts.find(s => s.id === id);
    if (!source) throw new Error('Shift to duplicate not found.');

    let proposedCode = overrides?.shortCode?.trim();
    if (!proposedCode) {
      let counter = 2;
      proposedCode = `${source.shortCode}${counter}`;
      while (this.state.shifts.some(s => s.isActive !== false && s.shortCode.trim().toUpperCase() === proposedCode.toUpperCase())) {
        counter++;
        proposedCode = `${source.shortCode}${counter}`;
      }
    }

    return this.addShift({
      name: overrides?.name || `${source.name} 2`,
      shortCode: proposedCode,
      roleId: overrides?.roleId || source.roleId,
      startTime: overrides?.startTime || source.startTime,
      endTime: overrides?.endTime || source.endTime,
      description: source.description,
      isActive: true,
      displayOrder: this.state.shifts.length + 1
    });
  }

  public deactivateShift(id: string): void {
    this.updateShift(id, { isActive: false });
  }

  public reactivateShift(id: string): void {
    this.updateShift(id, { isActive: true });
  }

  public deleteShift(id: string): { success: boolean; error?: string } {
    const assignedResidentTasks = this.state.residentTasks.filter(t => t.shiftId === id && t.isActive !== false);
    const assignedUnitTasks = this.state.unitTasks.filter(u => u.shiftId === id && u.isActive !== false);
    
    if (assignedResidentTasks.length > 0 || assignedUnitTasks.length > 0) {
      return {
        success: false,
        error: `Cannot delete shift. It currently has ${assignedResidentTasks.length} active resident task(s) and ${assignedUnitTasks.length} active unit task(s). Deactivate the shift instead, or reassign its tasks.`
      };
    }

    this.saveToStorage({
      ...this.state,
      shifts: this.state.shifts.filter(s => s.id !== id)
    });
    return { success: true };
  }

  public reorderShifts(orderedIds: string[]): void {
    const updated = [...this.state.shifts];
    orderedIds.forEach((id, index) => {
      const item = updated.find(s => s.id === id);
      if (item) item.displayOrder = index + 1;
    });
    updated.sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
    this.saveToStorage({
      ...this.state,
      shifts: updated
    });
  }

  // Residents (with strict Room-Reuse Isolation)
  public addResident(resident: Omit<Resident, 'id'>): Resident {
    const newResident: Resident = {
      ...resident,
      id: generateUUID(),
      source: resident.source || 'manual'
    };
    this.saveToStorage({
      ...this.state,
      residents: [...this.state.residents, newResident]
    });
    return newResident;
  }

  public updateResident(id: string, updates: Partial<Resident>): void {
    this.saveToStorage({
      ...this.state,
      residents: this.state.residents.map(r => r.id === id ? { ...r, ...updates } : r)
    });
  }

  public deleteResident(id: string): void {
    this.saveToStorage({
      ...this.state,
      residents: this.state.residents.filter(r => r.id !== id),
      residentTasks: this.state.residentTasks.filter(t => t.residentId !== id),
      wounds: this.state.wounds.filter(w => w.residentId !== id),
      fyis: this.state.fyis.filter(f => f.residentId !== id)
    });
  }

  // Resident Tasks
  public addResidentTask(task: Omit<ResidentTask, 'id' | 'createdAt' | 'isActive'>): ResidentTask {
    const newTask: ResidentTask = {
      ...task,
      id: generateUUID(),
      isActive: true,
      createdAt: new Date().toISOString(),
      source: task.source || 'manual'
    };
    this.saveToStorage({
      ...this.state,
      residentTasks: [...this.state.residentTasks, newTask]
    });
    return newTask;
  }

  public addMultipleResidentTasks(tasks: Array<Omit<ResidentTask, 'id' | 'createdAt' | 'isActive'>>): ResidentTask[] {
    const newTasks: ResidentTask[] = tasks.map(t => ({
      ...t,
      id: generateUUID(),
      isActive: true,
      createdAt: new Date().toISOString(),
      source: t.source || 'manual'
    }));
    this.saveToStorage({
      ...this.state,
      residentTasks: [...this.state.residentTasks, ...newTasks]
    });
    return newTasks;
  }

  public updateResidentTask(id: string, updates: Partial<ResidentTask>): void {
    this.saveToStorage({
      ...this.state,
      residentTasks: this.state.residentTasks.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
    });
  }

  public stopResidentTask(id: string): void {
    this.saveToStorage({
      ...this.state,
      residentTasks: this.state.residentTasks.map(t => t.id === id ? { 
        ...t, 
        isActive: false, 
        stoppedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      } : t)
    });
  }

  public reactivateResidentTask(id: string): void {
    this.saveToStorage({
      ...this.state,
      residentTasks: this.state.residentTasks.map(t => t.id === id ? { 
        ...t, 
        isActive: true, 
        stoppedAt: undefined,
        updatedAt: new Date().toISOString() 
      } : t)
    });
  }

  public duplicateResidentTask(id: string, overrides: Partial<ResidentTask> = {}): ResidentTask | null {
    const source = this.state.residentTasks.find(t => t.id === id);
    if (!source) return null;
    const newTask: ResidentTask = {
      ...source,
      ...overrides,
      id: generateUUID(),
      isActive: true,
      stoppedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: undefined
    };
    this.saveToStorage({
      ...this.state,
      residentTasks: [...this.state.residentTasks, newTask]
    });
    return newTask;
  }

  public deleteResidentTask(id: string): void {
    this.saveToStorage({
      ...this.state,
      residentTasks: this.state.residentTasks.filter(t => t.id !== id)
    });
  }

  // Unit Tasks
  public addUnitTask(task: Omit<UnitTask, 'id' | 'createdAt' | 'isActive'>): UnitTask {
    const newTask: UnitTask = {
      ...task,
      id: generateUUID(),
      isActive: true,
      createdAt: new Date().toISOString(),
      source: task.source || 'manual'
    };
    this.saveToStorage({
      ...this.state,
      unitTasks: [...this.state.unitTasks, newTask]
    });
    return newTask;
  }

  public updateUnitTask(id: string, updates: Partial<UnitTask>): void {
    this.saveToStorage({
      ...this.state,
      unitTasks: this.state.unitTasks.map(u => u.id === id ? { ...u, ...updates, updatedAt: new Date().toISOString() } : u)
    });
  }

  public stopUnitTask(id: string): void {
    this.saveToStorage({
      ...this.state,
      unitTasks: this.state.unitTasks.map(u => u.id === id ? { 
        ...u, 
        isActive: false, 
        stoppedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString() 
      } : u)
    });
  }

  public reactivateUnitTask(id: string): void {
    this.saveToStorage({
      ...this.state,
      unitTasks: this.state.unitTasks.map(u => u.id === id ? { 
        ...u, 
        isActive: true, 
        stoppedAt: undefined,
        updatedAt: new Date().toISOString() 
      } : u)
    });
  }

  public duplicateUnitTask(id: string, overrides: Partial<UnitTask> = {}): UnitTask | null {
    const source = this.state.unitTasks.find(u => u.id === id);
    if (!source) return null;
    const newTask: UnitTask = {
      ...source,
      ...overrides,
      id: generateUUID(),
      isActive: true,
      stoppedAt: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: undefined
    };
    this.saveToStorage({
      ...this.state,
      unitTasks: [...this.state.unitTasks, newTask]
    });
    return newTask;
  }

  public deleteUnitTask(id: string): void {
    this.saveToStorage({
      ...this.state,
      unitTasks: this.state.unitTasks.filter(u => u.id !== id)
    });
  }


  // FYIs (Standing Info)
  public addFYI(fyi: Omit<FYI, 'id' | 'createdAt' | 'version' | 'status'>): FYI {
    const newFYI: FYI = {
      ...fyi,
      id: generateUUID(),
      version: 1,
      status: 'active',
      createdAt: new Date().toISOString(),
      source: fyi.source || 'manual'
    };
    const nextVersion = this.state.binderState.version + 1;
    this.saveToStorage({
      ...this.state,
      fyis: [...this.state.fyis, newFYI],
      binderState: {
        ...this.state.binderState,
        version: nextVersion,
        status: 'update_required',
        lastModifiedAt: new Date().toISOString(),
        pendingChangesCount: this.state.binderState.pendingChangesCount + 1
      }
    });
    return newFYI;
  }

  public updateFYI(id: string, updates: Partial<FYI>): void {
    const nextVersion = this.state.binderState.version + 1;
    this.saveToStorage({
      ...this.state,
      fyis: this.state.fyis.map(f => f.id === id ? { ...f, ...updates, updatedAt: new Date().toISOString(), version: f.version + 1 } : f),
      binderState: {
        ...this.state.binderState,
        version: nextVersion,
        status: 'update_required',
        lastModifiedAt: new Date().toISOString(),
        pendingChangesCount: this.state.binderState.pendingChangesCount + 1
      }
    });
  }

  public deleteFYI(id: string): void {
    const nextVersion = this.state.binderState.version + 1;
    this.saveToStorage({
      ...this.state,
      fyis: this.state.fyis.filter(f => f.id !== id),
      binderState: {
        ...this.state.binderState,
        version: nextVersion,
        status: 'update_required',
        lastModifiedAt: new Date().toISOString(),
        pendingChangesCount: this.state.binderState.pendingChangesCount + 1
      }
    });
  }

  public markBinderUpdated(): void {
    this.saveToStorage({
      ...this.state,
      binderState: {
        ...this.state.binderState,
        status: 'current',
        lastConfirmedAt: new Date().toISOString(),
        pendingChangesCount: 0
      }
    });
  }

  // Wounds
  public addWound(wound: Omit<Wound, 'id' | 'createdAt'>): Wound {
    const newWound: Wound = {
      ...wound,
      id: generateUUID(),
      createdAt: new Date().toISOString(),
      source: wound.source || 'manual'
    };
    this.saveToStorage({
      ...this.state,
      wounds: [...this.state.wounds, newWound]
    });
    return newWound;
  }

  public updateWound(id: string, updates: Partial<Wound>): void {
    this.saveToStorage({
      ...this.state,
      wounds: this.state.wounds.map(w => w.id === id ? { ...w, ...updates } : w)
    });
  }

  public deleteWound(id: string): void {
    this.saveToStorage({
      ...this.state,
      wounds: this.state.wounds.filter(w => w.id !== id)
    });
  }

  /**
   * @deprecated ADR-001: Completion Domain Removed from Active Architecture
   * TaskSheet no longer records digital task completion.
   * This method is intentionally a no-op. It is retained only to prevent
   * runtime errors if any legacy code path calls it during migration.
   */
  public recordCompletion(_completion: Omit<Completion, 'id' | 'completedAt'>): Completion {
    console.warn('TaskSheet ADR-001: recordCompletion called but completion tracking is disabled.');
    return { ..._completion, id: '', completedAt: '' } as Completion;
  }

  /**
   * @deprecated ADR-001: Completion Domain Removed from Active Architecture
   * This method is intentionally a no-op.
   */
  public removeCompletion(_date: string, _shiftId: string, _entityId: string): void {
    console.warn('TaskSheet ADR-001: removeCompletion called but completion tracking is disabled.');
  }

  /**
   * hasTaskHistory — used for safe-delete checks.
   * Returns true if the task has been stopped (has stoppedAt) or is older than 1 day,
   * as a conservative measure to avoid accidental data loss.
   * ADR-001: No longer based on completion records.
   */
  public hasTaskHistory(taskId: string): boolean {
    const task = this.state.residentTasks.find(t => t.id === taskId) ||
                 this.state.unitTasks.find(t => t.id === taskId);
    if (!task) return false;
    if ((task as any).stoppedAt) return true;
    const created = new Date((task as any).createdAt || 0);
    const now = new Date();
    const ageHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return ageHours > 24;
  }

  // Catalog Management (Safe & Independent)
  public installAlbertaCatalog(): void {
    const customTemplates = this.state.catalogTaskTemplates.filter(t => t.isStandardTemplate === false);

    this.saveToStorage({
      ...this.state,
      catalogCategories: ALBERTA_STARTER_CATEGORIES,
      catalogTaskTemplates: [...ALBERTA_TASK_TEMPLATES, ...customTemplates],
      unitTaskTemplates: STANDARD_UNIT_TASK_TEMPLATES
    });
  }

  public addCustomTaskTemplate(template: Omit<CatalogTaskTemplate, 'isStandardTemplate' | 'isActive'>): CatalogTaskTemplate {
    const newTemplate: CatalogTaskTemplate = {
      ...template,
      slug: template.slug || `custom.task.${generateUUID().slice(0, 8)}`,
      isStandardTemplate: false,
      isActive: true
    };
    this.saveToStorage({
      ...this.state,
      catalogTaskTemplates: [...this.state.catalogTaskTemplates, newTemplate]
    });
    return newTemplate;
  }

  public updateCatalogTemplate(slug: string, updates: Partial<CatalogTaskTemplate>): void {
    this.saveToStorage({
      ...this.state,
      catalogTaskTemplates: this.state.catalogTaskTemplates.map(t => t.slug === slug ? { ...t, ...updates } : t)
    });
  }

  public toggleTemplateActive(slug: string): void {
    this.saveToStorage({
      ...this.state,
      catalogTaskTemplates: this.state.catalogTaskTemplates.map(t => 
        t.slug === slug ? { ...t, isActive: t.isActive === false ? true : false } : t
      )
    });
  }

  public exportCatalog(): { 
    catalogName: string;
    catalogVersion: string;
    alignment: string;
    categories: CatalogCategory[]; 
    taskTemplates: CatalogTaskTemplate[]; 
    unitTaskTemplates: UnitTaskTemplate[];
  } {
    return {
      catalogName: 'Alberta Starter Catalog',
      catalogVersion: '1.0',
      alignment: 'AHS / Alberta continuing-care aligned',
      categories: this.state.catalogCategories,
      taskTemplates: this.state.catalogTaskTemplates,
      unitTaskTemplates: this.state.unitTaskTemplates
    };
  }

  public importCatalog(catalogData: any): { newCount: number; updatedCount: number } {
    if (!catalogData || !Array.isArray(catalogData.categories) || !Array.isArray(catalogData.taskTemplates)) {
      throw new Error('Invalid catalog format. Missing categories or taskTemplates array.');
    }

    const currentTemplateSlugs = new Set(this.state.catalogTaskTemplates.map(t => t.slug));
    let newCount = 0;
    let updatedCount = 0;

    for (const t of catalogData.taskTemplates) {
      if (currentTemplateSlugs.has(t.slug)) {
        updatedCount++;
      } else {
        newCount++;
      }
    }

    this.saveToStorage({
      ...this.state,
      catalogCategories: catalogData.categories,
      catalogTaskTemplates: catalogData.taskTemplates,
      unitTaskTemplates: catalogData.unitTaskTemplates || this.state.unitTaskTemplates
    });

    return { newCount, updatedCount };
  }

  public resetCatalog(): void {
    this.installAlbertaCatalog();
  }

  // Demo Data Management (Safe separation from Standard Catalog)
  public loadDemoData(): void {
    const demo = generateDemoData();
    const manualShifts = this.state.shifts.filter(shift => shift.source !== 'demo');
    const manualShiftIds = new Set(manualShifts.map(shift => shift.id));
    const demoShifts = DEFAULT_SHIFTS.filter(shift => !manualShiftIds.has(shift.id));
    const cleanResidents = this.state.residents.filter(r => r.source !== 'demo');
    const cleanResidentTasks = this.state.residentTasks.filter(t => t.source !== 'demo');
    const cleanUnitTasks = this.state.unitTasks.filter(u => u.source !== 'demo');
    const cleanFYIs = this.state.fyis.filter(f => f.source !== 'demo');
    const cleanWounds = this.state.wounds.filter(w => w.source !== 'demo');
    const isBlankFacility =
      this.state.facility.siteName.trim() === '' &&
      this.state.facility.street.trim() === '' &&
      this.state.facility.city.trim() === '' &&
      this.state.facility.postalCode.trim() === '' &&
      this.state.facility.mainPhone.trim() === '';
    const activatesDemoWorkspace =
      this.state.settings.dataMode === 'setup_required' &&
      isBlankFacility &&
      manualShifts.length === 0 &&
      cleanResidents.length === 0 &&
      cleanResidentTasks.length === 0 &&
      cleanUnitTasks.length === 0 &&
      cleanFYIs.length === 0 &&
      cleanWounds.length === 0;

    this.saveToStorage({
      ...this.state,
      facility: activatesDemoWorkspace ? { ...DEFAULT_FACILITY } : this.state.facility,
      settings: activatesDemoWorkspace
        ? { ...this.state.settings, dataMode: 'demo', firstRunCompleted: true }
        : this.state.settings,
      shifts: [...manualShifts, ...demoShifts.map(shift => ({ ...shift }))],
      residents: [...cleanResidents, ...demo.residents],
      residentTasks: [...cleanResidentTasks, ...demo.residentTasks],
      unitTasks: [...cleanUnitTasks, ...demo.unitTasks],
      fyis: [...cleanFYIs, ...demo.fyis],
      wounds: [...cleanWounds, ...demo.wounds],
      // ADR-001: demo completion records are not added to active state
      legacyCompletions: this.state.legacyCompletions
    });
  }

  public clearDemoData(): void {
    if (this.state.settings.dataMode === 'demo') {
      this.startRealSetup();
      return;
    }
    const demoShiftIds = new Set(
      this.state.shifts.filter(shift => shift.source === 'demo').map(shift => shift.id)
    );
    this.saveToStorage({
      ...this.state,
      shifts: this.state.shifts.filter(shift => shift.source !== 'demo'),
      residents: this.state.residents.filter(r => r.source !== 'demo'),
      residentTasks: this.state.residentTasks.filter(t => t.source !== 'demo' && !demoShiftIds.has(t.shiftId)),
      unitTasks: this.state.unitTasks.filter(u => u.source !== 'demo' && !demoShiftIds.has(u.shiftId)),
      fyis: this.state.fyis.filter(f => f.source !== 'demo'),
      wounds: this.state.wounds.filter(w => w.source !== 'demo')
    });
  }

  public startRealSetup(): void {
    const demoShiftIds = new Set(
      this.state.shifts.filter(shift => shift.source === 'demo').map(shift => shift.id)
    );
    this.saveToStorage({
      ...this.state,
      facility: { ...EMPTY_FACILITY },
      settings: {
        ...this.state.settings,
        dataMode: 'setup_required',
        firstRunCompleted: false,
        branding: {
          ...(this.state.settings.branding || DEFAULT_SETTINGS.branding!),
          watermarkStyle: 'none',
        },
      },
      shifts: this.state.shifts.filter(shift => shift.source !== 'demo'),
      residents: this.state.residents.filter(resident => resident.source !== 'demo'),
      residentTasks: this.state.residentTasks.filter(task =>
        task.source !== 'demo' && !demoShiftIds.has(task.shiftId)
      ),
      unitTasks: this.state.unitTasks.filter(task =>
        task.source !== 'demo' && !demoShiftIds.has(task.shiftId)
      ),
      fyis: this.state.fyis.filter(fyi => fyi.source !== 'demo'),
      wounds: this.state.wounds.filter(wound => wound.source !== 'demo'),
      legacyCompletions: [],
      binderState: {
        ...this.state.binderState,
        status: 'current',
        pendingChangesCount: 0,
        lastModifiedAt: new Date().toISOString(),
      },
    });
  }

  public clearBatch(sourceBatchId: string): void {
    this.saveToStorage({
      ...this.state,
      residents: this.state.residents.filter(r => (r as any).sourceBatchId !== sourceBatchId),
      residentTasks: this.state.residentTasks.filter(t => (t as any).sourceBatchId !== sourceBatchId),
      unitTasks: this.state.unitTasks.filter(u => (u as any).sourceBatchId !== sourceBatchId),
      fyis: this.state.fyis.filter(f => (f as any).sourceBatchId !== sourceBatchId),
      wounds: this.state.wounds.filter(w => (w as any).sourceBatchId !== sourceBatchId)
    });
  }

  public clearAllOperationalData(): void {
    this.saveToStorage({
      ...this.state,
      residents: [],
      residentTasks: [],
      unitTasks: [],
      fyis: [],
      wounds: []
    });
  }

  public resetToInitialState(): void {
    this.saveToStorage(getInitialState());
  }

  public resetToDemoState(): void {
    this.saveToStorage(getInitialState());
    this.loadDemoData();
  }

  // Backup & Restore
  public backupDatabase(): string {
    return JSON.stringify(this.state, null, 2);
  }

  public restoreDatabase(jsonString: string): void {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.facility || !parsed.roles || !parsed.shifts) {
        throw new Error('Backup data is missing core schema objects (facility, roles, shifts).');
      }
      const restoredCollections = [parsed.residents, parsed.residentTasks, parsed.unitTasks, parsed.fyis, parsed.wounds];
      const hasDemoRecords = restoredCollections.some(items =>
        Array.isArray(items) && items.some(item => item?.source === 'demo')
      );
      const hasDefaultDemoFacility =
        parsed.facility.siteName === DEFAULT_FACILITY.siteName &&
        parsed.facility.street === DEFAULT_FACILITY.street;
      const restoredDataMode: FacilitySettings['dataMode'] =
        parsed.settings?.dataMode || (hasDemoRecords && hasDefaultDemoFacility ? 'demo' : 'operational');
      const defaultShiftIds = new Set(DEFAULT_SHIFTS.map(shift => shift.id));
      parsed.settings = {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings || {}),
        dataMode: restoredDataMode,
        careTimingPresets: {
          medicationTimes: parsed.settings?.careTimingPresets?.medicationTimes || DEFAULT_CARE_TIMING_PRESETS.medicationTimes,
          mealTimes: parsed.settings?.careTimingPresets?.mealTimes || DEFAULT_CARE_TIMING_PRESETS.mealTimes,
        },
      };
      parsed.shifts = parsed.shifts.map((shift: Shift) => ({
        ...shift,
        source: shift.source || (restoredDataMode === 'demo' && defaultShiftIds.has(shift.id) ? 'demo' : 'manual'),
      }));
      this.saveToStorage(parsed);
    } catch (e: any) {
      throw new Error(`Failed to restore database: ${e.message}`);
    }
  }
}

export const db = new DatabaseService();
