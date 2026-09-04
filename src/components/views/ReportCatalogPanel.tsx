import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Bandage, ChevronLeft, ChevronRight, Copy, Download, FilePlus2, Filter, LayoutList, Plus, Save, Trash2 } from 'lucide-react';
import { db } from '../../db';
import { ReportDataSource, ReportFilterDefinition, SavedPrintPreset } from '../../types';
import {
  buildCustomReportModel,
  deleteUserPreset,
  REPORT_FIELDS,
  REPORT_SOURCE_LABELS,
  ReportDefinition,
  saveUserPreset,
  SYSTEM_REPORT_PRESETS,
} from '../../services/reports';
import {
  buildWeeklyWoundOverviewModel,
  buildWoundSupplyReorderModel,
  getWoundWeek,
} from '../../services/print/specializedDocs';
import { SpecializedPrintDoc } from './PrintPreviewPage';
import { Modal } from '../common/Modal';

function stepDate(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + delta);
  return date.toISOString().split('T')[0];
}

const newDefinition = (source: ReportDataSource, date: string): ReportDefinition => ({
  id: `custom-${Date.now()}`,
  name: 'Custom Report',
  category: 'Custom',
  description: 'User-configured safe TaskSheet report.',
  system: false,
  dataSource: source,
  columns: REPORT_FIELDS[source].filter(item => item.default).map(item => item.id),
  filters: [],
  grouping: '',
  sorting: source === 'residents' || source === 'resident_care' || source === 'bathing' ? [{ field: 'room', direction: 'asc', naturalRoom: true }] : [{ field: REPORT_FIELDS[source][0].id, direction: 'asc' }],
  layout: 'auto',
  density: 'standard',
  dateRange: { start: date, end: date },
});

interface ReportCatalogPanelProps {
  selectedDate: string;
  onPreview: (doc: SpecializedPrintDoc) => void;
  /** Controlled from the parent's unified Print Center tab bar. */
  category: string;
  /** Wound Care tab only — the two wound quick prints live here alongside
   *  that category's preset reports, rather than a separate tab. */
  woundWeekAnchor: string;
  onWoundWeekAnchorChange: (date: string) => void;
  woundSupplyScope: 'current_week' | 'all_active';
  onWoundSupplyScopeChange: (scope: 'current_week' | 'all_active') => void;
  today: string;
}

