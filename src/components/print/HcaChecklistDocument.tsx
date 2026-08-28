import React from 'react';
import { PrintDocumentModel, PrintResidentGroup, PrintTask, PrintWoundGroup, PrintUnitTask, PrintImportantInfo, formatShiftHeader } from '../../services/print';
import { PrintAttentionIcons, PrintAttentionLegend } from './PrintAttentionIcons';
import { ResidentStatusExceptions } from './ResidentStatusExceptions';
import { PRINT_TYPOGRAPHY_STANDARD } from '../../constants/printTypography';
import { printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

interface Props {
  model: PrintDocumentModel;
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{
    fontFamily: 'Arial, sans-serif',
    fontSize: '10pt',
    fontWeight: 900,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: '#0f172a',
    borderTop: '2pt solid #0f172a',
    borderBottom: '1pt solid #0f172a',
    padding: '3pt 0',
    marginTop: '14pt',
    marginBottom: '6pt',
  }}>
    {children}
  </div>
);

const dividerLine: React.CSSProperties = {
  borderBottom: '0.5pt solid #cbd5e1',
  marginBottom: '5pt',
};

const CheckBox: React.FC = () => (
  <span style={{
    display: 'inline-block',
    width: '10pt',
    height: '10pt',
    border: '1.5pt solid #334155',
    borderRadius: '1pt',
    marginRight: '5pt',
    verticalAlign: 'middle',
    flexShrink: 0,
  }} />
);

// ─── Unit task row (Start / During / End) ────────────────────────────────────

const UnitTaskRow: React.FC<{ task: PrintUnitTask }> = ({ task }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '4pt', breakInside: 'avoid' }}>
    <CheckBox />
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', fontWeight: 700, width: '34pt', flexShrink: 0, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
      {task.time}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', fontWeight: 700, color: '#0f172a' }}>
        {task.title}
      </div>
      {/* Writable fields (checkbox-style for HCA — just show them inline) */}
      {task.writableFields.map((f, i) => (
        <div key={i} style={{ fontFamily: 'Arial, sans-serif', fontSize: '9.5pt', color: '#374151', marginTop: '2pt' }}>
          {f.label}
        </div>
      ))}
      {task.instruction && (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#475569', marginTop: '1pt' }}>
          {task.instruction}
        </div>
      )}
    </div>
  </div>
);

// ─── Resident task row ────────────────────────────────────────────────────────

const ResidentTaskRow: React.FC<{ task: PrintTask }> = ({ task }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '5pt', breakInside: 'avoid' }}>
    <CheckBox />
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9.5pt', fontWeight: 700, width: '30pt', flexShrink: 0, color: '#1e293b', fontVariantNumeric: 'tabular-nums' }}>
      {task.time}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4pt' }}>
        <span>{task.title}</span>
        {task.attentionTags && task.attentionTags.length > 0 && (
          <PrintAttentionIcons codes={task.attentionTags} />
        )}
      </div>
      {task.instruction && (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#374151', marginTop: '1.5pt' }}>
          {task.instruction}
        </div>
      )}
      {task.timingNote && (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#64748b', marginTop: '1pt', fontStyle: 'italic' }}>
          {task.timingNote}
        </div>
      )}
      {task.contextualWarning && (
        <div style={{
          fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#92400e',
          marginTop: '2pt', fontWeight: 600,
          borderLeft: '2pt solid #f59e0b', paddingLeft: '4pt',
        }}>
          ⚠ {task.contextualWarning}
        </div>
      )}
      {task.writableFields.map((field, index) => (
        <div key={index} style={{ fontFamily: 'Arial, sans-serif', fontSize: '8.5pt', color: '#1e293b', marginTop: '2pt', fontWeight: 600, whiteSpace: 'pre-line' }}>
          {field.label}
          {field.lines > 0 && <div style={{ borderBottom: '0.5pt solid #94a3b8', height: '9pt', marginTop: '1pt' }} />}
        </div>
      ))}
    </div>
  </div>
);

// ─── Wound row (HCA: simplified single-line) ──────────────────────────────────

const WoundRow: React.FC<{ wound: PrintWoundGroup }> = ({ wound }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '5pt', breakInside: 'avoid' }}>
    <CheckBox />
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9.5pt', fontWeight: 700, width: '30pt', flexShrink: 0, color: '#1e293b' }}>
      {wound.time}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10pt', fontWeight: 700, color: '#0f172a' }}>
        Wound Care — {wound.site}
      </div>
      {wound.actions[0]?.instruction && (
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#374151', marginTop: '1.5pt' }}>
          {wound.actions[0].instruction}
        </div>
      )}
    </div>
  </div>
);

// ─── Resident group block ─────────────────────────────────────────────────────

