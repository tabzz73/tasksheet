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
    <section className="overflow-hidden rounded-surface border border-hairline-strong bg-panel">
      <div className="p-5 border-b border-hairline-strong">
        <div className="flex items-start gap-3">
          <span className="rounded-surface bg-accent-soft p-2 text-accent-strong"><Info className="h-5 w-5" /></span>
          <div>
            <h2 className="text-base font-black text-ink">TaskSheet</h2>
            <p className="mt-1 text-xs text-muted">{TASKSHEET_TAGLINE}</p>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-px bg-panel-sunken sm:grid-cols-3">
        <div className="bg-panel p-4"><dt className="text-[10px] font-black uppercase tracking-wider text-faint">Version</dt><dd className="mt-1 text-sm font-bold text-ink">{packageJson.version}</dd></div>
        <div className="bg-panel p-4"><dt className="text-[10px] font-black uppercase tracking-wider text-faint">Release channel</dt><dd className="mt-1 text-sm font-bold text-ink">Controlled pilot RC</dd></div>
        <div className="bg-panel p-4"><dt className="text-[10px] font-black uppercase tracking-wider text-faint">Platform</dt><dd className="mt-1 text-sm font-bold text-ink">Windows x64 desktop</dd></div>
      </dl>
    </section>

    <section className="rounded-surface border border-warning bg-warning-soft p-5">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <h3 className="text-sm font-black text-warning">Standalone deployment only</h3>
          <p className="mt-1 text-xs leading-relaxed text-warning">
            TaskSheet 1.0 supports one authorized Windows workstation. It does not synchronize live operational data between computers. Keep the live database on this workstation. Exported backup files may be stored in a facility-approved network or external backup location.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-warning">
            TaskSheet does not provide application-level user accounts or permissions in 1.0; restrict access using Windows accounts and physical device controls.
          </p>
        </div>
      </div>
    </section>

    <section className="rounded-surface border border-hairline-strong bg-panel p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="rounded-surface bg-accent-soft p-2 text-accent-strong"><Sparkles className="h-4 w-4" /></span>
        <div>
          <h3 className="text-sm font-black text-ink">Welcome & Overview</h3>
          <p className="mt-0.5 text-xs text-muted">The presentation page is available here without occupying everyday application navigation.</p>
        </div>
      </div>

      <div className="max-w-lg">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink-soft">Welcome Page Behavior</label>
        <select
          value={settings.welcomeHero?.showWelcomePage || 'on_first_launch'}
          onChange={event => onUpdateSettings({
            welcomeHero: { ...settings.welcomeHero, showWelcomePage: event.target.value as 'on_first_launch' | 'always' | 'never' },
          })}
          className="w-full rounded-control border border-hairline-strong bg-panel px-3.5 py-2.5 text-sm"
        >
          <option value="on_first_launch">First launch only (Default)</option>
          <option value="always">Always show on startup</option>
          <option value="never">Never show</option>
        </select>
      </div>

      <label className="flex cursor-pointer select-none items-center gap-2.5 text-xs font-semibold text-ink-soft">
        <input
          type="checkbox"
          checked={settings.welcomeHero?.showWhyTaskSheetContent !== false}
          onChange={event => onUpdateSettings({
            welcomeHero: { ...settings.welcomeHero, showWhyTaskSheetContent: event.target.checked },
          })}
          className="h-4 w-4 rounded border-hairline-strong text-accent focus:ring-accent"
        />
        <span>Show the “What TaskSheet does” overview section</span>
      </label>

      {onNavigateToWelcome && (
        <div className="flex flex-wrap gap-2 border-t border-hairline pt-4">
          <button type="button" onClick={() => onNavigateToWelcome(false)} className="inline-flex items-center gap-2 rounded-control border border-hairline-strong bg-panel px-4 py-2 text-xs font-bold text-ink-soft hover:bg-panel-sunken">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Open Welcome & Overview
          </button>
          <button type="button" onClick={() => onNavigateToWelcome(true)} className="inline-flex items-center gap-2 rounded-control bg-ink px-4 py-2 text-xs font-bold text-white hover:bg-ink">
            <Play className="h-3.5 w-3.5 fill-accent text-accent" /> Launch Presentation Mode
          </button>
        </div>
      )}
    </section>

    <section className="flex items-start gap-3 rounded-surface border border-hairline-strong bg-accent-soft p-4 text-accent-strong">
      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
      <div><h3 className="text-xs font-black">Operational data remains unchanged</h3><p className="mt-1 text-[11px] leading-relaxed">Opening Welcome or Presentation Mode does not load demo data, alter facility setup, or change resident and task records.</p></div>
    </section>
  </div>
);
