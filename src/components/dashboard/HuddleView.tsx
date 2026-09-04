import React from 'react';
import { Hospital, ShieldAlert, TriangleAlert, Users } from 'lucide-react';
import { Modal } from '../common/Modal';
import { AppDatabaseState } from '../../types';
import { getHuddleBriefing } from '../../services/dashboard';

interface HuddleViewProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppDatabaseState;
  today: string;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-[12px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">{children}</h4>
);

/** Read-only shift-change briefing — assembled fresh from Census, Away,
 *  showInHuddle Attention (Unit/Site and Resident), showInHuddle Resident
 *  Tasks, showInHuddle FYIs, and Code of the Month. Not a record type: there
 *  is nothing here to create, edit, or persist. */
export const HuddleView: React.FC<HuddleViewProps> = ({ isOpen, onClose, state, today }) => {
  if (!isOpen) return null;
  const briefing = getHuddleBriefing(state, today);
  const nothingToShow =
    briefing.away.length === 0 &&
    briefing.unitSiteAttention.length === 0 &&
    briefing.residentAttention.length === 0 &&
    briefing.residentFollowUp.length === 0 &&
    briefing.importantFyis.length === 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Shift Huddle" subtitle={`Briefing for ${today}`} maxWidth="3xl">
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
      </div>
    </Modal>
  );
};
