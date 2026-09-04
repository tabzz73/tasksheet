import React from 'react';
import { Activity, ClockAlert, CircleAlert, Droplets, Hospital, Info, ShieldAlert, Sparkles, TriangleAlert, Wrench } from 'lucide-react';
import { AppDatabaseState, EmergencyCode, ResidentTaskFollowUpStatus } from '../../types';
import { db } from '../../db';
import {
  getActiveAttentionItems,
  getAwayResidents,
  getDashboardFyis,
  getResidentFollowUpTasks,
  getTodaysBathingCount,
  getUnitSituationSummary,
  getWoundAttentionItems,
  ResidentFollowUpBucket,
  UnitSituationEntry,
} from '../../services/dashboard';
import { FollowUpStatusMenu } from '../common/FollowUpStatusMenu';

/** One icon per scope, never the same warning icon for everything —
 *  reinforces what the item actually is, not just that it's important. */
const UNIT_SITUATION_ICON: Record<UnitSituationEntry['scope'], React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>> = {
  unit: Wrench,
  site: ShieldAlert,
};

const FYI_IMPORTANCE_BADGE: Record<string, string> = {
  urgent: 'badge-danger',
  high: 'badge-warning',
  normal: 'badge-neutral',
};

/** Small icon + word pairing for a high/urgent FYI — never color alone.
 *  Normal-importance FYIs get no icon, so routine notes don't compete
 *  visually with the ones that actually need a second look. */
const FyiImportanceFlag: React.FC<{ importance: 'normal' | 'high' | 'urgent' }> = ({ importance }) => {
  if (importance === 'urgent') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-danger shrink-0">
        <TriangleAlert className="w-3.5 h-3.5" aria-hidden="true" />
        Urgent
      </span>
    );
  }
  if (importance === 'high') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-warning shrink-0">
        <CircleAlert className="w-3.5 h-3.5" aria-hidden="true" />
        Important
      </span>
    );
  }
  return null;
};

