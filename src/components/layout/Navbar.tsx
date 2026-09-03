import React from 'react';
import { Calendar } from 'lucide-react';
import { Shift, Facility } from '../../types';
import { formatLocalDate, getTodayLocalDateString } from '../../services/recurrence';

interface NavbarProps {
  currentDate: string;
  onDateChange: (date: string) => void;
  selectedShift?: Shift;
  facility: Facility;
  pendingChangesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentDate,
  onDateChange,
  facility,
}) => {
  const today = getTodayLocalDateString();
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrow = formatLocalDate(tomorrowDate);

  const [y, m, d] = currentDate.split('-').map(Number);
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('en-CA', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <header className="relative z-30 min-h-12 shrink-0 bg-panel border-b border-hairline-strong px-4 sm:px-5 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 no-print">
      {/* Left: facility identity */}
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-[13px] font-bold text-ink tracking-tight truncate">{facility.siteName || 'Facility Not Configured'}</h2>
        <span className="hidden sm:inline text-[11px] text-muted truncate">
          {facility.city}{facility.city && facility.province ? ', ' : ''}{facility.province}{facility.mainPhone ? ` · ${facility.mainPhone}` : ''}
        </span>
      </div>

      {/* Right: operational date control */}
      <div className="flex items-center gap-3 shrink-0">
        <span className="hidden md:inline text-[12px] font-semibold text-ink-soft tabular-nums">{formattedDate}</span>
        <div className="h-5 w-px bg-hairline hidden md:block" aria-hidden="true" />
        <div className="flex items-center border border-hairline-strong rounded-control overflow-hidden text-[12px] font-semibold">
          <button
            type="button"
            onClick={() => onDateChange(today)}
            aria-pressed={currentDate === today}
            className={`px-2.5 h-8 transition-colors ${
              currentDate === today ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'
            }`}
          >
            Today
          </button>
          <div className="w-px self-stretch bg-hairline-strong" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onDateChange(tomorrow)}
            aria-pressed={currentDate === tomorrow}
            className={`px-2.5 h-8 transition-colors ${
              currentDate === tomorrow ? 'bg-ink text-white' : 'text-ink-soft hover:bg-panel-sunken'
            }`}
          >
            Tomorrow
          </button>
          <div className="w-px self-stretch bg-hairline-strong" aria-hidden="true" />
          <div className="relative flex items-center">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              title="Select custom date"
              aria-label="Select a custom date"
            />
            <span
              className={`flex items-center justify-center w-8 h-8 ${
                currentDate !== today && currentDate !== tomorrow ? 'text-accent' : 'text-muted'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
