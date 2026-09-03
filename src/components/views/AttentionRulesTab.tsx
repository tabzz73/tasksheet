import React, { useState } from 'react';
import { 
  Sparkles, 
  Check, 
  RotateCcw, 
  Edit2, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2,
  Shield,
  Layers,
  Search
} from 'lucide-react';
import { db } from '../../db';
import { FacilityAttentionRule, TaskAttentionIndicator, MealRelation } from '../../types';
import { DEFAULT_ATTENTION_RULES, getIndicatorBadgeDetails, validateAttentionPattern } from '../../services/attention';
import { Modal } from '../common/Modal';
import { ConfirmDialog, ConfirmDialogRequest } from '../common/ConfirmDialog';

interface AttentionRulesTabProps {
  onShowFeedback: (type: 'success' | 'error', text: string) => void;
}

export const AttentionRulesTab: React.FC<AttentionRulesTabProps> = ({ onShowFeedback }) => {
  const state = db.getState();
  const rules = state.settings.attentionRules || DEFAULT_ATTENTION_RULES;
  const isSuggestionsEnabled = state.settings.smartSuggestionsEnabled !== false;

  const [editingRule, setEditingRule] = useState<FacilityAttentionRule | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [formName, setFormName] = useState('');
  const [formPattern, setFormPattern] = useState('');
  const [formIndicators, setFormIndicators] = useState<TaskAttentionIndicator[]>(['HIGH_ALERT']);
  const [formMealRelation, setFormMealRelation] = useState<MealRelation | undefined>(undefined);
  const [formEquipmentNote, setFormEquipmentNote] = useState('');
  const [formDocRefNote, setFormDocRefNote] = useState('');
  const [confirmRequest, setConfirmRequest] = useState<ConfirmDialogRequest | null>(null);

  // Toggle Global Smart Suggestions
  const handleToggleGlobalSuggestions = () => {
    const next = !isSuggestionsEnabled;
    db.setSmartSuggestionsEnabled(next);
    onShowFeedback('success', `Smart Attention Suggestions ${next ? 'enabled' : 'disabled'}.`);
  };

  // Toggle rule active status
  const handleToggleRuleActive = (ruleId: string) => {
    const updated = rules.map(r => 
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    );
    db.updateAttentionRules(updated);
    onShowFeedback('success', 'Attention rule status updated.');
  };

  // Open Edit Modal
  const handleOpenEdit = (rule: FacilityAttentionRule) => {
    setEditingRule(rule);
    setFormName(rule.name);
    setFormPattern(rule.pattern);
    setFormIndicators(rule.indicators);
    setFormMealRelation(rule.mealRelation);
    setFormEquipmentNote(rule.equipmentNote || '');
    setFormDocRefNote(rule.docRefNote || '');
    setIsModalOpen(true);
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingRule(null);
    setFormName('');
    setFormPattern('');
    setFormIndicators(['HIGH_ALERT']);
    setFormMealRelation(undefined);
    setFormEquipmentNote('');
    setFormDocRefNote('');
    setIsModalOpen(true);
  };

  // Save Rule
  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPattern.trim() || formIndicators.length === 0) return;

    const patternError = validateAttentionPattern(formPattern.trim());
    if (patternError) {
      onShowFeedback('error', patternError);
      return;
    }

    if (editingRule) {
      const updated = rules.map(r => 
        r.id === editingRule.id
          ? {
              ...r,
              name: formName.trim(),
              pattern: formPattern.trim(),
              indicators: formIndicators,
              mealRelation: formMealRelation,
              equipmentNote: formEquipmentNote.trim() || undefined,
              docRefNote: formDocRefNote.trim() || undefined,
            }
          : r
      );
      db.updateAttentionRules(updated);
      onShowFeedback('success', `Updated rule "${formName.trim()}".`);
    } else {
      const newRule: FacilityAttentionRule = {
        id: `rule_custom_${Date.now()}`,
        name: formName.trim(),
        pattern: formPattern.trim(),
        indicators: formIndicators,
        mealRelation: formMealRelation,
        equipmentNote: formEquipmentNote.trim() || undefined,
        docRefNote: formDocRefNote.trim() || undefined,
        isActive: true,
        isSystem: false,
      };
      db.updateAttentionRules([...rules, newRule]);
      onShowFeedback('success', `Created custom rule "${newRule.name}".`);
    }

    setIsModalOpen(false);
  };

  // Reset to Factory Default Rules
  const handleReset = () => {
    setConfirmRequest({
      title: 'Reset Attention Rules?',
      message: 'Reset Task Attention Rules to Alberta Standard Clinical rules? This replaces the current rule list, including any custom rules, with the factory defaults.',
      confirmLabel: 'Reset Rules',
      tone: 'danger',
      onConfirm: () => {
        db.resetAttentionRules();
        onShowFeedback('success', 'Reset Task Attention Rules to factory standards.');
      },
    });
  };

  const filteredRules = rules.filter(r => 
    !searchQuery.trim() || 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.pattern.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ── GLOBAL MASTER TOGGLE ── */}
      <div className="bg-panel p-4 rounded-surface border border-hairline-strong shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-surface ${isSuggestionsEnabled ? 'bg-warning-soft text-warning' : 'bg-panel-sunken text-faint'}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-ink">Smart Task Attention Detection</h3>
            <p className="text-xs text-muted mt-0.5">
              Automatically proposes clinically relevant attention flags (High Alert, Time-Critical, 2P, Meal-Linked) when creating or modifying custom tasks.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleGlobalSuggestions}
          className={`px-4 py-2 text-xs font-bold rounded-control border transition-colors ${
            isSuggestionsEnabled
              ? 'bg-warning border-warning text-white'
              : 'bg-panel-sunken border-hairline-strong text-ink-soft'
          }`}
        >
          {isSuggestionsEnabled ? 'Suggestions Active (ON)' : 'Suggestions Disabled (OFF)'}
        </button>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-panel-sunken p-4 rounded-surface border border-hairline-strong">
        <div>
          <h4 className="text-xs font-bold text-ink uppercase tracking-wider">
            Facility Attention Rules ({rules.length})
          </h4>
          <p className="text-xs text-muted mt-0.5">
            Configured patterns and their corresponding operational attention indicators.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs text-ink-soft hover:text-danger font-bold border border-hairline-strong rounded-control hover:bg-panel-sunken flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-1.5 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Attention Rule</span>
          </button>
        </div>
      </div>

      {/* ── RULES LIST ── */}
      <div className="space-y-2.5">
        {filteredRules.map(rule => (
          <div
            key={rule.id}
            className={`p-3.5 rounded-surface border transition-all flex items-center justify-between ${
              rule.isActive ? 'bg-panel border-hairline-strong' : 'bg-panel-sunken border-hairline-strong opacity-60'
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs text-ink">{rule.name}</span>
                <span className="text-[10px] font-mono bg-panel-sunken text-ink-soft px-1.5 py-0.5 rounded">
                  Pattern: {rule.pattern}
                </span>
                {!rule.isActive && (
                  <span className="text-[10px] font-bold text-danger bg-danger-soft px-1.5 py-0.5 rounded">
                    Disabled
                  </span>
                )}
              </div>

              {/* Indicator Badges for this rule */}
              <div className="flex flex-wrap gap-1.5 items-center pt-0.5">
                {rule.indicators.map(ind => {
                  const d = getIndicatorBadgeDetails(ind, rule.mealRelation);
                  return (
                    <span
                      key={ind}
                      className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold ${d.badgeBg} ${d.badgeText} ${d.badgeBorder}`}
                    >
                      <span>[{d.shortAbbreviation}] {d.label}</span>
                    </span>
                  );
                })}

                {rule.equipmentNote && (
                  <span className="text-[10px] text-warning bg-warning-soft px-1.5 py-0.5 rounded border border-warning font-semibold">
                    Equipment: {rule.equipmentNote}
                  </span>
                )}
                {rule.docRefNote && (
                  <span className="text-[10px] text-accent-strong bg-accent-soft px-1.5 py-0.5 rounded border border-hairline-strong font-semibold">
                    Doc: {rule.docRefNote}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleToggleRuleActive(rule.id)}
                className={`px-2.5 py-1 text-xs font-bold rounded-control border transition-colors ${
                  rule.isActive 
                    ? 'border-hairline-strong text-ink-soft hover:bg-panel-sunken' 
                    : 'border-accent bg-accent-soft text-accent-strong'
                }`}
              >
                {rule.isActive ? 'Disable' : 'Enable'}
              </button>

              <button
                type="button"
                onClick={() => handleOpenEdit(rule)}
                className="p-1.5 hover:bg-panel-sunken rounded-control text-muted hover:text-ink"
                title="Edit rule"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ── CREATE / EDIT RULE MODAL ── */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingRule ? `Edit Rule "${editingRule.name}"` : 'Create Custom Attention Rule'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveRule} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Rule Name</label>
              <input
                type="text"
                required
                value={formName}
                onChange={e => setFormName(e.target.value)}
                placeholder="e.g. Anticoagulant Injection"
                className="w-full px-3 py-2 border border-hairline-strong rounded-control text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Trigger Pattern (Keyword or Regex)</label>
              <input
                type="text"
                required
                value={formPattern}
                onChange={e => setFormPattern(e.target.value)}
                placeholder="e.g. \b(heparin|dalteparin|fragmin)\b"
                className="w-full px-3 py-2 border border-hairline-strong rounded-control text-xs font-mono"
              />
            </div>

            {/* Indicator Toggles */}
            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1.5">Associated Indicators</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {([
                  'HIGH_ALERT', 
                  'TIME_CRITICAL', 
                  'MEAL_LINKED', 
                  'TWO_PERSON', 
                  'FOLLOW_UP', 
                  'OBSERVE', 
                  'PRECAUTION', 
                  'EQUIPMENT', 
                  'DOC_REF'
                ] as TaskAttentionIndicator[]).map(ind => {
                  const d = getIndicatorBadgeDetails(ind);
                  const isChecked = formIndicators.includes(ind);

                  return (
                    <label key={ind} className="flex items-center space-x-2 text-[11px] text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setFormIndicators(prev => 
                            isChecked ? prev.filter(x => x !== ind) : [...prev, ind]
                          );
                        }}
                        className="rounded text-accent focus:ring-accent w-3.5 h-3.5"
                      />
                      <span>[{d.shortAbbreviation}] {d.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Meal relation if meal-linked is selected */}
            {formIndicators.includes('MEAL_LINKED') && (
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1">Meal Timing Link</label>
                <select
                  value={formMealRelation || 'BEFORE_MEAL'}
                  onChange={e => setFormMealRelation(e.target.value as MealRelation)}
                  className="w-full px-3 py-2 border border-hairline-strong rounded-control text-xs bg-panel font-bold"
                >
                  <option value="BEFORE_MEAL">Before Meal</option>
                  <option value="WITH_MEAL">With Meal</option>
                  <option value="AFTER_MEAL">After Meal</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Equipment Note (Optional)</label>
              <input
                type="text"
                value={formEquipmentNote}
                onChange={e => setFormEquipmentNote(e.target.value)}
                placeholder="e.g. Transfer belt required"
                className="w-full px-3 py-2 border border-hairline-strong rounded-control text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-ink-soft mb-1">Documentation Reference Note (Optional)</label>
              <input
                type="text"
                value={formDocRefNote}
                onChange={e => setFormDocRefNote(e.target.value)}
                placeholder="e.g. Record BG in MAR / Flow Sheet"
                className="w-full px-3 py-2 border border-hairline-strong rounded-control text-xs"
              />
            </div>

            <div className="pt-3 border-t border-hairline-strong flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border border-hairline-strong rounded-control text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-accent hover:bg-accent-strong text-white rounded-control text-xs font-bold"
              >
                Save Rule
              </button>
            </div>
          </form>
        </Modal>
      )}

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  );
};
