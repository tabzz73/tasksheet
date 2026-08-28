import React from 'react';
import { db } from '../../db';
import { formatPrintDate, printPageStyle, RepeatingPrintFooter } from './RepeatingPrintFooter';

export const PrinterCalibrationDocument: React.FC = () => {
  const generatedAt = React.useRef(new Date().toISOString());
  const state = db.getState();
  const facility = state.facility;

  return (
    <div className="tasksheet-print-document bg-white text-slate-900 font-sans p-2 select-text text-xs relative" style={printPageStyle('printer-calibration')}>
      <RepeatingPrintFooter pageName="printer-calibration" orientation="portrait" coverage={`Calibration reference · ${formatPrintDate(generatedAt.current)}`} generatedAt={generatedAt.current} />
      {/* ── 4 CORNER 10MM REGISTRATION MARKS ── */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-900 flex items-start justify-start p-0.5 text-[8px] font-mono font-bold text-slate-400">
        10mm
      </div>
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-900 flex items-start justify-end p-0.5 text-[8px] font-mono font-bold text-slate-400">
        10mm
      </div>
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-900 flex items-end justify-start p-0.5 text-[8px] font-mono font-bold text-slate-400">
        10mm
      </div>
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-900 flex items-end justify-end p-0.5 text-[8px] font-mono font-bold text-slate-400">
        10mm
      </div>

      {/* ── HEADER ── */}
      <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[11px] uppercase tracking-wider">
              HARDWARE CALIBRATION
            </span>
            <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
              Printer Alignment & Test Sheet
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            Standard Letter Calibration Target · TaskSheet Print Service V2
          </p>
        </div>

        <div className="text-right text-xs">
          <strong className="block font-bold text-slate-900">{facility.siteName}</strong>
          <span className="text-slate-500">{facility.street}, {facility.city}</span>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Test Date: {new Date().toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* ── 1. PRECISION SCALE RULER (100MM) ── */}
        <div className="p-4 border border-slate-300 rounded-xl bg-slate-50/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800">
              1. Physical Scale & Ratio Verification (100mm Target)
            </span>
            <span className="text-[11px] text-slate-500">Place physical metric ruler against bar below</span>
          </div>

          {/* 100mm Bar */}
          <div className="relative border-b-2 border-slate-900" style={{ width: '100mm', height: '24px' }}>
            <div className="absolute inset-0 flex justify-between items-end pb-1 font-mono text-[9px] font-bold text-slate-900">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-0.5 bg-slate-900" style={{ height: i % 5 === 0 ? '12px' : '6px' }} />
                  {i % 5 === 0 && <span className="mt-0.5">{i * 10}</span>}
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            ✓ <strong>PASS CRITERIA:</strong> The line from 0 to 100 must measure precisely 10.0 cm on a physical ruler. If it measures less, change browser print setting from "Fit to Page" to <strong>"Scale: 100%"</strong>.
          </p>
        </div>

        {/* ── 2. TONER DENSITY & GRAYSCALE SHADING ── */}
        <div className="p-4 border border-slate-300 rounded-xl bg-slate-50/50">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 block mb-2">
            2. Toner Density & Grayscale Contrast (Header Fills & Grid Lines)
          </span>
          <div className="grid grid-cols-10 gap-1 text-center font-mono text-[9px] font-bold">
            {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((pct) => (
              <div key={pct} className="space-y-1">
                <div 
                  className="h-10 rounded border border-slate-300"
                  style={{ backgroundColor: `rgba(15, 23, 42, ${pct / 100})` }}
                />
                <span className="text-slate-600">{pct}%</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            ✓ <strong>PASS CRITERIA:</strong> 10% must be faintly visible and distinguishable from pure white. If 10–30% is completely blank, ensure <strong>"Background Graphics"</strong> is enabled in the print dialog.
          </p>
        </div>

        {/* ── 3. CHECKBOX & LINE ART SHARPNESS ── */}
        <div className="p-4 border border-slate-300 rounded-xl bg-slate-50/50">
          <span className="text-xs font-black uppercase tracking-wider text-slate-800 block mb-2">
            3. Checkbox & Clinical Writable Lines Clarity
          </span>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Standard HCA Box (10pt)</span>
              <div className="flex items-center space-x-2">
                <span className="w-3.5 h-3.5 border-[1.5pt] border-slate-800 rounded-xs inline-block" />
                <span className="text-xs font-semibold">0745 Personal Care</span>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Spacious / Night Box (12pt)</span>
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 border-[1.5pt] border-slate-800 rounded-xs inline-block" />
                <span className="text-xs font-semibold">0800 Medication Round</span>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-slate-700 block mb-1.5">Ruled Writing Line (1pt)</span>
              <div className="border-b-[1pt] border-slate-800 h-5" />
            </div>
          </div>
        </div>

        {/* ── 4. RECOMMENDED BROWSER PRINT CONFIGURATION ── */}
        <div className="p-4 border-2 border-teal-700 bg-teal-50/70 rounded-xl">
          <span className="text-xs font-black uppercase tracking-wider text-teal-900 block mb-1.5">
            4. Recommended Browser & Hardware Configuration
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] text-teal-950 font-medium">
            <div className="p-2 bg-white/80 rounded border border-teal-200">
              <strong className="block text-teal-900 font-bold">Paper Size</strong>
              <span>Letter (8.5 × 11 in)</span>
            </div>
            <div className="p-2 bg-white/80 rounded border border-teal-200">
              <strong className="block text-teal-900 font-bold">Scale</strong>
              <span>100% (Default)</span>
            </div>
            <div className="p-2 bg-white/80 rounded border border-teal-200">
              <strong className="block text-teal-900 font-bold">Margins</strong>
              <span>Minimum / Default (10mm)</span>
            </div>
            <div className="p-2 bg-white/80 rounded border border-teal-200">
              <strong className="block text-teal-900 font-bold">Background Graphics</strong>
              <span>Enabled (Checked)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER & COMPLIANCE ── */}
      <div className="mt-6 pt-3 border-t border-slate-300 flex items-center justify-between text-[8pt] text-slate-500">
        <span>TaskSheet Print Service V2 · Printer Hardware Calibration Sheet</span>
        <span>Confidential Healthcare Tool · SoftVibeSolutions</span>
      </div>
    </div>
  );
};
