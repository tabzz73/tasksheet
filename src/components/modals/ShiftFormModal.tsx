import React, { useState, useEffect } from 'react';
import { Clock, Shield, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Shift, Role } from '../../types';
import { db } from '../../db';
import { analyzeShiftChange, DomainConflictError, validateMilitaryTime, ValidationResult } from '../../services/validation';
import { ConflictNotice } from '../common/ConflictNotice';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'add' | 'edit' | 'duplicate';
  initialShift?: Shift | null;
  onSuccess?: (shift: Shift) => void;
}

export const ShiftFormModal: React.FC<ShiftFormModalProps> = ({
  isOpen,
  onClose,
  mode = 'add',
  initialShift,
  onSuccess
}) => {
  const state = db.getState();
  const roles = state.roles;

  const [name, setName] = useState('');
  const [shortCode, setShortCode] = useState('');
  const [roleId, setRoleId] = useState('');
  const [startTime, setStartTime] = useState('0700');
  const [endTime, setEndTime] = useState('1500');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ValidationResult | null>(null);
  const [warningAccepted, setWarningAccepted] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setConflict(null);
      setWarningAccepted(false);
      setHasUnsavedChanges(false);
      setShowUnsavedWarning(false);
      if (initialShift) {
        if (mode === 'duplicate') {
          setName(`${initialShift.name} 2`);
          // Generate unique proposed shortCode
          let proposed = `${initialShift.shortCode}2`;
          let counter = 2;
          while (state.shifts.some(s => s.isActive !== false && s.shortCode.trim().toUpperCase() === proposed.toUpperCase())) {
            counter++;
            proposed = `${initialShift.shortCode}${counter}`;
          }
          setShortCode(proposed);
        } else {
          setName(initialShift.name);
          setShortCode(initialShift.shortCode || '');
        }
        setRoleId(initialShift.roleId);
        setStartTime(initialShift.startTime);
        setEndTime(initialShift.endTime);
        setDescription(initialShift.description || '');
      } else {
        setName('');
        setShortCode('');
        setRoleId(roles[0]?.id || '');
        setStartTime('0700');
        setEndTime('1500');
        setDescription('');
      }
    }
  }, [isOpen, initialShift, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConflict(null);

    const trimmedName = name.trim();
    const trimmedCode = shortCode.trim();

    if (!trimmedName) {
      setError('Shift Name is required.');
      return;
    }
    if (!trimmedCode) {
      setError('Short Name / Code is required.');
      return;
    }
    if (!roleId) {
      setError('Please select a role for this shift.');
      return;
    }
    const startValidation = validateMilitaryTime(startTime); const endValidation = validateMilitaryTime(endTime);
    if (startValidation.status === 'BLOCKED' || endValidation.status === 'BLOCKED') {
      setConflict(startValidation.status === 'BLOCKED' ? startValidation : endValidation);
      return;
    }

    try {
      if (mode === 'edit' && initialShift) {
        const impact = analyzeShiftChange(db.getState(), initialShift.id, { name: trimmedName, shortCode: trimmedCode, roleId, startTime, endTime, description: description.trim() });
        if (impact.status === 'BLOCKED' || (impact.status === 'WARNING' && !warningAccepted)) { setConflict(impact); return; }
        const updated = db.updateShift(initialShift.id, {
          name: trimmedName,
          shortCode: trimmedCode,
          roleId,
          startTime,
          endTime,
          description: description.trim()
        });
        if (onSuccess) onSuccess(updated);
      } else {
        const created = db.addShift({
          name: trimmedName,
          shortCode: trimmedCode,
          roleId,
          startTime,
          endTime,
          description: description.trim(),
          isActive: true
        });
        if (onSuccess) onSuccess(created);
      }
      onClose();
    } catch (err: any) {
      if (err instanceof DomainConflictError) setConflict(err.result);
      else setError(err.message || 'TaskSheet could not safely save this shift. Your entries remain in the form; review them and try again.');
    }
  };

  const title = mode === 'edit' ? 'Edit Shift' : mode === 'duplicate' ? 'Duplicate Shift' : 'Add Shift';
  const submitLabel = mode === 'edit' ? 'Save Changes' : mode === 'duplicate' ? 'Create Duplicate' : 'Add Shift';

  // Crosses midnight indication
  const crossesMidnight = startTime && endTime && startTime > endTime;
  const requestClose = () => hasUnsavedChanges ? setShowUnsavedWarning(true) : onClose();

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      title={title}
      subtitle="Configure shift name, shorthand code, authoritative role, and working hours."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} onChangeCapture={() => setHasUnsavedChanges(true)} className="space-y-4">
        {showUnsavedWarning && <ConflictNotice result={{ status: 'WARNING', title: 'Unsaved Changes', message: 'You have shift changes that have not been saved. Keep editing to preserve them, or discard them and close.', recommendedActions: [{ id: 'keep_editing', label: 'Keep Editing', kind: 'primary' }, { id: 'discard', label: 'Discard Changes', kind: 'cancel' }] }} onAction={action => { if (action === 'discard') onClose(); else setShowUnsavedWarning(false); }} />}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-800 flex items-start space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {conflict && <ConflictNotice result={conflict} onAction={action => { if (action === 'continue') { setWarningAccepted(true); setConflict(null); } else if (action === 'cancel') setConflict(null); }} />}

        {/* Shift Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Shift Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. LPN Day, HCA Evening, Overnight Clinical"
            required
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Short Name / Code */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Short Name / Code <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400 font-mono">Display shorthand</span>
          </div>
          <input
            type="text"
            value={shortCode}
            onChange={(e) => setShortCode(e.target.value.toUpperCase())}
            placeholder="e.g. LP1, D1, E2, NLPN, RN1"
            maxLength={8}
            required
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono font-black text-slate-900 focus:ring-2 focus:ring-teal-500 tracking-wider uppercase"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            A short label used on TaskSheets and shift lists, such as D1, LP1 or NLPN.
          </p>
        </div>

        {/* Authoritative Role */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Assigned Role <span className="text-rose-500">*</span>
          </label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            required
            className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-900 focus:ring-2 focus:ring-teal-500 bg-white"
          >
            {roles.map(r => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Selecting this shift automatically sets clinical scope and default worksheet style.
          </p>
        </div>

        {/* Start & End Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Start Time (24h) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0700"
              maxLength={4}
              required
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 text-center focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              End Time (24h) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1900"
              maxLength={4}
              required
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 text-center focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {crossesMidnight && (
          <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-[11px] font-medium text-indigo-900 flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
            <span>Overnight Shift: Working hours ({startTime}–{endTime}) automatically span past midnight.</span>
          </div>
        )}

        {/* Optional Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Operational Scope / Notes (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief notes regarding unit coverage or handoff expectations..."
            rows={2}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-700 focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2.5">
          <button
            type="button"
            onClick={requestClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow transition-colors"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};
