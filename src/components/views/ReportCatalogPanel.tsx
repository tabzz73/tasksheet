import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Copy, Download, FilePlus2, Filter, LayoutList, Plus, Save, Settings2, Trash2 } from 'lucide-react';
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
import { SpecializedPrintDoc } from './PrintPreviewPage';

const CATEGORIES = ['Residents', 'Wound Care', 'Care & Tasks', 'FYI', 'Facility / Setup', 'Bathing', 'Custom'] as const;

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

export const ReportCatalogPanel: React.FC<{ selectedDate: string; onPreview: (doc: SpecializedPrintDoc) => void }> = ({ selectedDate, onPreview }) => {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Residents');
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

  return <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
    <div className="p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
      <div><h3 className="text-base font-black text-slate-900">Report Library</h3><p className="text-xs text-slate-500">Predefined operational reports and a guided privacy-safe custom builder.</p></div>
      <button type="button" onClick={() => setBuilderOpen(value => !value)} className="px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"><FilePlus2 className="w-4 h-4" />{builderOpen ? 'Close Builder' : 'Custom Print Builder'}</button>
    </div>

    <div className="flex overflow-x-auto border-b border-slate-200" aria-label="Report categories">{CATEGORIES.map(item => <button key={item} type="button" onClick={() => setCategory(item)} className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 ${category === item ? 'border-teal-700 text-teal-800 bg-teal-50' : 'border-transparent text-slate-500'}`}>{item}</button>)}</div>

    <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">{categoryPresets.map(item => <button key={item.id} type="button" onClick={() => preview(item)} className="text-left p-4 rounded-xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition-colors"><strong className="block text-sm text-slate-900">{item.name}</strong><span className="block text-[11px] text-slate-500 mt-1">{item.description}</span><span className="inline-block mt-2 text-[9px] uppercase tracking-wider font-bold text-slate-400">{REPORT_SOURCE_LABELS[item.dataSource]} · {item.layout}</span></button>)}{category === 'Custom' && <div className="md:col-span-2 xl:col-span-3 p-5 rounded-xl border border-dashed border-teal-300 bg-teal-50/40"><strong className="block text-sm">Custom Print Builder & Saved Presets</strong><p className="text-xs text-slate-600 mt-1">Use the guided builder above to choose a safe data source, filters, columns, grouping, sorting, layout, and density.</p></div>}</div>

    {builderOpen && <div className="border-t-2 border-teal-200 bg-slate-50 p-5 space-y-5">
      <div className="flex items-center gap-2"><Settings2 className="w-4 h-4 text-teal-700" /><h4 className="text-sm font-black">Data → Filters → Columns → Grouping → Sorting → Layout → Preview</h4></div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <label className="text-xs font-bold">Data Source<select aria-label="Report data source" value={definition.dataSource} onChange={event => changeSource(event.target.value as ReportDataSource)} className="mt-1 w-full p-2 border border-slate-300 rounded-lg bg-white">{Object.entries(REPORT_SOURCE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        <label className="text-xs font-bold">Report / Preset Name<input aria-label="Report preset name" value={definition.name} onChange={event => setDefinition({ ...definition, name: event.target.value })} className="mt-1 w-full p-2 border border-slate-300 rounded-lg" /></label>
        <div className="grid grid-cols-2 gap-2"><label className="text-xs font-bold">Start Date<input type="date" value={definition.dateRange?.start || selectedDate} onChange={event => setDefinition({ ...definition, dateRange: { start: event.target.value, end: definition.dateRange?.end || event.target.value } })} className="mt-1 w-full p-2 border rounded-lg" /></label><label className="text-xs font-bold">End Date<input type="date" value={definition.dateRange?.end || selectedDate} onChange={event => setDefinition({ ...definition, dateRange: { start: definition.dateRange?.start || event.target.value, end: event.target.value } })} className="mt-1 w-full p-2 border rounded-lg" /></label></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border p-4 space-y-3"><h5 className="text-xs font-black flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" />Filters</h5>
          <div className="grid grid-cols-[1fr_130px_1fr_auto] gap-2"><select aria-label="Filter field" value={filterDraft.field} onChange={event => setFilterDraft({ ...filterDraft, field: event.target.value })} className="p-2 border rounded text-xs">{fields.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select><select aria-label="Filter operator" value={filterDraft.operator} onChange={event => setFilterDraft({ ...filterDraft, operator: event.target.value as ReportFilterDefinition['operator'] })} className="p-2 border rounded text-xs"><option value="equals">Equals</option><option value="not_equals">Not equal</option><option value="contains">Contains</option><option value="is_true">Is true</option><option value="is_false">Is false</option><option value="is_empty">Is empty</option><option value="not_empty">Not empty</option></select><input aria-label="Filter value" value={String(filterDraft.value ?? '')} disabled={['is_true','is_false','is_empty','not_empty'].includes(filterDraft.operator)} onChange={event => setFilterDraft({ ...filterDraft, value: event.target.value })} className="p-2 border rounded text-xs" /><button type="button" aria-label="Add filter" onClick={() => setDefinition({ ...definition, filters: [...definition.filters, filterDraft] })} className="p-2 bg-slate-900 text-white rounded"><Plus className="w-4 h-4" /></button></div>
          <div className="flex flex-wrap gap-1.5">{definition.filters.map((filterItem, index) => <button key={`${filterItem.field}-${index}`} type="button" onClick={() => setDefinition({ ...definition, filters: definition.filters.filter((_, itemIndex) => itemIndex !== index) })} className="px-2 py-1 rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-900">{fields.find(item => item.id === filterItem.field)?.label} {filterItem.operator.replace('_',' ')} {String(filterItem.value ?? '')} ×</button>)}</div>
        </div>

        <div className="bg-white rounded-xl border p-4"><h5 className="text-xs font-black mb-3 flex items-center gap-1.5"><LayoutList className="w-3.5 h-3.5" />Columns and Order</h5><div className="max-h-48 overflow-y-auto space-y-1">{fields.map(item => { const selected = definition.columns.includes(item.id); return <div key={item.id} className="flex items-center gap-2 text-xs"><label className="flex-1 flex items-center gap-2"><input type="checkbox" checked={selected} onChange={() => toggleColumn(item.id)} />{item.label}</label>{selected && <><button type="button" aria-label={`Move ${item.label} up`} onClick={() => moveColumn(item.id,-1)} className="p-1"><ArrowUp className="w-3 h-3" /></button><button type="button" aria-label={`Move ${item.label} down`} onClick={() => moveColumn(item.id,1)} className="p-1"><ArrowDown className="w-3 h-3" /></button></>}</div>; })}</div></div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3"><label className="text-xs font-bold">Grouping<select aria-label="Report grouping" value={definition.grouping || ''} onChange={event => setDefinition({ ...definition, grouping: event.target.value })} className="mt-1 w-full p-2 border rounded bg-white"><option value="">None</option>{fields.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="text-xs font-bold">Primary Sort<select aria-label="Primary report sort" value={definition.sorting[0]?.field || fields[0].id} onChange={event => setDefinition({ ...definition, sorting: [{ field: event.target.value, direction: definition.sorting[0]?.direction || 'asc', naturalRoom: event.target.value === 'room' }] })} className="mt-1 w-full p-2 border rounded bg-white">{fields.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="text-xs font-bold">Direction<select value={definition.sorting[0]?.direction || 'asc'} onChange={event => setDefinition({ ...definition, sorting: [{ ...definition.sorting[0], field: definition.sorting[0]?.field || fields[0].id, direction: event.target.value as 'asc'|'desc' }] })} className="mt-1 w-full p-2 border rounded bg-white"><option value="asc">Ascending</option><option value="desc">Descending</option></select></label><label className="text-xs font-bold">Layout<select aria-label="Report layout" value={definition.layout} onChange={event => setDefinition({ ...definition, layout: event.target.value as ReportDefinition['layout'] })} className="mt-1 w-full p-2 border rounded bg-white"><option value="auto">Auto</option><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label className="text-xs font-bold">Density<select aria-label="Report density" value={definition.density} onChange={event => setDefinition({ ...definition, density: event.target.value as ReportDefinition['density'] })} className="mt-1 w-full p-2 border rounded bg-white"><option value="standard">Standard</option><option value="compact">Compact</option></select></label></div>

      <div className={`rounded-xl border p-3 flex flex-wrap items-center justify-between gap-3 ${model.rows.length === 0 ? 'bg-rose-50 border-rose-200' : model.largeReport ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'}`}><div><strong className="text-sm">{model.rows.length} matching records · ~{model.estimatedPages} page{model.estimatedPages === 1 ? '' : 's'}</strong><p className="text-[11px] text-slate-600">{model.filterSummary}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={save} className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white inline-flex items-center gap-1"><Save className="w-3.5 h-3.5" />Save Preset</button>{['residents','shifts','rooms','wound_supplies','care_catalog','unit_tasks'].includes(definition.dataSource) && <button type="button" disabled={model.rows.length === 0} onClick={exportCsv} className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white inline-flex items-center gap-1 disabled:opacity-40"><Download className="w-3.5 h-3.5" />CSV</button>}<button type="button" disabled={model.rows.length === 0 || definition.columns.length === 0} onClick={() => preview(definition)} className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold disabled:opacity-40">Preview Report</button></div></div>

      {userPresets.length > 0 && <div className="bg-white border rounded-xl p-4"><h5 className="text-xs font-black mb-2">My Presets</h5><div className="space-y-2">{userPresets.map(saved => <div key={saved.id} className="flex items-center gap-2 border-b last:border-0 py-2"><span className="flex-1 text-xs font-bold">{saved.name}</span><button type="button" onClick={() => preview(saved)} className="px-2 py-1 text-xs border rounded">Preview</button><button type="button" onClick={() => { setDefinition({ ...saved, category: 'Custom', description: 'Saved user report preset.', system: false }); setBuilderOpen(true); }} className="px-2 py-1 text-xs border rounded">Edit / Rename</button><button type="button" aria-label={`Duplicate ${saved.name}`} onClick={() => { saveUserPreset({ ...saved, id: undefined, name: `${saved.name} Copy` }); setPresetRevision(value=>value+1); }} className="p-1.5"><Copy className="w-3.5 h-3.5" /></button><button type="button" aria-label={`Delete ${saved.name}`} onClick={() => { deleteUserPreset(saved.id); setPresetRevision(value=>value+1); }} className="p-1.5 text-rose-700"><Trash2 className="w-3.5 h-3.5" /></button></div>)}</div></div>}
    </div>}

    {message && <div role="alert" className="mx-4 mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-800">{message}</div>}
    {largePending && <div role="dialog" aria-modal="true" className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl max-w-md p-5"><AlertTriangle className="w-7 h-7 text-amber-600" /><h4 className="font-black mt-2">Large Report Warning</h4><p className="text-sm mt-2">This report is estimated at {largePending.estimatedPages} pages. Review the selected filters before printing.</p><div className="flex justify-end gap-2 mt-5"><button type="button" onClick={() => setLargePending(null)} className="px-3 py-2 border rounded-lg text-xs font-bold">Back to Filters</button><button type="button" onClick={() => { const report=largePending; setLargePending(null); onPreview({type:'custom_report',model:report}); }} className="px-3 py-2 bg-amber-700 text-white rounded-lg text-xs font-bold">Preview Anyway</button></div></div></div>}
  </section>;
};
