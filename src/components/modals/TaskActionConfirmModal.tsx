import React from 'react';
import { AlertTriangle, PauseCircle, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';

interface TaskActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'stop' | 'delete';
  /** Entity kind shown in the dialog heading, e.g. "Care Task", "Unit Task", "Wound Protocol", "FYI". */
  itemType: string;
  title: string;
  itemDescription: string;
  hasHistory?: boolean;
  onConfirm: () => void;
}

export const TaskActionConfirmModal: React.FC<TaskActionConfirmModalProps> = ({
  isOpen,
  onClose,
  actionType,
  itemType,
  title,
  itemDescription,
  hasHistory = false,
  onConfirm
}) => {
  const isStop = actionType === 'stop';
  const itemLabel = itemType.toLowerCase();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isStop ? `Stop This ${itemType}?` : `Delete This ${itemType}?`}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-3.5 rounded-control bg-panel-sunken border border-hairline-strong">
          {isStop ? (
            <PauseCircle className="w-4.5 h-4.5 text-warning shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4.5 h-4.5 text-danger shrink-0 mt-0.5" />
          )}
          <div className="text-xs text-ink-soft space-y-1">
            <p className="font-semibold text-ink">{title}</p>
            <p className="text-muted font-mono text-[11px]">{itemDescription}</p>
          </div>
        </div>

        {isStop ? (
          <div className="text-xs text-ink-soft space-y-2">
            <p>
              This {itemLabel} will no longer generate future assignments on shift sheets.
            </p>
            <p className="font-medium text-ink">
              ✓ Its record is retained here and can be reactivated or restarted later.
            </p>
          </div>
        ) : (
          <div className="text-xs text-ink-soft space-y-2">
            <p>
              This will permanently remove this {itemLabel}. It will no longer generate assignments or appear on any generated TaskSheet.
            </p>
            {hasHistory && (
              <div className="p-2.5 bg-warning-soft border border-warning rounded-control text-warning text-[11px]">
                <strong>Note:</strong> This {itemLabel} has prior activity in TaskSheet. Stopping it is recommended over deleting so its record is preserved for review.
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-hairline flex items-center justify-end space-x-3">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`btn ${isStop ? 'btn-primary' : 'btn-danger'}`}
          >
            {isStop ? (
              <>
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Stop {itemType}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {itemType}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
