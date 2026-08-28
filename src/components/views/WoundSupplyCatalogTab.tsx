import React, { useMemo, useState } from 'react';
import { Check, Edit2, PackagePlus, Plus, Search } from 'lucide-react';
import { db } from '../../db';
import { WoundSupplyLocalStatus, WoundSupplyProduct } from '../../types';
import { matchesWoundProductSearch, WOUND_SUPPLY_CATALOG_DESCRIPTION, WOUND_SUPPLY_CATALOG_DISCLAIMER } from '../../data/woundSupplyCatalog';

const EMPTY_PRODUCT: Omit<WoundSupplyProduct, 'id' | 'provenance'> = {
  productFamily: '', productName: '', manufacturer: '', category: '', size: '', unit: 'Each', packageSize: '', supplierItemNumber: '',
  isFacilityStock: false, defaultReorderLevel: undefined, isActive: true, notes: '', localFormularyStatus: 'not_stocked',
};

export const WoundSupplyCatalogTab: React.FC<{ onShowFeedback?: (type: 'success' | 'error', message: string) => void }> = ({ onShowFeedback }) => {
  const [products, setProducts] = useState(() => db.getState().woundSupplyCatalog);
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'stock'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editor, setEditor] = useState(EMPTY_PRODUCT);
  const refresh = () => setProducts([...db.getState().woundSupplyCatalog]);

  const filtered = useMemo(() => products
    .filter(product => showInactive || product.isActive)
    .filter(product => stockFilter === 'all' || product.isFacilityStock)
    .filter(product => matchesWoundProductSearch(product, query))
    .sort((a, b) => a.productName.localeCompare(b.productName) || (a.size || '').localeCompare(b.size || '')), [products, query, stockFilter, showInactive]);

  const openNew = (base?: WoundSupplyProduct) => {
    setEditingId(null);
    setEditor(base ? {
      productFamily: base.productFamily, productName: '', manufacturer: base.manufacturer, category: base.category,
      size: '', unit: base.unit, packageSize: '', supplierItemNumber: '', isFacilityStock: base.isFacilityStock,
      defaultReorderLevel: base.defaultReorderLevel, isActive: true, notes: '', localFormularyStatus: base.localFormularyStatus,
    } : { ...EMPTY_PRODUCT });
  };

  const openEdit = (product: WoundSupplyProduct) => {
    setEditingId(product.id);
    setEditor({ ...product });
  };

  const save = () => {
    const family = editor.productFamily.trim();
    const size = editor.size?.trim();
    const productName = editor.productName.trim() || [family, size].filter(Boolean).join(' ');
    if (!family || !productName || !editor.manufacturer.trim() || !editor.category.trim() || !editor.unit.trim()) {
      onShowFeedback?.('error', 'Product family, product name, manufacturer, category, and unit are required.');
      return;
    }
    const duplicate = products.find(product => product.id !== editingId && product.productName.trim().toLowerCase() === productName.toLowerCase() && (product.size || '').trim().toLowerCase() === (size || '').toLowerCase() && product.manufacturer.trim().toLowerCase() === editor.manufacturer.trim().toLowerCase());
    if (duplicate) {
      onShowFeedback?.('error', 'That exact product, manufacturer, and size already exists. Edit the existing record instead.');
      return;
    }
    const payload = { ...editor, productFamily: family, productName, size: size || undefined, manufacturer: editor.manufacturer.trim(), category: editor.category.trim(), unit: editor.unit.trim(), packageSize: editor.packageSize?.trim() || undefined, supplierItemNumber: editor.supplierItemNumber?.trim() || undefined, notes: editor.notes?.trim() || undefined };
    if (editingId) db.updateWoundSupplyProduct(editingId, payload);
    else db.addWoundSupplyProduct(payload);
    refresh();
    setEditingId(null);
    setEditor(EMPTY_PRODUCT);
    onShowFeedback?.('success', editingId ? 'Wound product updated.' : 'Local wound product added.');
  };

  const toggleStock = (product: WoundSupplyProduct) => {
    const isFacilityStock = !product.isFacilityStock;
    db.updateWoundSupplyProduct(product.id, { isFacilityStock, localFormularyStatus: isFacilityStock ? 'approved_stocked' : 'not_stocked' });
    refresh();
  };

  return <div className="space-y-5">
    <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div><h3 className="text-base font-black text-slate-900">{WOUND_SUPPLY_CATALOG_DESCRIPTION}</h3><p className="text-xs text-slate-600 mt-1 max-w-3xl">{WOUND_SUPPLY_CATALOG_DISCLAIMER}</p></div>
        <button type="button" onClick={() => openNew()} className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold"><Plus className="w-3.5 h-3.5" />Add Product</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
        <label className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input aria-label="Search wound supply catalog" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product, family, brand, category or size (for example mep or 10x20)" className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm" /></label>
        <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-50">{(['all', 'stock'] as const).map(value => <button key={value} type="button" onClick={() => setStockFilter(value)} className={`px-3 py-1.5 rounded-md text-xs font-bold ${stockFilter === value ? 'bg-white shadow text-teal-800' : 'text-slate-500'}`}>{value === 'all' ? 'All Catalog Products' : 'Facility Stock Only'}</button>)}</div>
        <label className="flex items-center gap-2 px-3 text-xs font-semibold"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />Show inactive</label>
      </div>
    </section>

    <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700">{filtered.length} product/size record{filtered.length === 1 ? '' : 's'}</div>
      <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        {filtered.map(product => <div key={product.id} className={`p-3 grid grid-cols-1 lg:grid-cols-[1fr_150px_130px_170px] gap-3 items-center ${!product.isActive ? 'opacity-55' : ''}`}>
          <div><div className="flex flex-wrap items-center gap-1.5"><strong className="text-sm text-slate-900">{product.productName}</strong>{product.provenance === 'seeded' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">SEEDED</span>}</div><p className="text-[11px] text-slate-500">{product.manufacturer} · {product.category} · {product.size || 'Size not specified'} · {product.unit}</p>{product.supplierItemNumber && <p className="text-[10px] text-slate-400">Item: {product.supplierItemNumber}</p>}</div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={product.isFacilityStock} onChange={() => toggleStock(product)} />Facility Stock</label>
          <span className="text-[10px] font-bold uppercase text-slate-500">{(product.localFormularyStatus || 'not_stocked').replace(/_/g, ' ')}</span>
          <div className="flex justify-end gap-1.5"><button type="button" onClick={() => openNew(product)} className="p-2 border border-slate-300 rounded-md" title="Add another size"><PackagePlus className="w-3.5 h-3.5" /></button><button type="button" onClick={() => openEdit(product)} className="p-2 border border-slate-300 rounded-md" title="Edit product"><Edit2 className="w-3.5 h-3.5" /></button><button type="button" onClick={() => { db.updateWoundSupplyProduct(product.id, { isActive: !product.isActive, localFormularyStatus: product.isActive ? 'inactive' : 'not_stocked' }); refresh(); }} className={`px-2.5 py-1.5 rounded-md text-[10px] font-bold ${product.isActive ? 'border border-rose-300 text-rose-700' : 'bg-emerald-700 text-white'}`}>{product.isActive ? 'Deactivate' : 'Reactivate'}</button></div>
        </div>)}
      </div>
    </section>

    {(editingId !== null || editor !== EMPTY_PRODUCT) && <section className="bg-white rounded-xl border-2 border-teal-200 p-5 shadow-sm space-y-4">
      <h4 className="text-sm font-black text-slate-900">{editingId ? 'Edit Wound Product' : 'Add Wound Product / Size'}</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field label="Product Family" value={editor.productFamily} onChange={value => setEditor({ ...editor, productFamily: value })} />
        <Field label="Product Name" value={editor.productName} onChange={value => setEditor({ ...editor, productName: value })} />
        <Field label="Manufacturer / Brand" value={editor.manufacturer} onChange={value => setEditor({ ...editor, manufacturer: value })} />
        <Field label="Dressing Category" value={editor.category} onChange={value => setEditor({ ...editor, category: value })} />
        <Field label="Size" value={editor.size || ''} onChange={value => setEditor({ ...editor, size: value })} />
        <Field label="Unit" value={editor.unit} onChange={value => setEditor({ ...editor, unit: value })} />
        <Field label="Package Size (Optional)" value={editor.packageSize || ''} onChange={value => setEditor({ ...editor, packageSize: value })} />
        <Field label="Supplier / Item Number" value={editor.supplierItemNumber || ''} onChange={value => setEditor({ ...editor, supplierItemNumber: value })} />
        <Field label="Default Reorder Level" type="number" value={editor.defaultReorderLevel?.toString() || ''} onChange={value => setEditor({ ...editor, defaultReorderLevel: value ? Number(value) : undefined })} />
        <label className="text-xs font-bold text-slate-700">Local/Formulary Status<select value={editor.localFormularyStatus || 'not_stocked'} onChange={event => setEditor({ ...editor, localFormularyStatus: event.target.value as WoundSupplyLocalStatus, isFacilityStock: event.target.value === 'approved_stocked', isActive: event.target.value !== 'inactive' })} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-sm"><option value="approved_stocked">Approved / Stocked</option><option value="special_order">Special Order</option><option value="not_stocked">Not Stocked</option><option value="inactive">Inactive</option></select></label>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 self-end pb-2"><input type="checkbox" checked={editor.isFacilityStock} onChange={event => setEditor({ ...editor, isFacilityStock: event.target.checked, localFormularyStatus: event.target.checked ? 'approved_stocked' : editor.localFormularyStatus === 'approved_stocked' ? 'not_stocked' : editor.localFormularyStatus })} />Facility Stock Item</label>
      </div>
      <label className="block text-xs font-bold text-slate-700">Notes<textarea value={editor.notes || ''} onChange={event => setEditor({ ...editor, notes: event.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></label>
      <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditingId(null); setEditor(EMPTY_PRODUCT); }} className="px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold">Cancel</button><button type="button" onClick={save} className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-bold"><Check className="w-3.5 h-3.5" />Save Product</button></div>
    </section>}
  </div>;
};

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; type?: string }> = ({ label, value, onChange, type = 'text' }) => <label className="text-xs font-bold text-slate-700">{label}<input type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></label>;
