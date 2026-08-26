import React, { useState, useRef } from 'react';
import { Printer, X, BookOpen, ChevronDown } from 'lucide-react';
import { db } from '../../db';
import { PrintService } from '../../services/print';
import { FyiBinderPrintDocument } from '../print/FyiBinderPrintDocument';

interface FyiBinderPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FyiBinderPrintModal: React.FC<FyiBinderPrintModalProps> = ({ isOpen, onClose }) => {
  const state = db.getState();
  const roles = state.roles;
  const shifts = state.shifts.filter(s => s.isActive !== false);

  const [scopeRoleId, setScopeRoleId] = useState<string>('');
  const [scopeShiftId, setScopeShiftId] = useState<string>('');

  const model = PrintService.createFyiBinderPrintModel(
    scopeRoleId || undefined,
    scopeShiftId || undefined
  );

  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Screen overlay / modal */}
      <div
        className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm no-print"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-4 mt-6 mb-6 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-100 text-teal-800 rounded-lg">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900">Print FYI Binder</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Professional reference document · Binder Version {model.binderVersion}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scope controls */}
          <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center gap-4 shrink-0">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">Scope:</label>
              <div className="relative">
                <select
                  value={scopeRoleId}
                  onChange={(e) => { setScopeRoleId(e.target.value); setScopeShiftId(''); }}
                  className="pl-2.5 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 appearance-none font-medium text-slate-800"
                >
                  <option value="">All Roles</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
              </div>

              {scopeRoleId && (
                <div className="relative">
                  <select
                    value={scopeShiftId}
                    onChange={(e) => setScopeShiftId(e.target.value)}
                    className="pl-2.5 pr-7 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-teal-500 appearance-none font-medium text-slate-800"
                  >
                    <option value="">All Shifts</option>
                    {shifts
                      .filter(s => s.roleId === scopeRoleId)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.shortCode} — {s.name}</option>
                      ))
                    }
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-2 pointer-events-none" />
                </div>
              )}
            </div>

            <span className="text-xs text-slate-500 ml-auto">
              Scope: <strong className="text-slate-700">{model.scopeLabel}</strong>
            </span>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          {/* Document preview */}
          <div className="flex-1 overflow-y-auto bg-slate-200 p-6">
            <div
              ref={printAreaRef}
              className="bg-white shadow-lg mx-auto"
              style={{ maxWidth: '816px', padding: '40px 48px', minHeight: '1056px' }}
            >
              <FyiBinderPrintDocument model={model} />
            </div>
          </div>
        </div>
      </div>

      {/* Print-only content: the actual document rendered outside the modal */}
      <div className="print-only fixed inset-0 bg-white z-[9999] p-0">
        <div style={{ padding: '10mm 11mm' }}>
          <FyiBinderPrintDocument model={model} />
        </div>
      </div>
    </>
  );
};