const ResidentBlock: React.FC<{ group: PrintResidentGroup }> = ({ group }) => {
  const hasContent = group.tasks.length > 0 || group.woundGroups.length > 0;
  if (!hasContent) return null;

  // Gather all timed items and sort chronologically
  const allTimedItems: Array<{ time: string; el: React.ReactElement; key: string }> = [];

  group.tasks.forEach(t => {
    allTimedItems.push({ time: t.time || '9999', el: <ResidentTaskRow key={t.id} task={t} />, key: t.id });
  });
  group.woundGroups.forEach(w => {
    allTimedItems.push({ time: w.time || '9999', el: <WoundRow key={w.woundId} wound={w} />, key: w.woundId });
  });
  allTimedItems.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div style={{ marginBottom: '10pt', breakInside: 'avoid' }}>
      {/* Room header */}
      <div style={{
        fontFamily: 'Arial, sans-serif',
        fontSize: '10pt',
        fontWeight: 900,
        color: '#0f172a',
        letterSpacing: '0.04em',
        borderBottom: '1pt solid #94a3b8',
        paddingBottom: '2pt',
        marginBottom: '5pt',
      }}>
        ROOM {group.roomNumber} — {group.residentName}
      </div>

      {/* Important info inline (high/urgent only) */}
      {group.importantInfoItems.filter(i => i.priority !== 'normal').map((info, idx) => (
        <div key={idx} style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '8.5pt',
          marginBottom: '4pt',
          paddingLeft: '6pt',
          borderLeft: '2.5pt solid ' + (info.priority === 'urgent' ? '#dc2626' : '#f59e0b'),
          breakInside: 'avoid',
        }}>
          <span style={{ fontWeight: 700, color: info.priority === 'urgent' ? '#991b1b' : '#92400e' }}>
            {info.categoryLabel}:
          </span>
          <span style={{ color: '#374151', marginLeft: '3pt' }}>{info.text}</span>
        </div>
      ))}

      {/* Tasks */}
      {allTimedItems.map(item => item.el)}
    </div>
  );
};

// ─── Important info section ───────────────────────────────────────────────────

