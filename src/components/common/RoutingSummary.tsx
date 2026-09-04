import React from 'react';

interface RoutingSummaryProps {
  labels: string[];
}

/** Read-only "Appears in" preview — computed by the caller from
 *  `services/routingPreview.ts`, this component only owns the consistent
 *  presentation. Markup shape (a single <p> with the label and the joined
 *  destinations as sibling text) is intentionally stable: existing tests
 *  query `getByText('Appears in:').parentElement!.textContent!`. */
export const RoutingSummary: React.FC<RoutingSummaryProps> = ({ labels }) => (
  <p className="text-[11px] text-muted">
    <span className="font-bold text-ink-soft">Appears in: </span>
    {labels.join(' · ')}
  </p>
);
