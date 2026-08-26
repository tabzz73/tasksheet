import React, { useState } from 'react';
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
}

export const FYIBinderView: React.FC<FYIBinderViewProps> = ({
  onOpenAddFYI
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'shared' | 'role-hca-0001' | 'role-lpn-0002' | 'role-rn-0003'>('all');
  const [editFyi, setEditFyi] = useState<FYI | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; fyi: FYI | null }>({
    isOpen: false,
    fyi: null
  });

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
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
                <BookOpen className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">FYI Binder</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Standing information staff need to know but do not complete as tasks
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handlePrintBinder}
              className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Binder</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddFYI}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow flex items-center space-x-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add FYI</span>
            </button>
          </div>
        </div>

        {/* Physical Binder Sync Status Bar */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          binderState.status === 'current'
            ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <div className="flex items-start sm:items-center space-x-3">
            {binderState.status === 'current' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-black text-sm uppercase tracking-wide">
                  {binderState.status === 'current' ? 'Physical Binder Current' : 'Physical Binder Update Required'}
                </span>
                <span className="text-[11px] font-mono font-bold bg-white/80 px-2 py-0.5 rounded border">
                  Version {binderState.version}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {binderState.status === 'current'
                  ? `Confirmed updated at ${new Date(binderState.lastConfirmedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : `${binderState.pendingChangesCount} new/modified notes pending physical placement in nursing station binder.`}
              </p>
            </div>
          </div>

          {binderState.status === 'update_required' && (
            <button
              type="button"
              onClick={handleMarkUpdated}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow transition-colors flex-shrink-0"
            >
              Mark Physical Copy Updated
            </button>
          )}
        </div>
      </div>

      {/* 2. SEARCH & SCOPE FILTER */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search standing notes or rooms..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-teal-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        <div className="flex items-center space-x-1.5 text-xs overflow-x-auto w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Scopes' },
            { id: 'shared', label: 'Shared / Unit' },
            { id: 'role-hca-0001', label: 'HCA Scope' },
            { id: 'role-lpn-0002', label: 'LPN Scope' },
            { id: 'role-rn-0003', label: 'RN Scope' },
          ].map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setScopeFilter(s.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                scopeFilter === s.id
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. BINDER ENTRIES TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <th className="p-3.5 w-16 text-center rounded-tl-xl">Room</th>
              <th className="p-3.5 w-36">Resident / Target</th>
              <th className="p-3.5 w-28">Category</th>
              <th className="p-3.5">FYI / Standing Information</th>
              <th className="p-3.5 w-24">Effective</th>
              <th className="p-3.5 w-12 text-center rounded-tr-xl"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredFYIs.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                  No standing FYI notes found. Click '+ Add FYI' to record one.
                </td>
              </tr>
            ) : (
              filteredFYIs.map(f => {
                const res = f.residentId ? residents.find(r => r.id === f.residentId) : null;
                return (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-center font-mono font-bold text-slate-900 tabular-nums">
                      {res ? res.roomNumber : 'UNIT'}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-900">
                      {res ? `${res.firstName} ${res.lastName}` : 'Shared (All Staff)'}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        f.category === 'safety' ? 'bg-rose-100 text-rose-800' :
                        f.category === 'preference' ? 'bg-teal-100 text-teal-800' :
                        f.category === 'protocol' ? 'bg-purple-100 text-purple-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {f.category}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-800 font-medium leading-relaxed">
                      {f.text}
                    </td>
                    <td className="p-3.5 text-slate-500 tabular-nums font-mono text-[11px]">
                      {f.effectiveDate}
                    </td>
                    <td className="p-3.5 text-center">
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
