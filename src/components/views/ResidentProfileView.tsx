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
  Printer
} from 'lucide-react';
import { db } from '../../db';
import { Resident, ResidentTask, Wound, FYI, ResidentStatus } from '../../types';
import { TaskActionMenu } from '../common/TaskActionMenu';
import { TaskActionConfirmModal } from '../modals/TaskActionConfirmModal';
import { TaskDetailsDrawer } from '../modals/TaskDetailsDrawer';
import { GlobalAddModal } from '../modals/GlobalAddModal';
import { TaskAttentionBadges } from '../common/TaskAttentionBadges';

interface ResidentProfileViewProps {
  residentId: string;
  onBack: () => void;
  onOpenAddCareTask: (residentId: string) => void;
  onOpenAddFYI: (residentId: string) => void;
  onOpenAddWound: (residentId: string) => void;
  onOpenQuickCareSetup: (resident: Resident) => void;
  onPrintCareSummary?: (residentId: string) => void;
}

export const ResidentProfileView: React.FC<ResidentProfileViewProps> = ({
  residentId,
  onBack,
  onOpenAddCareTask,
  onOpenAddFYI,
  onOpenAddWound,
  onOpenQuickCareSetup,
  onPrintCareSummary
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'care' | 'wounds' | 'fyis' | 'history'>('overview');
  const [careTaskFilter, setCareTaskFilter] = useState<'active' | 'stopped' | 'all'>('active');
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
    title: string;
    description: string;
    hasHistory: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    actionType: 'stop',
    title: '',
    description: '',
    hasHistory: false,
    onConfirm: () => {}
  });

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const state = db.getState();
  const resident = state.residents.find(r => r.id === residentId);

  if (!resident) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <p className="text-sm font-semibold text-slate-700">Resident not found or removed.</p>
        <button type="button" onClick={onBack} className="mt-3 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold">
          Back to Directory
        </button>
      </div>
    );
  }

  // Safe Isolation: Query ONLY by immutable resident UUID (zero bleed on room reuse)
  const allResidentTasks = state.residentTasks.filter(t => t.residentId === resident.id);
  const activeTasks = allResidentTasks.filter(t => t.isActive !== false);
  const stoppedTasks = allResidentTasks.filter(t => t.isActive === false);
  const displayedTasks = careTaskFilter === 'active' 
    ? activeTasks 
    : careTaskFilter === 'stopped' 
    ? stoppedTasks 
    : allResidentTasks;

  const wounds = state.wounds.filter(w => w.residentId === resident.id);
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

  const handleDeleteCareTask = (task: ResidentTask) => {
    const hasHistory = db.hasTaskHistory(task.id);
    setConfirmModalState({
      isOpen: true,
      actionType: hasHistory ? 'stop' : 'delete',
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

  const handleDeleteWound = (w: Wound) => {
    setConfirmModalState({
      isOpen: true,
      actionType: 'delete',
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
        <div className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-xl shadow-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP BREADCRUMB & RESIDENT HEADER */}
      <div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Residents Directory</span>
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="px-3.5 py-2 bg-slate-900 text-white rounded-lg font-mono font-black text-base tabular-nums">
                {resident.roomNumber}
              </div>
              <div>
                <div className="flex items-center space-x-2.5">
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                    {resident.firstName} {resident.lastName}
                  </h2>
                  
                  {/* Status Badge with Dropdown */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center space-x-1 ${
                        resident.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : resident.status === 'in_hospital'
                          ? 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                      }`}
                    >
                      <span>{resident.status.replace('_', ' ')}</span>
                      <span className="text-[10px]">▾</span>
                    </button>

                    {statusMenuOpen && (
                      <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-30 text-xs">
                        <button
                          type="button"
                          onClick={() => handleStatusChange('active')}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-100 font-semibold text-emerald-700"
                        >
                          Active in Facility
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange('in_hospital')}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-100 font-semibold text-rose-700"
                        >
                          In Hospital (Suspend)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange('out_on_pass')}
                          className="w-full px-3 py-1.5 text-left hover:bg-slate-100 font-semibold text-amber-700"
                        >
                          Out on Pass (Suspend)
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-0.5">
                  {resident.status === 'active' 
                    ? 'Active in Facility · Daily care sheets active'
                    : resident.status === 'in_hospital'
                    ? 'In Hospital · Care sheet generation suspended'
                    : resident.status === 'out_on_pass'
                    ? 'Out on Pass · Care sheet generation suspended'
                    : 'Discharged / Former Resident'}
                </p>
              </div>
            </div>

            {/* Contextual Quick Actions */}
            <div className="flex items-center space-x-2">
              {onPrintCareSummary && (
                <button
                  type="button"
                  onClick={() => onPrintCareSummary(resident.id)}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  title="Print single-resident care plan summary"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Care Summary</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onOpenQuickCareSetup(resident)}
                className="px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                title="Quick setup wizard for routine care"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Care Setup</span>
              </button>

              {/* Add for [Resident] Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add for {resident.firstName} ▾</span>
                </button>

                {addMenuOpen && (
                  <div 
                    onClick={() => setAddMenuOpen(false)}
                    className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-xs animate-in fade-in zoom-in-95 duration-100"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenAddCareTask(resident.id)}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                    >
                      <HeartHandshake className="w-4 h-4 text-teal-600" />
                      <span>+ Care Task</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAddFYI(resident.id)}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                    >
                      <Info className="w-4 h-4 text-teal-600" />
                      <span>+ FYI / Standing Note</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenAddWound(resident.id)}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 font-semibold text-slate-800 flex items-center space-x-2"
                    >
                      <Bandage className="w-4 h-4 text-rose-600" />
                      <span>+ Wound Protocol</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes banner if any */}
          {resident.notes && (
            <div className="mt-3.5 pt-3.5 border-t border-slate-100 text-xs text-slate-600 bg-slate-50/50 p-2.5 rounded-lg">
              <strong className="text-slate-800">Care Plan Notes:</strong> {resident.notes}
            </div>
          )}
        </div>
      </div>

      {/* 2. TABS */}
      <div className="border-b border-slate-200 flex space-x-4 text-xs font-bold">
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
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
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
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Care Assignments</span>
              <span className="text-2xl font-black text-slate-900 tabular-nums mt-1 block">{activeTasks.length}</span>
              <button
                type="button"
                onClick={() => setActiveTab('care')}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 mt-2 block"
              >
                View all scheduled tasks →
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Active Wounds</span>
              <span className="text-2xl font-black text-rose-600 tabular-nums mt-1 block">{wounds.length}</span>
              <button
                type="button"
                onClick={() => onOpenAddWound(resident.id)}
                className="text-xs font-semibold text-rose-700 hover:text-rose-900 mt-2 block"
              >
                + Add Wound protocol
              </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Standing FYIs</span>
              <span className="text-2xl font-black text-amber-600 tabular-nums mt-1 block">{fyis.length}</span>
              <button
                type="button"
                onClick={() => onOpenAddFYI(resident.id)}
                className="text-xs font-semibold text-amber-700 hover:text-amber-900 mt-2 block"
              >
                + Add FYI note
              </button>
            </div>
          </div>

          {/* Quick List of Care */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Scheduled Daily Care Routines</h3>
              <button
                type="button"
                onClick={() => onOpenAddCareTask(resident.id)}
                className="text-xs font-bold text-teal-700 hover:text-teal-900"
              >
                + Add Task
              </button>
            </div>

            {activeTasks.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">No active care tasks assigned yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeTasks.map(t => {
                  const s = shifts.find(item => item.id === t.shiftId);
                  return (
                    <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span 
                            onClick={() => setDrawerTask(t)}
                            className="font-bold text-slate-900 hover:text-teal-700 cursor-pointer"
                          >
                           <span className="text-slate-900 font-bold text-xs">{t.title}</span>
                          </span>
                          {t.time && <span className="font-mono text-slate-500 font-medium text-xs">{t.time}</span>}
                          <span className="text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded text-[10px] font-semibold">{t.frequency}</span>
                          <TaskAttentionBadges attentionConfig={t.attentionConfig} />
                        </div>
                        {t.instructions && <p className="text-slate-500 text-[11px] mt-0.5">{t.instructions}</p>}
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-slate-500 font-semibold">{s ? s.name : 'All Shifts'}</span>
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Care Tasks</h3>
              
              {/* Filter Pills */}
              <div className="flex items-center space-x-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCareTaskFilter('active')}
                  className={`px-2.5 py-0.5 rounded-full font-medium ${
                    careTaskFilter === 'active'
                      ? 'bg-teal-700 text-white font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Active ({activeTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCareTaskFilter('stopped')}
                  className={`px-2.5 py-0.5 rounded-full font-medium ${
                    careTaskFilter === 'stopped'
                      ? 'bg-amber-700 text-white font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Stopped ({stoppedTasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCareTaskFilter('all')}
                  className={`px-2.5 py-0.5 rounded-full font-medium ${
                    careTaskFilter === 'all'
                      ? 'bg-slate-800 text-white font-bold'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All ({allResidentTasks.length})
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onOpenAddCareTask(resident.id)}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-bold flex items-center space-x-1 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Care Task</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {displayedTasks.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                {careTaskFilter === 'stopped' 
                  ? 'No stopped or inactive care tasks.' 
                  : 'No care tasks assigned. Click above to add.'}
              </div>
            ) : (
              displayedTasks.map(t => {
                const isStopped = t.isActive === false;
                const s = shifts.find(item => item.id === t.shiftId);
                return (
                  <div key={t.id} className={`p-4 flex items-start justify-between hover:bg-slate-50 transition-colors ${isStopped ? 'bg-slate-50/70 opacity-80' : ''}`}>
                    <div className="flex-1 mr-3">
                      <div className="flex items-center space-x-2">
                        <span 
                          onClick={() => setDrawerTask(t)}
                          className={`font-bold text-sm cursor-pointer hover:underline ${isStopped ? 'text-slate-600 line-through' : 'text-slate-900'}`}
                        >
                          {t.title}
                        </span>
                        {t.time && <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">{t.time}</span>}
                        <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded capitalize">
                          {t.frequency}
                        </span>
                        <TaskAttentionBadges attentionConfig={t.attentionConfig} />
                        {isStopped && (
                          <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.5 rounded flex items-center space-x-0.5">
                            <PauseCircle className="w-3 h-3" />
                            <span>Stopped</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        <span className="font-medium text-slate-700">{t.category}</span>
                        {s ? ` · Shift: ${s.shortCode ? `${s.shortCode} — ` : ''}${s.name}` : ' · All Shifts'}
                        {t.instructions ? ` · ${t.instructions}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <TaskActionMenu
                        onEdit={() => handleEditCareTask(t)}
                        onDuplicate={() => handleDuplicateCareTask(t)}
                        onStop={() => handleStopCareTask(t)}
                        onReactivate={() => handleReactivateCareTask(t)}
                        onDelete={() => handleDeleteCareTask(t)}
                        isStopped={isStopped}
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Wound Protocols & Dressings</h3>
            <button
              type="button"
              onClick={() => onOpenAddWound(resident.id)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Wound</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {wounds.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active wound protocols for this resident.
              </div>
            ) : (
              wounds.map(w => (
                <div key={w.id} className="p-4 flex items-start justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-start space-x-3 flex-1 mr-3">
                    <Bandage className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{w.siteLocation}</span>
                        <span className="text-xs bg-rose-100 text-rose-800 font-bold px-2 py-0.5 rounded capitalize">{w.status}</span>
                        <span className="text-xs text-slate-500 capitalize">({w.firstAction})</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <strong>Frequency:</strong> {w.frequency.replace('_', ' ')} · <strong>Bathing:</strong> {w.bathingRelation}
                      </p>
                      {w.instructions && <p className="text-xs text-slate-500 mt-0.5">{w.instructions}</p>}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <TaskActionMenu
                      onEdit={() => handleEditWound(w)}
                      onDelete={() => handleDeleteWound(w)}
                      itemType="wound"
                      ariaLabel={`Actions for Wound ${w.siteLocation}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* FYIs Tab */}
      {activeTab === 'fyis' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 rounded-t-xl flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Standing FYIs & Preferences</h3>
            <button
              type="button"
              onClick={() => onOpenAddFYI(resident.id)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add FYI</span>
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {fyis.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active FYI notes for this resident.
              </div>
            ) : (
              fyis.map(f => (
                <div key={f.id} className="p-4 flex items-start justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-start space-x-3 flex-1 mr-3">
                    <Info className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-amber-100 text-amber-800">
                          {f.category}
                        </span>
                        <span className="text-xs text-slate-400">Effective: {f.effectiveDate}</span>
                      </div>
                      <p className="text-xs text-slate-800 font-medium mt-1">{f.text}</p>
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
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-start space-x-3">
            <ShieldCheck className="w-6 h-6 text-teal-600 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-slate-900">TaskSheet Room-Reuse Isolation Safety</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                TaskSheet strictly binds care tasks, wound charts, and standing FYIs to immutable Resident UUIDs. 
                When a resident is discharged or room {resident.roomNumber} is reassigned to another resident, 
                zero clinical data or task instructions will bleed over.
              </p>
            </div>
          </div>
        </div>
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
          title={confirmModalState.title}
          itemDescription={confirmModalState.description}
          hasHistory={confirmModalState.hasHistory}
          onConfirm={confirmModalState.onConfirm}
        />
      )}
    </div>
  );
};
