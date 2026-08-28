import React from 'react';
import { ShiftConfigReferenceModel } from '../../services/print/specializedDocs';
import { printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

interface ShiftConfigReferenceDocumentProps {
  model: ShiftConfigReferenceModel;
}

export const ShiftConfigReferenceDocument: React.FC<ShiftConfigReferenceDocumentProps> = ({ model }) => {
  const { facility, formattedDate, shifts } = model;

  return (
    <div className="tasksheet-print-document bg-white text-slate-900 font-sans print:p-0 select-text text-xs space-y-4" style={printPageStyle('shift-configuration')}>
      <RepeatingPrintFooter pageName="shift-configuration" orientation="portrait" coverage={`As of ${formattedDate}`} generatedAt={model.generatedAt} />
      {/* ── HEADER ── */}
      <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              OPERATIONAL AUDIT REFERENCE
            </span>
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight mt-1">
            FACILITY MASTER SHIFT CONFIGURATION
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Active Shifts Reference Sheet · As of: <strong className="text-slate-900">{formattedDate}</strong>
          </p>
        </div>

        <div className="text-right">
          <h2 className="text-xs font-bold text-slate-900">{facility.siteName}</h2>
          <p className="text-[10px] text-slate-500">
            {facility.city}, {facility.province} · {facility.mainPhone}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            TaskSheet Facility Settings Reference
          </p>
        </div>
      </div>

      {/* ── SHIFT CONFIGURATIONS ── */}
      <div className="space-y-4">
        {shifts.map(({ shift, role, unitTasksCount, residentTasksCount, unitTasks }) => (
          <div key={shift.id} className="border border-slate-300 rounded overflow-hidden">
            <div className="bg-slate-900 text-white p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="px-2.5 py-1 bg-white text-slate-900 rounded font-mono font-black text-xs">
                  {shift.shortCode || '—'}
                </span>
                <span className="font-bold text-sm">{shift.name}</span>
                <span className="text-slate-300 text-xs font-normal">({role.name})</span>
              </div>
              <div className="font-mono text-xs font-bold text-teal-300">
                {shift.startTime} – {shift.endTime}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center space-x-6 text-xs font-semibold text-slate-700">
              <div>
                <span className="text-slate-400 font-normal">Default Print Style: </span>
                <span className="capitalize font-bold text-slate-900">{role.defaultPrintProfile.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-slate-400 font-normal">Unit Routines: </span>
                <span className="font-bold text-slate-900">{unitTasksCount} configured</span>
              </div>
              <div>
                <span className="text-slate-400 font-normal">Active Resident Tasks: </span>
                <span className="font-bold text-slate-900">{residentTasksCount} scheduled</span>
              </div>
            </div>

            {unitTasks.length > 0 && (
              <div className="divide-y divide-slate-100 bg-white">
                <div className="px-3 py-1.5 bg-slate-100/60 font-black text-[10px] text-slate-500 uppercase tracking-wider">
                  Configured Unit Routines:
                </div>
                {unitTasks.map((u, i) => (
                  <div key={i} className="px-3 py-2 flex items-start justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{u.title}</span>
                      {u.instructions && <p className="text-[11px] text-slate-500">{u.instructions}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                        {u.phase} {u.time ? `· ${u.time}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
        <p>Use this configuration reference for clinical orientation, staff scheduling, and procedural auditing.</p>
      </div>
    </div>
  );
};
