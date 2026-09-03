import React from 'react';
import { Building2, Code2, Database, Laptop, ShieldCheck } from 'lucide-react';
import packageJson from '../../../package.json';

export const DeveloperInformationTab: React.FC = () => (
  <div className="space-y-5">
    <section className="rounded-surface border border-hairline-strong bg-panel p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-surface bg-accent-soft p-2 text-accent-strong"><Code2 className="h-5 w-5" /></span>
        <div>
          <h2 className="text-base font-black text-ink">Developer Information</h2>
          <p className="mt-1 text-xs text-muted">Product ownership and technical identity for this installed build.</p>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-hairline rounded-surface border border-hairline-strong">
        <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="flex items-center gap-2 text-xs font-bold text-muted"><Building2 className="h-4 w-4" /> Developer / Publisher</dt><dd className="text-sm font-black text-ink">SoftVibeSolutions</dd></div>
        <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="flex items-center gap-2 text-xs font-bold text-muted"><Laptop className="h-4 w-4" /> Product</dt><dd className="text-sm font-semibold text-ink">TaskSheet {packageJson.version}</dd></div>
        <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="flex items-center gap-2 text-xs font-bold text-muted"><Database className="h-4 w-4" /> Data architecture</dt><dd className="text-sm font-semibold text-ink">Local-first application storage with user-controlled backup and restore</dd></div>
        <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="flex items-center gap-2 text-xs font-bold text-muted"><ShieldCheck className="h-4 w-4" /> Product purpose</dt><dd className="text-sm font-semibold text-ink">Shift organization and print-ready HCA/LPN working sheets</dd></div>
      </dl>
    </section>

    <section className="rounded-surface border border-warning bg-warning-soft p-4">
      <h3 className="text-xs font-black text-warning">Controlled-pilot build</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-warning">This release-candidate build remains subject to clean-machine and controlled-pilot approval. TaskSheet is a working-sheet tool and does not replace the authoritative clinical record, current orders, care plans, or facility policy.</p>
    </section>
  </div>
);
