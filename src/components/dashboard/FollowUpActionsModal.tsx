import React, { useState } from 'react';
import { CalendarClock, CheckCircle2, ClipboardCheck, ExternalLink, History, RotateCcw, ShieldAlert, XCircle } from 'lucide-react';
import { Resident, ResidentTask } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog, ConfirmDialogRequest } from '../common/ConfirmDialog';
import { followUpActions } from '../../services/followUpActions';
import { db } from '../../db';
import { formatOverdueLabel, formatOccurrenceProgressLabel, formatTrackingProgressLabel, ResidentFollowUpEntry } from '../../services/dashboard';
import { getEffectiveOccurrenceCount, getPeriodOccurrences } from '../../services/occurrenceTracking';

export interface FollowUpActionsEntry {
  task: ResidentTask;
  resident: Resident;
}

interface FollowUpActionsModalProps {
  entry: FollowUpActionsEntry | null;
  today: string;
  onClose: () => void;
  /** Omit to hide "Open Resident / Task" — e.g. Resident Profile is already
   *  on that resident's page. */
  onOpenResident?: (residentId: string) => void;
  /** Opens Resident Profile → Activity & History, filtered to this task —
   *  the same underlying history the profile page shows, just a shortcut
   *  into it from Dashboard/Huddle. Omit to hide the action. */
  onViewHistory?: (residentId: string, taskId: string) => void;
  onChanged?: () => void;
}

/** The one compact panel for resolving a Resident Follow-up item — reused by
 *  Huddle and Resident Profile (Dashboard keeps its own fast, zero-confirm
 *  dropdown; see FollowUpStatusMenu). Every action here routes through the
 *  shared `followUpActions` helper, the same mutation surface the Dashboard
 *  card uses, so overdue/progress/carry-forward rules stay defined exactly
 *  once. Deliberate actions (Done, No Longer Required) require a confirm
 *  step; continuation actions (Carry Forward, Needs Review, Extend, Record
 *  Occurrence) apply immediately — this is not another task-management
 *  screen, just the operational question: is this done, does it continue,
 *  does it need review, is it no longer required, or where's the resident? */
