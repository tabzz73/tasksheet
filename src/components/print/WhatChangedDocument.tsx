import React from 'react';
import { WhatChangedModel, formatGeneratedAt } from '../../services/printHistory';
import { printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

interface WhatChangedDocumentProps {
  model: WhatChangedModel;
}

export const WhatChangedDocument: React.FC<WhatChangedDocumentProps> = ({ model }) => {
  const {
    shiftCode,
    shiftName,
    formattedDate,
    lastGeneratedAt,
    newGeneratedAt,
    previousRevision,
    newRevision,
    facility,
    added,
    modified,
    removed,
    totalChanges,
  } = model;

  return (
    <div className="tasksheet-print-document bg-white text-slate-900 font-sans print:p-0 select-text text-xs space-y-4" style={printPageStyle(`what-changed-${shiftCode || shiftName}`)}>
      <RepeatingPrintFooter pageName={`what-changed-${shiftCode || shiftName}`} orientation="portrait" facilityName={facility.siteName} documentLabel="TaskSheet Changes" dateLabel={formattedDate} secondaryLabel={`${shiftCode || shiftName} · Revision ${newRevision}`} generatedAt={newGeneratedAt} />
      {/* ── HEADER ── */}
      <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-amber-600 text-white font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              WHAT CHANGED? · DELTA UPDATE
            </span>
            <span className="bg-slate-900 text-white font-mono font-black px-2 py-0.5 rounded text-xs">
              {shiftCode || 'SHIFT'}
            </span>
            <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-xs border border-amber-300">
              Rev {newRevision} (from Rev {previousRevision})
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            {shiftCode ? `${shiftCode} — ${shiftName}` : shiftName}
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Assignment Date: <strong className="text-slate-900">{formattedDate}</strong> · <strong className="text-amber-800">{totalChanges} itemized change{totalChanges !== 1 ? 's' : ''}</strong>
          </p>
        </div>

        <div className="text-right">
          <h2 className="text-xs font-bold text-slate-900">{facility.siteName}</h2>
          <p className="text-[10px] text-slate-500">
            Initial Print: {formatGeneratedAt(lastGeneratedAt)}
          </p>
          <p className="text-[10px] font-bold text-slate-800">
            Updated: {formatGeneratedAt(newGeneratedAt)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            TaskSheet V1 · Changes Only
          </p>
        </div>
      </div>

      {/* ── NOTICE BANNER ── */}
      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs flex items-center justify-between text-amber-900">
        <div>
          <strong>Floor Notice:</strong> Clip this single-page update to your existing printed TaskSheet. Do not discard your primary sheet.
        </div>
        <div className="text-[11px] font-bold shrink-0 ml-3">
          +{added.length} Added · ~{modified.length} Modified · −{removed.length} Cancelled
        </div>
      </div>

      {/* ── 1. ADDED CARE TASKS (➕ NEW) ── */}
      {added.length > 0 && (
        <div className="space-y-2">
          <div className="bg-emerald-800 text-white px-3 py-1.5 rounded font-black text-xs uppercase tracking-wider flex items-center justify-between">
            <span>➕ Added Tasks (Perform during shift)</span>
            <span>{added.length} new item{added.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="border border-emerald-300 rounded divide-y divide-emerald-100 overflow-hidden bg-emerald-50/20">
            {added.map(item => (
              <div key={item.id} className="p-3 flex items-start justify-between text-xs hover:bg-emerald-50/50">
                <div className="flex items-start space-x-3">
                  <span className="px-2 py-1 bg-slate-900 text-white rounded font-mono font-black text-xs shrink-0">
                    {item.roomNumber}
                  </span>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-slate-900 text-sm">{item.residentName}</span>
                      {item.time && (
                        <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-[10px]">
                          {item.time}
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                        {item.category}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900 mt-1 text-xs">{item.title}</p>
                    {item.instructions && (
                      <p className="text-[11px] text-slate-700 mt-0.5 bg-white p-1.5 rounded border border-emerald-200">
                        {item.instructions}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 pl-3">
                  <div className="text-[10px] text-slate-400 font-medium">☐ Done</div>
                  <div className="text-[9px] text-slate-400 mt-1">Initials: ___</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. MODIFIED TASKS (✏️ UPDATED) ── */}
      {modified.length > 0 && (
        <div className="space-y-2">
          <div className="bg-amber-700 text-white px-3 py-1.5 rounded font-black text-xs uppercase tracking-wider flex items-center justify-between">
            <span>✏️ Modified Instructions / Timing</span>
            <span>{modified.length} modified item{modified.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="border border-amber-300 rounded divide-y divide-amber-100 overflow-hidden bg-amber-50/20">
            {modified.map(({ current, previous }, i) => (
              <div key={i} className="p-3 text-xs hover:bg-amber-50/50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="px-2 py-1 bg-slate-900 text-white rounded font-mono font-black text-xs shrink-0">
                      {current.roomNumber}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">{current.residentName}</span>
                        {current.time && (
                          <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-[10px]">
                            {current.time}
                          </span>
                        )}
                        <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                          {current.category}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 mt-1">{current.title}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-3">
                    <div className="text-[10px] text-slate-400 font-medium">☐ Done</div>
                    <div className="text-[9px] text-slate-400 mt-1">Initials: ___</div>
                  </div>
                </div>

                {/* Diff box */}
                <div className="mt-2 ml-11 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                  {previous?.instructions && (
                    <div className="bg-slate-100 p-2 rounded text-slate-600 line-through">
                      <strong className="text-slate-500 font-bold block text-[9px] uppercase">Previous:</strong>
                      {previous.instructions}
                    </div>
                  )}
                  <div className="bg-white p-2 rounded border border-amber-300 text-amber-950 font-medium">
                    <strong className="text-amber-800 font-bold block text-[9px] uppercase">Updated:</strong>
                    {current.instructions || 'Routine details updated.'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 3. REMOVED / CANCELLED TASKS (❌ DO NOT PERFORM) ── */}
      {removed.length > 0 && (
        <div className="space-y-2">
          <div className="bg-rose-800 text-white px-3 py-1.5 rounded font-black text-xs uppercase tracking-wider flex items-center justify-between">
            <span>❌ Cancelled / Discontinued (Do NOT perform)</span>
            <span>{removed.length} cancelled item{removed.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="border border-rose-300 rounded divide-y divide-rose-100 overflow-hidden bg-rose-50/20">
            {removed.map(item => (
              <div key={item.id} className="p-2.5 flex items-center justify-between text-xs bg-rose-50/40">
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 bg-slate-900 text-white rounded font-mono font-bold text-xs shrink-0 line-through opacity-70">
                    {item.roomNumber}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800">{item.residentName}</span>
                    <span className="text-slate-400 mx-1.5">·</span>
                    <span className="font-semibold text-rose-900 line-through">{item.title}</span>
                    {item.time && <span className="text-slate-500 ml-1.5 text-[10px]">({item.time})</span>}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-rose-800 uppercase px-2 py-0.5 bg-rose-100 rounded">
                  Discontinued
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FOOTER & ACKNOWLEDGEMENT ── */}
      <div className="pt-4 border-t-2 border-slate-900 space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Changes Reconciled By (Charge Nurse / Supervisor):
            </span>
            <div className="border-b border-slate-400 h-6"></div>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Floor Staff Receipt Acknowledgement:
            </span>
            <div className="border-b border-slate-400 h-6"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
