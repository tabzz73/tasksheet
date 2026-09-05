import { db } from '../../db';
import { Facility } from '../../types';

/**
 * PrintHistory Service
 * --------------------
 * Records lightweight metadata about what TaskSheet documents have been generated.
 * This is NOT a completion tracker — it records generation events only.
 *
 * ADR-001 compliance: No task completion state is ever stored here.
 * The task snapshot is used exclusively for change-detection between prints.
 */

const STORAGE_KEY = 'tasksheet_print_history_v1';
const MAX_ENTRIES = 100;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TaskSnapshotItem {
  id: string;
  roomNumber: string;
  residentName: string;
  title: string;
  time?: string;
  category: string;
  instructions?: string;
  priority?: string;
  updatedAt: string;
}

export interface PrintHistoryEntry {
  id: string;
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  /** Assignment date in YYYY-MM-DD format */
  date: string;
  /** ISO timestamp of when the document was generated */
  generatedAt: string;
  profile: 'simple_checklist' | 'clinical_worksheet';
  /** Total scheduled items at time of generation */
  totalItems: number;
  revision: number;
  /**
   * Structured task snapshot at the time of print.
   * Used to generate the itemized "What Changed?" delta sheet.
   */
  items: TaskSnapshotItem[];
}

export interface PrintChangesSummary {
  hasChanges: boolean;
  added: number;
  modified: number;
  removed: number;
  lastGeneratedAt: string;
  revision: number;
}

export interface WhatChangedModel {
  shiftCode: string;
  shiftName: string;
  dateStr: string;
  formattedDate: string;
  lastGeneratedAt: string;
  newGeneratedAt: string;
  previousRevision: number;
  newRevision: number;
  facility: Facility;
  added: TaskSnapshotItem[];
  modified: Array<{ current: TaskSnapshotItem; previous?: TaskSnapshotItem }>;
  removed: TaskSnapshotItem[];
  totalChanges: number;
}

interface PrintHistoryState {
  entries: PrintHistoryEntry[];
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

let memoryState: PrintHistoryState = { entries: [] };

function loadState(): PrintHistoryState {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as PrintHistoryState;
    }
    return memoryState;
  } catch {
    return memoryState;
  }
}

function saveState(state: PrintHistoryState): void {
  try {
    const trimmed = state.entries.slice(-MAX_ENTRIES);
    memoryState = { entries: trimmed };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ entries: trimmed }));
    }
  } catch {
    // Storage quota or private browsing — silently ignore
  }
}

