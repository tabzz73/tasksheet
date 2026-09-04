import React, { useState } from 'react';
import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react';
import { Modal } from '../common/Modal';
import { DashboardWidgetConfig, DashboardWidgetId } from '../../types';
import { DEFAULT_DASHBOARD_LAYOUT } from '../../data/defaultData';
import { WIDGET_LABELS, WIDGET_DESCRIPTIONS } from './widgetLabels';

interface CustomizeDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  layout: DashboardWidgetConfig[];
  onSave: (layout: DashboardWidgetConfig[]) => void;
}

export const CustomizeDashboardModal: React.FC<CustomizeDashboardModalProps> = ({ isOpen, onClose, layout, onSave }) => {
  const [items, setItems] = useState<DashboardWidgetConfig[]>(layout);
  const [seededFor, setSeededFor] = useState(isOpen);
  if (isOpen && !seededFor) {
    setSeededFor(true);
    setItems(layout);
  }
  if (!isOpen && seededFor) setSeededFor(false);

  if (!isOpen) return null;

  const toggle = (id: DashboardWidgetId) => setItems(prev => prev.map(w => w.id === id ? { ...w, visible: !w.visible } : w));

  const move = (index: number, direction: -1 | 1) => {
    setItems(prev => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const footer = (
    <div className="w-full flex items-center justify-between">
      <button type="button" onClick={() => setItems(DEFAULT_DASHBOARD_LAYOUT)} className="text-[12px] font-bold text-ink-soft hover:text-ink flex items-center gap-1.5 transition-colors">
        <RotateCcw className="w-3.5 h-3.5" />
        Restore Default Layout
      </button>
      <div className="flex items-center gap-2.5">
        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
        <button type="button" onClick={() => onSave(items)} className="btn btn-accent">Save</button>
      </div>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Customize Dashboard" subtitle="Choose which cards appear and their order." maxWidth="md" footer={footer}>
      <ul className="divide-y divide-hairline">
        {items.map((widget, index) => (
          <li key={widget.id} className="flex items-center gap-2 py-2">
            <div className="flex flex-col shrink-0">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${WIDGET_LABELS[widget.id]} up`} className="p-0.5 text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label={`Move ${WIDGET_LABELS[widget.id]} down`} className="p-0.5 text-ink-soft hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
            <label className="flex-1 flex items-start gap-2.5 text-sm font-semibold text-ink cursor-pointer py-0.5">
              <input type="checkbox" checked={widget.visible} onChange={() => toggle(widget.id)} className="w-4 h-4 mt-0.5 rounded text-accent focus:ring-accent shrink-0" />
              <span>
                {WIDGET_LABELS[widget.id]}
                <span className="block text-xs font-normal text-muted mt-0.5">{WIDGET_DESCRIPTIONS[widget.id]}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Modal>
  );
};
