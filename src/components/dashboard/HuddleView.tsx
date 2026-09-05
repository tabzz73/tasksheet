import React, { useState } from 'react';
import { CalendarClock, ClockAlert, Hospital, Printer, RotateCcw, ShieldAlert, TriangleAlert, Users } from 'lucide-react';
import { Modal } from '../common/Modal';
import { CardNavigationButton } from '../common/CardNavigationButton';
import { FollowUpActionsModal, FollowUpActionsEntry, toFollowUpActionsEntry } from './FollowUpActionsModal';
import { FOLLOW_UP_BADGE_CLASS } from './DashboardWidgets';
import { AppDatabaseState } from '../../types';
import { getHuddleBriefing, getMustNotMissFollowUp, ResidentFollowUpEntry } from '../../services/dashboard';

interface HuddleViewProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppDatabaseState;
  today: string;
  /** Same "Thursday, September 3, 2026" format the Dashboard header shows —
   *  passed in rather than reformatted here so the two views can never drift
   *  onto different date conventions for what is the same operational day. */
  formattedToday: string;
  /** Closes the Huddle and navigates when "Open Resident / Task" or "View
   *  History" is chosen from a Must-Not-Miss row's Follow-up Actions panel.
   *  `focusTaskId`, when present, opens Resident Profile straight into
   *  Activity & History filtered to that task. */
  onOpenResident?: (residentId: string, focusTaskId?: string) => void;
  /** Called after a Follow-up Actions mutation so the parent (Dashboard)
   *  re-renders with fresh state — Huddle's `state` prop is a snapshot, not
   *  a live subscription, matching the pattern every other dashboard widget
   *  already uses. */
  onChanged?: () => void;
  /** Opens the printable Huddle Sheet — the same read-only projection this
   *  modal itself renders, reused rather than a second Huddle pipeline.
   *  Omitted hides the "Print Huddle" action entirely. */
  onPrintHuddle?: () => void;
}

/** Icon per Must-Not-Miss row state — never color alone. Needs Review gets
 *  the strongest attention icon; carry-forward gets a distinct history/arrow
 *  icon (not the same warning icon as overdue) per the restrained-attention
 *  visual language: not every row reads as equally urgent. */
const followUpRowIcon = (entry: ResidentFollowUpEntry) => {
  if (entry.needsReview) return ShieldAlert;
  if (entry.bucket === 'carry_forward') return RotateCcw;
  if (entry.bucket === 'overdue') return ClockAlert;
  if (entry.isTracking) return CalendarClock;
  return ClockAlert; // due today
};

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="font-heading text-[13px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">{children}</h4>
);

/** Read-only shift-change briefing — assembled fresh from Census, Away,
 *  showInHuddle Attention (Unit/Site and Resident), showInHuddle Resident
 *  Tasks, showInHuddle FYIs, and Code of the Month. Not a record type: there
 *  is nothing here to create, edit, or persist. */
