import React, { useEffect, useMemo, useState } from 'react';
import { History, Search } from 'lucide-react';
import { db } from '../../db';
import { AuditAction, AuditEntityType } from '../../types';

const PAGE_SIZE = 50;

const ACTION_LABELS: Partial<Record<AuditAction, string>> = {
  created: 'Created',
  updated: 'Updated',
  status_changed: 'Status changed',
  ended: 'Ended',
  deactivated: 'Deactivated',
  reactivated: 'Reactivated',
  follow_up_status_changed: 'Follow-up status changed',
  occurrence_recorded: 'Occurrence recorded',
  tracking_extended: 'Tracking extended',
  print_preview_opened: 'Print preview opened',
  backup_exported: 'Backup exported',
  backup_restored: 'Backup restored',
  demo_loaded: 'Demo data loaded',
  demo_cleared: 'Demo data cleared',
  real_setup_started: 'Real setup started',
  password_reset: 'Password reset',
  password_changed: 'Password changed',
  login: 'Signed in',
  login_failed: 'Sign-in failed',
  logout: 'Signed out',
};

const ENTITY_LABELS: Partial<Record<AuditEntityType, string>> = {
  resident: 'Resident',
  resident_task: 'Resident Task',
  attention_item: 'Attention Item',
  fyi: 'FYI',
  wound: 'Wound',
  shift: 'Shift',
  facility_settings: 'Facility Settings',
  print: 'Print',
  backup: 'Backup',
  demo: 'Demo Data',
  user: 'User',
  session: 'Session',
};

export const AuditHistoryTab: React.FC = () => {
  const [revision, setRevision] = useState(0);
  useEffect(() => db.subscribe(() => setRevision(value => value + 1)), []);
  const state = db.getState(); void revision;

  const [search, setSearch] = useState('');
  const [userFilter, setUserFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | AuditAction>('ALL');
  const [entityFilter, setEntityFilter] = useState<'ALL' | AuditEntityType>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'demo' | 'manual'>('ALL');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const knownUsers = useMemo(
    () => [...new Set(state.auditEvents.map(event => event.userDisplayName))].sort(),
    [state.auditEvents]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.auditEvents
      .filter(event => userFilter === 'ALL' || event.userDisplayName === userFilter)
      .filter(event => actionFilter === 'ALL' || event.action === actionFilter)
      .filter(event => entityFilter === 'ALL' || event.entityType === entityFilter)
      .filter(event => sourceFilter === 'ALL' || event.sourceMode === sourceFilter)
      .filter(event => !query || event.summary.toLowerCase().includes(query) || event.userDisplayName.toLowerCase().includes(query) || (event.roomSnapshot || '').toLowerCase().includes(query))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  }, [state.auditEvents, search, userFilter, actionFilter, entityFilter, sourceFilter]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="space-y-5">
      <div className="rounded-surface border border-hairline-strong bg-panel p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-control bg-accent-soft p-2 text-accent-strong"><History className="h-5 w-5" /></div>
          <div>
            <h3 className="font-black text-ink">Audit History</h3>
            <p className="mt-1 text-xs text-muted">Who changed what, and when. Entries are append-only and cannot be edited or deleted.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-5">
          <label className="relative sm:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-faint" />
            <input value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE); }} placeholder="Search summary, user, room…" className="w-full rounded-control border border-hairline-strong py-2 pl-8 pr-3 text-sm" />
          </label>
          <select value={userFilter} onChange={e => { setUserFilter(e.target.value); setVisibleCount(PAGE_SIZE); }} className="rounded-control border border-hairline-strong px-2.5 py-2 text-xs font-semibold">
            <option value="ALL">All users</option>
            {knownUsers.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <select value={entityFilter} onChange={e => { setEntityFilter(e.target.value as any); setVisibleCount(PAGE_SIZE); }} className="rounded-control border border-hairline-strong px-2.5 py-2 text-xs font-semibold">
            <option value="ALL">All areas</option>
            {Object.entries(ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => { setSourceFilter(e.target.value as any); setVisibleCount(PAGE_SIZE); }} className="rounded-control border border-hairline-strong px-2.5 py-2 text-xs font-semibold">
            <option value="ALL">Demo & manual</option>
            <option value="manual">Manual only</option>
            <option value="demo">Demo only</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-surface border border-hairline-strong bg-panel">
        <div className="border-b border-hairline-strong p-4">
          <h3 className="text-sm font-black text-ink">Events</h3>
          <p className="text-xs text-muted">{filtered.length} matching event{filtered.length === 1 ? '' : 's'}</p>
        </div>
        <div className="divide-y divide-hairline">
          {visible.map(event => (
            <div key={event.id} data-testid="audit-row" className="px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                <span className="font-bold text-ink">{event.userDisplayName}</span>
                <span className="text-faint">·</span>
                <span className="font-semibold text-accent-strong">{ACTION_LABELS[event.action] || event.action}</span>
                <span className="text-faint">·</span>
                <span className="text-muted">{ENTITY_LABELS[event.entityType] || event.entityType}</span>
                {event.sourceMode === 'demo' && <span className="rounded-control bg-panel-sunken px-1.5 py-0.5 text-[10px] font-bold uppercase text-faint">Demo</span>}
                <span className="ml-auto text-[11px] text-faint">{new Date(event.occurredAt).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{event.summary}{event.roomSnapshot ? ` — Room ${event.roomSnapshot}` : ''}{event.shiftSnapshot ? ` (${event.shiftSnapshot})` : ''}</p>
              {event.changes && <pre className="mt-1 whitespace-pre-wrap rounded-control bg-panel-sunken px-2.5 py-1.5 text-[11px] text-ink-soft">{event.changes}</pre>}
            </div>
          ))}
          {!visible.length && <div className="p-8 text-center text-sm text-muted"><History className="mx-auto mb-2 h-6 w-6" />No audit events match these filters.</div>}
        </div>
        {filtered.length > visible.length && (
          <div className="border-t border-hairline-strong p-3 text-center">
            <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)} className="rounded-control border border-hairline-strong px-4 py-2 text-xs font-bold text-ink-soft hover:bg-panel-sunken">
              Load More
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
