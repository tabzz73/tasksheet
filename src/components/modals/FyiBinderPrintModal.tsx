import React, { useState, useRef } from 'react';
import { Printer, X, BookOpen, ChevronDown } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
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

  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    document.body.classList.add('fyi-binder-printing');
    return () => document.body.classList.remove('fyi-binder-printing');
  }, [isOpen]);

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const modalContent = (
    <>
      {/* Screen overlay / modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Print FYI Binder"
        className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm no-print"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="bg-panel rounded-surface shadow-elevated w-full max-w-5xl mx-4 mt-6 mb-6 flex flex-col max-h-[92vh] overflow-hidden">
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-hairline-strong shrink-0">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-5 h-5 text-accent shrink-0" />
              <div>
                <h2 className="text-base font-black text-ink">Print FYI Binder</h2>
                <p className="text-xs text-muted mt-0.5">
                  Professional reference document · Binder Version {model.binderVersion}
                </p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-panel-sunken rounded-control transition-colors text-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scope controls */}
          <div className="px-6 py-3 border-b border-hairline bg-panel-sunken flex flex-wrap items-center gap-4 shrink-0">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider whitespace-nowrap">Scope:</label>
              <div className="relative">
                <select
                  value={scopeRoleId}
                  onChange={(e) => { setScopeRoleId(e.target.value); setScopeShiftId(''); }}
                  className="pl-2.5 pr-7 py-1.5 text-xs border border-hairline-strong rounded-control bg-panel focus:ring-2 focus:ring-accent focus:outline-none appearance-none font-medium text-ink"
                >
                  <option value="">All Roles</option>
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-faint absolute right-2 top-2 pointer-events-none" />
              </div>

              {scopeRoleId && (
                <div className="relative">
                  <select
                    value={scopeShiftId}
                    onChange={(e) => setScopeShiftId(e.target.value)}
                    className="pl-2.5 pr-7 py-1.5 text-xs border border-hairline-strong rounded-control bg-panel focus:ring-2 focus:ring-accent focus:outline-none appearance-none font-medium text-ink"
                  >
                    <option value="">All Shifts</option>
                    {shifts
                      .filter(s => s.roleId === scopeRoleId)
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.shortCode} — {s.name}</option>
                      ))
                    }
                  </select>
                  <ChevronDown className="w-3 h-3 text-faint absolute right-2 top-2 pointer-events-none" />
                </div>
              )}
            </div>

            <span className="text-xs text-muted ml-auto">
              Scope: <strong className="text-ink-soft">{model.scopeLabel}</strong>
            </span>

            <button type="button" onClick={handlePrint} className="btn btn-accent">
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>

          {/* Document preview — paper stays true white/shadow, matching the print-preview treatment elsewhere */}
          <div className="flex-1 overflow-y-auto bg-panel-sunken p-6">
            <div
              ref={printAreaRef}
              className="tasksheet-print-document bg-white shadow-elevated mx-auto"
              style={{ maxWidth: '816px', padding: '40px 48px', minHeight: '1056px' }}
            >
              <FyiBinderPrintDocument model={model} />
            </div>
          </div>
        </div>
      </div>

      {/* Print-only content: the actual document rendered outside the modal */}
      <div className="print-only tasksheet-print-document fyi-binder-print-stream bg-white">
        <FyiBinderPrintDocument model={model} />
      </div>
    </>
  );

  // The main application view creates an isolated stacking context. Render the
  // print dialog at document level so it stays above navigation and view cards.
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : modalContent;
};
