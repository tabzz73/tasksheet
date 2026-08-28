import React from 'react';
import { BathingScheduleModel } from '../../services/print/specializedDocs';
import { formatPrintTimestamp, printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

interface BathingScheduleDocumentProps {
  model: BathingScheduleModel;
}

export const BathingScheduleDocument: React.FC<BathingScheduleDocumentProps> = ({ model }) => {
  const { facility, title, weekRange, days, rows, dailyTotals, targetCapacityPerDay } = model;

  return (
    <div className="tasksheet-print-document bg-white text-slate-900 font-sans print:p-0 select-text text-xs" style={printPageStyle('bathing-schedule')}>
      <RepeatingPrintFooter pageName="bathing-schedule" orientation="landscape" coverage={weekRange} generatedAt={model.generatedAt} />
      {/* ── HEADER ── */}
      <div className="border-b-2 border-slate-900 pb-2 mb-3 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              OPERATIONAL SCHEDULE
            </span>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              {title}
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Week of: <strong className="text-slate-900">{weekRange}</strong> · Target: ~{targetCapacityPerDay} baths/day
          </p>
        </div>

        <div className="text-right">
          <h2 className="text-xs font-bold text-slate-900">{facility.siteName}</h2>
          <p className="text-[10px] text-slate-500">
            {facility.street}, {facility.city} · Unit: {facility.unitPhone}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Generated {formatPrintTimestamp(model.generatedAt || new Date().toISOString())} · TaskSheet V1
          </p>
        </div>
      </div>

      {/* ── WEEKLY MATRIX TABLE ── */}
      <table className="w-full border-collapse border border-slate-300 text-left">
        <thead>
          <tr className="bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider">
            <th className="p-2 border border-slate-700 w-16 text-center">Room</th>
            <th className="p-2 border border-slate-700 w-36">Resident</th>
            <th className="p-2 border border-slate-700 w-28">Assistance / Note</th>
            {days.map(d => (
              <th key={d.dayNumber} className="p-2 border border-slate-700 text-center w-20">
                <div className="text-xs">{d.label}</div>
                <div className="text-[9px] font-normal text-slate-300">{d.shortDate}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {rows.map((row, idx) => (
            <tr key={row.residentId} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
              {/* Room */}
              <td className="p-2 border border-slate-300 text-center font-mono font-black text-xs text-slate-900 bg-slate-100/80">
                {row.roomNumber}
              </td>

              {/* Resident */}
              <td className="p-2 border border-slate-300 font-bold text-slate-900">
                {row.residentName}
              </td>

              {/* Assistance / Notes */}
              <td className="p-2 border border-slate-300 text-[10px] text-slate-600 leading-tight">
                <span className="font-semibold text-slate-800 block">{row.assistanceLevel}</span>
                {row.notes && <span className="text-slate-500 italic block line-clamp-1">{row.notes}</span>}
              </td>

              {/* Mon - Sun Slots */}
              {days.map(d => {
                const slot = row.slots[d.dayNumber];
                return (
                  <td
                    key={d.dayNumber}
                    className={`p-1.5 border border-slate-300 text-center align-middle ${
                      slot.scheduled ? 'bg-teal-50/80 font-bold' : ''
                    }`}
                  >
                    {slot.scheduled ? (
                      <div className="space-y-0.5">
                        <span className="inline-block px-1.5 py-0.5 bg-slate-900 text-white rounded font-mono font-bold text-[10px]">
                          {slot.shiftCode || 'D1'}
                        </span>
                        <div className="text-[10px] font-mono text-teal-900">{slot.time}</div>
                        <div className="text-[9px] text-slate-400">☐ Done</div>
                      </div>
                    ) : (
                      <span className="text-slate-200 text-sm">·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          {/* Blank Write-in Row for PRN / Reschedules */}
          {[1, 2].map((extraIdx) => (
            <tr key={`extra-${extraIdx}`} className="bg-white border-t-2 border-slate-300">
              <td className="p-2 border border-slate-300 text-center font-mono text-slate-400 italic text-[10px]">
                PRN
              </td>
              <td className="p-2 border border-slate-300 text-slate-400 italic text-[10px]">
                Write-in Resident...
              </td>
              <td className="p-2 border border-slate-300 text-slate-400 italic text-[10px]">
                Reason / Note...
              </td>
              {days.map(d => (
                <td key={d.dayNumber} className="p-2 border border-slate-300 text-center text-[10px] text-slate-300">
                  ☐
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-slate-100 font-bold text-slate-900 text-xs border-t-2 border-slate-900">
            <td colSpan={3} className="p-2 border border-slate-300 text-right uppercase tracking-wider text-[10px]">
              Daily Scheduled Total:
            </td>
            {days.map(d => {
              const total = dailyTotals[d.dayNumber] || 0;
              const isOver = total > targetCapacityPerDay;
              return (
                <td key={d.dayNumber} className={`p-2 border border-slate-300 text-center font-mono font-black ${isOver ? 'text-amber-800 bg-amber-50' : 'text-slate-900'}`}>
                  {total} {total === 1 ? 'bath' : 'baths'}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>

      {/* ── FOOTER GUIDELINES ── */}
      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
        <p>
          <strong>Clinical Operations Note:</strong> Check off completed baths on this master sheet. If a resident refuses or is unwell, note reason on shift handoff sheet.
        </p>
      </div>
    </div>
  );
};
