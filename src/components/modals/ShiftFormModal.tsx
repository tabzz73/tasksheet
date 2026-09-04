import React, { useState, useEffect } from 'react';
import { Clock, Shield, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { Modal } from '../common/Modal';
import { FormSection } from '../common/FormSection';
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

  const footer = (
    <>
      <button type="button" onClick={requestClose} className="btn btn-secondary">Cancel</button>
      <button type="submit" form="shift-form" className="btn btn-accent">{submitLabel}</button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={requestClose}
      title={title}
      subtitle="Configure shift name, shorthand code, authoritative role, and working hours."
      maxWidth="md"
      footer={footer}
    >
      <form id="shift-form" onSubmit={handleSubmit} onChangeCapture={() => setHasUnsavedChanges(true)} className="space-y-5">
        {showUnsavedWarning && <ConflictNotice result={{ status: 'WARNING', title: 'Unsaved Changes', message: 'You have shift changes that have not been saved. Keep editing to preserve them, or discard them and close.', recommendedActions: [{ id: 'keep_editing', label: 'Keep Editing', kind: 'primary' }, { id: 'discard', label: 'Discard Changes', kind: 'cancel' }] }} onAction={action => { if (action === 'discard') onClose(); else setShowUnsavedWarning(false); }} />}
        {error && (
          <div className="p-3 bg-danger-soft border border-danger rounded-control text-xs font-semibold text-danger flex items-start space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {conflict && <ConflictNotice result={conflict} onAction={action => { if (action === 'continue') { setWarningAccepted(true); setConflict(null); } else if (action === 'cancel') setConflict(null); }} />}

        <FormSection title="Identity">
          <div>
            <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
              Shift Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. LPN Day, HCA Evening, Overnight Clinical"
              required
              className="w-full px-3.5 h-10 border border-hairline-strong rounded-control text-sm font-semibold text-ink focus:ring-2 focus:ring-accent focus:outline-none"
            />
          </div>

          {/* Short Name / Code + Role — the two identifiers staff scan for first */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider">
                  Short Code <span className="text-danger">*</span>
                </label>
              </div>
              <input
                type="text"
                value={shortCode}
                onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                placeholder="e.g. LP1, D1"
                maxLength={8}
                required
                className="w-full px-3.5 h-10 border border-hairline-strong rounded-control text-sm font-mono font-black text-ink focus:ring-2 focus:ring-accent focus:outline-none tracking-wider uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                Assigned Role <span className="text-danger">*</span>
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
                className="w-full px-3.5 h-10 border border-hairline-strong rounded-control text-sm font-medium text-ink focus:ring-2 focus:ring-accent focus:outline-none bg-panel"
              >
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-[11px] text-muted">
            The short code appears on TaskSheets and shift lists. The role sets clinical scope and default worksheet style.
          </p>
        </FormSection>

        <FormSection title="Timing">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                Start Time (24h) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="0700"
                maxLength={4}
                required
                className="w-full px-3.5 h-10 border border-hairline-strong rounded-control text-sm font-mono font-bold text-ink text-center tabular-nums focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
                End Time (24h) <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="1900"
                maxLength={4}
                required
                className="w-full px-3.5 h-10 border border-hairline-strong rounded-control text-sm font-mono font-bold text-ink text-center tabular-nums focus:ring-2 focus:ring-accent focus:outline-none"
              />
            </div>
          </div>

          {crossesMidnight && (
            <div className="p-2.5 bg-accent-soft border border-hairline-strong rounded-control text-[11px] font-medium text-accent-strong flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Overnight shift: working hours ({startTime}–{endTime}) automatically span past midnight.</span>
            </div>
          )}
        </FormSection>

        <FormSection title="Notes">
          <label className="block text-xs font-bold text-ink-soft uppercase tracking-wider mb-1">
            Operational Scope / Notes (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief notes regarding unit coverage or handoff expectations..."
            rows={2}
            className="w-full px-3 py-2 border border-hairline-strong rounded-control text-xs text-ink-soft focus:ring-2 focus:ring-accent focus:outline-none"
          />
        </FormSection>
      </form>
    </Modal>
  );
};
