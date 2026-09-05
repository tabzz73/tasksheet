import { AppDatabaseState, AuditEvent } from '../types';

/** Resident Activity & History's own grouping — coarser than the raw
 *  `AuditEntityType`/`AuditAction` the central audit log uses, matched to
 *  the questions staff actually ask ("was this carried forward", "was it
 *  tracking"), not to the storage shape. Purely a read-time UI filter; the
 *  underlying audit events are the single source of truth (see
 *  `db.appendAudit`) and are never duplicated into a second history store. */
export type ResidentHistoryCategory =
  | 'all' | 'tasks' | 'follow_up' | 'tracking' | 'attention' | 'fyi' | 'wounds' | 'resident_status' | 'other';

export const RESIDENT_HISTORY_CATEGORY_LABELS: Record<ResidentHistoryCategory, string> = {
  all: 'All',
  tasks: 'Tasks',
  follow_up: 'Follow-up',
  tracking: 'Tracking',
  attention: 'Attention',
  fyi: 'FYI',
  wounds: 'Wounds',
  resident_status: 'Resident Status',
  other: 'Other',
};

/** A `follow_up_status_changed` event is bucketed as Tracking rather than
 *  Follow-up when the referenced task currently has a `trackingConfig` —
 *  matching how the on-screen Dashboard/Huddle already tell the two apart.
 *  A best-effort read of live state, not a stored classification, so a
 *  task that's since been deleted degrades gracefully to Follow-up rather
 *  than throwing or guessing. */
export function categorizeResidentHistoryEvent(event: AuditEvent, state: AppDatabaseState): ResidentHistoryCategory {
  switch (event.entityType) {
    case 'attention_item': return 'attention';
    case 'fyi': return 'fyi';
    case 'wound': return 'wounds';
    case 'resident': return 'resident_status';
    case 'resident_task': {
      if (event.action === 'tracking_extended' || event.action === 'occurrence_recorded' || event.action === 'occurrence_reversed') return 'tracking';
      if (event.action === 'follow_up_status_changed') {
        const task = state.residentTasks.find(t => t.id === event.entityId);
        return task?.trackingConfig ? 'tracking' : 'follow_up';
      }
      return 'tasks';
    }
    default: return 'other';
  }
}

export interface ResidentHistoryFilters {
  /** Omit or `'all'` for every category. */
  category?: ResidentHistoryCategory;
  /** Inclusive, `YYYY-MM-DD`. */
  dateFrom?: string;
  dateTo?: string;
  /** Case-insensitive substring match against summary, changes, and actor name. */
  search?: string;
  /** Restrict to one entity (e.g. a single ResidentTask) — this is what
   *  a task's "View History" action filters down to. */
  entityId?: string;
}

/** The one place Resident Profile → Activity & History (and any shortcut
 *  into it) reads from — filters the central, append-only audit log down to
 *  one resident. No second per-resident history store; this is a query,
 *  not a projection copy. */
export function getResidentActivityEvents(
  state: AppDatabaseState,
  residentId: string,
  filters: ResidentHistoryFilters = {}
): AuditEvent[] {
  const query = (filters.search || '').trim().toLowerCase();
  return state.auditEvents
    .filter(event => event.residentId === residentId)
    .filter(event => !filters.entityId || event.entityId === filters.entityId)
    .filter(event => !filters.category || filters.category === 'all' || categorizeResidentHistoryEvent(event, state) === filters.category)
    .filter(event => !filters.dateFrom || event.occurredAt.slice(0, 10) >= filters.dateFrom)
    .filter(event => !filters.dateTo || event.occurredAt.slice(0, 10) <= filters.dateTo)
    .filter(event => !query
      || event.summary.toLowerCase().includes(query)
      || (event.changes || '').toLowerCase().includes(query)
      || event.userDisplayName.toLowerCase().includes(query))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

/** History for one specific record (a ResidentTask, most commonly) —
 *  what a "View History" action on that record opens. Every event still
 *  shows its own snapshot text even if the record's title/details have
 *  since changed (append-only — see `db.appendAudit`'s callers). */
export function getEntityHistoryEvents(state: AppDatabaseState, entityId: string): AuditEvent[] {
  return state.auditEvents
    .filter(event => event.entityId === entityId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

/** Answers "when was this last marked Done, and by whom" directly from
 *  history — never inferred from `updatedAt`, which changes on any edit,
 *  not just completion. `titleQuery` narrows by task title substring (e.g.
 *  "urine") when the resident has more than one relevant task. */
export function getLastCompletedTaskEvent(
  state: AppDatabaseState,
  residentId: string,
  titleQuery?: string
): AuditEvent | undefined {
  const query = (titleQuery || '').trim().toLowerCase();
  return state.auditEvents
    .filter(event =>
      event.residentId === residentId &&
      event.entityType === 'resident_task' &&
      event.action === 'follow_up_status_changed' &&
      event.summary.endsWith(' marked Done'))
    .filter(event => !query || event.summary.toLowerCase().includes(query))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())[0];
}

/** All tracking-related history for a resident (started/extended/occurrence
 *  progress/completed) across every tracking task — the "Tracking" category
 *  filter, exposed as its own helper since "was this resident on tracking,
 *  from when to when" is one of the standard questions this feature exists
 *  to answer. */
export function getTrackingHistoryForResident(state: AppDatabaseState, residentId: string): AuditEvent[] {
  return getResidentActivityEvents(state, residentId, { category: 'tracking' });
}

/** True once at least one audit event references this record. A task whose
 *  `followUpStatus`/`trackingConfig` implies real activity but has zero
 *  matching events predates the audit system — its history is genuinely
 *  unknown, not empty, so callers should show "Created before Task History
 *  was enabled" rather than an empty list (which would misleadingly read as
 *  "nothing ever happened"). Never fabricates a synthetic event to fill
 *  the gap. */
export function hasRecordedHistory(state: AppDatabaseState, entityId: string): boolean {
  return state.auditEvents.some(event => event.entityId === entityId);
}
