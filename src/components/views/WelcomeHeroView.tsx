import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Printer, 
  Clock, 
  ShieldCheck, 
  CheckCircle2, 
  Layers, 
  Sliders, 
  Building2,
  Play,
  X
} from 'lucide-react';
import { db } from '../../db';

interface WelcomeHeroViewProps {
  onStartWork: () => void;
  onNavigateToSetup: () => void;
  onNavigateToPrint: () => void;
  presentationMode?: boolean;
}

export const WelcomeHeroView: React.FC<WelcomeHeroViewProps> = ({
  onStartWork,
  onNavigateToSetup,
  onNavigateToPrint,
  presentationMode = false,
}) => {
  const state = db.getState();
  const currentWelcomeSetting = state.settings.welcomeHero?.showWelcomePage || 'on_first_launch';
  const showWhyTaskSheet = state.settings.welcomeHero?.showWhyTaskSheetContent !== false;

  const [dontShowAgain, setDontShowAgain] = useState(currentWelcomeSetting === 'never');
  const [isDemoOpen, setIsDemoOpen] = useState(presentationMode);
  const [isDemoAvailable, setIsDemoAvailable] = useState(true);

  const handleToggleDontShow = (checked: boolean) => {
    setDontShowAgain(checked);
    db.updateFacilitySettings({
      welcomeHero: {
        ...state.settings.welcomeHero,
        showWelcomePage: checked ? 'never' : 'on_first_launch',
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-4 px-2 sm:px-4">
      {isDemoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-video-title"
          onClick={() => setIsDemoOpen(false)}
        >
          <div
            className="w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-[#081D3A] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4 text-white">
              <div>
                <h2 id="demo-video-title" className="text-base font-bold">TaskSheet in 60 Seconds</h2>
                <p className="mt-0.5 text-xs text-slate-400">Know the shift. See the tasks. Print what matters.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoOpen(false)}
                className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Close demo video"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="aspect-video bg-slate-950">
              {isDemoAvailable ? (
                <video
                  className="h-full w-full"
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  onError={() => setIsDemoAvailable(false)}
                >
                  <source src="/tasksheet-60-second-demo.mp4" type="video/mp4" />
                </video>
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-8 text-center text-white">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-teal-400/40 bg-teal-400/10">
                    <Play className="h-7 w-7 fill-teal-300 text-teal-300" />
                  </div>
                  <h3 className="text-xl font-bold">The polished product demo is being prepared.</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
                    Add the final public video as <span className="font-mono text-slate-300">public/tasksheet-60-second-demo.mp4</span>. This presentation player will use it automatically.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <p className="text-xs text-slate-400">Presentation Mode changes only this display experience. Operational and demo data remain untouched.</p>
              <button
                type="button"
                onClick={() => {
                  setIsDemoOpen(false);
                  onStartWork();
                }}
                className="rounded-lg bg-teal-500 px-4 py-2 text-xs font-bold text-[#081D3A] transition-colors hover:bg-teal-400"
              >
                Start Using TaskSheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. MAIN HERO BANNER ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#081D3A] via-[#0D2A54] to-[#0A2244] text-white rounded-2xl border border-[#1E3E6B] shadow-xl p-6 sm:p-10">
        {/* Subtle ambient background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Hero Content */}
          <div className="lg:col-span-7 space-y-6">
            {/* Top Brand & Badges */}
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-full text-xs font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>TaskSheet · SoftVibeSolutions</span>
              </span>
              <span className="text-xs text-slate-300 font-semibold px-2.5 py-1 bg-slate-800/60 rounded-full border border-slate-700">
                Know the shift. See the tasks. Print what matters.
              </span>
            </div>

            {/* Main Headline */}
            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.15]">
                Clearer shifts. Better organized tasks. Simpler TaskSheets.
              </h1>
              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Turn resident care assignments, unit responsibilities, and important shift information into clear, organized, print-ready HCA and LPN TaskSheets.
              </p>
            </div>

            {/* Quick feature tags */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-teal-200 pt-1">
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Shift-focused</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Print-ready in seconds</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Facility-flexible</span>
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDemoOpen(true)}
                className="inline-flex items-center space-x-2 px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-[#081D3A] font-bold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <span>Watch 60-Second Demo</span>
                <Play className="w-4 h-4 fill-current" />
              </button>

              <button
                type="button"
                onClick={onStartWork}
                className="inline-flex items-center space-x-2 px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/90 text-slate-100 font-semibold text-sm border border-slate-700 transition-colors"
              >
                <span>Start Using TaskSheet</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={onNavigateToSetup}
                className="inline-flex items-center space-x-1.5 px-3.5 py-3 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>Facility Setup</span>
              </button>
            </div>

            {/* Privacy Trust Point */}
            <div className="pt-2">
              <div className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                <span>
                  <strong className="text-white font-semibold">Minimal resident information by design</strong> — name and room number only.
                </span>
              </div>
            </div>
          </div>

          {/* Right Realistic Miniature TaskSheet Card */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-sm bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform lg:rotate-1 hover:rotate-0 transition-transform duration-300">
              {/* Card Header Simulation */}
              <div className="bg-slate-900 text-white p-3.5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-teal-400">TASKSHEET PREVIEW</div>
                  <div className="text-sm font-bold tracking-tight">D1 · 0700–1500</div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded">
                  HCA Daily
                </span>
              </div>

              {/* Facility & Date subline */}
              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[11px] text-slate-600 font-medium">
                <span>Cedar Grove Care Centre</span>
                <span className="font-semibold text-slate-800">Tuesday, Aug 25</span>
              </div>

              {/* Realistic Task Rows */}
              <div className="p-3 space-y-2 text-xs font-sans">
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-start space-x-2.5">
                  <div className="w-3.5 h-3.5 border-1.5 border-slate-400 rounded-xs mt-0.5 shrink-0 bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-900">0730 · Rm 101</span>
                      <span className="text-slate-500 font-medium truncate">Maria Santos</span>
                    </div>
                    <div className="text-slate-800 font-semibold text-xs mt-0.5">AM Care Routine</div>
                    <div className="text-[10px] text-slate-500 truncate">Morning wash · Shaving setup</div>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-start space-x-2.5">
                  <div className="w-3.5 h-3.5 border-1.5 border-slate-400 rounded-xs mt-0.5 shrink-0 bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-900">0800 · Rm 102</span>
                      <span className="text-slate-500 font-medium truncate">John Baker</span>
                    </div>
                    <div className="text-slate-800 font-semibold text-xs mt-0.5">MAP2 Assistance</div>
                    <div className="text-[10px] text-amber-700 font-medium">⚠ Before breakfast · Minced diet</div>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-start space-x-2.5">
                  <div className="w-3.5 h-3.5 border-1.5 border-slate-400 rounded-xs mt-0.5 shrink-0 bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-900">0930 · Rm 105</span>
                      <span className="text-slate-500 font-medium truncate">Helen Ross</span>
                    </div>
                    <div className="text-slate-800 font-semibold text-xs mt-0.5">Shower Assistance</div>
                    <div className="text-[10px] text-slate-500 truncate">Shower chair · Transfer belt</div>
                  </div>
                </div>

                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-start space-x-2.5">
                  <div className="w-3.5 h-3.5 border-1.5 border-slate-400 rounded-xs mt-0.5 shrink-0 bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-900">1100 · Rm 108</span>
                      <span className="text-slate-500 font-medium truncate">Anne Keller</span>
                    </div>
                    <div className="text-slate-800 font-semibold text-xs mt-0.5">Mobility / Reposition</div>
                    <div className="text-[10px] text-indigo-700 font-medium">2-Person Assist · Stand-by</div>
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-3.5 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">US Letter · Landscape / Portrait</span>
                <span className="font-bold text-teal-700 flex items-center space-x-1">
                  <Printer className="w-3.5 h-3.5 text-teal-600" />
                  <span>Print-Ready</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. SIX BEST SELLING POINTS SECTION ── */}
      {showWhyTaskSheet && (
        <section id="why-tasksheet-section" className="space-y-6 pt-2">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Why teams use TaskSheet
            </h2>
            <p className="text-sm text-slate-600">
              Everything your shift needs. Less of what it doesn't.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Clear, Organized Shifts */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Organized by Shift</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                See what needs attention for the current shift.
              </p>
            </div>

            {/* 2. Help Reduce Missed Tasks */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Helps Reduce Missed Tasks</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scheduled and recurring work is brought forward when due.
              </p>
            </div>

            {/* 3. Important Care Stands Out */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Important Care Stands Out</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Key instructions and higher-attention tasks remain visible.
              </p>
            </div>

            {/* 4. Built for the Shift */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold">
                <Layers className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Built for Real Shift Work</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Focus on today’s work instead of navigating a complex resident system.
              </p>
            </div>

            {/* 5. Print-Ready in Seconds */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold">
                <Printer className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Print-Ready in Seconds</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate clean HCA and LPN working sheets.
              </p>
            </div>

            {/* 6. Flexible for Your Facility */}
            <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow space-y-2.5">
              <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Flexible for Your Facility</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Configure your own shifts, task catalog, schedules, FYIs, and print preferences.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── 3. BOTTOM PREFERENCES & ENTRY BAR ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => handleToggleDontShow(e.target.checked)}
            className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
          />
          <span>Don't show this Welcome page automatically on startup</span>
        </label>

        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={onNavigateToPrint}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Open Print Center
          </button>
          <button
            type="button"
            onClick={onStartWork}
            className="px-4 py-2 text-xs font-bold bg-[#081D3A] hover:bg-[#0D2A54] text-white rounded-lg shadow-xs transition-colors flex items-center space-x-1.5"
          >
            <span>Enter Application</span>
            <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
          </button>
        </div>
      </div>

      {/* ── 4. OFFICIAL POSITIONING FOOTER ── */}
      <footer className="text-center text-xs text-slate-400 space-y-1.5 pt-2 pb-6">
        <p className="max-w-2xl mx-auto leading-relaxed">
          TaskSheet is a shift-focused task and print workflow designed to turn resident care assignments, unit responsibilities, and important information into clear, organized, print-ready working sheets for care teams.
        </p>
        <p className="font-semibold text-slate-500">
          SoftVibeSolutions · TaskSheet v1.0.0-rc.1
        </p>
      </footer>
    </div>
  );
};
