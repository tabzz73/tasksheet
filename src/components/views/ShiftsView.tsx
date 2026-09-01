import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  LayoutList, 
  LayoutGrid, 
  Clock, 
  Info, 
  AlertTriangle,
  HeartHandshake,
  ClipboardList,
  Users,
  Bandage,
  Settings2
} from 'lucide-react';
import { db } from '../../db';
import { generateShiftSheet, GeneratedShiftSheet } from '../../services/generator';
import { AddEntityType } from '../modals/GlobalAddModal';
import { CardNavigationButton } from '../common/CardNavigationButton';
import { getTodayLocalDateString } from '../../services/recurrence';

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

  // ── Shared print handler so printer icon doesn't open workspace
  const handlePrintDirect = (e: React.MouseEvent, sheet: GeneratedShiftSheet) => {
    e.stopPropagation();
    onPrintShift(sheet);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* ── PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Shifts</h2>
          <p className="text-xs text-slate-500 mt-0.5">Review and generate Shift TaskSheets · Choose a shift to view organized care</p>
        </div>
        
        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenAddShift}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Configure Shifts</span>
          </button>

          {/* Quick Add Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setQuickAddOpen(!quickAddOpen)}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick Add ▾</span>
            </button>

            {quickAddOpen && (
              <div 
                onClick={() => setQuickAddOpen(false)}
                className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
              >
                <button
                  type="button"
                  onClick={() => onOpenQuickAdd?.('care_task')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                >
                  <HeartHandshake className="w-4 h-4 text-teal-600" />
                  <span>+ Care Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenQuickAdd?.('unit_task')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                >
                  <ClipboardList className="w-4 h-4 text-teal-600" />
                  <span>+ Unit Task / Routine</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenQuickAdd?.('resident')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                >
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>+ Add Resident</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenQuickAdd?.('fyi')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                >
                  <Info className="w-4 h-4 text-teal-600" />
                  <span>+ FYI Standing Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenQuickAdd?.('wound')}
                  className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                >
                  <Bandage className="w-4 h-4 text-rose-600" />
                  <span>+ Wound Protocol</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── DATE NAVIGATOR + SEARCH + VIEW TOGGLE ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">

        {/* Date navigator */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={() => onDateChange(stepDate(currentDate, -1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="px-2 min-w-[200px] text-center">
            <p className="text-sm font-bold text-slate-900">{formatDateHeader(currentDate)}</p>
          </div>

          <button
            type="button"
            onClick={() => onDateChange(stepDate(currentDate, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
            title="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday(currentDate) && (
            <button
              type="button"
              onClick={() => onDateChange(today)}
              className="ml-1 px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md transition-colors"
            >
              Today
            </button>
          )}
          {isToday(currentDate) && (
            <span className="ml-1 px-2.5 py-1 text-[11px] font-bold text-teal-600 bg-teal-50 border border-teal-200 rounded-md">
              Today
            </span>
          )}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search shifts..."
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 focus:outline-none w-44"
        />

        {/* List / Cards toggle */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 space-x-0.5">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
              viewMode === 'list'
                ? 'bg-white shadow text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="List view"
          >
            <LayoutList className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center space-x-1 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors ${
              viewMode === 'cards'
                ? 'bg-white shadow text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title="Cards view"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Cards</span>
          </button>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {shiftSheets.length === 0 && (
        <div className="p-10 text-center bg-white rounded-xl border border-slate-200 text-slate-400 text-xs">
          {searchQuery ? 'No shifts match your search.' : 'No active shifts configured. Use Configure Shifts to get started.'}
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && shiftSheets.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-slate-100">
            {shiftSheets.map(sheet => {
              const { shift, role, metrics } = sheet;
              const hasFYIs = metrics.fyiCount > 0;
              const hasUrgentFYI = sheet.importantFYIs.some(f => f.importance === 'urgent');

              return (
                <div
                  key={shift.id}
                  className="relative flex items-center px-5 py-4 hover:bg-slate-50 transition-colors group"
                >
                  <CardNavigationButton
                    label={`Open ${shift.shortCode || shift.name} shift`}
                    onActivate={() => onOpenShift(shift.id)}
                    roundedClassName="rounded-none"
                  />
                  {/* Short code badge */}
                  <div className="w-14 shrink-0">
                    <span className="inline-block px-2 py-1 bg-slate-900 text-white rounded-md font-mono font-black text-xs tracking-wider group-hover:bg-teal-700 transition-colors">
                      {shift.shortCode || '—'}
                    </span>
                  </div>

                  {/* Name + role */}
                  <div className="flex-1 min-w-0 pl-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-slate-900 truncate">{shift.name}</span>
                      {hasUrgentFYI && (
                        <span title="Urgent FYI on this shift">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium mt-0.5 flex items-center space-x-2">
                      <span>{role.name}</span>
                      <span className="text-slate-300">·</span>
                      <span className="font-mono tabular-nums">{shift.startTime}–{shift.endTime}</span>
                    </div>
                  </div>

                  {/* Counts */}
                  <div className="hidden sm:flex items-center space-x-3 text-[11px] text-slate-500 font-medium mr-4 shrink-0">
                    <span>
                      <strong className="text-slate-800 text-xs">{metrics.totalScheduled}</strong> tasks
                    </span>
                    {hasFYIs && (
                      <span className="flex items-center space-x-0.5 text-teal-700 font-semibold">
                        <Info className="w-3 h-3" />
                        <span>{metrics.fyiCount} FYI{metrics.fyiCount !== 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={e => handlePrintDirect(e, sheet)}
                      className="relative z-20 p-2 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title={`Print ${shift.shortCode || shift.name}`}
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── CARDS VIEW ── */}
      {viewMode === 'cards' && shiftSheets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shiftSheets.map(sheet => {
            const { shift, role, metrics } = sheet;
            const hasFYIs = metrics.fyiCount > 0;

            return (
              <div
                key={shift.id}
                className="relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-teal-300 transition-all p-5 flex flex-col justify-between group"
              >
                <CardNavigationButton
                  label={`Open ${shift.shortCode || shift.name} shift`}
                  onActivate={() => onOpenShift(shift.id)}
                />
                <div>
                  {/* Code + Time */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg font-mono font-black text-sm tracking-wider group-hover:bg-teal-700 transition-colors">
                      {shift.shortCode || '—'}
                    </div>
                    <div className="flex items-center space-x-1 text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{shift.startTime}–{shift.endTime}</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug">{shift.name}</h3>
                  <p className="text-xs text-teal-700 font-semibold mt-0.5">{role.name}</p>

                  {/* Stats */}
                  <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Resident Care</span>
                      <strong className="text-slate-800 tabular-nums">{metrics.totalResidentTasks}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Unit Tasks</span>
                      <strong className="text-slate-800 tabular-nums">{metrics.totalUnitTasks}</strong>
                    </div>
                    {hasFYIs && (
                      <div className="flex items-center justify-between text-teal-700">
                        <span className="font-semibold">FYIs</span>
                        <strong className="tabular-nums">{metrics.fyiCount}</strong>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={e => handlePrintDirect(e, sheet)}
                    className="relative z-20 p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    title={`Print ${shift.shortCode || shift.name}`}
                  >
                    <Printer className="w-4 h-4" />
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