function makeId(): string {
  return `ph_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Snapshot builder ─────────────────────────────────────────────────────────

export function buildTaskSnapshot(tasks: Array<{ id: string; updatedAt?: string; createdAt?: string }>): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (const t of tasks) {
    snapshot[t.id] = t.updatedAt || t.createdAt || 'unknown';
  }
  return snapshot;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Record a print generation event for a shift+date combination.
 * Returns the new PrintHistoryEntry.
 */
export function recordPrint(params: {
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  date: string;
  profile: 'simple_checklist' | 'clinical_worksheet';
  totalItems: number;
  items?: TaskSnapshotItem[];
  taskSnapshot?: Record<string, string>;
}): PrintHistoryEntry {
  const state = loadState();

  const previous = getEntry(params.shiftId, params.date);
  const revision = previous ? previous.revision + 1 : 1;

  const entry: PrintHistoryEntry = {
    id: makeId(),
    shiftId: params.shiftId,
    shiftCode: params.shiftCode,
    shiftName: params.shiftName,
    date: params.date,
    generatedAt: new Date().toISOString(),
    profile: params.profile,
    totalItems: params.totalItems,
    revision,
    items: params.items || [],
  };

  const filtered = state.entries.filter(
    e => !(e.shiftId === params.shiftId && e.date === params.date)
  );
  filtered.push(entry);
  saveState({ entries: filtered });

  // Honest wording: this fires when print preview is opened, not after an
  // actual OS print completes — the platform can't reliably confirm that.
  db.recordAuditEvent({
    action: 'print_preview_opened',
    entityType: 'print',
    summary: `Print preview opened: ${params.shiftName} (${params.shiftCode}) · ${params.date}`,
  });

  return entry;
}

/**
 * List every recorded print history entry, newest first. Used by the
 * read-only History panel — never returns rendered page content, only the
 * same lightweight generation metadata already stored per entry.
 */
export function listEntries(): PrintHistoryEntry[] {
  return [...loadState().entries].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
}

/**
 * Get the most recent print history entry for a given shift+date.
 */
export function getEntry(shiftId: string, date: string): PrintHistoryEntry | undefined {
  const state = loadState();
  return state.entries
    .filter(e => e.shiftId === shiftId && e.date === date)
    .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))[0];
}

/**
 * Detect changes between the last recorded generation and the current task list.
 */
export function detectChanges(
  shiftId: string,
  date: string,
  currentTasks: Array<{ id: string; updatedAt?: string; createdAt?: string; instructions?: string }>
): PrintChangesSummary | null {
  const entry = getEntry(shiftId, date);
  if (!entry) return null;

  const previousItems = entry.items || [];
  const prevMap = new Map<string, TaskSnapshotItem>();
  previousItems.forEach(item => prevMap.set(item.id, item));

  const currentIds = new Set(currentTasks.map(t => t.id));

  let added = 0;
  let modified = 0;
  let removed = 0;

  // Check current tasks against previous snapshot
  for (const t of currentTasks) {
    const prev = prevMap.get(t.id);
    if (!prev) {
      added++;
    } else {
      const currentTs = t.updatedAt || t.createdAt || '';
      if (currentTs && prev.updatedAt && currentTs !== prev.updatedAt) {
        modified++;
      }
    }
  }

  // Check for tasks in snapshot that no longer exist in currentTasks
  for (const prevId of prevMap.keys()) {
    if (!currentIds.has(prevId)) {
      removed++;
    }
  }

  const hasChanges = added > 0 || modified > 0 || removed > 0;

  return {
    hasChanges,
    added,
    modified,
    removed,
    lastGeneratedAt: entry.generatedAt,
    revision: entry.revision,
  };
}

/**
 * Builds the full itemized "What Changed?" delta model.
 */
export function buildWhatChangedModel(
  shiftId: string,
  date: string,
  currentTasks: TaskSnapshotItem[]
): WhatChangedModel | null {
  const entry = getEntry(shiftId, date);
  if (!entry) return null;

  const state = db.getState();
  const facility = state.facility;
  const shift = state.shifts.find(s => s.id === shiftId);

  const prevMap = new Map<string, TaskSnapshotItem>();
  (entry.items || []).forEach(item => prevMap.set(item.id, item));

  const currentMap = new Map<string, TaskSnapshotItem>();
  currentTasks.forEach(item => currentMap.set(item.id, item));

  const added: TaskSnapshotItem[] = [];
  const modified: Array<{ current: TaskSnapshotItem; previous?: TaskSnapshotItem }> = [];
  const removed: TaskSnapshotItem[] = [];

  // Added & Modified
  for (const curr of currentTasks) {
    const prev = prevMap.get(curr.id);
    if (!prev) {
      added.push(curr);
    } else if (curr.updatedAt !== prev.updatedAt || curr.instructions !== prev.instructions || curr.time !== prev.time) {
      modified.push({ current: curr, previous: prev });
    }
  }

  // Removed
  for (const [id, prev] of prevMap.entries()) {
    if (!currentMap.has(id)) {
      removed.push(prev);
    }
  }

  const [y, m, d] = date.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return {
    shiftCode: shift?.shortCode || entry.shiftCode || '',
    shiftName: shift?.name || entry.shiftName || 'Shift TaskSheet',
    dateStr: date,
    formattedDate,
    lastGeneratedAt: entry.generatedAt,
    newGeneratedAt: new Date().toISOString(),
    previousRevision: entry.revision,
    newRevision: entry.revision + 1,
    facility,
    added,
    modified,
    removed,
    totalChanges: added.length + modified.length + removed.length,
  };
}

/**
 * Format a generation timestamp into human-friendly format (e.g. "Aug 24 · 07:45 p.m.").
 */
export function formatGeneratedAt(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-CA', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
