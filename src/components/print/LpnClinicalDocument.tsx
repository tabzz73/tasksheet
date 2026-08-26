import React from 'react';
import { PrintDocumentModel, PrintResidentGroup, PrintTask, PrintWoundGroup, PrintUnitTask, PrintImportantInfo, PrintWoundAction, formatShiftHeader } from '../../services/print';
import { QuickVitalsColumnConfig, PrintDensity } from '../../types';

interface Props {
  model: PrintDocumentModel;
}

// ─── Typography constants (inline for print safety) ───────────────────────────

const FONT = 'Arial, sans-serif';
const COLOR_BLACK = '#0f172a';
const COLOR_DARK = '#1e293b';
const COLOR_MID = '#374151';
const COLOR_LIGHT = '#475569';
const COLOR_FAINT = '#94a3b8';
const COLOR_URGENT_BG = '#fef2f2';
const COLOR_URGENT_BORDER = '#dc2626';
const COLOR_HIGH_BORDER = '#f59e0b';
const COLOR_SECTION_BG = '#f8fafc';

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ children: React.ReactNode; sub?: boolean }> = ({ children, sub }) => (
  <div style={{
    fontFamily: FONT, fontSize: sub ? '9pt' : '9.5pt', fontWeight: 900,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: COLOR_BLACK,
    background: sub ? '#e2e8f0' : '#cbd5e1',
    padding: '3pt 6pt', marginTop: sub ? '8pt' : '14pt', marginBottom: '5pt',
  }}>
    {children}
  </div>
);

// ─── Checkbox ─────────────────────────────────────────────────────────────────

const CheckBox: React.FC = () => (
  <span style={{
    display: 'inline-block', width: '11pt', height: '11pt',
    border: '1.5pt solid #334155', borderRadius: '1pt',
    marginRight: '6pt', flexShrink: 0, verticalAlign: 'middle',
  }} />
);

// ─── Writable line ────────────────────────────────────────────────────────────

const WritableLine: React.FC<{ label: string; lines?: number }> = ({ label, lines = 1 }) => (
  <div style={{ marginTop: '6pt' }}>
    <span style={{ fontFamily: FONT, fontSize: '8.5pt', color: COLOR_LIGHT, fontWeight: 600 }}>{label}</span>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} style={{ borderBottom: '1pt solid #94a3b8', minHeight: '16pt', marginTop: '2pt', marginBottom: '2pt' }} />
    ))}
  </div>
);

// ─── Unit task block ──────────────────────────────────────────────────────────

const UnitTaskBlock: React.FC<{ task: PrintUnitTask }> = ({ task }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '7pt', breakInside: 'avoid' }}>
    <CheckBox />
    <div style={{ width: '36pt', flexShrink: 0, fontFamily: FONT, fontSize: '9.5pt', fontWeight: 700, color: COLOR_DARK, fontVariantNumeric: 'tabular-nums' }}>
      {task.time}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 700, color: COLOR_BLACK }}>{task.title}</div>
      {task.instruction && (
        <div style={{ fontFamily: FONT, fontSize: '9pt', color: COLOR_MID, marginTop: '1.5pt' }}>{task.instruction}</div>
      )}
      {task.writableFields.map((f, i) => (
        f.lines === 0
          ? <div key={i} style={{ fontFamily: FONT, fontSize: '9.5pt', color: COLOR_DARK, fontWeight: 600, marginTop: '4pt' }}>{f.label}</div>
          : <WritableLine key={i} label={f.label} lines={f.lines} />
      ))}
    </div>
  </div>
);

// ─── Resident task block (clinical wide format) ───────────────────────────────

