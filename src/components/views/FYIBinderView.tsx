import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  Printer, 
  Plus, 
  Search,
  Trash2
} from 'lucide-react';
import { db } from '../../db';
import { FYI, Resident, Role } from '../../types';
import { TaskActionMenu } from '../common/TaskActionMenu';
import { GlobalAddModal } from '../modals/GlobalAddModal';
import { TaskActionConfirmModal } from '../modals/TaskActionConfirmModal';
import { FyiBinderPrintModal } from '../modals/FyiBinderPrintModal';

interface FYIBinderViewProps {
  onOpenAddFYI: () => void;
  navigationResetToken?: number;
}

export const FYIBinderView: React.FC<FYIBinderViewProps> = ({
  onOpenAddFYI,
  navigationResetToken = 0,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'shared' | 'role-hca-0001' | 'role-lpn-0002' | 'role-rn-0003'>('all');
  const [editFyi, setEditFyi] = useState<FYI | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; fyi: FYI | null }>({
    isOpen: false,
    fyi: null
  });

  useEffect(() => {
    setSearchQuery('');
    setScopeFilter('all');
    setEditFyi(null);
    setIsPrintModalOpen(false);
    setConfirmModal({ isOpen: false, fyi: null });
  }, [navigationResetToken]);

  const state = db.getState();
  const fyis = state.fyis.filter(f => f.status === 'active');
  const residents = state.residents;
  const binderState = state.binderState;

  const handleMarkUpdated = () => {
    db.markBinderUpdated();
  };

  const handleConfirmDelete = () => {
    if (confirmModal.fyi) {
      db.deleteFYI(confirmModal.fyi.id);
      setConfirmModal({ isOpen: false, fyi: null });
    }
  };

  const handlePrintBinder = () => {
    setIsPrintModalOpen(true);
  };

  const filteredFYIs = fyis.filter(f => {
    if (scopeFilter === 'shared' && (f.roleId || f.shiftId)) return false;
    if (scopeFilter !== 'all' && scopeFilter !== 'shared' && f.roleId !== scopeFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const res = f.residentId ? residents.find(r => r.id === f.residentId) : null;
    const textMatch = f.text.toLowerCase().includes(q);
    const catMatch = f.category.toLowerCase().includes(q);
    const resMatch = res ? `${res.roomNumber} ${res.firstName} ${res.lastName}`.toLowerCase().includes(q) : false;
    return textMatch || catMatch || resMatch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* 1. BINDER HEADER & PHYSICAL STATUS BANNER */}
      <div className="title-block rounded-surface p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-5 h-5 text-accent shrink-0" />
            <div>
              <h2 className="text-[22px] font-bold tracking-tight text-ink">FYI Binder</h2>
              <p className="text-xs text-muted font-medium mt-0.5">
                Standing information staff need to know but do not complete as tasks
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2.5">
            <button type="button" onClick={handlePrintBinder} className="btn btn-secondary">
              <Printer className="w-3.5 h-3.5" />
              <span>Print Binder</span>
            </button>

            <button type="button" onClick={onOpenAddFYI} className="btn btn-accent">
              <Plus className="w-3.5 h-3.5" />
              <span>Add FYI</span>
            </button>
          </div>
        </div>

        {/* Physical Binder Sync Status Bar */}
        <div className={`p-3.5 rounded-control border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          binderState.status === 'current'
            ? 'bg-positive-soft border-positive text-positive'
            : 'bg-warning-soft border-warning text-warning'
        }`}>
          <div className="flex items-start sm:items-center space-x-3">
            {binderState.status === 'current' ? (
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[13px] uppercase tracking-wide">
                  {binderState.status === 'current' ? 'Physical Binder Current' : 'Physical Binder Update Required'}
                </span>
                <span className="badge badge-neutral">Version {binderState.version}</span>
              </div>
              <p className="text-xs mt-0.5">
                {binderState.status === 'current'
                  ? `Confirmed updated at ${new Date(binderState.lastConfirmedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : `${binderState.pendingChangesCount} new/modified notes pending physical placement in nursing station binder.`}
              </p>
            </div>
          </div>

          {binderState.status === 'update_required' && (
            <button type="button" onClick={handleMarkUpdated} className="btn btn-primary shrink-0">
              Mark Physical Copy Updated
            </button>
          )}
        </div>
      </div>

      {/* 2. SEARCH & SCOPE FILTER */}
      <div className="title-block rounded-surface px-3.5 h-12 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search standing notes or rooms..."
            className="w-full pl-9 pr-4 h-8 bg-panel-sunken border border-hairline rounded-control text-xs focus:bg-panel focus:ring-1 focus:ring-accent focus:outline-none"
          />
          <Search className="w-3.5 h-3.5 text-faint absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center border border-hairline-strong rounded-control overflow-x-auto text-xs w-full sm:w-auto sm:shrink-0">
          {[
            { id: 'all', label: 'All Scopes' },
            { id: 'shared', label: 'Shared / Unit' },
            { id: 'role-hca-0001', label: 'HCA Scope' },
            { id: 'role-lpn-0002', label: 'LPN Scope' },
            { id: 'role-rn-0003', label: 'RN Scope' },
          ].map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScopeFilter(s.id as any)}
              className={`px-2.5 h-8 font-semibold whitespace-nowrap transition-colors ${i > 0 ? 'border-l border-hairline-strong' : ''} ${
                scopeFilter === s.id ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. BINDER ENTRIES TABLE */}
      <div className="title-block rounded-surface overflow-hidden">
        <div className="overflow-x-auto">
        <table className="table-schedule w-full min-w-[640px]">
          <thead>
            <tr>
              <th style={{ width: '7%' }} className="text-center">Room</th>
              <th style={{ width: '16%' }}>Resident / Target</th>
              <th style={{ width: '12%' }}>Category</th>
              <th>FYI / Standing Information</th>
              <th style={{ width: '10%' }}>Effective</th>
              <th style={{ width: '6%' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredFYIs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-faint italic">
                  No standing FYI notes found. Click '+ Add FYI' to record one.
                </td>
              </tr>
            ) : (
              filteredFYIs.map(f => {
                const res = f.residentId ? residents.find(r => r.id === f.residentId) : null;
                return (
                  <tr key={f.id}>
                    <td className="text-center font-mono font-bold text-ink tabular-nums">
                      {res ? res.roomNumber : 'UNIT'}
                    </td>
                    <td className="font-semibold text-ink">
                      {res ? `${res.firstName} ${res.lastName}` : 'Shared (All Staff)'}
                    </td>
                    <td>
                      <span className={`badge ${
                        f.category === 'safety' ? 'badge-danger' :
                        f.category === 'protocol' ? 'badge-warning' :
                        f.category === 'preference' ? 'badge-accent' :
                        'badge-neutral'
                      }`}>
                        {f.category}
                      </span>
                    </td>
                    <td className="text-ink-soft font-medium leading-relaxed">
                      {f.text}
                    </td>
                    <td className="text-muted tabular-nums font-mono text-[11px]">
                      {f.effectiveDate}
                    </td>
                    <td className="text-center">
                      <div className="flex justify-center shrink-0">
                        <TaskActionMenu
                          onEdit={() => setEditFyi(f)}
                          onDelete={() => setConfirmModal({ isOpen: true, fyi: f })}
                          itemType="fyi"
                          ariaLabel={`Actions for FYI note`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Edit FYI Modal */}
      {editFyi && (
        <GlobalAddModal
          isOpen={!!editFyi}
          onClose={() => setEditFyi(null)}
          mode="edit"
          initialFYI={editFyi}
        />
      )}

      {/* Confirm Delete FYI Modal */}
      {confirmModal.isOpen && (
        <TaskActionConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal({ isOpen: false, fyi: null })}
          actionType="delete"
          itemType="FYI"
          title="Standing FYI Note"
          itemDescription={confirmModal.fyi?.text || ''}
          hasHistory={false}
          onConfirm={handleConfirmDelete}
        />
      )}
      {/* FYI Binder Print Modal */}
      {isPrintModalOpen && (
        <FyiBinderPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
