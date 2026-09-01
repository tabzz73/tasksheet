import { GeneratedResidentStatusException, GeneratedShiftSheet, ShiftGenerationException } from '../generator';
import { Facility, PrintProfile, FYI, UnitTask, PrintDensity, QuickVitalsColumnConfig, PrintProfileConfig, ResidentTrackingConfig, TaskAttentionConfig } from '../../types';
import { getPrintAttentionTags, getPrintAttentionLegend } from '../attention';
import { DEFAULT_VITALS_COLUMNS, DEFAULT_HCA_PRINT_PROFILE, DEFAULT_LPN_PRINT_PROFILE } from '../../data/defaultData';
import { db } from '../../db';
import { buildFyiBinderPrintModel } from './binderBuilder';
import type { FyiBinderPrintDocumentModel } from '../../components/print/FyiBinderPrintDocument';
import { coverageIndicator, formatCoverageLegend } from '../coverage';

// ─── Header ──────────────────────────────────────────────────────────────────

export interface PrintDocumentHeader {
  documentTitle: string;
  documentSubtitle: string;
  facility: Facility;
  formattedDate: string;
  roleName: string;
  shiftCode: string;
  shiftShortCode?: string;
  shiftName: string;
  shiftTime: string;
  headerStyle?: 'standard' | 'compact' | 'centered';
  shiftHeaderFormat?: 'short_code_only' | 'full_name_and_role' | 'name_only';
  logoUrl?: string;
  watermarkStyle?: 'none' | 'draft' | 'confidential' | 'sample';
}

export type ShiftHeaderFormat = 'short_code_only' | 'full_name_and_role' | 'name_only';

