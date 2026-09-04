import { AppDatabaseState, AttentionItem, Resident, ResidentTask, ResidentTaskFollowUpStatus, UnitTask, FYI, Wound, Completion, LegacyCompletion, Role, Shift, Facility, FacilitySettings, BinderState, CatalogCategory, CatalogTaskTemplate, UnitTaskTemplate, FacilityQuickAddPreset, FacilityAttentionRule, WoundSupplyProduct, FacilityRoom, OccupancyPosition } from '../types';
import { DEFAULT_CARE_TIMING_PRESETS, DEFAULT_FACILITY, EMPTY_FACILITY, DEFAULT_SETTINGS, DEFAULT_SHIFTS, DEFAULT_HCA_QUICK_ADD_PRESETS } from '../data/defaultData';
import { DEFAULT_ATTENTION_RULES } from '../services/attention';
import { ALBERTA_STARTER_CATEGORIES, ALBERTA_TASK_TEMPLATES, STANDARD_UNIT_TASK_TEMPLATES } from '../data/albertaCatalog';
import { generateDemoData } from '../data/demoSeed';
import { analyzeShiftChange, analyzeShiftDeactivation, analyzeShiftDeletion, assertValid, DomainConflictError, validateBathingCapacityChange, validateFixedTimeForShift, validateMilitaryTime, validateTaskAssignment } from '../services/validation';
import {
  CURRENT_SCHEMA_VERSION,
  CURRENT_OCCUPANCY_STATUSES,
  roomKey,
  isObsoleteMissingRoomPreset,
  generateUUID,
  migrateRoomModel,
  sanitizeLegacyCertificationTracking,
  mergeWoundSupplyCatalog,
  migrateWoundStructure,
  getInitialState,
  extractLegacyResidentAttention,
  stripLegacyResidentAttention,
} from './migration';
import { StorageAdapter, AsyncStorageAdapter } from './storage/types';
import { selectAdapter } from './storage/selectAdapter';

export { generateUUID };

export type PersistStatus = 'saved' | 'saving' | 'error';

export class DatabaseService {
  private state: AppDatabaseState;
  private listeners: Array<(state: AppDatabaseState) => void> = [];

  private adapter: StorageAdapter;
  private ready = false;
  private persistStatus: PersistStatus = 'saved';
  private persistStatusListeners: Array<(status: PersistStatus, message?: string) => void> = [];
  private pendingWrite: Promise<void> = Promise.resolve();

  /** Adapter defaults to selectAdapter() in production; tests inject a mock to exercise the async/error paths in isolation. */
  constructor(adapter: StorageAdapter = selectAdapter()) {
    this.adapter = adapter;
    if (this.adapter.kind === 'sync') {
      // Preserves the exact synchronous boot contract every existing call
      // site (and test) already depends on.
      const loaded = this.adapter.loadSync();
      this.state = loaded ?? getInitialState();
      this.ready = true;
      if (!loaded) this.saveToStorage(this.state);
    } else {
      // Electron's file store is behind an IPC boundary. Paint with fresh
      // state immediately and swap in the real data once bootstrap resolves
      // (typically a few milliseconds after launch) rather than blocking
      // construction on it.
      this.state = getInitialState();
      void this.bootstrapAsync(this.adapter);
    }
  }

  private async bootstrapAsync(adapter: AsyncStorageAdapter): Promise<void> {
    let loaded: AppDatabaseState | null = null;
    try {
      loaded = await adapter.load();
    } catch (err) {
      console.error('Failed to load database state, starting fresh:', err);
    }
    this.ready = true;
    if (loaded) {
      this.state = loaded;
      this.notifyListeners();
    } else {
      this.saveToStorage(getInitialState());
    }
  }

  /** True once the initial load has resolved. Always true for the synchronous (localStorage) adapter. */
  public isReady(): boolean {
    return this.ready;
  }

  public getPersistStatus(): PersistStatus {
    return this.persistStatus;
  }

  public subscribeToPersistErrors(listener: (status: PersistStatus, message?: string) => void): () => void {
    this.persistStatusListeners.push(listener);
    return () => {
      this.persistStatusListeners = this.persistStatusListeners.filter(l => l !== listener);
    };
  }

  private setPersistStatus(status: PersistStatus, message?: string): void {
    this.persistStatus = status;
    for (const listener of this.persistStatusListeners) listener(status, message);
  }

  private saveToStorage(newState: AppDatabaseState): void {
    const persistedState: AppDatabaseState = { ...newState, schemaVersion: CURRENT_SCHEMA_VERSION, revision: (this.state?.revision ?? newState.revision ?? 0) + 1 };

    if (this.adapter.kind === 'sync') {
      try {
        this.adapter.saveSync(persistedState);
      } catch (e) {
        console.error('Failed to save database state to storage:', e);
        throw new Error('TaskSheet could not save this change to local storage. The previous data remains active. Check available disk space and Windows storage permissions, then try again.');
      }
      this.state = persistedState;
      this.setPersistStatus('saved');
      this.notifyListeners();
      return;
    }

    // Async adapter (Electron file store): commit to memory immediately so
    // every existing synchronous call site keeps working exactly as before;
    // the disk write happens in the background with its own error channel
    // so a slow/failed write is surfaced (via getPersistStatus /
    // subscribeToPersistErrors) instead of silently lost.
    this.state = persistedState;
    this.notifyListeners();
    this.queuePersist(this.adapter, persistedState);
  }

