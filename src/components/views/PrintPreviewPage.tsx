import React, { useEffect, useRef } from 'react';
import { AlertTriangle, ArrowLeft, Printer } from 'lucide-react';
import { db } from '../../db';
import { PrintDocumentModel } from '../../services/print';
import { PrintDocumentView } from '../print/PrintDocumentView';
import { 
  BathingScheduleModel, 
  WoundScheduleModel, 
  WeeklyWoundOverviewModel,
  WoundSupplyReorderModel,
  ResidentCareSummaryModel, 
  ShiftConfigReferenceModel 
} from '../../services/print/specializedDocs';
import { WhatChangedModel } from '../../services/printHistory';
import { HuddleSheetModel } from '../../services/dashboard';
import { HuddleSheetDocument } from '../print/HuddleSheetDocument';
import { PrintPackageModel } from '../../services/print/packages';
import { BathingScheduleDocument } from '../print/BathingScheduleDocument';
import { WoundScheduleDocument } from '../print/WoundScheduleDocument';
import { WoundWeeklyOverviewDocument } from '../print/WoundWeeklyOverviewDocument';
import { WoundSupplyReorderDocument } from '../print/WoundSupplyReorderDocument';
import { ResidentCareSummaryDocument } from '../print/ResidentCareSummaryDocument';
import { ShiftConfigReferenceDocument } from '../print/ShiftConfigReferenceDocument';
import { UpcomingScheduleDocument } from '../print/UpcomingScheduleDocument';
import { WhatChangedDocument } from '../print/WhatChangedDocument';
import { PrinterCalibrationDocument } from '../print/PrinterCalibrationDocument';
import { PrintPackageView } from '../print/PrintPackageView';
import { CustomReportModel } from '../../services/reports';
import { CustomReportDocument } from '../print/CustomReportDocument';

export type SpecializedPrintDoc = 
  | { type: 'bathing'; model: BathingScheduleModel }
  | { type: 'wound'; model: WoundScheduleModel }
  | { type: 'wound_weekly'; model: WeeklyWoundOverviewModel }
  | { type: 'wound_supplies'; model: WoundSupplyReorderModel }
  | { type: 'resident_care'; model: ResidentCareSummaryModel }
  | { type: 'upcoming'; currentDateStr: string }
  | { type: 'shift_config'; model: ShiftConfigReferenceModel }
  | { type: 'what_changed'; model: WhatChangedModel }
  | { type: 'calibration' }
  | { type: 'blank_template'; model: PrintDocumentModel }
  | { type: 'custom_report'; model: CustomReportModel }
  | { type: 'huddle'; model: HuddleSheetModel };

interface PrintPreviewPageProps {
  model?: PrintDocumentModel | null;
  specializedDoc?: SpecializedPrintDoc | null;
  packageModel?: PrintPackageModel | null;
  onBack: () => void;
}

/**
 * Full-screen dedicated print preview page.
 * Supports Single Shifts, Specialized Operational Documents, What Changed Delta Sheets,
 * and Multi-Document Print Packages.
 */
