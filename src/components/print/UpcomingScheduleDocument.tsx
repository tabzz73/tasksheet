import React from 'react';
import { db } from '../../db';
import { sortRoomNumbers } from '../../services/generator';
import { printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

interface UpcomingScheduleDocumentProps {
  currentDateStr: string;
}

export const UpcomingScheduleDocument: React.FC<UpcomingScheduleDocumentProps> = ({ currentDateStr }) => {
  const generatedAt = React.useRef(new Date().toISOString());
  const state = db.getState();
  const facility = state.facility;
  const residents = [...state.residents]
    .filter(r => r.status === 'active')
    .sort((a, b) => sortRoomNumbers(a.roomNumber, b.roomNumber));
  
  const tasks = state.residentTasks.filter(t => t.isActive !== false);
  const wounds = (state.wounds || []).filter(w => w.status !== 'resolved');

  // Generate 7 upcoming days
  const [y, m, d] = currentDateStr.split('-').map(Number);
  const startDate = new Date(y, m - 1, d);
  const days: Array<{ date: Date; dateStr: string; dayLabel: string; shortDate: string }> = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 7; i++) {
    const nextD = new Date(startDate);
    nextD.setDate(startDate.getDate() + i);
    const dateStr = nextD.toISOString().split('T')[0];
    const dayLabel = dayNames[nextD.getDay()];
    const shortDate = nextD.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
    days.push({ date: nextD, dateStr, dayLabel, shortDate });
  }

  const endDate = days[6].date;
  const weekRange = `${startDate.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })} – ${endDate.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="tasksheet-print-document bg-white text-slate-900 font-sans print:p-0 select-text text-xs space-y-4" style={printPageStyle('upcoming-seven-day')}>
      <RepeatingPrintFooter pageName="upcoming-seven-day" orientation="landscape" facilityName={facility.siteName} documentLabel="Upcoming Care Schedule" dateLabel={weekRange} generatedAt={generatedAt.current} />
      {/* ── HEADER ── */}
      <div className="border-b-2 border-slate-900 pb-2 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-slate-100 text-slate-900 border border-slate-300 font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              LOOKAHEAD SCHEDULE
            </span>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              UPCOMING 7-DAY CARE & PERIODIC TASKS
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-0.5">
            Projection Range: <strong className="text-slate-900">{weekRange}</strong>
          </p>
        </div>

        <div className="text-right">
          <h2 className="text-xs font-bold text-slate-900">{facility.siteName}</h2>
          <p className="text-[10px] text-slate-500">
            {facility.city}, {facility.province} · Main: {facility.mainPhone}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            TaskSheet 7-Day Planning Tool
          </p>
        </div>
      </div>

      {/* ── 7-DAY GRID TABLE ── */}
      <table className="w-full border-collapse border border-slate-300 text-left">
        <thead>
          <tr className="text-slate-900 text-[11px] font-black uppercase tracking-wider" style={{ backgroundColor: 'var(--print-header-fill)' }}>
            <th className="p-2 border border-slate-400 w-16 text-center">Room</th>
            <th className="p-2 border border-slate-400 w-36">Resident</th>
            {days.map(d => (
              <th key={d.dateStr} className="p-2 border border-slate-400 text-center w-24">
                <div className="text-xs">{d.dayLabel}</div>
                <div className="text-[9px] font-normal text-slate-500">{d.shortDate}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {residents.map((res, idx) => {
            const resTasks = tasks.filter(t => t.residentId === res.id);
            const resWounds = wounds.filter(w => w.residentId === res.id);

            return (
              <tr key={res.id} className={idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                <td className="p-2 border border-slate-300 text-center font-mono font-black text-xs text-slate-900 bg-slate-100/80">
                  {res.roomNumber}
                </td>
                <td className="p-2 border border-slate-300 font-bold text-slate-900">
                  {res.firstName} {res.lastName}
                </td>

                {days.map(d => {
                  const dayOfWeek = d.date.getDay(); // 0..6
                  // Periodic tasks scheduled on this day
                  const scheduledTasks = resTasks.filter(t => {
                    if (t.frequency === 'daily') return true;
                    if (t.frequency === 'selected_days' || t.frequency === 'weekly') {
                      const days = t.recurrenceRule?.selectedDays || [1, 4];
                      return days.includes(dayOfWeek);
                    }
                    return false;
                  });

                  return (
                    <td key={d.dateStr} className="p-1.5 border border-slate-300 text-[10px] align-top">
                      {scheduledTasks.length > 0 ? (
                        <div className="space-y-1">
                          {scheduledTasks.slice(0, 3).map(t => (
                            <div key={t.id} className="leading-tight">
                              <span className="font-semibold text-slate-800 line-clamp-1">
                                {t.title}
                              </span>
                              {t.time && <span className="font-mono text-[9px] text-slate-500">{t.time}</span>}
                            </div>
                          ))}
                          {scheduledTasks.length > 3 && (
                            <span className="text-[9px] text-teal-700 font-bold">
                              +{scheduledTasks.length - 3} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 text-center block">·</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── FOOTER ── */}
      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
        <p>
          <strong>Planning Guideline:</strong> Review multi-day allocations for balanced staffing and equipment availability.
        </p>
      </div>
    </div>
  );
};
