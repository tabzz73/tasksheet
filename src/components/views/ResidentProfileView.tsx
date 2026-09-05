import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Plus, 
  Sparkles, 
  HeartHandshake, 
  Bandage, 
  Info, 
  Clock, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  History,
  Calendar,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  Copy,
  CheckCircle2,
  Filter,
  Printer,
  ClipboardList
} from 'lucide-react';
import { db } from '../../db';
import { Resident, ResidentTask, Wound, FYI, ResidentStatus } from '../../types';
import { coverageIndicator, normalizeCoverage } from '../../services/coverage';
import { TaskActionMenu } from '../common/TaskActionMenu';
import { TaskActionConfirmModal } from '../modals/TaskActionConfirmModal';
import { ConfirmDialog, ConfirmDialogRequest } from '../common/ConfirmDialog';
import { TaskDetailsDrawer } from '../modals/TaskDetailsDrawer';
import { GlobalAddModal } from '../modals/GlobalAddModal';
import { TaskAttentionBadges } from '../common/TaskAttentionBadges';
import { getResidentStatusLabel, isResidentCarePaused } from '../../services/residentStatus';
import { formatRecurrenceHuman, isRecurrenceScheduleEnded, restartRecurrenceRule, getTodayLocalDateString } from '../../services/recurrence';
import { getResidentFollowUpTasks, formatOccurrenceProgressLabel } from '../../services/dashboard';
import { getOccurrenceDates, getPeriodOccurrences, describeIncompletePastPeriod } from '../../services/occurrenceTracking';
import { FOLLOW_UP_BADGE_CLASS } from '../dashboard/DashboardWidgets';
import { FollowUpActionsModal, FollowUpActionsEntry } from '../dashboard/FollowUpActionsModal';
import { ResidentActivityHistoryTab } from './ResidentActivityHistoryTab';

interface ResidentProfileViewProps {
  residentId: string;
  onBack: () => void;
  onOpenAddCareTask: (residentId: string) => void;
  onOpenAddFYI: (residentId: string) => void;
  onOpenAddWound: (residentId: string) => void;
  onOpenQuickCareSetup: (resident: Resident) => void;
  onPrintCareSummary?: (residentId: string) => void;
  /** Opens straight into Activity & History, pre-filtered to this task —
   *  the target of a task's "View History" action, including the shortcut
   *  offered from Dashboard/Huddle's Follow-up Actions panel. */
  focusTaskId?: string;
}

