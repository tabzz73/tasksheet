import { db } from '../../db';
import { Facility, SavedPrintPackage } from '../../types';
import { generateShiftSheet, GeneratedShiftSheet, ShiftGenerationException } from '../generator';
import { PrintService, PrintDocumentModel } from './index';
import {
  buildBathingScheduleModel,
  buildWoundScheduleModel,
  BathingScheduleModel,
  WoundScheduleModel,
  buildBlankTaskSheetModel,
} from './specializedDocs';
import { buildFyiBinderPrintModel } from './binderBuilder';
import { FyiBinderPrintDocumentModel } from '../../components/print/FyiBinderPrintDocument';

export type PackageDocType =
  | 'shift_document'
  | 'bathing_grid'
  | 'wound_schedule'
  | 'fyi_binder'
  | 'blank_template';

export interface PrintPackageItem {
  id: string;
  title: string;
  subtitle: string;
  docType: PackageDocType;
  isLandscape: boolean;
  estimatedPages: number;
  /** Document model */
  shiftModel?: PrintDocumentModel;
  bathingModel?: BathingScheduleModel;
  woundModel?: WoundScheduleModel;
  fyiBinderModel?: FyiBinderPrintDocumentModel;
  /** Raw generated shift (shift_document items only) — carried so opening the
   *  package for print/preview can record a Print History entry per shift,
   *  the same way single-shift printing does. */
  shiftSheet?: GeneratedShiftSheet;
}

export interface PrintPackageModel {
  id: string;
  packageType: 'hca_daily_package' | 'lpn_clinical_package' | 'saved_package';
  /** Present when packageType is 'saved_package' — the source SavedPrintPackage.id. */
  savedPackageId?: string;
  title: string;
  dateStr: string;
  formattedDate: string;
  facility: Facility;
  items: PrintPackageItem[];
  estimatedTotalPages: number;
  /** Screen-only configuration exceptions withheld across bundled shifts. */
  exceptions: ShiftGenerationException[];
  /** Blocking configuration warnings. Role packages never substitute another role's shift. */
  configurationWarnings: string[];
  /** Non-blocking advisory notices — e.g. a bundled section has no content
   *  for this date (an empty wound schedule, a shift with no scheduled
   *  tasks). The package still prints; this just surfaces it up front
   *  instead of the user discovering a blank sheet after the fact. */
  contentWarnings: string[];
}

export interface HcaPackageOptions {
  includeBathingGrid?: boolean;
}

export interface LpnPackageOptions {
  includeWoundSchedule?: boolean;
}

/**
 * Builds the HCA Daily Package bundling all HCA shift checklists,
 * the weekly Bathing & Hygiene matrix, and active FYI standing notes.
 */