export const PrintPreviewPage: React.FC<PrintPreviewPageProps> = ({
  model,
  specializedDoc,
  packageModel,
  onBack,
}) => {
  let isLandscape = false;
  let docTitle = 'Print Document';
  let profileLabel = 'Document Preview';
  let subheaderText = '';

  if (packageModel) {
    docTitle = packageModel.title;
    profileLabel = `${packageModel.items.length} Bundled Documents · ~${packageModel.estimatedTotalPages} pages`;
    subheaderText = `${packageModel.formattedDate} · TaskSheet Shift Package`;
  } else if (model) {
    isLandscape = model.profile === 'clinical_worksheet';
    docTitle = model.header.shiftName;
    profileLabel = `Universal TaskSheet · ${model.summary.paperEfficiencyNote}`;
    subheaderText = `${model.header.formattedDate} · ${model.header.shiftTime} · ${model.summary.totalResidentTasks} resident tasks · ${model.summary.totalUnitTasks} unit tasks · ~${model.summary.estimatedPages} page${model.summary.estimatedPages !== 1 ? 's' : ''}`;
  } else if (specializedDoc) {
    if (specializedDoc.type === 'bathing') {
      isLandscape = true;
      docTitle = 'Bathing & Hygiene Schedule';
      profileLabel = `Letter Landscape · Operational Matrix · ~${specializedDoc.model.estimatedPages} page${specializedDoc.model.estimatedPages === 1 ? '' : 's'}`;
      subheaderText = `Week: ${specializedDoc.model.weekRange} · Facility Master Grid`;
    } else if (specializedDoc.type === 'wound') {
      isLandscape = true;
      docTitle = 'Wound & Dressing Treatment Schedule';
      profileLabel = 'Letter Landscape · Clinical Worksheet';
      subheaderText = `${specializedDoc.model.formattedDate} · ${specializedDoc.model.totalActiveWounds} active wound protocols`;
    } else if (specializedDoc.type === 'wound_weekly') {
      isLandscape = true;
      docTitle = 'Weekly Wound Care Overview';
      profileLabel = 'Letter Landscape · Weekly Clinical Operations';
      subheaderText = `${specializedDoc.model.weekRange} · ${specializedDoc.model.totalScheduledTreatments} scheduled treatments`;
    } else if (specializedDoc.type === 'wound_supplies') {
      isLandscape = true;
      docTitle = 'Wound Supply Re-Order Worksheet';
      profileLabel = 'Letter Landscape · Supply Planning';
      subheaderText = specializedDoc.model.scopeLabel;
    } else if (specializedDoc.type === 'resident_care') {
      isLandscape = false;
      docTitle = `Care Summary — ${specializedDoc.model.resident.firstName} ${specializedDoc.model.resident.lastName}`;
      profileLabel = `Room ${specializedDoc.model.resident.roomNumber} · Resident Care Plan`;
      subheaderText = `As of ${specializedDoc.model.formattedDate} · ${specializedDoc.model.resident.status.toUpperCase()}`;
    } else if (specializedDoc.type === 'upcoming') {
      isLandscape = true;
      docTitle = 'Upcoming 7-Day Care Lookahead';
      profileLabel = 'Letter Landscape · Planning Tool';
      subheaderText = `7-Day Projection starting ${specializedDoc.currentDateStr}`;
    } else if (specializedDoc.type === 'shift_config') {
      isLandscape = false;
      docTitle = 'Master Shift Configuration';
      profileLabel = 'Letter Portrait · Operational Audit Reference';
      subheaderText = `Facility Shift Profiles as of ${specializedDoc.model.formattedDate}`;
    } else if (specializedDoc.type === 'what_changed') {
      isLandscape = false;
      docTitle = `What Changed? — ${specializedDoc.model.shiftCode || specializedDoc.model.shiftName}`;
      profileLabel = `Letter Portrait · Rev ${specializedDoc.model.newRevision} Delta Sheet`;
      subheaderText = `${specializedDoc.model.formattedDate} · ${specializedDoc.model.totalChanges} itemized changes`;
    } else if (specializedDoc.type === 'calibration') {
      isLandscape = false;
      docTitle = 'Printer Hardware Calibration Page';
      profileLabel = 'Letter Portrait · Hardware Alignment & Scale Test';
      subheaderText = 'Hardware Margins (10mm) · 100mm Scale Ruler · Grayscale Toner Density';
    } else if (specializedDoc.type === 'blank_template') {
      isLandscape = true;
      docTitle = 'Blank TaskSheet Template';
      profileLabel = 'Letter Landscape · Facility Header + Writing Areas Only';
      subheaderText = `${specializedDoc.model.header.formattedDate} · No resident data included`;
    } else if (specializedDoc.type === 'huddle') {
      isLandscape = false;
      docTitle = 'Shift Huddle / Endorsement Sheet';
      profileLabel = 'Letter Portrait · Briefing Sheet';
      subheaderText = `${specializedDoc.model.formattedDate}${specializedDoc.model.shiftCode ? ` · ${specializedDoc.model.shiftCode} — ${specializedDoc.model.shiftName}` : ''}`;
    } else if (specializedDoc.type === 'custom_report') {
      isLandscape = specializedDoc.model.definition.layout === 'landscape' || (specializedDoc.model.definition.layout === 'auto' && specializedDoc.model.columns.length > 6);
      docTitle = specializedDoc.model.title;
      profileLabel = `${specializedDoc.model.sourceLabel} · ${specializedDoc.model.rows.length} records · ~${specializedDoc.model.estimatedPages} pages`;
      subheaderText = `${specializedDoc.model.coverage} · ${specializedDoc.model.filterSummary}`;
    }
  }

  // Paper dimensions for single document preview
  const paperW = isLandscape ? 1056 : 816;
  const paperH = isLandscape ? 816 : 1056;
  const paperPadding = isLandscape ? '11mm' : '12mm';
  const generationExceptions = packageModel?.exceptions || model?.exceptions || [];
  const bathingCapacityExceptions = specializedDoc?.type === 'bathing'
    ? specializedDoc.model.shiftLines.flatMap(line => specializedDoc.model.days
        .map(day => ({ line, day, slot: line.days[day.dayNumber] }))
        .filter(item => item.slot.overCapacity))
    : [];
  const contentWarnings = packageModel?.contentWarnings || [];
  // Advisory only — per spec, an empty Huddle Sheet section never blocks
  // printing; these surface as a heads-up, same as every other preflight
  // warning on this page.
  const huddleWarnings = specializedDoc?.type === 'huddle'
    ? [
        !specializedDoc.model.shiftCode ? 'No current shift is in effect for this date/time — the sheet will print without a shift line in the header.' : null,
        !specializedDoc.model.hasAnyContent ? 'All Huddle sections are currently empty — only Census will have real content.' : null,
      ].filter((warning): warning is string => Boolean(warning))
    : [];
  const hasPreviewWarnings = generationExceptions.length > 0 || bathingCapacityExceptions.length > 0 || contentWarnings.length > 0 || huddleWarnings.length > 0;

  // Records exactly once per opened preview — mirrors the existing "record
  // when the print preview opens, not when a physical print completes"
  // pattern already used for the per-shift Universal TaskSheet, so Huddle
  // Sheet prints show up in the same Audit History alongside everything else.
  const auditedHuddlePreview = useRef(false);
  useEffect(() => {
    if (specializedDoc?.type === 'huddle' && !auditedHuddlePreview.current) {
      auditedHuddlePreview.current = true;
      db.recordAuditEvent({
        action: 'print_preview_opened',
        entityType: 'print',
        summary: `Huddle Sheet print preview opened${specializedDoc.model.shiftCode ? ` (${specializedDoc.model.shiftCode})` : ''}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePrint = () => window.print();

  const renderDocumentContent = () => {
    if (packageModel) {
      return <PrintPackageView packageModel={packageModel} />;
    }
    if (model) {
      return <PrintDocumentView document={model} />;
    }
    if (specializedDoc) {
      switch (specializedDoc.type) {
        case 'bathing':
          return <BathingScheduleDocument model={specializedDoc.model} />;
        case 'wound':
          return <WoundScheduleDocument model={specializedDoc.model} />;
        case 'wound_weekly':
          return <WoundWeeklyOverviewDocument model={specializedDoc.model} />;
        case 'wound_supplies':
          return <WoundSupplyReorderDocument model={specializedDoc.model} />;
        case 'resident_care':
          return <ResidentCareSummaryDocument model={specializedDoc.model} />;
        case 'upcoming':
          return <UpcomingScheduleDocument currentDateStr={specializedDoc.currentDateStr} />;
        case 'shift_config':
          return <ShiftConfigReferenceDocument model={specializedDoc.model} />;
        case 'what_changed':
          return <WhatChangedDocument model={specializedDoc.model} />;
        case 'calibration':
          return <PrinterCalibrationDocument />;
        case 'blank_template':
          return <PrintDocumentView document={specializedDoc.model} />;
        case 'custom_report':
          return <CustomReportDocument model={specializedDoc.model} />;
        case 'huddle':
          return <HuddleSheetDocument model={specializedDoc.model} />;
      }
    }
    return <div className="p-8 text-center text-faint">No document selected.</div>;
  };

  return (
    <>
      {/* ── SCREEN TOOLBAR (no-print) ── */}
      <div className="no-print fixed top-0 left-0 right-0 z-50 bg-ink text-white flex items-center justify-between px-5 py-3 shadow-elevated">
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1.5 text-white/70 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div className="h-4 w-px bg-white/20" />
          <div>
            <span className="text-white font-black text-sm">{docTitle}</span>
            <span className="text-white/50 text-xs ml-2">{profileLabel}</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-xs text-white/50 font-medium">
            {packageModel ? 'Package Print Stream' : isLandscape ? 'Letter Landscape' : 'Letter Portrait'}
          </div>
          <button type="button" onClick={handlePrint} className="btn btn-accent">
            <Printer className="w-3.5 h-3.5" />
            <span>{packageModel ? 'Print Complete Package' : 'Print'}</span>
          </button>
        </div>
      </div>

      {/* ── SCREEN PREVIEW AREA (no-print) ── */}
      {hasPreviewWarnings && (
        <div className="no-print fixed left-0 right-0 top-[56px] z-40 border-b border-warning bg-warning-soft px-5 py-3 shadow-elevated">
          <div className="mx-auto flex max-w-6xl items-start space-x-2.5 text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              {generationExceptions.length > 0 && <><p className="text-xs font-black">Exceptions / Needs Review — {generationExceptions.length} timed task{generationExceptions.length === 1 ? '' : 's'} withheld</p><p className="mt-0.5 text-[11px]">{generationExceptions.map(exception => `${exception.roomNumber ? `Room ${exception.roomNumber}` : 'Unit task'} — ${exception.title} — ${exception.time} — ${exception.shiftCode} (${exception.shiftStart}–${exception.shiftEnd})`).join(' · ')}</p></>}
              {bathingCapacityExceptions.length > 0 && <><p className="text-xs font-black">Bathing Capacity / Needs Review — {bathingCapacityExceptions.length} over-capacity cell{bathingCapacityExceptions.length === 1 ? '' : 's'}</p><p className="mt-0.5 text-[11px]">{bathingCapacityExceptions.map(({ line, day, slot }) => `${line.shiftCode} ${day.label}: ${slot.scheduled} of ${slot.capacity}`).join(' · ')}</p></>}
              {contentWarnings.length > 0 && <><p className="text-xs font-black">Empty Sections — {contentWarnings.length} bundled document{contentWarnings.length === 1 ? '' : 's'} will print with no content</p><p className="mt-0.5 text-[11px]">{contentWarnings.join(' · ')}</p></>}
              {huddleWarnings.length > 0 && <><p className="text-xs font-black">Huddle Sheet — heads up</p><p className="mt-0.5 text-[11px]">{huddleWarnings.join(' · ')}</p></>}
            </div>
          </div>
        </div>
      )}

      <div
        className="no-print"
        style={{
          paddingTop: hasPreviewWarnings ? '124px' : '56px',
          minHeight: '100vh',
          background: 'var(--color-ink)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingBottom: '60px',
          overflowX: 'auto',
        }}
      >
        {/* Subheader info */}
        <div style={{
          width: '100%', maxWidth: `${(packageModel ? 1056 : paperW) + 40}px`,
          display: 'flex', justifyContent: 'space-between',
          padding: '12px 8px 10px', fontSize: '11px', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-body)',
        }}>
          <span>{subheaderText}</span>
          <span>TaskSheet Print Engine V2</span>
        </div>

        {/* Paper preview card(s) */}
        {packageModel ? (
          <div className="tasksheet-print-document" style={{ width: '100%', maxWidth: '1080px', padding: '0 12px' }}>
            <PrintPackageView packageModel={packageModel} />
          </div>
        ) : (
          <div className="tasksheet-print-document" style={{
            width: `${paperW}px`,
            minHeight: `${paperH}px`,
            background: 'white',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            padding: paperPadding,
            boxSizing: 'border-box',
            flexShrink: 0,
          }}>
            {renderDocumentContent()}
          </div>
        )}
      </div>

      {/* ── PRINT-ONLY ZONE ── */}
      <div
        className={`print-only tasksheet-print-document ${isLandscape ? 'print-landscape' : 'print-portrait'}`}
        style={{ padding: 0 }}
      >
        {renderDocumentContent()}
      </div>
    </>
  );
};
