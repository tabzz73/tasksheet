import React from 'react';
import { AlertTriangle, Eraser, Settings2, ShieldAlert } from 'lucide-react';
import { DemoState } from '../../services/demoMode';

interface DemoModeBannerProps {
  state: DemoState;
  onStartRealSetup: () => void;
  onClearDemoData: () => void;
  onConfigureFacility: () => void;
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  state,
  onStartRealSetup,
  onClearDemoData,
  onConfigureFacility,
}) => {
  if (state.configurationMode === 'setup_required') {
    return (
      <section className="relative z-20 shrink-0 border-b border-warning bg-warning-soft px-4 py-3 text-warning" role="status" aria-label="Facility setup required">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Settings2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-black uppercase tracking-wide">Facility setup required</p>
              <p className="text-xs font-medium max-w-[70ch]">Enter your facility details and create at least one HCA or LPN shift before operational use.</p>
            </div>
          </div>
          <button type="button" onClick={onConfigureFacility} className="btn btn-primary shrink-0">
            Configure Facility
          </button>
        </div>
      </section>
    );
  }

  if (!state.showDemoIndicator) return null;

  if (state.demoConfigurationActive) {
    return (
      <section className="relative z-20 shrink-0 border-b border-warning bg-warning-soft px-4 py-3 text-warning" role="alert" aria-label="Demo Mode active">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-black uppercase tracking-wide">Demo Mode - Sample Data</p>
              <p className="text-xs font-semibold max-w-[70ch]">Cedar Grove, its shifts, residents, and tasks are fictional examples. Do not use this configuration for resident care.</p>
            </div>
          </div>
          <button type="button" onClick={onStartRealSetup} className="btn btn-primary shrink-0">
            Start Real Setup
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-20 shrink-0 border-b border-warning bg-warning-soft px-4 py-3 text-warning" role="alert" aria-label="Demo data active">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-black uppercase tracking-wide">Demo Data Active</p>
            <p className="text-xs font-medium max-w-[70ch]">{state.demoRecordCount} fictional demo records are loaded alongside your manual setup. Manual records are preserved when demo data is cleared.</p>
          </div>
        </div>
        <button type="button" onClick={onClearDemoData} className="btn btn-primary shrink-0">
          <Eraser className="h-3.5 w-3.5" />
          Clear Demo Data
        </button>
      </div>
    </section>
  );
};
