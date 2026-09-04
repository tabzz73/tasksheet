import React, { useState } from 'react';
import { Thermometer, CheckCircle2, AlertTriangle, AlertCircle, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { UnitTask } from '../../types';
import { db } from '../../db';

interface UnitTaskResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: UnitTask;
  date: string;
  shiftId: string;
  onSuccess?: () => void;
}

export const UnitTaskResultModal: React.FC<UnitTaskResultModalProps> = ({
  isOpen,
  onClose,
  task,
  date,
  shiftId,
  onSuccess
}) => {
  const minTemp = task.resultConfig?.min ?? 2.0;
  const maxTemp = task.resultConfig?.max ?? 8.0;

  const [tempValue, setTempValue] = useState('4.2');
  const [actionTaken, setActionTaken] = useState('');
  const [passIssueChoice, setPassIssueChoice] = useState<'pass' | 'issue'>('pass');
  const [issueNote, setIssueNote] = useState('');
  const [generalNote, setGeneralNote] = useState('');

  const numTemp = parseFloat(tempValue);
  const isTempOutOfRange = !isNaN(numTemp) && (numTemp < minTemp || numTemp > maxTemp);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let resultValue: any = true;
    let resultNote: string | undefined = generalNote.trim() || undefined;
    let action: string | undefined = undefined;

    if (task.resultType === 'temperature') {
      resultValue = numTemp;
      if (isTempOutOfRange) {
        action = actionTaken.trim();
        resultNote = `Excursion: ${numTemp}°C (Range: ${minTemp}–${maxTemp}°C). ${action ? `Action: ${action}` : ''}`;
      } else {
        resultNote = `${numTemp}°C (Normal range)`;
      }
    } else if (task.resultType === 'pass_issue') {
      resultValue = passIssueChoice === 'pass';
      if (passIssueChoice === 'issue') {
        resultNote = `Discrepancy: ${issueNote.trim()}`;
        action = issueNote.trim();
      } else {
        resultNote = 'Count & equipment reconciled / intact.';
      }
    }

    db.recordCompletion({
      date,
      shiftId,
      entityType: 'unit_task',
      entityId: task.id,
      completedBy: 'Current Staff',
      resultValue,
      resultNote,
      actionTaken: action,
      status: 'completed'
    });

    onSuccess?.();
    onClose();
  };

  const footer = (
    <>
      <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
      <button type="submit" form="unit-task-result-form" className="px-5 py-2 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold shadow-elevated transition-colors flex items-center space-x-1.5">
        <Check className="w-4 h-4" />
        <span>Complete Routine</span>
      </button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={`Unit Routine · Time: ${task.time || '—'}`}
      maxWidth="md"
      footer={footer}
    >
      <form id="unit-task-result-form" onSubmit={handleSubmit} className="space-y-4">
        {task.instructions && (
          <p className="text-xs text-muted bg-panel-sunken p-2.5 rounded-control border border-hairline-strong">
            {task.instructions}
          </p>
        )}

        {/* 1. TEMPERATURE INPUT */}
        {task.resultType === 'temperature' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
                Recorded Temperature (°C)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  required
                  className="w-full pl-9 pr-12 py-2.5 bg-panel border border-hairline-strong rounded-control text-base font-semibold tabular-nums focus:ring-2 focus:ring-accent"
                />
                <Thermometer className="w-5 h-5 text-accent absolute left-2.5 top-2.5" />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-faint">°C</span>
              </div>
              <span className="text-[11px] text-muted mt-1 block">
                Target safe range: <strong className="text-ink">{minTemp}°C to {maxTemp}°C</strong>
              </span>
            </div>

            {/* Out of range alert */}
            {isTempOutOfRange && (
              <div className="p-3.5 bg-warning-soft border border-warning rounded-control text-xs space-y-2">
                <div className="flex items-center space-x-2 text-warning font-semibold">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  <span>Out of safe range ({minTemp}°C–{maxTemp}°C) — Follow-up required</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-warning mb-1">
                    Action Taken / Clinical Notification: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    required
                    placeholder="e.g. Notified supervisor/maintenance; medications transferred to backup fridge..."
                    className="w-full px-2.5 py-1.5 bg-panel border border-warning rounded text-xs focus:ring-1 focus:ring-warning"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. PASS / ISSUE */}
        {task.resultType === 'pass_issue' && (
          <div className="space-y-3">
            <span className="block text-xs font-semibold text-ink-soft uppercase tracking-wider">
              Verification Status
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPassIssueChoice('pass')}
                className={`py-3 px-3 rounded-control border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                  passIssueChoice === 'pass'
                    ? 'bg-accent-soft border-accent text-accent-strong ring-2 ring-accent/20'
                    : 'bg-panel border-hairline-strong text-ink-soft hover:border-hairline-strong'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-accent" />
                <span>{task.resultConfig?.passLabel || 'Reconciled / OK'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPassIssueChoice('issue')}
                className={`py-3 px-3 rounded-control border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                  passIssueChoice === 'issue'
                    ? 'bg-danger-soft border-danger text-danger ring-2 ring-danger/20'
                    : 'bg-panel border-hairline-strong text-ink-soft hover:border-hairline-strong'
                }`}
              >
                <AlertCircle className="w-5 h-5 text-danger" />
                <span>{task.resultConfig?.issueLabel || 'Discrepancy Noted'}</span>
              </button>
            </div>

            {passIssueChoice === 'issue' && (
              <div className="p-3 bg-danger-soft border border-danger rounded-control text-xs space-y-1.5">
                <label className="block font-semibold text-danger">
                  Discrepancy Details & Actions Taken: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  required
                  placeholder="Detail the discrepancy, count variance, and supervisor notification..."
                  className="w-full px-2.5 py-1.5 bg-panel border border-danger rounded text-xs"
                />
              </div>
            )}
          </div>
        )}

        {/* General Note */}
        <div>
          <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">
            Staff Note (Optional)
          </label>
          <input
            type="text"
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            placeholder="e.g. Completed during morning routine..."
            className="w-full px-3 py-2 bg-panel border border-hairline-strong rounded-control text-xs focus:ring-2 focus:ring-accent"
          />
        </div>

      </form>
    </Modal>
  );
};