export const ReportCatalogPanel: React.FC<ReportCatalogPanelProps> = ({
  selectedDate,
  onPreview,
  category,
  woundWeekAnchor,
  onWoundWeekAnchorChange,
  woundSupplyScope,
  onWoundSupplyScopeChange,
  today,
}) => {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [definition, setDefinition] = useState<ReportDefinition>(() => newDefinition('residents', selectedDate));
  const [filterDraft, setFilterDraft] = useState<ReportFilterDefinition>({ field: 'status', operator: 'equals', value: 'Active' });
  const [message, setMessage] = useState('');
  const [largePending, setLargePending] = useState<ReturnType<typeof buildCustomReportModel> | null>(null);
  const [, setPresetRevision] = useState(0);
  const fields = REPORT_FIELDS[definition.dataSource];
  const model = useMemo(() => buildCustomReportModel(definition), [definition]);
  const userPresets = db.getState().settings.savedPrintPresets || [];
  const categoryPresets = SYSTEM_REPORT_PRESETS.filter(item => item.category === category);

  const preview = (reportDefinition: ReportDefinition | SavedPrintPreset) => {
    if (reportDefinition.id === 'resident-care-profile') {
      setDefinition({ ...reportDefinition, category: 'Custom', description: 'One-resident configured care profile.', system: false });
      setBuilderOpen(true);
      setMessage('Add a Resident filter for the individual profile, then preview.');
      return;
    }
    const resolvedDefinition = reportDefinition.dataSource === 'recurring_care' && reportDefinition.id === 'recurring-care-schedule'
      ? { ...reportDefinition, dateRange: { start: selectedDate, end: new Date(new Date(`${selectedDate}T12:00:00`).getTime() + 6 * 86400000).toISOString().slice(0, 10) } }
      : reportDefinition;
    if (resolvedDefinition.dateRange && resolvedDefinition.dateRange.start > resolvedDefinition.dateRange.end) {
      setMessage('The report start date must be on or before the end date.');
      return;
    }
    const report = buildCustomReportModel(resolvedDefinition);
    if (report.rows.length === 0) { setMessage('No matching records. Adjust the selected filters before printing.'); return; }
    if (report.largeReport) { setLargePending(report); return; }
    setMessage('');
    onPreview({ type: 'custom_report', model: report });
  };

  const changeSource = (source: ReportDataSource) => {
    setDefinition(newDefinition(source, selectedDate));
    setFilterDraft({ field: REPORT_FIELDS[source][0].id, operator: 'equals', value: '' });
  };

  const toggleColumn = (id: string) => setDefinition(current => ({ ...current, columns: current.columns.includes(id) ? current.columns.filter(column => column !== id) : [...current.columns, id] }));
  const moveColumn = (id: string, delta: number) => setDefinition(current => {
    const columns = [...current.columns]; const index = columns.indexOf(id); const target = index + delta;
    if (index < 0 || target < 0 || target >= columns.length) return current;
    [columns[index], columns[target]] = [columns[target], columns[index]];
    return { ...current, columns };
  });

  const save = () => {
    const name = definition.name.trim();
    if (!name) { setMessage('Enter a preset name before saving.'); return; }
    saveUserPreset({ ...definition, id: definition.id.startsWith('custom-') ? undefined : definition.id, name });
    setPresetRevision(value => value + 1); setMessage(`Saved “${name}”.`);
  };

  const exportCsv = () => {
    const safeSources: ReportDataSource[] = ['residents', 'shifts', 'rooms', 'wound_supplies', 'care_catalog', 'unit_tasks'];
    if (!safeSources.includes(definition.dataSource) || model.rows.length === 0) return;
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = [model.columns.map(column => quote(column.label)).join(','), ...model.rows.map(row => model.columns.map(column => quote(row.values[column.id])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${definition.name.trim().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'tasksheet-report'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <section className="bg-panel rounded-surface border border-hairline-strong overflow-hidden">
    <div className="p-5 border-b border-hairline-strong bg-panel-sunken flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-muted">Predefined operational reports and a guided privacy-safe custom builder.</p>
      <button type="button" onClick={() => setBuilderOpen(true)} className="px-3 py-2 bg-accent-strong text-white rounded-control text-xs font-bold inline-flex items-center gap-1.5"><FilePlus2 className="w-4 h-4" />Custom Print Builder</button>
    </div>

    {category === 'Wound Care' && (
      <div className="border-b border-danger">
        <div className="px-5 py-3 bg-danger-soft flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Bandage className="w-4 h-4 text-danger" />
            <div><strong className="block text-[13px] font-bold text-ink">Wound Quick Prints</strong><span className="block text-[11px] text-muted">Preview-first operational reports · no clinical results stored</span></div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" aria-label="Previous wound week" onClick={() => onWoundWeekAnchorChange(stepDate(woundWeekAnchor, -7))} className="p-1.5 border border-hairline-strong rounded-control hover:bg-panel"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <button type="button" onClick={() => onWoundWeekAnchorChange(today)} className="px-2.5 py-1.5 border border-hairline-strong rounded-control text-[11px] font-bold hover:bg-panel">Current Week</button>
            <button type="button" aria-label="Next wound week" onClick={() => onWoundWeekAnchorChange(stepDate(woundWeekAnchor, 7))} className="p-1.5 border border-hairline-strong rounded-control hover:bg-panel"><ChevronRight className="w-3.5 h-3.5" /></button>
            <span className="ml-2 text-xs font-bold text-ink-soft">{getWoundWeek(woundWeekAnchor).weekRange}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-hairline">
          <div className="p-4 flex items-start justify-between gap-4">
            <div><p className="text-sm font-bold text-ink">Weekly Wound Care Overview</p><p className="text-xs text-muted mt-1">Mon–Sun schedule · all active clinical shifts · Full/Partial assessment markers</p></div>
            <button type="button" onClick={() => onPreview({ type: 'wound_weekly', model: buildWeeklyWoundOverviewModel(woundWeekAnchor) })} className="px-3 py-2 bg-danger hover:bg-danger text-white rounded-control text-xs font-bold shrink-0">Preview</button>
          </div>
          <div className="p-4 flex items-start justify-between gap-4">
            <div className="min-w-0"><p className="text-sm font-bold text-ink">Wound Supplies Re-Order List</p><p className="text-xs text-muted mt-1">Exact supply names · scheduled-use counts · resident/wound traceability</p>
              <select aria-label="Wound supply report scope" value={woundSupplyScope} onChange={event => onWoundSupplyScopeChange(event.target.value as 'current_week' | 'all_active')} className="mt-2 px-2.5 py-1.5 border border-hairline-strong rounded-control text-xs bg-panel"><option value="current_week">Current Week</option><option value="all_active">All Active Wounds</option></select>
            </div>
            <button type="button" onClick={() => onPreview({ type: 'wound_supplies', model: buildWoundSupplyReorderModel(woundWeekAnchor, woundSupplyScope) })} className="px-3 py-2 bg-ink hover:bg-danger text-white rounded-control text-xs font-bold shrink-0">Preview</button>
          </div>
        </div>
      </div>
    )}

    <div className="px-5 pt-3 text-[10px] font-black text-faint uppercase tracking-widest">{category} Reports</div>
    <div className="divide-y divide-hairline">{categoryPresets.map(item => <button key={item.id} type="button" onClick={() => preview(item)} className="w-full text-left px-5 py-3 hover:bg-panel-sunken transition-colors flex items-center justify-between gap-3"><span className="min-w-0"><strong className="block text-[13px] font-bold text-ink">{item.name}</strong><span className="block text-[11px] text-muted mt-0.5">{item.description}</span></span><span className="shrink-0 text-[10px] uppercase tracking-wider font-bold text-faint">{REPORT_SOURCE_LABELS[item.dataSource]} · {item.layout}</span></button>)}{categoryPresets.length === 0 && category !== 'Wound Care' && <p className="px-5 py-4 text-xs text-faint">No predefined reports in this category yet.</p>}{category === 'Custom' && <div className="p-5 border-t border-hairline"><strong className="block text-sm text-ink">Custom Print Builder & Saved Presets</strong><p className="text-xs text-ink-soft mt-1">Use the guided builder above to choose a safe data source, filters, columns, grouping, sorting, layout, and density.</p></div>}</div>

    <Modal isOpen={builderOpen} onClose={() => setBuilderOpen(false)} title="Custom Print Builder" subtitle="Data → Filters → Columns → Grouping → Sorting → Layout → Preview" maxWidth="4xl">
      <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <label className="text-xs font-bold">Data Source<select aria-label="Report data source" value={definition.dataSource} onChange={event => changeSource(event.target.value as ReportDataSource)} className="mt-1 w-full p-2 border border-hairline-strong rounded-control bg-panel">{Object.entries(REPORT_SOURCE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="text-xs font-bold">Report / Preset Name<input aria-label="Report preset name" value={definition.name} onChange={event => setDefinition({ ...definition, name: event.target.value })} className="mt-1 w-full p-2 border border-hairline-strong rounded-control" /></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold">Start Date<input type="date" value={definition.dateRange?.start || selectedDate} onChange={event => setDefinition({ ...definition, dateRange: { start: event.target.value, end: definition.dateRange?.end || event.target.value } })} className="mt-1 w-full p-2 border rounded-control" /></label><label className="text-xs font-bold">End Date<input type="date" value={definition.dateRange?.end || selectedDate} onChange={event => setDefinition({ ...definition, dateRange: { start: definition.dateRange?.start || event.target.value, end: event.target.value } })} className="mt-1 w-full p-2 border rounded-control" /></label></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-panel rounded-surface border p-4 space-y-3"><h5 className="text-xs font-black flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" />Filters</h5>
          <div className="grid grid-cols-[1fr_130px_1fr_auto] gap-2"><select aria-label="Filter field" value={filterDraft.field} onChange={event => setFilterDraft({ ...filterDraft, field: event.target.value })} className="p-2 border rounded text-xs">{fields.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select aria-label="Filter operator" value={filterDraft.operator} onChange={event => setFilterDraft({ ...filterDraft, operator: event.target.value as ReportFilterDefinition['operator'] })} className="p-2 border rounded text-xs"><option value="equals">Equals</option><option value="not_equals">Not equal</option><option value="contains">Contains</option><option value="is_true">Is true</option><option value="is_false">Is false</option><option value="is_empty">Is empty</option><option value="not_empty">Not empty</option></select><input aria-label="Filter value" value={String(filterDraft.value ?? '')} disabled={['is_true','is_false','is_empty','not_empty'].includes(filterDraft.operator)} onChange={event => setFilterDraft({ ...filterDraft, value: event.target.value })} className="p-2 border rounded text-xs" /><button type="button" aria-label="Add filter" onClick={() => setDefinition({ ...definition, filters: [...definition.filters, filterDraft] })} className="p-2 bg-ink text-white rounded"><Plus className="w-4 h-4" /></button></div>
          <div className="flex flex-wrap gap-1.5">{definition.filters.map((filterItem, index) => <button key={`${filterItem.field}-${index}`} type="button" onClick={() => setDefinition({ ...definition, filters: definition.filters.filter((_, itemIndex) => itemIndex !== index) })} className="px-2 py-1 rounded bg-warning-soft border border-warning text-[10px] font-bold text-warning">{fields.find(item => item.id === filterItem.field)?.label} {filterItem.operator.replace('_',' ')} {String(filterItem.value ?? '')} ×</button>)}</div>
        </div>

        <div className="bg-panel rounded-surface border p-4"><h5 className="text-xs font-black mb-3 flex items-center gap-1.5"><LayoutList className="w-3.5 h-3.5" />Columns and Order</h5><div className="max-h-48 overflow-y-auto space-y-1">{fields.map(item => { const selected = definition.columns.includes(item.id); return <div key={item.id} className="flex items-center gap-2 text-xs"><label className="flex-1 flex items-center gap-2"><input type="checkbox" checked={selected} onChange={() => toggleColumn(item.id)} />{item.label}</label>{selected && <><button type="button" aria-label={`Move ${item.label} up`} onClick={() => moveColumn(item.id,-1)} className="p-1"><ArrowUp className="w-3 h-3" /></button><button type="button" aria-label={`Move ${item.label} down`} onClick={() => moveColumn(item.id,1)} className="p-1"><ArrowDown className="w-3 h-3" /></button></>}</div>; })}</div></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3"><label className="text-xs font-bold">Grouping<select aria-label="Report grouping" value={definition.grouping || ''} onChange={event => setDefinition({ ...definition, grouping: event.target.value })} className="mt-1 w-full p-2 border rounded bg-panel"><option value="">None</option>{fields.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="text-xs font-bold">Primary Sort<select aria-label="Primary report sort" value={definition.sorting[0]?.field || fields[0].id} onChange={event => setDefinition({ ...definition, sorting: [{ field: event.target.value, direction: definition.sorting[0]?.direction || 'asc', naturalRoom: event.target.value === 'room' }] })} className="mt-1 w-full p-2 border rounded bg-panel">{fields.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="text-xs font-bold">Direction<select value={definition.sorting[0]?.direction || 'asc'} onChange={event => setDefinition({ ...definition, sorting: [{ ...definition.sorting[0], field: definition.sorting[0]?.field || fields[0].id, direction: event.target.value as 'asc'|'desc' }] })} className="mt-1 w-full p-2 border rounded bg-panel"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label><label className="text-xs font-bold">Layout<select aria-label="Report layout" value={definition.layout} onChange={event => setDefinition({ ...definition, layout: event.target.value as ReportDefinition['layout'] })} className="mt-1 w-full p-2 border rounded bg-panel"><option value="auto">Auto</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label className="text-xs font-bold">Density<select aria-label="Report density" value={definition.density} onChange={event => setDefinition({ ...definition, density: event.target.value as ReportDefinition['density'] })} className="mt-1 w-full p-2 border rounded bg-panel"><option value="standard">Standard</option><option value="compact">Compact</option></select></label></div>

      <div className={`rounded-surface border p-3 flex flex-wrap items-center justify-between gap-3 ${model.rows.length === 0 ? 'bg-danger-soft border-danger' : model.largeReport ? 'bg-warning-soft border-warning' : 'bg-accent-soft border-hairline-strong'}`}><div><strong className="text-sm">{model.rows.length} matching records · ~{model.estimatedPages} page{model.estimatedPages === 1 ? '' : 's'}</strong><p className="text-[11px] text-ink-soft">{model.filterSummary}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={save} className="px-3 py-2 border border-hairline-strong rounded-control text-xs font-bold bg-panel inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" />Save Preset</button>{['residents','shifts','rooms','wound_supplies','care_catalog','unit_tasks'].includes(definition.dataSource) && <button type="button" disabled={model.rows.length === 0} onClick={exportCsv} className="px-3 py-2 border border-hairline-strong rounded-control text-xs font-bold bg-panel inline-flex items-center gap-1 disabled:opacity-40"><Download className="w-3.5 h-3.5" />CSV</button>}<button type="button" disabled={model.rows.length === 0 || definition.columns.length === 0} onClick={() => preview(definition)} className="px-4 py-2 bg-accent-strong text-white rounded-control text-xs font-bold disabled:opacity-40">Preview Report</button></div></div>

      {userPresets.length > 0 && <div className="bg-panel border rounded-surface p-4"><h5 className="text-xs font-black mb-2">My Presets</h5><div className="space-y-2">{userPresets.map(saved => <div key={saved.id} className="flex items-center gap-2 border-b last:border-0 py-2"><span className="flex-1 text-xs font-bold">{saved.name}</span><button type="button" onClick={() => preview(saved)} className="px-2 py-1 text-xs border rounded">Preview</button><button type="button" onClick={() => { setDefinition({ ...saved, category: 'Custom', description: 'Saved user report preset.', system: false }); setBuilderOpen(true); }} className="px-2 py-1 text-xs border rounded">Edit / Rename</button><button type="button" aria-label={`Duplicate ${saved.name}`} onClick={() => { saveUserPreset({ ...saved, id: undefined, name: `${saved.name} Copy` }); setPresetRevision(value=>value+1); }} className="p-1.5"><Copy className="w-3.5 h-3.5" /></button><button type="button" aria-label={`Delete ${saved.name}`} onClick={() => { deleteUserPreset(saved.id); setPresetRevision(value=>value+1); }} className="p-1.5 text-danger"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div></div>}

      {message && <div role="alert" className="p-3 rounded-control bg-danger-soft border border-danger text-xs font-bold text-danger">{message}</div>}
      </div>
    </Modal>

    {/* Feedback from previewing a system preset directly (builder closed) */}
    {!builderOpen && message && <div role="alert" className="mx-4 mb-4 p-3 rounded-control bg-danger-soft border border-danger text-xs font-bold text-danger">{message}</div>}
    {largePending && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4"><div className="bg-panel rounded-surface shadow-elevated max-w-md p-5"><AlertTriangle className="w-7 h-7 text-warning" /><h4 className="font-black mt-2">Large Report Warning</h4><p className="text-sm mt-2">This report is estimated at {largePending.estimatedPages} pages. Review the selected filters before printing.</p><div className="flex justify-end gap-2 mt-5"><button type="button" onClick={() => setLargePending(null)} className="px-3 py-2 border rounded-control text-xs font-bold">Back to Filters</button><button type="button" onClick={() => { const report=largePending; setLargePending(null); onPreview({type:'custom_report',model:report}); }} className="px-3 py-2 bg-warning text-white rounded-control text-xs font-bold">Preview Anyway</button></div></div></div>}
  </section>;
};