// ─── Away From Unit ─────────────────────────────────────────────────────────
export const AwayFromUnitCard: React.FC<{ state: AppDatabaseState; onOpenResident: (id: string) => void }> = ({ state, onOpenResident }) => {
  const away = getAwayResidents(state);
  return (
    <div className="title-block rounded-surface p-4">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft mb-2">Away From Unit</h3>
      {away.length === 0 ? (
        <p className="text-[12px] text-muted">Everyone is currently in the facility.</p>
      ) : (
        <ul className="space-y-1.5">
          {away.map(({ resident, statusLabel }) => (
            <li key={resident.id}>
              <button
                type="button"
                onClick={() => onOpenResident(resident.id)}
                className="w-full flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-control hover:bg-panel-sunken transition-colors text-left"
              >
                <span className="min-w-0 flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-ink-soft shrink-0">{resident.roomNumber}</span>
                  <span className="text-[12.5px] font-semibold text-ink truncate">{resident.firstName} {resident.lastName}</span>
                </span>
                <span className="badge badge-warning shrink-0 inline-flex items-center gap-1">
                  {resident.status === 'in_hospital' && <Hospital className="w-3 h-3" aria-hidden="true" />}
                  {statusLabel}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Resident Attention ─────────────────────────────────────────────────────
export const ResidentAttentionCard: React.FC<{ state: AppDatabaseState; today: string; onOpenResident: (id: string) => void }> = ({ state, today, onOpenResident }) => {
  const items = getActiveAttentionItems(state, today, 'resident');
  return (
    <div className="title-block rounded-surface p-4">
      <h3 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-soft mb-2">
        <TriangleAlert className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
        Resident Attention
      </h3>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted">No active resident attention items.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(({ resident, item, endingSoon }) => resident && (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpenResident(resident.id)}
                className="w-full flex items-start justify-between gap-2 px-2 py-1.5 -mx-2 rounded-control hover:bg-panel-sunken transition-colors text-left"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-ink-soft shrink-0">{resident.roomNumber}</span>
                    <span className="text-[12.5px] font-semibold text-ink truncate">{item.title}</span>
                  </span>
                  {item.details && <span className="block text-[11px] text-muted mt-0.5 truncate">{item.details}</span>}
                </span>
                {endingSoon && (
                  <span className="badge badge-warning shrink-0 inline-flex items-center gap-1">
                    <ClockAlert className="w-3 h-3" aria-hidden="true" />
                    {item.endDate === today ? 'Ends today' : 'Ends tomorrow'}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Resident Follow-up (tasks explicitly flagged for the Dashboard) ───────
const FOLLOW_UP_BADGE_CLASS: Record<ResidentFollowUpBucket, string> = {
  needs_review: 'badge-danger',
  overdue: 'badge-warning',
  due_today: 'badge-warning',
  carry_forward: 'badge-warning',
  tracking_active: 'badge-neutral',
  tracking_open_ended: 'badge-neutral',
};

export const ResidentFollowUpCard: React.FC<{ state: AppDatabaseState; today: string; onOpenResident: (id: string) => void; onChanged?: () => void }> = ({ state, today, onOpenResident, onChanged }) => {
  const items = getResidentFollowUpTasks(state, today);

  const handleSetStatus = (taskId: string, status: ResidentTaskFollowUpStatus) => {
    db.setResidentTaskFollowUpStatus(taskId, status);
    onChanged?.();
  };

  return (
    <div className="title-block rounded-surface p-4">
      <h3 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-soft mb-2">
        <Activity className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
        Resident Follow-up
      </h3>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted">No follow-up tasks flagged for the Dashboard.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(({ resident, task, bucket, statusLabel, needsReview }) => (
            <li key={task.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onOpenResident(resident.id)}
                className="min-w-0 flex-1 flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-control hover:bg-panel-sunken transition-colors text-left"
              >
                <span className="min-w-0 flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-ink-soft shrink-0">{resident.roomNumber}</span>
                  <span className="text-[12.5px] font-semibold text-ink truncate">{task.title}</span>
                </span>
                <span className={`badge ${FOLLOW_UP_BADGE_CLASS[bucket]} shrink-0 inline-flex items-center gap-1`}>
                  {needsReview && <ShieldAlert className="w-3 h-3" aria-hidden="true" />}
                  {(bucket === 'overdue' || bucket === 'carry_forward') && !needsReview && <ClockAlert className="w-3 h-3" aria-hidden="true" />}
                  {statusLabel}
                </span>
              </button>
              <FollowUpStatusMenu ariaLabel={`Update follow-up status for ${task.title}`} onSetStatus={(status) => handleSetStatus(task.id, status)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Latest FYI ──────────────────────────────────────────────────────────────
export const LatestFyiCard: React.FC<{ state: AppDatabaseState; today: string; onNavigateToBinder: () => void }> = ({ state, today, onNavigateToBinder }) => {
  const fyis = getDashboardFyis(state, today, 5);
  return (
    <div className="title-block rounded-surface p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="flex items-center gap-1.5 text-[13px] font-bold uppercase tracking-wide text-ink-soft">
          <Info className="w-3.5 h-3.5 text-accent" aria-hidden="true" />
          Latest FYI
        </h3>
        <button type="button" onClick={onNavigateToBinder} className="text-[11px] font-bold text-accent-strong hover:text-accent transition-colors">
          View FYI Binder →
        </button>
      </div>
      {fyis.length === 0 ? (
        <p className="text-[12px] text-muted">No current FYIs.</p>
      ) : (
        <ul className="space-y-2">
          {fyis.map(fyi => (
            <li key={fyi.id} className="flex items-start gap-2 flex-wrap">
              <span className={`badge ${FYI_IMPORTANCE_BADGE[fyi.importance]} shrink-0 mt-0.5`}>{fyi.category}</span>
              <FyiImportanceFlag importance={fyi.importance} />
              <span className="text-[12.5px] text-ink-soft leading-snug">{fyi.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Current Unit Situation ─────────────────────────────────────────────────
// "What unusual or temporary things are happening on the unit/site right
// now?" — sourced exclusively from active Unit + Site scoped Attention
// items. Resident-scoped situations live on the Resident Attention card.
export const UnitSituationCard: React.FC<{ state: AppDatabaseState; today: string }> = ({ state, today }) => {
  const entries = getUnitSituationSummary(state, today);

  return (
    <div className="title-block rounded-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-accent" aria-hidden="true" />
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">Current Unit Situation</h3>
      </div>
      {entries.length === 0 ? (
        <p className="text-[12px] text-muted">Nothing unusual to report — a quiet shift so far.</p>
      ) : (
        <ul className="space-y-1.5">
          {entries.map(entry => {
            const Icon = UNIT_SITUATION_ICON[entry.scope];
            return (
              <li key={entry.id} className="flex items-center gap-1.5 px-2 py-1 -mx-2 text-[12.5px]">
                <Icon className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
                <span className="text-ink truncate">{entry.label}</span>
                <span className="text-[11px] text-muted shrink-0 ml-auto">{entry.dateLabel}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

// ─── Code of the Month ───────────────────────────────────────────────────────
export const CodeOfMonthCard: React.FC<{ state: AppDatabaseState; onOpenSettings: () => void }> = ({ state, onOpenSettings }) => {
  const enabled = state.settings.codeOfTheMonthEnabled === true;
  const code: EmergencyCode | undefined = (state.settings.emergencyCodes || []).find(c => c.id === state.settings.codeOfTheMonthId);

  if (!enabled) return null;

  return (
    <div className="title-block rounded-surface p-4">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft mb-2">Code of the Month</h3>
      {code ? (
        <div>
          <p className="font-heading font-extrabold text-[18px] text-danger">CODE {code.code.toUpperCase()}</p>
          <p className="text-[12.5px] text-ink-soft">{code.name}</p>
          {code.reminder && <p className="text-[12px] text-muted mt-2">{code.reminder}</p>}
          <p className="text-[11px] text-faint mt-2">Site procedure: review your local Emergency Response Manual.</p>
        </div>
      ) : (
        <button type="button" onClick={onOpenSettings} className="text-[12px] text-accent-strong hover:text-accent font-semibold">
          Choose a code in Settings → Emergency Codes →
        </button>
      )}
    </div>
  );
};

// ─── Today's Bathing ─────────────────────────────────────────────────────────
export const TodaysBathingCard: React.FC<{ state: AppDatabaseState; today: string; onNavigateToBathing: () => void }> = ({ state, today, onNavigateToBathing }) => {
  const count = getTodaysBathingCount(state, today);
  return (
    <div className="title-block rounded-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Droplets className="w-4 h-4 text-accent" aria-hidden="true" />
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">Today's Bathing</h3>
      </div>
      <p className="font-heading text-[24px] font-extrabold text-ink">{count}</p>
      <p className="text-[12px] text-muted">scheduled today</p>
      <button type="button" onClick={onNavigateToBathing} className="mt-2 text-[11px] font-bold text-accent-strong hover:text-accent transition-colors">
        Open Bathing →
      </button>
    </div>
  );
};

// ─── Wound Attention ─────────────────────────────────────────────────────────
export const WoundAttentionCard: React.FC<{ state: AppDatabaseState; today: string; onOpenResident: (id: string) => void }> = ({ state, today, onOpenResident }) => {
  const items = getWoundAttentionItems(state, today);
  const hasAttention = items.some(item => item.isNew);
  return (
    <div className="title-block rounded-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className={`w-4 h-4 ${hasAttention ? 'text-danger' : 'text-ink-soft'}`} aria-hidden="true" />
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">Wound Attention</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted">No new or recently changed wounds.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(({ resident, wound, isNew }) => (
            <li key={wound.id}>
              <button type="button" onClick={() => onOpenResident(resident.id)} className="w-full flex items-center justify-between gap-2 px-2 py-1.5 -mx-2 rounded-control hover:bg-panel-sunken transition-colors text-left">
                <span className="min-w-0 flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-ink-soft shrink-0">{resident.roomNumber}</span>
                  <span className="text-[12.5px] font-semibold text-ink truncate">{wound.siteLocation}</span>
                </span>
                {isNew && (
                  <span className="badge badge-danger shrink-0 inline-flex items-center gap-1">
                    <TriangleAlert className="w-3 h-3" aria-hidden="true" />
                    New
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
