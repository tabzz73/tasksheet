import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  Edit2, 
  Plus, 
  Trash2, 
  Clock, 
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { db } from '../../db';
import { FacilityQuickAddPreset, RecurrenceFrequency } from '../../types';
import { DEFAULT_HCA_QUICK_ADD_PRESETS } from '../../data/defaultData';
import { Modal } from '../common/Modal';
import { ConfirmDialog, ConfirmDialogRequest } from '../common/ConfirmDialog';

interface QuickAddPresetsTabProps {
  onShowFeedback: (type: 'success' | 'error', text: string) => void;
}

export const QuickAddPresetsTab: React.FC<QuickAddPresetsTabProps> = ({ onShowFeedback }) => {
  const state = db.getState();
  const presets = state.settings.quickAddPresets || DEFAULT_HCA_QUICK_ADD_PRESETS;

  const [editingPreset, setEditingPreset] = useState<FacilityQuickAddPreset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState<ConfirmDialogRequest | null>(null);

  // Form State
  const [formLabel, setFormLabel] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formCategory, setFormCategory] = useState('AM Care');
  const [formRoleCode, setFormRoleCode] = useState<'HCA' | 'LPN' | 'ALL'>('HCA');
  const [formDefaultTime, setFormDefaultTime] = useState('0800');
  const [formDefaultFrequency, setFormDefaultFrequency] = useState<RecurrenceFrequency>('daily');

  // Toggle active status
  const handleToggleActive = (presetId: string) => {
    const updated = presets.map(p => 
      p.id === presetId ? { ...p, isActive: !p.isActive } : p
    );
    db.updateQuickAddPresets(updated);
    onShowFeedback('success', 'Preset status updated.');
  };

  // Reorder presets
  const handleMove = (presetId: string, direction: 'up' | 'down') => {
    const sorted = [...presets].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex(p => p.id === presetId);
    if (idx === -1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const temp = sorted[idx];
    sorted[idx] = sorted[targetIdx];
    sorted[targetIdx] = temp;

    const renumbered = sorted.map((p, i) => ({ ...p, displayOrder: i + 1 }));
    db.updateQuickAddPresets(renumbered);
    onShowFeedback('success', 'Preset order updated.');
  };

  // Open Edit Form
  const handleOpenEdit = (preset: FacilityQuickAddPreset) => {
    setEditingPreset(preset);
    setFormLabel(preset.label);
    setFormSubtitle(preset.subtitle);
    setFormCategory(preset.category);
    setFormRoleCode(preset.roleCode);
    setFormDefaultTime(preset.defaultTime || '0800');
    setFormDefaultFrequency(preset.defaultFrequency);
    setIsModalOpen(true);
  };

  // Open New Preset Form
  const handleOpenNew = () => {
    setEditingPreset(null);
    setFormLabel('');
    setFormSubtitle('');
    setFormCategory('AM Care');
    setFormRoleCode('HCA');
    setFormDefaultTime('0800');
    setFormDefaultFrequency('daily');
    setIsModalOpen(true);
  };

  // Save Preset
  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLabel = formLabel.trim();
    if (!trimmedLabel) return;

    // Check for duplicate preset name for the same target role
    const duplicate = presets.find(p => 
      p.id !== editingPreset?.id &&
      p.label.trim().toLowerCase() === trimmedLabel.toLowerCase() &&
      (p.roleCode === formRoleCode || p.roleCode === 'ALL' || formRoleCode === 'ALL')
    );

    if (duplicate) {
      onShowFeedback('error', `A preset named "${trimmedLabel}" already exists for ${formRoleCode}. Duplicates are not allowed.`);
      return;
    }

    if (editingPreset) {
      const updated = presets.map(p => 
        p.id === editingPreset.id
          ? {
              ...p,
              label: formLabel.trim(),
              subtitle: formSubtitle.trim(),
              category: formCategory,
              roleCode: formRoleCode,
              defaultTime: formDefaultTime,
              defaultFrequency: formDefaultFrequency,
            }
          : p
      );
      db.updateQuickAddPresets(updated);
      onShowFeedback('success', `Updated preset "${formLabel.trim()}".`);
    } else {
      const newPreset: FacilityQuickAddPreset = {
        id: `preset_custom_${Date.now()}`,
        label: formLabel.trim(),
        subtitle: formSubtitle.trim(),
        category: formCategory,
        roleCode: formRoleCode,
        defaultTime: formDefaultTime,
        defaultFrequency: formDefaultFrequency,
        options: [
          {
            id: `opt_${Date.now()}`,
            label: formLabel.trim(),
            defaultTime: formDefaultTime,
            defaultFrequency: formDefaultFrequency,
            isDefaultSelected: true,
          }
        ],
        isActive: true,
        displayOrder: presets.length + 1,
      };
      db.updateQuickAddPresets([...presets, newPreset]);
      onShowFeedback('success', `Created custom preset "${newPreset.label}".`);
    }

    setIsModalOpen(false);
  };

  // Reset to default presets
  const handleReset = () => {
    setConfirmRequest({
      title: 'Reset Quick Add Presets?',
      message: 'Reset Quick Add Presets to Alberta Starter Standard defaults? This replaces the current preset list, including any custom presets, with the factory defaults.',
      confirmLabel: 'Reset Presets',
      tone: 'danger',
      onConfirm: () => {
        db.resetQuickAddPresets();
        onShowFeedback('success', 'Reset Quick Add Presets to factory standard defaults.');
      },
    });
  };

  const sortedPresets = [...presets].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="space-y-6">
      {/* ── HEADER TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>Facility Quick Add Presets Manager</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Customize which care groups appear in the resident Quick Add setup screen and their default times.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-slate-600 hover:text-rose-700 font-bold border border-slate-300 rounded-lg hover:bg-slate-100 flex items-center space-x-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Quick Preset</span>
          </button>
        </div>
      </div>

      {/* ── PRESETS LIST ── */}
      <div className="space-y-2.5">
        {sortedPresets.map((preset, index) => (
          <div
            key={preset.id}
            className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
              preset.isActive ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center space-x-3">
              {/* Order Controls */}
              <div className="flex flex-col space-y-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMove(preset.id, 'up')}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Move Up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === sortedPresets.length - 1}
                  onClick={() => handleMove(preset.id, 'down')}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  title="Move Down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Title & Subtitle */}
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-xs text-slate-900">{preset.label}</span>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                    Default {preset.defaultTime || '0800'}
                  </span>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                    {preset.roleCode}
                  </span>
                  {!preset.isActive && (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">{preset.subtitle}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleToggleActive(preset.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${
                  preset.isActive 
                    ? 'border-slate-300 text-slate-700 hover:bg-slate-100' 
                    : 'border-teal-300 bg-teal-50 text-teal-800'
                }`}
              >
                {preset.isActive ? 'Deactivate' : 'Activate'}
              </button>

              <button
                type="button"
                onClick={() => handleOpenEdit(preset)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900"
                title="Edit preset"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── EDIT / CREATE MODAL ── */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingPreset ? `Edit "${editingPreset.label}" Preset` : 'Create Custom Quick Add Preset'}
          maxWidth="md"
        >
          <form onSubmit={handleSavePreset} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Preset Label</label>
              <input
                type="text"
                required
                value={formLabel}
                onChange={e => setFormLabel(e.target.value)}
                placeholder="e.g. AM Care"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle / Description</label>
              <input
                type="text"
                value={formSubtitle}
                onChange={e => setFormSubtitle(e.target.value)}
                placeholder="e.g. Morning personal care routine"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Time</label>
                <input
                  type="text"
                  value={formDefaultTime}
                  onChange={e => setFormDefaultTime(e.target.value)}
                  placeholder="0800"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Scope</label>
                <select
                  value={formRoleCode}
                  onChange={e => setFormRoleCode(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                >
                  <option value="HCA">HCA (Health Care Aide)</option>
                  <option value="LPN">LPN (Nurse)</option>
                  <option value="ALL">All Roles</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
              >
                Save Preset
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  );
};
