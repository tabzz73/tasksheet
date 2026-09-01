import React from 'react';
import { BathingScheduleModel } from '../../services/print/specializedDocs';
import { formatPrintTimestamp, printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

interface BathingScheduleDocumentProps {
  model: BathingScheduleModel;
}

const availableLabels = (count: number): string[] => {
  if (count <= 0) return [];
  if (count <= 4) return Array.from({ length: count }, () => 'Available');
  return [`Available × ${count}`];
};

export const BathingScheduleDocument: React.FC<BathingScheduleDocumentProps> = ({ model }) => {
  const { facility, weekRange, days, shiftLines, capacityPerShiftLine } = model;

  return (
    <div
      className="tasksheet-print-document bathing-weekly-grid bg-white text-slate-900 font-sans print:p-0 select-text"
      data-bathing-grid="weekly"
      data-print-orientation="landscape"
      style={{ ...printPageStyle('bathing-schedule'), fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '8.5pt', lineHeight: 1.1 }}
    >
      <RepeatingPrintFooter pageName="bathing-schedule" orientation="landscape" facilityName={facility.siteName} documentLabel="Weekly Bathing Schedule" dateLabel={weekRange} generatedAt={model.generatedAt} />

      <table className="w-full border-collapse table-fixed" aria-label="Weekly Bathing Schedule">
        <thead style={{ display: 'table-header-group' }}>
          <tr>
            <th colSpan={8} className="border-b-2 border-slate-900 pb-2 text-left normal-case">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="m-0 text-[9pt] font-bold">{facility.siteName}</p>
                  <h1 className="m-0 text-[16pt] leading-none font-black uppercase tracking-tight">Weekly Bathing Schedule</h1>
                  <p className="m-0 mt-1 text-[10pt] font-bold">Week: {weekRange}</p>
                </div>
                <div className="text-right text-[8pt] font-normal leading-tight">
                  <p className="m-0">Capacity: {capacityPerShiftLine} per shift line/day</p>
                  <p className="m-0">Generated {formatPrintTimestamp(model.generatedAt || new Date().toISOString())}</p>
                </div>
              </div>
            </th>
          </tr>
          <tr>
            <th className="border-2 border-slate-800 p-[4pt] text-left w-[11%] text-[8.5pt] uppercase">Shift</th>
            {days.map(day => (
              <th key={day.dayNumber} data-weekday={day.label} className="border-2 border-slate-800 p-[4pt] text-center text-[8.5pt] uppercase">
                <span className="block font-black">{day.label}</span>
                <span className="block font-normal normal-case text-[8pt]">{day.shortDate}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shiftLines.map(line => (
            <tr key={line.shiftId} data-shift-line={line.shiftCode} style={{ breakInside: 'avoid', pageBreakInside: 'avoid' }}>
              <th className="border border-slate-600 p-[5pt] text-left align-top">
                <span className="block text-[10pt] font-black">{line.shiftCode}</span>
                <span className="block text-[7.5pt] font-normal leading-tight text-slate-600">{line.shiftName}</span>
              </th>
              {days.map(day => {
                const slot = line.days[day.dayNumber];
                const minimumLines = Math.min(Math.max(slot.capacity, slot.rooms.length), 5);
                return (
                  <td
                    key={day.dayNumber}
                    data-bathing-cell={`${line.shiftCode}-${day.label}`}
                    data-capacity-state={slot.overCapacity ? 'over' : slot.available === 0 ? 'full' : slot.scheduled === 0 ? 'empty' : 'available'}
                    className="border border-slate-600 p-[4pt] align-top"
                  >
                    <div className="flex flex-col" style={{ minHeight: `${Math.max(42, minimumLines * 12 + 18)}pt` }}>
                      <div className="flex-1 space-y-[2pt]">
                        {slot.rooms.map((room, index) => <div key={`${room}-${index}`} className="font-bold whitespace-nowrap">Room {room}</div>)}
                        {availableLabels(slot.available).map((label, index) => <div key={`${label}-${index}`} className="font-semibold italic text-slate-600">{label}</div>)}
                      </div>
                      <div className="mt-[4pt] border-t border-slate-400 pt-[3pt] font-black whitespace-nowrap">
                        {slot.overCapacity ? `OVER CAPACITY — ${slot.scheduled} of ${slot.capacity}` : `${slot.scheduled} of ${slot.capacity}`}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
          {shiftLines.length === 0 && (
            <tr><td colSpan={8} className="border border-slate-600 p-6 text-center font-bold">No bathing-capable shift lines are configured.</td></tr>
          )}
        </tbody>
      </table>

      <div className="mt-[5pt] text-[7.5pt] leading-tight text-slate-600" style={{ breakInside: 'avoid' }}>
        Compact grid intentionally displays room/bed labels only. Use Bathing Assignment Detail for resident names and configured assistance information.
      </div>
      {model.coverageLegend.length > 0 && <div className="mt-[3pt] border border-slate-300 px-[5pt] py-[2pt] text-[7pt] text-slate-700"><strong>Service Coverage:</strong> {model.coverageLegend.join(' · ')}</div>}
    </div>
  );
};
