import React from 'react';
import { WoundScheduleModel } from '../../services/print/specializedDocs';
import { formatPrintTimestamp, printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

interface WoundScheduleDocumentProps {
  model: WoundScheduleModel;
}

export const WoundScheduleDocument: React.FC<WoundScheduleDocumentProps> = ({ model }) => {
  const { facility, title, formattedDate, generatedAt, wounds, totalActiveWounds, totalResidentsWithWounds } = model;
  const generatedLabel = formatPrintTimestamp(generatedAt);

  return (
    <div className="wound-schedule-document tasksheet-print-document bg-white text-slate-900 font-sans print:p-0 select-text text-xs" style={printPageStyle('wound-schedule')}>
      <RepeatingPrintFooter pageName="wound-schedule" orientation="landscape" facilityName={facility.siteName} documentLabel="Wound Treatment Schedule" dateLabel={formattedDate} generatedAt={generatedAt} />
      {/* ── HEADER ── */}
      <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-rose-800 text-white font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              CLINICAL WORKSHEET
            </span>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              {title}
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Assignment Date: <strong className="text-slate-900">{formattedDate}</strong> · <span className="text-rose-800 font-bold">{totalActiveWounds} due wound protocol{totalActiveWounds !== 1 ? 's' : ''}</span> across {totalResidentsWithWounds} resident{totalResidentsWithWounds !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="text-right">
          <h2 className="text-xs font-bold text-slate-900">{facility.siteName}</h2>
          <p className="text-[10px] text-slate-500">
            {facility.street}, {facility.city} · Main: {facility.mainPhone}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Generated {generatedLabel} · TaskSheet V1
          </p>
        </div>
      </div>

      {/* ── WOUND SCHEDULE TABLE ── */}
      <table className="w-full border-collapse border border-slate-300 text-left">
        <thead>
          <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
            <th className="p-2 border border-slate-700 w-16 text-center">Room</th>
            <th className="p-2 border border-slate-700 w-36">Resident</th>
            <th className="p-2 border border-slate-700 w-44">Wound Site & Protocol</th>
            <th className="p-2 border border-slate-700 w-32">Shift / Time / Shower</th>
            <th className="p-2 border border-slate-700 flex-1">Treatment / Dressing Protocol</th>
            <th className="p-2 border border-slate-700 w-48">Observations & Sign-off</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {wounds.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                No wound care protocols are due on this date.
              </td>
            </tr>
          ) : (
            wounds.map((w, idx) => (
              <tr key={w.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                {/* Room */}
                <td className="p-2 border border-slate-300 text-center font-mono font-black text-xs text-slate-900 bg-slate-100/80 align-top">
                  {w.roomNumber}
                </td>

                {/* Resident */}
                <td className="p-2 border border-slate-300 font-bold text-slate-900 align-top">
                  {w.residentName}
                </td>

                {/* Wound Site & Action */}
                <td className="p-2 border border-slate-300 align-top">
                  <span className="font-bold text-rose-900 block text-xs">{w.siteLocation}</span>
                  <span className="text-[10px] text-slate-600 font-medium">{w.firstAction}</span>
                  <span className="text-[10px] text-slate-500 block">Freq: {w.frequency}</span>
                </td>

                {/* Timing */}
                <td className="p-2 border border-slate-300 text-[10px] text-slate-700 align-top">
                  <span className={`font-bold block ${w.configurationWarning ? 'text-rose-800' : 'text-slate-900'}`}>{w.shiftCode}</span>
                  <span className="font-mono font-bold block">{w.scheduledTime}</span>
                  <span className="text-teal-800 font-semibold">{w.bathingRelation}</span>
                  {w.configurationWarning && <span className="block mt-1 text-rose-800 font-bold">Needs review</span>}
                </td>

                {/* Treatment Instructions */}
                <td className="p-2 border border-slate-300 text-xs text-slate-800 leading-snug align-top">
                  <p className="font-medium">{w.instructions || 'Cleanse and redress per clinical protocol.'}</p>
                  <p className="mt-1 text-[10px]"><strong>Supplies:</strong> {w.supplies}</p>
                </td>

                {/* Observations & Writable Fields */}
                <td className="p-2 border border-slate-300 text-[10px] text-slate-500 align-top bg-slate-50/50">
                  <div className="space-y-1.5">
                    {w.assessmentType !== 'none' && <div className="font-black text-slate-800">{w.assessmentType === 'full' ? 'FULL' : 'PARTIAL'} ASSESSMENT</div>}
                    <div>Bed: ☐ Gran ☐ Slough ☐ Necrotic</div>
                    <div>Drainage: ☐ None ☐ Scant ☐ Mod ☐ Heavy</div>
                    <div className="pt-1 flex items-center justify-between border-t border-slate-200">
                      <span>Done: ☐</span>
                      <span>Initials: ______</span>
                    </div>
                  </div>
                </td>
              </tr>
            ))
          )}

          {/* Blank Write-in Row for New Emergency Wounds */}
          {[1, 2].map((extraIdx) => (
            <tr key={`extra-wound-${extraIdx}`} className="bg-white border-t-2 border-slate-300">
              <td className="p-2 border border-slate-300 text-center font-mono text-slate-400 italic text-[10px] align-top">
                NEW
              </td>
              <td className="p-2 border border-slate-300 text-slate-400 italic text-[10px] align-top">
                Write-in Resident...
              </td>
              <td className="p-2 border border-slate-300 text-slate-400 italic text-[10px] align-top">
                Site & Stage...
              </td>
              <td className="p-2 border border-slate-300 text-slate-400 italic text-[10px] align-top">
                Time / Shower...
              </td>
              <td className="p-2 border border-slate-300 text-slate-400 italic text-[10px] align-top">
                Dressing protocol used...
              </td>
              <td className="p-2 border border-slate-300 text-[10px] text-slate-400 align-top">
                Done: ☐ &nbsp; Initials: ______
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── FOOTER ── */}
      <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500">
        <p>
          <strong>LPN Operational Responsibility:</strong> Document formal wound assessments in clinical chart; use this sheet for physical shift coordination and supply staging.
        </p>
      </div>
      <div className="no-print mt-2 flex items-center justify-between gap-4 text-[10px] font-semibold text-slate-500">
        <span>Coverage: {formattedDate}</span>
        <span>Generated: {generatedLabel}</span>
        <span>Page numbers print on every page</span>
      </div>
    </div>
  );
};
