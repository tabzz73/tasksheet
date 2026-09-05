import React from 'react';
import { PRINT_TYPOGRAPHY_STANDARD } from '../../constants/printTypography';
import { formatPrintTimestamp, printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';
import { HuddleSheetModel } from '../../services/dashboard';

interface HuddleSheetDocumentProps {
  model: HuddleSheetModel;
}

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ breakInside: 'avoid', pageBreakInside: 'avoid', marginTop: '9pt', marginBottom: '4pt' }}>
    <div style={{ borderBottom: '1.25pt solid #111827', paddingBottom: '2pt' }}>
      <span style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: '#111827' }}>
        {children}
      </span>
    </div>
  </div>
);

const EmptyLine: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p style={{ fontSize: '8pt', color: '#6B7280', fontStyle: 'italic', margin: '2pt 0' }}>{children}</p>
);

/** Text label, not color alone — a light border/fill accents it but the
 *  word itself ("NEEDS REVIEW") is what actually communicates severity. */
const InlineFlag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    fontSize: '7pt', fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
    border: '1pt solid #111827', borderRadius: '2pt', padding: '0.5pt 3pt', marginLeft: '5pt',
  }}>{children}</span>
);

const RoomLine: React.FC<{ roomNumber?: string; residentName?: string }> = ({ roomNumber, residentName }) => (
  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
    {roomNumber ? `${roomNumber}` : 'Unit-wide'}{residentName ? ` — ${residentName}` : ''}
  </span>
);

/**
 * Printable Shift Huddle / Endorsement Sheet — a read-only projection of
 * live Census/Attention/Follow-up/FYI data (see `buildHuddleSheetModel`),
 * for sites where staff conduct huddle/handoff without a screen at hand.
 * A briefing to read aloud, not another checklist: no task checkboxes here.
 */
