import React from 'react';
import { History, RotateCcw } from 'lucide-react';
import { PrintHistoryEntry, formatGeneratedAt } from '../../services/printHistory';

interface PrintHistoryPanelProps {
  entries: PrintHistoryEntry[];
  onRerun: (entry: PrintHistoryEntry) => void;
}

const PROFILE_LABELS: Record<PrintHistoryEntry['profile'], string> = {
  simple_checklist: 'Simple Checklist',
  clinical_worksheet: 'Clinical Worksheet',
};

/** Read-only browsing surface for the print-history service, which already
 *  recorded lightweight generation metadata but had no user-facing screen.
 *  "Run this print configuration again" regenerates from CURRENT TaskSheet
 *  data — it is not a historical-snapshot replay, so it is never worded as
 *  "Print Again" or "Reprint" (see services/printHistory's own ADR-001 note:
 *  no completion state or rendered content is ever stored here). */
export const PrintHistoryPanel: React.FC<PrintHistoryPanelProps> = ({ entries, onRerun }) => {
  if (entries.length === 0) {
    return (
      <section className="bg-panel rounded-surface border border-hairline-strong overflow-hidden">
        <div className="p-8 text-center">
          <History className="w-6 h-6 text-faint mx-auto" />
          <p className="mt-2 text-sm font-semibold text-ink-soft">No prints recorded yet</p>
          <p className="mt-1 text-xs text-muted">Generated TaskSheets appear here once you print a shift.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-panel rounded-surface border border-hairline-strong overflow-hidden">
      <div className="p-5 border-b border-hairline-strong bg-panel-sunken">
        <p className="text-xs text-muted">Every shift TaskSheet generated on this device — most recent first. Regenerates from current data; not a stored copy of what was printed.</p>
      </div>
      <ul className="divide-y divide-hairline">
        {entries.map(entry => (
          <li key={entry.id} className="px-5 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-ink">
                {entry.shiftCode ? `${entry.shiftCode} — ` : ''}{entry.shiftName}
                <span className="ml-2 text-[11px] font-semibold text-muted">{entry.date}</span>
              </p>
              <p className="text-[11px] text-muted mt-0.5">
                {PROFILE_LABELS[entry.profile]} · {entry.totalItems} item{entry.totalItems === 1 ? '' : 's'} · Rev {entry.revision} · Generated {formatGeneratedAt(entry.generatedAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRerun(entry)}
              className="shrink-0 px-3 py-2 border border-hairline-strong rounded-control text-xs font-bold inline-flex items-center gap-1.5 hover:bg-panel-sunken transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Run this print configuration again
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
