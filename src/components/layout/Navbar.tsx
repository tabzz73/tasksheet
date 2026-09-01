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

  return (
    <header className="relative z-30 min-h-16 shrink-0 bg-white border-b border-slate-200/90 px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 no-print shadow-xs">
      {/* Left: Facility & Current Context */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center space-x-2.5 min-w-0">
            <h2 className="text-base font-bold text-slate-900 tracking-tight truncate">{facility.siteName}</h2>
            <span className="hidden md:inline-flex shrink-0 px-2.5 py-0.5 text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200/60 rounded-full">
              TaskSheet Generator
            </span>
          </div>
          <p className="hidden sm:block text-xs text-slate-500 mt-0.5 truncate">
            {facility.city}, {facility.province} · Main: {facility.mainPhone}
          </p>
        </div>
      </div>

      {/* Right: Date Selector Buttons */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200/80 text-xs font-medium">
          <button
            type="button"
            onClick={() => onDateChange(today)}
            className={`px-3 py-1 rounded-md transition-colors ${
              currentDate === today
                ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onDateChange(tomorrow)}
            className={`px-3 py-1 rounded-md transition-colors ${
              currentDate === tomorrow
                ? 'bg-white text-slate-900 shadow-xs font-bold border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tomorrow
          </button>
          <div className="relative flex items-center pl-1">
            <input
              type="date"
              value={currentDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
              title="Select custom date"
            />
            <button
              type="button"
              className={`p-1.5 rounded hover:bg-slate-200 text-slate-600 ${
                currentDate !== today && currentDate !== tomorrow ? 'text-teal-700 font-semibold' : ''
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
