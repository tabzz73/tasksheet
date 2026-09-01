import React from 'react';
import { WoundSupplyReorderModel } from '../../services/print/specializedDocs';
import { formatPrintDate, printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

const cell: React.CSSProperties = { border: '0.5pt solid #94a3b8', padding: '4pt', verticalAlign: 'top', lineHeight: 1.1 };

export const WoundSupplyReorderDocument: React.FC<{ model: WoundSupplyReorderModel }> = ({ model }) => (
  <article className="tasksheet-print-document print-document" style={{ ...printPageStyle('wound-supply-reorder'), fontFamily: 'Arial, Helvetica, sans-serif', color: '#0f172a', fontSize: '8pt' }}>
    <RepeatingPrintFooter pageName="wound-supply-reorder" orientation="landscape" facilityName={model.facility.siteName} documentLabel="Wound Supplies Re-Order" dateLabel={`Generated ${formatPrintDate(model.generatedAt || new Date().toISOString())}`} secondaryLabel={model.scopeLabel} generatedAt={model.generatedAt} />
    <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5pt solid #0f172a', paddingBottom: '5pt', marginBottom: '6pt' }}>
      <div><h1 style={{ margin: 0, fontSize: '16pt' }}>{model.title}</h1><div style={{ marginTop: '2pt', fontWeight: 700 }}>{model.scopeLabel}</div></div>
      <div style={{ textAlign: 'right' }}><strong>{model.facility.siteName}</strong><br />Generated {model.generatedDate}<br />{model.activeResidentCount} residents · {model.activeWoundCount} wound protocols</div>
    </header>
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead style={{ display: 'table-header-group' }}><tr>
        {['Product', 'Size', 'Residents / Rooms', 'Wound Locations', 'Scheduled Uses', 'Qty / Use', 'Estimated Need', 'On Hand', 'Order Qty'].map((label, index) => <th key={label} style={{ ...cell, width: ['15%', '8%', '16%', '17%', '9%', '8%', '9%', '9%', '9%'][index], textAlign: 'left', fontWeight: 800, borderColor: '#475569' }}>{label}</th>)}
      </tr></thead>
      <tbody>
        {model.rows.length === 0 ? <tr><td colSpan={9} style={{ ...cell, padding: '18pt', textAlign: 'center' }}>No wound-care supplies found for the selected scope.</td></tr> : model.rows.map(row => (
          <tr key={row.key} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <td style={{ ...cell, fontWeight: 800 }}>{row.supplyName}</td><td style={cell}>{row.unitSize || '—'}</td><td style={cell}>{row.residentRooms.join('; ')}</td><td style={cell}>{row.woundLocations.join('; ')}</td>
            <td style={{ ...cell, textAlign: 'center', fontWeight: 700 }}>{row.scheduledUses ?? '—'}</td><td style={{ ...cell, textAlign: 'center' }}>{row.quantityPerUse !== null ? `${row.quantityPerUse} ${row.unit || ''}`.trim() : '—'}</td><td style={{ ...cell, textAlign: 'center', fontWeight: 700 }}>{row.estimatedNeed !== null ? `${row.estimatedNeed} ${row.unit || ''}`.trim() : '—'}</td><td style={cell}><div style={{ height: '14pt', borderBottom: '0.5pt solid #64748b' }} /></td><td style={cell}><div style={{ height: '14pt', borderBottom: '0.5pt solid #64748b' }} /></td>
          </tr>
        ))}
      </tbody>
    </table>
    <div style={{ marginTop: '7pt', fontSize: '8pt' }}>Prepared / Reviewed by: ____________________________________ &nbsp; Date: ________________</div>
    <footer style={{ marginTop: '6pt', fontSize: '7.5pt', borderTop: '0.5pt solid #94a3b8', paddingTop: '3pt' }}>Planning aid only. Verify stock, package size, treatment orders, and facility purchasing requirements before ordering.</footer>
  </article>
);
