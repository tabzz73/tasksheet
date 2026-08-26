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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={`Unit Routine · Time: ${task.time || '—'}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {task.instructions && (
          <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            {task.instructions}
          </p>
        )}

        {/* 1. TEMPERATURE INPUT */}
        {task.resultType === 'temperature' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Recorded Temperature (°C)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  required
                  className="w-full pl-9 pr-12 py-2.5 bg-white border border-slate-300 rounded-lg text-base font-semibold tabular-nums focus:ring-2 focus:ring-teal-500"
                />
                <Thermometer className="w-5 h-5 text-teal-600 absolute left-2.5 top-2.5" />
                <span className="absolute right-3.5 top-3 text-xs font-bold text-slate-400">°C</span>
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Target safe range: <strong className="text-slate-800">{minTemp}°C to {maxTemp}°C</strong>
              </span>
            </div>

            {/* Out of range alert */}
            {isTempOutOfRange && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-lg text-xs space-y-2">
                <div className="flex items-center space-x-2 text-amber-800 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Out of safe range ({minTemp}°C–{maxTemp}°C) — Follow-up required</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-amber-900 mb-1">
                    Action Taken / Clinical Notification: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    required
                    placeholder="e.g. Notified supervisor/maintenance; medications transferred to backup fridge..."
                    className="w-full px-2.5 py-1.5 bg-white border border-amber-300 rounded text-xs focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. PASS / ISSUE */}
        {task.resultType === 'pass_issue' && (
          <div className="space-y-3">
            <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Verification Status
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPassIssueChoice('pass')}
                className={`py-3 px-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                  passIssueChoice === 'pass'
                    ? 'bg-teal-50 border-teal-500 text-teal-900 shadow-sm ring-2 ring-teal-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <span>{task.resultConfig?.passLabel || 'Reconciled / OK'}</span>
              </button>

              <button
                type="button"
                onClick={() => setPassIssueChoice('issue')}
                className={`py-3 px-3 rounded-lg border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                  passIssueChoice === 'issue'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 shadow-sm ring-2 ring-rose-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>{task.resultConfig?.issueLabel || 'Discrepancy Noted'}</span>
              </button>
            </div>

            {passIssueChoice === 'issue' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1.5">
                <label className="block font-semibold text-rose-900">
                  Discrepancy Details & Actions Taken: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={issueNote}
                  onChange={(e) => setIssueNote(e.target.value)}
                  required
                  placeholder="Detail the discrepancy, count variance, and supervisor notification..."
                  className="w-full px-2.5 py-1.5 bg-white border border-rose-300 rounded text-xs"
                />
              </div>
            )}
          </div>
        )}

        {/* General Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
            Staff Note (Optional)
          </label>
          <input
            type="text"
            value={generalNote}
            onChange={(e) => setGeneralNote(e.target.value)}
            placeholder="e.g. Completed during morning routine..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Submit */}
        <div className="pt-2 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-md transition-colors flex items-center space-x-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Complete Routine</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