export const FollowUpActionsModal: React.FC<FollowUpActionsModalProps> = ({ entry, today, onClose, onOpenResident, onViewHistory, onChanged }) => {
  const [confirmRequest, setConfirmRequest] = useState<ConfirmDialogRequest | null>(null);
  const [extendDate, setExtendDate] = useState('');

  if (!entry) return null;
  const { resident } = entry;
  // Re-read the task fresh from `db` by id on every render rather than
  // trusting `entry.task` — the caller's `entry` prop is a point-in-time
  // snapshot that doesn't necessarily update between repeated actions taken
  // while this panel stays open (e.g. clicking Record Occurrence twice in a
  // row without closing). Reading live means the target-reached / disabled
  // state, and the Undo affordance, are always correct even mid-session.
  const task = db.getState().residentTasks.find(t => t.id === entry.task.id) || entry.task;
  const tracking = task.trackingConfig;
  const isOccurrenceMode = Boolean(tracking?.requiredOccurrences);
  const currentEndDate = task.recurrenceRule?.endDate || '';
  const periodCompletedCount = isOccurrenceMode ? getEffectiveOccurrenceCount(task, today) : 0;
  const periodTarget = tracking?.requiredOccurrences || 0;
  const periodComplete = isOccurrenceMode && periodCompletedCount >= periodTarget;
  const lastPeriodOccurrence = isOccurrenceMode
    ? [...getPeriodOccurrences(task, today)].sort((a, b) => b.sequence - a.sequence)[0]
    : undefined;

  const applyAndClose = (action: () => void) => { action(); onChanged?.(); onClose(); };
  const applyAndStay = (action: () => void) => { action(); onChanged?.(); };

  const confirmDone = () => setConfirmRequest({
    title: 'Mark Follow-up Done',
    message: `Mark this follow-up as done?\n\n${task.title} — ${resident.roomNumber} ${resident.firstName} ${resident.lastName}`,
    confirmLabel: 'Mark Done',
    tone: 'default',
    onConfirm: () => applyAndClose(() => followUpActions.markDone(task.id)),
  });
  const confirmNoLongerNeeded = () => setConfirmRequest({
    title: 'Remove From Active Follow-up',
    message: `Remove this from active follow-up? It stays in the resident's history.\n\n${task.title} — ${resident.roomNumber} ${resident.firstName} ${resident.lastName}`,
    confirmLabel: 'Remove From Follow-up',
    tone: 'default',
    onConfirm: () => applyAndClose(() => followUpActions.noLongerNeeded(task.id)),
  });

  return (
    <>
      <Modal isOpen={!!entry} onClose={onClose} title="Follow-up Actions" subtitle={`${resident.roomNumber} · ${resident.firstName} ${resident.lastName}`} maxWidth="sm">
        <div className="space-y-4">
          <div>
            <p className="text-[13px] font-semibold text-ink">{task.title}</p>
            <p className="text-[12px] text-muted mt-0.5">{describeCurrentState(task, today)}</p>
          </div>

          <div className="space-y-1.5">
            {isOccurrenceMode ? (
              <>
                {periodComplete ? (
                  <div className="flex items-center gap-2 rounded-control border border-positive bg-positive-soft px-3 py-2 text-[12.5px] font-semibold text-positive">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    {periodCompletedCount}/{periodTarget} complete for this period
                  </div>
                ) : (
                  <ActionButton icon={ClipboardCheck} tone="positive" label="Record Occurrence" onClick={() => applyAndStay(() => followUpActions.recordOccurrence(task.id))} />
                )}
                {lastPeriodOccurrence && (
                  <button
                    type="button"
                    onClick={() => applyAndStay(() => followUpActions.reverseOccurrence(task.id, lastPeriodOccurrence.id))}
                    className="w-full text-center text-[11px] font-semibold text-muted hover:text-danger underline decoration-dotted underline-offset-2"
                  >
                    Undo last occurrence (#{lastPeriodOccurrence.sequence})
                  </button>
                )}
                <ActionButton icon={ShieldAlert} tone="warning" label="Needs Review" onClick={() => applyAndStay(() => followUpActions.needsReview(task.id))} />
              </>
            ) : tracking ? (
              <>
                <ActionButton icon={CheckCircle2} tone="positive" label="Mark Follow-up Complete" onClick={confirmDone} />
                <div className="rounded-control border border-hairline-strong p-2.5 space-y-1.5">
                  <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-soft">
                    <CalendarClock className="w-3.5 h-3.5" aria-hidden="true" />
                    Extend Tracking Period
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={extendDate || currentEndDate}
                      min={task.recurrenceRule?.startDate}
                      onChange={(e) => setExtendDate(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 border border-hairline-strong rounded-control text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => { const next = extendDate || currentEndDate; if (next) applyAndStay(() => followUpActions.extendTracking(task.id, next)); }}
                      className="btn btn-secondary text-xs px-3 py-1.5"
                    >
                      Extend
                    </button>
                  </div>
                </div>
                <ActionButton icon={ShieldAlert} tone="warning" label="Needs Review" onClick={() => applyAndStay(() => followUpActions.needsReview(task.id))} />
              </>
            ) : (
              <>
                <ActionButton icon={CheckCircle2} tone="positive" label="Done" onClick={confirmDone} />
                <ActionButton icon={RotateCcw} tone="neutral" label="Carry Forward" onClick={() => applyAndClose(() => followUpActions.carryForward(task.id))} />
                <ActionButton icon={ShieldAlert} tone="warning" label="Needs Review" onClick={() => applyAndClose(() => followUpActions.needsReview(task.id))} />
                <ActionButton icon={XCircle} tone="neutral" label="No Longer Required" onClick={confirmNoLongerNeeded} />
              </>
            )}
            {onViewHistory && (
              <ActionButton icon={History} tone="neutral" label="View History" onClick={() => { onClose(); onViewHistory(resident.id, task.id); }} />
            )}
            {onOpenResident && (
              <ActionButton icon={ExternalLink} tone="neutral" label="Open Resident / Task" onClick={() => { onClose(); onOpenResident(resident.id); }} />
            )}
          </div>

          <p className="text-[10.5px] text-faint border-t border-hairline pt-2.5">
            TaskSheet tracks operational follow-up only. Verify current care and instructions in the site's approved source-of-truth system.
          </p>
        </div>
      </Modal>
      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </>
  );
};

const TONE_CLASS: Record<'positive' | 'warning' | 'neutral', string> = {
  positive: 'text-positive hover:bg-positive-soft',
  warning: 'text-warning hover:bg-warning-soft',
  neutral: 'text-ink-soft hover:bg-panel-sunken',
};

const ActionButton: React.FC<{ icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>; tone: 'positive' | 'warning' | 'neutral'; label: string; onClick: () => void }> = ({ icon: Icon, tone, label, onClick }) => (
  <button type="button" onClick={onClick} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-control border border-hairline-strong text-[12.5px] font-semibold transition-colors ${TONE_CLASS[tone]}`}>
    <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
    {label}
  </button>
);

/** Screen-reader/plain-text description of the task's current state,
 *  matching the same labels the Dashboard card and Huddle already show —
 *  computed the same way as `getResidentFollowUpTasks`'s `statusLabel` so
 *  this panel never disagrees with the row that opened it. */
function describeCurrentState(task: ResidentTask, today: string): string {
  const tracking = task.trackingConfig;
  if (tracking?.requiredOccurrences) {
    return formatOccurrenceProgressLabel(getEffectiveOccurrenceCount(task, today), tracking.requiredOccurrences);
  }
  if (tracking) {
    const start = task.recurrenceRule?.startDate;
    const end = task.recurrenceRule?.endDate;
    if (start) return formatTrackingProgressLabel(start, end, today);
    return 'Tracking';
  }
  const dueDate = task.followUpDueDate || task.recurrenceRule?.startDate;
  if (!dueDate) return 'Due';
  const carryForwardCount = task.followUpCarryForwardCount || 0;
  const parts = [formatOverdueLabel(dueDate, today)];
  if (carryForwardCount > 0) parts.push(`Carried forward${carryForwardCount > 1 ? ` ${carryForwardCount}×` : ''}`);
  return parts.join(' · ');
}

/** Convenience constructor for callers that already have a `ResidentFollowUpEntry`
 *  (Huddle, Resident Profile) — avoids re-deriving `{ task, resident }` at each call site. */
export function toFollowUpActionsEntry(entry: ResidentFollowUpEntry): FollowUpActionsEntry {
  return { task: entry.task, resident: entry.resident };
}