export interface ShiftHeaderData {
  shiftShortCode?: string;
  shiftCode?: string;
  shiftName?: string;
  roleName?: string;
  shiftTime?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * formatShiftHeader — Single authoritative formatter for TaskSheet shift header display.
 * Used identically by UniversalTableDocument and the Settings Live Header Layout Preview.
 *
 * Rules:
 * - 'short_code_only' (Default): {shiftShortCode} · {shiftTime}
 *   e.g. "D1 · 0700–1500" or "D1LPN · 0700–1900" or "NLPN · 1900–0700"
 * - 'name_only': {shiftName} · {shiftTime}
 *   e.g. "D1LPN — LPN Day · 0700–1900"
 * - 'full_name_and_role': {shiftName} · {roleName} · {shiftTime}
 *   e.g. "D1LPN — LPN Day · Licensed Practical Nurse · 0700–1900"
 */
export function formatShiftHeader(
  data: ShiftHeaderData,
  displayMode: ShiftHeaderFormat = 'short_code_only'
): string {
  const shortCode = data.shiftShortCode || data.shiftCode || data.shiftName || 'SHIFT';
  const name = data.shiftName || shortCode;
  const time = data.shiftTime || (data.startTime && data.endTime ? `${data.startTime}–${data.endTime}` : '');
  const role = data.roleName;

  switch (displayMode) {
    case 'name_only':
      return time ? `${name} · ${time}` : name;
    case 'full_name_and_role':
      return [name, role, time].filter(Boolean).join(' · ');
    case 'short_code_only':
    default:
      return time ? `${shortCode} · ${time}` : shortCode;
  }
}

// ─── Unit task (structured — replaces old PrintUnitTaskRow) ──────────────────

export interface PrintWritableField {
  label: string;
  lines: number;
}

export interface PrintUnitTask {
  id: string;
  time: string;
  title: string;
  instruction?: string;
  writableFields: PrintWritableField[];
}

// ─── Important FYI ───────────────────────────────────────────────────────────

export interface PrintImportantInfo {
  categoryLabel: string;   // 'SAFETY', 'PREFERENCE', 'COMMUNICATION', etc.
  priority: 'urgent' | 'high' | 'normal';
  text: string;
}

// ─── Resident care task ───────────────────────────────────────────────────────

export interface PrintTask {
  id: string;
  time: string;
  title: string;
  category: string;
  instruction?: string;
  timingNote?: string;           // translated from bathingRelation
  contextualWarning?: string;    // concise ⚠ note when FYI directly affects task
  attentionConfig?: TaskAttentionConfig;
  trackingConfig?: ResidentTrackingConfig;
  attentionTags?: string[];
  writableFields: PrintWritableField[];
  priority: 'normal' | 'high' | 'urgent';
}

// ─── Wound ────────────────────────────────────────────────────────────────────

export interface PrintWoundAction {
  actionLabel: string;     // 'Treatment / Dressing Change', 'Assessment', etc.
  instruction?: string;
  writableFields: PrintWritableField[];
}

export interface PrintWoundGroup {
  woundId: string;
  site: string;            // original siteLocation
  siteHeader: string;      // e.g. 'LEFT LOWER LEG (VENOUS ULCER)'
  time: string;            // scheduled time (default 1000 for wounds)
  actions: PrintWoundAction[];
}

export interface PrintWoundTableRow {
  id: string;
  time: string;
  roomNumber: string;
  residentName: string;
  location: string;
  protocol: string;
  supplies: string;
  assessmentType: 'none' | 'partial' | 'full';
}

// ─── Resident group ───────────────────────────────────────────────────────────

export interface PrintResidentGroup {
  residentId: string;
  roomNumber: string;
  residentName: string;
  importantInfoItems: PrintImportantInfo[];
  tasks: PrintTask[];
  woundGroups: PrintWoundGroup[];
}

// ─── Universal Table Row (Universal Compact Table Architecture) ─────────────

export interface PrintTableRow {
  id: string;
  workflowSection: 'start' | 'resident_care' | 'untimed_prn' | 'end';
  rowType: 'compact' | 'standard' | 'expanded';
  time: string;                     // e.g. '0800', '0930', '—'
  roomNumber: string;               // e.g. '254', '329B', '—'
  residentName: string;             // e.g. 'Mary Smith', '—'
  residentId?: string;
  taskTitle: string;                // e.g. 'AM Care — Complete'
  category: string;
  attentionTags?: string[];         // e.g. ['[HA]', '[TC]', '[BM]']
  importantInformation?: string;   // Concise operational snippets: e.g. 'Transfer belt · 2-Person' or 'Before breakfast'
  structuredResult?: {
    type: 'bg' | 'vitals' | 'temp' | 'weight' | 'wound' | 'pass_issue' | 'generic';
    label: string;                  // e.g. 'BG: ______ mmol/L' or 'BP ___/___  HR ___  Temp ___'
    lines?: number;
  };
  notesLineCount: number;           // default 1 for clinical/general, 0 if compact
  priority: 'normal' | 'high' | 'urgent';
  isWound?: boolean;
}

// ─── Top-level model ──────────────────────────────────────────────────────────

export interface PrintDocumentModel {
  header: PrintDocumentHeader;
  generatedAt?: string;
  profile: 'simple_checklist' | 'clinical_worksheet';
  density?: PrintDensity;
  largePrint?: boolean;
  tableRows: PrintTableRow[];
  /** Dedicated clinical wound section; wounds are not duplicated in tableRows. */
  woundRows: PrintWoundTableRow[];
  conciseShiftAlerts: Array<{ priority: 'urgent' | 'high'; text: string; room?: string }>;
  startUnitTasks: PrintUnitTask[];
  duringUnitTasks: PrintUnitTask[];
  endUnitTasks: PrintUnitTask[];
  importantSharedFYIs: PrintImportantInfo[];
  residentStatusExceptions: GeneratedResidentStatusException[];
  residentGroups: PrintResidentGroup[];
  prnResidentGroups?: PrintResidentGroup[];
  showQuickVitalsGrid: boolean;
  quickVitalsResidents: { room: string; name: string }[];
  quickVitalsRowsCount?: number;
  quickVitalsColumns?: QuickVitalsColumnConfig[];
  handoffNotesLinesCount: number;
  confidentialityNotice?: string;
  developerFooter?: string;
  attentionLegend?: { code: string; label: string }[];
  coverageLegend?: string[];
  /** Screen-only configuration exceptions withheld by the generator. */
  exceptions: ShiftGenerationException[];
  summary: {
    totalResidentTasks: number;
    totalUnitTasks: number;
    importantFyiCount: number;
    estimatedPages: number;
    paperEfficiencyNote: string;
  };
}

export interface AdaptivePrintLayout {
  density: PrintDensity;
  handoffLines: number;
  estimatedPages: number;
}

/**
 * Keeps busy worksheets compact without sacrificing the readable low-volume
 * layout. Explicit spacious/large-print choices are never auto-compacted.
 * Handoff lines yield to operational rows before another page is introduced.
 */
export function calculateAdaptivePrintLayout(options: {
  isClinical: boolean;
  requestedDensity: PrintDensity;
  largePrint: boolean;
  taskRowCount: number;
  sectionCount: number;
  alertCount: number;
  requestedHandoffLines: number;
}): AdaptivePrintLayout {
  const {
    isClinical,
    requestedDensity,
    largePrint,
    taskRowCount,
    sectionCount,
    alertCount,
    requestedHandoffLines,
  } = options;

  const autoCompactThreshold = isClinical ? 9 : 14;
  const density: PrintDensity = requestedDensity === 'standard' && !largePrint && taskRowCount >= autoCompactThreshold
    ? 'compact'
    : requestedDensity;

  const rowsPerPage = isClinical
    ? density === 'compact' ? 16 : density === 'spacious' || largePrint ? 11 : 14
    : density === 'compact' ? 24 : density === 'spacious' || largePrint ? 17 : 21;

  // Section dividers, alerts, and ruled notes consume fractions of a normal row.
  const fixedRowUnits = sectionCount * 0.55 + alertCount * 0.65;
  const availableNoteUnits = Math.max(0, rowsPerPage - taskRowCount - fixedRowUnits);
  const maxHandoffLinesOnFirstPage = Math.floor(availableNoteUnits / 0.65);
  const canYieldHandoffSpace = density === 'compact' && !largePrint;
  const handoffLines = requestedHandoffLines > 0
    ? canYieldHandoffSpace
      ? Math.min(requestedHandoffLines, Math.max(1, maxHandoffLinesOnFirstPage))
      : requestedHandoffLines
    : 0;
  const totalRowUnits = taskRowCount + fixedRowUnits + handoffLines * 0.65;
  const estimatedPages = Math.max(1, Math.ceil(totalRowUnits / rowsPerPage));

  return { density, handoffLines, estimatedPages };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatDatePretty(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-CA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export function formatMilitaryTimeRange(start: string, end: string): string {
  return `${start}\u2013${end}`;
}

export function formatShiftDisplayName(rawName: string, shortCode?: string): string {
  const name = (rawName || '').trim();
  const code = (shortCode || '').trim();

  if (!code) return name;
  if (!name) return code;

  // Escape regex special chars
  const escapedCode = code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const codeRegex = new RegExp(`^${escapedCode}\\s*[—–\\-:]*\\s*`, 'i');
  
  if (codeRegex.test(name)) {
    const stripped = name.replace(codeRegex, '').trim();
    if (!stripped) return code;
    return `${code} \u2014 ${stripped}`;
  }

  return `${code} \u2014 ${name}`;
}

/** Natural sort for room numbers: e.g. 101 < 103a < 254 < 329b */
function sortRoomNumbers(a: string, b: string): number {
  const parseRoom = (r: string) => {
    const m = r.match(/^(\d+)([a-z]*)$/i);
    if (!m) return { num: 9999, suffix: r };
    return { num: parseInt(m[1], 10), suffix: (m[2] || '').toLowerCase() };
  };
  const ra = parseRoom(a);
  const rb = parseRoom(b);
  if (ra.num !== rb.num) return ra.num - rb.num;
  return ra.suffix.localeCompare(rb.suffix);
}

/** Translate bathingRelation enum value to natural-language timing note */
function translateBathingRelation(rel: string): string | undefined {
  switch (rel) {
    case 'after_bath': return 'After scheduled shower/bath.';
    case 'before_bath': return 'Before scheduled shower/bath.';
    case 'separate_day': return 'On a separate day from bathing.';
    case 'independent': return undefined;
    default: return undefined;
  }
}

/** Uppercase + clean category name for display */
function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    preference: 'PREFERENCE',
    communication: 'COMMUNICATION',
    safety: 'SAFETY',
    protocol: 'COMMUNICATION / PROTOCOL',
    medical: 'MEDICAL',
    general: 'GENERAL',
  };
  return map[cat.toLowerCase()] ?? cat.toUpperCase();
}

/**
 * Concise clinical instruction compressor:
 * Shortens lengthy instructions into concise operational phrases without losing critical meaning.
 */
export function compressTaskInstruction(raw: string): string {
  if (!raw) return '';
  let s = raw.trim();

  // Normalize common lengthy medical / nursing phrases
  s = s.replace(/Check fasting BG before breakfast\.?\s*Administer\s+([A-Za-z0-9]+)\s+(\d+\s*Units?)\s+SC\s+per\s+MAR\.?/i, 'Fasting BG before breakfast · Insulin per MAR.');
  s = s.replace(/Check fasting (BG|blood glucose) before breakfast\.?/i, 'Fasting BG before breakfast.');
  s = s.replace(/Check O2 concentrator at (\d+\s*L\/min),?\s*inspect skin behind ears\.?/i, 'O₂ $1 · Check equipment/skin.');
  s = s.replace(/Transfer using mechanical lift with (\d+) staff members?\.?/i, 'Mechanical lift · $1 staff.');
  s = s.replace(/Transfer using mechanical lift\.?/i, 'Mechanical lift.');
  s = s.replace(/2-person bed-to-chair transfer[,\.]?\s*Transfer belt required\.?/i, '2-person transfer · Transfer belt required.');
  s = s.replace(/Follow facility wound care dressing change protocol\.?/i, 'Wound care protocol.');
  s = s.replace(/Follow facility wound care assessment protocol\.?/i, 'Wound assessment protocol.');
  s = s.replace(/Receive shift handoff and review outstanding resident concerns\.?/i, 'Receive handoff & review concerns.');
  s = s.replace(/Count and verify narcotics\/controlled substances with oncoming nurse\.?/i, 'Controlled medication count.');
  s = s.replace(/Inspect emergency equipment, defibrillator battery, and emergency seal\.?/i, 'Crash cart & equipment check.');
  s = s.replace(/Record medication refrigerator temperature per AHS standards\.?/i, 'Record medication fridge temp.');
  
  // HCA Care & Routine phrase shorteners
  s = s.replace(/Assist with face\/hands wash, oral care, hair grooming, and dressing\.?/i, 'Wash · Oral care · Grooming · Dressing');
  s = s.replace(/Assist with morning personal care, grooming, and dressing\.?/i, 'Wash · Oral care · Grooming · Dressing');
  s = s.replace(/Assist with morning care, grooming, and dressing\.?/i, 'Wash · Oral care · Grooming · Dressing');
  s = s.replace(/Assist with bedtime care and comfort measures\.?/i, 'Personal care · Toileting · Nightwear · Bed prep');
  s = s.replace(/Check and change continence product; provide peri care and barrier cream\.?/i, 'Brief change · Peri care · Barrier cream');
  s = s.replace(/Escort resident to dining room and return after meal\.?/i, 'Escort to/from dining room');
  s = s.replace(/Full assistance with oral feeding, cueing and swallowing monitoring\.?/i, 'Escort · Setup · Cue slowly · Return');
  s = s.replace(/Assistance with (breakfast|lunch|supper|meal) tray and hydration\.?/i, '$1 assistance & hydration');
  s = s.replace(/Offer fluids and hydration to resident\.?/i, 'Offer fluids');
  s = s.replace(/Offer fluids to maintain hydration\.?/i, 'Offer fluids');
  s = s.replace(/Empty catheter drainage bag and record output\.?/i, 'Record output on facility flow sheet');
  s = s.replace(/Prompt and remind resident to take medications per MAP protocol\.?/i, 'Medication reminder');
  s = s.replace(/Partial assistance with medication administration\.?/i, 'Partial assistance');
  s = s.replace(/Full assistance with medication administration\.?/i, 'Full assistance');
  s = s.replace(/Apply compression stockings before resident gets out of bed\.?/i, 'Apply before breakfast');
  s = s.replace(/Reposition resident and check pressure points per care plan\.?/i, 'Reposition · Check pressure points');
  s = s.replace(/Assist with shower or tub bath per resident preference\.?/i, 'Shower assistance · Shower chair');

  // Generic abbreviation replacements
  s = s.replace(/\bblood glucose\b/gi, 'BG');
  s = s.replace(/\bblood pressure\b/gi, 'BP');
  s = s.replace(/\bMedical Administration Record\b/gi, 'MAR');
  s = s.replace(/\bsubcutaneous(ly)?\b/gi, 'SC');
  s = s.replace(/\bintramuscular(ly)?\b/gi, 'IM');
  s = s.replace(/\boxygen\b/gi, 'O₂');
  s = s.replace(/\btemperature\b/gi, 'temp');
  s = s.replace(/\btwo-person\b/gi, '2-person');

  // Clean double spaces or trailing periods/commas
  s = s.replace(/\s+/g, ' ').replace(/[·\s,;.]+$/, '').trim();
  return s;
}

/**
 * Deduplicate and prioritize attention tags for consistent print ordering.
 * All configured indicators are retained by default so print preview cannot
 * silently disagree with the operational shift view.
 */
export function filterPrioritizedAttentionTags(tags?: string[], maxTags: number = Number.POSITIVE_INFINITY): string[] {
  if (!tags || tags.length === 0) return [];
  
  const priorityOrder = ['[HA]', '[TC]', '[BM]', '[AM]', '[2P]', '[EQ]', '[FU]', '[MON]', '[OB]', '[CR]', '[DOC]'];

  // Sort by priority order
  const sorted = [...new Set(tags)].sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    const pA = idxA === -1 ? 99 : idxA;
    const pB = idxB === -1 ? 99 : idxB;
    return pA - pB;
  });

  return sorted.slice(0, maxTags);
}

