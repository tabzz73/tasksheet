import React, { useMemo, useState } from 'react';
import { Package, Plus, Search, X } from 'lucide-react';
import { db } from '../../db';
import { WoundSupplyProduct, WoundSupplySelection } from '../../types';
import { matchesWoundProductSearch } from '../../data/woundSupplyCatalog';

export const WoundSupplyPicker: React.FC<{ value: WoundSupplySelection[]; onChange: (value: WoundSupplySelection[]) => void }> = ({ value, onChange }) => {
  const catalog = db.getState().woundSupplyCatalog;
  const hasFacilityStock = catalog.some(product => product.isActive && product.isFacilityStock);
  const [mode, setMode] = useState<'all' | 'stock'>(hasFacilityStock ? 'stock' : 'all');
  const [query, setQuery] = useState('');
  const selectedIds = new Set(value.map(item => item.catalogId).filter(Boolean));
  const results = useMemo(() => catalog
    .filter(product => product.isActive)
    .filter(product => mode === 'all' || product.isFacilityStock)
    .filter(product => matchesWoundProductSearch(product, query))
    .sort((a, b) => Number(b.isFacilityStock) - Number(a.isFacilityStock) || a.productName.localeCompare(b.productName)), [catalog, mode, query]);

  const add = (product: WoundSupplyProduct) => {
    if (selectedIds.has(product.id)) return;
    onChange([...value, {
      id: `wound-supply-${product.id}`,
      catalogId: product.id,
      name: product.productName,
      productFamily: product.productFamily,
      manufacturer: product.manufacturer,
      category: product.category,
      unitSize: product.size,
      unitOfMeasure: product.unit,
    }]);
  };

  return <div className="space-y-2">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Supplies</label>
      <div className="flex rounded-md border border-slate-300 p-0.5 bg-slate-50">{(['stock', 'all'] as const).map(option => <button key={option} type="button" onClick={() => setMode(option)} className={`px-2 py-1 rounded text-[10px] font-bold ${mode === option ? 'bg-white shadow text-teal-800' : 'text-slate-500'}`}>{option === 'stock' ? 'Facility Stock Only' : 'All Catalog Products'}</button>)}</div>
    </div>
    {!hasFacilityStock && mode === 'all' && <p className="text-[11px] text-amber-700">No products are marked as facility stock yet. Showing the full catalog; configure stock items in Settings → Wound Supply Catalog.</p>}
    <label className="relative block"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input aria-label="Search wound products" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search mep, Biatain, manufacturer, category, or 10x20" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" /></label>

    {value.length > 0 && <div className="space-y-1.5">{value.map((selection, index) => <div key={`${selection.catalogId || selection.name}-${index}`} className="grid grid-cols-[1fr_86px_30px] gap-2 items-center rounded-lg border border-teal-200 bg-teal-50 p-2">
      <div className="min-w-0"><div className="text-xs font-bold text-slate-900">{selection.name}</div><div className="text-[10px] text-slate-500">{[selection.manufacturer, selection.unitSize, selection.unitOfMeasure].filter(Boolean).join(' · ')}</div></div>
      <label className="text-[9px] font-bold text-slate-600">QTY / USE<input aria-label={`Quantity per use for ${selection.name}`} type="number" min="0" step="0.1" value={selection.quantityPerUse ?? ''} onChange={event => onChange(value.map((item, itemIndex) => itemIndex === index ? { ...item, quantityPerUse: event.target.value ? Number(event.target.value) : undefined } : item))} className="mt-0.5 w-full px-2 py-1 border border-slate-300 rounded bg-white text-xs" placeholder="Optional" /></label>
      <button type="button" aria-label={`Remove ${selection.name}`} onClick={() => onChange(value.filter((_, itemIndex) => itemIndex !== index))} className="p-1.5 text-rose-700"><X className="w-4 h-4" /></button>
    </div>)}</div>}

    <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
      <span>{results.length} matching active product{results.length === 1 ? '' : 's'}</span>
      <span>Scroll to view the complete list</span>
    </div>
    <div className="max-h-56 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 divide-y divide-slate-100 bg-white pr-0.5">
      {results.length === 0 ? <div className="p-4 text-center text-xs text-slate-500">No matching active products. Add the exact local product under Settings → Wound Supply Catalog.</div> : results.map(product => <button key={product.id} type="button" disabled={selectedIds.has(product.id)} onClick={() => add(product)} className="w-full p-2.5 flex items-center justify-between gap-3 text-left hover:bg-slate-50 disabled:opacity-45">
        <span className="flex items-start gap-2 min-w-0"><Package className="w-3.5 h-3.5 text-teal-700 mt-0.5 shrink-0" /><span><strong className="block text-xs text-slate-900">{product.productName}</strong><span className="block text-[10px] text-slate-500">{product.manufacturer} · {product.category} · {product.size || 'Size not specified'}{product.isFacilityStock ? ' · STOCK' : ''}</span></span></span>
        <Plus className="w-3.5 h-3.5 text-teal-700 shrink-0" />
      </button>)}
    </div>
  </div>;
};
