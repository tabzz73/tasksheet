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
import { formatLocalDate, getTodayLocalDateString } from '../../services/recurrence';
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
  return dateStr === getTodayLocalDateString();
}

function isTomorrow(dateStr: string): boolean {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return dateStr === formatLocalDate(t);
}

import {
  buildBathingScheduleModel,
  buildWoundScheduleModel,
  buildWeeklyWoundOverviewModel,
  buildWoundSupplyReorderModel,
  getWoundWeek,
  buildShiftConfigReferenceModel,
  buildBlankTaskSheetModel,
} from '../../services/print/specializedDocs';
import { 
  buildWhatChangedModel, 
  TaskSnapshotItem 
} from '../../services/printHistory';
import {
  PrintPackageModel,
  buildHcaDailyPackage,
  buildLpnClinicalPackage,
  buildSavedPrintPackageModel,
  listSavedPrintPackages,
  saveSavedPrintPackage,
  deleteSavedPrintPackage,
} from '../../services/print/packages';
import { SpecializedPrintDoc } from './PrintPreviewPage';
import { ReportCatalogPanel } from './ReportCatalogPanel';
import { ViewHeader } from '../common/ViewHeader';
import { SavePrintPackageModal } from '../modals/SavePrintPackageModal';
import { ConfirmDialog, ConfirmDialogRequest } from '../common/ConfirmDialog';
import { SavedPrintPackage } from '../../types';
import { Edit2, Copy, Trash2, FolderOpen, Plus } from 'lucide-react';

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
  navigationResetToken?: number;
}

type PrintCenterSection = 'quick_print' | 'wound_quick_prints' | 'print_packages' | 'specialized_documents';

const PRINT_CENTER_SECTIONS: { id: PrintCenterSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'quick_print', label: 'Quick Print', icon: Printer },
  { id: 'wound_quick_prints', label: 'Wound Quick Prints', icon: Bandage },
  { id: 'print_packages', label: 'Print Packages', icon: Package },
  { id: 'specialized_documents', label: 'Specialized Documents', icon: Layers },
];

// ─── Change badge ─────────────────────────────────────────────────────────────

