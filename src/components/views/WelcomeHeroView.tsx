import React, { useState } from 'react';
import {
  ClipboardList,
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
import packageJson from '../../../package.json';
import { TASKSHEET_TAGLINE } from '../../constants/branding';

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
    <div className="max-w-5xl mx-auto space-y-6 py-4 px-2 sm:px-4">
      {isDemoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-video-title"
          onClick={() => setIsDemoOpen(false)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-700 px-5 py-3.5 text-white">
              <div>
                <h2 id="demo-video-title" className="text-sm font-bold">TaskSheet in 60 Seconds</h2>
                <p className="mt-0.5 text-xs text-slate-400">{TASKSHEET_TAGLINE}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoOpen(false)}
                className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Close demo video"
              >
                <X className="h-4 w-4" />
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
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-teal-500/40 bg-teal-500/10">
                    <Play className="h-5 w-5 fill-teal-300 text-teal-300" />
                  </div>
                  <h3 className="text-sm font-bold">The product demo is being prepared.</h3>
                  <p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-400">
                    Add the final video as <span className="font-mono text-slate-300">public/tasksheet-60-second-demo.mp4</span>. This player will use it automatically.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-[11px] text-slate-400">Presentation mode changes only this display. Operational and demo data remain untouched.</p>
              <button
                type="button"
                onClick={() => {
                  setIsDemoOpen(false);
                  onStartWork();
                }}
                className="rounded-lg bg-teal-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-teal-500"
              >
                Start Using TaskSheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── INTRODUCTION ── */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-teal-100 p-2 text-teal-800"><ClipboardList className="h-5 w-5" /></span>
              <div>
                <div className="text-sm font-black text-slate-900">TaskSheet</div>
                <div className="text-xs text-slate-500">{TASKSHEET_TAGLINE}</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                Clearer shifts. Organized tasks. Print-ready TaskSheets.
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                Turn resident care assignments, unit responsibilities, and important shift information into clear, print-ready HCA and LPN working sheets.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /><span>Shift-focused</span></span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /><span>Print-ready in seconds</span></span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /><span>Facility-flexible</span></span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onStartWork}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-colors"
              >
                <span>Enter Application</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsDemoOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Watch 60-Second Demo</span>
              </button>
              <button
                type="button"
                onClick={onNavigateToSetup}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>Facility Setup</span>
              </button>
            </div>

            <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                <strong className="text-slate-900 font-semibold">Minimal resident information by design</strong> — name and room number only.
              </span>
            </div>
          </div>

          {/* Sample sheet preview */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-900 text-white px-3.5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Sample TaskSheet</div>
                  <div className="text-sm font-bold tracking-tight">D1 · 0700–1500</div>
                </div>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded">
                  HCA Daily
                </span>
              </div>

              <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-[11px] text-slate-600 font-medium">
                <span>Cedar Grove Care Centre</span>
                <span className="font-semibold text-slate-800">Tuesday, Aug 25</span>
              </div>

              <div className="p-3 space-y-2 text-xs font-sans">
                <div className="p-2 rounded bg-slate-50 border border-slate-100 flex items-start space-x-2.5">
                  <div className="w-3.5 h-3.5 border border-slate-400 rounded-xs mt-0.5 shrink-0 bg-white" />
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
                  <div className="w-3.5 h-3.5 border border-slate-400 rounded-xs mt-0.5 shrink-0 bg-white" />
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
                  <div className="w-3.5 h-3.5 border border-slate-400 rounded-xs mt-0.5 shrink-0 bg-white" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-slate-900">0930 · Rm 105</span>
                      <span className="text-slate-500 font-medium truncate">Helen Ross</span>
                    </div>
                    <div className="text-slate-800 font-semibold text-xs mt-0.5">Shower Assistance</div>
                    <div className="text-[10px] text-slate-500 truncate">Shower chair · Transfer belt</div>
                  </div>
                </div>
              </div>

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

      {/* ── WHAT TASKSHEET DOES ── */}
      {showWhyTaskSheet && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
          <h2 className="text-base font-bold text-slate-900">What TaskSheet does</h2>
          <p className="mt-1 text-xs text-slate-500">Everything your shift needs. Less of what it doesn't.</p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
            {[
              { icon: Clock, title: 'Organized by shift', text: 'See what needs attention for the current shift.' },
              { icon: CheckCircle2, title: 'Helps reduce missed tasks', text: 'Scheduled and recurring work is brought forward when due.' },
              { icon: ShieldCheck, title: 'Important care stands out', text: 'Key instructions and higher-attention tasks remain visible.' },
              { icon: Layers, title: 'Built for real shift work', text: "Focus on today's work instead of navigating a complex resident system." },
              { icon: Printer, title: 'Print-ready in seconds', text: 'Generate clean HCA and LPN working sheets.' },
              { icon: Sliders, title: 'Flexible for your facility', text: 'Configure your own shifts, task catalog, schedules, FYIs, and print preferences.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="rounded-lg bg-teal-50 border border-teal-200 text-teal-700 p-1.5 shrink-0"><Icon className="w-4 h-4" /></span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed mt-0.5">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── PREFERENCES & ENTRY BAR ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
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
            className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <span>Enter Application</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <footer className="text-center text-xs text-slate-400 space-y-1 pt-1 pb-6">
        <p className="max-w-2xl mx-auto leading-relaxed">
          TaskSheet is a shift-focused task and print workflow designed to turn resident care assignments, unit responsibilities, and important information into clear, organized, print-ready working sheets for care teams.
        </p>
        <p className="font-semibold text-slate-500">
          SoftVibeSolutions · TaskSheet v{packageJson.version}
        </p>
      </footer>
    </div>
  );
};
