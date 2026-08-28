import React from 'react';
import { WeeklyWoundOverviewModel } from '../../services/print/specializedDocs';

export const WoundWeeklyOverviewDocument: React.FC<{ model: WeeklyWoundOverviewModel }> = ({ model }) => (
  <article className="print-document" style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#0f172a', fontSize: '8pt' }}>
    <header style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5pt solid #0f172a', paddingBottom: '5pt', marginBottom: '6pt' }}>
      <div><h1 style={{ margin: 0, fontSize: '16pt' }}>{model.title}</h1><div style={{ marginTop: '2pt', fontWeight: 700 }}>{model.weekRange}</div></div>
      <div style={{ textAlign: 'right' }}><strong>{model.facility.siteName}</strong><br />{model.facility.city}, {model.facility.province}</div>
    </header>
    <div style={{ display: 'flex', gap: '12pt', marginBottom: '5pt', fontWeight: 700 }}>
      <span>Active residents: {model.totalActiveResidents}</span>
      <span>Active wounds: {model.totalActiveWounds}</span>
      <span>{model.totalScheduledTreatments} scheduled treatments</span>
      <span>Full assessments: {model.fullAssessmentCount}</span>
      <span>Partial: {model.partialAssessmentCount}</span>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
      <thead style={{ display: 'table-header-group' }}><tr>
        <th style={head('5%')}>Room</th><th style={head('10%')}>Resident</th><th style={head('9%')}>Location</th><th style={head('16%')}>Protocol / Frequency</th>
        {model.days.map(day => <th key={day.dateStr} style={head('8%')}>{day.label}<br /><span style={{ fontWeight: 400 }}>{day.shortDate}</span></th>)}
        <th style={head('4%')}>Notes</th>
      </tr></thead>
      <tbody>
        {model.rows.length === 0 ? <tr><td colSpan={12} style={{ ...cell, padding: '18pt', textAlign: 'center' }}>No active wound treatments are scheduled during this week.</td></tr> : model.rows.map(row => (
          <tr key={row.woundId} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
            <td style={{ ...cell, fontWeight: 800 }}>{row.roomNumber}</td><td style={{ ...cell, fontWeight: 700 }}>{row.residentName}</td><td style={cell}>{row.location}</td>
            <td style={cell}><strong>{row.protocol}</strong><br /><span>{row.frequency}</span><br /><span>{row.supplies}</span></td>
            {row.slots.map(slot => <td key={slot.dateStr} style={{ ...cell, textAlign: 'center', fontSize: '7.5pt' }}>{slot.due ? <><span style={{ fontSize: '10pt' }}>☐</span><br />{slot.marker}</> : '—'}</td>)}
            <td style={cell}><div style={{ height: '18pt', borderBottom: '0.5pt solid #94a3b8' }} /></td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr><td colSpan={4} style={{ ...cell, fontWeight: 800 }}>DAILY TOTALS</td>{model.dailyTotals.map((count, index) => <td key={model.days[index].dateStr} style={{ ...cell, textAlign: 'center', fontWeight: 800 }}>{count}</td>)}<td style={cell} /></tr></tfoot>
    </table>
    <footer style={{ marginTop: '6pt', fontSize: '7.5pt', borderTop: '0.5pt solid #94a3b8', paddingTop: '3pt' }}>Operational scheduling worksheet only. Record clinical assessment and treatment details in the facility-authorized clinical record.</footer>
  </article>
);

const cell: React.CSSProperties = { border: '0.5pt solid #94a3b8', padding: '3pt', verticalAlign: 'top', lineHeight: 1.1 };
const head = (width: string): React.CSSProperties => ({ ...cell, width, textAlign: 'left', fontWeight: 800, borderColor: '#475569' });