/**
 * Normalize instruction text: strip duplicate leading words, remove
 * bracketed enum values, clean whitespace.
 */
function normalizeInstruction(text: string): string {
  if (!text) return '';
  // Remove parenthesized internal values like (after_bath), (before_bath)
  let t = text.replace(/\([a-z_]+\)/g, '').trim();
  // Collapse multiple spaces
  t = t.replace(/  +/g, ' ');
  // Remove "Setup setup" duplicate
  t = t.replace(/\b(\w+)\s+\1\b/gi, '$1');
  return t.trim();
}

/**
 * Return a concise contextual warning string if any of the resident's
 * active FYIs are directly relevant to this task's category.
 * Returns undefined if no relevant FYI or FYI is not directly actionable.
 */
function getContextualWarning(
  taskCategory?: string,
  taskTitle?: string,
  fyis: FYI[] = []
): string | undefined {
  const catLower = (taskCategory || '').toLowerCase();
  const titleLower = (taskTitle || '').toLowerCase();

  for (const fyi of fyis) {
    const fyiCat = fyi.category.toLowerCase();
    // Safety FYI is relevant if task involves mobility/transfer
    if (fyiCat === 'safety' && (
      catLower.includes('mobility') || catLower.includes('transfer') ||
      titleLower.includes('transfer') || titleLower.includes('assist')
    )) {
      // Return first sentence only (concise warning)
      return fyi.text.split(/[.!]/)[0].trim() + '.';
    }
    // Preference FYI on shower/bathing tasks
    if (fyiCat === 'preference' && (
      catLower.includes('bath') || catLower.includes('shower') ||
      titleLower.includes('shower') || titleLower.includes('bath')
    )) {
      return fyi.text.split(/[.!]/)[0].trim() + '.';
    }
  }
  return undefined;
}

