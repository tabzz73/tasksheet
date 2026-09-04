import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { ResidentCombobox } from '../common/ResidentCombobox';
import { db } from '../../db';
import { getTodayLocalDateString } from '../../services/recurrence';
import { describeAttentionRouting } from '../../services/routingPreview';
import { AttentionScope } from '../../types';

interface AddAttentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** The app's current operational date (Dashboard's Today/Tomorrow
   *  selection) — used as the default start date instead of the raw
   *  wall-clock date. Falls back to the real wall-clock date if omitted. */
  currentDate?: string;
}

const SCOPE_LABELS: Record<AttentionScope, string> = {
  resident: 'Resident',
  unit: 'Unit',
  site: 'Site',
};

const SCOPE_HINTS: Record<AttentionScope, string> = {
  resident: 'A temporary situation about one resident — e.g. "Temporary increased exit-seeking concern."',
  unit: 'A temporary situation affecting the unit — e.g. "Internet unavailable" or "Dining room closed."',
  site: 'A temporary situation affecting the whole site — e.g. "Fire drill" or "Entrance closed for maintenance."',
};

export const AddResidentAttentionModal: React.FC<AddAttentionModalProps> = ({ isOpen, onClose, onSaved, currentDate }) => {
  const state = db.getState();
  const activeResidents = state.residents.filter(r => r.status === 'active').sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));
  const defaultStartDate = currentDate || getTodayLocalDateString();

  const [scope, setScope] = useState<AttentionScope>('resident');
  const [residentId, setResidentId] = useState('');
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [showOnDashboard, setShowOnDashboard] = useState(true);
  const [showInHuddle, setShowInHuddle] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setScope('resident');
    setResidentId('');
    setTitle(''); setDetails(''); setStartDate(defaultStartDate); setEndDate('');
    setPriority('normal'); setShowOnDashboard(true); setShowInHuddle(false); setError('');
  };

  const handleSave = () => {
    if (!title.trim()) { setError('Enter a title for this situation.'); return; }
    if (scope === 'resident' && !residentId) { setError('Select a resident.'); return; }
    if (endDate && endDate < startDate) { setError('End date must be on or after the start date.'); return; }
    try {
      db.addAttentionItem({
        scope,
        residentId: scope === 'resident' ? residentId : undefined,
        title: title.trim(),
        details: details.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
        priority,
        showOnDashboard,
        showInHuddle,
      });
      reset();
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const appearsIn = describeAttentionRouting(state, { showOnDashboard, showInHuddle });

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Add Attention" subtitle="A temporary situation staff need to be aware of — not a to-do item." maxWidth="md">
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Scope</label>
          <div className="grid grid-cols-3 gap-2">
            {(['resident', 'unit', 'site'] as AttentionScope[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`h-9 rounded-control text-sm font-semibold border transition-colors ${scope === s ? 'bg-accent text-white border-accent' : 'bg-panel border-hairline-strong text-ink-soft hover:bg-surface-hover'}`}
              >
                {SCOPE_LABELS[s]}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted">{SCOPE_HINTS[scope]}</p>
        </div>

        {scope === 'resident' && (
          <div>
            <label htmlFor="attn-resident" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Resident</label>
            <ResidentCombobox
              id="attn-resident"
              residents={activeResidents}
              value={residentId}
              onChange={setResidentId}
              placeholder="Search resident..."
              required
              error={Boolean(error) && !residentId}
            />
          </div>
        )}

        <div>
          <label htmlFor="attn-title" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Title</label>
          <input id="attn-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={scope === 'resident' ? 'e.g. Temporary increased exit-seeking concern' : scope === 'unit' ? 'e.g. Unit internet unavailable' : 'e.g. Fire drill'} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
        </div>

        <div>
          <label htmlFor="attn-details" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Details (optional)</label>
          <input id="attn-details" type="text" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="One short line of context" className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="attn-start" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Starts</label>
            <input id="attn-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label htmlFor="attn-end" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Ends (optional)</label>
            <input id="attn-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
          </div>
        </div>

        <div>
          <label htmlFor="attn-priority" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Priority</label>
          <select id="attn-priority" value={priority} onChange={(e) => setPriority(e.target.value as 'normal' | 'high' | 'urgent')} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm bg-panel focus:ring-2 focus:ring-accent">
            <option value="normal">Normal</option>
            <option value="high">High (Highlighted)</option>
            <option value="urgent">Urgent Banner</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-soft">
            <input type="checkbox" checked={showOnDashboard} onChange={(e) => setShowOnDashboard(e.target.checked)} className="h-3.5 w-3.5 rounded text-accent focus:ring-accent" />
            Show on Dashboard
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-soft">
            <input type="checkbox" checked={showInHuddle} onChange={(e) => setShowInHuddle(e.target.checked)} className="h-3.5 w-3.5 rounded text-accent focus:ring-accent" />
            Show in Huddle
          </label>
        </div>

        <p className="text-[11px] text-muted">
          <span className="font-bold text-ink-soft">Appears in: </span>{appearsIn.join(' · ')}
        </p>

        {error && <p className="text-xs font-semibold text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline">
          <button type="button" onClick={() => { reset(); onClose(); }} className="btn btn-secondary">Cancel</button>
          <button type="button" onClick={handleSave} className="btn btn-accent">Add Attention Item</button>
        </div>
      </div>
    </Modal>
  );
};
