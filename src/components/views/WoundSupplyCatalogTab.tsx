import React, { useMemo, useState } from 'react';
import { Check, Edit2, PackagePlus, Plus, Search } from 'lucide-react';
import { db } from '../../db';
import { WoundSupplyLocalStatus, WoundSupplyProduct } from '../../types';
import { matchesWoundProductSearch, WOUND_SUPPLY_CATALOG_DESCRIPTION, WOUND_SUPPLY_CATALOG_DISCLAIMER } from '../../data/woundSupplyCatalog';
import { Modal } from '../common/Modal';

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
  const editorOpen = editingId !== null || editor !== EMPTY_PRODUCT;
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
    <section className="bg-panel rounded-surface border border-hairline-strong p-5 space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div><h3 className="text-base font-black text-ink">{WOUND_SUPPLY_CATALOG_DESCRIPTION}</h3><p className="text-xs text-ink-soft mt-1 max-w-3xl">{WOUND_SUPPLY_CATALOG_DISCLAIMER}</p></div>
        <button type="button" onClick={() => openNew()} aria-expanded={editorOpen && editingId === null} aria-controls="wound-product-editor" className="inline-flex items-center gap-1.5 px-3 py-2 bg-accent-strong text-white rounded-control text-xs font-bold"><Plus className="w-3.5 h-3.5" />Add Product</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2">
        <label className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-faint" /><input aria-label="Search wound supply catalog" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search product, family, brand, category or size (for example mep or 10x20)" className="w-full pl-9 pr-3 py-2 border border-hairline-strong rounded-control text-sm" /></label>
        <div className="flex rounded-control border border-hairline-strong p-0.5 bg-panel-sunken">{(['all', 'stock'] as const).map(value => <button key={value} type="button" onClick={() => setStockFilter(value)} className={`px-3 py-1.5 rounded-control text-xs font-bold ${stockFilter === value ? 'bg-panel shadow text-accent-strong' : 'text-muted'}`}>{value === 'all' ? 'All Catalog Products' : 'Facility Stock Only'}</button>)}</div>
        <label className="flex items-center gap-2 px-3 text-xs font-semibold"><input type="checkbox" checked={showInactive} onChange={event => setShowInactive(event.target.checked)} />Show inactive</label>
      </div>
    </section>

    <section className="bg-panel rounded-surface border border-hairline-strong overflow-hidden">
      <div className="px-4 py-2.5 bg-panel-sunken border-b border-hairline-strong text-xs font-bold text-ink-soft">{filtered.length} product/size record{filtered.length === 1 ? '' : 's'}</div>
      <div className="divide-y divide-hairline max-h-[520px] overflow-y-auto">
        {filtered.map(product => <div key={product.id} className={`p-3 grid grid-cols-1 lg:grid-cols-[1fr_150px_130px_170px] gap-3 items-center ${!product.isActive ? 'opacity-55' : ''}`}>
          <div><div className="flex flex-wrap items-center gap-1.5"><strong className="text-sm text-ink">{product.productName}</strong>{product.provenance === 'seeded' && <span className="text-[9px] px-1.5 py-0.5 rounded bg-panel-sunken text-ink-soft font-bold">SEEDED</span>}</div><p className="text-[11px] text-muted">{product.manufacturer} · {product.category} · {product.size || 'Size not specified'} · {product.unit}</p>{product.supplierItemNumber && <p className="text-[10px] text-faint">Item: {product.supplierItemNumber}</p>}</div>
          <label className="flex items-center gap-2 text-xs font-bold text-ink-soft"><input type="checkbox" checked={product.isFacilityStock} onChange={() => toggleStock(product)} />Facility Stock</label>
          <span className="text-[10px] font-bold uppercase text-muted">{(product.localFormularyStatus || 'not_stocked').replace(/_/g, ' ')}</span>
          <div className="flex justify-end gap-1.5"><button type="button" onClick={() => openNew(product)} className="p-2 border border-hairline-strong rounded-control" title="Add another size" aria-label={`Add another size for ${product.productName}`}><PackagePlus className="w-3.5 h-3.5" /></button><button type="button" onClick={() => openEdit(product)} className="p-2 border border-hairline-strong rounded-control" title="Edit product" aria-label={`Edit ${product.productName}`}><Edit2 className="w-3.5 h-3.5" /></button><button type="button" onClick={() => { db.updateWoundSupplyProduct(product.id, { isActive: !product.isActive, localFormularyStatus: product.isActive ? 'inactive' : 'not_stocked' }); refresh(); }} className={`px-2.5 py-1.5 rounded-control text-[10px] font-bold ${product.isActive ? 'border border-danger text-danger' : 'bg-positive text-white'}`}>{product.isActive ? 'Deactivate' : 'Reactivate'}</button></div>
        </div>)}
      </div>
    </section>

    <Modal
      isOpen={editorOpen}
      onClose={() => { setEditingId(null); setEditor(EMPTY_PRODUCT); }}
      title={editingId ? 'Edit Wound Product' : 'Add Wound Product / Size'}
      subtitle="Configure the exact product, size, stock status, and reorder details."
      maxWidth="4xl"
    >
      <div id="wound-product-editor" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Field autoFocus label="Product Family" value={editor.productFamily} onChange={value => setEditor({ ...editor, productFamily: value })} />
        <Field label="Product Name" value={editor.productName} onChange={value => setEditor({ ...editor, productName: value })} />
        <Field label="Manufacturer / Brand" value={editor.manufacturer} onChange={value => setEditor({ ...editor, manufacturer: value })} />
        <Field label="Dressing Category" value={editor.category} onChange={value => setEditor({ ...editor, category: value })} />
        <Field label="Size" value={editor.size || ''} onChange={value => setEditor({ ...editor, size: value })} />
        <Field label="Unit" value={editor.unit} onChange={value => setEditor({ ...editor, unit: value })} />
        <Field label="Package Size (Optional)" value={editor.packageSize || ''} onChange={value => setEditor({ ...editor, packageSize: value })} />
        <Field label="Supplier / Item Number" value={editor.supplierItemNumber || ''} onChange={value => setEditor({ ...editor, supplierItemNumber: value })} />
        <Field label="Default Reorder Level" type="number" value={editor.defaultReorderLevel?.toString() || ''} onChange={value => setEditor({ ...editor, defaultReorderLevel: value ? Number(value) : undefined })} />
        <label className="text-xs font-bold text-ink-soft">Local/Formulary Status<select value={editor.localFormularyStatus || 'not_stocked'} onChange={event => setEditor({ ...editor, localFormularyStatus: event.target.value as WoundSupplyLocalStatus, isFacilityStock: event.target.value === 'approved_stocked', isActive: event.target.value !== 'inactive' })} className="mt-1 w-full px-3 py-2 border border-hairline-strong rounded-control bg-panel text-sm"><option value="approved_stocked">Approved / Stocked</option><option value="special_order">Special Order</option><option value="not_stocked">Not Stocked</option><option value="inactive">Inactive</option></select></label>
        <label className="flex items-center gap-2 text-xs font-bold text-ink-soft self-end pb-2"><input type="checkbox" checked={editor.isFacilityStock} onChange={event => setEditor({ ...editor, isFacilityStock: event.target.checked, localFormularyStatus: event.target.checked ? 'approved_stocked' : editor.localFormularyStatus === 'approved_stocked' ? 'not_stocked' : editor.localFormularyStatus })} />Facility Stock Item</label>
        </div>
        <label className="block text-xs font-bold text-ink-soft">Notes<textarea value={editor.notes || ''} onChange={event => setEditor({ ...editor, notes: event.target.value })} rows={2} className="mt-1 w-full px-3 py-2 border border-hairline-strong rounded-control text-sm" /></label>
        <div className="flex justify-end gap-2"><button type="button" onClick={() => { setEditingId(null); setEditor(EMPTY_PRODUCT); }} className="px-3 py-2 border border-hairline-strong rounded-control text-xs font-bold">Cancel</button><button type="button" onClick={save} className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent-strong text-white rounded-control text-xs font-bold"><Check className="w-3.5 h-3.5" />Save Product</button></div>
      </div>
    </Modal>
  </div>;
};

const Field: React.FC<{ label: string; value: string; onChange: (value: string) => void; type?: string; autoFocus?: boolean }> = ({ label, value, onChange, type = 'text', autoFocus }) => <label className="text-xs font-bold text-ink-soft">{label}<input data-autofocus={autoFocus || undefined} type={type} value={value} onChange={event => onChange(event.target.value)} className="mt-1 w-full px-3 py-2 border border-hairline-strong rounded-control text-sm" /></label>;