const ImportantInfoSection: React.FC<{
  sharedFYIs: PrintImportantInfo[];
  residentGroups: PrintResidentGroup[];
}> = ({ sharedFYIs, residentGroups }) => {
  const hasShared = sharedFYIs.length > 0;
  // Resident FYIs with normal importance too — all go in this section
  const resWithFyis = residentGroups.filter(g => g.importantInfoItems.length > 0);
  if (!hasShared && resWithFyis.length === 0) return null;

  return (
    <>
      <SectionHeader>Important Information</SectionHeader>
      {hasShared && (
        <div style={{ marginBottom: '6pt', breakInside: 'avoid' }}>
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', fontWeight: 700, color: '#1e293b', marginBottom: '2pt' }}>
            UNIT / ALL STAFF
          </div>
          {sharedFYIs.map((f, i) => (
            <div key={i} style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', color: '#374151', paddingLeft: '8pt', marginBottom: '2pt' }}>
              <span style={{ fontWeight: 700, color: '#1e293b' }}>{f.categoryLabel}: </span>{f.text}
            </div>
          ))}
        </div>
      )}
      {resWithFyis.map(g => (
        <div key={g.residentId} style={{ marginBottom: '6pt', breakInside: 'avoid' }}>
          <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', fontWeight: 700, color: '#1e293b', marginBottom: '2pt' }}>
            ROOM {g.roomNumber} — {g.residentName}
          </div>
          {g.importantInfoItems.map((info, idx) => (
            <div key={idx} style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', paddingLeft: '8pt', marginBottom: '2pt' }}>
              <span style={{ fontWeight: 700, color: info.priority === 'urgent' ? '#991b1b' : info.priority === 'high' ? '#92400e' : '#1e293b' }}>
                {info.priority === 'urgent' ? '!! ' : info.priority === 'high' ? '! ' : ''}{info.categoryLabel}:
              </span>
              <span style={{ color: '#374151', marginLeft: '3pt' }}>{info.text}</span>
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

// ─── Handoff lines ────────────────────────────────────────────────────────────

const HandoffLines: React.FC<{ count: number }> = ({ count }) => (
  <>
    <SectionHeader>Handoff / Notes</SectionHeader>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} style={{ borderBottom: '1pt solid #94a3b8', height: '18pt', marginBottom: '2pt' }} />
    ))}
  </>
);

// ─── Main document ────────────────────────────────────────────────────────────

export const HcaChecklistDocument: React.FC<Props> = ({ model }) => {
  const { header, startUnitTasks, duringUnitTasks, endUnitTasks, importantSharedFYIs, residentGroups, handoffNotesLinesCount, developerFooter } = model;
  const f = header.facility;

  return (
    <div className="tasksheet-print-document" style={{ ...printPageStyle(`hca-${model.header.shiftCode || model.header.shiftName}`), fontFamily: PRINT_TYPOGRAPHY_STANDARD.fontFamily, color: '#0f172a', background: 'white', fontSize: PRINT_TYPOGRAPHY_STANDARD.bodySize, lineHeight: PRINT_TYPOGRAPHY_STANDARD.lineHeight }}>
      <RepeatingPrintFooter pageName={`hca-${model.header.shiftCode || model.header.shiftName}`} orientation="portrait" coverage={`${model.header.shiftCode || model.header.shiftName} · ${model.header.formattedDate} · ${model.header.shiftTime}`} generatedAt={model.generatedAt} />

      {/* ── HEADER ── */}
      <div style={{ borderBottom: '2pt solid #0f172a', paddingBottom: '6pt', marginBottom: '8pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="tasksheet-print-title" style={{ fontSize: 'var(--print-title-size)', fontWeight: 700, letterSpacing: '-0.02em', color: '#0f172a', lineHeight: 1 }}>
              {header.documentTitle}
            </div>
            <div style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '0.12em', color: '#475569', marginTop: '2pt', textTransform: 'uppercase' }}>
              {header.documentSubtitle}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '8pt', color: '#64748b' }}>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>{f.siteName}</div>
            <div>{f.street}{f.addressLine2 ? `, ${f.addressLine2}` : ''}</div>
            <div>{f.city}, {f.province} {f.postalCode}</div>
            <div>Main: {f.mainPhone}   Unit: {f.unitPhone}   Fax: {f.fax}</div>
            {f.additionalExtensions && f.additionalExtensions.filter(e => e.enabled !== false).length > 0 && (
              <div style={{ marginTop: '2pt', fontSize: '7.5pt', color: '#475569' }}>
                <span style={{ fontWeight: 700 }}>Quick Contacts: </span>
                {f.additionalExtensions.filter(e => e.enabled !== false).map((ext, idx, arr) => (
                  <span key={ext.id}>
                    {ext.label}: <strong>{ext.number}</strong>{idx < arr.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '8pt', padding: '4pt 6pt', background: '#f1f5f9', borderRadius: '3pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontWeight: 900, fontSize: '11pt', color: '#0f172a' }}>
              {formatShiftHeader(header, header.shiftHeaderFormat || 'short_code_only')}
            </span>
          </div>
          <div style={{ fontSize: '9pt', fontWeight: 600, color: '#374151' }}>{header.formattedDate}</div>
        </div>
      </div>

      {/* ── START OF SHIFT ── */}
      {startUnitTasks.length > 0 && (
        <>
          <SectionHeader>Start of Shift</SectionHeader>
          {startUnitTasks.map(t => <UnitTaskRow key={t.id} task={t} />)}
        </>
      )}

      {/* ── IMPORTANT INFORMATION ── */}
      <ImportantInfoSection sharedFYIs={importantSharedFYIs} residentGroups={residentGroups} />
      <ResidentStatusExceptions items={model.residentStatusExceptions} />

      {/* ── RESIDENT CARE ── */}
      <SectionHeader>Resident Care</SectionHeader>
      {residentGroups.map(g => <ResidentBlock key={g.residentId} group={g} />)}

      {/* ── DURING SHIFT ── */}
      {duringUnitTasks.length > 0 && (
        <>
          <SectionHeader>During Shift</SectionHeader>
          {duringUnitTasks.map(t => <UnitTaskRow key={t.id} task={t} />)}
        </>
      )}

      {/* ── PRN / IF REQUIRED CARE ORDERS ── */}
      {model.prnResidentGroups && model.prnResidentGroups.length > 0 && (
        <>
          <SectionHeader>PRN / If Required Care Orders</SectionHeader>
          {model.prnResidentGroups.map(g => (
            <div key={g.residentId} style={{ marginBottom: '6pt', breakInside: 'avoid' }}>
              <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '9pt', fontWeight: 800, color: '#334155', marginBottom: '2pt' }}>
                ROOM {g.roomNumber} — {g.residentName}
              </div>
              {g.tasks.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '3pt', paddingLeft: '6pt' }}>
                  <CheckBox />
                  <div style={{ flex: 1, fontSize: '9.5pt' }}>
                    <span style={{ fontWeight: 700 }}>{t.title}</span>
                    {t.instruction && <span style={{ color: '#475569', marginLeft: '4pt' }}>— {t.instruction}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      {/* ── HANDOFF NOTES ── */}
      <HandoffLines count={handoffNotesLinesCount} />

      {/* ── DYNAMIC ATTENTION LEGEND ── */}
      {model.attentionLegend && model.attentionLegend.length > 0 && (
        <div style={{ marginTop: '10pt', padding: '3pt 6pt', background: '#f8fafc', border: '0.5pt solid #cbd5e1', borderRadius: '3pt', fontSize: '7pt', color: '#475569', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8pt' }}>
          <span style={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Attention Symbols:
          </span>
          <PrintAttentionLegend items={model.attentionLegend} />
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ marginTop: '16pt', paddingTop: '4pt', borderTop: '0.5pt solid #94a3b8', fontSize: '7.5pt', color: '#94a3b8' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>TaskSheet &#xB7; Daily Assignment &#xB7; {header.shiftCode || header.shiftName}</span>
          <span>{header.formattedDate}</span>
          {developerFooter && <span>{developerFooter}</span>}
        </div>
        {model.confidentialityNotice && (
          <div style={{ textAlign: 'center', marginTop: '3pt', fontSize: 'var(--print-footer-size)', color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', fontStyle: 'italic' }}>
            {model.confidentialityNotice}
          </div>
        )}
      </div>
    </div>
  );
};
