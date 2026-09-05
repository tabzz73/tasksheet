import React from 'react';
import { 
  Clock, 
  Calendar, 
  User, 
  CheckCircle2,
  Edit3, 
  Copy, 
  PauseCircle, 
  PlayCircle, 
  RotateCcw,
  Trash2,
  FileText
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { db } from '../../db';
import { ResidentTask, UnitTask, Resident, Shift, Role } from '../../types';
import { formatRecurrenceHuman, isRecurrenceScheduleEnded, getTodayLocalDateString } from '../../services/recurrence';
import { getIndicatorBadgeDetails } from '../../services/attention';
import { AlertTriangle, Sparkles } from 'lucide-react';

interface TaskDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  careTask?: ResidentTask | null;
  unitTask?: UnitTask | null;
  onEdit: () => void;
  onDuplicate: () => void;
  onStop: () => void;
  onReactivate: () => void;
  onRestart?: () => void;
  onDelete: () => void;
}

export const TaskDetailsDrawer: React.FC<TaskDetailsDrawerProps> = ({
  isOpen,
  onClose,
  careTask,
  unitTask,
  onEdit,
  onDuplicate,
  onStop,
  onReactivate,
  onRestart,
  onDelete
}) => {
  if (!careTask && !unitTask) return null;

  const state = db.getState();

  const isCareTask = !!careTask;
  const task = careTask || unitTask!;
  const isStopped = task.isActive === false;
  const isEnded = !isStopped && isRecurrenceScheduleEnded(
    task.recurrenceRule,
    task.frequency,
    getTodayLocalDateString(),
    task.createdAt,
  );

  let resident: Resident | undefined;
  let shift: Shift | undefined;
  let role: Role | undefined;

  if (isCareTask && careTask) {
    resident = state.residents.find(r => r.id === careTask.residentId);
    shift = state.shifts.find(s => s.id === careTask.shiftId);
    role = state.roles.find(r => r.id === (careTask.roleId || shift?.roleId));
  } else if (unitTask) {
    shift = state.shifts.find(s => s.id === unitTask.shiftId);
    role = state.roles.find(r => r.id === (unitTask.roleId || shift?.roleId));
  }

  const hasHistory = db.hasTaskHistory(task.id);

  const frequencyLabel = () => {
    return formatRecurrenceHuman(task.recurrenceRule, task.frequency);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task.title}
      subtitle={
        isCareTask && resident
          ? `Room ${resident.roomNumber} — ${resident.firstName} ${resident.lastName}`
          : shift
          ? `${shift.name} (${shift.startTime}–${shift.endTime})`
          : undefined
      }
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Status Banner */}
        <div className="flex items-center justify-between pb-3 border-b border-hairline-strong">
          <div className="flex items-center space-x-2">
            <span className="badge badge-neutral">{task.category}</span>
            {isStopped ? (
              <span className="badge badge-warning flex items-center space-x-1">
                <PauseCircle className="w-3 h-3" />
                <span>Stopped / Inactive</span>
              </span>
            ) : isEnded ? (
              <span className="badge badge-neutral flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Schedule Ended</span>
              </span>
            ) : (
              <span className="badge badge-positive flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Active Schedule</span>
              </span>
            )}
          </div>

          <div className="text-right">
            {role && <span className="badge badge-neutral">{role.name}</span>}
          </div>
        </div>

        {/* Schedule & Context Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-panel-sunken border border-hairline-strong rounded-control text-xs">
          <div>
            <span className="text-faint font-medium block">Scheduled Time:</span>
            <div className="flex items-center space-x-1 font-bold text-ink mt-0.5">
              <Clock className="w-3.5 h-3.5 text-accent" />
              <span>{task.time ? `${task.time} (24h)` : careTask?.trackingConfig?.scheduledTimes?.length ? careTask.trackingConfig.scheduledTimes.join(', ') : 'Flexible / No Time'}</span>
            </div>
          </div>

          <div>
            <span className="text-faint font-medium block">Recurrence:</span>
            <div className="flex items-center space-x-1 font-bold text-ink mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>{frequencyLabel()}</span>
            </div>
          </div>

          {isCareTask && resident && (
            <div className="col-span-2 pt-2 border-t border-hairline">
              <span className="text-faint font-medium block">Assigned Resident:</span>
              <div className="flex items-center space-x-1.5 font-bold text-ink mt-0.5">
                <User className="w-3.5 h-3.5 text-muted" />
                <span>Room {resident.roomNumber} — {resident.firstName} {resident.lastName}</span>
              </div>
            </div>
          )}

          {shift && (
            <div className="col-span-2 pt-2 border-t border-hairline">
              <span className="text-faint font-medium block">Operational Shift:</span>
              <div className="font-semibold text-ink-soft mt-0.5 flex items-center space-x-1.5">
                {shift.shortCode && (
                  <span className="px-1.5 py-0.2 bg-ink text-white rounded font-mono font-black text-[10px]">
                    {shift.shortCode}
                  </span>
                )}
                <span>{shift.name} ({shift.startTime}–{shift.endTime})</span>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div>
          <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <FileText className="w-3.5 h-3.5 text-muted" />
            <span>Instructions & Care Details</span>
          </h4>
          <div className="p-3 bg-panel border border-hairline-strong rounded-control text-xs text-ink-soft whitespace-pre-wrap leading-relaxed">
            {task.instructions || 'No specific special instructions recorded. Follow standard clinical routine.'}
          </div>
        </div>

        {/* Attention & Safety Indicators Section */}
        {task.attentionConfig?.indicators && task.attentionConfig.indicators.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-warning" />
              <span>Attention & Safety Indicators ({task.attentionConfig.indicators.length})</span>
            </h4>
            <div className="p-3 bg-panel-sunken border border-hairline-strong rounded-control space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {task.attentionConfig.indicators.map(ind => {
                  const d = getIndicatorBadgeDetails(ind, task.attentionConfig?.mealRelation);
                  const meta = task.attentionConfig?.metadata?.find(m => m.indicator === ind);

                  return (
                    <div key={ind} className="p-2 bg-panel border border-hairline-strong rounded-control space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${d.badgeBg} ${d.badgeText} ${d.badgeBorder} border`}>
                          [{d.shortAbbreviation}]
                        </span>
                        <span className="text-ink">{d.label}</span>
                      </div>
                      <p className="text-[11px] text-muted leading-tight">{d.tooltip}</p>
                      {meta?.reason && (
                        <p className="text-[10px] text-faint italic">
                          Trigger: {meta.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {task.attentionConfig.equipmentNote && (
                <div className="text-[11px] font-bold text-warning bg-warning-soft p-2 rounded-control border border-warning">
                  Equipment Note: {task.attentionConfig.equipmentNote}
                </div>
              )}
              {task.attentionConfig.docRefNote && (
                <div className="text-[11px] font-bold text-accent-strong bg-accent-soft p-2 rounded-control border border-hairline-strong">
                  Documentation Reference: {task.attentionConfig.docRefNote}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Drawer Action Bar */}
        <div className="pt-4 border-t border-hairline-strong flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="btn btn-accent"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{isEnded ? 'Edit / Extend Schedule' : 'Edit Task'}</span>
            </button>

            {isEnded && onRestart && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onRestart();
                }}
                className="btn btn-secondary"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restart Today</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onDuplicate();
              }}
              className="btn btn-secondary"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            {!isStopped ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStop();
                }}
                className="btn btn-secondary"
              >
                <PauseCircle className="w-3.5 h-3.5 text-warning" />
                <span>Stop Task</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReactivate();
                }}
                className="btn btn-secondary"
              >
                <PlayCircle className="w-3.5 h-3.5 text-accent" />
                <span>Resume Task</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="btn btn-secondary"
            >
              <Trash2 className="w-3.5 h-3.5 text-danger" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
