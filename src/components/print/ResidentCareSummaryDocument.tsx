import React from 'react';
import { ResidentCareSummaryModel } from '../../services/print/specializedDocs';
import { getResidentStatusLabel } from '../../services/residentStatus';

interface ResidentCareSummaryDocumentProps {
  model: ResidentCareSummaryModel;
}

export const ResidentCareSummaryDocument: React.FC<ResidentCareSummaryDocumentProps> = ({ model }) => {
  const { facility, resident, formattedDate, importantFYIs, tasksByShift, wounds } = model;

  const totalTasks = tasksByShift.reduce((acc, s) => acc + s.tasks.length, 0);

  return (
    <div className="bg-white text-slate-900 font-sans print:p-0 select-text text-xs space-y-4">
      {/* ── HEADER ── */}
      <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-teal-800 text-white font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              CARE PLAN SUMMARY
            </span>
            <span className="px-2.5 py-0.5 bg-slate-900 text-white font-mono font-black rounded text-sm">
              Room {resident.roomNumber}
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            {resident.firstName} {resident.lastName}
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Status: <span className="font-bold text-teal-800">{getResidentStatusLabel(resident.status)}</span> · As of: <strong className="text-slate-900">{formattedDate}</strong>
          </p>
        </div>

        <div className="text-right">
          <h2 className="text-xs font-bold text-slate-900">{facility.siteName}</h2>
          <p className="text-[10px] text-slate-500">
            {facility.street}, {facility.city} · Main: {facility.mainPhone}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            TaskSheet Care Summary · {totalTasks} Active Task{totalTasks !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* ── RESIDENT NOTES BANNER (if any) ── */}
      {resident.notes && (
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
          <strong className="text-slate-800 font-bold uppercase tracking-wider text-[10px] block mb-0.5">Care Plan Notes:</strong>
          <span className="text-slate-700 leading-snug">{resident.notes}</span>
        </div>
      )}

      {/* ── IMPORTANT FYIS & STANDING PRECAUTIONS ── */}
      {importantFYIs.length > 0 && (
        <div className="border border-amber-300 bg-amber-50/50 rounded overflow-hidden">
          <div className="bg-amber-100/80 px-3 py-1.5 border-b border-amber-300 font-black text-[10px] text-amber-900 uppercase tracking-wider">
            Important Standing Information & Safety Precautions
          </div>
          <div className="p-3 space-y-1.5">
            {importantFYIs.map((f, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs">
                <span className="font-bold text-amber-700 mt-0.5 shrink-0">·</span>
                <div>
                  <span className="font-bold text-slate-900 mr-1.5 uppercase text-[10px] bg-white px-1.5 py-0.5 rounded border border-amber-200">
                    {f.category}
                  </span>
                  <span className="text-slate-800">{f.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SCHEDULED CARE ROUTINES BY SHIFT ── */}
      <div className="space-y-3">
        <div className="font-black text-xs text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1">
          Active Scheduled Daily Care Routines
        </div>

        {tasksByShift.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">No active care routines scheduled for this resident.</p>
        ) : (
          tasksByShift.map(({ shift, role, tasks }) => (
            <div key={shift.id} className="border border-slate-200 rounded overflow-hidden">
              <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-1.5 py-0.5 bg-slate-900 text-white font-mono font-bold text-[10px] rounded">
                    {shift.shortCode || '—'}
                  </span>
                  <span className="font-bold text-slate-900 text-xs">{shift.name}</span>
                  <span className="text-slate-500 text-[11px]">({role.name} · {shift.startTime}–{shift.endTime})</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                  {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {tasks.map(t => (
                  <div key={t.id} className="p-2.5 flex items-start justify-between text-xs hover:bg-slate-50">
                    <div className="flex-1 pr-3">
                      <div className="flex items-center space-x-2">
                        {t.time ? (
                          <span className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {t.time}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">Flexible</span>
                        )}
                        <span className="font-bold text-slate-900">{t.title}</span>
                        {t.priority === 'urgent' && (
                          <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1 rounded uppercase">Urgent</span>
                        )}
                        {t.priority === 'high' && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">High</span>
                        )}
                      </div>
                      {t.instructions && (
                        <p className="text-[11px] text-slate-600 mt-1 pl-1 border-l-2 border-slate-200">
                          {t.instructions}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-medium text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100 capitalize">
                        {t.frequency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── ACTIVE WOUND PROTOCOLS ── */}
      {wounds.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="font-black text-xs text-rose-900 uppercase tracking-wider border-b border-rose-200 pb-1">
            Active Wound Care Protocols
          </div>
          <div className="border border-rose-200 rounded divide-y divide-rose-100 bg-rose-50/20">
            {wounds.map(w => (
              <div key={w.id} className="p-2.5 text-xs flex items-start justify-between">
                <div>
                  <span className="font-bold text-rose-900">{w.siteLocation}</span>
                  <p className="text-[11px] text-slate-700 mt-0.5">
                    {w.firstAction} · {w.frequency} · {w.bathingRelation}
                  </p>
                  {w.instructions && <p className="text-[11px] text-slate-600 italic mt-0.5">{w.instructions}</p>}
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RECONCILIATION & CLINICAL SIGN-OFF ── */}
      <div className="pt-4 border-t-2 border-slate-900">
        <div className="grid grid-cols-2 gap-4 text-xs text-slate-700">
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Care Plan Reconciled By (RN / LPN Supervisor):
            </span>
            <div className="border-b border-slate-400 h-6"></div>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Date & Signature:
            </span>
            <div className="border-b border-slate-400 h-6"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
