import React from 'react';
import { Info, Play, ShieldCheck, Sparkles } from 'lucide-react';
import packageJson from '../../../package.json';
import { FacilitySettings } from '../../types';
import { TASKSHEET_TAGLINE } from '../../constants/branding';

interface AppInformationTabProps {
  settings: FacilitySettings;
  onUpdateSettings: (updates: Partial<FacilitySettings>) => void;
  onNavigateToWelcome?: (presentationMode?: boolean) => void;
}

export const AppInformationTab: React.FC<AppInformationTabProps> = ({
  settings,
  onUpdateSettings,
  onNavigateToWelcome,
}) => (
  <div className="space-y-5">
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5 border-b border-slate-200">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-teal-100 p-2 text-teal-800"><Info className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-black text-slate-900">TaskSheet</h2>
            <p className="mt-1 text-xs text-slate-500">{TASKSHEET_TAGLINE}</p>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-px bg-slate-200 sm:grid-cols-3">
        <div className="bg-white p-4"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Version</dt><dd className="mt-1 text-sm font-bold text-slate-900">{packageJson.version}</dd></div>
        <div className="bg-white p-4"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Release channel</dt><dd className="mt-1 text-sm font-bold text-slate-900">Controlled pilot RC</dd></div>
        <div className="bg-white p-4"><dt className="text-[10px] font-black uppercase tracking-wider text-slate-400">Platform</dt><dd className="mt-1 text-sm font-bold text-slate-900">Windows x64 desktop</dd></div>
      </dl>
    </section>

    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <h3 className="text-sm font-black text-amber-950">Standalone deployment only</h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-900">
            TaskSheet 1.0 supports one authorized Windows workstation. It does not synchronize live operational data between computers. Keep the live database on this workstation. Exported backup files may be stored in a facility-approved network or external backup location.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-800">
            TaskSheet does not provide application-level user accounts or permissions in 1.0; restrict access using Windows accounts and physical device controls.
          </p>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-teal-100 p-2 text-teal-800"><Sparkles className="h-4 w-4" /></span>
        <div>
          <h3 className="text-sm font-black text-slate-900">Welcome & Overview</h3>
          <p className="mt-0.5 text-xs text-slate-500">The presentation page is available here without occupying everyday application navigation.</p>
        </div>
      </div>

      <div className="max-w-lg">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">Welcome Page Behavior</label>
        <select
          value={settings.welcomeHero?.showWelcomePage || 'on_first_launch'}
          onChange={event => onUpdateSettings({
            welcomeHero: { ...settings.welcomeHero, showWelcomePage: event.target.value as 'on_first_launch' | 'always' | 'never' },
          })}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm"
        >
          <option value="on_first_launch">First launch only (Default)</option>
          <option value="always">Always show on startup</option>
          <option value="never">Never show</option>
        </select>
      </div>

      <label className="flex cursor-pointer select-none items-center gap-2.5 text-xs font-semibold text-slate-700">
        <input
          type="checkbox"
          checked={settings.welcomeHero?.showWhyTaskSheetContent !== false}
          onChange={event => onUpdateSettings({
            welcomeHero: { ...settings.welcomeHero, showWhyTaskSheetContent: event.target.checked },
          })}
          className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
        />
        <span>Show the “What TaskSheet does” overview section</span>
      </label>

      {onNavigateToWelcome && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => onNavigateToWelcome(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" /> Open Welcome & Overview
          </button>
          <button type="button" onClick={() => onNavigateToWelcome(true)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800">
            <Play className="h-3.5 w-3.5 fill-teal-400 text-teal-400" /> Launch Presentation Mode
          </button>
        </div>
      )}
    </section>

    <section className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-950">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
      <div><h3 className="text-xs font-black">Operational data remains unchanged</h3><p className="mt-1 text-[11px] leading-relaxed">Opening Welcome or Presentation Mode does not load demo data, alter facility setup, or change resident and task records.</p></div>
    </section>
  </div>
);