/** Build writable fields for a unit task based on resultType */
function buildUnitWritableFields(u: UnitTask, profile: string): PrintWritableField[] {
  if (profile === 'simple_checklist') return [];
  switch (u.resultType) {
    case 'temperature':
      return [{ label: `Temp: ______ \u00B0C   (Range: ${u.resultConfig?.min ?? 2.0}\u2013${u.resultConfig?.max ?? 8.0}\u00B0C)`, lines: 0 }];
    case 'pass_issue':
      return [{ label: `\u2610 ${u.resultConfig?.passLabel ?? 'OK / Reconciled'}   \u2610 ${u.resultConfig?.issueLabel ?? 'Issue Noted'}`, lines: 0 }];
    case 'value_note':
      return [{ label: 'Result:', lines: 1 }];
    default:
      return [];
  }
}

/** Paper-only resident tracking prompts; no entered result is stored by TaskSheet. */
export function buildResidentTrackingFields(config?: ResidentTrackingConfig): PrintWritableField[] {
  if (!config) return [];
  switch (config.kind) {
    case 'rai':
      return [{ label: 'RAI / Flow Sheet Code: ______   Observation: ____________________', lines: 0 }];
    case 'bowel':
      return [{ label: 'BM: ☐ None  ☐ Small  ☐ Medium  ☐ Large   Type: ______', lines: 0 }];
    case 'fluid':
      return [{ label: 'Oral Fluid Intake: ______ mL   Notes: ____________________', lines: 0 }];
    case 'weight':
      return [{ label: 'Weight: ______ kg   Scale / Notes: ____________________', lines: 0 }];
    case 'sleep':
      return [{ label: 'Sleep: ______ hrs   ☐ Settled  ☐ Interrupted   Notes: __________', lines: 0 }];
    case 'food':
      return [{ label: 'Meal Intake: ______%   ☐ Poor  ☐ Fair  ☐ Good   Notes: __________', lines: 0 }];
    case 'behavior':
      return [{ label: 'Behaviour / Trigger / Response: ______________________________', lines: 1 }];
    case 'pain':
      return [{ label: `${config.prompt ? `${config.prompt} — ` : ''}Pain: ______/10   Location: __________   Tool: ☐ 0–10 ☐ PAINAD`, lines: 0 }];
    default:
      return [];
  }
}

// ─── Main factory ─────────────────────────────────────────────────────────────

