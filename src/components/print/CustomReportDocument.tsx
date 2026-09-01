import React from 'react';
import { CustomReportModel, ReportRow } from '../../services/reports';
import { printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

const cellValue = (value: ReportRow['values'][string]): string => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

export const CustomReportDocument: React.FC<{ model: CustomReportModel }> = ({ model }) => {
  const orientation = model.definition.layout === 'landscape' || (model.definition.layout === 'auto' && model.columns.length > 6) ? 'landscape' : 'portrait';
  const compact = model.definition.density === 'compact';
  const pageName = `custom-report-${model.definition.id}`;
  return (
    <article className="tasksheet-print-document" style={{ ...printPageStyle(pageName), color: '#0f172a', fontSize: compact ? '7.5pt' : '8.5pt', lineHeight: 1.1 }}>
      <RepeatingPrintFooter pageName={pageName} orientation={orientation} facilityName={model.facility.siteName} documentLabel={model.title} dateLabel={model.coverage.startsWith('As of') ? `Generated ${model.coverage.slice(6)}` : model.coverage} generatedAt={model.generatedAt} />
      <header style={{ borderBottom: '1.5pt solid #0f172a', paddingBottom: '5pt', marginBottom: '6pt', display: 'flex', justifyContent: 'space-between', gap: '12pt' }}>
        <div><h1 className="tasksheet-print-title" style={{ margin: 0 }}>{model.title}</h1><p style={{ margin: '2pt 0 0', fontWeight: 700 }}>{model.sourceLabel} · {model.rows.length} matching record{model.rows.length === 1 ? '' : 's'}</p></div>
        <div style={{ textAlign: 'right', fontSize: '8pt' }}><strong>{model.facility.siteName}</strong><br />{model.facility.street}, {model.facility.city}<br />{model.facility.mainPhone}<br />{model.filterSummary}</div>
      </header>
      {model.summaryItems && <div style={{ display: 'grid', gridTemplateColumns: `repeat(${model.summaryItems.length}, 1fr)`, gap: '4pt', marginBottom: '6pt' }}>{model.summaryItems.map(item => <div key={item.label} style={{ border: '0.75pt solid #94a3b8', padding: '4pt', textAlign: 'center' }}><strong style={{ display: 'block', fontSize: '10pt' }}>{item.value}</strong><span style={{ fontSize: '7.5pt' }}>{item.label}</span></div>)}</div>}
      {model.rows.length === 0 ? <div style={{ border: '0.75pt solid #cbd5e1', padding: '24pt', textAlign: 'center', color: '#64748b' }}>No matching records. Return to filters before printing.</div> : model.groups.map(group => (
        <section key={group.key || 'all'} style={{ marginBottom: '8pt' }}>
          {model.definition.grouping && <h2 className="tasksheet-print-section-heading" style={{ margin: '7pt 0 3pt', padding: '2pt 4pt', border: '0.75pt solid #64748b', background: '#fff' }}>{model.columns.find(column => column.id === model.definition.grouping)?.label || model.definition.grouping}: {group.label}</h2>}
          <table style={{ width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse' }}>
            <thead style={{ display: 'table-header-group' }}><tr>{model.columns.map(column => <th key={column.id} className="tasksheet-print-table-heading" style={{ border: '0.75pt solid #94a3b8', padding: compact ? '2pt 3pt' : '3pt 4pt', textAlign: 'left', background: '#f1f5f9' }}>{column.label}</th>)}</tr></thead>
            <tbody>{group.rows.map(row => <tr key={row.id}>{model.columns.map(column => <td key={column.id} style={{ border: '0.75pt solid #cbd5e1', padding: compact ? '2pt 3pt' : '3pt 4pt', verticalAlign: 'top', overflowWrap: 'anywhere' }}>{cellValue(row.values[column.id])}</td>)}</tr>)}</tbody>
          </table>
        </section>
      ))}
      <footer style={{ marginTop: '7pt', paddingTop: '3pt', borderTop: '0.5pt solid #94a3b8', fontSize: '7.5pt', color: '#64748b' }}>TaskSheet configuration and workflow report. Verify clinical information against the facility-authorized record where applicable.</footer>
    </article>
  );
};