export const HuddleView: React.FC<HuddleViewProps> = ({ isOpen, onClose, state, today, formattedToday, onOpenResident, onChanged, onPrintHuddle }) => {
  const [actionsEntry, setActionsEntry] = useState<FollowUpActionsEntry | null>(null);
  if (!isOpen) return null;
  const briefing = getHuddleBriefing(state, today);
  const mustNotMiss = getMustNotMissFollowUp(state, today);
  const nothingToShow =
    briefing.away.length === 0 &&
    briefing.unitSiteAttention.length === 0 &&
    briefing.residentAttention.length === 0 &&
    briefing.residentFollowUp.length === 0 &&
    briefing.importantFyis.length === 0 &&
    mustNotMiss.length === 0;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Shift Huddle" subtitle={`Briefing for ${formattedToday}`} maxWidth="3xl">
      <div className="space-y-5">
        <div>
          <SectionHeading>Census</SectionHeading>
          <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
            <span className="inline-flex items-center gap-1.5 badge badge-neutral">
              <Users className="w-3.5 h-3.5" aria-hidden="true" />
              {briefing.census.activeCount} active
            </span>
            {briefing.census.inHospitalCount > 0 && <span className="badge badge-warning">{briefing.census.inHospitalCount} in hospital</span>}
            {briefing.census.outOnPassCount > 0 && <span className="badge badge-warning">{briefing.census.outOnPassCount} out on pass</span>}
            {briefing.census.onHoldCount > 0 && <span className="badge badge-warning">{briefing.census.onHoldCount} on hold</span>}
          </div>
        </div>

        {briefing.away.length > 0 && (
          <div>
            <SectionHeading>Away From Unit</SectionHeading>
            <ul className="space-y-1">
              {briefing.away.map(({ resident, statusLabel }) => (
                <li key={resident.id} className="flex items-center gap-2 text-[12.5px]">
                  <Hospital className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
                  <span className="font-mono font-bold text-ink-soft">{resident.roomNumber}</span>
                  <span className="text-ink">{resident.firstName} {resident.lastName}</span>
                  <span className="text-muted">— {statusLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {briefing.unitSiteAttention.length > 0 && (
          <div>
            <SectionHeading>Current Unit Situation</SectionHeading>
            <ul className="space-y-1">
              {briefing.unitSiteAttention.map(({ item }) => (
                <li key={item.id} className="flex items-center gap-2 text-[12.5px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
                  <span className="text-ink">{item.title}</span>
                  {item.details && <span className="text-muted">— {item.details}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {briefing.residentAttention.length > 0 && (
          <div>
            <SectionHeading>Resident Attention</SectionHeading>
            <ul className="space-y-1">
              {briefing.residentAttention.map(({ item, resident }) => (
                <li key={item.id} className="flex items-center gap-2 text-[12.5px]">
                  <TriangleAlert className="w-3.5 h-3.5 text-warning shrink-0" aria-hidden="true" />
                  {resident && <span className="font-mono font-bold text-ink-soft">{resident.roomNumber}</span>}
                  <span className="text-ink">{item.title}</span>
                  {item.details && <span className="text-muted">— {item.details}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mustNotMiss.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <SectionHeading>Must-Not-Miss Follow-up</SectionHeading>
              <span className="badge badge-danger shrink-0">{mustNotMiss.length} need{mustNotMiss.length === 1 ? 's' : ''} attention</span>
            </div>
            <ul className="space-y-1">
              {mustNotMiss.map(entry => {
                const Icon = followUpRowIcon(entry);
                return (
                  <li key={entry.task.id} className="relative flex items-center gap-2 px-2 py-1.5 -mx-2 text-[12.5px] rounded-control hover:bg-panel-sunken transition-colors">
                    <CardNavigationButton
                      label={`Follow-up actions for ${entry.task.title}, ${entry.resident.roomNumber}`}
                      onActivate={() => setActionsEntry(toFollowUpActionsEntry(entry))}
                    />
                    <Icon className={`w-3.5 h-3.5 shrink-0 relative z-20 pointer-events-none ${entry.needsReview ? 'text-danger' : entry.bucket === 'due_today' ? 'text-ink-soft' : 'text-warning'}`} aria-hidden="true" />
                    <span className="relative z-20 pointer-events-none font-mono font-bold text-ink-soft shrink-0">{entry.resident.roomNumber}</span>
                    <span className="relative z-20 pointer-events-none text-ink truncate">{entry.task.title}</span>
                    <span className={`relative z-20 pointer-events-none ml-auto shrink-0 badge ${FOLLOW_UP_BADGE_CLASS[entry.bucket]}`}>{entry.statusLabel}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {briefing.residentFollowUp.length > 0 && (
          <div>
            <SectionHeading>Resident Follow-up</SectionHeading>
            <ul className="space-y-1">
              {briefing.residentFollowUp.map(({ task, resident, statusLabel, needsReview }) => (
                <li key={task.id} className="flex items-center gap-2 text-[12.5px]">
                  {needsReview && <ShieldAlert className="w-3.5 h-3.5 text-danger shrink-0" aria-hidden="true" />}
                  <span className="font-mono font-bold text-ink-soft">{resident.roomNumber}</span>
                  <span className="text-ink">— {task.title}</span>
                  <span className="text-muted">— {statusLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {briefing.importantFyis.length > 0 && (
          <div>
            <SectionHeading>Important FYI</SectionHeading>
            <ul className="space-y-1">
              {briefing.importantFyis.map(fyi => (
                <li key={fyi.id} className="text-[12.5px] text-ink">{fyi.text}</li>
              ))}
            </ul>
          </div>
        )}

        {briefing.codeOfMonth && (
          <div>
            <SectionHeading>Code of the Month</SectionHeading>
            <p className="font-heading font-extrabold text-[16px] text-danger">CODE {briefing.codeOfMonth.code.toUpperCase()}</p>
            <p className="text-[12.5px] text-ink-soft">{briefing.codeOfMonth.name}</p>
          </div>
        )}

        {nothingToShow && (
          <p className="text-[12.5px] text-muted">Nothing flagged for huddle — a quiet shift so far.</p>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
          {onPrintHuddle && (
            <button type="button" onClick={onPrintHuddle} className="btn btn-secondary inline-flex items-center gap-1.5">
              <Printer className="w-3.5 h-3.5" aria-hidden="true" />
              Print Huddle
            </button>
          )}
          <button type="button" onClick={onClose} className="btn btn-secondary">Done</button>
        </div>
      </div>
    </Modal>
    <FollowUpActionsModal
      entry={actionsEntry}
      today={today}
      onClose={() => setActionsEntry(null)}
      onOpenResident={onOpenResident ? (residentId) => { onClose(); onOpenResident(residentId); } : undefined}
      onViewHistory={onOpenResident ? (residentId, taskId) => { onClose(); onOpenResident(residentId, taskId); } : undefined}
      onChanged={onChanged}
    />
    </>
  );
};
