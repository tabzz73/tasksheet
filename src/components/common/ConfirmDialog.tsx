import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { Modal } from './Modal';

export interface ConfirmDialogRequest {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 'danger' for destructive/irreversible actions, 'default' for routine confirmations. */
  tone?: 'danger' | 'default';
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  request: ConfirmDialogRequest | null;
  onClose: () => void;
}

/**
 * Shared accessible replacement for window.confirm(). Reuses Modal's focus
 * trap, initial focus, focus restoration, and Escape-to-close behavior.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ request, onClose }) => {
  if (!request) return null;
  const isDanger = request.tone === 'danger';

  return (
    <Modal isOpen={!!request} onClose={onClose} title={request.title} maxWidth="sm">
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          {isDanger ? (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-5 h-5 text-teal-600 shrink-0 mt-0.5" />
          )}
          <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{request.message}</p>
        </div>

        <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            {request.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => { request.onConfirm(); onClose(); }}
            className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow transition-colors ${
              isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            {request.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