export function buildHcaDailyPackage(
  dateStr: string,
  options: HcaPackageOptions = { includeBathingGrid: true }
): PrintPackageModel {
  const state = db.getState();
  const facility = state.facility;

  const [y, m, d] = dateStr.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const items: PrintPackageItem[] = [];
  const exceptions: ShiftGenerationException[] = [];
  const contentWarnings: string[] = [];

  // 1. All active HCA shifts
  const hcaShifts = state.shifts.filter(s => {
    if (s.isActive === false) return false;
    const role = state.roles.find(r => r.id === s.roleId);
    return (
      role?.code?.toLowerCase().includes('hca') ||
      role?.name?.toLowerCase().includes('hca') ||
      role?.name?.toLowerCase().includes('aide')
    );
  }).sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  const configurationWarnings = hcaShifts.length === 0
    ? ['No active HCA shift is configured. The HCA TaskSheet was not generated. Configure an HCA role and shift in Settings → Roles & Shifts.']
    : [];

  for (const shift of hcaShifts) {
    try {
      const sheet = generateShiftSheet(dateStr, shift.id);
      exceptions.push(...sheet.exceptions);
      const model = PrintService.createDocumentModel(sheet, 'simple_checklist');
      if (model.summary.totalResidentTasks + model.summary.totalUnitTasks === 0) {
        contentWarnings.push(`${shift.shortCode || shift.name} has no scheduled tasks for ${dateStr} — its sheet will print blank.`);
      }
      items.push({
        id: `pkg_shift_${shift.id}`,
        title: `${shift.shortCode ? `${shift.shortCode} — ` : ''}${shift.name}`,
        subtitle: `Simple Checklist · ${shift.startTime}–${shift.endTime}`,
        docType: 'shift_document',
        isLandscape: false,
        estimatedPages: model.summary.estimatedPages,
        shiftModel: model,
        shiftSheet: sheet,
      });
    } catch (err) {
      console.error('[buildHcaDailyPackage] Error generating shift sheet:', err);
    }
  }

  // 2. Weekly Bathing Matrix
  if (options.includeBathingGrid !== false) {
    try {
      const bathingModel = buildBathingScheduleModel(dateStr);
      const totalScheduled = Object.values(bathingModel.dailyTotals).reduce((sum, n) => sum + n, 0);
      if (totalScheduled === 0) {
        contentWarnings.push('Bathing & Hygiene Schedule Grid has no scheduled bathing this week — it will print as an empty grid.');
      }
      items.push({
        id: 'pkg_bathing_grid',
        title: 'Bathing & Hygiene Schedule Grid',
        subtitle: `Weekly Room Matrix · ${bathingModel.weekRange}`,
        docType: 'bathing_grid',
        isLandscape: true,
        estimatedPages: 1,
        bathingModel,
      });
    } catch (err) {
      console.error('[buildHcaDailyPackage] Error generating bathing grid:', err);
    }
  }

  const estimatedTotalPages = Math.max(1, items.reduce((sum, item) => sum + item.estimatedPages, 0));

  return {
    id: `pkg_hca_${dateStr}_${Date.now()}`,
    packageType: 'hca_daily_package',
    title: 'HCA Daily Operational Package',
    dateStr,
    formattedDate,
    facility,
    items,
    estimatedTotalPages,
    exceptions,
    configurationWarnings,
    contentWarnings,
  };
}

/**
 * Builds the LPN Clinical Package bundling all LPN/RN clinical worksheets,
 * the active Wound & Dressing Treatment schedule, and clinical alerts.
 */
export function buildLpnClinicalPackage(
  dateStr: string,
  options: LpnPackageOptions = { includeWoundSchedule: true }
): PrintPackageModel {
  const state = db.getState();
  const facility = state.facility;

  const [y, m, d] = dateStr.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const items: PrintPackageItem[] = [];
  const exceptions: ShiftGenerationException[] = [];
  const contentWarnings: string[] = [];

  // 1. All active LPN/RN clinical shifts
  const lpnShifts = state.shifts.filter(s => {
    if (s.isActive === false) return false;
    const role = state.roles.find(r => r.id === s.roleId);
    return (
      role?.defaultPrintProfile === 'clinical_worksheet' ||
      role?.code?.toLowerCase().includes('lpn') ||
      role?.code?.toLowerCase().includes('rn') ||
      role?.name?.toLowerCase().includes('nurse') ||
      role?.name?.toLowerCase().includes('practical')
    );
  }).sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));
  const configurationWarnings = lpnShifts.length === 0
    ? ['No active LPN/RN shift is configured. The clinical TaskSheet was not generated. Configure an LPN/RN role and shift in Settings → Roles & Shifts.']
    : [];

  for (const shift of lpnShifts) {
    try {
      const sheet = generateShiftSheet(dateStr, shift.id);
      exceptions.push(...sheet.exceptions);
      const model = PrintService.createDocumentModel(sheet, 'clinical_worksheet');
      if (model.summary.totalResidentTasks + model.summary.totalUnitTasks === 0) {
        contentWarnings.push(`${shift.shortCode || shift.name} has no scheduled tasks for ${dateStr} — its sheet will print blank.`);
      }
      items.push({
        id: `pkg_shift_${shift.id}`,
        title: `${shift.shortCode ? `${shift.shortCode} — ` : ''}${shift.name}`,
        subtitle: `Clinical Worksheet · ${shift.startTime}–${shift.endTime}`,
        docType: 'shift_document',
        isLandscape: true,
        estimatedPages: model.summary.estimatedPages,
        shiftModel: model,
        shiftSheet: sheet,
      });
    } catch (err) {
      console.error('[buildLpnClinicalPackage] Error generating clinical sheet:', err);
    }
  }

  // 2. Wound Treatment Schedule
  if (options.includeWoundSchedule !== false) {
    try {
      const woundModel = buildWoundScheduleModel(dateStr);
      if (woundModel.totalActiveWounds === 0) {
        contentWarnings.push('Wound & Dressing Treatment Schedule has no active wound protocols — it will print as an empty schedule.');
      }
      items.push({
        id: 'pkg_wound_schedule',
        title: 'Wound & Dressing Treatment Schedule',
        subtitle: `${woundModel.totalActiveWounds} Active Wound Protocols across facility`,
        docType: 'wound_schedule',
        isLandscape: true,
        estimatedPages: 1,
        woundModel,
      });
    } catch (err) {
      console.error('[buildLpnClinicalPackage] Error generating wound schedule:', err);
    }
  }

  const estimatedTotalPages = Math.max(1, items.reduce((sum, item) => sum + item.estimatedPages, 0));

  return {
    id: `pkg_lpn_${dateStr}_${Date.now()}`,
    packageType: 'lpn_clinical_package',
    title: 'LPN / RN Clinical Shift Package',
    dateStr,
    formattedDate,
    facility,
    items,
    estimatedTotalPages,
    exceptions,
    configurationWarnings,
    contentWarnings,
  };
}

