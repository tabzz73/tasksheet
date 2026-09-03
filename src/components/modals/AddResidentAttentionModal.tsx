import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { db } from '../../db';
import { getTodayLocalDateString } from '../../services/recurrence';
import { describeAttentionRouting } from '../../services/routingPreview';

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
  const shifts = [...state.shifts].filter(s => s.isActive !== false).sort((a, b) => (a.displayOrder ?? 99) - (b.displayOrder ?? 99));

  const [residentId, setResidentId] = useState(activeResidents[0]?.id || '');
  const [type, setType] = useState('');
  const [note, setNote] = useState('');
  const [startDate, setStartDate] = useState(getTodayLocalDateString());
  const [endDate, setEndDate] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [importance, setImportance] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [includeInFyiBinder, setIncludeInFyiBinder] = useState(false);
  const [showOnDashboard, setShowOnDashboard] = useState(true);
  const [showInHuddle, setShowInHuddle] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setResidentId(activeResidents[0]?.id || '');
    setType(''); setNote(''); setStartDate(getTodayLocalDateString()); setEndDate('');
    setShiftId(''); setImportance('normal'); setIncludeInFyiBinder(false);
    setShowOnDashboard(true); setShowInHuddle(false); setError('');
  };

  const selectedShift = shifts.find(s => s.id === shiftId);

  const handleSave = () => {
    if (!residentId) { setError('Select a resident.'); return; }
    if (!type.trim()) { setError('Enter what is being tracked.'); return; }
    if (endDate && endDate < startDate) { setError('End date must be on or after the start date.'); return; }
    try {
      db.addResidentAttentionItem(residentId, {
        type: type.trim(),
        note: note.trim() || undefined,
        startDate,
        endDate: endDate || undefined,
        shiftId: shiftId || undefined,
        roleId: selectedShift?.roleId,
        importance,
        includeInFyiBinder,
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

  const appearsIn = describeAttentionRouting(state, { shiftId: shiftId || undefined, roleId: selectedShift?.roleId, includeInFyiBinder, showOnDashboard, showInHuddle });

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="attn-shift" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Relevant Shift (optional)</label>
            <select id="attn-shift" value={shiftId} onChange={(e) => setShiftId(e.target.value)} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm bg-panel focus:ring-2 focus:ring-accent">
              <option value="">Any shift (Dashboard only)</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.shortCode ? `${s.shortCode} — ` : ''}{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="attn-importance" className="block text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Importance</label>
            <select id="attn-importance" value={importance} onChange={(e) => setImportance(e.target.value as 'normal' | 'high' | 'urgent')} className="w-full px-3 h-9 border border-hairline-strong rounded-control text-sm bg-panel focus:ring-2 focus:ring-accent">
              <option value="normal">Normal</option>
              <option value="high">High (Highlighted)</option>
              <option value="urgent">Urgent Banner</option>
            </select>
          </div>
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
          <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-ink-soft">
            <input type="checkbox" checked={includeInFyiBinder} onChange={(e) => setIncludeInFyiBinder(e.target.checked)} className="h-3.5 w-3.5 rounded text-accent focus:ring-accent" />
            Include in FYI Binder
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
