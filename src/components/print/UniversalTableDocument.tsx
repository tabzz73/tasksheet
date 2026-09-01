import React from 'react';
import { PrintAttentionIcons, PrintAttentionLegend } from './PrintAttentionIcons';
import { ResidentStatusExceptions } from './ResidentStatusExceptions';
import { PrintDocumentModel, PrintTableRow, formatShiftHeader } from '../../services/print';
import { printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

interface UniversalTableDocumentProps {
  model: PrintDocumentModel;
}

export const UniversalTableDocument: React.FC<UniversalTableDocumentProps> = ({ model }) => {
  const { 
    header, 
    tableRows, 
    woundRows,
    conciseShiftAlerts, 
    residentStatusExceptions,
    confidentialityNotice, 
    attentionLegend, 
    summary,
    handoffNotesLinesCount 
  } = model;
  
  const isClinical = model.profile === 'clinical_worksheet';
  const pageName = `shift-${model.profile}-${header.shiftCode || header.shiftName}`;
  const density = model.density || 'standard';
  const isLargePrint = model.largePrint || false;

  // Density changes spacing first. Compact mode keeps an 8pt safety floor.
  const fontSizeBase = isLargePrint ? '9.5pt' : density === 'compact' ? '8pt' : 'var(--print-body-size)';
  const fontSizeHeader = isLargePrint ? '9.5pt' : density === 'compact' ? '8pt' : 'var(--print-table-header-size)';
  const fontSizeInfo = isLargePrint ? '8.5pt' : 'var(--print-secondary-size)';
  const headerPaddingY = density === 'compact' ? '2pt' : density === 'spacious' ? '4.5pt' : '3pt';

  // Group table rows by workflow section (only non-empty sections will render)
  const startRows = tableRows.filter(r => r.workflowSection === 'start');
  const residentRows = tableRows.filter(r => r.workflowSection === 'resident_care');
  const untimedRows = tableRows.filter(r => r.workflowSection === 'untimed_prn');
  const endRows = tableRows.filter(r => r.workflowSection === 'end');

  // Checkbox square
  const CheckBox = () => (
    <span
      style={{
        display: 'inline-block',
        width: '9.5pt',
        height: '9.5pt',
        border: '1pt solid #475569',
        borderRadius: '1.5pt',
        backgroundColor: '#ffffff',
        verticalAlign: 'middle',
      }}
    />
  );

  // Render a single table row with variable row height based on rowType
  const renderRow = (row: PrintTableRow, index: number) => {
    const isCompact = row.rowType === 'compact';
    const isExpanded = row.rowType === 'expanded';

    // Variable row padding based on row type
    const paddingY = isCompact 
      ? density === 'compact' ? '1.75pt' : '2.5pt'
      : isExpanded 
        ? density === 'compact' ? '3.25pt' : '5pt'
        : density === 'compact' ? '2pt' : density === 'spacious' ? '4.5pt' : '3pt';

    // Subtle, clean row backgrounds
    const rowBg = row.priority === 'urgent' 
      ? '#fff1f2' 
      : index % 2 === 1 
        ? '#f8fafc' 
        : '#ffffff';

    return (
      <tr
        key={row.id}
        style={{
          backgroundColor: rowBg,
          breakInside: 'avoid',
          pageBreakInside: 'avoid',
        }}
      >
        {/* 1. Checkbox */}
        <td style={{ padding: `${paddingY} 2pt`, textAlign: 'center', width: isClinical ? '3%' : '4%', borderBottom: '0.5pt solid #cbd5e1' }}>
          <CheckBox />
        </td>

        {/* 2. Time */}
        <td
          style={{
            padding: `${paddingY} 3pt`,
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            fontSize: fontSizeBase,
            color: '#0f172a',
            whiteSpace: 'nowrap',
            width: isClinical ? '6%' : '8%',
            borderBottom: '0.5pt solid #cbd5e1',
          }}
        >
          {row.time}
        </td>

        {/* 3. Room */}
        <td
          style={{
            padding: `${paddingY} 3pt`,
            fontFamily: 'Arial, sans-serif',
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            fontSize: fontSizeBase,
            color: '#1e293b',
            whiteSpace: 'nowrap',
            width: isClinical ? '6%' : '8%',
            borderBottom: '0.5pt solid #cbd5e1',
          }}
        >
          {row.roomNumber}
        </td>

        {/* 4. Resident Name */}
        <td
          style={{
            padding: `${paddingY} 4pt`,
            fontFamily: 'Arial, sans-serif',
            fontWeight: 700,
            fontSize: fontSizeBase,
            color: '#0f172a',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            width: isClinical ? '13%' : '18%',
            borderBottom: '0.5pt solid #cbd5e1',
          }}
        >
          {row.residentName}
        </td>

        {/* 5. Task Description + Attention Tags */}
        <td style={{ padding: `${paddingY} 4pt`, fontFamily: 'Arial, sans-serif', fontSize: fontSizeBase, color: '#0f172a', width: '24%', borderBottom: '0.5pt solid #cbd5e1' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '3pt' }}>
            <span style={{ fontWeight: 700 }}>{row.taskTitle}</span>
            {row.attentionTags && row.attentionTags.length > 0 && (
              <PrintAttentionIcons codes={row.attentionTags} size={density === 'compact' ? 8 : 9} />
            )}
          </div>
        </td>

        {/* 6. Important Information */}
        <td
          style={{
            padding: `${paddingY} 4pt`,
            fontFamily: 'Arial, sans-serif',
            fontSize: fontSizeInfo,
            color: '#334155',
            lineHeight: 'var(--print-line-height)',
            width: isClinical ? '22%' : '28%',
            borderBottom: '0.5pt solid #cbd5e1',
          }}
        >
          {row.importantInformation || '—'}
        </td>

        {/* 7. Vitals / Results Field (LPN ONLY) */}
        {isClinical && (
          <td
            style={{
              padding: `${paddingY} 4pt`,
              fontFamily: 'Arial, sans-serif',
              fontSize: fontSizeInfo,
              color: '#0f172a',
              fontVariantNumeric: 'tabular-nums',
              width: '14%',
              borderBottom: '0.5pt solid #cbd5e1',
            }}
          >
            {row.structuredResult ? (
              <div style={{ fontWeight: 600, color: '#0f172a', whiteSpace: 'pre-line', lineHeight: 'var(--print-line-height)' }}>
                {row.structuredResult.label}
              </div>
            ) : (
              <span style={{ color: '#94a3b8' }}>—</span>
            )}
          </td>
        )}

        {/* 8. Notes / Follow-up write-in */}
        <td
          style={{
            padding: `${paddingY} 4pt`,
            fontFamily: 'Arial, sans-serif',
            fontSize: 'var(--print-secondary-size)',
            color: '#64748b',
            width: isClinical ? '12%' : '10%',
            borderBottom: '0.5pt solid #cbd5e1',
          }}
        >
          <div style={{ borderBottom: '0.5pt solid #94a3b8', height: isExpanded ? '16pt' : '10pt', width: '100%' }} />
        </td>
      </tr>
    );
  };

  // Thin section divider row
  const colSpanCount = isClinical ? 8 : 7;
  const renderSectionHeader = (title: string, count: number) => (
    <tr
      className="tasksheet-ink-saving-band"
      style={{
        backgroundColor: '#ffffff',
        color: '#0f172a',
        borderTop: '1.5pt solid #0f172a',
        borderBottom: '1pt solid #0f172a',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
      }}
    >
      <td
        colSpan={colSpanCount}
        style={{
          padding: '2.5pt 6pt',
          fontFamily: 'Arial, sans-serif',
          fontSize: 'var(--print-section-size)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{title}</span>
          <span style={{ fontSize: '7.5pt', color: '#475569' }}>({count} item{count !== 1 ? 's' : ''})</span>
        </div>
      </td>
    </tr>
  );

  const headerStyle = header.headerStyle || 'standard';

  return (
    <div
      className="tasksheet-print-document tasksheet-universal-document"
      data-print-density={density}
      style={{
        ...printPageStyle(pageName),
        position: 'relative',
        fontFamily: 'var(--print-font-family)',
        fontSize: fontSizeBase,
        color: '#0f172a',
        backgroundColor: '#ffffff',
        lineHeight: 'var(--print-line-height)',
      }}
    >
      <RepeatingPrintFooter pageName={pageName} orientation={isClinical ? 'landscape' : 'portrait'} facilityName={header.facility.siteName} documentLabel={isClinical ? 'LPN TaskSheet' : 'HCA TaskSheet'} dateLabel={header.formattedDate} secondaryLabel={`${header.shiftCode || header.shiftName} · ${header.shiftTime}`} generatedAt={model.generatedAt} />
      {/* ── OPTIONAL WATERMARK OVERLAY ── */}
      {header.watermarkStyle && header.watermarkStyle !== 'none' && (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-25deg)',
            fontSize: '52pt',
            fontWeight: 900,
            color: 'rgba(148, 163, 184, 0.18)',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            pointerEvents: 'none',
            zIndex: 0,
            whiteSpace: 'nowrap',
          }}
        >
          {header.watermarkStyle === 'draft' ? 'DRAFT' : header.watermarkStyle === 'confidential' ? 'CONFIDENTIAL' : 'SAMPLE'}
        </div>
      )}

      {/* ── 1. FACILITY & SHIFT HEADER ── */}
      {headerStyle === 'compact' ? (
        /* ── COMPACT MINIMALIST HEADER (Space-Saving) ── */
        <div style={{ borderBottom: '1.5pt solid #0f172a', paddingBottom: '3pt', marginBottom: '4pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4pt' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6pt' }}>
              {header.logoUrl && (
                <img src={header.logoUrl} alt="Logo" style={{ maxHeight: '20pt', objectFit: 'contain' }} />
              )}
              <span className="tasksheet-print-title" style={{ fontSize: 'var(--print-title-size)', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', lineHeight: 1 }}>
                {header.documentTitle || 'TASKSHEET'}
              </span>
              <span style={{ fontSize: '8.5pt', fontWeight: 800, color: '#475569' }}>
                · {header.facility.siteName}
              </span>
              <span style={{ fontSize: '7.5pt', color: '#64748b' }}>
                ({header.documentSubtitle})
              </span>
            </div>

            <div style={{ fontSize: '7.5pt', color: '#475569', textAlign: 'right' }}>
              <span>{header.facility.street} · {header.facility.city} · Main: <strong>{header.facility.mainPhone}</strong></span>
              {header.facility.unitPhone && <span> · Unit: <strong>{header.facility.unitPhone}</strong></span>}
            </div>
          </div>

          {/* Quick contacts + shift info combined row */}
          <div style={{ marginTop: '2.5pt', padding: '2.5pt 5pt', background: '#f1f5f9', borderRadius: '2pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8pt' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '9.5pt', color: '#0f172a' }}>
                {formatShiftHeader(header, header.shiftHeaderFormat || 'short_code_only')}
              </span>
              {header.facility.additionalExtensions && header.facility.additionalExtensions.filter(e => e.enabled !== false).length > 0 && (
                <span style={{ marginLeft: '8pt', color: '#64748b', fontSize: '7.5pt' }}>
                  | Quick Contacts: {header.facility.additionalExtensions.filter(e => e.enabled !== false).map(ext => `${ext.label}: ${ext.number}`).join(' · ')}
                </span>
              )}
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{header.formattedDate}</div>
          </div>
        </div>
      ) : headerStyle === 'centered' ? (
        /* ── CENTERED HOSPITAL BRAND HEADER ── */
        <div style={{ borderBottom: '1.5pt solid #0f172a', paddingBottom: '5pt', marginBottom: '6pt', textAlign: 'center' }}>
          {header.logoUrl && (
            <div style={{ marginBottom: '3pt' }}>
              <img src={header.logoUrl} alt="Logo" style={{ maxHeight: '28pt', objectFit: 'contain', margin: '0 auto' }} />
            </div>
          )}
          <div style={{ fontSize: '9pt', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#0f172a' }}>
            {header.facility.siteName}
          </div>
          <div style={{ fontSize: '7.5pt', color: '#475569', marginTop: '1pt' }}>
            {header.facility.street}{header.facility.addressLine2 ? `, ${header.facility.addressLine2}` : ''} · {header.facility.city}, {header.facility.province} {header.facility.postalCode} · Main: <strong>{header.facility.mainPhone}</strong>{header.facility.unitPhone ? ` · Unit: ${header.facility.unitPhone}` : ''}{header.facility.fax ? ` · Fax: ${header.facility.fax}` : ''}
          </div>
          {header.facility.additionalExtensions && header.facility.additionalExtensions.filter(e => e.enabled !== false).length > 0 && (
            <div style={{ fontSize: '7.5pt', color: '#475569', marginTop: '1.5pt' }}>
              <span style={{ fontWeight: 800, color: '#0f172a' }}>Quick Contacts: </span>
              {header.facility.additionalExtensions.filter(e => e.enabled !== false).map((ext, idx, arr) => (
                <span key={ext.id}>
                  {ext.label}: <strong>{ext.number}</strong>{idx < arr.length - 1 ? ' · ' : ''}
                </span>
              ))}
            </div>
          )}

          <div style={{ marginTop: '4pt', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8pt' }}>
            <span className="tasksheet-print-title" style={{ fontSize: 'var(--print-title-size)', fontWeight: 700, textTransform: 'uppercase', color: '#0f172a', letterSpacing: '0.04em' }}>
              {header.documentTitle || 'TASKSHEET'}
            </span>
            <span style={{ fontSize: '8pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569' }}>
              — {header.documentSubtitle || (isClinical ? 'CLINICAL SHIFT WORKSHEET' : 'DAILY ASSIGNMENT')}
            </span>
          </div>

          <div style={{ marginTop: '4pt', padding: '3pt 6pt', background: '#f1f5f9', borderRadius: '3pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8.5pt' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '9.5pt', color: '#0f172a' }}>
                {formatShiftHeader(header, header.shiftHeaderFormat || 'short_code_only')}
              </span>
            </div>
            <div style={{ fontWeight: 700, color: '#0f172a' }}>{header.formattedDate}</div>
          </div>
        </div>
      ) : (
        /* ── STANDARD TWO-COLUMN CLINICAL HEADER (Default) ── */
        <div style={{ borderBottom: '1.5pt solid #0f172a', paddingBottom: '5pt', marginBottom: '6pt' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8pt' }}>
              {header.logoUrl && (
                <img src={header.logoUrl} alt="Logo" style={{ maxHeight: '32pt', objectFit: 'contain' }} />
              )}
              <div>
                <h1 className="tasksheet-print-title" style={{ fontSize: 'var(--print-title-size)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, color: '#0f172a', lineHeight: 1.1 }}>
                  {header.documentTitle || 'TASKSHEET'}
                </h1>
                <div style={{ fontSize: '8.5pt', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569', marginTop: '2pt' }}>
                  {header.documentSubtitle || (isClinical ? 'CLINICAL SHIFT WORKSHEET' : 'DAILY ASSIGNMENT')}
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontSize: '8pt', color: '#475569', lineHeight: 1.3 }}>
              <div style={{ fontWeight: 700, fontSize: '9pt', color: '#0f172a' }}>
                {header.facility.siteName}
              </div>
              <div>
                {header.facility.street}{header.facility.addressLine2 ? `, ${header.facility.addressLine2}` : ''} · {header.facility.city}, {header.facility.province} {header.facility.postalCode}
              </div>
              <div style={{ marginTop: '1pt' }}>
                <span>Main: <strong>{header.facility.mainPhone}</strong></span>
                {header.facility.unitPhone && <span style={{ marginLeft: '6pt' }}>Unit: <strong>{header.facility.unitPhone}</strong></span>}
                {header.facility.fax && <span style={{ marginLeft: '6pt' }}>Fax: <strong>{header.facility.fax}</strong></span>}
              </div>
              {header.facility.additionalExtensions && header.facility.additionalExtensions.filter(e => e.enabled !== false).length > 0 && (
                <div style={{ marginTop: '1.5pt', fontSize: '7.5pt', color: '#475569' }}>
                  <span style={{ fontWeight: 800, color: '#0f172a' }}>Quick Contacts: </span>
                  {header.facility.additionalExtensions.filter(e => e.enabled !== false).map((ext, idx, arr) => (
                    <span key={ext.id}>
                      {ext.label}: <strong>{ext.number}</strong>{idx < arr.length - 1 ? ' · ' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Shift metadata bar */}
          <div style={{ marginTop: '5pt', padding: '3.5pt 6pt', background: '#f1f5f9', borderRadius: '3pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 700, fontSize: '9.5pt', color: '#0f172a' }}>
                {formatShiftHeader(header, header.shiftHeaderFormat || 'short_code_only')}
              </span>
            </div>
            <div style={{ fontSize: '8.5pt', fontWeight: 700, color: '#0f172a' }}>{header.formattedDate}</div>
          </div>
        </div>
      )}

      {/* ── 2. CONCISE IMPORTANT SHIFT ALERTS (Tight 2–3 Line Box) ── */}
      {conciseShiftAlerts && conciseShiftAlerts.length > 0 && (
        <div
          style={{
            backgroundColor: '#fffbeb',
            border: '1pt solid #f59e0b',
            borderRadius: '3pt',
            padding: '3.5pt 6pt',
            marginBottom: '6pt',
            breakInside: 'avoid',
            fontSize: '8.0pt',
            lineHeight: 'var(--print-line-height)',
          }}
        >
          <div style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#92400e', marginBottom: '2pt', display: 'flex', alignItems: 'center', gap: '4pt' }}>
            <span>⚠ IMPORTANT SHIFT INFORMATION</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5pt' }}>
            {conciseShiftAlerts.map((alert, i) => (
              <div key={i} style={{ color: '#78350f', fontWeight: 600 }}>
                {alert.priority === 'urgent' ? '⚠ ' : '! '}
                {alert.room ? <strong>Room {alert.room}: </strong> : ''}
                <span>{alert.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ResidentStatusExceptions items={residentStatusExceptions} />

      {/* ── 3. UNIVERSAL TASK TABLE ── */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: fontSizeBase,
          border: '1pt solid #cbd5e1',
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5pt solid #94a3b8', textAlign: 'left' }}>
            <th style={{ padding: `${headerPaddingY} 2pt`, width: isClinical ? '3%' : '4%', textAlign: 'center', fontSize: fontSizeHeader, fontWeight: 800, color: '#0f172a' }}>☐</th>
            <th style={{ padding: `${headerPaddingY} 3pt`, width: isClinical ? '6%' : '8%', fontSize: fontSizeHeader, fontWeight: 800, color: '#0f172a' }}>Time</th>
            <th style={{ padding: `${headerPaddingY} 3pt`, width: isClinical ? '6%' : '8%', fontSize: fontSizeHeader, fontWeight: 800, color: '#0f172a' }}>Room</th>
            <th style={{ padding: `${headerPaddingY} 4pt`, width: isClinical ? '13%' : '18%', fontSize: fontSizeHeader, fontWeight: 800, color: '#0f172a' }}>Resident</th>
            <th style={{ padding: `${headerPaddingY} 4pt`, width: '24%', fontSize: fontSizeHeader, fontWeight: 800, color: '#0f172a' }}>Task Description</th>
            <th style={{ padding: `${headerPaddingY} 4pt`, width: isClinical ? '22%' : '28%', fontSize: fontSizeHeader, fontWeight: 800, color: '#0f172a' }}>Important Information</th>
            {isClinical && (
              <th style={{ padding: `${headerPaddingY} 4pt`, width: '14%', fontSize: fontSizeHeader, fontWeight: 800, color: '#0f172a' }}>
                Vitals / Results
              </th>
            )}
            <th style={{ padding: `${headerPaddingY} 4pt`, width: isClinical ? '12%' : '10%', fontSize: fontSizeHeader, fontWeight: 800, color: '#0f172a' }}>
              {isClinical ? 'Notes / Follow-up' : 'Notes'}
            </th>
          </tr>
        </thead>
        <tbody>
          {/* Section 1: START OF SHIFT */}
          {startRows.length > 0 && (
            <>
              {renderSectionHeader('Start of Shift', startRows.length)}
              {startRows.map((r, i) => renderRow(r, i))}
            </>
          )}

          {/* Section 2: RESIDENT CARE */}
          {residentRows.length > 0 && (
            <>
              {renderSectionHeader('Resident Care Schedule', residentRows.length)}
              {residentRows.map((r, i) => renderRow(r, i))}
            </>
          )}

          {/* Section 3: UNTIMED / PRN CARE */}
          {untimedRows.length > 0 && (
            <>
              {renderSectionHeader('Any Time During Shift / PRN', untimedRows.length)}
              {untimedRows.map((r, i) => renderRow(r, i))}
            </>
          )}

          {/* Section 4: END OF SHIFT */}
          {endRows.length > 0 && (
            <>
              {renderSectionHeader('End of Shift', endRows.length)}
              {endRows.map((r, i) => renderRow(r, i))}
            </>
          )}
        </tbody>
      </table>

      {isClinical && woundRows.length > 0 && (
        <section style={{ marginTop: '7pt' }} aria-label="Wound Care">
          <div style={{ fontSize: 'var(--print-section-size)', fontWeight: 800, letterSpacing: '0.06em', border: '1pt solid #0f172a', borderBottom: 0, padding: '3pt 5pt' }}>
            WOUND CARE <span style={{ float: 'right', fontSize: 'var(--print-secondary-size)' }}>({woundRows.length} ITEM{woundRows.length === 1 ? '' : 'S'})</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: fontSizeInfo }}>
            <thead style={{ display: 'table-header-group' }}>
              <tr style={{ border: '1pt solid #64748b' }}>
                {[
                  ['☐', '3%'], ['Time', '6%'], ['Room', '6%'], ['Resident', '13%'],
                  ['Location', '12%'], ['Protocol', '23%'], ['Supplies', '18%'], ['Assessment / Notes', '19%'],
                ].map(([label, width]) => (
                  <th key={label} style={{ width, padding: '3pt', textAlign: label === '☐' ? 'center' : 'left', borderRight: '0.5pt solid #94a3b8', fontSize: fontSizeHeader, fontWeight: 800 }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {woundRows.map(row => (
                <tr key={row.id} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
                  <td style={{ padding: '4pt 2pt', textAlign: 'center', border: '0.5pt solid #cbd5e1' }}><CheckBox /></td>
                  <td style={{ padding: '4pt 3pt', fontWeight: 800, border: '0.5pt solid #cbd5e1' }}>{row.time}</td>
                  <td style={{ padding: '4pt 3pt', fontWeight: 800, border: '0.5pt solid #cbd5e1' }}>{row.roomNumber}</td>
                  <td style={{ padding: '4pt 3pt', fontWeight: 700, border: '0.5pt solid #cbd5e1' }}>{row.residentName}</td>
                  <td style={{ padding: '4pt 3pt', border: '0.5pt solid #cbd5e1' }}>{row.location}</td>
                  <td style={{ padding: '4pt 3pt', border: '0.5pt solid #cbd5e1' }}>{row.protocol}</td>
                  <td style={{ padding: '4pt 3pt', border: '0.5pt solid #cbd5e1' }}>{row.supplies}</td>
                  <td style={{ padding: '4pt 3pt', border: '0.5pt solid #cbd5e1' }}>
                    {row.assessmentType !== 'none' && <strong>{row.assessmentType === 'full' ? 'FULL' : 'PARTIAL'} ASSESSMENT</strong>}
                    <div style={{ borderBottom: '0.5pt solid #94a3b8', height: '10pt' }} />
                    <div style={{ borderBottom: '0.5pt solid #94a3b8', height: '10pt' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── 4. HANDOFF / NOTES SECTION (If configured) ── */}
      {handoffNotesLinesCount > 0 && (
        <div style={{ marginTop: '10pt', breakInside: 'avoid', pageBreakInside: 'avoid' }}>
          <div
            style={{
              fontSize: 'var(--print-section-size)',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#0f172a',
              borderBottom: '1pt solid #0f172a',
              paddingBottom: '2pt',
              marginBottom: '4pt',
            }}
          >
            HANDOFF / NOTES
          </div>
          {Array.from({ length: handoffNotesLinesCount }).map((_, i) => (
            <div key={i} style={{ borderBottom: '0.5pt solid #94a3b8', height: '14pt', marginBottom: '3pt' }} />
          ))}
        </div>
      )}

      {/* ── 5. DYNAMIC ATTENTION LEGEND (Only active codes) ── */}
      {attentionLegend && attentionLegend.length > 0 && (
        <div
          style={{
            marginTop: '6pt',
            padding: '2.5pt 6pt',
            backgroundColor: '#f8fafc',
            border: '0.5pt solid #cbd5e1',
            borderRadius: '2pt',
            fontSize: 'var(--print-footer-size)',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8pt',
            breakInside: 'avoid',
          }}
        >
          <span style={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Attention Symbols:
          </span>
          <PrintAttentionLegend items={attentionLegend} />
        </div>
      )}

      {confidentialityNotice && <div style={{ marginTop: '8pt', fontSize: 'var(--print-footer-size)', color: '#64748b', textAlign: 'center', fontStyle: 'italic', breakInside: 'avoid' }}>{confidentialityNotice}</div>}
    </div>
  );
};