const ResidentTaskBlock: React.FC<{ task: PrintTask }> = ({ task }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8pt', breakInside: 'avoid' }}>
    <CheckBox />
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT, fontSize: '10.5pt', fontWeight: 700, color: COLOR_BLACK, textTransform: 'uppercase', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4pt' }}>
        <span>{task.title}</span>
        {task.attentionTags && task.attentionTags.length > 0 && (
          <span style={{ fontFamily: 'monospace', fontSize: '8pt', fontWeight: 800, color: '#991b1b', letterSpacing: '0.04em' }}>
            {task.attentionTags.join(' ')}
          </span>
        )}
      </div>
      {task.instruction && (
        <div style={{ fontFamily: FONT, fontSize: '9.5pt', color: COLOR_MID, marginTop: '3pt', lineHeight: 1.45 }}>
          {task.instruction}
        </div>
      )}
      {task.timingNote && (
        <div style={{ fontFamily: FONT, fontSize: '8.5pt', color: COLOR_LIGHT, fontStyle: 'italic', marginTop: '2pt' }}>{task.timingNote}</div>
      )}
      {task.contextualWarning && (
        <div style={{ fontFamily: FONT, fontSize: '9pt', color: '#92400e', fontWeight: 600, marginTop: '3pt', borderLeft: '2.5pt solid #f59e0b', paddingLeft: '5pt' }}>
          ⚠ {task.contextualWarning}
        </div>
      )}
      {task.writableFields.map((f, i) => (
        f.lines === 0
          ? <div key={i} style={{ fontFamily: FONT, fontSize: '9.5pt', color: COLOR_DARK, fontWeight: 600, marginTop: '6pt' }}>{f.label}</div>
          : <WritableLine key={i} label={f.label} lines={f.lines} />
      ))}
    </div>
  </div>
);

// ─── Wound action block ───────────────────────────────────────────────────────

const WoundActionBlock: React.FC<{ action: PrintWoundAction }> = ({ action }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8pt', breakInside: 'avoid' }}>
    <CheckBox />
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 700, color: COLOR_BLACK }}>{action.actionLabel}</div>
      {action.instruction && (
        <div style={{ fontFamily: FONT, fontSize: '9.5pt', color: COLOR_MID, marginTop: '3pt', lineHeight: 1.45 }}>
          {action.instruction}
        </div>
      )}
      {action.writableFields.map((f, i) => (
        f.lines === 0
          ? <div key={i} style={{ fontFamily: FONT, fontSize: '9.5pt', color: COLOR_DARK, fontWeight: 600, marginTop: '6pt' }}>{f.label}</div>
          : <WritableLine key={i} label={f.label} lines={f.lines} />
      ))}
    </div>
  </div>
);

// ─── Wound group block ────────────────────────────────────────────────────────

const WoundGroupBlock: React.FC<{ wound: PrintWoundGroup }> = ({ wound }) => (
  <div style={{ marginBottom: '10pt', breakInside: 'avoid' }}>
    <div style={{
      fontFamily: FONT, fontSize: '9pt', fontWeight: 700, letterSpacing: '0.06em',
      color: '#1e3a5f', background: '#dbeafe', padding: '3pt 6pt', marginBottom: '6pt',
      textTransform: 'uppercase',
    }}>
      WOUND — {wound.siteHeader}
    </div>
    {wound.actions.map((action, i) => (
      <WoundActionBlock key={i} action={action} />
    ))}
  </div>
);

// ─── Resident care block ──────────────────────────────────────────────────────

const ResidentCareBlock: React.FC<{ group: PrintResidentGroup }> = ({ group }) => {
  const hasContent = group.tasks.length > 0 || group.woundGroups.length > 0;
  if (!hasContent) return null;

  // Collect task times for the timestamp bar
  const firstTime = group.tasks[0]?.time ?? group.woundGroups[0]?.time ?? '';

  return (
    <div style={{ marginBottom: '12pt', breakInside: 'avoid', border: '0.5pt solid #e2e8f0', borderRadius: '3pt', padding: '6pt 8pt' }}>
      {/* Resident header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6pt', borderBottom: '1.5pt solid #334155', paddingBottom: '3pt' }}>
        <div>
          <span style={{ fontFamily: FONT, fontSize: '11pt', fontWeight: 900, color: COLOR_BLACK, fontVariantNumeric: 'tabular-nums' }}>
            ROOM {group.roomNumber}
          </span>
          <span style={{ fontFamily: FONT, fontSize: '10pt', fontWeight: 600, color: COLOR_DARK, marginLeft: '8pt' }}>
            {group.residentName}
          </span>
        </div>
        {firstTime && (
          <span style={{ fontFamily: FONT, fontSize: '9pt', color: COLOR_LIGHT, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
            {firstTime}
          </span>
        )}
      </div>

      {/* Tasks sorted chronologically */}
      {[...group.tasks]
        .sort((a, b) => (a.time || '9999').localeCompare(b.time || '9999'))
        .map(t => <ResidentTaskBlock key={t.id} task={t} />)
      }

      {/* Wound groups */}
      {group.woundGroups.map(w => <WoundGroupBlock key={w.woundId} wound={w} />)}
    </div>
  );
};

