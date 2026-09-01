import React, { useEffect, useRef, useState } from 'react';
import {
  Printer,
  Plus,
  Info,
  Bandage,
  ChevronRight,
  ArrowLeft,
  HeartHandshake,
  MoreVertical,
  CheckSquare,
  Clock,
  AlertTriangle,
  LayoutList,
  Users,
  FileText,
  ClipboardList
} from 'lucide-react';
import { db } from '../../db';
import { generateShiftSheet, GeneratedShiftSheet } from '../../services/generator';
import { Shift, UnitTask, ResidentTask, Wound, FYI, PrintProfile } from '../../types';
import { TaskActionMenu } from '../common/TaskActionMenu';
import { TaskActionConfirmModal } from '../modals/TaskActionConfirmModal';
import { ConfirmDialog, ConfirmDialogRequest } from '../common/ConfirmDialog';
import { GlobalAddModal } from '../modals/GlobalAddModal';
import { TaskDetailsDrawer } from '../modals/TaskDetailsDrawer';
import { PrintDocumentView } from '../print/PrintDocumentView';
import { PrintService } from '../../services/print';
import { TaskAttentionBadges } from '../common/TaskAttentionBadges';
import { 
  getEntry, 
  detectChanges, 
  buildWhatChangedModel, 
  formatGeneratedAt, 
  TaskSnapshotItem 
} from '../../services/printHistory';
import { SpecializedPrintDoc } from './PrintPreviewPage';
import { formatRecurrenceHuman, isRecurrenceScheduleEnded, restartRecurrenceRule, getTodayLocalDateString } from '../../services/recurrence';

type WorkspaceTab = 'timeline' | 'residents' | 'preview';

interface ShiftWorkspaceViewProps {
  shiftId: string;
  currentDate: string;
  onBack: () => void;
  onPrint: (sheet: GeneratedShiftSheet) => void;
  onPrintSpecializedDoc?: (doc: SpecializedPrintDoc) => void;
  onOpenAddCareTask: (residentId?: string) => void;
  onOpenAddUnitTask: () => void;
  onOpenAddFYI: () => void;
  onOpenAddWound: () => void;
  onOpenResidentProfile: (residentId: string) => void;
}

