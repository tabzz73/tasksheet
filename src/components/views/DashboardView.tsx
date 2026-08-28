import React from 'react';
import { 
  Clock, 
  Printer, 
  Users, 
  BookOpen, 
  Calendar,
  Plus,
  Info,
  UserCheck,
  Bandage,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { db } from '../../db';
import { generateShiftSheet, GeneratedShiftSheet } from '../../services/generator';
import { AddEntityType } from '../modals/GlobalAddModal';
import { CardNavigationButton } from '../common/CardNavigationButton';

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

  // Generate sheets for all active shifts for today
  const shiftSheets = activeShifts.map(s => {
    try {
      return generateShiftSheet(currentDate, s.id);
    } catch {
      return null;
    }
  }).filter((s): s is GeneratedShiftSheet => s !== null);

  // Scheduling-based summary counts
  const totalScheduledToday = shiftSheets.reduce((sum, s) => sum + s.metrics.totalScheduled, 0);

  const activeResidentCount = state.residents.filter(r => r.status === 'active').length;
  const inHospitalCount = state.residents.filter(r => r.status === 'in_hospital').length;
  const outOnPassCount = state.residents.filter(r => r.status === 'out_on_pass').length;
  const onHoldCount = state.residents.filter(r => r.status === 'on_hold').length;

  const binderNeedsUpdate = state.binderState.status === 'update_required';

  const formattedDate = new Date(currentDate + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            TaskSheet Overview · {formattedDate}
          </p>
        </div>

        {/* Contextual Quick Add Dropdown */}
        <div className="relative self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="px-3.5 py-1.5 bg-white hover:bg-teal-50 text-teal-700 border border-teal-600 rounded-lg text-xs font-bold shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick Add ▾</span>
          </button>

          {quickAddOpen && (
            <div 
              onClick={() => setQuickAddOpen(false)}
              className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
            >
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Create & Assign
              </div>
              <button
                type="button"
                onClick={() => onOpenQuickAdd('care_task')}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4 text-teal-600" />
                <span>+ Resident Care Task</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenQuickAdd('unit_task')}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
              >
                <ClipboardList className="w-4 h-4 text-teal-600" />
                <span>+ Shift Unit Task</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenQuickAdd('resident')}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
              >
                <Users className="w-4 h-4 text-teal-600" />
                <span>+ Add Resident</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenQuickAdd('fyi')}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
              >
                <Info className="w-4 h-4 text-teal-600" />
                <span>+ FYI Standing Note</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenQuickAdd('wound')}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
              >
                <Bandage className="w-4 h-4 text-rose-600" />
                <span>+ Wound Protocol</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. TOP 4 KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Scheduled Today */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center">
          <div className="p-3 bg-teal-50/80 text-teal-600 rounded-xl mr-3.5 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">SCHEDULED TODAY</span>
            <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">{totalScheduledToday}</div>
            <span className="text-xs text-slate-400">Across {activeShifts.length} shifts</span>
          </div>
        </div>

        {/* Card 2: Residents */}
        <div 
          onClick={onNavigateToResidents}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="p-3 bg-teal-50/80 text-teal-600 rounded-xl mr-3.5 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">RESIDENTS</span>
            <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">{activeResidentCount}</div>
            <span className="text-xs text-slate-400">
              {inHospitalCount > 0 || outOnPassCount > 0 || onHoldCount > 0
                ? `${inHospitalCount} hosp · ${outOnPassCount} pass · ${onHoldCount} hold`
                : 'No care suspensions'}
            </span>
          </div>
        </div>

        {/* Card 3: Active Shifts */}
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center">
          <div className="p-3 bg-teal-50/80 text-teal-600 rounded-xl mr-3.5 shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">ACTIVE SHIFTS</span>
            <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">{activeShifts.length}</div>
            <span className="text-xs text-slate-400 truncate block max-w-[140px]">
              {activeShifts.slice(0, 3).map(s => s.shortCode || s.name).join(' · ')}{activeShifts.length > 3 ? ` +${activeShifts.length - 3}` : ''}
            </span>
          </div>
        </div>

        {/* Card 4: FYI Binder */}
        <div 
          onClick={onNavigateToBinder}
          className="bg-white p-4.5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center cursor-pointer hover:border-slate-300 transition-colors"
        >
          <div className="p-3 bg-teal-50/80 text-teal-600 rounded-xl mr-3.5 shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">FYI BINDER</span>
            <div className={`text-xl font-bold mt-0.5 ${binderNeedsUpdate ? 'text-amber-700' : 'text-teal-700'}`}>
              {binderNeedsUpdate ? 'Update Req' : 'Current'}
            </div>
            <span className="text-xs text-slate-400">
              {binderNeedsUpdate ? `${state.binderState.pendingChangesCount} pending changes` : 'Physical binder confirmed'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. TODAY'S SHIFTS SECTION */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">Today's Shifts</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a shift to review the schedule or generate a printed TaskSheet.
          </p>
        </div>

        {shiftSheets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <h4 className="text-sm font-semibold text-slate-600">No active shifts configured</h4>
            <p className="text-xs text-slate-400 mt-1">Go to Settings → Roles & Shifts to add shifts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftSheets.map(sheet => (
              <div
                key={sheet.shift.id}
                className="relative bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-teal-300 hover:shadow-sm transition-all p-5 flex flex-col justify-between group"
              >
                <CardNavigationButton
                  label={`Open ${sheet.shift.shortCode || sheet.shift.name} shift`}
                  onActivate={() => onOpenShift(sheet.shift.id)}
                  roundedClassName="rounded-2xl"
                />
                <div>
                  {/* Card Header: Code Badge + Name + Role + Time Pill */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="px-2.5 py-1.5 bg-[#0B192C] text-white rounded-lg font-mono font-bold text-xs tracking-wider shrink-0 shadow-xs">
                        {sheet.shift.shortCode || '—'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 leading-snug">{sheet.shift.name}</h4>
                        <p className="text-xs text-teal-600 font-semibold mt-0.5">{sheet.role.name}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md font-mono shrink-0">
                      {sheet.shift.startTime}–{sheet.shift.endTime}
                    </span>
                  </div>

                  {/* 2-Column Stats Box */}
                  <div className="my-3.5 p-3 bg-slate-50/80 rounded-xl border border-slate-100 grid grid-cols-2 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Resident Care</span>
                      <span className="font-bold text-slate-900 text-xs tabular-nums mt-0.5 block">
                        {sheet.metrics.totalResidentTasks} Scheduled
                      </span>
                    </div>
                    <div className="border-l border-slate-200/80 pl-3">
                      <span className="text-slate-500 block text-[11px]">Unit Tasks</span>
                      <span className="font-bold text-slate-900 text-xs tabular-nums mt-0.5 block">
                        {sheet.metrics.totalUnitTasks} Scheduled
                      </span>
                    </div>
                  </div>

                  {/* FYI Line */}
                  <div className="flex items-center space-x-1 text-xs text-teal-700 font-medium">
                    <Info className="w-3.5 h-3.5 text-teal-600" />
                    <span>{sheet.metrics.fyiCount} FYI{sheet.metrics.fyiCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onPrintShift(sheet);
                    }}
                    className="relative z-20 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print</span>
                  </button>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