const ChangeBadge: React.FC<{ changes: PrintChangesSummary }> = ({ changes }) => {
  const parts: string[] = [];
  if (changes.added > 0) parts.push(`+${changes.added}`);
  if (changes.modified > 0) parts.push(`~${changes.modified}`);
  if (changes.removed > 0) parts.push(`−${changes.removed}`);
  return (
    <div className="flex items-center space-x-1.5 text-[10px] font-semibold text-warning">
      <AlertTriangle className="w-3 h-3 text-warning" />
      <span>Changed since {formatGeneratedAt(changes.lastGeneratedAt)}</span>
      <span className="bg-warning-soft text-warning px-1.5 py-0.5 rounded font-bold">
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
  navigationResetToken = 0,
}) => {
  const [activeSection, setActiveSection] = useState<PrintCenterSection>('quick_print');
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [packageConfigurationError, setPackageConfigurationError] = useState<string | null>(null);
  const [woundWeekAnchor, setWoundWeekAnchor] = useState(currentDate);
  const [bathingWeekAnchor, setBathingWeekAnchor] = useState(currentDate);
  const [woundSupplyScope, setWoundSupplyScope] = useState<'current_week' | 'all_active'>('current_week');
  const [packageModalState, setPackageModalState] = useState<{ isOpen: boolean; seed: SavedPrintPackage | null; key: number }>({ isOpen: false, seed: null, key: 0 });
  const [deletePackageRequest, setDeletePackageRequest] = useState<ConfirmDialogRequest | null>(null);
  const [savedPackagesRevision, setSavedPackagesRevision] = useState(0);
  const openPackageModal = (seed: SavedPrintPackage | null) =>
    setPackageModalState(prev => ({ isOpen: true, seed, key: prev.key + 1 }));

  React.useEffect(() => {
    setSelectedDate(currentDate);
    setSelectedShiftIds(new Set());
    setPackageConfigurationError(null);
    setWoundWeekAnchor(currentDate);
    setBathingWeekAnchor(currentDate);
    setActiveSection('quick_print');
  }, [navigationResetToken]);

  const state = db.getState();
  const today = getTodayLocalDateString();

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
    });
    if (pkg.configurationWarnings.length > 0) {
      setPackageConfigurationError(pkg.configurationWarnings.join(' '));
      return;
    }
    setPackageConfigurationError(null);
    onPrintPackage(pkg);
  };

  // ─── Saved Print Packages ──────────────────────────────────────────────────
  const savedPackages = React.useMemo(() => listSavedPrintPackages(), [savedPackagesRevision]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGenerateSavedPackage = (pkg: SavedPrintPackage) => {
    const built = buildSavedPrintPackageModel(pkg, selectedDate);
    if (built.configurationWarnings.length > 0) {
      setPackageConfigurationError(built.configurationWarnings.join(' '));
      return;
    }
    setPackageConfigurationError(null);
    onPrintPackage(built);
  };

  const handleSavePackage = (pkg: SavedPrintPackage) => {
    saveSavedPrintPackage(pkg);
    setSavedPackagesRevision(r => r + 1);
    setPackageModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleDeletePackage = (pkg: SavedPrintPackage) => {
    setDeletePackageRequest({
      title: 'Delete Print Package?',
      message: `Delete "${pkg.name}"? This only removes the saved configuration — nothing is printed or deleted from resident records.`,
      confirmLabel: 'Delete Package',
      tone: 'danger',
      onConfirm: () => {
        deleteSavedPrintPackage(pkg.id);
        setSavedPackagesRevision(r => r + 1);
      },
    });
  };

  const duplicateBuiltInAsPackage = (source: 'hca_daily' | 'lpn_clinical') => {
    const built = source === 'hca_daily'
      ? buildHcaDailyPackage(selectedDate, { includeBathingGrid: true })
      : buildLpnClinicalPackage(selectedDate, { includeWoundSchedule: true });
    const items: SavedPrintPackage['items'] = built.items.map(item => {
      if (item.docType === 'shift_document' && item.shiftSheet) {
        return { id: `pi_${item.shiftSheet.shift.id}`, type: 'shift_document', shiftId: item.shiftSheet.shift.id };
      }
      if (item.docType === 'bathing_grid') return { id: 'pi_bathing', type: 'bathing_grid' };
      return { id: 'pi_wound', type: 'wound_schedule' };
    });
    openPackageModal({
      id: '',
      name: source === 'hca_daily' ? 'HCA Daily Package (Copy)' : 'LPN Clinical Package (Copy)',
      items,
      createdAt: '',
      updatedAt: '',
    });
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
  const woundCount = state.wounds?.filter(w => w.status === 'active' || w.status === 'healing').length ?? 0;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">

      {/* ── HEADER ── */}
      <ViewHeader
        kicker="Produce"
        title="Print Center"
        subtitle="Generate · preview · print — the final stage of TaskSheet's core workflow."
        action={hasChangedShifts && (
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-warning bg-warning-soft border border-warning rounded-control px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Some shifts have changed since last generated</span>
          </div>
        )}
      />

      <ReportCatalogPanel selectedDate={selectedDate} onPreview={onPrintSpecializedDoc} />

      {packageConfigurationError && (
        <div className="flex items-start space-x-2.5 rounded-surface border border-danger bg-danger-soft p-3 text-danger" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <div>
            <p className="text-xs font-black">Package Cannot Be Generated Safely</p>
            <p className="mt-0.5 text-[11px] text-danger">{packageConfigurationError}</p>
          </div>
        </div>
      )}

      {/* ── DATE NAVIGATOR ── */}
      <div className="bg-panel rounded-surface border border-hairline-strong px-5 py-4">
        <p className="text-[10px] font-bold text-muted uppercase tracking-widest mb-2">Assignment Date</p>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleDateChange(stepDate(selectedDate, -1))}
            className="p-1.5 hover:bg-panel-sunken rounded-control text-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <p className="text-base font-bold text-ink">{dateLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => handleDateChange(stepDate(selectedDate, 1))}
            className="p-1.5 hover:bg-panel-sunken rounded-control text-muted transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isToday(selectedDate) && (
            <button
              type="button"
              onClick={() => handleDateChange(today)}
              className="ml-1 px-3 py-1.5 text-xs font-bold text-accent-strong bg-accent-soft hover:bg-accent-soft border border-hairline-strong rounded-control transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {/* ── SECTION TABS ── */}
      <div className="flex overflow-x-auto border-b border-hairline-strong" aria-label="Print Center sections">
        {PRINT_CENTER_SECTIONS.map(section => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-current={isActive ? 'true' : undefined}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 flex items-center gap-1.5 transition-colors ${
                isActive ? 'border-accent-strong text-accent-strong bg-accent-soft' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {section.label}
            </button>
          );
        })}
      </div>

      {/* ── QUICK PRINT ── */}
      {activeSection === 'quick_print' && (
      <div className="bg-panel rounded-surface border border-hairline-strong overflow-hidden">
        {/* Section header */}
        <div className="px-5 py-3 border-b border-hairline flex items-center justify-between bg-panel-sunken">
          <div className="flex items-center space-x-2">
            <Printer className="w-4 h-4 text-muted" />
            <h3 className="text-xs font-black text-ink uppercase tracking-widest">Quick Print</h3>
          </div>
          <div className="flex items-center space-x-2">
            {selectedShiftIds.size > 0 && (
              <button
                type="button"
                onClick={handlePrintSelected}
                disabled={printing}
                className="px-3 py-1.5 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Selected ({selectedShiftIds.size})</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrintAll}
              disabled={printing || shiftSheets.length === 0}
              className="px-3 py-1.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Print All Shifts</span>
            </button>
          </div>
        </div>

        {/* Select all row */}
        {shiftSheets.length > 1 && (
          <div className="px-5 py-2 border-b border-hairline flex items-center">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="flex items-center space-x-2 text-xs text-muted hover:text-ink font-semibold"
            >
              {selectedShiftIds.size === shiftSheets.length
                ? <CheckSquare className="w-4 h-4 text-accent" />
                : <Square className="w-4 h-4" />
              }
              <span>{selectedShiftIds.size === shiftSheets.length ? 'Deselect all' : 'Select all'}</span>
            </button>
          </div>
        )}

        {/* Shift rows */}
        {shiftSheets.length === 0 ? (
          <div className="px-5 py-8 text-center text-xs text-faint">
            No active shifts configured.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {shiftSheets.map(({ sheet, changes, structuredTasks }) => {
              const { shift, role, metrics } = sheet;
              const isSelected = selectedShiftIds.has(shift.id);
              const hasChanges = changes?.hasChanges ?? false;
              const lastEntry = getEntry(shift.id, selectedDate);

              return (
                <div key={shift.id} className={`px-5 py-3.5 ${hasChanges ? 'bg-warning-soft' : ''}`}>
                  {/* Main row */}
                  <div className="flex items-center">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(shift.id)}
                      className="mr-3 flex-shrink-0 text-faint hover:text-accent transition-colors"
                      aria-label={`Select ${shift.shortCode || shift.name} for batch print`}
                    >
                      {isSelected
                        ? <CheckSquare className="w-4 h-4 text-accent" />
                        : <Square className="w-4 h-4" />
                      }
                    </button>

                    {/* Short code */}
                    <div className="w-14 shrink-0">
                      <span className={`inline-block px-2 py-1 rounded-control font-mono font-black text-xs tracking-wider text-white transition-colors ${hasChanges ? 'bg-warning' : 'bg-ink'}`}>
                        {shift.shortCode || '—'}
                      </span>
                    </div>

                    {/* Name + role + time */}
                    <div className="flex-1 min-w-0 pl-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-bold text-ink">{shift.name}</span>
                        {hasChanges && <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />}
                      </div>
                      <div className="text-[11px] text-muted font-medium flex items-center space-x-1.5">
                        <span>{role.name}</span>
                        <span className="text-hairline-strong">·</span>
                        <span className="font-mono tabular-nums">{shift.startTime}–{shift.endTime}</span>
                        <span className="text-hairline-strong">·</span>
                        <span className="font-medium">{metrics.totalScheduled} items</span>
                        {metrics.exceptionCount > 0 && (
                          <>
                            <span className="text-hairline-strong">·</span>
                            <span className="inline-flex items-center space-x-1 rounded border border-warning bg-warning-soft px-1.5 py-0.5 font-bold text-warning">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{metrics.exceptionCount} needs review</span>
                            </span>
                          </>
                        )}
                        <span className="text-hairline-strong">·</span>
                        <span className="text-positive bg-positive-soft border border-positive px-1.5 py-0.2 rounded font-bold">
                          {role.defaultPrintProfile === 'clinical_worksheet' ? '~2 pages' : '1 page'}
                        </span>
                        {metrics.fyiCount > 0 && (
                          <>
                            <span className="text-hairline-strong">·</span>
                            <span className="text-accent-strong font-semibold">{metrics.fyiCount} FYI{metrics.fyiCount !== 1 ? 's' : ''}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Last generated timestamp */}
                    {lastEntry && !hasChanges && (
                      <div className="hidden md:flex items-center space-x-1 text-[10px] text-faint font-medium mr-4 shrink-0">
                        <History className="w-3 h-3" />
                        <span>Generated {formatGeneratedAt(lastEntry.generatedAt)}</span>
                        {lastEntry.revision > 1 && (
                          <span className="text-hairline-strong">· Rev {lastEntry.revision}</span>
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
                            className="px-2.5 py-1.5 bg-warning hover:bg-warning text-white rounded-control text-xs font-bold flex items-center space-x-1 transition-colors"
                            title="Print 1-page What Changed delta update sheet"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Changes Only</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrintSingle(sheet)}
                            className="px-2.5 py-1.5 bg-ink hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1 transition-colors"
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
                          className="px-3 py-1.5 border border-hairline-strong hover:bg-accent-soft hover:border-accent text-ink-soft hover:text-accent-strong rounded-control text-xs font-bold flex items-center space-x-1 transition-colors"
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
      )}

      {/* ── WOUND QUICK PRINTS ── */}
      {activeSection === 'wound_quick_prints' && (
      <div className="bg-panel rounded-surface border border-danger overflow-hidden">
        <div className="px-5 py-3 border-b border-danger bg-danger-soft flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Bandage className="w-4 h-4 text-danger" />
            <div><h3 className="text-xs font-black text-ink uppercase tracking-widest">Wound Quick Prints</h3><p className="text-[11px] text-muted">Preview-first operational reports · no clinical results stored</p></div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Previous wound week" onClick={() => setWoundWeekAnchor(stepDate(woundWeekAnchor, -7))} className="p-1.5 border border-hairline-strong rounded-control hover:bg-panel"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => setWoundWeekAnchor(today)} className="px-2.5 py-1.5 border border-hairline-strong rounded-control text-[11px] font-bold hover:bg-panel">Current Week</button>
            <button type="button" aria-label="Next wound week" onClick={() => setWoundWeekAnchor(stepDate(woundWeekAnchor, 7))} className="p-1.5 border border-hairline-strong rounded-control hover:bg-panel"><ChevronRight className="w-3.5 h-3.5" /></button>
            <span className="ml-2 text-xs font-bold text-ink-soft">{getWoundWeek(woundWeekAnchor).weekRange}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
          <div className="p-4 flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-ink">Weekly Wound Care Overview</p><p className="text-xs text-muted mt-1">Mon–Sun schedule · all active clinical shifts · Full/Partial assessment markers</p></div>
            <button type="button" onClick={() => onPrintSpecializedDoc({ type: 'wound_weekly', model: buildWeeklyWoundOverviewModel(woundWeekAnchor) })} className="px-3 py-2 bg-danger hover:bg-danger text-white rounded-control text-xs font-bold shrink-0">Preview</button>
          </div>
          <div className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-sm font-bold text-ink">Wound Supplies Re-Order List</p><p className="text-xs text-muted mt-1">Exact supply names · scheduled-use counts · resident/wound traceability</p>
              <select aria-label="Wound supply report scope" value={woundSupplyScope} onChange={event => setWoundSupplyScope(event.target.value as 'current_week' | 'all_active')} className="mt-2 px-2.5 py-1.5 border border-hairline-strong rounded-control text-xs bg-panel"><option value="current_week">Current Week</option><option value="all_active">All Active Wounds</option></select>
            </div>
            <button type="button" onClick={() => onPrintSpecializedDoc({ type: 'wound_supplies', model: buildWoundSupplyReorderModel(woundWeekAnchor, woundSupplyScope) })} className="px-3 py-2 bg-ink hover:bg-danger text-white rounded-control text-xs font-bold shrink-0">Preview</button>
          </div>
        </div>
      </div>
      )}

      {/* ── PRINT PACKAGES ── */}
      {activeSection === 'print_packages' && (
      <div className="bg-panel rounded-surface border border-hairline-strong overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-panel-sunken flex items-center space-x-2">
          <Package className="w-4 h-4 text-muted" />
          <h3 className="text-xs font-black text-ink uppercase tracking-widest">Print Packages</h3>
        </div>

        <div className="px-5 pt-3 text-[10px] font-black text-faint uppercase tracking-widest">Built In</div>
        <div className="divide-y divide-hairline">
          {/* HCA Daily Package */}
          <div className="px-5 py-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-ink">HCA Daily Package</p>
              <p className="text-xs text-muted mt-0.5">
                Simple Checklist TaskSheets · All HCA shifts · Relevant FYIs + Bathing schedule
              </p>
              <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-faint">
                <span>{shiftSheets.filter(r => {
                  const role = state.roles.find(ro => ro.id === r.sheet.shift.roleId);
                  return role?.defaultPrintProfile === 'simple_checklist';
                }).length} HCA shift{shiftSheets.filter(r => {
                  const role = state.roles.find(ro => ro.id === r.sheet.shift.roleId);
                  return role?.defaultPrintProfile === 'simple_checklist';
                }).length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0 ml-4">
              <button
                type="button"
                onClick={() => duplicateBuiltInAsPackage('hca_daily')}
                title="Duplicate as a saved package you can customize"
                className="px-2.5 py-2 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                onClick={handleHcaPackage}
                className="px-3.5 py-2 bg-ink hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generate Package</span>
              </button>
            </div>
          </div>

          {/* LPN Clinical Package */}
          <div className="px-5 py-4 flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-ink">LPN Clinical Package</p>
              <p className="text-xs text-muted mt-0.5">
                Clinical Worksheets · All LPN/RN shifts · FYIs + Wound treatment schedule
              </p>
              <div className="flex items-center space-x-2 mt-1.5 text-[11px] text-faint">
                <span>{shiftSheets.filter(r => {
                  const role = state.roles.find(ro => ro.id === r.sheet.shift.roleId);
                  return role?.defaultPrintProfile === 'clinical_worksheet';
                }).length} clinical shift{shiftSheets.filter(r => {
                  const role = state.roles.find(ro => ro.id === r.sheet.shift.roleId);
                  return role?.defaultPrintProfile === 'clinical_worksheet';
                }).length !== 1 ? 's' : ''}</span>
                {woundCount > 0 && (
                  <>
                    <span className="text-hairline-strong">·</span>
                    <span className="flex items-center space-x-1">
                      <Bandage className="w-3 h-3 text-danger" />
                      <span>{woundCount} active wound protocol{woundCount !== 1 ? 's' : ''}</span>
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1.5 shrink-0 ml-4">
              <button
                type="button"
                onClick={() => duplicateBuiltInAsPackage('lpn_clinical')}
                title="Duplicate as a saved package you can customize"
                className="px-2.5 py-2 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                onClick={handleLpnPackage}
                className="px-3.5 py-2 bg-ink hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Generate Package</span>
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 pt-4 flex items-center justify-between">
          <span className="text-[10px] font-black text-faint uppercase tracking-widest">Saved Packages</span>
          <button
            type="button"
            onClick={() => openPackageModal(null)}
            className="text-[11px] font-bold text-accent-strong hover:text-accent flex items-center space-x-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Package</span>
          </button>
        </div>

        {savedPackages.length === 0 ? (
          <div className="px-5 py-4 text-xs text-faint">
            No saved packages yet. Combine any of the reports below into a reusable package, or duplicate a built-in package to start from.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {savedPackages.map(pkg => (
              <div key={pkg.id} className="px-5 py-4 flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-accent shrink-0" />
                    <span className="truncate">{pkg.name}</span>
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {pkg.items.length} document{pkg.items.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center space-x-1.5 shrink-0 ml-4">
                  <button
                    type="button"
                    onClick={() => openPackageModal(pkg)}
                    aria-label={`Edit ${pkg.name}`}
                    title="Edit"
                    className="p-2 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openPackageModal({ ...pkg, id: '', name: `${pkg.name} (Copy)` })}
                    aria-label={`Duplicate ${pkg.name}`}
                    title="Duplicate"
                    className="p-2 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePackage(pkg)}
                    aria-label={`Delete ${pkg.name}`}
                    title="Delete"
                    className="p-2 border border-hairline-strong hover:bg-danger-soft hover:text-danger text-ink-soft rounded-control transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenerateSavedPackage(pkg)}
                    className="px-3.5 py-2 bg-ink hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Generate Package</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      <SavePrintPackageModal
        isOpen={packageModalState.isOpen}
        onClose={() => setPackageModalState(prev => ({ ...prev, isOpen: false }))}
        initialPackage={packageModalState.seed}
        seedKey={packageModalState.key}
        onSaved={handleSavePackage}
      />
      <ConfirmDialog request={deletePackageRequest} onClose={() => setDeletePackageRequest(null)} />

      {/* ── OTHER DOCUMENTS (SPECIALIZED SUITE) ── */}
      {activeSection === 'specialized_documents' && (
      <div className="bg-panel rounded-surface border border-hairline-strong overflow-hidden">
        <div className="px-5 py-3 border-b border-hairline bg-panel-sunken flex items-center space-x-2">
          <FileText className="w-4 h-4 text-muted" />
          <h3 className="text-xs font-black text-ink uppercase tracking-widest">Specialized Operational Documents</h3>
        </div>

        <div className="divide-y divide-hairline">
          {/* 1. Bathing Schedule Grid */}
          <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-panel-sunken transition-colors">
            <div className="flex items-start space-x-3">
              <Clock className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-ink">Weekly Bathing Grid</p>
                  <span className="text-[10px] bg-accent-soft text-accent-strong font-bold px-1.5 py-0.5 rounded">Letter Landscape</span>
                </div>
                <p className="text-xs text-muted">AcuiCare-style room-only grid · all configured lines · capacity and open slots</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <button type="button" aria-label="Previous bathing week" onClick={() => setBathingWeekAnchor(stepDate(bathingWeekAnchor, -7))} className="p-1.5 border border-hairline-strong rounded-control hover:bg-panel"><ChevronLeft className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => setBathingWeekAnchor(today)} className="px-2.5 py-1.5 border border-hairline-strong rounded-control text-[11px] font-bold hover:bg-panel">Current Week</button>
                  <button type="button" aria-label="Next bathing week" onClick={() => setBathingWeekAnchor(stepDate(bathingWeekAnchor, 7))} className="p-1.5 border border-hairline-strong rounded-control hover:bg-panel"><ChevronRight className="w-3.5 h-3.5" /></button>
                  <label className="text-[11px] font-bold text-ink-soft">Select Week <input aria-label="Select bathing week" type="date" value={bathingWeekAnchor} onChange={event => setBathingWeekAnchor(event.target.value)} className="ml-1 px-2 py-1 border border-hairline-strong rounded-control bg-panel" /></label>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'bathing', model: buildBathingScheduleModel(bathingWeekAnchor) })}
              className="px-3 py-1.5 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Preview Schedule</span>
            </button>
          </div>

          {/* 2. Wound Treatment Schedule */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-panel-sunken transition-colors">
            <div className="flex items-start space-x-3">
              <Bandage className="w-4 h-4 text-danger mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-ink">Wound & Dressing Treatment Schedule</p>
                  <span className="text-[10px] bg-danger-soft text-danger font-bold px-1.5 py-0.5 rounded">Letter Landscape</span>
                </div>
                <p className="text-xs text-muted">
                  Focused clinical treatment orders · Shower coordination · {woundCount} active wound protocol{woundCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'wound', model: buildWoundScheduleModel(selectedDate) })}
              className="px-3 py-1.5 bg-danger hover:bg-danger text-white rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Worksheet</span>
            </button>
          </div>

          {/* 3. Upcoming 7-Day Care Lookahead */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-panel-sunken transition-colors">
            <div className="flex items-start space-x-3">
              <CalendarDays className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-ink">Upcoming 7-Day Care Lookahead</p>
                  <span className="text-[10px] bg-accent-soft text-accent-strong font-bold px-1.5 py-0.5 rounded">Letter Landscape</span>
                </div>
                <p className="text-xs text-muted">Multi-day lookahead projecting periodic care, scheduled baths, catheter changes & weights</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'upcoming', currentDateStr: selectedDate })}
              className="px-3 py-1.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Lookahead</span>
            </button>
          </div>

          {/* 4. Shift Configuration Reference */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-panel-sunken transition-colors">
            <div className="flex items-start space-x-3">
              <Layers className="w-4 h-4 text-ink-soft mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-ink">Master Shift Configuration Reference</p>
                  <span className="text-[10px] bg-panel-sunken text-ink-soft font-bold px-1.5 py-0.5 rounded">Letter Portrait</span>
                </div>
                <p className="text-xs text-muted">Audit sheet of facility shift profiles, scheduled hours, roles, and assigned routines</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'shift_config', model: buildShiftConfigReferenceModel(selectedDate) })}
              className="px-3 py-1.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Reference</span>
            </button>
          </div>

          {/* 5. FYI Standing Binder */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-panel-sunken transition-colors">
            <div className="flex items-start space-x-3">
              <BookOpen className="w-4 h-4 text-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-ink">FYI Standing Information Binder</p>
                <p className="text-xs text-muted">Professional continuing care binder pages · {fyiCount} active entr{fyiCount === 1 ? 'y' : 'ies'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleFyiBinder}
              className="px-3 py-1.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Binder</span>
            </button>
          </div>

          {/* 6. Blank TaskSheet */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-panel-sunken transition-colors">
            <div className="flex items-start space-x-3">
              <FilePlus2 className="w-4 h-4 text-muted mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-ink">Blank TaskSheet Template</p>
                <p className="text-xs text-muted">Facility header + writing areas only · Intentional blank form</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'blank_template', model: buildBlankTaskSheetModel(selectedDate) })}
              className="px-3 py-1.5 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Blank</span>
            </button>
          </div>

          {/* 7. Printer Calibration Test Sheet */}
          <div className="px-5 py-3.5 flex items-center justify-between hover:bg-panel-sunken transition-colors">
            <div className="flex items-start space-x-3">
              <Printer className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-bold text-ink">Printer Hardware Calibration Sheet</p>
                  <span className="text-[10px] bg-accent-soft text-accent-strong font-bold px-1.5 py-0.5 rounded">Hardware Test</span>
                </div>
                <p className="text-xs text-muted">1-Page alignment target · 10mm margins · 100mm precision scale ruler · Toner density</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'calibration' })}
              className="px-3 py-1.5 bg-ink hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Test Page</span>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* ── PRINT GUIDANCE NOTE ── */}
      <div className="px-4 py-3 bg-panel-sunken border border-hairline-strong rounded-surface flex items-start space-x-2.5 text-xs text-muted">
        <Info className="w-4 h-4 text-faint mt-0.5 shrink-0" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <strong className="text-ink-soft">Printer Setup:</strong>
            <button
              type="button"
              onClick={() => onPrintSpecializedDoc({ type: 'calibration' })}
              className="text-[11px] font-bold text-accent-strong hover:underline flex items-center space-x-1"
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
