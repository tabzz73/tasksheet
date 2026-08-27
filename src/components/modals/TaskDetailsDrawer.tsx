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
import { formatRecurrenceHuman, isRecurrenceScheduleEnded } from '../../services/recurrence';
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
    new Date().toISOString().split('T')[0],
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
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
              {task.category}
            </span>
            {isStopped ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 flex items-center space-x-1">
                <PauseCircle className="w-3 h-3" />
                <span>Stopped / Inactive</span>
              </span>
            ) : isEnded ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-violet-100 text-violet-900 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Schedule Ended</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Active Schedule</span>
              </span>
            )}
          </div>

          <div className="text-right">
            {role && (
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                {role.name}
              </span>
            )}
          </div>
        </div>

        {/* Schedule & Context Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div>
            <span className="text-slate-400 font-medium block">Scheduled Time:</span>
            <div className="flex items-center space-x-1 font-bold text-slate-900 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>{task.time ? `${task.time} (24h)` : 'Flexible / No Time'}</span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 font-medium block">Recurrence:</span>
            <div className="flex items-center space-x-1 font-bold text-slate-900 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>{frequencyLabel()}</span>
            </div>
          </div>

          {isCareTask && resident && (
            <div className="col-span-2 pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 font-medium block">Assigned Resident:</span>
              <div className="flex items-center space-x-1.5 font-bold text-slate-900 mt-0.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Room {resident.roomNumber} — {resident.firstName} {resident.lastName}</span>
              </div>
            </div>
          )}

          {shift && (
            <div className="col-span-2 pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 font-medium block">Operational Shift:</span>
              <div className="font-semibold text-slate-800 mt-0.5 flex items-center space-x-1.5">
                {shift.shortCode && (
                  <span className="px-1.5 py-0.2 bg-slate-900 text-white rounded font-mono font-bold text-[10px]">
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
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
            <FileText className="w-3.5 h-3.5 text-slate-500" />
            <span>Instructions & Care Details</span>
          </h4>
          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
            {task.instructions || 'No specific special instructions recorded. Follow standard clinical routine.'}
          </div>
        </div>

        {/* Attention & Safety Indicators Section */}
        {task.attentionConfig?.indicators && task.attentionConfig.indicators.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Attention & Safety Indicators ({task.attentionConfig.indicators.length})</span>
            </h4>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {task.attentionConfig.indicators.map(ind => {
                  const d = getIndicatorBadgeDetails(ind, task.attentionConfig?.mealRelation);
                  const meta = task.attentionConfig?.metadata?.find(m => m.indicator === ind);

                  return (
                    <div key={ind} className="p-2 bg-white border border-slate-200 rounded-lg space-y-1 shadow-2xs">
                      <div className="flex items-center space-x-1.5 font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${d.badgeBg} ${d.badgeText} ${d.badgeBorder} border`}>
                          [{d.shortAbbreviation}]
                        </span>
                        <span className="text-slate-900">{d.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{d.tooltip}</p>
                      {meta?.reason && (
                        <p className="text-[10px] text-slate-400 italic">
                          Trigger: {meta.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {task.attentionConfig.equipmentNote && (
                <div className="text-[11px] font-bold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  Equipment Note: {task.attentionConfig.equipmentNote}
                </div>
              )}
              {task.attentionConfig.docRefNote && (
                <div className="text-[11px] font-bold text-blue-800 bg-blue-50 p-2 rounded-lg border border-blue-200">
                  Documentation Reference: {task.attentionConfig.docRefNote}
                </div>
              )}
            </div>
          </div>
        )}



        {/* Drawer Action Bar */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow"
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
                className="px-3 py-2 border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
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
              className="px-3 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
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
                className="px-3 py-2 border border-amber-300 hover:bg-amber-50 text-amber-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Stop Task</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onReactivate();
                }}
                className="px-3 py-2 bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
              >
                <PlayCircle className="w-3.5 h-3.5 text-teal-600" />
                <span>Resume Task</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onDelete();
              }}
              className="px-3 py-2 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
