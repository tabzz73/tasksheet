import React, { useState, useEffect } from 'react';
import {
  Printer,
  Plus,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  LayoutGrid,
  Info,
  AlertTriangle,
  HeartHandshake,
  ClipboardList,
  Users,
  Bandage,
  Settings2,
  ChevronDown
} from 'lucide-react';
import { db } from '../../db';
import { generateShiftSheet, GeneratedShiftSheet } from '../../services/generator';
import { AddEntityType } from '../modals/GlobalAddModal';
import { getTodayLocalDateString } from '../../services/recurrence';
import { CardNavigationButton } from '../common/CardNavigationButton';

interface ShiftsViewProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onOpenShift: (shiftId: string) => void;
  onPrintShift: (sheet: GeneratedShiftSheet) => void;
  onOpenAddShift: () => void;
  onOpenQuickAdd?: (type?: AddEntityType) => void;
}

type ViewMode = 'list' | 'cards';

const VIEW_MODE_KEY = 'tasksheet_shifts_view_mode';

function stepDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return date.toISOString().split('T')[0];
}

function formatDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isToday(dateStr: string): boolean {
  return dateStr === getTodayLocalDateString();
}

export const ShiftsView: React.FC<ShiftsViewProps> = ({
  currentDate,
  onDateChange,
  onOpenShift,
  onPrintShift,
  onOpenAddShift,
  onOpenQuickAdd
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem(VIEW_MODE_KEY) as ViewMode) || 'list'; }
    catch { return 'list'; }
  });

  useEffect(() => {
    try { localStorage.setItem(VIEW_MODE_KEY, viewMode); } catch { /* ignore */ }
  }, [viewMode]);

  const state = db.getState();
  const activeShifts = state.shifts
    .filter(s => s.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const filteredShifts = activeShifts.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const role = state.roles.find(r => r.id === s.roleId);
    return (
      s.shortCode?.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      role?.name.toLowerCase().includes(q) ||
      role?.code.toLowerCase().includes(q)
    );
  });

  const shiftSheets = filteredShifts.map(s => {
    try { return generateShiftSheet(currentDate, s.id); }
    catch { return null; }
  }).filter((s): s is GeneratedShiftSheet => s !== null);

  const today = getTodayLocalDateString();

  const handlePrintDirect = (e: React.MouseEvent, sheet: GeneratedShiftSheet) => {
    e.stopPropagation();
    onPrintShift(sheet);
  };

  return (
    <div className="space-y-4 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-ink">Shifts</h2>
          <p className="text-[12px] text-muted mt-0.5">Review and generate Shift TaskSheets.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button type="button" onClick={onOpenAddShift} className="btn btn-secondary">
            <Settings2 className="w-3.5 h-3.5" />
            <span>Configure Shifts</span>
          </button>

          <div className="relative">
            <button type="button" onClick={() => setQuickAddOpen(!quickAddOpen)} className="btn btn-accent">
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add</span>
              <ChevronDown className="w-3 h-3 opacity-80" />
            </button>

            {quickAddOpen && (
              <div
                onClick={() => setQuickAddOpen(false)}
                className="absolute right-0 mt-1.5 w-52 bg-panel rounded-surface border border-hairline-strong shadow-elevated py-1 z-40 text-[13px]"
              >
                <button type="button" onClick={() => onOpenQuickAdd?.('care_task')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                  <HeartHandshake className="w-3.5 h-3.5 text-accent" />
                  <span>Care Task</span>
                </button>
                <button type="button" onClick={() => onOpenQuickAdd?.('unit_task')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                  <ClipboardList className="w-3.5 h-3.5 text-accent" />
                  <span>Unit Task / Routine</span>
                </button>
                <button type="button" onClick={() => onOpenQuickAdd?.('resident')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                  <Users className="w-3.5 h-3.5 text-accent" />
                  <span>Add Resident</span>
                </button>
                <button type="button" onClick={() => onOpenQuickAdd?.('fyi')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                  <Info className="w-3.5 h-3.5 text-accent" />
                  <span>FYI Standing Note</span>
                </button>
                <button type="button" onClick={() => onOpenQuickAdd?.('wound')} className="w-full px-3.5 h-9 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center gap-2.5">
                  <Bandage className="w-3.5 h-3.5 text-danger" />
                  <span>Wound Protocol</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Date navigator + search + view toggle — one bordered toolbar strip */}
      <div className="title-block rounded-surface px-3.5 py-2.5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onDateChange(stepDate(currentDate, -1))} className="p-1.5 hover:bg-panel-sunken rounded-control text-ink-soft transition-colors" title="Previous day">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-2 min-w-[190px] text-center">
            <p className="text-[13px] font-bold text-ink">{formatDateHeader(currentDate)}</p>
          </div>
          <button type="button" onClick={() => onDateChange(stepDate(currentDate, 1))} className="p-1.5 hover:bg-panel-sunken rounded-control text-ink-soft transition-colors" title="Next day">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isToday(currentDate) ? (
            <button type="button" onClick={() => onDateChange(today)} className="ml-1 badge badge-accent cursor-pointer">Today</button>
          ) : (
            <span className="ml-1 badge badge-accent">Today</span>
          )}
        </div>

        <div className="flex-1 min-w-[12px]" />

        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search shifts…"
          className="px-3 h-8 bg-panel-sunken border border-hairline rounded-control text-[12px] font-medium text-ink focus:ring-1 focus:ring-accent focus:outline-none w-40"
        />

        <div className="flex items-center border border-hairline-strong rounded-control overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            aria-pressed={viewMode === 'list'}
            className={`flex items-center gap-1.5 px-2.5 h-8 text-[12px] font-semibold transition-colors ${viewMode === 'list' ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'}`}
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <div className="w-px self-stretch bg-hairline-strong" />
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            aria-pressed={viewMode === 'cards'}
            className={`flex items-center gap-1.5 px-2.5 h-8 text-[12px] font-semibold transition-colors ${viewMode === 'cards' ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {shiftSheets.length === 0 && (
        <div className="title-block rounded-surface py-10 text-center text-muted text-[13px]">
          {searchQuery ? 'No shifts match your search.' : 'No active shifts configured. Use Configure Shifts to get started.'}
        </div>
      )}

      {/* List view — schedule-table visual language, div-based rows so the full-row
          navigation control (CardNavigationButton) never nests inside a `role="button"` row */}
      {viewMode === 'list' && shiftSheets.length > 0 && (
        <div className="title-block rounded-surface overflow-hidden">
          <div className="overflow-x-auto">
          <div
            className="grid px-3.5 h-9 items-center border-b border-hairline-strong text-[10.5px] font-bold uppercase tracking-wide text-muted min-w-[560px]"
            style={{ gridTemplateColumns: '10% 1fr 14% 12% 10% 8%' }}
          >
            <div className="min-w-0 truncate">Code</div>
            <div className="min-w-0 truncate">Shift</div>
            <div className="min-w-0 truncate">Time</div>
            <div className="min-w-0 truncate">Tasks</div>
            <div className="min-w-0 truncate">FYI</div>
            <div className="min-w-0 truncate text-right">Print</div>
          </div>
          <div className="min-w-[560px]">
            {shiftSheets.map(sheet => {
              const { shift, role, metrics } = sheet;
              const hasFYIs = metrics.fyiCount > 0;
              const hasUrgentFYI = sheet.importantFYIs.some(f => f.importance === 'urgent');
              return (
                <div
                  key={shift.id}
                  className="relative grid px-3.5 h-12 items-center border-b border-hairline last:border-b-0 hover:bg-panel-sunken transition-colors"
                  style={{ gridTemplateColumns: '10% 1fr 14% 12% 10% 8%' }}
                >
                  <CardNavigationButton
                    label={`Open ${shift.shortCode || shift.name} shift`}
                    onActivate={() => onOpenShift(shift.id)}
                    roundedClassName="rounded-none"
                  />
                  <div className="relative z-20 pointer-events-none">
                    <span className="inline-flex items-center justify-center px-2 h-6 bg-ink text-white rounded-control font-mono font-bold text-[11px] tracking-wide">
                      {shift.shortCode || '—'}
                    </span>
                  </div>
                  <div className="relative z-20 pointer-events-none min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-ink text-[13px] truncate">{shift.name}</span>
                      {hasUrgentFYI && <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" aria-label="Urgent FYI on this shift" />}
                    </div>
                    <div className="text-[11px] text-accent font-medium truncate">{role.name}</div>
                  </div>
                  <div className="relative z-20 pointer-events-none font-mono text-[12px] text-ink-soft tabular-nums">{shift.startTime}–{shift.endTime}</div>
                  <div className="relative z-20 pointer-events-none tabular-nums text-[13px] text-ink-soft">{metrics.totalScheduled}</div>
                  <div className="relative z-20 pointer-events-none tabular-nums text-[13px]">
                    {hasFYIs ? <span className="text-accent font-semibold">{metrics.fyiCount}</span> : <span className="text-faint">—</span>}
                  </div>
                  <div className="relative z-20 text-right">
                    <button
                      type="button"
                      onClick={e => handlePrintDirect(e, sheet)}
                      aria-label={`Print ${shift.shortCode || shift.name}`}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-control border border-hairline-strong text-ink-soft hover:bg-panel-sunken hover:text-ink transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          </div>
        </div>
      )}

      {/* Cards view — kept as a secondary, denser alternative */}
      {viewMode === 'cards' && shiftSheets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {shiftSheets.map(sheet => {
            const { shift, role, metrics } = sheet;
            const hasFYIs = metrics.fyiCount > 0;

            return (
              <div
                key={shift.id}
                className="relative title-block rounded-surface p-4 flex flex-col justify-between hover:border-accent transition-colors"
              >
                <CardNavigationButton
                  label={`Open ${shift.shortCode || shift.name} shift`}
                  onActivate={() => onOpenShift(shift.id)}
                  roundedClassName="rounded-surface"
                />
                <div className="relative z-20 pointer-events-none">
                  <div className="flex items-start justify-between mb-2.5">
                    <span className="inline-flex items-center justify-center px-2.5 h-7 bg-ink text-white rounded-control font-mono font-bold text-[12px] tracking-wide">
                      {shift.shortCode || '—'}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-ink-soft tabular-nums pt-1.5">{shift.startTime}–{shift.endTime}</span>
                  </div>

                  <h3 className="text-[14px] font-bold text-ink leading-snug">{shift.name}</h3>
                  <p className="text-[11px] text-accent font-semibold mt-0.5">{role.name}</p>

                  <div className="mt-3 pt-3 border-t border-hairline space-y-1 text-[12px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Resident Care</span>
                      <strong className="text-ink-soft tabular-nums">{metrics.totalResidentTasks}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted">Unit Tasks</span>
                      <strong className="text-ink-soft tabular-nums">{metrics.totalUnitTasks}</strong>
                    </div>
                    {hasFYIs && (
                      <div className="flex items-center justify-between text-accent font-semibold">
                        <span>FYIs</span>
                        <strong className="tabular-nums">{metrics.fyiCount}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-20 mt-3 pt-3 border-t border-hairline flex justify-end">
                  <button
                    type="button"
                    onClick={e => handlePrintDirect(e, sheet)}
                    aria-label={`Print ${shift.shortCode || shift.name}`}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-control border border-hairline-strong text-ink-soft hover:bg-panel-sunken hover:text-ink transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
