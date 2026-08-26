import React from 'react';
import { Building2, Code2, Database, Laptop, ShieldCheck } from 'lucide-react';
import packageJson from '../../../package.json';

export const DeveloperInformationTab: React.FC = () => (
  <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-indigo-100 p-2 text-indigo-800"><Code2 className="h-5 w-5" /></span>
        <div>
          <h2 className="text-base font-black text-slate-900">Developer Information</h2>
          <p className="mt-1 text-xs text-slate-500">Product ownership and technical identity for this installed build.</p>
        </div>
      </div>

      <dl className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
        <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><Building2 className="h-4 w-4" /> Developer / Publisher</dt><dd className="text-sm font-black text-slate-900">SoftVibeSolutions</dd></div>
        <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><Laptop className="h-4 w-4" /> Product</dt><dd className="text-sm font-semibold text-slate-800">TaskSheet {packageJson.version}</dd></div>
        <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><Database className="h-4 w-4" /> Data architecture</dt><dd className="text-sm font-semibold text-slate-800">Local-first application storage with user-controlled backup and restore</dd></div>
        <div className="grid gap-1 p-4 sm:grid-cols-[180px_1fr]"><dt className="flex items-center gap-2 text-xs font-bold text-slate-500"><ShieldCheck className="h-4 w-4" /> Product purpose</dt><dd className="text-sm font-semibold text-slate-800">Shift organization and print-ready HCA/LPN working sheets</dd></div>
      </dl>
    </section>

    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h3 className="text-xs font-black text-amber-950">Controlled-pilot build</h3>
      <p className="mt-1 text-[11px] leading-relaxed text-amber-900">This release-candidate build remains subject to clean-machine and controlled-pilot approval. TaskSheet is a working-sheet tool and does not replace the authoritative clinical record, current orders, care plans, or facility policy.</p>
    </section>
  </div>
);
