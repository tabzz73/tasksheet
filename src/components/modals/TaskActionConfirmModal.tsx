import React from 'react';
import { AlertTriangle, PauseCircle, Trash2 } from 'lucide-react';
import { Modal } from '../common/Modal';

interface TaskActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'stop' | 'delete';
  title: string;
  itemDescription: string;
  hasHistory?: boolean;
  onConfirm: () => void;
}

export const TaskActionConfirmModal: React.FC<TaskActionConfirmModalProps> = ({
  isOpen,
  onClose,
  actionType,
  title,
  itemDescription,
  hasHistory = false,
  onConfirm
}) => {
  const isStop = actionType === 'stop';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isStop ? 'Stop This Task?' : 'Delete This Care Task?'}
      maxWidth="md"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          {isStop ? (
            <PauseCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <div className="text-xs text-slate-700 space-y-1">
            <p className="font-semibold text-slate-900">{title}</p>
            <p className="text-slate-500 font-mono text-[11px]">{itemDescription}</p>
          </div>
        </div>

        {isStop ? (
          <div className="text-xs text-slate-600 space-y-2">
            <p>
              The task will no longer generate future assignments on shift sheets.
            </p>
            <p className="font-medium text-slate-800">
              ✓ All previous completion records and history will be retained.
            </p>
          </div>
        ) : (
          <div className="text-xs text-slate-600 space-y-2">
            <p>
              This will stop future assignments for this task. Existing historical completion records will not be reassigned to another resident.
            </p>
            {hasHistory && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-[11px]">
                <strong>Clinical Note:</strong> This task has prior completion history. Stopping the task is recommended over deletion to preserve documentation integrity.
              </div>
            )}
          </div>
        )}

        <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 text-white rounded-lg text-xs font-bold shadow transition-colors flex items-center space-x-1.5 ${
              isStop
                ? 'bg-amber-600 hover:bg-amber-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isStop ? (
              <>
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Stop This Task</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
