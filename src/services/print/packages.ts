import { db } from '../../db';
import { Facility } from '../../types';
import { generateShiftSheet, ShiftGenerationException } from '../generator';
import { PrintService, PrintDocumentModel } from './index';
import { 
  buildBathingScheduleModel, 
  buildWoundScheduleModel, 
  BathingScheduleModel, 
  WoundScheduleModel 
} from './specializedDocs';

export type PackageDocType =
  | 'shift_document'
  | 'bathing_grid'
  | 'wound_schedule';

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
}

export interface PrintPackageModel {
  id: string;
  packageType: 'hca_daily_package' | 'lpn_clinical_package';
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
      items.push({
        id: `pkg_shift_${shift.id}`,
        title: `${shift.shortCode ? `${shift.shortCode} — ` : ''}${shift.name}`,
        subtitle: `Simple Checklist · ${shift.startTime}–${shift.endTime}`,
        docType: 'shift_document',
        isLandscape: false,
        estimatedPages: model.summary.estimatedPages,
        shiftModel: model,
      });
    } catch (err) {
      console.error('[buildHcaDailyPackage] Error generating shift sheet:', err);
    }
  }

  // 2. Weekly Bathing Matrix
  if (options.includeBathingGrid !== false) {
    try {
      const bathingModel = buildBathingScheduleModel(dateStr);
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
      items.push({
        id: `pkg_shift_${shift.id}`,
        title: `${shift.shortCode ? `${shift.shortCode} — ` : ''}${shift.name}`,
        subtitle: `Clinical Worksheet · ${shift.startTime}–${shift.endTime}`,
        docType: 'shift_document',
        isLandscape: true,
        estimatedPages: model.summary.estimatedPages,
        shiftModel: model,
      });
    } catch (err) {
      console.error('[buildLpnClinicalPackage] Error generating clinical sheet:', err);
    }
  }

  // 2. Wound Treatment Schedule
  if (options.includeWoundSchedule !== false) {
    try {
      const woundModel = buildWoundScheduleModel(dateStr);
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
  };
}