// ─── Saved Print Packages ───────────────────────────────────────────────────
// Facility-defined, reusable combinations of the same existing report
// renderers used above. A SavedPrintPackage stores structure only (which
// documents, in what order, referencing which shift IDs) — never rendered
// content or resident/task data — and is re-resolved against the current
// Print Center date and current facility data every time it's opened.

/**
 * Builds a printable PrintPackageModel from a saved package definition.
 * Reuses the exact same report builders as the built-in packages above —
 * no parallel rendering path. Stale or invalid item references are skipped
 * (never crash) and surfaced as blocking configurationWarnings so the user
 * repairs the package before printing rather than silently getting a
 * shorter package than they expected.
 */
export function buildSavedPrintPackageModel(pkg: SavedPrintPackage, dateStr: string): PrintPackageModel {
  const state = db.getState();
  const facility = state.facility;

  const [y, m, d] = dateStr.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const items: PrintPackageItem[] = [];
  const exceptions: ShiftGenerationException[] = [];
  const contentWarnings: string[] = [];
  const configurationWarnings: string[] = [];

  if (pkg.items.length === 0) {
    configurationWarnings.push(`"${pkg.name}" has no documents configured yet. Edit the package to add at least one document before printing.`);
  }

  for (const entry of pkg.items) {
    try {
      if (entry.type === 'shift_document') {
        const shift = state.shifts.find(s => s.id === entry.shiftId);
        if (!shift) {
          configurationWarnings.push(`A shift in "${pkg.name}" no longer exists. Edit the package to remove or replace it before printing.`);
          continue;
        }
        if (shift.isActive === false) {
          configurationWarnings.push(`${shift.shortCode || shift.name} in "${pkg.name}" is no longer an active shift. Edit the package to remove or replace it before printing.`);
          continue;
        }
        const role = state.roles.find(r => r.id === shift.roleId);
        const profile: 'simple_checklist' | 'clinical_worksheet' =
          role?.defaultPrintProfile === 'clinical_worksheet' ? 'clinical_worksheet' : 'simple_checklist';
        const sheet = generateShiftSheet(dateStr, shift.id);
        exceptions.push(...sheet.exceptions);
        const model = PrintService.createDocumentModel(sheet, profile);
        if (model.summary.totalResidentTasks + model.summary.totalUnitTasks === 0) {
          contentWarnings.push(`${shift.shortCode || shift.name} has no scheduled tasks for ${dateStr} — its sheet will print blank.`);
        }
        items.push({
          id: `pkg_shift_${entry.id}`,
          title: `${shift.shortCode ? `${shift.shortCode} — ` : ''}${shift.name}`,
          subtitle: `${profile === 'clinical_worksheet' ? 'Clinical Worksheet' : 'Simple Checklist'} · ${shift.startTime}–${shift.endTime}`,
          docType: 'shift_document',
          isLandscape: profile === 'clinical_worksheet',
          estimatedPages: model.summary.estimatedPages,
          shiftModel: model,
          shiftSheet: sheet,
        });
      } else if (entry.type === 'bathing_grid') {
        const bathingModel = buildBathingScheduleModel(dateStr);
        const totalScheduled = Object.values(bathingModel.dailyTotals).reduce((sum, n) => sum + n, 0);
        if (totalScheduled === 0) {
          contentWarnings.push('Bathing & Hygiene Schedule Grid has no scheduled bathing this week — it will print as an empty grid.');
        }
        items.push({
          id: `pkg_bathing_${entry.id}`,
          title: 'Bathing & Hygiene Schedule Grid',
          subtitle: `Weekly Room Matrix · ${bathingModel.weekRange}`,
          docType: 'bathing_grid',
          isLandscape: true,
          estimatedPages: 1,
          bathingModel,
        });
      } else if (entry.type === 'wound_schedule') {
        const woundModel = buildWoundScheduleModel(dateStr);
        if (woundModel.totalActiveWounds === 0) {
          contentWarnings.push('Wound & Dressing Treatment Schedule has no active wound protocols — it will print as an empty schedule.');
        }
        items.push({
          id: `pkg_wound_${entry.id}`,
          title: 'Wound & Dressing Treatment Schedule',
          subtitle: `${woundModel.totalActiveWounds} Active Wound Protocols across facility`,
          docType: 'wound_schedule',
          isLandscape: true,
          estimatedPages: 1,
          woundModel,
        });
      } else if (entry.type === 'fyi_binder') {
        let scopeShift = undefined as ReturnType<typeof state.shifts.find>;
        if (entry.scopeShiftId) {
          scopeShift = state.shifts.find(s => s.id === entry.scopeShiftId);
          if (!scopeShift) {
            configurationWarnings.push(`The FYI Binder scope shift in "${pkg.name}" no longer exists. Edit the package to fix it before printing.`);
            continue;
          }
        }
        const fyiModel = buildFyiBinderPrintModel(state, scopeShift?.roleId, scopeShift?.id);
        const totalEntries = fyiModel.sharedFyis.length + fyiModel.sharedResidentGroups.length + fyiModel.roleSections.length;
        if (totalEntries === 0) {
          contentWarnings.push('FYI Binder has no active standing notes in scope — it will print with no entries.');
        }
        items.push({
          id: `pkg_fyi_${entry.id}`,
          title: 'FYI Binder',
          subtitle: scopeShift ? `Scoped · ${scopeShift.shortCode || scopeShift.name}` : 'Facility-wide',
          docType: 'fyi_binder',
          isLandscape: false,
          estimatedPages: 1,
          fyiBinderModel: fyiModel,
        });
      } else if (entry.type === 'blank_template') {
        const model = buildBlankTaskSheetModel(dateStr);
        items.push({
          id: `pkg_blank_${entry.id}`,
          title: 'Blank TaskSheet Template',
          subtitle: 'Unpopulated worksheet',
          docType: 'blank_template',
          isLandscape: false,
          estimatedPages: model.summary.estimatedPages,
          shiftModel: model,
        });
      }
    } catch (err) {
      console.error('[buildSavedPrintPackageModel] Error building item', entry, err);
      configurationWarnings.push(`Could not generate one of the documents in "${pkg.name}". Edit the package if the problem continues.`);
    }
  }

  const estimatedTotalPages = Math.max(1, items.reduce((sum, item) => sum + item.estimatedPages, 0));

  return {
    id: `pkg_saved_${pkg.id}_${Date.now()}`,
    packageType: 'saved_package',
    savedPackageId: pkg.id,
    title: pkg.name,
    dateStr,
    formattedDate,
    facility,
    items,
    estimatedTotalPages,
    exceptions,
    configurationWarnings,
    contentWarnings,
  };
}

/** Returns saved packages, defensively filtering out any malformed entry so
 *  corrupted localStorage data can never crash the Print Center. */
export function listSavedPrintPackages(): SavedPrintPackage[] {
  const raw = db.getState().settings.savedPrintPackages || [];
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is SavedPrintPackage =>
    !!p && typeof p.id === 'string' && typeof p.name === 'string' && Array.isArray(p.items)
  );
}

/** Creates or updates (by id) a saved package. */
export function saveSavedPrintPackage(pkg: SavedPrintPackage): void {
  const existing = listSavedPrintPackages();
  db.updateSettings({ savedPrintPackages: [...existing.filter(p => p.id !== pkg.id), pkg] });
}

export function deleteSavedPrintPackage(id: string): void {
  db.updateSettings({ savedPrintPackages: listSavedPrintPackages().filter(p => p.id !== id) });
}