// ─── Important info section ───────────────────────────────────────────────────

const ImportantInfoSection: React.FC<{
  sharedFYIs: PrintImportantInfo[];
  residentGroups: PrintResidentGroup[];
}> = ({ sharedFYIs, residentGroups }) => {
  const hasShared = sharedFYIs.length > 0;
  const resWithFyis = residentGroups.filter(g => g.importantInfoItems.length > 0);
  if (!hasShared && resWithFyis.length === 0) return null;

  return (
    <>
      <SectionHeader>Important Resident Information</SectionHeader>
      {hasShared && (
        <div style={{ marginBottom: '8pt', breakInside: 'avoid' }}>
          <div style={{ fontFamily: FONT, fontSize: '9pt', fontWeight: 700, color: COLOR_DARK, marginBottom: '3pt' }}>UNIT / ALL STAFF</div>
          {sharedFYIs.map((f, i) => (
            <div key={i} style={{ fontFamily: FONT, fontSize: '9.5pt', color: COLOR_MID, paddingLeft: '8pt', marginBottom: '2pt' }}>
              <span style={{ fontWeight: 700 }}>{f.categoryLabel}: </span>{f.text}
            </div>
          ))}
        </div>
      )}
      {resWithFyis.map(g => (
        <div key={g.residentId} style={{ marginBottom: '10pt', breakInside: 'avoid', paddingLeft: '4pt', borderLeft: '2pt solid #94a3b8' }}>
          <div style={{ fontFamily: FONT, fontSize: '9.5pt', fontWeight: 800, color: COLOR_DARK, marginBottom: '3pt' }}>
            ROOM {g.roomNumber} — {g.residentName}
          </div>
          {g.importantInfoItems.map((info, idx) => (
            <div key={idx} style={{
              marginBottom: '4pt', breakInside: 'avoid',
              borderLeft: '3pt solid ' + (info.priority === 'urgent' ? COLOR_URGENT_BORDER : info.priority === 'high' ? COLOR_HIGH_BORDER : '#64748b'),
              paddingLeft: '6pt',
              background: info.priority === 'urgent' ? COLOR_URGENT_BG : 'transparent',
            }}>
              <div style={{ fontFamily: FONT, fontSize: '8.5pt', fontWeight: 700, color: info.priority === 'urgent' ? '#991b1b' : '#92400e', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {info.priority === 'urgent' ? '!! ' : '! '}{info.categoryLabel}
              </div>
              <div style={{ fontFamily: FONT, fontSize: '9.5pt', color: COLOR_MID, marginTop: '1pt', lineHeight: 1.4 }}>{info.text}</div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
};

// ─── Quick vitals table ───────────────────────────────────────────────────────

const QuickVitalsTable: React.FC<{
  residents: { room: string; name: string }[];
  columns?: QuickVitalsColumnConfig[];
  rowsCount?: number;
  density?: PrintDensity;
  largePrint?: boolean;
}> = ({ residents, columns, rowsCount = 8, density, largePrint }) => {
  const activeCols = columns && columns.length > 0
    ? columns
    : [
        { id: 'bp', label: 'Blood Pressure', shortLabel: 'BP', enabled: true },
        { id: 'hr', label: 'Heart Rate', shortLabel: 'HR', enabled: true },
        { id: 'temp', label: 'Temperature', shortLabel: 'Temp', enabled: true },
        { id: 'resp', label: 'Respirations', shortLabel: 'Resp', enabled: true },
        { id: 'o2', label: 'SpO2', shortLabel: 'SpO\u2082', enabled: true },
        { id: 'bg', label: 'Blood Glucose', shortLabel: 'BG', enabled: true },
        { id: 'initials', label: 'Initials', shortLabel: 'Init', enabled: true },
      ];

  const totalMinRows = Math.max(residents.length, rowsCount);
  const blankRowsNeeded = Math.max(0, totalMinRows - residents.length);

  const rowHeight = density === 'compact' ? '15pt' : density === 'spacious' ? '22pt' : '18pt';
  const fontSize = largePrint ? '9.5pt' : density === 'compact' ? '8pt' : '8.5pt';

  const thStyle: React.CSSProperties = {
    fontFamily: FONT, fontSize: largePrint ? '9pt' : '8pt', fontWeight: 700, padding: '3pt 4pt',
    border: '0.75pt solid #94a3b8', background: '#f1f5f9', textAlign: 'center',
  };
  const tdStyle: React.CSSProperties = {
    fontFamily: FONT, fontSize, padding: '3pt 4pt',
    border: '0.75pt solid #94a3b8', height: rowHeight,
  };

  return (
    <>
      <SectionHeader>Quick Vitals</SectionHeader>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: '7%' }}>Room</th>
            <th style={{ ...thStyle, width: '18%', textAlign: 'left' }}>Resident</th>
            {activeCols.map(c => (
              <th key={c.id} style={{ ...thStyle, width: c.width || `${Math.floor(60 / activeCols.length)}%` }}>
                {c.shortLabel || c.label}
              </th>
            ))}
            <th style={{ ...thStyle, width: '15%', textAlign: 'left' }}>Notes</th>
          </tr>
        </thead>
        <tbody>
          {residents.map((r, i) => (
            <tr key={i}>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{r.room}</td>
              <td style={{ ...tdStyle }}>{r.name}</td>
              {activeCols.map(c => (
                <td key={c.id} style={{ ...tdStyle, textAlign: 'center' }} />
              ))}
              <td style={{ ...tdStyle }} />
            </tr>
          ))}
          {Array.from({ length: blankRowsNeeded }).map((_, i) => (
            <tr key={'blank-' + i}>
              <td style={{ ...tdStyle }} />
              <td style={{ ...tdStyle }} />
              {activeCols.map(c => (
                <td key={c.id} style={{ ...tdStyle }} />
              ))}
              <td style={{ ...tdStyle }} />
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
};

// ─── Handoff notes ────────────────────────────────────────────────────────────

const HandoffSection: React.FC<{ lines: number }> = ({ lines }) => (
  <>
    <SectionHeader>Handoff / Notes</SectionHeader>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} style={{ borderBottom: '1pt solid #94a3b8', minHeight: '20pt', marginBottom: '2pt' }} />
    ))}
  </>
);

// ─── Main LPN document ────────────────────────────────────────────────────────

export const LpnClinicalDocument: React.FC<Props> = ({ model }) => {
  const {
    header, startUnitTasks, duringUnitTasks, endUnitTasks,
    importantSharedFYIs, residentGroups, showQuickVitalsGrid,
    quickVitalsResidents, handoffNotesLinesCount, developerFooter,
  } = model;
  const f = header.facility;

  return (
    <div style={{ fontFamily: FONT, color: COLOR_BLACK, background: 'white', fontSize: '10pt', lineHeight: 1.4 }}>

      {/* ── HEADER ── */}
      <div style={{ borderBottom: '2.5pt solid #0f172a', paddingBottom: '7pt', marginBottom: '8pt' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '18pt', fontWeight: 900, color: COLOR_BLACK, letterSpacing: '-0.02em', lineHeight: 1 }}>
              {header.documentTitle}
            </div>
            <div style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '0.14em', color: COLOR_LIGHT, marginTop: '2pt', textTransform: 'uppercase' }}>
              {header.documentSubtitle}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '8pt', color: COLOR_LIGHT, lineHeight: 1.5 }}>
            <div style={{ fontWeight: 700, color: COLOR_DARK }}>{f.siteName}</div>
            <div>{f.street}{f.addressLine2 ? `, ${f.addressLine2}` : ''}</div>
            <div>{f.city}, {f.province} {f.postalCode}</div>
            <div>Main: {f.mainPhone} &nbsp; Unit: {f.unitPhone} &nbsp; Fax: {f.fax}</div>
            {f.additionalExtensions && f.additionalExtensions.filter(e => e.enabled !== false).length > 0 && (
              <div style={{ marginTop: '2pt', fontSize: '7.5pt', color: COLOR_LIGHT }}>
                <span style={{ fontWeight: 700, color: COLOR_DARK }}>Quick Contacts: </span>
                {f.additionalExtensions.filter(e => e.enabled !== false).map((ext, idx, arr) => (
                  <span key={ext.id}>
                    {ext.label}: <strong>{ext.number}</strong>{idx < arr.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '8pt', padding: '5pt 8pt', background: '#f1f5f9', borderRadius: '3pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: '12pt', color: COLOR_BLACK }}>
              {formatShiftHeader(header, header.shiftHeaderFormat || 'short_code_only')}
            </span>
          </div>
          <div style={{ fontFamily: FONT, fontSize: '9.5pt', fontWeight: 600, color: COLOR_DARK }}>{header.formattedDate}</div>
        </div>
      </div>

      {/* ── START OF SHIFT ROUTINES ── */}
      {startUnitTasks.length > 0 && (
        <>
          <SectionHeader>Start of Shift — Unit Routines</SectionHeader>
          {startUnitTasks.map(t => <UnitTaskBlock key={t.id} task={t} />)}
        </>
      )}

      {/* ── IMPORTANT RESIDENT INFORMATION ── */}
      <ImportantInfoSection sharedFYIs={importantSharedFYIs} residentGroups={residentGroups} />

      {/* ── RESIDENT CARE ASSIGNMENTS ── */}
      <SectionHeader>Resident Care Assignments</SectionHeader>
      {residentGroups.map(g => <ResidentCareBlock key={g.residentId} group={g} />)}

      {/* ── DURING SHIFT ── */}
      {duringUnitTasks.length > 0 && (
        <>
          <SectionHeader>During Shift</SectionHeader>
          {duringUnitTasks.map(t => <UnitTaskBlock key={t.id} task={t} />)}
        </>
      )}

      {/* ── PRN / IF REQUIRED CARE ORDERS ── */}
      {model.prnResidentGroups && model.prnResidentGroups.length > 0 && (
        <>
          <SectionHeader>PRN / If Required Care Orders</SectionHeader>
          {model.prnResidentGroups.map(g => (
            <div key={g.residentId} style={{ marginBottom: '8pt', breakInside: 'avoid' }}>
              <div style={{ fontFamily: FONT, fontSize: '9.5pt', fontWeight: 800, color: COLOR_DARK, marginBottom: '3pt' }}>
                ROOM {g.roomNumber} — {g.residentName}
              </div>
              {g.tasks.map(t => <ResidentTaskBlock key={t.id} task={t} />)}
            </div>
          ))}
        </>
      )}

      {/* ── QUICK VITALS TABLE ── */}
      {showQuickVitalsGrid && (
        <QuickVitalsTable
          residents={quickVitalsResidents}
          columns={model.quickVitalsColumns}
          rowsCount={model.quickVitalsRowsCount}
          density={model.density}
          largePrint={model.largePrint}
        />
      )}

      {/* ── HANDOFF NOTES ── */}
      <HandoffSection lines={handoffNotesLinesCount} />

      {/* ── DYNAMIC ATTENTION LEGEND ── */}
      {model.attentionLegend && model.attentionLegend.length > 0 && (
        <div style={{ marginTop: '10pt', padding: '3pt 6pt', background: '#f8fafc', border: '0.5pt solid #cbd5e1', borderRadius: '3pt', fontSize: '7pt', color: '#475569', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8pt' }}>
          <span style={{ fontWeight: 800, color: COLOR_BLACK, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Attention Codes:
          </span>
          {model.attentionLegend.map(item => (
            <span key={item.code}>
              <strong style={{ color: '#991b1b', fontFamily: 'monospace' }}>{item.code}</strong> {item.label}
            </span>
          ))}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ marginTop: '16pt', paddingTop: '4pt', borderTop: '0.5pt solid #cbd5e1', fontSize: '7pt', color: COLOR_FAINT }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>TaskSheet &#xB7; Clinical Shift Worksheet &#xB7; {header.shiftCode || header.shiftName}</span>
          <span>{header.formattedDate}</span>
          {developerFooter && <span>{developerFooter}</span>}
        </div>
        {model.confidentialityNotice && (
          <div style={{ textAlign: 'center', marginTop: '3pt', fontSize: '6.5pt', color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', fontStyle: 'italic' }}>
            {model.confidentialityNotice}
          </div>
        )}
      </div>
    </div>
  );
};