export class PrintService {
  public static createDocumentModel(
    sheet: GeneratedShiftSheet,
    selectedProfile?: PrintProfile | PrintProfileConfig
  ): PrintDocumentModel {
    const state = db.getState();
    const facility = state.facility;

    // Resolve profile
    let profile: 'simple_checklist' | 'clinical_worksheet' = 'clinical_worksheet';
    let activeConfig: PrintProfileConfig | undefined;

    if (typeof selectedProfile === 'object' && selectedProfile !== null) {
      activeConfig = selectedProfile;
      profile = selectedProfile.profileType;
    } else if (selectedProfile === 'simple_checklist' || selectedProfile === 'clinical_worksheet') {
      profile = selectedProfile;
    } else {
      profile = sheet.role.defaultPrintProfile || 'clinical_worksheet';
    }

    if (!activeConfig) {
      const savedProfiles = state.settings.printProfiles || [];
      activeConfig = savedProfiles.find(p => p.profileType === profile) ||
        (profile === 'simple_checklist' ? DEFAULT_HCA_PRINT_PROFILE : DEFAULT_LPN_PRINT_PROFILE);
    }

    const isClinical = profile === 'clinical_worksheet';

    const documentTitle = isClinical
      ? 'TASKSHEET'
      : 'TASKSHEET';
    const documentSubtitle = isClinical
      ? 'CLINICAL SHIFT WORKSHEET'
      : 'DAILY ASSIGNMENT';

    const shiftCode = sheet.shift.shortCode || '';
    const shiftDisplayName = formatShiftDisplayName(sheet.shift.name, shiftCode);
    const branding = state.settings.branding;

    const header: PrintDocumentHeader = {
      documentTitle,
      documentSubtitle,
      facility,
      formattedDate: formatDatePretty(sheet.date),
      roleName: sheet.role.name,
      shiftCode,
      shiftShortCode: shiftCode,
      shiftName: shiftDisplayName,
      shiftTime: formatMilitaryTimeRange(sheet.shift.startTime, sheet.shift.endTime),
      headerStyle: branding?.headerStyle || 'standard',
      shiftHeaderFormat: branding?.shiftHeaderFormat || 'short_code_only',
      logoUrl: branding?.logoUrl,
      watermarkStyle: branding?.watermarkStyle || 'none',
    };

    // ── Unit tasks ──────────────────────────────────────────────────────────
    const mapUnitTask = (u: UnitTask): PrintUnitTask => {
      const fields = buildUnitWritableFields(u, profile);
      return {
        id: u.id,
        time: u.time || '\u2014',
        title: u.title,
        instruction: normalizeInstruction(u.instructions || ''),
        writableFields: fields,
      };
    };

    const startUnitTasks = sheet.startUnitTasks.map(mapUnitTask);
    const duringUnitTasks = sheet.duringUnitTasks.map(mapUnitTask);
    const endUnitTasks = sheet.endUnitTasks.map(mapUnitTask);

    // ── Shared/unit FYIs  ───────────────────────────────────────────────────
    const importantSharedFYIs: PrintImportantInfo[] = sheet.importantFYIs
      .filter(f => !f.residentId)
      .map(f => ({
        categoryLabel: categoryLabel(f.category),
        priority: f.importance,
        text: f.text,
      }));

    // ── Resident groups ─────────────────────────────────────────────────────
    // Sort assignments: chronological by earliest task time, then natural room order
    const sortedAssignments = [...sheet.residentAssignments].sort((a, b) => {
      const aTime = a.tasks.length > 0 ? (a.tasks[0].time || '9999') : '9999';
      const bTime = b.tasks.length > 0 ? (b.tasks[0].time || '9999') : '9999';
      if (aTime !== bTime) return aTime.localeCompare(bTime);
      return sortRoomNumbers(a.resident.roomNumber, b.resident.roomNumber);
    });

    const residentGroups: PrintResidentGroup[] = sortedAssignments.map(assignment => {
      const res = assignment.resident;
      const resName = `${res.firstName} ${res.lastName}`;
      const resFyis = assignment.fyis;

      // Important info items for this resident (all FYIs shown here)
      const importantInfoItems: PrintImportantInfo[] = resFyis.map(f => ({
        categoryLabel: categoryLabel(f.category),
        priority: f.importance,
        text: f.text,
      }));

      // Tasks — sorted chronologically
      const sortedTasks = [...assignment.tasks].sort((a, b) => {
        const at = a.time || '9999';
        const bt = b.time || '9999';
        return at.localeCompare(bt);
      });

      const tasks: PrintTask[] = sortedTasks.map(t => {
        const instruction = normalizeInstruction(t.instructions || '');
        const contextualWarning = getContextualWarning(t.category, t.title, resFyis);

        // LPN clinical tasks get observation/notes write-in fields
        const writableFields: PrintWritableField[] = buildResidentTrackingFields(t.trackingConfig);
        if (writableFields.length === 0 && isClinical) {
          const catL = (t.category || '').toLowerCase();
          const titleL = (t.title || '').toLowerCase();
          if (catL.includes('diabetes') || catL.includes('glucose') || titleL.includes('bg') || titleL.includes('blood glucose')) {
            writableFields.push({ label: 'Result: ______ mmol/L   Time: ______', lines: 0 });
            writableFields.push({ label: 'Notes:', lines: 1 });
          } else if (catL.includes('vital') || catL.includes('blood pressure') || titleL.includes('vitals') || titleL.includes('bp')) {
            writableFields.push({ label: 'BP: ______   HR: ______   RR: ______   Temp: ______   SpO\u2082: ______', lines: 0 });
            writableFields.push({ label: 'Time: ______   Notes:', lines: 1 });
          } else if (catL.includes('respiratory') || catL.includes('oxygen')) {
            writableFields.push({ label: 'SpO\u2082: ______%   L/min: ______   Notes:', lines: 1 });
          } else if (catL.includes('injection')) {
            writableFields.push({ label: 'Site: ______   Given by: ______   Time: ______', lines: 0 });
          } else if (catL.includes('catheter') || catL.includes('urinary')) {
            writableFields.push({ label: 'Output: ______ mL   Appearance: ______   Notes:', lines: 1 });
          } else if (catL.includes('monitoring') || catL.includes('assessment')) {
            writableFields.push({ label: 'Findings / Result:', lines: 1 });
            writableFields.push({ label: 'Notes / Follow-up:', lines: 1 });
          } else {
            writableFields.push({ label: 'Notes:', lines: 1 });
          }
        }

        return {
          id: t.id,
          time: t.time || '\u2014',
          title: `${coverageIndicator(t.serviceCoverage)} ${t.title}`.trim(),
          category: t.category,
          instruction: instruction || undefined,
          timingNote: undefined, // wounds only use timingNote via woundGroups
          contextualWarning,
          attentionConfig: t.attentionConfig,
          trackingConfig: t.trackingConfig,
          attentionTags: getPrintAttentionTags(t.attentionConfig),
          writableFields,
          priority: t.priority || 'normal',
        };
      });

      // Wound groups
      const woundGroups: PrintWoundGroup[] = assignment.wounds.map(w => {
        const timingNote = translateBathingRelation(w.bathingRelation);
        const instruction = normalizeInstruction(w.protocol || w.instructions || 'Follow wound care protocol.');
        const instructionWithTiming = timingNote
          ? `${instruction} ${timingNote}`.trim()
          : instruction;

        const firstActionLabel = (() => {
          switch (w.firstAction) {
            case 'treatment': return 'Treatment / Dressing Change';
            case 'dressing_change': return 'Dressing Change';
            case 'assessment': return 'Wound Assessment';
            default: return 'Wound Care';
          }
        })();

        const treatmentAction: PrintWoundAction = {
          actionLabel: firstActionLabel,
          instruction: instructionWithTiming || undefined,
          writableFields: isClinical ? [
            { label: 'Observation:', lines: 1 },
            { label: 'Notes / Follow-up:', lines: 1 },
          ] : [],
        };

        const actions: PrintWoundAction[] = [treatmentAction];
return {
          woundId: w.id,
          site: w.siteLocation,
          siteHeader: w.siteLocation.toUpperCase(),
          time: w.time || '—',
          actions,
        };
      });

      return {
        residentId: res.id,
        roomNumber: res.roomNumber,
        residentName: resName,
        importantInfoItems,
        tasks,
        woundGroups,
      };
    });

    // ── Process PRN resident groups ──────────────────────────────────────────
    const prnResidentGroups: PrintResidentGroup[] = (sheet.prnTasks || []).map(assignment => {
      const tasks: PrintTask[] = assignment.tasks.map(t => ({
        id: t.id,
        time: 'PRN',
        title: `${coverageIndicator(t.serviceCoverage)} ${t.title}`.trim(),
        category: t.category,
        instruction: normalizeInstruction(t.instructions || 'Administer/perform as required.'),
        timingNote: undefined,
        contextualWarning: undefined,
        attentionConfig: t.attentionConfig,
        attentionTags: getPrintAttentionTags(t.attentionConfig),
        writableFields: isClinical ? [{ label: 'Reason / Assessment:', lines: 1 }, { label: 'Given / Outcome:', lines: 1 }] : [],
        priority: t.priority || 'normal',
      }));

      return {
        residentId: assignment.resident.id,
        roomNumber: assignment.resident.roomNumber,
        residentName: `${assignment.resident.firstName} ${assignment.resident.lastName}`,
        importantInfoItems: [],
        tasks,
        woundGroups: [],
      };
    }).filter(g => g.tasks.length > 0);

    // ── Build Universal Chronological Table Rows ────────────────────────────
    const tableRows: PrintTableRow[] = [];

    // 1. START OF SHIFT (Unit tasks scheduled at start)
    startUnitTasks.forEach(u => {
      const isFridge = u.title.toLowerCase().includes('fridge') || u.title.toLowerCase().includes('temperature');
      const isPassIssue = u.instruction?.toLowerCase().includes('pass') || u.title.toLowerCase().includes('supply') || u.title.toLowerCase().includes('count') || u.title.toLowerCase().includes('cart');
      
      tableRows.push({
        id: `row_unit_start_${u.id}`,
        workflowSection: 'start',
        rowType: 'compact',
        time: u.time && u.time !== '—' ? u.time : '0700',
        roomNumber: '—',
        residentName: '—',
        taskTitle: u.title,
        category: 'Start of Shift',
        importantInformation: compressTaskInstruction(u.instruction || ''),
        structuredResult: isFridge 
          ? { type: 'temp', label: 'Temp: _____ °C' }
          : isPassIssue 
            ? { type: 'pass_issue', label: '☐ OK   ☐ Issue' }
            : undefined,
        notesLineCount: isClinical ? 1 : 0,
        priority: 'normal',
      });
    });

    // 2. RESIDENT CARE (Chronological sorted resident tasks)
    interface RawResidentItem {
      id: string;
      time: string;
      roomNumber: string;
      residentName: string;
      residentId: string;
      taskTitle: string;
      category: string;
      rowType: 'compact' | 'standard' | 'expanded';
      attentionTags?: string[];
      importantInfo?: string;
      structuredResult?: { type: 'bg' | 'vitals' | 'temp' | 'weight' | 'wound' | 'pass_issue' | 'generic'; label: string };
      priority: 'normal' | 'high' | 'urgent';
      isWound?: boolean;
    }

    const rawResidentItems: RawResidentItem[] = [];

    residentGroups.forEach(g => {
      // Find top safety/operational FYI for this resident to include concisely
      const topSafetyFyi = g.importantInfoItems.find(f => f.priority === 'urgent' || f.priority === 'high')?.text;
      
      g.tasks.forEach(t => {
        // Build concise operational info
        const parts: string[] = [];
        if (t.instruction) parts.push(compressTaskInstruction(t.instruction));
        if (t.contextualWarning) parts.push(`⚠ ${compressTaskInstruction(t.contextualWarning)}`);
        else if (topSafetyFyi && (t.category.toLowerCase().includes('mobility') || t.category.toLowerCase().includes('am') || t.category.toLowerCase().includes('pm'))) {
          const compSafety = compressTaskInstruction(topSafetyFyi);
          parts.push(compSafety.length > 42 ? compSafety.slice(0, 40) + '…' : compSafety);
        }
        if (t.attentionConfig?.equipmentNote) parts.push(`Eq: ${t.attentionConfig.equipmentNote}`);

        const conciseInfo = parts.filter(Boolean).join(' · ');

        // Structured result field & rowType
        let structuredResult: { type: 'bg' | 'vitals' | 'temp' | 'weight' | 'wound' | 'pass_issue' | 'generic'; label: string } | undefined;
        let rowType: 'compact' | 'standard' | 'expanded' = 'standard';
        const titleL = (t.title || '').toLowerCase();
        const catL = (t.category || '').toLowerCase();
        const isExplicitPainTask = titleL.includes('pain') || catL.includes('pain');
        const usableTrackingConfig = t.trackingConfig
          && (t.trackingConfig.kind !== 'pain' || isExplicitPainTask)
          ? t.trackingConfig
          : undefined;

        // The task's clinical meaning is authoritative. Stored tracking metadata
        // may enrich a task, but must never turn vitals/glucose/etc. into Pain.
        if (titleL.includes('bg') || titleL.includes('glucose') || titleL.includes('insulin')) {
          structuredResult = { type: 'bg', label: 'BG: ______ mmol/L' };
        } else if (titleL.includes('vitals') || titleL.includes('vital signs') || titleL.includes('bp') || titleL.includes('blood pressure')) {
          structuredResult = {
            type: 'vitals',
            label: isExplicitPainTask
              ? 'BP: ____/____  HR: ____\nRR: ____  Temp: ____\nSpO₂: ____%  Pain: ____/10\nLocation: ______  Tool: ☐ 0–10 ☐ PAINAD'
              : 'BP: ____/____  HR: ____\nRR: ____  Temp: ____\nSpO₂: ____%',
          };
          rowType = 'expanded';
        } else if (titleL.includes('weight') || titleL.includes('wt')) {
          structuredResult = { type: 'weight', label: 'Wt: ______ kg' };
        } else if (titleL.includes('temperature') || titleL.includes('temp')) {
          structuredResult = { type: 'temp', label: 'Temp: _____ °C' };
        } else if (isClinical && (titleL.includes('oxygen') || titleL.includes('respiratory'))) {
          structuredResult = { type: 'vitals', label: 'RR: ____   SpO₂: ____%\nO₂: ____ L/min' };
        } else if (isClinical && (titleL.includes('post-fall') || titleL.includes('neuro'))) {
          structuredResult = { type: 'generic', label: 'Neuro / Result: ____________' };
        } else if (isClinical && (titleL.includes('edema') || titleL.includes('circulation'))) {
          structuredResult = { type: 'generic', label: 'Edema / Circulation: ____________' };
        } else if (usableTrackingConfig) {
          structuredResult = {
            type: usableTrackingConfig.kind === 'weight' ? 'weight' : 'generic',
            label: buildResidentTrackingFields(usableTrackingConfig).map(field => field.label).join('\n'),
          };
          if (usableTrackingConfig.kind === 'behavior') rowType = 'expanded';
        } else if (isClinical && titleL.includes('pain')) {
          structuredResult = { type: 'generic', label: 'Pain: ______/10   Location: __________' };
        } else if (isClinical && (catL.includes('assessment') || catL.includes('monitoring') || catL.includes('injection'))) {
          structuredResult = { type: 'generic', label: 'Result: ____________' };
        } else if (isClinical) {
          // Every scheduled resident row on a clinical worksheet needs a usable
          // write-in field even when no more specific result pattern applies.
          structuredResult = { type: 'generic', label: 'Result: ____________' };
        }

        const filteredTags = filterPrioritizedAttentionTags(t.attentionTags);

        rawResidentItems.push({
          id: `row_task_${t.id}`,
          time: t.time || '—',
          roomNumber: g.roomNumber,
          residentName: g.residentName,
          residentId: g.residentId,
          taskTitle: t.title,
          category: t.category,
          rowType,
          attentionTags: filteredTags.length > 0 ? filteredTags : undefined,
          importantInfo: conciseInfo || undefined,
          structuredResult,
          priority: t.priority,
        });
      });

    });

    const woundRows: PrintWoundTableRow[] = isClinical
      ? sheet.residentAssignments.flatMap(assignment => assignment.wounds.map(wound => ({
          id: wound.id,
          time: wound.time || '—',
          roomNumber: assignment.resident.roomNumber,
          residentName: `${assignment.resident.firstName} ${assignment.resident.lastName}`,
          location: wound.siteLocation,
          protocol: normalizeInstruction(wound.protocol || wound.instructions || 'Follow configured wound protocol.'),
          supplies: (wound.supplies || []).map(supply => supply.unitSize && !supply.name.includes(supply.unitSize) ? `${supply.name} — ${supply.unitSize}` : supply.name).join('; ') || '—',
          assessmentType: wound.assessmentType || 'none',
        })))
        .sort((a, b) => a.time.localeCompare(b.time) || sortRoomNumbers(a.roomNumber, b.roomNumber) || a.location.localeCompare(b.location))
      : [];

    // Sort resident items chronologically, then by room number
    rawResidentItems.sort((a, b) => {
      const aTime = a.time === '—' || a.time === 'PRN' ? '9999' : a.time;
      const bTime = b.time === '—' || b.time === 'PRN' ? '9999' : b.time;
      if (aTime !== bTime) return aTime.localeCompare(bTime);
      return sortRoomNumbers(a.roomNumber, b.roomNumber);
    });

    rawResidentItems.forEach(item => {
      // The HCA (simple_checklist) profile has no dedicated Vitals/Results column,
      // so a structured write-in prompt (e.g. bowel/RAI tracking, BG, weight) would
      // otherwise never appear anywhere on the printed sheet. Fold it into Important
      // Information instead so the paper tracking prompt is never silently dropped.
      const importantInformation = !isClinical && item.structuredResult
        ? [item.importantInfo, item.structuredResult.label.replace(/\n/g, '  ')].filter(Boolean).join(' · ')
        : item.importantInfo;
      tableRows.push({
        id: item.id,
        workflowSection: 'resident_care',
        rowType: item.rowType,
        time: item.time,
        roomNumber: item.roomNumber,
        residentName: item.residentName,
        residentId: item.residentId,
        taskTitle: item.taskTitle,
        category: item.category,
        attentionTags: item.attentionTags,
        importantInformation,
        structuredResult: item.structuredResult,
        notesLineCount: isClinical ? 1 : 0,
        priority: item.priority,
        isWound: item.isWound,
      });
    });

    // 3. ANY TIME DURING SHIFT / PRN
    duringUnitTasks.forEach(u => {
      tableRows.push({
        id: `row_unit_during_${u.id}`,
        workflowSection: 'untimed_prn',
        rowType: 'compact',
        time: u.time && u.time !== '—' ? u.time : 'Any',
        roomNumber: '—',
        residentName: '—',
        taskTitle: u.title,
        category: 'Mid Shift',
        importantInformation: compressTaskInstruction(u.instruction || ''),
        notesLineCount: isClinical ? 1 : 0,
        priority: 'normal',
      });
    });

    (prnResidentGroups || []).forEach(g => {
      g.tasks.forEach(t => {
        const filteredTags = filterPrioritizedAttentionTags(t.attentionTags);
        tableRows.push({
          id: `row_prn_${t.id}`,
          workflowSection: 'untimed_prn',
          rowType: 'standard',
          time: 'PRN',
          roomNumber: g.roomNumber,
          residentName: g.residentName,
          residentId: g.residentId,
          taskTitle: t.title,
          category: t.category,
          attentionTags: filteredTags.length > 0 ? filteredTags : undefined,
          importantInformation: compressTaskInstruction(t.instruction || 'Administer/perform as required.'),
          structuredResult: isClinical ? { type: 'generic', label: 'Given/Result: ______' } : undefined,
          notesLineCount: isClinical ? 1 : 0,
          priority: t.priority,
        });
      });
    });

    // 4. END OF SHIFT (Handoff & documentation unit tasks)
    endUnitTasks.forEach(u => {
      tableRows.push({
        id: `row_unit_end_${u.id}`,
        workflowSection: 'end',
        rowType: 'compact',
        time: u.time && u.time !== '—' ? u.time : '1845',
        roomNumber: '—',
        residentName: '—',
        taskTitle: u.title,
        category: 'End of Shift',
        importantInformation: compressTaskInstruction(u.instruction || 'Outstanding concerns & shift report'),
        notesLineCount: isClinical ? 1 : 0,
        priority: 'normal',
      });
    });

    // ── Concise Top Shift Alerts (Max 3 compressed lines) ────────────────────
    const conciseShiftAlerts: Array<{ priority: 'urgent' | 'high'; text: string; room?: string }> = [];
    
    // Add urgent/high resident FYIs (compressed)
    residentGroups.forEach(g => {
      g.importantInfoItems
        .filter(f => f.priority === 'urgent' || f.priority === 'high')
        .forEach(f => {
          if (conciseShiftAlerts.length < 3) {
            conciseShiftAlerts.push({
              priority: f.priority as 'urgent' | 'high',
              text: compressTaskInstruction(f.text),
              room: g.roomNumber,
            });
          }
        });
    });

    // Add shared unit FYIs if room exists
    if (conciseShiftAlerts.length < 3) {
      importantSharedFYIs
        .filter(f => f.priority === 'urgent' || f.priority === 'high')
        .forEach(f => {
          if (conciseShiftAlerts.length < 3) {
            conciseShiftAlerts.push({
              priority: f.priority as 'urgent' | 'high',
              text: compressTaskInstruction(f.text),
            });
          }
        });
    }

    // ── Quick vitals residents (LPN only) ───────────────────────────────────
    const quickVitalsResidents = isClinical
      ? residentGroups.map(g => ({ room: g.roomNumber, name: g.residentName }))
      : [];

    // ── Compute dynamic print attention legend ──────────────────────────────
    const allDocTasks = [
      ...residentGroups.flatMap(g => g.tasks),
      ...(prnResidentGroups || []).flatMap(g => g.tasks)
    ];
    const attentionLegend = getPrintAttentionLegend(allDocTasks);

    // ── Summary & Accurate Compact Page Estimation ──────────────────────────
    const totalResidentTasks = residentGroups.reduce(
      (sum, g) => sum + g.tasks.length + g.woundGroups.reduce((ws, w) => ws + w.actions.length, 0),
      0
    );
    const totalUnitTasks = startUnitTasks.length + duringUnitTasks.length + endUnitTasks.length;
    const importantFyiCount = importantSharedFYIs.length +
      residentGroups.reduce((s, g) => s + g.importantInfoItems.filter(i => i.priority !== 'normal').length, 0);

    const totalRowsCount = tableRows.length + woundRows.length * 1.35;
    const requestedDensity = activeConfig?.density || 'standard';
    const largePrint = activeConfig?.largePrint || false;
    const requestedHandoffLines = activeConfig?.showHandoffLines !== false
      ? (activeConfig?.handoffLinesCount ?? (isClinical ? 3 : 2))
      : 0;
    const sectionCount = [
      tableRows.some(row => row.workflowSection === 'start'),
      tableRows.some(row => row.workflowSection === 'resident_care'),
      tableRows.some(row => row.workflowSection === 'untimed_prn'),
      tableRows.some(row => row.workflowSection === 'end'),
    ].filter(Boolean).length;
    const adaptiveLayout = calculateAdaptivePrintLayout({
      isClinical,
      requestedDensity,
      largePrint,
      taskRowCount: totalRowsCount,
      sectionCount,
      alertCount: conciseShiftAlerts.length,
      requestedHandoffLines,
    });
    const estimatedPages = adaptiveLayout.estimatedPages;
    const paperEfficiencyNote = `✓ Optimized for minimal paper · ~${estimatedPages} estimated page${estimatedPages !== 1 ? 's' : ''}`;

    const vitalsRows = isClinical ? (activeConfig?.quickVitalsRowsCount ?? 8) : undefined;
    const vitalsCols = isClinical ? (activeConfig?.quickVitalsColumns?.filter(c => c.enabled) ?? DEFAULT_VITALS_COLUMNS) : undefined;
    return {
      header,
      generatedAt: new Date().toISOString(),
      profile,
      density: adaptiveLayout.density,
      largePrint,
      tableRows,
      woundRows,
      conciseShiftAlerts,
      startUnitTasks: activeConfig?.showStartUnitTasks !== false ? startUnitTasks : [],
      duringUnitTasks: activeConfig?.showDuringUnitTasks !== false ? duringUnitTasks : [],
      endUnitTasks: activeConfig?.showEndUnitTasks !== false ? endUnitTasks : [],
      importantSharedFYIs: activeConfig?.showImportantFYIs !== false ? importantSharedFYIs : [],
      residentStatusExceptions: sheet.residentStatusExceptions || [],
      residentGroups,
      prnResidentGroups,
      showQuickVitalsGrid: isClinical,
      quickVitalsResidents,
      quickVitalsRowsCount: vitalsRows,
      quickVitalsColumns: vitalsCols,
      handoffNotesLinesCount: adaptiveLayout.handoffLines,
      confidentialityNotice: state.settings.branding?.showConfidentialityNotice !== false 
        ? (state.settings.branding?.confidentialityNotice || 'CONFIDENTIAL HEALTHCARE RECORD — FOR AUTHORIZED FACILITY USE ONLY. DISPOSE VIA SECURE SHREDDING AT END OF SHIFT.')
        : undefined,
      developerFooter: state.settings.developerFooterEnabled ? 'TaskSheet · SoftVibeSolutions' : undefined,
      attentionLegend: attentionLegend.length > 0 ? attentionLegend : undefined,
      coverageLegend: formatCoverageLegend([...sheet.residentAssignments, ...(sheet.prnTasks || [])].flatMap(assignment => assignment.tasks.map(task => task.serviceCoverage))),
      exceptions: sheet.exceptions,
      summary: {
        totalResidentTasks,
        totalUnitTasks,
        importantFyiCount,
        estimatedPages,
        paperEfficiencyNote,
      },
    };
  }

  public static generateDocumentModel(
    sheet: GeneratedShiftSheet,
    profile?: 'simple_checklist' | 'clinical_worksheet'
  ): PrintDocumentModel {
    return PrintService.createDocumentModel(sheet, profile);
  }

  public static createFyiBinderPrintModel(
    scopeRoleId?: string,
    scopeShiftId?: string
  ): FyiBinderPrintDocumentModel {
    return buildFyiBinderPrintModel(db.getState(), scopeRoleId, scopeShiftId);
  }
}
