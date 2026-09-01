import React, { useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { db } from '../../db';
import { ServiceCoverageDefinition } from '../../types';
import { getCoverageDefinitions } from '../../services/coverage';

export const ServiceCoverageSettingsTab: React.FC<{ onShowFeedback?: (type: 'success' | 'error', message: string) => void }> = ({ onShowFeedback }) => {
  const [definitions, setDefinitions] = useState(() => getCoverageDefinitions(db.getState().settings.serviceCoverageDefinitions));
  const [name, setName] = useState(''); const [shortCode, setShortCode] = useState(''); const [error, setError] = useState('');
  const persist = (next: ServiceCoverageDefinition[]) => { db.updateSettings({ serviceCoverageDefinitions: next }); setDefinitions(next.filter(item => item.isActive !== false).sort((a, b) => a.sortOrder - b.sortOrder)); };
  const add = (event: React.FormEvent) => {
    event.preventDefault(); const cleanName = name.trim(); const cleanCode = shortCode.trim().toUpperCase(); setError('');
    if (!cleanName || !cleanCode) { setError('Display name and short code are required.'); return; }
    const all = db.getState().settings.serviceCoverageDefinitions || [];
    if (all.some(item => item.name.toLowerCase() === cleanName.toLowerCase())) { setError('Another coverage classification already uses this name.'); return; }
    if (all.some(item => item.shortCode.toLowerCase() === cleanCode.toLowerCase())) { setError('Another coverage classification already uses this short code.'); return; }
    if (cleanCode.length > 8) { setError('Use a compact print short code of 8 characters or fewer.'); return; }
    const item: ServiceCoverageDefinition = { id: crypto.randomUUID(), code: `CUSTOM_${cleanCode.replace(/[^A-Z0-9]+/g, '_')}`, name: cleanName, shortCode: cleanCode, isExceptional: true, isActive: true, sortOrder: Math.max(0, ...all.map(entry => entry.sortOrder)) + 1 };
    persist([...all, item]); setName(''); setShortCode(''); onShowFeedback?.('success', `${cleanName} coverage added.`);
  };
  const deactivate = (item: ServiceCoverageDefinition) => {
    const state = db.getState(); const used = state.residentTasks.filter(task => task.serviceCoverage?.type === item.code).length;
    if (used) { setError(`${item.name} is referenced by ${used} assignment(s). It cannot be deleted; deactivation preserves historical labels.`); }
    const all = state.settings.serviceCoverageDefinitions || definitions; persist(all.map(entry => entry.id === item.id ? { ...entry, isActive: false } : entry));
    onShowFeedback?.('success', `${item.name} deactivated. Existing assignment snapshots remain readable.`);
  };
  return <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
    <div><h3 className="text-base font-bold text-slate-900">Service Coverage</h3><p className="mt-1 text-xs text-slate-500">Classify why resident services are provided. This is operational classification only—no prices, invoices, or payment details.</p></div>
    {error && <div role="alert" className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-950"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div>}
    <div className="grid gap-2">{definitions.map(item => <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"><div><p className="text-sm font-bold text-slate-900">{item.icon ? `${item.icon} ` : ''}{item.name}</p><p className="text-[11px] text-slate-500">Code: {item.code} · Print: {item.shortCode || 'No indicator'}{item.isSystem ? ' · Built in' : ' · Custom'}</p></div>{item.code !== 'FUNDED' && <button type="button" onClick={() => deactivate(item)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Deactivate</button>}</div>)}</div>
    <form onSubmit={add} className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-slate-600">Add Custom Classification</p><div className="mt-3 grid gap-3 sm:grid-cols-[1fr_9rem_auto]"><input value={name} onChange={event => setName(event.target.value)} placeholder="Display name" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /><input value={shortCode} maxLength={8} onChange={event => setShortCode(event.target.value)} placeholder="Short code" className="rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase" /><button className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />Add</button></div></form>
  </div>;
};
