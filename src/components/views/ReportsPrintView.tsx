import React, { useState, useCallback } from 'react';
import {
  Printer,
  FileText,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Clock,
  Package,
  FilePlus2,
  Layers,
  ArrowRight,
  RefreshCw,
  History,
  Bandage,
  CalendarDays,
} from 'lucide-react';
import { db } from '../../db';
import { generateShiftSheet, GeneratedShiftSheet } from '../../services/generator';
import {
  detectChanges,
  formatGeneratedAt,
  getEntry,
  buildTaskSnapshot,
  PrintChangesSummary,
} from '../../services/printHistory';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stepDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return date.toISOString().split('T')[0];
}

function formatDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().split('T')[0];
}

function isTomorrow(dateStr: string): boolean {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return dateStr === t.toISOString().split('T')[0];
}

import {
  buildBathingScheduleModel,
  buildWoundScheduleModel,
  buildShiftConfigReferenceModel,
} from '../../services/print/specializedDocs';
import { 
  buildWhatChangedModel, 
  TaskSnapshotItem 
} from '../../services/printHistory';
import { PrintPackageModel, buildHcaDailyPackage, buildLpnClinicalPackage } from '../../services/print/packages';
import { SpecializedPrintDoc } from './PrintPreviewPage';

/** Collect all task-like items with rich clinical context for delta tracking */
function buildStructuredTasksFromSheet(sheet: GeneratedShiftSheet): TaskSnapshotItem[] {
  const items: TaskSnapshotItem[] = [];
  sheet.residentAssignments.forEach(a => {
    a.tasks.forEach(t => {
      items.push({
        id: t.id,
        roomNumber: a.resident.roomNumber,
        residentName: `${a.resident.firstName} ${a.resident.lastName}`,
        title: t.title,
        time: t.time,
        category: t.category,
        instructions: t.instructions,
        priority: t.priority,
        updatedAt: (t as any).updatedAt || (t as any).createdAt || '',
      });
    });
    a.wounds.forEach(w => {
      items.push({
        id: w.id,
        roomNumber: a.resident.roomNumber,
        residentName: `${a.resident.firstName} ${a.resident.lastName}`,
        title: `Wound Care: ${w.siteLocation}`,
        time: '1000',
        category: 'Wound Care',
        instructions: w.instructions,
        updatedAt: (w as any).updatedAt || (w as any).createdAt || '',
      });
    });
  });
  return items;
}

interface PrintCenterProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  onPrintShiftSheet: (sheet: GeneratedShiftSheet) => void;
  onPrintSpecializedDoc: (doc: SpecializedPrintDoc) => void;
  onPrintPackage: (packageModel: PrintPackageModel) => void;
}

// ─── Change badge ─────────────────────────────────────────────────────────────