export const ResidentProfileView: React.FC<ResidentProfileViewProps> = ({
  residentId,
  onBack,
  onOpenAddCareTask,
  onOpenAddFYI,
  onOpenAddWound,
  onOpenQuickCareSetup,
  onPrintCareSummary,
  focusTaskId,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'care' | 'wounds' | 'fyis' | 'history'>(focusTaskId ? 'history' : 'overview');
  const [historyFocusTaskId, setHistoryFocusTaskId] = useState<string | undefined>(focusTaskId);
  const [careTaskFilter, setCareTaskFilter] = useState<'active' | 'ended' | 'stopped' | 'all'>('active');
  const [woundFilter, setWoundFilter] = useState<'current' | 'ended' | 'resolved' | 'all'>('current');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Task Details Drawer state
  const [drawerTask, setDrawerTask] = useState<ResidentTask | null>(null);

  // Edit / Duplicate modal state
  const [editTaskState, setEditTaskState] = useState<{
    isOpen: boolean;
    mode: 'edit' | 'duplicate';
    careTask?: ResidentTask | null;
    wound?: Wound | null;
    fyi?: FYI | null;
  }>({
    isOpen: false,
    mode: 'edit',
    careTask: null,
    wound: null,
    fyi: null
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
    onConfirm: () => {}
  });
  const [confirmRequest, setConfirmRequest] = useState<ConfirmDialogRequest | null>(null);
  const [followUpEntry, setFollowUpEntry] = useState<FollowUpActionsEntry | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const state = db.getState();
  const resident = state.residents.find(r => r.id === residentId);
  const residentAuditEvents = state.auditEvents
    .filter(event => event.residentId === residentId)
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  if (!resident) {
    return (
      <div className="p-8 text-center bg-panel rounded-surface border border-hairline-strong">
        <p className="text-sm font-semibold text-ink-soft">Resident not found or removed.</p>
        <button type="button" onClick={onBack} className="mt-3 px-4 py-2 bg-accent text-white rounded-control text-xs font-bold">
          Back to Directory
        </button>
      </div>
    );
  }

  // Safe Isolation: Query ONLY by immutable resident UUID (zero bleed on room reuse)
  const allResidentTasks = state.residentTasks.filter(t => t.residentId === resident.id);
  const todayDateStr = getTodayLocalDateString();
  const endedTasks = allResidentTasks.filter(t =>
    t.isActive !== false && isRecurrenceScheduleEnded(t.recurrenceRule, t.frequency, todayDateStr, t.createdAt)
  );
  const endedTaskIds = new Set(endedTasks.map(t => t.id));
  // Follow-up state/label — same selector Dashboard and Huddle use, so this
  // page never disagrees with either about overdue/progress/carry-forward.
  const followUpByTaskId = new Map(getResidentFollowUpTasks(state, todayDateStr).map(entry => [entry.task.id, entry]));
  const occurrenceTasks = allResidentTasks.filter(t => Boolean(t.trackingConfig?.requiredOccurrences));
  const activeTasks = allResidentTasks.filter(t => t.isActive !== false && !endedTaskIds.has(t.id));
  const stoppedTasks = allResidentTasks.filter(t => t.isActive === false);
  const displayedTasks = careTaskFilter === 'active' 
    ? activeTasks 
    : careTaskFilter === 'ended'
    ? endedTasks
    : careTaskFilter === 'stopped' 
    ? stoppedTasks 
    : allResidentTasks;

  const wounds = state.wounds.filter(w => w.residentId === resident.id);
  const endedWounds = wounds.filter(w =>
    w.status !== 'resolved' && isRecurrenceScheduleEnded(w.recurrenceRule, w.frequency, todayDateStr, w.createdAt)
  );
  const endedWoundIds = new Set(endedWounds.map(w => w.id));
  const currentWounds = wounds.filter(w => w.status !== 'resolved' && !endedWoundIds.has(w.id));
  const resolvedWounds = wounds.filter(w => w.status === 'resolved');
  const displayedWounds = woundFilter === 'current'
    ? currentWounds
    : woundFilter === 'ended'
    ? endedWounds
    : woundFilter === 'resolved'
    ? resolvedWounds
    : wounds;
  const fyis = state.fyis.filter(f => f.residentId === resident.id && f.status === 'active');
  const shifts = state.shifts;
  const roles = state.roles;

  const handleStatusChange = (newStatus: ResidentStatus) => {
    db.updateResident(resident.id, { status: newStatus });
    setStatusMenuOpen(false);
  };

  const handleEditCareTask = (task: ResidentTask) => {
    setEditTaskState({
      isOpen: true,
      mode: 'edit',
      careTask: task
    });
  };

  const handleDuplicateCareTask = (task: ResidentTask) => {
    setEditTaskState({
      isOpen: true,
      mode: 'duplicate',
      careTask: task
    });
  };

  const handleStopCareTask = (task: ResidentTask) => {
    setConfirmModalState({
      isOpen: true,
      actionType: 'stop',
      itemType: 'Care Task',
      title: task.title,
      description: `Room ${resident.roomNumber} · ${resident.firstName} ${resident.lastName} · ${task.time || 'Flexible'}`,
      hasHistory: db.hasTaskHistory(task.id),
      onConfirm: () => {
        db.stopResidentTask(task.id);
        setToastMessage(`Stopped "${task.title}". Previous history is retained.`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    });
  };

  const handleReactivateCareTask = (task: ResidentTask) => {
    db.reactivateResidentTask(task.id);
    setToastMessage(`Reactivated "${task.title}".`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleRestartCareTask = (task: ResidentTask) => {
    if (!task.recurrenceRule) return;
    setConfirmRequest({
      title: 'Restart Care Task?',
      message: `Restart "${task.title}" beginning today (${todayDateStr})? The existing task record and recurrence pattern will be preserved.`,
      confirmLabel: 'Restart Task',
      onConfirm: () => {
        db.updateResidentTask(task.id, {
          recurrenceRule: restartRecurrenceRule(task.recurrenceRule!, todayDateStr),
          isActive: true,
          stoppedAt: undefined,
        });
        setToastMessage(`Restarted "${task.title}" beginning ${todayDateStr}.`);
        setTimeout(() => setToastMessage(null), 4000);
      },
    });
  };

  const handleDeleteCareTask = (task: ResidentTask) => {
    const hasHistory = db.hasTaskHistory(task.id);
    setConfirmModalState({
      isOpen: true,
      actionType: hasHistory ? 'stop' : 'delete',
      itemType: 'Care Task',
      title: task.title,
      description: `Room ${resident.roomNumber} · ${resident.firstName} ${resident.lastName}`,
      hasHistory,
      onConfirm: () => {
        if (hasHistory) {
          db.stopResidentTask(task.id);
          setToastMessage(`Task stopped to preserve clinical history.`);
        } else {
          db.deleteResidentTask(task.id);
          setToastMessage(`Task "${task.title}" deleted.`);
        }
        setTimeout(() => setToastMessage(null), 4000);
      }
    });
  };

  const handleEditWound = (w: Wound) => {
    setEditTaskState({
      isOpen: true,
      mode: 'edit',
      careTask: null,
      wound: w,
      fyi: null
    });
  };

  const handleDuplicateWound = (w: Wound) => {
    setEditTaskState({ isOpen: true, mode: 'duplicate', careTask: null, wound: w, fyi: null });
  };

  const handleRestartWound = (w: Wound) => {
    if (!w.recurrenceRule) return;
    setConfirmRequest({
      title: 'Restart Wound Schedule?',
      message: `Restart the ${w.siteLocation} wound protocol schedule beginning today (${todayDateStr})? This does not change the clinical wound status.`,
      confirmLabel: 'Restart Schedule',
      onConfirm: () => {
        db.updateWound(w.id, { recurrenceRule: restartRecurrenceRule(w.recurrenceRule!, todayDateStr) });
        setToastMessage(`Restarted the ${w.siteLocation} wound schedule beginning ${todayDateStr}.`);
        setTimeout(() => setToastMessage(null), 4000);
      },
    });
  };

  const handleResolveWound = (w: Wound) => {
    setConfirmRequest({
      title: 'Mark Wound Resolved?',
      message: `Mark the ${w.siteLocation} wound protocol as resolved? Confirm this matches the current clinical record and facility process.`,
      confirmLabel: 'Mark Resolved',
      onConfirm: () => {
        db.updateWound(w.id, { status: 'resolved', updatedAt: new Date().toISOString() });
        setToastMessage(`Marked the ${w.siteLocation} wound protocol resolved.`);
        setTimeout(() => setToastMessage(null), 4000);
      },
    });
  };

  const handleDeleteWound = (w: Wound) => {
    setConfirmModalState({
      isOpen: true,
      actionType: 'delete',
      itemType: 'Wound Protocol',
      title: `Wound Protocol: ${w.siteLocation}`,
      description: `Room ${resident.roomNumber} · ${resident.firstName} ${resident.lastName} · ${w.firstAction}`,
      hasHistory: false,
      onConfirm: () => {
        db.deleteWound(w.id);
        setToastMessage(`Wound protocol "${w.siteLocation}" deleted.`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    });
  };

  const handleEditFYI = (f: FYI) => {
    setEditTaskState({
      isOpen: true,
      mode: 'edit',
      careTask: null,
      wound: null,
      fyi: f
    });
  };

  const handleDeleteFYI = (f: FYI) => {
    setConfirmModalState({
      isOpen: true,
      actionType: 'delete',
      itemType: 'FYI',
      title: `Standing FYI Note`,
      description: f.text,
      hasHistory: false,
      onConfirm: () => {
        db.deleteFYI(f.id);
        setToastMessage(`FYI note deleted.`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-ink text-white rounded-surface shadow-elevated text-xs font-semibold flex items-center space-x-2 animate-toast-in">
          <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP BREADCRUMB & RESIDENT HEADER */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-muted hover:text-ink mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Residents Directory</span>
        </button>

        <div className="bg-panel rounded-surface border border-hairline-strong p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="px-3.5 py-2 bg-ink text-white rounded-control font-mono font-black text-base tabular-nums">
                {resident.roomNumber}
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-2xl font-black text-ink tracking-tight">
                    {resident.firstName} {resident.lastName}
                  </h2>
                  
                  {/* Status Badge with Dropdown */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                      className={`px-2.5 py-0.5 rounded-control text-xs font-bold uppercase tracking-wider flex items-center space-x-1 ${
                        resident.status === 'active'
                          ? 'bg-positive-soft text-positive'
                          : resident.status === 'in_hospital'
                          ? 'bg-danger-soft text-danger'
                          : resident.status === 'out_on_pass' || resident.status === 'on_hold'
                          ? 'bg-warning-soft text-warning'
                          : 'bg-panel-sunken text-ink-soft'
                      }`}
                    >
                      <span>{getResidentStatusLabel(resident.status)}</span>
                      <span className="text-[10px]">▾</span>
                    </button>

                    {statusMenuOpen && (
                      <div className="absolute left-0 mt-1 w-44 bg-panel rounded-control shadow-elevated border border-hairline-strong py-1 z-30 text-xs">
                        <button
                          type="button"
                          onClick={() => handleStatusChange('active')}
                          className="w-full px-3 py-1.5 text-left hover:bg-panel-sunken font-semibold text-positive"
                        >
                          Active in Facility
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange('in_hospital')}
                          className="w-full px-3 py-1.5 text-left hover:bg-panel-sunken font-semibold text-danger"
                        >
                          In Hospital (Suspend)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange('out_on_pass')}
                          className="w-full px-3 py-1.5 text-left hover:bg-panel-sunken font-semibold text-warning"
                        >
                          Out on Pass (Suspend)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange('on_hold')}
                          className="w-full px-3 py-1.5 text-left hover:bg-panel-sunken font-semibold text-warning"
                        >
                          On Hold (Suspend)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted mt-0.5">
                  {resident.status === 'active'
                    ? 'Active in Facility · Daily care sheets active'
                    : isResidentCarePaused(resident.status)
                    ? `${getResidentStatusLabel(resident.status)} · Care sheet generation suspended; schedules are preserved`
                    : 'Discharged / Former Resident · Not included on operational sheets'}
                </p>
                <p className="text-[11px] text-faint mt-0.5">
                  {residentAuditEvents[0]
                    ? `Last updated by ${residentAuditEvents[0].userDisplayName} · ${new Date(residentAuditEvents[0].occurredAt).toLocaleString()}`
                    : 'Created before audit history was enabled'}
                </p>
              </div>
            </div>

            {/* Contextual Quick Actions */}
            <div className="flex items-center space-x-2">
              {onPrintCareSummary && (
                <button
                  type="button"
                  onClick={() => onPrintCareSummary(resident.id)}
                  className="px-3.5 py-2 border border-hairline-strong hover:bg-panel-sunken text-ink-soft rounded-control text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  title="Print single-resident care plan summary"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Care Summary</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenQuickCareSetup(resident)}
                className="px-3.5 py-2 bg-accent-soft hover:bg-accent/20 text-accent-strong rounded-control text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                title="Quick setup wizard for routine care"
              >
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Care Setup</span>
              </button>

              {/* Add for [Resident] Dropdown */}
              <div className="relative">
                <button type="button" onClick={() => setAddMenuOpen(!addMenuOpen)} className="btn btn-accent">
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add for {resident.firstName} ▾</span>
                </button>

                {addMenuOpen && (
                  <div 
                    onClick={() => setAddMenuOpen(false)}
                    className="absolute right-0 mt-1.5 w-48 bg-panel rounded-surface shadow-elevated border border-hairline-strong py-1.5 z-40 text-xs animate-popover-in"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenAddCareTask(resident.id)}
                      className="w-full px-3.5 py-2 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center space-x-2"
                    >
                      <HeartHandshake className="w-4 h-4 text-accent" />
                      <span>+ Care Task</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAddFYI(resident.id)}
                      className="w-full px-3.5 py-2 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center space-x-2"
                    >
                      <Info className="w-4 h-4 text-accent" />
                      <span>+ FYI / Standing Note</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAddWound(resident.id)}
                      className="w-full px-3.5 py-2 text-left hover:bg-panel-sunken font-semibold text-ink flex items-center space-x-2"
                    >
                      <Bandage className="w-4 h-4 text-danger" />
                      <span>+ Wound Protocol</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes banner if any */}
          {resident.notes && (
            <div className="mt-3.5 pt-3.5 border-t border-hairline text-xs text-ink-soft bg-panel-sunken/50 p-2.5 rounded-control">
              <strong className="text-ink">Care Plan Notes:</strong> {resident.notes}
            </div>
          )}
        </div>
      </div>

      {/* 2. TABS */}
      <div className="border-b border-hairline-strong flex space-x-4 text-xs font-bold">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'care', label: `Care Tasks (${activeTasks.length}${stoppedTasks.length > 0 ? ` + ${stoppedTasks.length} stopped` : ''})` },
          { id: 'wounds', label: `Wounds (${wounds.length})` },
          { id: 'fyis', label: `FYIs & Preferences (${fyis.length})` },
          { id: 'history', label: 'Room Safety & History' }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 border-b-2 transition-all capitalize ${
              activeTab === tab.id
                ? 'border-accent text-accent-strong'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 3. TAB CONTENTS */}
      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-panel p-4 rounded-surface border border-hairline-strong">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">Care Assignments</span>
              <span className="text-2xl font-black text-ink tabular-nums mt-1 block">{activeTasks.length}</span>
              <button
                type="button"
                onClick={() => setActiveTab('care')}
                className="text-xs font-semibold text-accent-strong  mt-2 block"
              >
                View all scheduled tasks →
              </button>
            </div>

            <div className="bg-panel p-4 rounded-surface border border-hairline-strong">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">Active Wounds</span>
              <span className="text-2xl font-black text-danger tabular-nums mt-1 block">{wounds.length}</span>
              <button
                type="button"
                onClick={() => onOpenAddWound(resident.id)}
                className="text-xs font-semibold text-danger  mt-2 block"
              >
                + Add Wound protocol
              </button>
            </div>

            <div className="bg-panel p-4 rounded-surface border border-hairline-strong">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">Standing FYIs</span>
              <span className="text-2xl font-black text-warning tabular-nums mt-1 block">{fyis.length}</span>
              <button
                type="button"
                onClick={() => onOpenAddFYI(resident.id)}
                className="text-xs font-semibold text-warning mt-2 block"
              >
                + Add FYI note
              </button>
            </div>
          </div>

          {/* Quick List of Care */}
          <div className="bg-panel rounded-surface border border-hairline-strong p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-hairline pb-2">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Scheduled Daily Care Routines</h3>
              <button
                type="button"
                onClick={() => onOpenAddCareTask(resident.id)}
                className="text-xs font-bold text-accent-strong "
              >
                + Add Task
              </button>
            </div>

            {activeTasks.length === 0 ? (
              <p className="text-xs text-faint italic py-2">No active care tasks assigned yet.</p>
            ) : (
              <div className="divide-y divide-hairline">
                {activeTasks.map(t => {
                  const s = shifts.find(item => item.id === t.shiftId);
                  return (
                    <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span 
                            onClick={() => setDrawerTask(t)}
                            className="font-bold text-ink hover:text-accent-strong cursor-pointer"
                          >
                           <span className="text-ink font-bold text-xs">{t.title}</span>
                          </span>
                          {t.time && <span className="font-mono text-muted font-medium text-xs">{t.time}</span>}
                          <span className="text-accent-strong bg-accent-soft px-1.5 py-0.5 rounded text-[10px] font-semibold">{formatRecurrenceHuman(t.recurrenceRule, t.frequency)}</span>
                          <TaskAttentionBadges attentionConfig={t.attentionConfig} />
                        </div>
                        {t.instructions && <p className="text-muted text-[11px] mt-0.5">{t.instructions}</p>}
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-muted font-semibold">{s ? s.name : 'All Shifts'}</span>
                        <TaskActionMenu
                          onEdit={() => handleEditCareTask(t)}
                          onDuplicate={() => handleDuplicateCareTask(t)}
                          onStop={() => handleStopCareTask(t)}
                          onDelete={() => handleDeleteCareTask(t)}
                          hasHistory={db.hasTaskHistory(t.id)}
                          itemType="care_task"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Care Tasks Tab */}
      {activeTab === 'care' && (
        <div className="bg-panel rounded-surface border border-hairline-strong">
          <div className="bg-panel-sunken px-5 py-3 border-b border-hairline-strong rounded-t-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Care Tasks</h3>
              
              {/* Filter Pills */}
              <div className="flex items-center space-x-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCareTaskFilter('active')}
                  className={`px-2.5 py-0.5 rounded-control font-semibold ${
                    careTaskFilter === 'active'
                      ? 'bg-ink text-white'
                      : 'bg-panel border border-hairline-strong text-ink-soft hover:bg-panel-sunken'
                  }`}
                >
                  Active ({activeTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCareTaskFilter('ended')}
                  className={`px-2.5 py-0.5 rounded-control font-semibold ${
                    careTaskFilter === 'ended'
                      ? 'bg-ink text-white'
                      : 'bg-panel border border-hairline-strong text-ink-soft hover:bg-panel-sunken'
                  }`}
                >
                  Ended ({endedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCareTaskFilter('stopped')}
                  className={`px-2.5 py-0.5 rounded-control font-semibold ${
                    careTaskFilter === 'stopped'
                      ? 'bg-ink text-white'
                      : 'bg-panel border border-hairline-strong text-ink-soft hover:bg-panel-sunken'
                  }`}
                >
                  Stopped ({stoppedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCareTaskFilter('all')}
                  className={`px-2.5 py-0.5 rounded-control font-semibold ${
                    careTaskFilter === 'all'
                      ? 'bg-ink text-white'
                      : 'bg-panel border border-hairline-strong text-ink-soft hover:bg-panel-sunken'
                  }`}
                >
                  All ({allResidentTasks.length})
                </button>
              </div>
            </div>

            <button type="button" onClick={() => onOpenAddCareTask(resident.id)} className="btn btn-accent self-start sm:self-auto">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Care Task</span>
            </button>
          </div>

          {activeTasks.length > 0 && <div className="border-b border-hairline-strong bg-panel px-5 py-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted">Service Coverage</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {[...new Set(activeTasks.map(task => normalizeCoverage(task.serviceCoverage).type))].map(type => { const tasks = activeTasks.filter(task => normalizeCoverage(task.serviceCoverage).type === type); const coverage = normalizeCoverage(tasks[0].serviceCoverage); return <span key={type} className="rounded-control border border-hairline-strong bg-panel-sunken px-2.5 py-1 text-[11px] font-bold text-ink-soft">{coverageIndicator(coverage) ? `${coverageIndicator(coverage)} ` : ''}{coverage.labelSnapshot} · {tasks.length}</span>; })}
            </div>
          </div>}

          <div className="divide-y divide-hairline">
            {displayedTasks.length === 0 ? (
              <div className="p-8 text-center text-faint text-xs">
                {careTaskFilter === 'stopped'
                  ? 'No stopped or inactive care tasks.'
                  : careTaskFilter === 'ended'
                  ? 'No ended care schedules.'
                  : 'No care tasks assigned. Click above to add.'}
              </div>
            ) : (
              displayedTasks.map(t => {
                const isStopped = t.isActive === false;
                const isEnded = !isStopped && endedTaskIds.has(t.id);
                const s = shifts.find(item => item.id === t.shiftId);
                return (
                  <div key={t.id} className={`p-4 flex items-start justify-between hover:bg-panel-sunken transition-colors ${isStopped ? 'bg-panel-sunken/70 opacity-80' : isEnded ? 'bg-panel-sunken' : ''}`}>
                    <div className="flex-1 mr-3">
                      <div className="flex items-center space-x-2">
                        <span
                          onClick={() => setDrawerTask(t)}
                          className={`font-bold text-sm cursor-pointer hover:underline ${isStopped ? 'text-ink-soft line-through' : isEnded ? 'text-ink-soft' : 'text-ink'}`}
                        >
                           {t.title}
                         </span>
                        {coverageIndicator(t.serviceCoverage) && <span className="rounded border border-warning bg-warning-soft px-1.5 py-0.5 text-[10px] font-black text-warning" title={normalizeCoverage(t.serviceCoverage).labelSnapshot}>{coverageIndicator(t.serviceCoverage)} {normalizeCoverage(t.serviceCoverage).labelSnapshot}</span>}
                        {t.time && <span className="font-mono text-xs bg-panel-sunken px-2 py-0.5 rounded text-ink-soft">{t.time}</span>}
                        {!t.time && t.trackingConfig?.scheduledTimes && t.trackingConfig.scheduledTimes.length > 0 && (
                          <span className="font-mono text-xs bg-panel-sunken px-2 py-0.5 rounded text-ink-soft" title="Scheduled Medication Assistance times">{t.trackingConfig.scheduledTimes.join(', ')}</span>
                        )}
                        <span className="text-xs text-accent-strong font-semibold bg-accent-soft px-2 py-0.5 rounded">
                          {formatRecurrenceHuman(t.recurrenceRule, t.frequency)}
                        </span>
                        <TaskAttentionBadges attentionConfig={t.attentionConfig} />
                        {t.showOnDashboard === true && followUpByTaskId.has(t.id) && (() => {
                          const entry = followUpByTaskId.get(t.id)!;
                          return (
                            <button
                              type="button"
                              onClick={() => setFollowUpEntry({ task: t, resident })}
                              aria-label={`Follow-up status for ${t.title}: ${entry.statusLabel}`}
                              className={`hit-target-44 badge ${FOLLOW_UP_BADGE_CLASS[entry.bucket]} hover:opacity-80 transition-opacity`}
                            >
                              {entry.statusLabel}
                            </button>
                          );
                        })()}
                        {isStopped && (
                          <span className="badge badge-warning flex items-center space-x-0.5">
                            <PauseCircle className="w-3 h-3" />
                            <span>Stopped</span>
                          </span>
                        )}
                        {isEnded && (
                          <span className="badge badge-neutral flex items-center space-x-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Schedule Ended</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        <span className="font-medium text-ink-soft">{t.category}</span>
                        {s ? ` · Shift: ${s.shortCode ? `${s.shortCode} — ` : ''}${s.name}` : ' · All Shifts'}
                        {t.instructions ? ` · ${t.instructions}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setHistoryFocusTaskId(t.id); setActiveTab('history'); }}
                        aria-label={`View history for ${t.title}`}
                        title="View History"
                        className="p-1.5 text-ink-soft hover:text-accent-strong hover:bg-panel-sunken rounded-control transition-colors"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <TaskActionMenu
                        onEdit={() => handleEditCareTask(t)}
                        onDuplicate={() => handleDuplicateCareTask(t)}
                        onStop={() => handleStopCareTask(t)}
                        onReactivate={() => handleReactivateCareTask(t)}
                        onRestart={() => handleRestartCareTask(t)}
                        onDelete={() => handleDeleteCareTask(t)}
                        isStopped={isStopped}
                        isEnded={isEnded}
                        hasHistory={db.hasTaskHistory(t.id)}
                        itemType="care_task"
                        ariaLabel={`Actions for ${t.title}`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Wounds Tab */}
      {activeTab === 'wounds' && (
        <div className="bg-panel rounded-surface border border-hairline-strong">
          <div className="bg-panel-sunken px-5 py-3 border-b border-hairline-strong rounded-t-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider mr-1">Wound Protocols & Dressings</h3>
              {([
                ['current', `Current (${currentWounds.length})`],
                ['ended', `Ended (${endedWounds.length})`],
                ['resolved', `Resolved (${resolvedWounds.length})`],
                ['all', `All (${wounds.length})`],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setWoundFilter(id)}
                  className={`px-2.5 py-0.5 rounded-control text-xs font-semibold ${
                    woundFilter === id
                      ? id === 'resolved' ? 'bg-positive text-white' : 'bg-ink text-white'
                      : 'bg-panel border border-hairline-strong text-ink-soft hover:bg-panel-sunken'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => onOpenAddWound(resident.id)} className="btn btn-accent">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Wound</span>
            </button>
          </div>

          <div className="divide-y divide-hairline">
            {displayedWounds.length === 0 ? (
              <div className="p-8 text-center text-faint text-xs">
                {woundFilter === 'ended' ? 'No ended wound schedules.' : woundFilter === 'resolved' ? 'No resolved wound protocols.' : 'No current wound protocols for this resident.'}
              </div>
            ) : (
              displayedWounds.map(w => {
                const assignedShift = shifts.find(shift => shift.id === w.shiftId);
                const needsSchedulingReview = !assignedShift || !w.time;
                const isEnded = endedWoundIds.has(w.id);
                return (
                <div key={w.id} className={`p-4 flex items-start justify-between hover:bg-panel-sunken transition-colors ${isEnded ? 'bg-panel-sunken' : w.status === 'resolved' ? 'bg-positive-soft/40 opacity-80' : ''}`}>
                  <div className="flex items-start space-x-3 flex-1 mr-3">
                    <Bandage className="w-5 h-5 text-danger mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-ink text-sm">{w.siteLocation}</span>
                        <span className="text-xs bg-danger-soft text-danger font-bold px-2 py-0.5 rounded capitalize">{w.status}</span>
                        <span className="text-xs text-muted capitalize">({w.firstAction})</span>
                        {isEnded && <span className="badge badge-neutral">Schedule Ended</span>}
                      </div>
                      <p className="text-xs text-ink-soft mt-1">
                        <strong>Frequency:</strong> {formatRecurrenceHuman(w.recurrenceRule, w.frequency)} · <strong>Bathing:</strong> {w.bathingRelation}
                      </p>
                      <p className={`text-xs mt-1 ${needsSchedulingReview ? 'text-danger font-bold' : 'text-ink-soft'}`}>
                        <strong>Clinical shift:</strong>{' '}
                        {assignedShift ? `${assignedShift.shortCode} — ${assignedShift.name} at ${w.time}` : 'Needs LPN/RN shift assignment'}
                        {assignedShift && !w.time ? ' — scheduled time required' : ''}
                      </p>
                      {w.instructions && <p className="text-xs text-muted mt-0.5">{w.instructions}</p>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <TaskActionMenu
                      onEdit={() => handleEditWound(w)}
                      onDuplicate={() => handleDuplicateWound(w)}
                      onRestart={() => handleRestartWound(w)}
                      onResolve={w.status !== 'resolved' ? () => handleResolveWound(w) : undefined}
                      onDelete={() => handleDeleteWound(w)}
                      isEnded={isEnded}
                      itemType="wound"
                      ariaLabel={`Actions for Wound ${w.siteLocation}`}
                    />
                  </div>
                </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* FYIs Tab */}
      {activeTab === 'fyis' && (
        <div className="bg-panel rounded-surface border border-hairline-strong">
          <div className="bg-panel-sunken px-5 py-3 border-b border-hairline-strong rounded-t-surface flex items-center justify-between">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Standing FYIs & Preferences</h3>
            <button type="button" onClick={() => onOpenAddFYI(resident.id)} className="btn btn-accent">
              <Plus className="w-3.5 h-3.5" />
              <span>Add FYI</span>
            </button>
          </div>

          <div className="divide-y divide-hairline">
            {fyis.length === 0 ? (
              <div className="p-8 text-center text-faint text-xs">
                No active FYI notes for this resident.
              </div>
            ) : (
              fyis.map(f => (
                <div key={f.id} className="p-4 flex items-start justify-between hover:bg-panel-sunken transition-colors">
                  <div className="flex items-start space-x-3 flex-1 mr-3">
                    <Info className="w-5 h-5 text-warning mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-warning-soft text-warning">
                          {f.category}
                        </span>
                        <span className="text-xs text-faint">Effective: {f.effectiveDate}</span>
                      </div>
                      <p className="text-xs text-ink font-medium mt-1">{f.text}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <TaskActionMenu
                      onEdit={() => handleEditFYI(f)}
                      onDelete={() => handleDeleteFYI(f)}
                      itemType="fyi"
                      ariaLabel={`Actions for FYI note`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* History & Safety Tab */}
      {activeTab === 'history' && (
        <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-4">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-6 h-6 text-accent mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-ink">TaskSheet Room-Reuse Isolation Safety</h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                TaskSheet strictly binds care tasks, wound charts, and standing FYIs to immutable Resident UUIDs. 
                When a resident is discharged or room {resident.roomNumber} is reassigned to another resident, 
                zero clinical data or task instructions will bleed over.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && occurrenceTasks.length > 0 && (
        <div className="bg-panel rounded-surface border border-hairline-strong p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-accent-strong" />
            <h3 className="text-base font-bold text-ink">Occurrence Progress</h3>
          </div>
          <p className="text-xs text-muted -mt-2">Multi-occurrence follow-up tasks, by requirement period. Each period's history is preserved — a later day never overwrites an earlier one.</p>
          <div className="space-y-4">
            {occurrenceTasks.map(task => {
              const required = task.trackingConfig!.requiredOccurrences!;
              const isDaily = task.trackingConfig?.occurrenceResetPeriod === 'daily';
              const dates = getOccurrenceDates(task.trackingConfig);
              const periods = isDaily ? [todayDateStr, ...dates.filter(d => d !== todayDateStr)] : (dates.length ? dates : [todayDateStr]);
              return (
                <div key={task.id} className="rounded-control border border-hairline-strong p-3">
                  <p className="text-sm font-bold text-ink">{task.title}</p>
                  <div className="mt-1.5 space-y-1">
                    {periods.map(periodDate => {
                      const isToday = periodDate === todayDateStr;
                      const completed = getPeriodOccurrences(task, periodDate).length;
                      const label = isToday
                        ? formatOccurrenceProgressLabel(completed, required)
                        : (describeIncompletePastPeriod(task, periodDate) || `${completed}/${required} complete`);
                      return (
                        <p key={periodDate} className="text-xs text-ink-soft">
                          <span className="font-semibold">{isToday ? 'Today' : new Date(`${periodDate}T00:00:00`).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}:</span> {label}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <ResidentActivityHistoryTab
          state={state}
          residentId={resident.id}
          residentTasks={allResidentTasks}
          initialTaskId={historyFocusTaskId}
          onOpenTask={t => setDrawerTask(t)}
        />
      )}

      {/* Task Details Drawer */}
      {drawerTask && (
        <TaskDetailsDrawer
          isOpen={!!drawerTask}
          onClose={() => setDrawerTask(null)}
          careTask={drawerTask}
          onEdit={() => handleEditCareTask(drawerTask)}
          onDuplicate={() => handleDuplicateCareTask(drawerTask)}
          onStop={() => handleStopCareTask(drawerTask)}
          onReactivate={() => handleReactivateCareTask(drawerTask)}
          onRestart={() => handleRestartCareTask(drawerTask)}
          onDelete={() => handleDeleteCareTask(drawerTask)}
        />
      )}

      {/* Edit / Duplicate Smart Form Modal */}
      {editTaskState.isOpen && (
        <GlobalAddModal
          isOpen={editTaskState.isOpen}
          onClose={() => setEditTaskState({ isOpen: false, mode: 'edit' })}
          mode={editTaskState.mode}
          initialResidentTask={editTaskState.careTask}
          initialWound={editTaskState.wound}
          initialFYI={editTaskState.fyi}
          contextResidentId={resident.id}
        />
      )}

      {/* Stop / Delete Confirm Modal */}
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
      <FollowUpActionsModal
        entry={followUpEntry}
        today={todayDateStr}
        onClose={() => setFollowUpEntry(null)}
        onViewHistory={(_residentId, taskId) => { setHistoryFocusTaskId(taskId); setActiveTab('history'); }}
        onChanged={() => { setToastMessage('Follow-up updated.'); setTimeout(() => setToastMessage(null), 4000); }}
      />
    </div>
  );
};