  /** Re-attempts persisting the current in-memory state after a background save failure. No-op for the synchronous adapter, which never leaves a failed write pending. */
  public retryPersist(): void {
    if (this.adapter.kind === 'async') this.queuePersist(this.adapter, this.state);
  }

  private queuePersist(adapter: AsyncStorageAdapter, state: AppDatabaseState): void {
    this.setPersistStatus('saving');
    // Chain onto the prior write so out-of-order completions can never
    // reorder what lands on disk, and one failed write doesn't block the
    // next attempt from proceeding.
    this.pendingWrite = this.pendingWrite
      .catch(() => {})
      .then(() => adapter.save(state))
      .then(() => this.setPersistStatus('saved'))
      .catch(err => {
        console.error('Failed to persist database state:', err);
        this.setPersistStatus('error', err instanceof Error ? err.message : String(err));
      });
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

  public getRevision(): number { return this.state.revision ?? 0; }

  private assertExpectedRevision(expectedRevision?: number): void {
    if (expectedRevision !== undefined && expectedRevision !== (this.state.revision ?? 0)) throw new DomainConflictError({
      status: 'BLOCKED', code: 'STALE_RECORD', title: 'This Schedule Has Changed',
      message: 'Another TaskSheet action updated facility data after you opened this form. Reload the latest schedule, review the change, and try again so a newer assignment is not overwritten.',
      context: { expectedRevision, currentRevision: this.state.revision ?? 0 },
      recommendedActions: [{ id: 'reload', label: 'Reload Latest', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }],
    });
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
    if (settings.bathingCapacityPerShiftLine !== undefined && settings.bathingCapacityPerShiftLine !== this.state.settings.bathingCapacityPerShiftLine) {
      assertValid(validateBathingCapacityChange(this.state, settings.bathingCapacityPerShiftLine));
    }
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
    assertValid(validateMilitaryTime(shift.startTime));
    assertValid(validateMilitaryTime(shift.endTime));
    
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
    const proposedStart = updates.startTime ?? current.startTime;
    const proposedEnd = updates.endTime ?? current.endTime;
    assertValid(validateMilitaryTime(proposedStart));
    assertValid(validateMilitaryTime(proposedEnd));

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

    const impact = analyzeShiftChange(this.state, id, { ...updates, startTime: proposedStart, endTime: proposedEnd });
    assertValid(impact);

    const updatedShift: Shift = {
      ...current,
      ...updates,
      shortCode: targetShortCode,
      isActive: targetIsActive,
      updatedAt: new Date().toISOString()
    };

    const timesChanged = proposedStart !== current.startTime || proposedEnd !== current.endTime;
    this.saveToStorage({
      ...this.state,
      shifts: this.state.shifts.map(s => s.id === id ? updatedShift : s),
      residentTasks: timesChanged ? this.state.residentTasks.map(task => task.shiftId !== id ? task : task.timingType === 'start_of_shift' ? { ...task, time: proposedStart, updatedAt: new Date().toISOString() } : task.timingType === 'end_of_shift' ? { ...task, time: proposedEnd, updatedAt: new Date().toISOString() } : task.timingType === 'period' ? { ...task, time: undefined, isNoSpecificTime: true, updatedAt: new Date().toISOString() } : task) : this.state.residentTasks,
      unitTasks: timesChanged ? this.state.unitTasks.map(task => task.shiftId !== id ? task : task.timingType === 'start_of_shift' ? { ...task, time: proposedStart, updatedAt: new Date().toISOString() } : task.timingType === 'end_of_shift' ? { ...task, time: proposedEnd, updatedAt: new Date().toISOString() } : task.timingType === 'period' ? { ...task, time: undefined, updatedAt: new Date().toISOString() } : task) : this.state.unitTasks,
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

  public analyzeShiftDeactivation(id: string) {
    return analyzeShiftDeactivation(this.state, id);
  }

  public deactivateShift(id: string): void {
    this.updateShift(id, { isActive: false });
  }

  public reactivateShift(id: string): void {
    this.updateShift(id, { isActive: true });
  }

  public deleteShift(id: string): { success: boolean; error?: string } {
    const dependencyResult = analyzeShiftDeletion(this.state, id);
    if (dependencyResult.status === 'BLOCKED') return { success: false, error: dependencyResult.message };
    const assignedResidentTasks = this.state.residentTasks.filter(t => t.shiftId === id && t.isActive !== false);
    const assignedUnitTasks = this.state.unitTasks.filter(u => u.shiftId === id && u.isActive !== false);
    const assignedWounds = this.state.wounds.filter(w => w.shiftId === id && (w.status === 'active' || w.status === 'healing'));
    
    if (assignedResidentTasks.length > 0 || assignedUnitTasks.length > 0 || assignedWounds.length > 0) {
      return {
        success: false,
        error: `Cannot delete shift. It currently has ${assignedResidentTasks.length} active resident task(s), ${assignedUnitTasks.length} active unit task(s), and ${assignedWounds.length} active wound protocol(s). Deactivate the shift instead, or reassign its work.`
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
    const roomLabel = resident.roomNumber?.trim() || '';
    if (CURRENT_OCCUPANCY_STATUSES.has(resident.status) && !roomLabel) {
      throw new Error('Room / Occupancy Location is required for a current resident.');
    }
    let rooms = [...this.state.rooms];
    let positions = [...this.state.occupancyPositions];
    let position = positions.find(item => roomKey(item.displayLabel) === roomKey(roomLabel));
    if (roomLabel && !position) {
      const now = new Date().toISOString();
      const room: FacilityRoom = { id: generateUUID(), physicalRoomLabel: roomLabel, active: true, mode: 'simple', createdAt: now, source: resident.source || 'manual' };
      position = { id: generateUUID(), roomId: room.id, displayLabel: roomLabel, active: true, createdAt: now, source: resident.source || 'manual' };
      rooms = [...rooms, room];
      positions = [...positions, position];
    }
    if (position && position.active === false && CURRENT_OCCUPANCY_STATUSES.has(resident.status)) throw new Error(`${position.displayLabel} is inactive and cannot receive a resident.`);
    const occupant = position && this.state.residents.find(item => item.occupancyPositionId === position!.id && CURRENT_OCCUPANCY_STATUSES.has(item.status));
    if (occupant && CURRENT_OCCUPANCY_STATUSES.has(resident.status)) throw new Error(`${position!.displayLabel} is occupied by ${occupant.firstName} ${occupant.lastName}. Choose an available room / bed.`);
    const id = generateUUID();
    const now = new Date().toISOString();
    const newResident: Resident = {
      ...resident,
      id,
      roomNumber: position?.displayLabel || roomLabel,
      occupancyPositionId: CURRENT_OCCUPANCY_STATUSES.has(resident.status) ? position?.id : undefined,
      roomAssignmentNeedsReview: false,
      source: resident.source || 'manual'
    };
    const history = position && CURRENT_OCCUPANCY_STATUSES.has(resident.status)
      ? [...this.state.residentPlacementHistory, { id: generateUUID(), residentId: id, occupancyPositionId: position.id, displayLabel: position.displayLabel, startedAt: resident.admittedAt || now }]
      : this.state.residentPlacementHistory;
    this.saveToStorage({
      ...this.state,
      residents: [...this.state.residents, newResident], rooms, occupancyPositions: positions, residentPlacementHistory: history,
    });
    return newResident;
  }

  public updateResident(id: string, updates: Partial<Resident>): void {
    const current = this.state.residents.find(resident => resident.id === id);
    if (!current) throw new Error('Resident not found.');
    const nextStatus = updates.status || current.status;
    const nextIsCurrent = CURRENT_OCCUPANCY_STATUSES.has(nextStatus);
    const currentIsCurrent = CURRENT_OCCUPANCY_STATUSES.has(current.status);
    const requestedLabel = updates.roomNumber !== undefined ? updates.roomNumber.trim() : current.roomNumber;
    if (nextIsCurrent && !requestedLabel) throw new Error('Room / Occupancy Location is required before this resident can be active.');

    let rooms = [...this.state.rooms];
    let positions = [...this.state.occupancyPositions];
    let target = positions.find(position => roomKey(position.displayLabel) === roomKey(requestedLabel));
    if (requestedLabel && !target) {
      const now = new Date().toISOString();
      const room: FacilityRoom = { id: generateUUID(), physicalRoomLabel: requestedLabel, active: true, mode: 'simple', createdAt: now, source: 'manual' };
      target = { id: generateUUID(), roomId: room.id, displayLabel: requestedLabel, active: true, createdAt: now, source: 'manual' };
      rooms = [...rooms, room]; positions = [...positions, target];
    }
    if (nextIsCurrent && target?.active === false) throw new Error(`${target.displayLabel} is inactive and cannot receive a resident.`);
    const occupant = target && this.state.residents.find(resident => resident.id !== id && resident.occupancyPositionId === target!.id && CURRENT_OCCUPANCY_STATUSES.has(resident.status));
    if (nextIsCurrent && occupant) throw new Error(`${target!.displayLabel} is occupied by ${occupant.firstName} ${occupant.lastName}.`);

    const changingPosition = nextIsCurrent && target?.id !== current.occupancyPositionId;
    let history = this.state.residentPlacementHistory.map(item =>
      item.residentId === id && !item.endedAt && (!nextIsCurrent || changingPosition) ? { ...item, endedAt: new Date().toISOString() } : item
    );
    if (nextIsCurrent && target && (!currentIsCurrent || changingPosition)) {
      history = [...history, { id: generateUUID(), residentId: id, occupancyPositionId: target.id, displayLabel: target.displayLabel, startedAt: new Date().toISOString() }];
    }
    this.saveToStorage({
      ...this.state,
      rooms, occupancyPositions: positions, residentPlacementHistory: history,
      residents: this.state.residents.map(r => r.id === id ? {
        ...r, ...updates,
        roomNumber: target?.displayLabel || requestedLabel,
        occupancyPositionId: nextIsCurrent ? target?.id : undefined,
        roomAssignmentNeedsReview: false,
      } : r)
    });
  }

  // Attention Items — lightweight, non-clinical, date-bounded awareness of a
  // temporary situation (Resident, Unit, or Site scoped). A top-level
  // collection (not nested under Resident) since Unit/Site items have no
  // resident to attach to. Never routes into a printed TaskSheet — that
  // stays exclusive to Task.
  public addAttentionItem(item: Omit<AttentionItem, 'id' | 'createdAt' | 'active'>): AttentionItem {
    if (!item.title.trim()) throw new Error('Attention title is required.');
    if (item.scope === 'resident') {
      if (!item.residentId) throw new Error('A resident-scoped attention item requires a resident.');
      if (!this.state.residents.some(r => r.id === item.residentId)) throw new Error('Resident not found.');
    }
    const newItem: AttentionItem = {
      ...item,
      id: generateUUID(),
      active: true,
      createdAt: new Date().toISOString(),
      source: item.source || 'manual',
    };
    this.saveToStorage({
      ...this.state,
      attentionItems: [...this.state.attentionItems, newItem],
    });
    return newItem;
  }

  /** Ends an attention item early (does not delete it — historical items are kept). */
  public endAttentionItem(itemId: string): void {
    this.saveToStorage({
      ...this.state,
      attentionItems: this.state.attentionItems.map(a => a.id === itemId ? { ...a, active: false, updatedAt: new Date().toISOString() } : a),
    });
  }

  public addRoom(displayLabel: string, options: { physicalRoomLabel?: string; positionLabel?: string; area?: string; source?: FacilityRoom['source'] } = {}): OccupancyPosition {
    const label = displayLabel.trim();
    if (!label) throw new Error('Room / Bed display label is required.');
    if (this.state.occupancyPositions.some(position => roomKey(position.displayLabel) === roomKey(label))) throw new Error(`${label} already exists in Room Setup.`);
    const now = new Date().toISOString();
    const physical = options.physicalRoomLabel?.trim() || label;
    let room = this.state.rooms.find(item => roomKey(item.physicalRoomLabel) === roomKey(physical));
    const rooms = room ? this.state.rooms : [...this.state.rooms, room = { id: generateUUID(), physicalRoomLabel: physical, area: options.area?.trim() || undefined, active: true, mode: options.positionLabel ? 'structured' : 'simple', createdAt: now, source: options.source || 'manual' }];
    const position: OccupancyPosition = { id: generateUUID(), roomId: room.id, positionLabel: options.positionLabel?.trim() || undefined, displayLabel: label, active: true, createdAt: now, source: options.source || 'manual' };
    this.saveToStorage({ ...this.state, rooms, occupancyPositions: [...this.state.occupancyPositions, position] });
    return position;
  }

  public addMultiOccupancyRoom(physicalRoomLabel: string, positionLabels: string[], area?: string, displayOverrides: Record<string, string> = {}): OccupancyPosition[] {
    const base = physicalRoomLabel.trim();
    const labels = [...new Set(positionLabels.map(label => label.trim()).filter(Boolean))];
    if (!base || !labels.length) throw new Error('Physical room and at least one occupancy position are required.');
    const displays = labels.map(label => (displayOverrides[label] || `${base}${label}`).trim());
    const duplicate = displays.find(display => this.state.occupancyPositions.some(position => roomKey(position.displayLabel) === roomKey(display)));
    if (duplicate) throw new Error(`${duplicate} already exists in Room Setup.`);
    const now = new Date().toISOString();
    const room: FacilityRoom = { id: generateUUID(), physicalRoomLabel: base, area: area?.trim() || undefined, active: true, mode: 'structured', createdAt: now, source: 'manual' };
    const positions = labels.map((label, index): OccupancyPosition => ({ id: generateUUID(), roomId: room.id, positionLabel: label, displayLabel: displays[index], active: true, createdAt: now, source: 'manual' }));
    this.saveToStorage({ ...this.state, rooms: [...this.state.rooms, room], occupancyPositions: [...this.state.occupancyPositions, ...positions] });
    return positions;
  }

  public updateOccupancyPosition(id: string, updates: Partial<Pick<OccupancyPosition, 'displayLabel' | 'active'>>): void {
    const current = this.state.occupancyPositions.find(position => position.id === id);
    if (!current) throw new Error('Room / bed not found.');
    const label = updates.displayLabel?.trim() || current.displayLabel;
    if (this.state.occupancyPositions.some(position => position.id !== id && roomKey(position.displayLabel) === roomKey(label))) throw new Error(`${label} already exists.`);
    const occupant = this.state.residents.find(resident => resident.occupancyPositionId === id && CURRENT_OCCUPANCY_STATUSES.has(resident.status));
    if (updates.active === false && occupant) throw new Error(`${current.displayLabel} is occupied by ${occupant.firstName} ${occupant.lastName} and cannot be deactivated.`);
    this.saveToStorage({
      ...this.state,
      occupancyPositions: this.state.occupancyPositions.map(position => position.id === id ? { ...position, ...updates, displayLabel: label, updatedAt: new Date().toISOString() } : position),
      residents: this.state.residents.map(resident => resident.occupancyPositionId === id ? { ...resident, roomNumber: label } : resident),
      residentPlacementHistory: this.state.residentPlacementHistory.map(item => item.occupancyPositionId === id && !item.endedAt ? { ...item, displayLabel: label } : item),
    });
  }

  public deleteResident(id: string): void {
    this.saveToStorage({
      ...this.state,
      residents: this.state.residents.filter(r => r.id !== id),
      residentTasks: this.state.residentTasks.filter(t => t.residentId !== id),
      wounds: this.state.wounds.filter(w => w.residentId !== id),
      fyis: this.state.fyis.filter(f => f.residentId !== id),
      attentionItems: this.state.attentionItems.filter(a => a.residentId !== id),
      residentPlacementHistory: this.state.residentPlacementHistory.filter(item => item.residentId !== id)
    });
  }

  // Resident Tasks
  public addResidentTask(task: Omit<ResidentTask, 'id' | 'createdAt' | 'isActive'>, options: { expectedRevision?: number } = {}): ResidentTask {
    this.assertExpectedRevision(options.expectedRevision);
    const createdAt = new Date().toISOString();
    const timingType = task.timingType || (task.isNoSpecificTime || !task.time ? 'period' : 'fixed');
    assertValid(validateTaskAssignment(this.state, { ...task, kind: 'resident_task', title: task.title, frequency: task.frequency, createdAt, timingType }));
    const newTask: ResidentTask = {
      ...task,
      timingType,
      id: generateUUID(),
      isActive: true,
      createdAt,
      source: task.source || 'manual'
    };
    this.saveToStorage({
      ...this.state,
      residentTasks: [...this.state.residentTasks, newTask]
    });
    return newTask;
  }

  public addMultipleResidentTasks(tasks: Array<Omit<ResidentTask, 'id' | 'createdAt' | 'isActive'>>): ResidentTask[] {
    let simulated = this.state;
    const newTasks: ResidentTask[] = tasks.map(t => {
      const createdAt = new Date().toISOString(); const timingType = t.timingType || (t.isNoSpecificTime || !t.time ? 'period' : 'fixed');
      assertValid(validateTaskAssignment(simulated, { ...t, kind: 'resident_task', title: t.title, frequency: t.frequency, createdAt, timingType }));
      const created: ResidentTask = { ...t, timingType, id: generateUUID(), isActive: true, createdAt, source: t.source || 'manual' };
      simulated = { ...simulated, residentTasks: [...simulated.residentTasks, created] };
      return created;
    });
    this.saveToStorage({
      ...this.state,
      residentTasks: [...this.state.residentTasks, ...newTasks]
    });
    return newTasks;
  }

  public updateResidentTask(id: string, updates: Partial<ResidentTask>, options: { expectedRevision?: number } = {}): void {
    this.assertExpectedRevision(options.expectedRevision);
    const current = this.state.residentTasks.find(task => task.id === id); if (!current) throw new Error('Resident task not found.');
    const next = { ...current, ...updates, timingType: updates.timingType || current.timingType || ((updates.isNoSpecificTime ?? current.isNoSpecificTime) || !(updates.time ?? current.time) ? 'period' : 'fixed') };
    if (next.isActive !== false) assertValid(validateTaskAssignment(this.state, { ...next, kind: 'resident_task' }));
    this.saveToStorage({
      ...this.state,
      residentTasks: this.state.residentTasks.map(t => t.id === id ? { ...next, updatedAt: new Date().toISOString() } : t)
    });
  }

  /** Resident Follow-up continuity status transition. `followUpDueDate` is
   *  intentionally never touched here — the original due date must survive
   *  every carry-forward so overdue age stays measured from when the task
   *  was actually first due, not from the latest review. */
  public setResidentTaskFollowUpStatus(id: string, status: ResidentTaskFollowUpStatus): ResidentTask {
    const current = this.state.residentTasks.find(task => task.id === id);
    if (!current) throw new Error('Resident task not found.');
    const now = new Date().toISOString();
    const updated: ResidentTask = {
      ...current,
      followUpStatus: status,
      followUpCarryForwardCount: status === 'carry_forward' ? (current.followUpCarryForwardCount || 0) + 1 : (current.followUpCarryForwardCount || 0),
      followUpUpdatedAt: now,
      updatedAt: now,
    };
    this.saveToStorage({
      ...this.state,
      residentTasks: this.state.residentTasks.map(t => t.id === id ? updated : t)
    });
    return updated;
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
    const current = this.state.residentTasks.find(task => task.id === id); if (!current) throw new Error('Resident task not found.');
    assertValid(validateTaskAssignment(this.state, { ...current, isActive: true, kind: 'resident_task' }));
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
    assertValid(validateTaskAssignment(this.state, { ...newTask, kind: 'resident_task' }));
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
  public addUnitTask(task: Omit<UnitTask, 'id' | 'createdAt' | 'isActive'>, options: { expectedRevision?: number } = {}): UnitTask {
    this.assertExpectedRevision(options.expectedRevision);
    const createdAt = new Date().toISOString(); const timingType = task.timingType || (!task.time ? 'period' : 'fixed');
    assertValid(validateTaskAssignment(this.state, { ...task, kind: 'unit_task', title: task.title, frequency: task.frequency, createdAt, timingType }));
    const newTask: UnitTask = {
      ...task,
      timingType,
      id: generateUUID(),
      isActive: true,
      createdAt,
      source: task.source || 'manual'
    };
    this.saveToStorage({
      ...this.state,
      unitTasks: [...this.state.unitTasks, newTask]
    });
    return newTask;
  }

  public updateUnitTask(id: string, updates: Partial<UnitTask>, options: { expectedRevision?: number } = {}): void {
    this.assertExpectedRevision(options.expectedRevision);
    const current = this.state.unitTasks.find(task => task.id === id); if (!current) throw new Error('Unit task not found.');
    const next = { ...current, ...updates, timingType: updates.timingType || current.timingType || (!(updates.time ?? current.time) ? 'period' : 'fixed') };
    if (next.isActive !== false) assertValid(validateTaskAssignment(this.state, { ...next, kind: 'unit_task' }));
    this.saveToStorage({
      ...this.state,
      unitTasks: this.state.unitTasks.map(u => u.id === id ? { ...next, updatedAt: new Date().toISOString() } : u)
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
    const current = this.state.unitTasks.find(task => task.id === id); if (!current) throw new Error('Unit task not found.');
    assertValid(validateTaskAssignment(this.state, { ...current, isActive: true, kind: 'unit_task' }));
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
    assertValid(validateTaskAssignment(this.state, { ...newTask, kind: 'unit_task' }));
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
    const duplicate = this.state.fyis.find(item => item.status === 'active' && item.residentId === fyi.residentId && item.roleId === fyi.roleId && item.shiftId === fyi.shiftId && item.text.trim().toLowerCase() === fyi.text.trim().toLowerCase());
    if (duplicate) throw new DomainConflictError({ status: 'BLOCKED', code: 'DUPLICATE_FYI', title: 'Duplicate FYI', message: 'The same FYI already exists at this resident/role/shift scope. Edit the existing FYI instead of creating another copy.', affectedRecords: [{ id: duplicate.id, type: 'fyi', label: duplicate.text }], recommendedActions: [{ id: 'edit_existing', label: 'Edit Existing FYI', kind: 'primary' }, { id: 'cancel', label: 'Cancel', kind: 'cancel' }] });
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
    const current = this.state.fyis.find(item => item.id === id); if (!current) throw new Error('FYI not found.');
    const next = { ...current, ...updates };
    const duplicate = this.state.fyis.find(item => item.id !== id && item.status === 'active' && item.residentId === next.residentId && item.roleId === next.roleId && item.shiftId === next.shiftId && item.text.trim().toLowerCase() === next.text.trim().toLowerCase());
    if (duplicate) throw new DomainConflictError({ status: 'BLOCKED', code: 'DUPLICATE_FYI', title: 'Duplicate FYI', message: 'The same FYI already exists at this scope. Review the existing FYI before saving.' });
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
  public addWound(wound: Omit<Wound, 'id' | 'createdAt'>, options: { expectedRevision?: number } = {}): Wound {
    this.assertExpectedRevision(options.expectedRevision);
    if (!wound.siteLocation.trim()) throw new DomainConflictError({ status: 'BLOCKED', code: 'DUPLICATE_WOUND', title: 'Wound Site Is Required', message: 'Enter the anatomical wound location before saving the protocol.' });
    const duplicate = this.state.wounds.find(item => item.residentId === wound.residentId && ['active', 'healing'].includes(item.status) && item.siteLocation.trim().toLowerCase() === wound.siteLocation.trim().toLowerCase());
    if (duplicate) throw new DomainConflictError({ status: 'BLOCKED', code: 'DUPLICATE_WOUND', title: 'Active Wound Already Exists', message: `${wound.siteLocation} already has an active wound protocol for this resident. Edit that protocol instead.`, affectedRecords: [{ id: duplicate.id, type: 'wound', label: duplicate.siteLocation }] });
    assertValid(validateTaskAssignment(this.state, { ...wound, kind: 'wound', title: `Wound Care · ${wound.siteLocation}`, category: 'Wound Care', timingType: wound.timingType || (wound.time ? 'fixed' : 'period') }));
    const inactiveSupply = (wound.supplies || []).find(selection => selection.catalogId && this.state.woundSupplyCatalog.find(product => product.id === selection.catalogId)?.isActive === false);
    if (inactiveSupply) throw new DomainConflictError({ status: 'BLOCKED', code: 'CATALOG_ITEM_INACTIVE', title: 'Wound Supply Is Inactive', message: `${inactiveSupply.name} is inactive in the Wound Supply Catalog. Choose an active product or reactivate it before saving.` });
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

  public updateWound(id: string, updates: Partial<Wound>, options: { expectedRevision?: number } = {}): void {
    this.assertExpectedRevision(options.expectedRevision);
    const current = this.state.wounds.find(wound => wound.id === id); if (!current) throw new Error('Wound protocol not found.');
    const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
    if (['active', 'healing'].includes(next.status)) {
      const duplicate = this.state.wounds.find(item => item.id !== id && item.residentId === next.residentId && ['active', 'healing'].includes(item.status) && item.siteLocation.trim().toLowerCase() === next.siteLocation.trim().toLowerCase());
      if (duplicate) throw new DomainConflictError({ status: 'BLOCKED', code: 'DUPLICATE_WOUND', title: 'Active Wound Already Exists', message: `${next.siteLocation} already has another active wound protocol.` });
      assertValid(validateTaskAssignment(this.state, { ...next, kind: 'wound', title: `Wound Care · ${next.siteLocation}`, category: 'Wound Care', timingType: next.timingType || (next.time ? 'fixed' : 'period') }));
    }
    this.saveToStorage({
      ...this.state,
      wounds: this.state.wounds.map(w => w.id === id ? next : w)
    });
  }

  public deleteWound(id: string): void {
    this.saveToStorage({
      ...this.state,
      wounds: this.state.wounds.filter(w => w.id !== id)
    });
  }

  // Wound supply formulary catalog
  public addWoundSupplyProduct(product: Omit<WoundSupplyProduct, 'id' | 'createdAt' | 'provenance'>): WoundSupplyProduct {
    const created: WoundSupplyProduct = { ...product, id: generateUUID(), provenance: 'user_created', createdAt: new Date().toISOString() };
    this.saveToStorage({ ...this.state, woundSupplyCatalog: [...this.state.woundSupplyCatalog, created] });
    return created;
  }

  public updateWoundSupplyProduct(id: string, updates: Partial<WoundSupplyProduct>): void {
    this.saveToStorage({
      ...this.state,
      woundSupplyCatalog: this.state.woundSupplyCatalog.map(product => product.id === id ? { ...product, ...updates, id: product.id, provenance: product.provenance, updatedAt: new Date().toISOString() } : product),
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
    const cleanAttentionItems = this.state.attentionItems.filter(a => a.source !== 'demo');
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
      cleanWounds.length === 0 &&
      cleanAttentionItems.length === 0;

    const mergedResidents = [...cleanResidents, ...demo.residents];
    const manualResidentIds = new Set(cleanResidents.map(resident => resident.id));
    const demoCreatedAt = new Date().toISOString();
    const demoRooms: FacilityRoom[] = [
      { id: 'demo-room-101', physicalRoomLabel: '101', active: true, mode: 'structured', createdAt: demoCreatedAt, source: 'demo' },
      { id: 'demo-room-l102', physicalRoomLabel: 'L102', active: true, mode: 'simple', createdAt: demoCreatedAt, source: 'demo' },
      { id: 'demo-room-103', physicalRoomLabel: '103', active: true, mode: 'structured', createdAt: demoCreatedAt, source: 'demo' },
    ];
    const demoPositions: OccupancyPosition[] = [
      { id: 'demo-position-101a', roomId: 'demo-room-101', positionLabel: 'A', displayLabel: '101A', active: true, createdAt: demoCreatedAt, source: 'demo' },
      { id: 'demo-position-101b', roomId: 'demo-room-101', positionLabel: 'B', displayLabel: '101B', active: true, createdAt: demoCreatedAt, source: 'demo' },
      { id: 'demo-position-l102', roomId: 'demo-room-l102', displayLabel: 'L102', active: true, createdAt: demoCreatedAt, source: 'demo' },
      { id: 'demo-position-103lf', roomId: 'demo-room-103', positionLabel: 'LF', displayLabel: '103LF', active: true, createdAt: demoCreatedAt, source: 'demo' },
    ];
    const retainedRooms = this.state.rooms.filter(room => room.source !== 'demo');
    const retainedPositions = this.state.occupancyPositions.filter(position => position.source !== 'demo');
    const existingLabels = new Set(retainedPositions.map(position => roomKey(position.displayLabel)));
    const roomModel = migrateRoomModel(
      mergedResidents,
      [...retainedRooms, ...demoRooms],
      [...retainedPositions, ...demoPositions.filter(position => !existingLabels.has(roomKey(position.displayLabel)))],
      this.state.residentPlacementHistory.filter(item => manualResidentIds.has(item.residentId)),
    );
    this.saveToStorage({
      ...this.state,
      facility: activatesDemoWorkspace ? { ...DEFAULT_FACILITY } : this.state.facility,
      settings: activatesDemoWorkspace
        ? { ...this.state.settings, dataMode: 'demo', firstRunCompleted: true }
        : this.state.settings,
      shifts: [...manualShifts, ...demoShifts.map(shift => ({ ...shift }))],
      ...roomModel,
      residentTasks: [...cleanResidentTasks, ...demo.residentTasks],
      unitTasks: [...cleanUnitTasks, ...demo.unitTasks],
      fyis: [...cleanFYIs, ...demo.fyis],
      wounds: [...cleanWounds, ...demo.wounds],
      attentionItems: [...cleanAttentionItems, ...demo.attentionItems],
      // ADR-001: demo completion records are not added to active state
      legacyCompletions: this.state.legacyCompletions
    });
  }

  /**
   * Reassigns a non-demo task off a demo shift being removed so it is preserved
   * rather than orphaned: shiftId is cleared and roleId is backfilled from the
   * removed shift so the task still matches its role on future generation.
   */
  private static reassignOffRemovedDemoShift<T extends { source?: string; shiftId?: string; roleId?: string }>(
    items: T[],
    demoShiftRoleIds: Map<string, string>,
  ): T[] {
    return items
      .filter(item => item.source !== 'demo')
      .map(item => {
        if (!item.shiftId || !demoShiftRoleIds.has(item.shiftId)) return item;
        return { ...item, shiftId: undefined, roleId: item.roleId || demoShiftRoleIds.get(item.shiftId) };
      });
  }

  public clearDemoData(): void {
    if (this.state.settings.dataMode === 'demo') {
      this.startRealSetup();
      return;
    }
    const demoShiftRoleIds = new Map(
      this.state.shifts.filter(shift => shift.source === 'demo').map(shift => [shift.id, shift.roleId] as const)
    );
    const retainedResidents = this.state.residents.filter(r => r.source !== 'demo');
    const retainedResidentIds = new Set(retainedResidents.map(resident => resident.id));
    const roomModel = migrateRoomModel(
      retainedResidents,
      this.state.rooms.filter(room => room.source !== 'demo'),
      this.state.occupancyPositions.filter(position => position.source !== 'demo'),
      this.state.residentPlacementHistory.filter(item => retainedResidentIds.has(item.residentId)),
    );
    this.saveToStorage({
      ...this.state,
      shifts: this.state.shifts.filter(shift => shift.source !== 'demo'),
      ...roomModel,
      residentTasks: DatabaseService.reassignOffRemovedDemoShift(this.state.residentTasks, demoShiftRoleIds),
      unitTasks: DatabaseService.reassignOffRemovedDemoShift(this.state.unitTasks, demoShiftRoleIds),
      fyis: this.state.fyis.filter(f => f.source !== 'demo'),
      wounds: this.state.wounds.filter(w => w.source !== 'demo'),
      attentionItems: this.state.attentionItems.filter(a => a.source !== 'demo' && (a.scope !== 'resident' || retainedResidentIds.has(a.residentId!)))
    });
  }

  public startRealSetup(): void {
    const demoShiftRoleIds = new Map(
      this.state.shifts.filter(shift => shift.source === 'demo').map(shift => [shift.id, shift.roleId] as const)
    );
    const retainedResidents = this.state.residents.filter(resident => resident.source !== 'demo');
    const retainedResidentIds = new Set(retainedResidents.map(resident => resident.id));
    const roomModel = migrateRoomModel(
      retainedResidents,
      this.state.rooms.filter(room => room.source !== 'demo'),
      this.state.occupancyPositions.filter(position => position.source !== 'demo'),
      this.state.residentPlacementHistory.filter(item => retainedResidentIds.has(item.residentId)),
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
      ...roomModel,
      residentTasks: DatabaseService.reassignOffRemovedDemoShift(this.state.residentTasks, demoShiftRoleIds),
      unitTasks: DatabaseService.reassignOffRemovedDemoShift(this.state.unitTasks, demoShiftRoleIds),
      fyis: this.state.fyis.filter(fyi => fyi.source !== 'demo'),
      wounds: this.state.wounds.filter(wound => wound.source !== 'demo'),
      attentionItems: this.state.attentionItems.filter(a => a.source !== 'demo' && (a.scope !== 'resident' || retainedResidentIds.has(a.residentId!))),
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
      residentPlacementHistory: [],
      residentTasks: [],
      unitTasks: [],
      fyis: [],
      wounds: [],
      attentionItems: []
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
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Backup root must be a TaskSheet database object.');
      if (!parsed.facility || typeof parsed.facility !== 'object' || !Array.isArray(parsed.roles) || !Array.isArray(parsed.shifts)) {
        throw new Error('Backup data is missing core schema objects (facility, roles, shifts).');
      }
      // Captured before normalization below coerces a missing field to `[]`,
      // so we can tell "backup predates this collection" (hoist legacy
      // resident-nested attention items) apart from "backup genuinely has
      // none" (leave it empty).
      const hadTopLevelAttentionItems = Array.isArray(parsed.attentionItems);
      for (const collection of ['residents', 'residentTasks', 'unitTasks', 'fyis', 'wounds', 'attentionItems'] as const) {
        if (parsed[collection] !== undefined && !Array.isArray(parsed[collection])) throw new Error(`Backup field “${collection}” must be a list.`);
        parsed[collection] = parsed[collection] || [];
      }
      if (parsed.shifts.some((shift: Shift) => !shift?.id || !shift?.roleId || validateMilitaryTime(shift.startTime).status === 'BLOCKED' || validateMilitaryTime(shift.endTime).status === 'BLOCKED')) {
        throw new Error('Backup contains a shift with missing identity/role or invalid military time. No data was restored.');
      }
      for (const collection of ['shifts', 'residents', 'residentTasks', 'unitTasks', 'fyis', 'wounds', 'attentionItems'] as const) {
        const ids = (parsed[collection] as Array<{ id?: string }>).map(item => item?.id).filter(Boolean);
        if (new Set(ids).size !== ids.length) {
          throw new Error(`Backup field “${collection}” contains duplicate record IDs. No data was restored.`);
        }
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
        savedPrintPresets: (parsed.settings?.savedPrintPresets || []).filter((preset: { id?: string; name?: string; dataSource?: string; filters?: Array<{ field?: string; operator?: string }> }) => !isObsoleteMissingRoomPreset(preset)),
      };
      parsed.schemaVersion = CURRENT_SCHEMA_VERSION;
      parsed.residentTasks = (parsed.residentTasks || []).map((task: ResidentTask) =>
        sanitizeLegacyCertificationTracking(task)
      );
      parsed.shifts = parsed.shifts.map((shift: Shift) => ({
        ...shift,
        source: shift.source || (restoredDataMode === 'demo' && defaultShiftIds.has(shift.id) ? 'demo' : 'manual'),
      }));
      parsed.woundSupplyCatalog = mergeWoundSupplyCatalog(parsed.woundSupplyCatalog);
      parsed.wounds = (parsed.wounds || []).map((wound: Wound) => migrateWoundStructure(wound, parsed.woundSupplyCatalog));
      // `importance` is required by the FYI type but was added after some
      // backups were created; default any legacy record missing it.
      parsed.fyis = (parsed.fyis || []).map((fyi: FYI) => ({ ...fyi, importance: fyi.importance || 'normal' }));
      // Older backups nested attention items under each resident; hoist them
      // into the top-level collection when the backup predates it.
      parsed.attentionItems = hadTopLevelAttentionItems ? parsed.attentionItems : extractLegacyResidentAttention(parsed.residents || []);
      Object.assign(parsed, migrateRoomModel(parsed.residents || [], parsed.rooms || [], parsed.occupancyPositions || [], parsed.residentPlacementHistory || []));
      parsed.residents = stripLegacyResidentAttention(parsed.residents);
      this.saveToStorage(parsed);
    } catch (e: any) {
      throw new Error(`Failed to restore database: ${e.message}`);
    }
  }
}

export const db = new DatabaseService();