const ChangeBadge: React.FC<{ changes: PrintChangesSummary }> = ({ changes }) => {
  const parts: string[] = [];
  if (changes.added > 0) parts.push(`+${changes.added}`);
  if (changes.modified > 0) parts.push(`~${changes.modified}`);
  if (changes.removed > 0) parts.push(`−${changes.removed}`);
  return (
    <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-amber-700">
      <AlertTriangle className="w-3 h-3 text-amber-500" />
      <span>Changed since {formatGeneratedAt(changes.lastGeneratedAt)}</span>
      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
        {parts.join(' · ')}
      </span>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const PrintCenterView: React.FC<PrintCenterProps> = ({
  currentDate,
  onDateChange,
  onPrintShiftSheet,
  onPrintSpecializedDoc,
  onPrintPackage,
}) => {
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [packageConfigurationError, setPackageConfigurationError] = useState<string | null>(null);

  const state = db.getState();
  const today = new Date().toISOString().split('T')[0];

  const handleDateChange = (d: string) => {
    setSelectedDate(d);
    onDateChange(d);
    setSelectedShiftIds(new Set()); // reset selection on date change
  };

  const activeShifts = state.shifts
    .filter(s => s.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  // Generate sheets for all active shifts (silent — UI shows errors gracefully)
  const shiftSheets: Array<{ 
    sheet: GeneratedShiftSheet; 
    changes: PrintChangesSummary | null;
    structuredTasks: TaskSnapshotItem[];
  }> = activeShifts.map(s => {
    try {
      const sheet = generateShiftSheet(selectedDate, s.id);
      const structuredTasks = buildStructuredTasksFromSheet(sheet);
      const changes = detectChanges(s.id, selectedDate, structuredTasks);
      return { sheet, changes, structuredTasks };
    } catch {
      return null!;
    }
  }).filter(Boolean);

  const hasChangedShifts = shiftSheets.some(r => r.changes?.hasChanges);

  // Toggle shift selection
  const toggleSelect = (shiftId: string) => {
    setSelectedShiftIds(prev => {
      const next = new Set(prev);
      if (next.has(shiftId)) next.delete(shiftId);
      else next.add(shiftId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedShiftIds.size === shiftSheets.length) {
      setSelectedShiftIds(new Set());
    } else {
      setSelectedShiftIds(new Set(shiftSheets.map(r => r.sheet.shift.id)));
    }
  };

  // Print a single shift
  const handlePrintSingle = (sheet: GeneratedShiftSheet) => {
    onPrintShiftSheet(sheet);
  };

  // Print selected shifts sequentially
  const handlePrintSelected = useCallback(async () => {
    const toPrint = shiftSheets.filter(r => selectedShiftIds.has(r.sheet.shift.id));
    if (toPrint.length === 0) return;
    setPrinting(true);
    for (const { sheet } of toPrint) {
      onPrintShiftSheet(sheet);
      await new Promise(r => setTimeout(r, 800));
    }
    setPrinting(false);
    setSelectedShiftIds(new Set());
  }, [shiftSheets, selectedShiftIds, onPrintShiftSheet]);

  // Print all active shifts
  const handlePrintAll = useCallback(async () => {
    if (shiftSheets.length === 0) return;
    setPrinting(true);
    for (const { sheet } of shiftSheets) {
      onPrintShiftSheet(sheet);
      await new Promise(r => setTimeout(r, 800));
    }
    setPrinting(false);
  }, [shiftSheets, onPrintShiftSheet]);

  // Print HCA package — directly build and open package preview
  const handleHcaPackage = () => {
    const pkg = buildHcaDailyPackage(selectedDate, {
      includeBathingGrid: true,
      includeFyiReference: true,
    });
    if (pkg.configurationWarnings.length > 0) {
      setPackageConfigurationError(pkg.configurationWarnings.join(' '));
      return;
    }
    setPackageConfigurationError(null);
    onPrintPackage(pkg);
  };

  // Print LPN package — directly build and open package preview
  const handleLpnPackage = () => {
    const pkg = buildLpnClinicalPackage(selectedDate, {
      includeWoundSchedule: true,
      includeFyiReference: true,
    });
    if (pkg.configurationWarnings.length > 0) {
      setPackageConfigurationError(pkg.configurationWarnings.join(' '));
      return;
    }
    setPackageConfigurationError(null);
    onPrintPackage(pkg);
  };

  // FYI Binder
  const handleFyiBinder = () => {
    window.dispatchEvent(new CustomEvent('tasksheet:print-fyi-binder'));
  };

  // Date label
  const dateLabel = isToday(selectedDate)
    ? `Today — ${formatDateHeader(selectedDate)}`
    : isTomorrow(selectedDate)
    ? `Tomorrow — ${formatDateHeader(selectedDate)}`
    : formatDateHeader(selectedDate);

  const fyiCount = state.fyis.filter(f => f.status === 'active').length;
  const woundCount = state.wounds?.filter(w => w.status !== 'resolved').length ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 flex items-center space-x-2.5">
            <Printer className="w-6 h-6 text-teal-600" />
            <span>Print Center</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Generate · preview · print — the final stage of TaskSheet's core workflow.
          </p>
        </div>
        {hasChangedShifts && (
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Some shifts have changed since last generated</span>
          </div>
        )}
      </div>

      {packageConfigurationError && (
        <div className="flex items-start space-x-2.5 rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-950" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-700" />
          <div>
            <p className="text-xs font-black">Package Cannot Be Generated Safely</p>
            <p className="mt-0.5 text-[11px] text-rose-900">{packageConfigurationError}</p>
          </div>
        </div>
      )}

      {/* ── DATE NAVIGATOR ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Assignment Date</p>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleDateChange(stepDate(selectedDate, -1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <p className="text-base font-bold text-slate-900">{dateLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => handleDateChange(stepDate(selectedDate, 1))}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday(selectedDate) && (
            <button
              type="button"
              onClick={() => handleDateChange(today)}
              className="ml-1 px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* ── QUICK PRINT ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Quick Print</h3>
          </div>
          <div className="flex items-center space-x-2">
            {selectedShiftIds.size > 0 && (
              <button
                type="button"
                onClick={handlePrintSelected}
                disabled={printing}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Selected ({selectedShiftIds.size})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintAll}
              disabled={printing || shiftSheets.length === 0}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Print All Shifts</span>
            </button>
          </div>
        </div>

        {/* Select all row */}
        {shiftSheets.length > 1 && (
          <div className="px-5 py-2 border-b border-slate-100 flex items-center">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center space-x-2 text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              {selectedShiftIds.size === shiftSheets.length
                ? <CheckSquare className="w-4 h-4 text-teal-600" />
                : <Square className="w-4 h-4" />
              }
              <span>{selectedShiftIds.size === shiftSheets.length ? 'Deselect all' : 'Select all'}</span>
            </button>
          </div>
        )}

        {/* Shift rows */}
        {shiftSheets.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-slate-400">
            No active shifts configured.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {shiftSheets.map(({ sheet, changes, structuredTasks }) => {
              const { shift, role, metrics } = sheet;
              const isSelected = selectedShiftIds.has(shift.id);
              const hasChanges = changes?.hasChanges ?? false;
              const lastEntry = getEntry(shift.id, selectedDate);

              return (
                <div key={shift.id} className={`px-5 py-3.5 ${hasChanges ? 'bg-amber-50/40' : ''}`}>
                  {/* Main row */}
                  <div className="flex items-center">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(shift.id)}
                      className="mr-3 flex-shrink-0 text-slate-400 hover:text-teal-600 transition-colors"
                      aria-label={`Select ${shift.shortCode || shift.name} for batch print`}
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-teal-600" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>

                    {/* Short code */}
                    <div className="w-14 shrink-0">
                      <span className={`inline-block px-2 py-1 rounded-md font-mono font-black text-xs tracking-wider text-white transition-colors ${hasChanges ? 'bg-amber-600' : 'bg-slate-900'}`}>
                        {shift.shortCode || '—'}
                      </span>
                    </div>

                    {/* Name + role + time */}
                    <div className="flex-1 min-w-0 pl-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-slate-900">{shift.name}</span>
                        {hasChanges && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1.5">
                        <span>{role.name}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-mono tabular-nums">{shift.startTime}–{shift.endTime}</span>
                        <span className="text-slate-300">·</span>
                        <span className="font-medium">{metrics.totalScheduled} items</span>
                        {metrics.exceptionCount > 0 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="inline-flex items-center space-x-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-bold text-amber-800">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{metrics.exceptionCount} needs review</span>
                            </span>
                          </>
                        )}
                        <span className="text-slate-300">·</span>
                        <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                          {role.defaultPrintProfile === 'clinical_worksheet' ? '~2 pages' : '1 page'}
                        </span>
                        {metrics.fyiCount > 0 && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="text-teal-700 font-semibold">{metrics.fyiCount} FYI{metrics.fyiCount !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Last generated timestamp */}
                    {lastEntry && !hasChanges && (
                      <div className="hidden md:flex items-center space-x-1 text-[10px] text-slate-400 font-medium mr-4 shrink-0">
                        <History className="w-3 h-3" />
                        <span>Generated {formatGeneratedAt(lastEntry.generatedAt)}</span>
                        {lastEntry.revision > 1 && (
                          <span className="text-slate-300">· Rev {lastEntry.revision}</span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {hasChanges ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              const delta = buildWhatChangedModel(shift.id, selectedDate, structuredTasks);
                              if (delta) onPrintSpecializedDoc({ type: 'what_changed', model: delta });
                            }}
                            className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-colors"
                            title="Print 1-page What Changed delta update sheet"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Changes Only</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintSingle(sheet)}
                            className="px-2.5 py-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow-sm transition-colors"
                            title="Reprint full sheet with updated revision"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Full Sheet (Rev {(lastEntry?.revision ?? 1) + 1})</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePrintSingle(sheet)}
                          className="px-3 py-1.5 border border-slate-300 hover:bg-teal-50 hover:border-teal-400 text-slate-700 hover:text-teal-800 rounded-lg text-xs font-bold flex items-center space-x-1 transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Change banner */}
                  {hasChanges && changes && (
                    <div className="mt-2 ml-[72px]">
                      <ChangeBadge changes={changes} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PRINT PACKAGES ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
          <Package className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Print Packages</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {/* HCA Daily Package */}
          <div className="px-5 py-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">HCA Daily Package</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Simple Checklist TaskSheets · All HCA shifts · Relevant FYIs + Bathing schedule
              </p>
              <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-slate-400">
                <span>{shiftSheets.filter(r => {
                  const role = state.roles.find(ro => ro.id === r.sheet.shift.roleId);
                  return role?.defaultPrintProfile === 'simple_checklist';
                }).length} HCA shift{shiftSheets.filter(r => {
                  const role = state.roles.find(ro => ro.id === r.sheet.shift.roleId);
                  return role?.defaultPrintProfile === 'simple_checklist';
                }).length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleHcaPackage}
              className="px-3.5 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0 ml-4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Package</span>
            </button>
          </div>

          {/* LPN Clinical Package */}
          <div className="px-5 py-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">LPN Clinical Package</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Clinical Worksheets · All LPN/RN shifts · FYIs + Wound treatment schedule
              </p>
              <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-slate-400">
                <span>{shiftSheets.filter(r => {
                  const role = state.roles.find(ro => ro.id === r.sheet.shift.roleId);
                  return role?.defaultPrintProfile === 'clinical_worksheet';
                }).length} clinical shift{shiftSheets.filter(r => {
                  const role = state.roles.find(ro => ro.id === r.sheet.shift.roleId);
                  return role?.defaultPrintProfile === 'clinical_worksheet';
                }).length !== 1 ? 's' : ''}</span>
                {woundCount > 0 && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="flex items-center space-x-1">
                      <Bandage className="w-3 h-3 text-rose-500" />
                      <span>{woundCount} active wound protocol{woundCount !== 1 ? 's' : ''}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={handleLpnPackage}
              className="px-3.5 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0 ml-4"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Generate Package</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── OTHER DOCUMENTS (SPECIALIZED SUITE) ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center space-x-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Specialized Operational Documents</h3>
        </div>

        <div className="divide-y divide-slate-100">
          {/* 1. Bathing Schedule Grid */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-start space-x-3">
              <Clock className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-slate-900">Bathing & Hygiene Schedule Grid</p>
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">Letter Landscape</span>
                </div>
                <p className="text-xs text-slate-500">Room-first weekly matrix (Mon–Sun) · Assistance precautions & daily capacity balance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'bathing', model: buildBathingScheduleModel(selectedDate) })}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Schedule</span>
            </button>
          </div>

          {/* 2. Wound Treatment Schedule */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-start space-x-3">
              <Bandage className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-slate-900">Wound & Dressing Treatment Schedule</p>
                  <span className="text-[10px] bg-rose-100 text-rose-800 font-bold px-1.5 py-0.5 rounded">Letter Landscape</span>
                </div>
                <p className="text-xs text-slate-500">
                  Focused clinical treatment orders · Shower coordination · {woundCount} active wound protocol{woundCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'wound', model: buildWoundScheduleModel(selectedDate) })}
              className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Worksheet</span>
            </button>
          </div>

          {/* 3. Upcoming 7-Day Care Lookahead */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-start space-x-3">
              <CalendarDays className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-slate-900">Upcoming 7-Day Care Lookahead</p>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded">Letter Landscape</span>
                </div>
                <p className="text-xs text-slate-500">Multi-day lookahead projecting periodic care, scheduled baths, catheter changes & weights</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'upcoming', currentDateStr: selectedDate })}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Lookahead</span>
            </button>
          </div>

          {/* 4. Shift Configuration Reference */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-start space-x-3">
              <Layers className="w-4 h-4 text-slate-600 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-slate-900">Master Shift Configuration Reference</p>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-1.5 py-0.5 rounded">Letter Portrait</span>
                </div>
                <p className="text-xs text-slate-500">Audit sheet of facility shift profiles, scheduled hours, roles, and assigned routines</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'shift_config', model: buildShiftConfigReferenceModel(selectedDate) })}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Reference</span>
            </button>
          </div>

          {/* 5. FYI Standing Binder */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-start space-x-3">
              <BookOpen className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">FYI Standing Information Binder</p>
                <p className="text-xs text-slate-500">Professional continuing care binder pages · {fyiCount} active entr{fyiCount === 1 ? 'y' : 'ies'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFyiBinder}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Binder</span>
            </button>
          </div>

          {/* 6. Blank TaskSheet */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-start space-x-3">
              <FilePlus2 className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-slate-900">Blank TaskSheet Template</p>
                <p className="text-xs text-slate-500">Facility header + writing areas only · Intentional blank form</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (shiftSheets.length > 0) {
                  handlePrintSingle(shiftSheets[0].sheet);
                }
              }}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Blank</span>
            </button>
          </div>

          {/* 7. Printer Calibration Test Sheet */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
            <div className="flex items-start space-x-3">
              <Printer className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-slate-900">Printer Hardware Calibration Sheet</p>
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded">Hardware Test</span>
                </div>
                <p className="text-xs text-slate-500">1-Page alignment target · 10mm margins · 100mm precision scale ruler · Toner density</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'calibration' })}
              className="px-3 py-1.5 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Test Page</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── PRINT GUIDANCE NOTE ── */}
      <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start space-x-2.5 text-xs text-slate-500">
        <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <strong className="text-slate-700">Printer Setup:</strong>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'calibration' })}
              className="text-[11px] font-bold text-teal-700 hover:underline flex items-center space-x-1"
            >
              <span>Verify printer with Calibration Page →</span>
            </button>
          </div>
          <p className="mt-0.5">
            Use Letter size · Scale 100% · HCA Checklist = Portrait · LPN Clinical = Landscape · Bathing Grid = Landscape.
            Enable "Background Graphics" for shaded section headers.
          </p>
        </div>
      </div>
    </div>
  );
};

// Keep the old name as an alias so App.tsx doesn't need a rename
export { PrintCenterView as ReportsPrintView };
