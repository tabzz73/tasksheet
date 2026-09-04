import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { Modal } from '../common/Modal';
import { FormSection } from '../common/FormSection';
import { db } from '../../db';
import { SavedPrintPackage, SavedPrintPackageItem, SavedPrintPackageItemType } from '../../types';

interface SavePrintPackageModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Pass an existing package to edit it in place, or a name-only seed
   *  (from "Duplicate") to start a new package pre-filled with its items.
   *  Omit entirely to start from a blank package. */
  initialPackage?: SavedPrintPackage | null;
  /** Bump this (e.g. a counter) each time the modal is opened, so the form
   *  re-seeds correctly even when two different "Duplicate" seeds share the
   *  same empty id. Falls back to initialPackage.id if omitted. */
  seedKey?: string | number;
  onSaved: (pkg: SavedPrintPackage) => void;
}

const ITEM_TYPE_LABELS: Record<SavedPrintPackageItemType, string> = {
  shift_document: 'Shift TaskSheet',
  bathing_grid: 'Bathing & Hygiene Schedule Grid',
  wound_schedule: 'Wound & Dressing Treatment Schedule',
  fyi_binder: 'FYI Binder',
  blank_template: 'Blank TaskSheet Template',
};

function newItemId() {
  return `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const SavePrintPackageModal: React.FC<SavePrintPackageModalProps> = ({
  isOpen,
  onClose,
  initialPackage,
  seedKey,
  onSaved,
}) => {
  const state = db.getState();
  const activeShifts = state.shifts
    .filter(s => s.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const [name, setName] = useState(initialPackage?.name || '');
  const [items, setItems] = useState<SavedPrintPackageItem[]>(initialPackage?.items || []);
  const [addType, setAddType] = useState<SavedPrintPackageItemType>('shift_document');
  const [error, setError] = useState('');

  // Re-seed local state whenever a different package (or a fresh "new") is opened.
  const effectiveSeedKey = seedKey ?? initialPackage?.id ?? null;
  const [seededFor, setSeededFor] = useState(effectiveSeedKey);
  if (isOpen && effectiveSeedKey !== seededFor) {
    setSeededFor(effectiveSeedKey);
    setName(initialPackage?.name || '');
    setItems(initialPackage?.items || []);
    setError('');
  }

  if (!isOpen) return null;

  const isEditing = !!initialPackage?.id;

  const addItem = () => {
    const item: SavedPrintPackageItem = { id: newItemId(), type: addType };
    if (addType === 'shift_document') item.shiftId = activeShifts[0]?.id;
    setItems(prev => [...prev, item]);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const moveItem = (index: number, direction: -1 | 1) => {
    setItems(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const updateItem = (id: string, updates: Partial<SavedPrintPackageItem>) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...updates } : i)));
  };

  const handleSave = () => {
    if (!name.trim()) { setError('Give the package a name.'); return; }
    if (items.length === 0) { setError('Add at least one document.'); return; }
    if (items.some(i => i.type === 'shift_document' && !i.shiftId)) {
      setError('Choose a shift for every Shift TaskSheet item.');
      return;
    }
    const now = new Date().toISOString();
    const pkg: SavedPrintPackage = {
      id: initialPackage?.id || `spp_${Date.now()}`,
      name: name.trim(),
      items,
      createdAt: initialPackage?.createdAt || now,
      updatedAt: now,
    };
    onSaved(pkg);
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
      <button type="button" onClick={handleSave} className="btn btn-accent">
        {isEditing ? 'Save Changes' : 'Create Package'}
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Print Package' : 'New Print Package'}
      subtitle="Combine existing TaskSheet reports into one repeatable print job."
      maxWidth="lg"
      footer={footer}
    >
      <div className="space-y-5">
        <FormSection title="Package Name">
          <input
            id="package-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Morning Charge Package"
            aria-label="Package Name"
            className="w-full px-3 h-10 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent"
          />
        </FormSection>

        <FormSection title="Documents">
          {items.length === 0 ? (
            <div className="p-4 bg-panel-sunken border border-hairline-strong rounded-control text-center text-xs text-muted">
              No documents yet. Add one below.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li key={item.id} className="flex items-center gap-2 p-2.5 bg-panel-sunken border border-hairline-strong rounded-control">
                  <div className="flex flex-col shrink-0">
                    <button
                      type="button"
                      onClick={() => moveItem(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move ${ITEM_TYPE_LABELS[item.type]} up`}
                      className="p-0.5 text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveItem(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label={`Move ${ITEM_TYPE_LABELS[item.type]} down`}
                      className="p-0.5 text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-ink">{ITEM_TYPE_LABELS[item.type]}</p>

                    {item.type === 'shift_document' && (
                      <select
                        aria-label={`Shift for ${ITEM_TYPE_LABELS[item.type]} item ${index + 1}`}
                        value={item.shiftId || ''}
                        onChange={e => updateItem(item.id, { shiftId: e.target.value })}
                        className="mt-1 w-full px-2 h-8 bg-panel border border-hairline-strong rounded-control text-xs"
                      >
                        {activeShifts.length === 0 && <option value="">No active shifts</option>}
                        {activeShifts.map(s => (
                          <option key={s.id} value={s.id}>{s.shortCode ? `${s.shortCode} — ` : ''}{s.name}</option>
                        ))}
                      </select>
                    )}

                    {item.type === 'fyi_binder' && (
                      <select
                        aria-label={`Scope for ${ITEM_TYPE_LABELS[item.type]} item ${index + 1}`}
                        value={item.scopeShiftId || ''}
                        onChange={e => updateItem(item.id, { scopeShiftId: e.target.value || undefined })}
                        className="mt-1 w-full px-2 h-8 bg-panel border border-hairline-strong rounded-control text-xs"
                      >
                        <option value="">Facility-wide (no scope)</option>
                        {activeShifts.map(s => (
                          <option key={s.id} value={s.id}>{s.shortCode ? `${s.shortCode} — ` : ''}{s.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${ITEM_TYPE_LABELS[item.type]} item ${index + 1}`}
                    className="p-1.5 text-faint hover:text-danger rounded-control transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </FormSection>

        <div className="flex items-center gap-2">
          <select
            aria-label="Document type to add"
            value={addType}
            onChange={e => setAddType(e.target.value as SavedPrintPackageItemType)}
            className="flex-1 px-2.5 h-9 bg-panel border border-hairline-strong rounded-control text-xs font-semibold"
          >
            {(Object.keys(ITEM_TYPE_LABELS) as SavedPrintPackageItemType[]).map(type => (
              <option key={type} value={type}>{ITEM_TYPE_LABELS[type]}</option>
            ))}
          </select>
          <button type="button" onClick={addItem} className="btn btn-secondary shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Document</span>
          </button>
        </div>

        {error && <p className="text-xs font-semibold text-danger">{error}</p>}
      </div>
    </Modal>
  );
};
