import React from 'react';
import { Droplets, ShieldAlert, Sparkles } from 'lucide-react';
import { AppDatabaseState, EmergencyCode } from '../../types';
import {
  getActiveResidentAttentionItems,
  getAwayResidents,
  getDashboardFyis,
  getTodaysBathingCount,
  getWoundAttentionItems,
} from '../../services/dashboard';

const FYI_IMPORTANCE_BADGE: Record<string, string> = {
  urgent: 'badge-danger',
  high: 'badge-warning',
  normal: 'badge-neutral',
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
                <span className="badge badge-warning shrink-0">{statusLabel}</span>
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
  const items = getActiveResidentAttentionItems(state, today);
  return (
    <div className="title-block rounded-surface p-4">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft mb-2">Resident Attention</h3>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted">No active attention items.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map(({ resident, item, endingSoon }) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpenResident(resident.id)}
                className="w-full flex items-start justify-between gap-2 px-2 py-1.5 -mx-2 rounded-control hover:bg-panel-sunken transition-colors text-left"
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-ink-soft shrink-0">{resident.roomNumber}</span>
                    <span className="text-[12.5px] font-semibold text-ink truncate">{item.type}</span>
                  </span>
                  {item.note && <span className="block text-[11px] text-muted mt-0.5 truncate">{item.note}</span>}
                </span>
                {endingSoon && <span className="badge badge-warning shrink-0">{item.endDate === today ? 'Ends today' : 'Ends tomorrow'}</span>}
              </button>
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
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">Latest FYI</h3>
        <button type="button" onClick={onNavigateToBinder} className="text-[11px] font-bold text-accent-strong hover:text-accent transition-colors">
          View FYI Binder →
        </button>
      </div>
      {fyis.length === 0 ? (
        <p className="text-[12px] text-muted">No current FYIs.</p>
      ) : (
        <ul className="space-y-2">
          {fyis.map(fyi => (
            <li key={fyi.id} className="flex items-start gap-2">
              <span className={`badge ${FYI_IMPORTANCE_BADGE[fyi.importance]} shrink-0 mt-0.5`}>{fyi.category}</span>
              <span className="text-[12.5px] text-ink-soft leading-snug">{fyi.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Current Unit Situation (flagship huddle panel) ────────────────────────
export const UnitSituationCard: React.FC<{ state: AppDatabaseState; today: string; onOpenResident: (id: string) => void; onNavigateToBinder: () => void }> = ({ state, today, onOpenResident, onNavigateToBinder }) => {
  const away = getAwayResidents(state);
  const attention = getActiveResidentAttentionItems(state, today);
  const urgentFyis = getDashboardFyis(state, today, 5).filter(f => f.importance !== 'normal');

  const lineCount = away.length + attention.length + urgentFyis.length;

  return (
    <div className="title-block rounded-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4 text-accent" />
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">Current Unit Situation</h3>
      </div>
      {lineCount === 0 ? (
        <p className="text-[12px] text-muted">Nothing unusual to report — a quiet shift so far.</p>
      ) : (
        <ul className="space-y-1.5">
          {attention.map(({ resident, item }) => (
            <li key={`att_${item.id}`}>
              <button type="button" onClick={() => onOpenResident(resident.id)} className="w-full text-left px-2 py-1 -mx-2 rounded-control hover:bg-panel-sunken transition-colors text-[12.5px]">
                <span className="font-mono font-bold text-ink-soft mr-1.5">{resident.roomNumber}</span>
                <span className="text-ink">{item.type}</span>
              </button>
            </li>
          ))}
          {away.map(({ resident, statusLabel }) => (
            <li key={`away_${resident.id}`}>
              <button type="button" onClick={() => onOpenResident(resident.id)} className="w-full text-left px-2 py-1 -mx-2 rounded-control hover:bg-panel-sunken transition-colors text-[12.5px]">
                <span className="font-mono font-bold text-ink-soft mr-1.5">{resident.roomNumber}</span>
                <span className="text-ink">{statusLabel}</span>
              </button>
            </li>
          ))}
          {urgentFyis.map(fyi => (
            <li key={`fyi_${fyi.id}`}>
              <button type="button" onClick={onNavigateToBinder} className="w-full text-left px-2 py-1 -mx-2 rounded-control hover:bg-panel-sunken transition-colors text-[12.5px] text-ink">
                {fyi.text}
              </button>
            </li>
          ))}
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
        <Droplets className="w-4 h-4 text-accent" />
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
  return (
    <div className="title-block rounded-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-danger" />
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
                {isNew && <span className="badge badge-danger shrink-0">New</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