export const HuddleSheetDocument: React.FC<HuddleSheetDocumentProps> = ({ model }) => {
  const f = model.facility;

  return (
    <div className="tasksheet-print-document" style={{
      ...printPageStyle('huddle-sheet'),
      fontFamily: PRINT_TYPOGRAPHY_STANDARD.fontFamily,
      fontSize: PRINT_TYPOGRAPHY_STANDARD.bodySize, color: '#111827', background: '#ffffff', lineHeight: PRINT_TYPOGRAPHY_STANDARD.lineHeight,
    }}>
      <RepeatingPrintFooter
        pageName="huddle-sheet"
        orientation="portrait"
        facilityName={f.siteName}
        documentLabel="Shift Huddle / Endorsement Sheet"
        dateLabel={model.formattedDate}
        secondaryLabel={model.shiftCode ? `${model.shiftCode} · ${model.shiftTime}` : undefined}
        generatedAt={model.generatedAt}
      />

      {/* HEADER */}
      <div style={{ borderBottom: '2pt solid #111827', paddingBottom: '8pt', marginBottom: '8pt' }}>
        <div className="tasksheet-print-title" style={{ fontSize: 'var(--print-title-size)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
          SHIFT HUDDLE / ENDORSEMENT SHEET
        </div>
        <div style={{ fontSize: '9pt', fontWeight: 700, color: '#374151', marginTop: '2pt' }}>{f.siteName}</div>
        <div style={{ marginTop: '5pt', display: 'flex', flexWrap: 'wrap' as const, gap: '4pt 14pt', fontSize: '8.5pt', color: '#374151' }}>
          <span><strong>Date:</strong> {model.formattedDate}</span>
          {model.shiftCode && <span><strong>Shift:</strong> {model.shiftCode} — {model.shiftName} ({model.shiftTime})</span>}
          <span><strong>Generated:</strong> {formatPrintTimestamp(model.generatedAt)}</span>
        </div>
      </div>

      {!model.hasAnyContent && (
        <div style={{ padding: '10pt 0', textAlign: 'center' as const, color: '#6B7280', fontStyle: 'italic', fontSize: '8.5pt' }}>
          Nothing flagged for Huddle right now — Census and any away residents are still listed below.
        </div>
      )}

      {/* CENSUS */}
      <SectionHeading>Census</SectionHeading>
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '5pt 16pt', fontSize: '8.5pt' }}>
        <span><strong>{model.census.activeCount}</strong> present</span>
        <span><strong>{model.census.inHospitalCount}</strong> in hospital</span>
        <span><strong>{model.census.outOnPassCount}</strong> on pass</span>
        {model.census.onHoldCount > 0 && <span><strong>{model.census.onHoldCount}</strong> on hold</span>}
      </div>

      {/* AWAY FROM UNIT */}
      <SectionHeading>Away From Unit</SectionHeading>
      {model.away.length === 0 ? <EmptyLine>No residents currently away from the unit.</EmptyLine> : (
        <div>
          {model.away.map((entry, index) => (
            <p key={index} style={{ fontSize: '8.5pt', margin: '1.5pt 0' }}>
              <RoomLine roomNumber={entry.roomNumber} residentName={entry.residentName} /> — {entry.statusLabel}
            </p>
          ))}
        </div>
      )}

      {/* CURRENT UNIT SITUATION */}
      <SectionHeading>Current Unit Situation</SectionHeading>
      {model.unitSiteAttention.length === 0 ? <EmptyLine>No unit or site-wide notices right now.</EmptyLine> : (
        <div>
          {model.unitSiteAttention.map((entry, index) => (
            <p key={index} style={{ fontSize: '8.5pt', margin: '1.5pt 0' }}>
              {entry.title}{entry.details ? ` — ${entry.details}` : ''}
              {(entry.priority === 'urgent' || entry.priority === 'high') && <InlineFlag>{entry.priority}</InlineFlag>}
            </p>
          ))}
        </div>
      )}

      {/* RESIDENT ATTENTION */}
      <SectionHeading>Resident Attention</SectionHeading>
      {model.residentAttention.length === 0 ? <EmptyLine>No resident-specific attention items right now.</EmptyLine> : (
        <div>
          {model.residentAttention.map((entry, index) => (
            <p key={index} style={{ fontSize: '8.5pt', margin: '1.5pt 0' }}>
              <RoomLine roomNumber={entry.roomNumber} residentName={entry.residentName} /> — {entry.title}{entry.details ? ` — ${entry.details}` : ''}
              {(entry.priority === 'urgent' || entry.priority === 'high') && <InlineFlag>{entry.priority}</InlineFlag>}
            </p>
          ))}
        </div>
      )}

      {/* MUST-NOT-MISS FOLLOW-UP */}
      <SectionHeading>Must-Not-Miss Follow-up</SectionHeading>
      {model.mustNotMiss.length === 0 ? <EmptyLine>Nothing outstanding right now.</EmptyLine> : (
        <div>
          {model.mustNotMiss.map((entry, index) => (
            <p key={index} style={{ fontSize: '8.5pt', margin: '1.5pt 0' }}>
              <RoomLine roomNumber={entry.roomNumber} residentName={entry.residentName} /> — {entry.title} — {entry.statusLabel}
              {entry.needsReview && <InlineFlag>Needs Review</InlineFlag>}
            </p>
          ))}
        </div>
      )}

      {/* IMPORTANT FYI */}
      <SectionHeading>Important FYI</SectionHeading>
      {model.importantFyis.length === 0 ? <EmptyLine>No FYIs flagged for Huddle right now.</EmptyLine> : (
        <div>
          {model.importantFyis.map((entry, index) => (
            <p key={index} style={{ fontSize: '8.5pt', margin: '1.5pt 0' }}>
              {entry.text}
              {(entry.importance === 'urgent' || entry.importance === 'high') && <InlineFlag>{entry.importance}</InlineFlag>}
            </p>
          ))}
        </div>
      )}

      {/* CODE OF THE MONTH */}
      {model.codeOfMonth && (
        <>
          <SectionHeading>Code of the Month</SectionHeading>
          <p style={{ fontSize: '8.5pt', margin: '1.5pt 0' }}>
            <strong>Code {model.codeOfMonth.code}</strong> — {model.codeOfMonth.name}
            {model.codeOfMonth.reminder ? ` — ${model.codeOfMonth.reminder}` : ''}
          </p>
        </>
      )}

      {/* NOTES */}
      <SectionHeading>Notes</SectionHeading>
      <div style={{ border: '0.75pt solid #D1D5DB', borderRadius: '2pt', minHeight: '46pt' }} />

      {/* FOOTER — source-of-truth notice, kept short so it never forces a page */}
      <div style={{
        marginTop: '8pt', paddingTop: '4pt', borderTop: '0.5pt solid #9CA3AF',
        fontSize: '7pt', color: '#6B7280', lineHeight: 1.2,
      }}>
        Shift guide only — verify against your site's approved source of truth. If there is any discrepancy or unclear instruction, check with the Team Lead before proceeding.
      </div>
    </div>
  );
};