export const ShiftWorkspaceView: React.FC<ShiftWorkspaceViewProps> = ({
  shiftId,
  currentDate,
  onBack,
  onPrint,
  onPrintSpecializedDoc,
  onOpenAddCareTask,
  onOpenAddUnitTask,
  onOpenAddFYI,
  onOpenAddWound,
  onOpenResidentProfile,
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('timeline');
  const [previewProfile, setPreviewProfile] = useState<PrintProfile>('role_default');
  const [fyiCollapsed, setFyiCollapsed] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const addMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!addMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setAddMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAddMenuOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [addMenuOpen]);

  useEffect(() => setAddMenuOpen(false), [shiftId]);

  // Task Details Drawer state
  const [drawerTask, setDrawerTask] = useState<{ careTask?: ResidentTask | null; unitTask?: UnitTask | null } | null>(null);

  // Edit / Duplicate Modal State
  const [editTaskState, setEditTaskState] = useState<{
    isOpen: boolean;
    mode: 'edit' | 'duplicate';
    careTask?: ResidentTask | null;
    unitTask?: UnitTask | null;
    wound?: Wound | null;
    fyi?: FYI | null;
  }>({
    isOpen: false,
    mode: 'edit',
    careTask: null,
    unitTask: null,
    wound: null,
    fyi: null,
  });

  // Stop / Delete confirm modal state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    actionType: 'stop' | 'delete';
    itemType: string;
    title: string;
    description: string;
    hasHistory: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    actionType: 'stop',
    itemType: 'Care Task',
    title: '',
    description: '',
    hasHistory: false,
    onConfirm: () => {},
  });
  const [confirmRequest, setConfirmRequest] = useState<ConfirmDialogRequest | null>(null);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Generate current shift sheet
  const sheet = generateShiftSheet(currentDate, shiftId);
  const { shift, role, startUnitTasks, duringUnitTasks, endUnitTasks, residentAssignments, prnTasks, importantFYIs, metrics } = sheet;
  const clinicalRoleText = `${role.code || ''} ${role.name || ''}`.toLowerCase();
  const isClinicalShift = clinicalRoleText.includes('lpn') || clinicalRoleText.includes('rn') || clinicalRoleText.includes('nurse');
  const todayDateStr = getTodayLocalDateString();
  const endedUnitTasks = db.getState().unitTasks
    .filter(task => task.isActive !== false)
    .filter(task => task.shiftId ? task.shiftId === shiftId : task.roleId === role.id)
    .filter(task => isRecurrenceScheduleEnded(task.recurrenceRule, task.frequency, todayDateStr, task.createdAt))
    .sort((a, b) => (a.time || '9999').localeCompare(b.time || '9999'));

  // Build structured task snapshots for delta tracking
  const structuredTasks: TaskSnapshotItem[] = [];
  residentAssignments.forEach(a => {
    a.tasks.forEach(t => {
      structuredTasks.push({
        id: t.id,
        roomNumber: a.resident.roomNumber,
        residentName: `${a.resident.firstName} ${a.resident.lastName}`,
        title: t.title,
        time: t.time,
        category: t.category,
        instructions: t.instructions,
        priority: t.priority,
        updatedAt: (t as any).updatedAt || (t as any).createdAt || '',
      });
    });
    a.wounds.forEach(w => {
      structuredTasks.push({
        id: w.id,
        roomNumber: a.resident.roomNumber,
        residentName: `${a.resident.firstName} ${a.resident.lastName}`,
        title: `Wound Care: ${w.siteLocation}`,
        time: w.time,
        category: 'Wound Care',
        instructions: w.instructions,
        updatedAt: (w as any).updatedAt || (w as any).createdAt || '',
      });
    });
  });

  const lastEntry = getEntry(shift.id, currentDate);
  const changes = detectChanges(shift.id, currentDate, structuredTasks);

  // ── Care Task Actions ──────────────────────────────────────────────────────
  const handleEditCareTask = (task: ResidentTask) =>
    setEditTaskState({ isOpen: true, mode: 'edit', careTask: task, unitTask: null });

  const handleDuplicateCareTask = (task: ResidentTask) =>
    setEditTaskState({ isOpen: true, mode: 'duplicate', careTask: task, unitTask: null });

  const handleStopCareTask = (task: ResidentTask) => {
    const res = db.getState().residents.find(r => r.id === task.residentId);
    setConfirmModalState({
      isOpen: true,
      actionType: 'stop',
      itemType: 'Care Task',
      title: task.title,
      description: `Room ${res?.roomNumber || '—'} · ${res?.firstName} ${res?.lastName} · ${task.time || 'Flexible'}`,
      hasHistory: db.hasTaskHistory(task.id),
      onConfirm: () => {
        db.stopResidentTask(task.id);
        showToast(`Stopped "${task.title}".`);
      },
    });
  };

  const handleRestartCareTask = (task: ResidentTask) => {
    if (!task.recurrenceRule) return;
    setConfirmRequest({
      title: 'Restart Care Task?',
      message: `Restart "${task.title}" beginning today (${todayDateStr})? The existing care-task record and recurrence pattern will be preserved.`,
      confirmLabel: 'Restart Task',
      onConfirm: () => {
        db.updateResidentTask(task.id, {
          recurrenceRule: restartRecurrenceRule(task.recurrenceRule!, todayDateStr),
          isActive: true,
          stoppedAt: undefined,
        });
        showToast(`Restarted "${task.title}" beginning ${todayDateStr}.`);
      },
    });
  };

  const handleDeleteCareTask = (task: ResidentTask) => {
    const res = db.getState().residents.find(r => r.id === task.residentId);
    const hasHistory = db.hasTaskHistory(task.id);
    setConfirmModalState({
      isOpen: true,
      actionType: hasHistory ? 'stop' : 'delete',
      itemType: 'Care Task',
      title: task.title,
      description: `Room ${res?.roomNumber || '—'} · ${res?.firstName} ${res?.lastName}`,
      hasHistory,
      onConfirm: () => {
        if (hasHistory) { db.stopResidentTask(task.id); showToast('Task stopped.'); }
        else { db.deleteResidentTask(task.id); showToast(`Deleted "${task.title}".`); }
      },
    });
  };

  // ── Unit Task Actions ──────────────────────────────────────────────────────
  const handleEditUnitTask = (task: UnitTask) =>
    setEditTaskState({ isOpen: true, mode: 'edit', careTask: null, unitTask: task });

  const handleDuplicateUnitTask = (task: UnitTask) =>
    setEditTaskState({ isOpen: true, mode: 'duplicate', careTask: null, unitTask: task });

  const handleStopUnitTask = (task: UnitTask) => {
    setConfirmModalState({
      isOpen: true,
      actionType: 'stop',
      itemType: 'Unit Task',
      title: task.title,
      description: `${shift.name} · ${task.shiftPhase.toUpperCase()} · ${task.time || 'Flexible'}`,
      hasHistory: db.hasTaskHistory(task.id),
      onConfirm: () => { db.stopUnitTask(task.id); showToast(`Stopped "${task.title}".`); },
    });
  };

  const handleRestartUnitTask = (task: UnitTask) => {
    if (!task.recurrenceRule) return;
    setConfirmRequest({
      title: 'Restart Unit Task?',
      message: `Restart "${task.title}" beginning today (${todayDateStr})? The existing unit-routine record and recurrence pattern will be preserved.`,
      confirmLabel: 'Restart Task',
      onConfirm: () => {
        db.updateUnitTask(task.id, {
          recurrenceRule: restartRecurrenceRule(task.recurrenceRule!, todayDateStr),
          isActive: true,
          stoppedAt: undefined,
        });
        showToast(`Restarted "${task.title}" beginning ${todayDateStr}.`);
      },
    });
  };

  const handleDeleteUnitTask = (task: UnitTask) => {
    const hasHistory = db.hasTaskHistory(task.id);
    setConfirmModalState({
      isOpen: true,
      actionType: hasHistory ? 'stop' : 'delete',
      itemType: 'Unit Task',
      title: task.title,
      description: `${shift.name} · ${task.time || 'Flexible'}`,
      hasHistory,
      onConfirm: () => {
        if (hasHistory) { db.stopUnitTask(task.id); showToast('Unit routine stopped.'); }
        else { db.deleteUnitTask(task.id); showToast(`Deleted "${task.title}".`); }
      },
    });
  };

  const handleEditWound = (w: Wound) =>
    setEditTaskState({ isOpen: true, mode: 'edit', careTask: null, unitTask: null, wound: w, fyi: null });

  const handleDeleteWound = (w: Wound) => {
    const res = db.getState().residents.find(r => r.id === w.residentId);
    setConfirmModalState({
      isOpen: true,
      actionType: 'delete',
      itemType: 'Wound Protocol',
      title: `Wound Protocol: ${w.siteLocation}`,
      description: `Room ${res?.roomNumber || '—'} · ${res?.firstName} ${res?.lastName}`,
      hasHistory: false,
      onConfirm: () => { db.deleteWound(w.id); showToast(`Wound protocol deleted.`); },
    });
  };

  // ── Unit task row ─────────────────────────────────────────────────────────
  const renderUnitTaskRow = (u: UnitTask) => (
    <div key={u.id} className="flex items-start justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
      <div className="flex items-start space-x-3 flex-1 mr-3">
        <span className="mt-0.5 w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0 opacity-40" />
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-900">{u.title}</span>
            {u.time && (
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-600">
                {u.time}
              </span>
            )}
            {u.resultType === 'temperature' && (
              <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-semibold">TEMP °C</span>
            )}
            {u.resultType === 'pass_issue' && (
              <span className="text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">☐ OK  ☐ Issue</span>
            )}
          </div>
          {u.instructions && <p className="text-xs text-slate-500 mt-0.5">{u.instructions}</p>}
        </div>
      </div>
      <TaskActionMenu
        onViewDetails={() => setDrawerTask({ unitTask: u })}
        onEdit={() => handleEditUnitTask(u)}
        onDuplicate={() => handleDuplicateUnitTask(u)}
        onStop={() => handleStopUnitTask(u)}
        onDelete={() => handleDeleteUnitTask(u)}
        hasHistory={db.hasTaskHistory(u.id)}
        itemType="unit_task"
        ariaLabel={`Actions for ${u.title}`}
      />
    </div>
  );

  const renderEndedUnitTaskRow = (u: UnitTask) => (
    <div key={u.id} className="flex items-start justify-between px-5 py-3.5 bg-violet-50/50 hover:bg-violet-50 transition-colors">
      <div className="flex items-start space-x-3 flex-1 mr-3">
        <CheckSquare className="w-4 h-4 text-violet-600 mt-0.5 shrink-0" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-violet-950">{u.title}</span>
            {u.time && <span className="text-xs px-2 py-0.5 rounded font-mono bg-white text-slate-600">{u.time}</span>}
            <span className="text-[10px] bg-violet-100 text-violet-900 font-bold px-1.5 py-0.5 rounded">Schedule Ended</span>
          </div>
          <p className="text-xs text-violet-800 mt-0.5">{formatRecurrenceHuman(u.recurrenceRule, u.frequency)}</p>
        </div>
      </div>
      <TaskActionMenu
        onViewDetails={() => setDrawerTask({ unitTask: u })}
        onEdit={() => handleEditUnitTask(u)}
        onDuplicate={() => handleDuplicateUnitTask(u)}
        onRestart={() => handleRestartUnitTask(u)}
        onStop={() => handleStopUnitTask(u)}
        onDelete={() => handleDeleteUnitTask(u)}
        isEnded
        hasHistory={db.hasTaskHistory(u.id)}
        itemType="unit_task"
        ariaLabel={`Actions for ended ${u.title}`}
      />
    </div>
  );

  // ── Resident task row ─────────────────────────────────────────────────────
  const renderCareTaskRow = (task: ResidentTask) => (
    <div key={task.id} className="flex items-start justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
      <div className="flex items-start space-x-3 flex-1 mr-3">
        <span className="mt-0.5 w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0 opacity-40" />
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold text-slate-900">{task.title}</span>
            {task.time && (
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-slate-100 text-slate-600">{task.time}</span>
            )}
            {task.priority === 'urgent' && (
              <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-bold uppercase">Urgent</span>
            )}
            {task.priority === 'high' && (
              <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">High</span>
            )}
            <TaskAttentionBadges attentionConfig={task.attentionConfig} />
          </div>
          {task.instructions && <p className="text-xs text-slate-500 mt-0.5">{task.instructions}</p>}
        </div>
      </div>
      <TaskActionMenu
        onViewDetails={() => setDrawerTask({ careTask: task })}
        onEdit={() => handleEditCareTask(task)}
        onDuplicate={() => handleDuplicateCareTask(task)}
        onStop={() => handleStopCareTask(task)}
        onDelete={() => handleDeleteCareTask(task)}
        hasHistory={db.hasTaskHistory(task.id)}
        itemType="care_task"
        ariaLabel={`Actions for ${task.title}`}
      />
    </div>
  );

  // ── Section header ────────────────────────────────────────────────────────
  const SectionHeader = ({ label, count, accent }: { label: string; count?: number; accent?: string }) => (
    <div className={`px-5 py-2.5 border-b border-slate-200 flex items-center justify-between ${accent || 'bg-slate-50'}`}>
      <h3 className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{label}</h3>
      {count !== undefined && (
        <span className="text-[11px] text-slate-400 font-medium tabular-nums">{count}</span>
      )}
    </div>
  );

  // ── Time slot header in Timeline ──────────────────────────────────────────
  const TimeSlotHeader = ({ time }: { time: string }) => (
    <div className="flex items-center space-x-3 px-5 py-2 bg-white border-b border-slate-100">
      <Clock className="w-3 h-3 text-slate-400" />
      <span className="text-xs font-black text-slate-500 font-mono tracking-wider tabular-nums">{time}</span>
      <div className="flex-1 border-t border-slate-100" />
    </div>
  );

  // ── FYI banner (used in Timeline) ─────────────────────────────────────────
  const FyiBanner = () => {
    if (importantFYIs.length === 0) return null;
    const hasUrgent = importantFYIs.some(f => f.importance === 'urgent');
    return (
      <div className={`border-b border-slate-200 ${hasUrgent ? 'bg-rose-50/60' : 'bg-amber-50/60'}`}>
        <button
          type="button"
          onClick={() => setFyiCollapsed(v => !v)}
          className="w-full px-5 py-2.5 flex items-center justify-between text-left"
        >
          <div className="flex items-center space-x-2">
            {hasUrgent
              ? <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              : <Info className="w-3.5 h-3.5 text-amber-700" />
            }
            <span className={`text-[11px] font-black uppercase tracking-widest ${hasUrgent ? 'text-rose-800' : 'text-amber-900'}`}>
              Important FYIs
            </span>
            <span className={`text-[11px] font-medium ${hasUrgent ? 'text-rose-600' : 'text-amber-700'}`}>
              {importantFYIs.length}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">{fyiCollapsed ? 'Show' : 'Collapse'}</span>
        </button>
        {!fyiCollapsed && (
          <div className="px-5 pb-3 space-y-2">
            {importantFYIs.map(f => {
              const res = f.residentId ? db.getState().residents.find(r => r.id === f.residentId) : null;
              const isUrgent = f.importance === 'urgent';
              return (
                <div key={f.id} className="flex items-start space-x-2 text-xs">
                  <span className={`shrink-0 font-bold mt-0.5 ${isUrgent ? 'text-rose-600' : 'text-amber-700'}`}>
                    {isUrgent ? '!!' : '·'}
                  </span>
                  <div>
                    {res && (
                      <span className="font-semibold text-slate-800 mr-1">
                        Room {res.roomNumber} · {res.firstName} {res.lastName}
                      </span>
                    )}
                    {!res && <span className="font-semibold text-slate-800 mr-1">Unit:</span>}
                    <span className="text-slate-600">{f.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── TIMELINE TAB ──────────────────────────────────────────────────────────
  const TimelineView = () => {
    // Build interleaved timeline
    type TimelineItem =
      | { kind: 'phase_header'; phase: 'start' | 'during' | 'end'; tasks: UnitTask[] }
      | { kind: 'time_slot'; time: string; items: Array<{ task?: ResidentTask; room?: string; name?: string; unitTask?: UnitTask }> };

    // Collect all resident tasks with time
    const residentTimedTasks: Array<{ time: string; task: ResidentTask; room: string; name: string }> = [];
    residentAssignments.forEach(a => {
      a.tasks.forEach(t => {
        residentTimedTasks.push({
          time: t.time || '9999',
          task: t,
          room: a.resident.roomNumber,
          name: `${a.resident.firstName} ${a.resident.lastName}`,
        });
      });
    });
    residentTimedTasks.sort((a, b) => a.time.localeCompare(b.time));

    // Group resident tasks by time slot
    const slotMap = new Map<string, typeof residentTimedTasks>();
    residentTimedTasks.forEach(item => {
      const t = item.time;
      if (!slotMap.has(t)) slotMap.set(t, []);
      slotMap.get(t)!.push(item);
    });

    const firstResidentTime = residentTimedTasks[0]?.time || '9999';
    const lastResidentTime = residentTimedTasks[residentTimedTasks.length - 1]?.time || '0000';

    // During unit tasks — show near midpoint (just insert between first and last resident tasks)
    // We render them in their own mini-section at the appropriate time
    const duringTime = duringUnitTasks.length > 0 ? (duringUnitTasks[0].time || '1200') : null;

    return (
      <div className="divide-y divide-slate-100">
        {/* START OF SHIFT */}
        {startUnitTasks.length > 0 && (
          <>
            <SectionHeader label="Start of Shift" count={startUnitTasks.length} />
            {startUnitTasks.map(renderUnitTaskRow)}
          </>
        )}

        {/* FYI Banner */}
        <FyiBanner />

        {/* RESIDENT CARE — Timeline slots */}
        {residentTimedTasks.length > 0 && (
          <>
            <SectionHeader label="Resident Care" count={metrics.totalResidentTasks} />
            {Array.from(slotMap.entries()).map(([time, items]) => (
              <React.Fragment key={time}>
                {time !== '9999' && <TimeSlotHeader time={time} />}
                {items.map(({ task, room, name }) => (
                  <div key={task.id} className="flex items-start justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start space-x-3 flex-1 mr-3">
                      <span className="mt-0.5 w-4 h-4 rounded border-2 border-slate-300 flex-shrink-0 opacity-40" />
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-bold text-slate-500 font-mono tabular-nums bg-slate-100 px-2 py-0.5 rounded">
                            {room}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">{name}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-sm font-semibold text-slate-900">{task.title}</span>
                          {task.priority === 'urgent' && (
                            <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-bold uppercase">Urgent</span>
                          )}
                          <TaskAttentionBadges attentionConfig={task.attentionConfig} />
                        </div>
                        {task.instructions && <p className="text-xs text-slate-500 mt-0.5">{task.instructions}</p>}
                      </div>
                    </div>
                    <TaskActionMenu
                      onViewDetails={() => setDrawerTask({ careTask: task })}
                      onEdit={() => handleEditCareTask(task)}
                      onDuplicate={() => handleDuplicateCareTask(task)}
                      onStop={() => handleStopCareTask(task)}
                      onDelete={() => handleDeleteCareTask(task)}
                      hasHistory={db.hasTaskHistory(task.id)}
                      itemType="care_task"
                      ariaLabel={`Actions for ${task.title}`}
                    />
                  </div>
                ))}
              </React.Fragment>
            ))}
          </>
        )}

        {residentTimedTasks.length === 0 && (
          <div className="p-8 text-center text-slate-400">
            <HeartHandshake className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-medium">No scheduled resident care tasks for this shift.</p>
          </div>
        )}

        {/* DURING SHIFT */}
        {duringUnitTasks.length > 0 && (
          <>
            <SectionHeader label="During Shift" count={duringUnitTasks.length} />
            {duringUnitTasks.map(renderUnitTaskRow)}
          </>
        )}

        {/* END OF SHIFT */}
        {endUnitTasks.length > 0 && (
          <>
            <SectionHeader label="End of Shift" count={endUnitTasks.length} />
            {endUnitTasks.map(renderUnitTaskRow)}
          </>
        )}

        {/* PRN */}
        {prnTasks.length > 0 && (
          <>
            <SectionHeader label="PRN — As Needed" count={prnTasks.reduce((s, a) => s + a.tasks.length, 0)} accent="bg-amber-50" />
            {prnTasks.map(assignment => (
              <div key={assignment.resident.id}>
                <div className="px-5 py-2 bg-amber-50/50 border-b border-amber-100 text-xs font-semibold text-amber-900">
                  Room {assignment.resident.roomNumber} — {assignment.resident.firstName} {assignment.resident.lastName}
                </div>
                {assignment.tasks.map(task => (
                  <div key={task.id} className="flex items-start justify-between px-5 py-3.5 hover:bg-amber-50/50 transition-colors">
                    <div className="flex items-start space-x-3 flex-1 mr-3">
                      <span className="mt-0.5 text-amber-400 text-[10px] font-bold uppercase tracking-wider shrink-0 pt-1">PRN</span>
                      <div>
                        <span className="text-sm font-semibold text-slate-900">{task.title}</span>
                        {task.instructions && <p className="text-xs text-slate-500 mt-0.5">{task.instructions}</p>}
                      </div>
                    </div>
                    <TaskActionMenu
                      onViewDetails={() => setDrawerTask({ careTask: task })}
                      onEdit={() => handleEditCareTask(task)}
                      onDuplicate={() => handleDuplicateCareTask(task)}
                      onStop={() => handleStopCareTask(task)}
                      onDelete={() => handleDeleteCareTask(task)}
                      hasHistory={db.hasTaskHistory(task.id)}
                      itemType="care_task"
                      ariaLabel={`Actions for PRN ${task.title}`}
                    />
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {endedUnitTasks.length > 0 && (
          <details className="group bg-violet-50/20">
            <summary className="cursor-pointer list-none px-5 py-3 border-t border-violet-200 flex items-center justify-between text-violet-950">
              <span className="text-[11px] font-black uppercase tracking-widest">Ended Unit Routines</span>
              <span className="text-[11px] font-bold bg-violet-100 px-2 py-0.5 rounded-full">{endedUnitTasks.length}</span>
            </summary>
            <div className="border-t border-violet-100">
              {endedUnitTasks.map(renderEndedUnitTaskRow)}
            </div>
          </details>
        )}
      </div>
    );
  };

  // ── RESIDENTS TAB ─────────────────────────────────────────────────────────
  const ResidentsView = () => (
    <div>
      {residentAssignments.length === 0 ? (
        <div className="p-10 text-center text-slate-400">
          <HeartHandshake className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-xs font-medium">No scheduled resident care tasks for this shift.</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {residentAssignments.map(assignment => {
            const res = assignment.resident;
            const hasFYIs = assignment.fyis.length > 0;
            const hasUrgentFYI = assignment.fyis.some(f => f.importance === 'urgent');
            return (
              <div key={res.id}>
                {/* Resident header */}
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono font-bold text-xs tabular-nums">
                      {res.roomNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenResidentProfile(res.id)}
                      className="text-sm font-bold text-slate-900 hover:text-teal-700 flex items-center group"
                    >
                      {res.firstName} {res.lastName}
                      <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400 group-hover:text-teal-600" />
                    </button>
                    {hasUrgentFYI && <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400 font-medium">
                      {assignment.tasks.length} task{assignment.tasks.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenAddCareTask(res.id)}
                      className="px-2 py-1 bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50 text-slate-600 hover:text-teal-800 rounded text-xs font-semibold transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* FYIs inline */}
                {hasFYIs && (
                  <div className="px-5 py-2.5 bg-teal-50/60 border-b border-teal-100 space-y-1">
                    {assignment.fyis.map(f => (
                      <div key={f.id} className="flex items-start space-x-2 text-xs">
                        <span className={`font-bold shrink-0 ${f.importance === 'urgent' ? 'text-rose-600' : f.importance === 'high' ? 'text-amber-700' : 'text-teal-700'}`}>
                          {f.importance === 'urgent' ? '!!' : f.importance === 'high' ? '!' : '·'}
                        </span>
                        <span className="text-slate-700">{f.text}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tasks */}
                <div className="divide-y divide-slate-100">
                  {assignment.tasks.map(renderCareTaskRow)}
                  {assignment.wounds.map(w => (
                    <div key={w.id} className="flex items-start justify-between px-5 py-3.5 bg-rose-50/20 hover:bg-rose-50/40 transition-colors">
                      <div className="flex items-start space-x-3 flex-1 mr-3">
                        <Bandage className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                        <div>
                          <span className="text-sm font-bold text-slate-900">Wound Care: {w.siteLocation}</span>
                          <p className="text-xs text-slate-600 mt-0.5">
                            {w.firstAction.replace('_', ' ')} · {w.bathingRelation.replace('_', ' ')} · {w.frequency.replace('_', ' ')}
                          </p>
                          {w.instructions && <p className="text-xs text-slate-500 mt-0.5">{w.instructions}</p>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-xs font-semibold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">Active Protocol</span>
                        <TaskActionMenu
                          onEdit={() => handleEditWound(w)}
                          onDelete={() => handleDeleteWound(w)}
                          itemType="wound"
                          ariaLabel={`Actions for Wound ${w.siteLocation}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ── PRINT PREVIEW TAB ─────────────────────────────────────────────────────
  const PrintPreviewTab = () => {
    const printModel = PrintService.createDocumentModel(sheet, previewProfile);
    return (
      <div>
        {/* Style selector */}
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center space-x-1 bg-white rounded-lg border border-slate-200 p-0.5">
            {([
              { v: 'role_default' as PrintProfile, label: `Auto (${sheet.role.defaultPrintProfile === 'clinical_worksheet' ? 'Clinical' : 'Checklist'})` },
              { v: 'simple_checklist' as PrintProfile, label: 'Checklist' },
              { v: 'clinical_worksheet' as PrintProfile, label: 'Clinical' },
            ]).map(opt => (
              <button
                key={opt.v}
                type="button"
                onClick={() => setPreviewProfile(opt.v)}
                className={`px-3 py-1.5 rounded text-xs font-bold transition-colors ${
                  previewProfile === opt.v
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onPrint(sheet)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>

        {/* Scaled paper preview */}
        <div className="bg-slate-200 p-6">
          <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-sm p-8">
            <PrintDocumentView document={printModel} />
          </div>
        </div>
      </div>
    );
  };

  // ── FORMATTED DATE ────────────────────────────────────────────────────────
  const formattedDate = new Date(currentDate + 'T12:00:00').toLocaleDateString('en-CA', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-2xl text-xs font-semibold flex items-center space-x-2">
          <Info className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER ── */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Shifts</span>
        </button>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                {shift.shortCode && (
                  <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg font-mono font-black text-sm tracking-wider">
                    {shift.shortCode}
                  </span>
                )}
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {shift.shortCode ? `${shift.shortCode} — ${shift.name}` : shift.name}
                </h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {role.name} · {shift.startTime}–{shift.endTime}
              </p>
              <p className="text-xs text-teal-700 font-semibold mt-0.5">{formattedDate}</p>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => onPrint(sheet)}
                className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Shift</span>
              </button>

              {/* Contextual Add Dropdown */}
              <div ref={addMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  aria-expanded={addMenuOpen}
                  aria-haspopup="menu"
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to {shift.shortCode || shift.name} ▾</span>
                </button>

                {addMenuOpen && (
                  <div 
                    onClick={() => setAddMenuOpen(false)}
                    role="menu"
                    className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenAddCareTask()}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                    >
                      <HeartHandshake className="w-4 h-4 text-teal-600" />
                      <span>+ Care Task</span>
                    </button>
                    {isClinicalShift && (
                      <button
                        type="button"
                        onClick={() => onOpenAddWound()}
                        className="w-full px-3.5 py-2 text-left hover:bg-rose-50 font-semibold text-slate-800 flex items-center space-x-2"
                      >
                        <Bandage className="w-4 h-4 text-rose-600" />
                        <span>+ Wound Protocol</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onOpenAddUnitTask()}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                    >
                      <ClipboardList className="w-4 h-4 text-teal-600" />
                      <span>+ Unit Routine</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAddFYI()}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                    >
                      <Info className="w-4 h-4 text-teal-600" />
                      <span>+ FYI Note</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Scheduling summary */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium">
            <span><strong className="text-slate-800">{metrics.totalScheduled}</strong> scheduled items</span>
            <span className="text-slate-300">·</span>
            <span><strong className="text-slate-700">{metrics.totalResidentTasks}</strong> Resident Care</span>
            <span className="text-slate-300">·</span>
            <span><strong className="text-slate-700">{metrics.totalUnitTasks}</strong> Unit Tasks</span>
            {metrics.fyiCount > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-teal-700 font-semibold"><strong>{metrics.fyiCount}</strong> FYIs</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── CHANGE ALERT BANNER ── */}
      {sheet.exceptions.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 shadow-sm" role="alert">
          <div className="flex items-start space-x-3">
            <div className="shrink-0 rounded-lg bg-red-100 p-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-950">Exceptions / Needs Review — {sheet.exceptions.length} timed item{sheet.exceptions.length === 1 ? '' : 's'} withheld</p>
              <p className="mt-0.5 text-[11px] text-red-800">These items have a missing or out-of-window time for {shift.shortCode || shift.name} ({shift.startTime}–{shift.endTime}) and cannot appear on this shift’s TaskSheet.</p>
              <ul className="mt-2 space-y-1 text-[11px] text-red-900">
                {sheet.exceptions.map(exception => (
                  <li key={`${exception.taskType}-${exception.taskId}`}>
                    <strong>{exception.roomNumber ? `Room ${exception.roomNumber} — ` : 'Unit task — '}{exception.title}</strong> — {exception.time}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {changes?.hasChanges && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-950">
                Care routines updated since last print ({formatGeneratedAt(changes.lastGeneratedAt)})
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5">
                +{changes.added} added · ~{changes.modified} updated · −{changes.removed} cancelled
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {onPrintSpecializedDoc && (
              <button
                type="button"
                onClick={() => {
                  const delta = buildWhatChangedModel(shift.id, currentDate, structuredTasks);
                  if (delta) onPrintSpecializedDoc({ type: 'what_changed', model: delta });
                }}
                className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Print "What Changed?"</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onPrint(sheet)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-sm flex items-center space-x-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Reprint Full (Rev {changes.revision + 1})</span>
            </button>
          </div>
        </div>
      )}

      {/* ── TAB BAR + CONTENT ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Tab nav */}
        <div className="border-b border-slate-200 px-1 pt-1 flex space-x-0.5">
          {([
            { id: 'timeline' as WorkspaceTab, icon: LayoutList, label: 'Timeline' },
            { id: 'residents' as WorkspaceTab, icon: Users, label: 'Residents' },
            { id: 'preview' as WorkspaceTab, icon: FileText, label: 'Print Preview' },
          ]).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-4 py-2.5 text-xs font-bold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'timeline' && <TimelineView />}
        {activeTab === 'residents' && <ResidentsView />}
        {activeTab === 'preview' && <PrintPreviewTab />}
      </div>

      {/* ── MODALS ── */}
      {drawerTask && (
        <TaskDetailsDrawer
          isOpen={!!drawerTask}
          onClose={() => setDrawerTask(null)}
          careTask={drawerTask.careTask}
          unitTask={drawerTask.unitTask}
          onEdit={() => {
            if (drawerTask.careTask) handleEditCareTask(drawerTask.careTask);
            else if (drawerTask.unitTask) handleEditUnitTask(drawerTask.unitTask);
          }}
          onDuplicate={() => {
            if (drawerTask.careTask) handleDuplicateCareTask(drawerTask.careTask);
            else if (drawerTask.unitTask) handleDuplicateUnitTask(drawerTask.unitTask);
          }}
          onStop={() => {
            if (drawerTask.careTask) handleStopCareTask(drawerTask.careTask);
            else if (drawerTask.unitTask) handleStopUnitTask(drawerTask.unitTask);
          }}
          onReactivate={() => {
            if (drawerTask.careTask) {
              db.reactivateResidentTask(drawerTask.careTask.id);
              showToast(`Reactivated "${drawerTask.careTask.title}".`);
            } else if (drawerTask.unitTask) {
              db.reactivateUnitTask(drawerTask.unitTask.id);
              showToast(`Reactivated "${drawerTask.unitTask.title}".`);
            }
          }}
          onRestart={() => {
            if (drawerTask.careTask) {
              handleRestartCareTask(drawerTask.careTask);
            } else if (drawerTask.unitTask) {
              handleRestartUnitTask(drawerTask.unitTask);
            }
          }}
          onDelete={() => {
            if (drawerTask.careTask) handleDeleteCareTask(drawerTask.careTask);
            else if (drawerTask.unitTask) handleDeleteUnitTask(drawerTask.unitTask);
          }}
        />
      )}

      {editTaskState.isOpen && (
        <GlobalAddModal
          isOpen={editTaskState.isOpen}
          onClose={() => setEditTaskState({ isOpen: false, mode: 'edit' })}
          mode={editTaskState.mode}
          initialResidentTask={editTaskState.careTask}
          initialUnitTask={editTaskState.unitTask}
          initialWound={editTaskState.wound}
          initialFYI={editTaskState.fyi}
          contextShiftId={shiftId}
        />
      )}

      {confirmModalState.isOpen && (
        <TaskActionConfirmModal
          isOpen={confirmModalState.isOpen}
          onClose={() => setConfirmModalState(prev => ({ ...prev, isOpen: false }))}
          actionType={confirmModalState.actionType}
          itemType={confirmModalState.itemType}
          title={confirmModalState.title}
          itemDescription={confirmModalState.description}
          hasHistory={confirmModalState.hasHistory}
          onConfirm={confirmModalState.onConfirm}
        />
      )}

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  );
};
