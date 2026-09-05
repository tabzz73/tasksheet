import React, { useMemo, useState } from 'react';
import { ExternalLink, History, Search } from 'lucide-react';
import { AppDatabaseState, ResidentTask } from '../../types';
import {
  getResidentActivityEvents,
  getLastCompletedTaskEvent,
  hasRecordedHistory,
  categorizeResidentHistoryEvent,
  RESIDENT_HISTORY_CATEGORY_LABELS,
  ResidentHistoryCategory,
} from '../../services/residentHistory';

const PAGE_SIZE = 25;
const CATEGORY_ORDER: ResidentHistoryCategory[] = ['all', 'tasks', 'follow_up', 'tracking', 'attention', 'fyi', 'wounds', 'resident_status', 'other'];

interface ResidentActivityHistoryTabProps {
  state: AppDatabaseState;
  residentId: string;
  residentTasks: ResidentTask[];
  /** Deep-links this tab straight into one task's history — what a task's
   *  "View History" action opens. */
  initialTaskId?: string;
  onOpenTask?: (task: ResidentTask) => void;
}

/** Resident Profile → Activity & History. A read/filter layer over the
 *  central, append-only audit log (`services/residentHistory`) — never a
 *  second per-resident history store. Answers the operational questions
 *  staff actually ask ("when was this done", "was it carried forward",
 *  "was this resident on tracking, from when to when") without requiring
 *  anyone to reconstruct events from memory. */
export const ResidentActivityHistoryTab: React.FC<ResidentActivityHistoryTabProps> = ({
  state, residentId, residentTasks, initialTaskId, onOpenTask,
}) => {
  const [category, setCategory] = useState<ResidentHistoryCategory>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [taskFilterId, setTaskFilterId] = useState<string | undefined>(initialTaskId);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const taskFilterTitle = taskFilterId ? residentTasks.find(t => t.id === taskFilterId)?.title : undefined;

  const events = useMemo(
    () => getResidentActivityEvents(state, residentId, { category, search, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, entityId: taskFilterId }),
    [state, residentId, category, search, dateFrom, dateTo, taskFilterId]
  );
  const visible = events.slice(0, visibleCount);

  const lastCompleted = useMemo(() => getLastCompletedTaskEvent(state, residentId), [state, residentId]);
  const resetFilters = () => { setCategory('all'); setSearch(''); setDateFrom(''); setDateTo(''); setTaskFilterId(undefined); setVisibleCount(PAGE_SIZE); };

  // A task-filtered view with zero events either means genuinely nothing has
  // happened yet, or (for an older record) this predates the audit system —
  // those two must never look the same, so the empty state is worded from
  // `hasRecordedHistory`, not just "events.length === 0". Separately, a
  // filter (category/search/date) narrowing an otherwise non-empty resident
  // history to nothing reads as "no history matches these filters," not as
  // "no audit history exists at all" — those are also different claims.
  const taskHasNoAuditHistory = Boolean(taskFilterId) && !hasRecordedHistory(state, taskFilterId!);
  const isFiltered = category !== 'all' || search.trim() !== '' || Boolean(dateFrom) || Boolean(dateTo) || Boolean(taskFilterId);

  return (
    <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="w-5 h-5 text-accent-strong" />
        <h3 className="text-base font-bold text-ink">Activity & History</h3>
      </div>
      <p className="text-xs text-muted -mt-2">
        Who changed what for this resident, and when — tasks, follow-up, tracking, attention, FYI, wounds, and status changes, newest first.
      </p>

      {lastCompleted && !taskFilterId && (
        <p className="text-xs text-ink-soft bg-panel-sunken rounded-control px-3 py-2">
          Last completed: <strong>{lastCompleted.summary.replace(/ marked Done$/, '')}</strong> · {new Date(lastCompleted.occurredAt).toLocaleString()}
        </p>
      )}

      {taskFilterId && (
        <div className="flex items-center justify-between gap-2 rounded-control border border-accent bg-accent-soft px-3 py-2 text-xs font-semibold text-accent-strong">
          <span>Showing history for: {taskFilterTitle || 'this task'}</span>
          <button type="button" onClick={() => setTaskFilterId(undefined)} className="underline decoration-dotted underline-offset-2 hover:text-accent">Clear</button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORY_ORDER.map(id => (
          <button
            key={id}
            type="button"
            onClick={() => { setCategory(id); setVisibleCount(PAGE_SIZE); }}
            className={`px-2.5 py-1 rounded-control text-[11px] font-bold transition-colors ${category === id ? 'bg-ink text-white' : 'bg-panel-sunken text-ink-soft hover:bg-panel border border-hairline-strong'}`}
          >
            {RESIDENT_HISTORY_CATEGORY_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <label className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-faint" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search history…"
            aria-label="Search history"
            className="w-full rounded-control border border-hairline-strong py-1.5 pl-7 pr-2.5 text-xs"
          />
        </label>
        <input type="date" aria-label="From date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setVisibleCount(PAGE_SIZE); }} className="rounded-control border border-hairline-strong px-2 py-1.5 text-xs" />
        <input type="date" aria-label="To date" value={dateTo} onChange={e => { setDateTo(e.target.value); setVisibleCount(PAGE_SIZE); }} className="rounded-control border border-hairline-strong px-2 py-1.5 text-xs" />
        <button type="button" onClick={resetFilters} className="rounded-control border border-hairline-strong px-2.5 py-1.5 text-xs font-bold text-ink-soft hover:bg-panel-sunken">Clear Filters</button>
      </div>

      <div className="divide-y divide-hairline">
        {visible.map(event => {
          const task = event.entityType === 'resident_task' && event.entityId ? residentTasks.find(t => t.id === event.entityId) : undefined;
          return (
            <div key={event.id} data-testid="audit-row" className="py-2.5 text-xs">
              <div className="flex flex-wrap items-center gap-x-1.5">
                <span className="font-bold text-ink">{event.userDisplayName}</span>
                <span className="text-faint">·</span>
                <span className="font-semibold text-accent-strong">{RESIDENT_HISTORY_CATEGORY_LABELS[categorizeResidentHistoryEvent(event, state)]}</span>
                <span className="ml-auto text-[11px] text-faint">{new Date(event.occurredAt).toLocaleString()}</span>
              </div>
              <p className="mt-0.5 text-ink-soft">{event.summary}{event.shiftSnapshot ? ` (${event.shiftSnapshot})` : ''}</p>
              {event.changes && <p className="mt-0.5 whitespace-pre-line text-[11px] text-muted">{event.changes}</p>}
              {task && onOpenTask && (
                <button type="button" onClick={() => onOpenTask(task)} className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-accent-strong hover:text-accent">
                  <ExternalLink className="h-3 w-3" aria-hidden="true" /> Open Task
                </button>
              )}
            </div>
          );
        })}
        {!visible.length && (
          <p className="py-4 text-xs text-muted">
            {taskFilterId && taskHasNoAuditHistory
              ? 'Created before Task History was enabled.'
              : isFiltered
                ? 'No history matches these filters.'
                : 'No audit history yet — either audit tracking wasn\'t enabled when this record was created, or nothing has changed.'}
          </p>
        )}
      </div>
      {events.length > visible.length && (
        <div className="text-center">
          <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)} className="rounded-control border border-hairline-strong px-4 py-2 text-xs font-bold text-ink-soft hover:bg-panel-sunken">
            Load More
          </button>
        </div>
      )}
    </div>
  );
};
