import React, { useState } from 'react';
import { Plus, RotateCcw, Trash2, ShieldAlert } from 'lucide-react';
import { db } from '../../db';
import { EmergencyCode } from '../../types';
import { DEFAULT_EMERGENCY_CODES } from '../../data/defaultData';
import { ConfirmDialog, ConfirmDialogRequest } from '../common/ConfirmDialog';

interface EmergencyCodesTabProps {
  onShowFeedback: (type: 'success' | 'error', text: string) => void;
}

function generateId() {
  return `code_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const EmergencyCodesTab: React.FC<EmergencyCodesTabProps> = ({ onShowFeedback }) => {
  const state = db.getState();
  const codes = state.settings.emergencyCodes || DEFAULT_EMERGENCY_CODES;
  const enabled = state.settings.codeOfTheMonthEnabled === true;
  const currentId = state.settings.codeOfTheMonthId;

  const [newCodeWord, setNewCodeWord] = useState('');
  const [newCodeName, setNewCodeName] = useState('');
  const [confirmRequest, setConfirmRequest] = useState<ConfirmDialogRequest | null>(null);
  const [, forceRerender] = useState(0);

  const save = (updates: Partial<{ emergencyCodes: EmergencyCode[]; codeOfTheMonthId: string; codeOfTheMonthEnabled: boolean }>) => {
    db.updateSettings(updates);
    forceRerender(n => n + 1);
  };

  const handleUpdateReminder = (id: string, reminder: string) => {
    save({ emergencyCodes: codes.map(c => c.id === id ? { ...c, reminder } : c) });
  };

  const handleAddCode = () => {
    if (!newCodeWord.trim() || !newCodeName.trim()) { onShowFeedback('error', 'Enter both a code word and what it means.'); return; }
    const code: EmergencyCode = { id: generateId(), code: newCodeWord.trim(), name: newCodeName.trim(), isSystem: false };
    save({ emergencyCodes: [...codes, code] });
    setNewCodeWord(''); setNewCodeName('');
    onShowFeedback('success', `Code ${code.code} added.`);
  };

  const handleDeleteCode = (code: EmergencyCode) => {
    setConfirmRequest({
      title: `Remove Code ${code.code}?`,
      message: `Remove "Code ${code.code} — ${code.name}" from the facility's code catalog?`,
      confirmLabel: 'Remove Code',
      tone: 'danger',
      onConfirm: () => {
        save({ emergencyCodes: codes.filter(c => c.id !== code.id), codeOfTheMonthId: currentId === code.id ? undefined : currentId });
        onShowFeedback('success', `Code ${code.code} removed.`);
      },
    });
  };

  const handleRestoreDefaults = () => {
    setConfirmRequest({
      title: 'Restore Default Code Catalog?',
      message: 'Restore the reference AHS emergency response code list? Facility-added codes and reminders you’ve written stay in place — this only refreshes the built-in codes.',
      confirmLabel: 'Yes, Restore Defaults',
      onConfirm: () => {
        const custom = codes.filter(c => !c.isSystem);
        save({ emergencyCodes: [...DEFAULT_EMERGENCY_CODES, ...custom] });
        onShowFeedback('success', 'Default emergency code catalog restored.');
      },
    });
  };

  return (
    <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-6 shadow-xs">
      <div>
        <h3 className="text-base font-bold text-ink flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-accent" />
          Emergency Codes
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Reference catalog only — your facility's Emergency Response Manual remains authoritative. Seeded from Alberta Health Services Policy #1181, Appendix A, and fully editable.
        </p>
      </div>

      <div className="p-4 bg-panel-sunken border border-hairline-strong rounded-control space-y-3">
        <label className="flex items-center gap-2.5 text-sm font-semibold text-ink cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => save({ codeOfTheMonthEnabled: e.target.checked })}
            className="w-4 h-4 rounded text-accent focus:ring-accent"
          />
          Show "Code of the Month" on the Dashboard
        </label>
        {enabled && (
          <div>
            <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Current Code</label>
            <select
              value={currentId || ''}
              onChange={(e) => save({ codeOfTheMonthId: e.target.value || undefined })}
              className="w-full max-w-sm px-3 h-9 border border-hairline-strong rounded-control text-sm bg-panel focus:ring-2 focus:ring-accent"
            >
              <option value="">Choose a code…</option>
              {codes.map(c => <option key={c.id} value={c.id}>Code {c.code} — {c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {codes.map(code => (
          <div key={code.id} className="flex items-start gap-3 p-3 bg-panel-sunken border border-hairline-strong rounded-control">
            <div className="w-32 shrink-0 pt-1.5">
              <p className="text-sm font-black text-ink">Code {code.code}</p>
              <p className="text-[11px] text-muted">{code.name}</p>
            </div>
            <input
              type="text"
              value={code.reminder || ''}
              onChange={(e) => handleUpdateReminder(code.id, e.target.value)}
              placeholder="Optional short staff reminder…"
              aria-label={`Reminder for Code ${code.code}`}
              className="flex-1 px-3 py-1.5 border border-hairline-strong rounded-control text-xs bg-panel focus:ring-2 focus:ring-accent"
            />
            <button
              type="button"
              onClick={() => handleDeleteCode(code)}
              aria-label={`Remove Code ${code.code}`}
              className="p-1.5 text-faint hover:text-danger rounded-control transition-colors shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 pt-2 border-t border-hairline-strong">
        <div>
          <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Code Word</label>
          <input type="text" value={newCodeWord} onChange={(e) => setNewCodeWord(e.target.value)} placeholder="e.g. 66" className="w-28 px-2.5 h-9 border border-hairline-strong rounded-control text-sm" />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-ink-soft uppercase tracking-wider mb-1">Meaning</label>
          <input type="text" value={newCodeName} onChange={(e) => setNewCodeName(e.target.value)} placeholder="e.g. Site-specific alert" className="w-full px-2.5 h-9 border border-hairline-strong rounded-control text-sm" />
        </div>
        <button type="button" onClick={handleAddCode} className="btn btn-secondary shrink-0">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Code</span>
        </button>
        <button type="button" onClick={handleRestoreDefaults} className="btn btn-secondary shrink-0">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restore Defaults</span>
        </button>
      </div>

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  );
};
