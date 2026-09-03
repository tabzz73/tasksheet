import React from 'react';
import {
  Clock,
  Printer,
  Users,
  BookOpen,
  Plus,
  Info,
  ClipboardList,
  Bandage,
  ChevronDown
} from 'lucide-react';
import { db } from '../../db';
import { generateShiftSheet, GeneratedShiftSheet } from '../../services/generator';
import { AddEntityType } from '../modals/GlobalAddModal';
import { CardNavigationButton } from '../common/CardNavigationButton';

const SHIFT_ROW_GRID = '11% 1fr 13% 13% 11% 9% 9%';

interface DashboardViewProps {
  currentDate: string;
  onOpenShift: (shiftId: string) => void;
  onOpenQuickAdd: (type?: AddEntityType) => void;
  onPrintShift: (shiftSheet: GeneratedShiftSheet) => void;
  onNavigateToBinder: () => void;
  onNavigateToResidents: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentDate,
  onOpenShift,
  onOpenQuickAdd,
  onPrintShift,
  onNavigateToBinder,
  onNavigateToResidents
}) => {
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const state = db.getState();
  const activeShifts = state.shifts
    .filter(s => s.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const shiftSheets = activeShifts.map(s => {
    try {
      return generateShiftSheet(currentDate, s.id);
    } catch {
      return null;
    }
  }).filter((s): s is GeneratedShiftSheet => s !== null);

  const totalScheduledToday = shiftSheets.reduce((sum, s) => sum + s.metrics.totalScheduled, 0);

  const activeResidentCount = state.residents.filter(r => r.status === 'active').length;
  const inHospitalCount = state.residents.filter(r => r.status === 'in_hospital').length;
  const outOnPassCount = state.residents.filter(r => r.status === 'out_on_pass').length;
  const onHoldCount = state.residents.filter(r => r.status === 'on_hold').length;
  const suspendedCount = inHospitalCount + outOnPassCount + onHoldCount;

  const binderNeedsUpdate = state.binderState.status === 'update_required';

  const formattedDate = new Date(currentDate + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-ink">Dashboard</h2>
          <p className="text-[12px] text-muted mt-0.5 tabular-nums">{formattedDate}</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="btn btn-accent"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Add</span>
            <ChevronDown className="w-3 h-3 opacity-80" />
          </button>

          {quickAddOpen && (
            <div
              onClick={() => setQuickAddOpen(false)}
              className="absolute right-0 mt-1.5 w-56 bg-panel rounded-surface border border-hairline-strong shadow-elevated py-1 z-40 text-[13px]"
            >
              <button type="button" onClick={() => onOpenQuickAdd('care_task')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                <Plus className="w-3.5 h-3.5 text-accent" />
                <span>Resident Care Task</span>
              </button>
              <button type="button" onClick={() => onOpenQuickAdd('unit_task')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                <ClipboardList className="w-3.5 h-3.5 text-accent" />
                <span>Unit Task</span>
              </button>
              <button type="button" onClick={() => onOpenQuickAdd('resident')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                <Users className="w-3.5 h-3.5 text-accent" />
                <span>Resident</span>
              </button>
              <button type="button" onClick={() => onOpenQuickAdd('fyi')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                <Info className="w-3.5 h-3.5 text-accent" />
                <span>FYI Standing Note</span>
              </button>
              <button type="button" onClick={() => onOpenQuickAdd('wound')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                <Bandage className="w-3.5 h-3.5 text-danger" />
                <span>Wound Protocol</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Operational summary strip — one bordered bar, not four cards */}
      <div className="title-block rounded-surface flex flex-wrap divide-x divide-hairline">
        <div className="px-4 py-3 flex-1 min-w-[140px]">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">Scheduled Today</div>
          <div className="text-xl font-bold text-ink tabular-nums mt-0.5">{totalScheduledToday}</div>
          <div className="text-[11px] text-muted">across {activeShifts.length} shift{activeShifts.length === 1 ? '' : 's'}</div>
        </div>
        <button type="button" onClick={onNavigateToResidents} className="px-4 py-3 flex-1 min-w-[140px] text-left hover:bg-panel-sunken transition-colors">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">Residents</div>
          <div className="text-xl font-bold text-ink tabular-nums mt-0.5">{activeResidentCount}</div>
          <div className="text-[11px] text-muted">
            {suspendedCount > 0 ? `${inHospitalCount} hosp · ${outOnPassCount} pass · ${onHoldCount} hold` : 'no care suspensions'}
          </div>
        </button>
        <div className="px-4 py-3 flex-1 min-w-[140px]">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">Active Shifts</div>
          <div className="text-xl font-bold text-ink tabular-nums mt-0.5">{activeShifts.length}</div>
          <div className="text-[11px] text-muted truncate">
            {activeShifts.slice(0, 3).map(s => s.shortCode || s.name).join(' · ')}{activeShifts.length > 3 ? ` +${activeShifts.length - 3}` : ''}
          </div>
        </div>
        <button type="button" onClick={onNavigateToBinder} className="px-4 py-3 flex-1 min-w-[140px] text-left hover:bg-panel-sunken transition-colors">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-muted">FYI Binder</div>
          <div className={`text-xl font-bold mt-0.5 ${binderNeedsUpdate ? 'text-warning' : 'text-positive'}`}>
            {binderNeedsUpdate ? 'Update Req.' : 'Current'}
          </div>
          <div className="text-[11px] text-muted">
            {binderNeedsUpdate ? `${state.binderState.pendingChangesCount} pending change${state.binderState.pendingChangesCount === 1 ? '' : 's'}` : 'physical binder confirmed'}
          </div>
        </button>
      </div>

      {/* Today's shifts — schedule table, not a card grid */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-[13px] font-bold uppercase tracking-wide text-ink-soft">Today's Shifts</h3>
          <p className="text-[11px] text-muted">Select a shift to review or print.</p>
        </div>

        {shiftSheets.length === 0 ? (
          <div className="title-block rounded-surface py-10 text-center text-muted">
            <Clock className="w-7 h-7 mx-auto text-faint mb-2" />
            <p className="text-[13px] font-semibold text-ink-soft">No active shifts configured</p>
            <p className="text-[12px] text-muted mt-0.5">Go to Settings → Roles &amp; Shifts to add shifts.</p>
          </div>
        ) : (
          <div className="title-block rounded-surface overflow-hidden">
            <div className="overflow-x-auto">
            <div
              className="grid px-3.5 h-9 items-center border-b border-hairline-strong text-[10.5px] font-bold uppercase tracking-wide text-muted min-w-[560px]"
              style={{ gridTemplateColumns: SHIFT_ROW_GRID }}
            >
              <div className="min-w-0 truncate">Code</div>
              <div className="min-w-0 truncate">Shift</div>
              <div className="min-w-0 truncate">Time</div>
              <div className="min-w-0 truncate">Resident Care</div>
              <div className="min-w-0 truncate">Unit Tasks</div>
              <div className="min-w-0 truncate">FYI</div>
              <div className="min-w-0 truncate text-right">Print</div>
            </div>
            <div className="min-w-[560px]">
              {shiftSheets.map(sheet => (
                <div
                  key={sheet.shift.id}
                  className="relative grid px-3.5 h-12 items-center border-b border-hairline last:border-b-0 hover:bg-panel-sunken transition-colors"
                  style={{ gridTemplateColumns: SHIFT_ROW_GRID }}
                >
                  <CardNavigationButton
                    label={`Open ${sheet.shift.shortCode || sheet.shift.name} shift`}
                    onActivate={() => onOpenShift(sheet.shift.id)}
                    roundedClassName="rounded-none"
                  />
                  <div className="relative z-20 pointer-events-none">
                    <span className="inline-flex items-center justify-center px-2 h-6 bg-ink text-white rounded-control font-mono font-bold text-[11px] tracking-wide">
                      {sheet.shift.shortCode || '—'}
                    </span>
                  </div>
                  <div className="relative z-20 pointer-events-none min-w-0">
                    <div className="font-semibold text-ink text-[13px] truncate">{sheet.shift.name}</div>
                    <div className="text-[11px] text-accent font-medium truncate">{sheet.role.name}</div>
                  </div>
                  <div className="relative z-20 pointer-events-none font-mono text-[12px] text-ink-soft tabular-nums">{sheet.shift.startTime}–{sheet.shift.endTime}</div>
                  <div className="relative z-20 pointer-events-none tabular-nums text-[13px] text-ink-soft">{sheet.metrics.totalResidentTasks}</div>
                  <div className="relative z-20 pointer-events-none tabular-nums text-[13px] text-ink-soft">{sheet.metrics.totalUnitTasks}</div>
                  <div className="relative z-20 pointer-events-none tabular-nums text-[13px] text-ink-soft">{sheet.metrics.fyiCount}</div>
                  <div className="relative z-20 text-right">
                    <button
                      type="button"
                      onClick={() => onPrintShift(sheet)}
                      aria-label={`Print ${sheet.shift.shortCode || sheet.shift.name}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-control border border-hairline-strong text-ink-soft hover:bg-panel-sunken hover:text-ink transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
