import React from 'react';
import { Calendar } from 'lucide-react';
import { Shift, Facility } from '../../types';

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
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 px-6 flex items-center justify-between no-print z-10 sticky top-0">
      {/* Left: Facility & Current Context */}
      <div className="flex items-center space-x-3">
        <div>
          <div className="flex items-center space-x-2.5">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">{facility.siteName}</h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200/60 rounded-full">
              TaskSheet Generator
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {facility.city}, {facility.province} · Main: {facility.mainPhone}
          </p>
        </div>
      </div>

      {/* Right: Date Selector Buttons */}
      <div className="flex items-center space-x-3">
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
