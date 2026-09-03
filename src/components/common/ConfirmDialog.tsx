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
        <div className="flex items-start gap-3">
          {isDanger ? (
            <AlertTriangle className="w-4.5 h-4.5 text-danger shrink-0 mt-0.5" />
          ) : (
            <HelpCircle className="w-4.5 h-4.5 text-accent shrink-0 mt-0.5" />
          )}
          <p className="text-[13px] text-ink-soft leading-relaxed whitespace-pre-line">{request.message}</p>
        </div>

        <div className="pt-3 border-t border-hairline flex items-center justify-end gap-2.5">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            {request.cancelLabel || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={() => { request.onConfirm(); onClose(); }}
            className={`btn ${isDanger ? 'btn-danger' : 'btn-accent'}`}
          >
            {request.confirmLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
