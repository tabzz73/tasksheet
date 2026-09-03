import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../db';
import { getTodayLocalDateString } from '../../services/recurrence';

interface AddResidentAttentionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const SUGGESTED_TYPES = [
  'Behaviour Tracking',
  'Increased Falls Observation',
  'Temporary Two-Person Transfer',
  'Sleep Tracking',
  'Intake / Meal Observation',
  'Wandering / Exit-Seeking Awareness',
  'Temporary Care Change',
];

export const AddResidentAttentionModal: React.FC<AddResidentAttentionModalProps> = ({ isOpen, onClose, onSaved }) => {
  const state = db.getState();
  const activeResidents = state.residents.filter(r => r.status === 'active').sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }));

  const [residentId, setResidentId] = useState(activeResidents[0]?.id || '');
  const [type, setType] = useState('');
  const [note, setNote] = useState('');
  const [startDate, setStartDate] = useState(getTodayLocalDateString());
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setResidentId(activeResidents[0]?.id || '');
    setType(''); setNote(''); setStartDate(getTodayLocalDateString()); setEndDate(''); setError('');
  };

  const handleSave = () => {
    if (!residentId) { setError('Select a resident.'); return; }
    if (!type.trim()) { setError('Enter what is being tracked.'); return; }
    if (endDate && endDate < startDate) { setError('End date must be on or after the start date.'); return; }
    try {
      db.addResidentAttentionItem(residentId, { type: type.trim(), note: note.trim() || undefined, startDate, endDate: endDate || undefined });
      reset();
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Add Resident Attention" subtitle="A short operational note for staff — not a clinical chart entry." maxWidth="md">
      <div className="space-y-4">
        <div>
          <label htmlFor="attn-resident" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Resident</label>
          <select id="attn-resident" value={residentId} onChange={(e) => setResidentId(e.target.value)} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm bg-panel focus:ring-2 focus:ring-accent">
            {activeResidents.length === 0 && <option value="">No active residents</option>}
            {activeResidents.map(r => <option key={r.id} value={r.id}>{r.roomNumber} — {r.firstName} {r.lastName}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="attn-type" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">What's being tracked</label>
          <input id="attn-type" type="text" list="attn-type-suggestions" value={type} onChange={(e) => setType(e.target.value)} placeholder="e.g. Behaviour Tracking" className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
          <datalist id="attn-type-suggestions">
            {SUGGESTED_TYPES.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>

        <div>
          <label htmlFor="attn-note" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Note (optional)</label>
          <input id="attn-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="One short line — detail belongs on the Resident Profile" className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="attn-start" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Start Date</label>
            <input id="attn-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
          </div>
          <div>
            <label htmlFor="attn-end" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">End Date (optional)</label>
            <input id="attn-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm focus:ring-2 focus:ring-accent" />
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-danger">{error}</p>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hairline">
          <button type="button" onClick={() => { reset(); onClose(); }} className="btn btn-secondary">Cancel</button>
          <button type="button" onClick={handleSave} className="btn btn-accent">Add Attention Item</button>
        </div>
      </div>
    </Modal>
  );
};
